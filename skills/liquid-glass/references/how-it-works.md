# How it works

Useful when you need to explain the effect, tune it, or debug it.

## 1. Optics: from a bevel to a displacement map

The glass is a slab whose rim is a **convex squircle bevel** of width `bezel` (auto: 30% of the short side). Looking through a convex bevel, every point of the rim shows content from a little further **inside** the shape, so the background is stretched along the curve — letters crossing the edge bend around it, a grid turns into concentric contours. That is the look of Apple's material.

The engine encodes that with a fold-free profile. Let `t ∈ [0, 1]` be the distance from the edge in bezel units and `q = curvature − 1` (3 by default). The sampling position inside the bevel follows `g(t) = k + t^(q+1)/(q+1)` with `k = q/(q+1)`, whose derivative `g'(t) = t^q` is never negative — so the mapping never folds back on itself (no doubled letters, no bubbles). The displacement is `(g(t) − t)/k`, normalised to 1 at the rim and 0 where the bevel meets the flat center (`LiquidGlass.profile()`). Because of that bound, refraction up to `bezel · q/(q+1)` (the auto value) is always fold-free.

For an element of size `w × h` and radius `r`, `makeMap()` walks every pixel (0.75–2× resolution; denser for WebKit/Gecko) and:

1. computes the signed distance to the rounded rectangle and its outward normal `n` (the normal field uses a corner radius ≥ bezel so the bevel has no mitred crease along the diagonals);
2. interpolates the profile at `t` → shift `m` (px);
3. builds the vector `−n · m` (sample inward) plus `p · (1/magnify − 1)` for the optional center zoom;
4. encodes it in an opaque PNG: `R = 128 + 127·dx/max`, `G = 128 + 127·dy/max` (opaque, because premultiplied alpha would corrupt the vectors);
5. also renders a **shade** image from the 3D normals of the bevel (key light top-left, internal reflection bottom-right) used by `.lg-shade`.

Maps are cached per size/options (LRU) and regenerated on resize (`ResizeObserver`).

## 2. Rendering

SVG `feDisplacementMap` moves every output pixel by `scale · (C − 0.5)` along the map's R/G channels — exactly the vector field above. Three renderers feed it:

### `backdrop` (Chromium)
```
.lg-refract { backdrop-filter: blur(b) url(#lg-glass-N) saturate(s) brightness(k) contrast(c); border-radius: inherit }
<filter id="lg-glass-N" x="-M" y="-M" width="w+2M" height="h+2M" filterUnits="userSpaceOnUse">
  <feImage href="map.png" …/> <feDisplacementMap in="SourceGraphic" in2="map" scale="2·max"/>
</filter>
```
The refract layer has the element's exact shape: its own `border-radius` is the one clip Chromium always honours for `backdrop-filter` (`clip-path` on the layer, or rounded `overflow` on an ancestor, leak a rectangle in some contexts).

Optional dispersion runs the displacement three times with `scale·(1±d)`, isolates R/G/B with `feColorMatrix` and recombines them with `feBlend mode="screen"`.

### `scene` (Safari, Firefox — or forced)
Those engines don't accept `url()` in `backdrop-filter`, but they do run SVG filters through CSS `filter`. A `.lg-scene` gets **one** filter applied to its `.lg-backdrop`. All of its coordinates are fractions of the backdrop box (`primitiveUnits="objectBoundingBox"`): WebKit resolves `userSpaceOnUse` for CSS filters on HTML against the page rather than the element, so fractions are the only units every engine agrees on. In those units `feDisplacementMap` scales X by the box width and Y by its height, so each map passes through a colour matrix that rebalances the two axes. For every glass element of the scene the filter contains: a blur of the region (subregion = lens + margin), the map at the lens position, the displacement, saturation and a linear luminosity transfer, and a composite `in` with an anti-aliased shape mask. The outputs are merged over `SourceGraphic`. A `requestAnimationFrame` loop (only while the scene is on screen) reads lens positions with `getBoundingClientRect()` and moves the primitive subregions, so moving, dragging, scaling and scrolling lenses stay in sync.

### `fallback`
`backdrop-filter: blur() saturate() brightness()` with the same tint, rim, glow and springs. Also used for Reduce Transparency / Increase Contrast (with an opaque fill on top).

### `group` (liquid morph — Chromium refraction)
A `[data-glass-group]` renders its glass members as one surface: a rounded-box signed distance field per member, combined with a polynomial **smooth-min** (`k = 2 × merge`), whose gradient becomes the displacement map, mask and rim. Where two shapes approach, the field grows a neck; as they separate it pinches off. Member rectangles are polled with `requestAnimationFrame` only while something moves (draggables and interactive springs wake the group), and the field is rendered at reduced resolution to stay at 60 fps.

## 3. Light and material layers (CSS)

- **Tint** (`.lg-tint`): base fill per appearance + bevel lighting from inset shadows (catch-light top-left, softer bottom-right, faint inner glow).
- **Specular rim** (`.lg-rim`): a `conic-gradient` with two bright lobes 180° apart, masked to a 1.2 px ring with `mask-composite: exclude`. Its start angle is `--lg-light-angle`, updated from the pointer (or device orientation) so the highlight slides around the rim.
- **Glow** (`.lg-glow`): radial gradient at the touch point, opacity driven by the press spring.
- **Shadow** on `.lg-layers`.

## 4. Motion

`Spring` is a damped harmonic oscillator integrated at 240 Hz (semi-implicit Euler). Springs keep their velocity when retargeted, so interrupting a gesture never jumps. Interactive glass animates `scale` and `translate` (individual transform properties, so they compose with your own `transform`) — never `opacity`, which would break the backdrop in Chromium. Components use velocity for the "liquid" stretch (indicator/knob widens along the motion and thins across it).

## 5. Browser support

| Engine | Renderer | Refraction |
|---|---|---|
| Chrome / Edge / Arc / Opera / Samsung (desktop & Android) | backdrop | Live, of anything behind |
| Safari (macOS, iOS, iPadOS), any iOS browser | scene inside `.lg-scene`, else fallback | Of the scene's backdrop |
| Firefox | scene inside `.lg-scene`, else fallback | Of the scene's backdrop |

Requires `ResizeObserver`, CSS `backdrop-filter`, SVG filters and `mask-composite` (all evergreen browsers since 2022–2023).
