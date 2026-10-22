# API reference

## Loading

```html
<link rel="stylesheet" href="liquid-glass.css">
<script src="liquid-glass.js"></script>            <!-- auto-init on DOMContentLoaded -->
<script src="liquid-glass.js" data-manual></script> <!-- opt out; call LiquidGlass.init() yourself -->
```

The script exposes `window.LiquidGlass` (and `module.exports` under CommonJS). It scans for `.glass, [data-glass]` and the component classes, then keeps a `MutationObserver` running, so elements added later (SPA routes, `innerHTML`, templates) are upgraded automatically and cleaned up when removed.

## Declarative options

Read from `data-glass-*` attributes at creation time and whenever you call `apply/update`.

| Attribute | Type | Default | Notes |
|---|---|---|---|
| `data-glass` | `""` \| `regular` \| `clear` | `regular` | Alternative to the class; the value picks the variant |
| `data-glass-variant` | `regular` \| `clear` | `regular` | Same as above |
| `data-glass-bezel` | px | auto | Width of the curved rim. Auto = 30% of the short side, clamped to 6–90 px |
| `data-glass-refraction` | px | auto | Max lateral bend at the very rim. Auto = bezel × (q/(q+1)), q = curvature − 1 (0.75 × bezel by default) — the largest value that never folds |
| `data-glass-curvature` | 1.5–8 | `4` | Squircle exponent of the bevel profile (2 = circular, 4 = Apple-like, higher = sharper rim) |
| `data-glass-magnify` | ≥ 1 | `1` | Uniform zoom of the flat center |
| `data-glass-dispersion` | 0–0.8 | `0` | Splits R/G/B displacement (prism fringes) |
| `data-glass-blur` | px | `7` / `0.5` | Frost (regular / clear) |
| `data-glass-saturation` | number | `1.45` / `1.08` | Backdrop saturation |
| `data-glass-brightness` | number | `1.03` / `1.02` | Backdrop brightness |
| `data-glass-contrast` | number | `0.9` / `1` | < 1 compresses luminosity (legibility) |
| `data-glass-tint` | CSS color | — | Prominent/tinted glass; text turns white |
| `data-glass-dim` | flag | — | 35% black layer (HIG, clear glass over bright media) |
| `data-glass-interactive` | flag | — | Press scale, pointer stretch, touch glow, hover glow |
| `data-glass-draggable` | flag | — | Drag with momentum + rubber-band bounds (uses `left/top`) |
| `data-glass-appearance` | `light` \| `dark` \| `auto` | `light` | On the element or any ancestor |
| `data-glass-mode` | `auto` \| `backdrop` \| `scene` \| `fallback` | `auto` | Force a renderer |
| `data-glass-group` | on a container | — | Glass descendants merge into one liquid surface (GlassEffectContainer) |
| `data-glass-merge` | px | `24` | On a group: distance at which shapes start to touch and melt together |

Read-only attributes set by the engine: `data-lg-mode` (renderer in use: `backdrop`, `scene`, `fallback`, or `member` inside a group), `data-lg-variant`, `data-lg-tinted`, `data-lg-lens` (components: `on`/`off`), class `lg-ready`.

## JavaScript

```js
LiquidGlass.init(defaults?)          // merge global defaults, scan, observe (idempotent)
LiquidGlass.apply(el, opts?)         // create or update one element → instance
LiquidGlass.get(el)                  // instance or null
LiquidGlass.refresh(el?)             // force re-render (after changing border-radius in JS, fonts loading…)
LiquidGlass.destroy(el)              // remove layers, filters and listeners
LiquidGlass.defaults                 // global defaults (set before init or pass to init)
LiquidGlass.supports                 // { backdropRefraction, backdropFilter, svgFilters }
LiquidGlass.displacementMap(w, h, r, opts) // → { disp, mask, scale } data URLs (for visualisations)
LiquidGlass.profile(curvature)       // → normalised refraction profile (256 samples)
LiquidGlass.group(el)                // upgrade a container to a liquid group (auto for [data-glass-group], .lg-glass-group)
LiquidGlass.Spring                   // new Spring(value, { stiffness, damping, mass }) · .to(t) · .set(v) · .step(dt)
LiquidGlass.animate(fn)              // fn(dt) per frame while it returns true
LiquidGlass.components.{tabs, switch, slider, menu, progressiveBlur, draggable}(el)
```

Option names in JS are camelCase without the `data-glass-` prefix:

```js
const g = LiquidGlass.apply(card, { variant: 'clear', refraction: 28, magnify: 1.2, tint: '#ff375f', interactive: true });
g.update({ dispersion: 0.2 });
LiquidGlass.init({ light: 'fixed' });   // global: disable pointer-driven specular light
LiquidGlass.init({ mode: 'scene' });    // global: force the cross-browser renderer everywhere
```

Removing a tint at runtime: `const g = LiquidGlass.get(el); delete g.userOpts.tint; g.update({})`.

## Events

| Event | Target | `detail` |
|---|---|---|
| `lg:change` | `.lg-tabs` | `{ index, tab }` |
| `lg:select` | `.lg-menu` | `{ item, value }` (`value` = `data-value` or text) |
| `change` / `input` | the native `<input>` inside `.lg-switch` / `.lg-slider` | native |

Imperative helpers attached to elements: `nav.lgSelect(i)` on tabs, `menu.lgOpen(true|false)` on menus.

## CSS custom properties

Set them on the element, an ancestor, or `:root`.

| Variable | Purpose |
|---|---|
| `--lg-fg`, `--lg-fg-2` | Text colours on glass (primary / secondary) |
| `--lg-fill`, `--lg-fill-clear` | Base fill of regular / clear glass |
| `--lg-solid` | Opaque fill used for Reduce Transparency / Increase Contrast |
| `--lg-rim-hi`, `--lg-rim-lo`, `--lg-rim-width` | Specular rim colours and width |
| `--lg-edge`, `--lg-catch`, `--lg-catch-2`, `--lg-inner` | Bevel lighting (inner shadows) |
| `--lg-shadow` | Drop shadow |
| `--lg-highlight` | Hover/pressed fill for items inside glass (toolbars, menus) |
| `--lg-light-angle` | Specular light direction (updated by the pointer unless `light: 'fixed'`) |
| `--lg-accent` | Focus ring + selected tab colour |
| `--lg-tab-active` | Selected tab label colour |
| `--lg-switch-on` | Switch "on" colour (default `--lg-green`) |
| `--lg-slider-fill` | Slider fill colour |
| `--lg-indicator-rgb` | Resting tab indicator colour as `r g b` |
| `--lg-pb-tint` | Progressive-blur edge tint |
| `--lg-font` | System font stack used by the components |

Runtime variables written by the engine (read them in your own CSS if useful): `--lg-press` (0–1 while pressed), `--lg-px`/`--lg-py` (pointer position in %), `--lg-active` (component lens activity), `--lg-on` (switch progress), `--lg-open` (menu progress), `--lg-r` (resolved radius).

## Layers created inside each glass element

```
.glass.lg-ready
└─ span.lg-layers (z-index:-1, box-shadow)
   ├─ span.lg-refract   backdrop-filter: blur() url(#svg) saturate() brightness() contrast()
   ├─ span.lg-tint      base fill + bevel lighting (inset shadows)
   ├─ span.lg-shade     bevel shading image (3D normals of the squircle rim, generated with the map)
   ├─ span.lg-glow      radial glow at the touch point (opacity = --lg-press)
   └─ span.lg-rim       specular rim: conic gradient masked to a 1.2px ring
```

The element gets `isolation: isolate` (and `position: relative` if it was static) so these layers sit under its own children.
