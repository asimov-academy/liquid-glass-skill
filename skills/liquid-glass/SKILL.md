---
name: liquid-glass
description: Build Apple's Liquid Glass material (iOS 26 / macOS Tahoe style) on the web with pure HTML, CSS and vanilla JavaScript — real lens refraction through SVG displacement maps computed per element, liquid morphing between shapes (GlassEffectContainer), a specular rim that follows the light, interactive spring physics, and ready-made components (glass buttons, toolbars, tab bars with a draggable liquid lens, morphing menus, merging glass groups, switches, sliders, progressive blur, magnifier lenses). Use whenever the user asks for liquid glass, Apple/iOS 26 glass UI, glassmorphism with refraction, frosted glass navbars or controls, or any glass effect without React or a build step.
---

# Liquid Glass for the web

A dependency-free library (`liquid-glass.js` + `liquid-glass.css`, ~16 KB min+gzip) that recreates Apple's Liquid Glass. Any element with `class="glass"` becomes a refracting, lit, optionally interactive glass surface. Ship the two files from `assets/` with the page and write semantic HTML — no framework, no bundler.

## Quick start

1. Copy `assets/liquid-glass.css` and `assets/liquid-glass.js` next to the page (or use the CDN below).
2. Load them; the script auto-initialises on `DOMContentLoaded` and watches the DOM for new glass.
3. Put `.glass` on floating, functional UI and give it a `border-radius` (the radius *is* the lens shape).

```html
<link rel="stylesheet" href="liquid-glass.css">
<script src="liquid-glass.js" defer></script>

<nav class="glass" style="border-radius:999px; padding:6px 10px">…</nav>
<button class="glass lg-button" data-glass-interactive>Continue</button>
```

CDN: `https://cdn.jsdelivr.net/gh/asimov-academy/liquid-glass-skill@main/dist/liquid-glass.{css,js}`

`templates/starter.html` is a complete, cross-browser starting page.

## Design rules (Apple HIG — follow them)

- **Glass is the functional layer, never the content layer.** Use it for navigation bars, tab bars, toolbars, floating buttons, menus, sheets and popovers that float *above* content. Cards, list rows and page backgrounds are content: use plain fills or standard blur instead.
- **Use it sparingly.** A few key controls per screen. Many glass elements compete with the content the material is meant to reveal.
- **Don't stack glass on glass.** Inside a glass panel, use plain fills for segmented controls and rows (`.lg-tabs` without `.glass`, `background: rgb(120 120 128 / .24)`).
- **Regular vs clear.** `regular` (default) blurs and compresses luminosity for legibility — use it for anything with text. `clear` (`data-glass="clear"`) is for controls over rich media (photos, video); over *bright* media add the 35% dimming layer with `data-glass-dim`.
- **Tint with intent.** Use `data-glass-tint="#0a84ff"` only for the primary action (Apple's `glassProminent`).
- **Concentric, rounded shapes.** Capsules (`border-radius: 999px`) for controls; inner radius = outer radius − padding for nested shapes.
- **Content scrolls under bars** — pair top/bottom bars with `.lg-progressive-blur` (scroll edge effect).
- **Accessibility is built in**: Reduce Transparency and Increase Contrast switch to an opaque material, Reduce Motion disables springs and light tracking. Keep it that way: never override those media queries, keep visible focus, use real `<button>`/`<input>` elements and `aria-label` on icon-only buttons.

Full guidance with sources: `references/hig.md`.

## Choosing the renderer (important)

The engine picks one of three renderers per element (`data-lg-mode` shows which):

| Renderer | When | What you get |
|---|---|---|
| `backdrop` | Chromium (Chrome, Edge, Arc, Opera, Samsung) | Live refraction of **anything** behind the element via `backdrop-filter: url(#svg)` |
| `scene` | Safari / Firefox, when the glass is inside a `.lg-scene` that has a `.lg-backdrop` | The same optics, rendered as an SVG lens filter on the backdrop layer |
| `fallback` | No scene, or Reduce Transparency / Increase Contrast | Frosted blur + same rim, tint and springs |

**To get real refraction in Safari and Firefox too, wrap the background in a scene** — do this by default for hero sections, cards and app frames:

```html
<section class="lg-scene" style="position:relative">
  <div class="lg-backdrop" style="position:absolute; inset:0; background:url(photo.jpg) center/cover"></div>
  <button class="glass lg-button" data-glass-interactive>Play</button>   <!-- NOT inside .lg-backdrop -->
</section>
```

Rules: glass elements live inside the scene but **outside** `.lg-backdrop`; whatever is inside `.lg-backdrop` (images, text, canvas, video, scrolling lists) is what gets refracted. Page-level fixed navbars that float over arbitrary content usually stay outside any scene (refraction in Chromium, frosted elsewhere) — that is fine.

## Options (data attributes)

| Attribute | Default | Meaning |
|---|---|---|
| `data-glass="clear"` | regular | Variant |
| `data-glass-bezel` | auto (30% of the short side, 6–90) | Width of the curved rim, px |
| `data-glass-refraction` | auto (0.75 × bezel) | Max bend at the rim, px — keep ≤ bezel or the rim folds |
| `data-glass-magnify` | 1 | Lens zoom of the flat center (1.2–1.5 for lenses/knobs) |
| `data-glass-dispersion` | 0 | Chromatic aberration (0.05–0.25 over photos/headlines; 0 over body text) |
| `data-glass-blur` | 7 (regular) / 0.5 (clear) | Frost, px |
| `data-glass-tint` | — | Colored (prominent) glass, e.g. `#0a84ff` |
| `data-glass-dim` | — | 35% dark layer for clear glass over bright media |
| `data-glass-interactive` | — | Spring press, stretch toward the pointer, glow from the touch point |
| `data-glass-draggable` | — | Draggable with momentum (lenses, droplets); needs `position:absolute/fixed` |
| `data-glass-appearance` | light | `dark` / `light` / `auto` (on the element or any ancestor, e.g. `<html>`) |
| `data-glass-mode` | auto | Force `backdrop` / `scene` / `fallback` |

JS API, events and CSS variables: `references/api.md`.

## Components

All are plain HTML; the script wires them up automatically. Full markup and options: `references/components.md`.

- **Button** — `<button class="glass lg-button" data-glass-interactive>`; `.lg-icon` for icon-only; `data-size="small|large"`.
- **Toolbar** — `<div class="glass lg-toolbar" role="toolbar">` with plain `<button>`s inside (one capsule per group).
- **Tab bar / segmented control** — `<nav class="glass lg-tabs"><div class="lg-tabs-list" role="tablist"><button role="tab" aria-selected="true">…` — a liquid lens slides, stretches and magnifies; draggable; emits `lg:change`.
- **Menu** — `.lg-menu` > trigger `[aria-haspopup]` + `.glass.lg-menu-panel[role=menu]`; the button morphs into the panel; emits `lg:select`.
- **Switch** — `<label class="lg-switch"><input type="checkbox"></label>`; knob turns into a glass droplet while touched.
- **Slider** — `<div class="lg-slider"><input type="range"></div>`; glass thumb while dragging.
- **Progressive blur** — `<div class="lg-progressive-blur" data-direction="top|bottom">` for scroll-edge effects.
- **Lens** — `.glass` circle with `data-glass="clear" data-glass-magnify="1.4" data-glass-draggable`.
- **Liquid morph (GlassEffectContainer)** — wrap nearby glass in `<div data-glass-group data-glass-merge="24">`: members render as **one** surface whose shapes melt together with a neck as they approach and pinch apart as they separate (drag a droplet near a toolbar, or reveal a button that buds out of a bar). Live refraction in Chromium; masked frosted glass elsewhere.

## Pitfalls that break the effect (check every time)

1. **Never put `opacity < 1`, `filter`, `mask`, `clip-path`, `mix-blend-mode` or `backdrop-filter` on an *ancestor* of a glass element.** In Chromium these create a "backdrop root" and the glass goes blank or shows a rectangle. Fade glass with `scale`/position, or fade only its children. `transform`, `translate`, `scale` and `overflow` are fine.
2. **Don't give `.glass` a `background`.** The material draws its own layers; an opaque background hides the refraction. Use `data-glass-tint` for color.
3. **The shape comes from `border-radius`.** Set it on the element itself (`999px` for capsules, `50%` for circles).
4. **Glass must not be inside `.lg-backdrop`** (it would refract itself), and every `.lg-scene` needs a positioned context.
5. **Text on glass**: regular variant, `font-weight ≥ 500`, enough size; check it over the brightest and darkest part of the background.
6. **Big lens over big text**: the auto bezel can stretch letters that cross the rim a lot. For pills/lenses over headlines set `data-glass-bezel` ≈ 20% of the height and `data-glass-refraction` ≈ half of the bezel.
7. **Performance**: each glass element is a live filter. Keep it to a handful per viewport; avoid huge `data-glass-blur` values on full-screen panels; prefer `transform` for animation.

More symptoms → fixes: `references/troubleshooting.md`. How the optics work (to explain or tune): `references/how-it-works.md`.

## Workflow

1. Identify the functional layer (nav, tab bar, toolbar, primary actions, menus). Everything else stays non-glass.
2. Decide the background: for hero/cards/app frames, build a `.lg-scene` with a `.lg-backdrop` so Safari/Firefox refract too.
3. Copy `assets/` into the project and link both files (or the CDN).
4. Write semantic markup with `.glass` + attributes; use the component classes instead of re-implementing them.
5. Choose appearance: `data-glass-appearance="dark"` on `<html>` for dark UIs over dark/colourful media.
6. Verify in a browser: no rectangles around glass, rim visibly bends the background, text legible, keyboard focus visible, and the page still looks right with Reduce Motion / Reduce Transparency enabled. Check `data-lg-mode` on elements if refraction seems missing.
