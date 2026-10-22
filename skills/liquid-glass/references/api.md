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
| `data-glass` | `""` \| `regular` \| `clear` | `regular` | Alternative to the class; the value picks the material |
| `data-glass-variant` | `regular` \| `clear` | `regular` | Same as above |
| `data-glass-refraction` | px | auto | How far the rim pulls the backdrop inward. Auto ≈ 20% of the short side, growing to 60 px on large surfaces |
| `data-glass-bezel` | px | `20` | Depth of the curved rim (circular profile) |
| `data-glass-magnify` | ≥ 1 | `1` | Uniform zoom of the flat center |
| `data-glass-dispersion` | 0–0.8 | `0` | Splits R/G/B displacement (prism fringes) |
| `data-glass-tint` | `#rrggbb` | — | Colored glass (transmits luminance); text turns white |
| `data-glass-dim` | flag | — | 35% black layer (HIG, clear glass over bright media) |
| `data-glass-interactive` | flag | — | Press scale, pointer stretch, glow from the touch point |
| `data-glass-draggable` | flag | — | Drag with momentum + rubber-band bounds (uses `left/top`); inner buttons/inputs keep their clicks |
| `data-glass-appearance` | `light` \| `dark` \| `auto` | `light` | On the element or any ancestor; changing it re-renders live |
| `data-glass-mode` | `auto` \| `backdrop` \| `scene` \| `fallback` | `auto` | Force a renderer |
| `data-glass-group` | on a container | — | Glass descendants merge into one liquid surface (GlassEffectContainer) |
| `data-glass-merge` | px | `24` | On a group: distance at which shapes start to melt together |

Material constants (`LiquidGlass.materials`): **regular** — frost blur 7.33 px, fill blur 23 px (light, lighten, 34%) / 21.8 px (dark, darken, 65%), quadratic tone curve + saturation 1.10 (light) / 1.06 (dark); **clear** — no blur, tone curve with shadow lift and highlight roll-off.

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
LiquidGlass.maps(w, h, r, opts)      // → { field, overlay, mask, scale } data URLs (for visualisations)
LiquidGlass.materials                // calibrated material constants
LiquidGlass.group(el)                // upgrade a container to a liquid group (auto for [data-glass-group], .lg-glass-group)
LiquidGlass.Spring                   // new Spring(value, { stiffness, damping, mass }) · .to(t) · .set(v) · .step(dt)
LiquidGlass.animate(fn)              // fn(dt) per frame while it returns true
LiquidGlass.components.{tabs, switch, slider, menu, progressiveBlur, draggable}(el)
```

Option names in JS are camelCase without the `data-glass-` prefix:

```js
const g = LiquidGlass.apply(card, { variant: 'clear', refraction: 28, magnify: 1.2, tint: '#ff375f', interactive: true });
g.update({ dispersion: 0.2 });
LiquidGlass.init({ mode: 'scene' });    // global: force the cross-browser renderer everywhere
```

Removing a tint at runtime: `LiquidGlass.apply(el, { tint: null })`.

## Events

| Event | Target | `detail` |
|---|---|---|
| `lg:change` | `.lg-tabs` | `{ index, tab }` |
| `lg:select` | `.lg-menu` | `{ item, value }` (`value` = `data-value` or text) |
| `change` / `input` | the native `<input>` inside `.lg-switch` / `.lg-slider` | native |

Imperative helpers attached to elements: `nav.lgSelect(i)` on tabs, `menu.lgOpen(true|false)` on menus.

## CSS custom properties

| Variable | Purpose |
|---|---|
| `--lg-fg`, `--lg-fg-2` | Text colours on glass (primary / secondary), per appearance |
| `--lg-frost` | Fill of the frosted fallback (no refraction available) |
| `--lg-solid` | Opaque fill used for Reduce Transparency / Increase Contrast |
| `--lg-shadow` | Optional drop shadow (none by default, like Apple's flat glass) |
| `--lg-highlight` | Hover/pressed fill for items inside glass (toolbars, menus) |
| `--lg-glow-color` | Colour of the interactive glow |
| `--lg-accent` | Focus ring + selected large-tab colour |
| `--lg-tab-active` | Selected tab label colour |
| `--lg-switch-on` | Switch "on" colour (default `--lg-green`) |
| `--lg-slider-fill` | Slider fill colour |
| `--lg-pb-tint` | Progressive-blur edge tint |
| `--lg-font` | System font stack used by the components |

Runtime variables written by the engine: `--lg-press` (0–1 while pressed), `--lg-px`/`--lg-py` (pointer position), `--lg-active` (component lens activity), `--lg-on` (switch progress), `--lg-open` (menu progress), `--lg-r` (resolved radius).

## Layers created inside each glass element

```
.glass.lg-ready
└─ span.lg-layers (z-index:-1, box-shadow)
   ├─ span.lg-refract   backdrop-filter: url(#svg) — the whole material graph (Chromium)
   ├─ span.lg-fill      fallback / accessibility / dim fill (transparent while refraction runs)
   ├─ span.lg-glow      radial glow at the touch point (opacity = --lg-press)
   └─ span.lg-overlay   rim lighting image (covers the shape + 2 px)
```

The layers are restored automatically if `innerHTML`/`textContent` wipes them. The element gets `isolation: isolate` (and `position: relative` if it was static) so these layers sit under its own children.
