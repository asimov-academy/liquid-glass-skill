# How it works

Useful when you need to explain the effect, tune it, or debug it. The material model is a vanilla-JS port of [Glass-HQ/liquid-glass](https://github.com/Glass-HQ/liquid-glass) (MIT), which renders its maps with WebGPU; here they are rendered on a 2D canvas, cached per shape.

## 1. Maps

For every pixel of a shape (plus a 2 px margin) the engine takes the signed distance `d` to the outline (negative inside) and the outward normal `n`.

**Field map (refraction).** The rim is a circular bevel `bezel` px deep (20 by default):

```
t    = clamp(−d / bezel, 0, 1)          // 0 at the edge, 1 where the flat center starts
edge = 1 − √((2 − t) · t)               // circular profile: 1 at the edge, 0 inside
v    = −n · edge · refraction (+ zoom for magnify)
R,G  = 0.5 + v / (2·max)               // stored in an opaque PNG
```

`feDisplacementMap` with `scale = 2·max` moves every output pixel by `v`: near the rim each pixel shows backdrop pulled from further **inside**, so content stretches along the curve the way thick glass bends light, while the center stays clean. Refraction defaults to ≈20% of the short side, growing to 60 px on large surfaces, so the two opposite rims of a small control never sample across each other.

**Overlay map (rim lighting).** A 0.9 px specular stroke where the normal points up or down (spread ≈ 62°), a 4.5 px diffuse glow under it, and a thin dark line hugging the left and right sides. Light is white (0.82 in dark appearance). It is painted by CSS as `.lg-overlay`, over the material.

**Mask** — anti-aliased coverage, used by the cross-browser renderer.

## 2. Material graph

The same filter primitives run in every renderer (`materialGraph()`):

- **Regular**: `frost = blur(7.33)` and `fill = blur(23 light / 21.8 dark)`, combined with `lighten` (light) or `darken` (dark) and mixed `fill·fo + frost·(1−fo)` with `fo = 0.34 / 0.65`. That frosted copy is what gets refracted. Then a 33-step tone table (quadratic curve blended with identity) and a saturation of 1.10 / 1.06.
- **Clear**: no blur; a tone table with shadow lift (0.18 / 0.15) and highlight roll-off (0 / 0.20) plus a faint pale veil.
- **Tint**: the colour transmits luminance — `luminance · tint · (1 − body) + tint · body`, body 0.78 regular / 0.68 clear.
- **Dispersion** (optional): three displacements with `scale·(1±d)`, isolated per channel and recombined with `screen`.

## 3. Renderers

### `backdrop` (Chromium)
```
.lg-refract { backdrop-filter: url(#lg-glass-N); border-radius: inherit }
```
The whole graph runs as the backdrop filter, with `SourceGraphic` = the backdrop. Chromium feeds pixels beyond the border box to the filter, so the big fill blur has no dark edges. The layer's own `border-radius` is the clip (Chromium always honours it for backdrops; `clip-path` or ancestor clipping can leak rectangles).

### `scene` (Safari, Firefox — or forced)
Those engines don't take `url()` in `backdrop-filter`, but they do run SVG filters through CSS `filter`. A `.lg-scene` gets **one** filter on its `.lg-backdrop`, with the material graph of every lens of the scene, each masked to its shape and merged over `SourceGraphic`.

- All coordinates are fractions of the backdrop box (`primitiveUnits="objectBoundingBox"`): WebKit resolves `userSpaceOnUse` for CSS filters on HTML against the page, not the element. In those units displacement scales X by the box width and Y by its height, so each map passes a colour matrix that rebalances the axes; blur `stdDeviation` is given per axis.
- A `requestAnimationFrame` loop (only while the scene is on screen) reads each lens' rect and effective opacity and moves its primitives, so moving, dragging, scaling, fading and scrolling glass stays in sync.
- A lens that is switched off, invisible or outside the box keeps a valid subregion and just leaves the merge — WebKit drops the **whole** filter if a primitive leaves the region.
- Limitation: glass in a scene refracts only the backdrop, not other glass — overlapping glass shows each other's content.

### `fallback`
`backdrop-filter: blur() saturate()` plus a frosted fill, with the same rim overlay, glow and springs. Also used for Reduce Transparency / Increase Contrast (opaque fill).

### `group` (liquid morph)
A `[data-glass-group]` renders its members as one surface: a rounded-box SDF per member combined with a polynomial **smooth-min** (`k = 2 × merge`). Its gradient gives `n`, so the same field/overlay/mask are produced for the union; the displacement fades out at saddle points. Members are polled only while something moves (draggables and springs wake the group). Refracts in Chromium; frosted elsewhere.

## 4. Motion

`Spring` is a damped oscillator integrated at 240 Hz. Springs keep their velocity when retargeted, so interrupting a gesture never jumps. Interactive glass animates `scale` and `translate` — never `opacity` on an ancestor of glass in Chromium (backdrop root). Components use velocity for the liquid stretch.

## 5. Browser support

| Engine | Renderer | Refraction |
|---|---|---|
| Chrome / Edge / Arc / Opera / Samsung | backdrop | Live, of anything behind |
| Safari (macOS, iOS, iPadOS), any iOS browser | scene inside `.lg-scene`, else fallback | Of the scene's backdrop |
| Firefox | scene inside `.lg-scene`, else fallback | Of the scene's backdrop |
