# Components — markup recipes

Every recipe works with the two library files only. Icons are omitted (`…`); use inline SVG with `aria-hidden="true"` and put an `aria-label` on icon-only buttons.

## Surface (card, panel, sheet, popover)

```html
<div class="glass" style="border-radius:28px; padding:18px 20px; width:360px">
  …content…
</div>
```

- `border-radius` is required (it is the lens shape). Big panels: `data-glass-refraction="18" data-glass-bezel="20"`.
- For nested shapes keep corners concentric: inner radius = outer radius − padding.

## Buttons

```html
<button class="glass lg-button" data-glass-interactive>Learn more</button>
<button class="glass lg-button" data-glass-interactive data-glass-tint="#0a84ff">Get started</button>  <!-- primary -->
<button class="glass lg-button" data-glass="clear" data-glass-dim data-glass-interactive>Over a photo</button>
<button class="glass lg-button lg-icon" data-glass-interactive aria-label="Add">…</button>
<!-- sizes: data-size="small" (32px) | default (44px) | data-size="large" (54px) -->
```

Works on `<a>` too (`<a class="glass lg-button" href>`). One tinted (prominent) action per view.

## Toolbar

```html
<div class="glass lg-toolbar" role="toolbar" aria-label="Formatting">
  <button aria-label="Bold" aria-pressed="true">…</button>
  <button aria-label="Italic" aria-pressed="false">…</button>
  <span class="lg-toolbar-sep" role="separator"></span>
  <button aria-label="Share">…</button>
</div>
```

Items are plain buttons (hover = `--lg-highlight`, pressed = accent colour via `aria-pressed`). Make one capsule per group of related actions; separate groups with gap, not with more glass inside glass.

## Tab bar / segmented control

```html
<nav class="glass lg-tabs" data-size="large" aria-label="Sections">
  <div class="lg-tabs-list" role="tablist">
    <button role="tab" aria-selected="true">…<span>Home</span></button>
    <button role="tab">…<span>Browse</span></button>
    <button role="tab">…<span>Library</span></button>
  </div>
</nav>
<script>
  document.querySelector('.lg-tabs').addEventListener('lg:change', e => show(e.detail.index));
</script>
```

- The script adds a lens (`.lg-tabs-indicator`). At rest it is a soft fill behind the selected tab; while touched or dragged it becomes clear glass above the labels, magnifies them, stretches with velocity and snaps with a spring.
- Keyboard: arrow keys, Home/End (roving `tabindex`).
- Tune the lens on the `<nav>`: `data-lens-magnify="1.22"`, `data-lens-refraction="10"`, `data-lens-bezel="9"`, `data-lens-dispersion="0.25"`.
- Columns are equal width (`grid-auto-columns: 1fr`). In tight containers add `.lg-tabs { min-width:0 } .lg-tabs-list { grid-auto-columns: minmax(0,1fr) }` and smaller tab padding.
- Segmented control = same markup without `data-size="large"`. Inside another glass panel, drop the `.glass` class and give the nav `background: rgb(120 120 128 / .24)`.
- iOS 26 layout: tab bar + a separate circular search button: `<button class="glass lg-button lg-icon" style="width:62px;height:62px">`.

## Menu (button morphs into the panel)

```html
<div class="lg-menu" data-placement="bottom">           <!-- or "top" -->
  <button class="glass lg-button lg-icon" data-glass-interactive aria-haspopup="menu" aria-label="More">…</button>
  <div class="glass lg-menu-panel" role="menu" aria-label="Actions">
    <button role="menuitem">…Copy</button>
    <button role="menuitem" data-value="share">…Share</button>
    <div class="lg-menu-sep" role="separator"></div>
    <button role="menuitem" data-destructive>…Delete</button>
  </div>
</div>
```

Opens from the trigger's corner with a spring (scale only — no opacity on the glass), focuses the first item, arrow keys move, Escape/outside click closes, `lg:select` reports the choice. The wrapper must not be clipped by an `overflow:hidden` ancestor if the panel needs to escape it.

## Switch

```html
<label class="lg-switch"><input type="checkbox" checked aria-label="Wi-Fi"></label>
<label class="lg-switch" style="--lg-switch-on:#ff9f0a"><input type="checkbox" aria-label="Airplane mode"></label>
```

64×28 track, 39×24 knob. Tap toggles, dragging the knob decides by position, keyboard Space works (native checkbox). Listen to the input's `change`.

## Slider

```html
<div class="lg-slider"><input type="range" min="0" max="100" value="60" aria-label="Brightness"></div>
<div class="lg-slider" style="--lg-slider-fill:#30d158"><input type="range" aria-label="Volume"></div>
```

Native range for keyboard and screen readers; the glass thumb follows with a stiff spring and stretches with velocity. Listen to `input`/`change` on the input.

## Progressive blur (scroll edge effect)

```html
<div class="scroll-area">…</div>
<div class="lg-progressive-blur" data-direction="top" data-blur="20" data-layers="6"
     style="height:120px; --lg-pb-tint: rgb(0 0 0 / .4)"></div>
<header class="bar">…glass controls…</header>
```

Absolutely positioned (top by default; `data-direction="bottom"` for bottom bars). Place it *under* the bar in DOM/z order and above the scrolling content. Use `position: fixed` for page-level bars.

## Lens / magnifier / droplet

```html
<div class="glass" data-glass="clear" data-glass-draggable data-glass-interactive
     data-glass-magnify="1.4" data-glass-refraction="18" data-glass-bezel="34" data-glass-dispersion="0.08"
     tabindex="0" role="img" aria-label="Magnifier"
     style="position:absolute; width:180px; height:180px; border-radius:50%"></div>
```

Arrow keys move it (Shift = 40px). Over text keep `dispersion ≤ 0.08`; over photos/headlines 0.2–0.35 looks great.

## Navbar over a scrolling page

```html
<div class="lg-progressive-blur" data-direction="top" style="position:fixed; height:110px"></div>
<nav class="glass" style="position:fixed; top:16px; left:50%; translate:-50% 0; border-radius:999px; padding:6px">
  …links… <a class="glass lg-button" data-size="small" data-glass-tint="#0a84ff" href="#">Sign in</a>
</nav>
```

Refracts the live page in Chromium; frosted in Safari/Firefox (there is no scene to sample for a page-level fixed bar). That trade-off is expected.

## Cross-browser app frame (scene)

```html
<div class="app lg-scene" style="position:relative; overflow:hidden; border-radius:44px">
  <div class="lg-backdrop" style="position:absolute; inset:0; overflow:auto">…feed…</div>
  <nav class="glass lg-tabs" style="position:absolute; left:14px; right:14px; bottom:20px">…</nav>
</div>
```

Everything inside `.lg-backdrop` (including scrolled content, canvas or `<video>`) is refracted by every glass element of the scene, in every browser.

## Liquid morph group (GlassEffectContainer)

```html
<div data-glass-group data-glass-merge="24" style="position:relative">
  <div class="glass lg-toolbar" role="toolbar" aria-label="Edit">
    <button aria-label="Undo">…</button>
    <button aria-label="Add" id="add" aria-expanded="false">…</button>
  </div>
  <!-- a button that "buds" out of the toolbar: animate its translate/scale, the group melts the shapes -->
  <button class="glass lg-button lg-icon" id="bud" data-glass-interactive aria-label="Favorite">…</button>
  <!-- a free droplet: drag it close to the bar and watch the neck form -->
  <div class="glass" data-glass-draggable tabindex="0" aria-label="Glass droplet"
       style="position:absolute; width:110px; height:110px; border-radius:50%"></div>
</div>
```

- Every `.glass` descendant becomes a member (`data-lg-mode="member"`); the group draws one refraction, tint and rim for the union of the shapes.
- `data-glass-merge` is the gap (px) at which shapes start touching. 16–32 looks like Apple's; larger values make thicker necks.
- Animate members with `translate`/`scale` (or the built-in springs/draggable) — the group wakes up while things move and sleeps when still.
- Refracts in Chromium; in Safari/Firefox it renders as frosted glass with the same merged mask.
- HIG: use it for controls that belong together (a toolbar and its overflow button, a tab bar and its search button), not to glue unrelated UI.
