# Apple Human Interface Guidelines — Liquid Glass, distilled

Paraphrased from Apple's HIG ([Materials](https://developer.apple.com/design/human-interface-guidelines/materials), updated Sept 2025) and the [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass) overview, translated into web terms. Use these as design constraints when applying the library.

## What it is

- Liquid Glass is a **dynamic material** that forms a distinct *functional layer* for controls and navigation (tab bars, sidebars, toolbars), floating above the *content layer*. Content scrolls and peeks through underneath, which keeps a sense of place and depth while controls stay legible.
- It bends (lenses) and concentrates light rather than just blurring, has specular highlights that react to movement, and adapts its tint/brightness to what is behind it.
- It comes to life on interaction: controls grow, glow from the touch point, and morph (a button becomes a menu; a slider/toggle knob becomes glass while you touch it).

## Where to use it

| Do | Don't |
|---|---|
| Navigation: top bars, tab bars, sidebars, toolbars | Page backgrounds, cards, list rows, article bodies |
| Floating primary actions, menus, popovers, sheets | Decorating many custom controls "because it looks cool" |
| Transient states of content controls (slider/toggle knob while active) | Glass inside glass inside glass |

- **Don't use Liquid Glass in the content layer.** Use standard materials (plain blur, fills) there. Exception: controls like sliders and toggles take on glass *while being manipulated*.
- **Use it sparingly.** Limit it to the most important functional elements; overuse distracts from the content it exists to reveal.
- **Avoid crowding or layering glass elements on top of each other.**

## Variants

- **Regular** (default): blurs and adjusts luminosity of what's behind to keep text and symbols legible. Use for components with significant text (alerts, sidebars, popovers) or whenever the background could hurt legibility. Bars also use a *scroll edge effect* (blur + fade of content scrolling beneath) — see `.lg-progressive-blur`.
- **Clear**: highly translucent, prioritises the background. Only over visually rich media (photos, video). For contrast: if the content underneath is **bright, add a dark dimming layer at 35% opacity** (`data-glass-dim`); if it is already dark, no dimming is needed.

## Color and emphasis

- Be judicious with color in controls and navigation. Prefer system-like accent colors with light/dark variants and an increased-contrast option.
- Tinting glass signals emphasis or state — reserve it for the primary action (`data-glass-tint`).
- Use vibrant (high-contrast) label colours on top of materials; avoid low-contrast greys on thin glass.

## Shape, layout and grouping

- Shapes are rounder and **concentric** with their containers: nested corner radius = outer radius − inset. Capsules for most controls.
- Toolbars: group items that perform related actions; separate groups with space (a fixed spacer), not more glass. Don't mix text and icons within one shared background. Every icon needs an accessibility label.
- Tab bars float above content and may minimise while scrolling; sidebars and inspectors float with content extending beneath them.
- Sheets/popovers use larger radii; half sheets are inset so content peeks around them, becoming more opaque when expanded to full height.

## Accessibility (must keep)

- People can reduce transparency, increase contrast, reduce motion, or choose a more tinted Liquid Glass look. Standard components adapt automatically — custom ones must too:
  - `prefers-reduced-transparency: reduce` → opaque material (the library swaps to `--lg-solid`).
  - `prefers-contrast: more` → opaque material + visible border (built in).
  - `prefers-reduced-motion: reduce` → no springs, wobble or light tracking (built in).
- Test custom elements, colors and animations with these settings on.
- Keep keyboard focus visible and use native controls (`<button>`, `<input type=checkbox|range>`).

## Checklist before shipping

- [ ] Glass only on the functional layer; content uses non-glass surfaces.
- [ ] ≤ a handful of glass elements visible at once; none stacked on another.
- [ ] Regular for anything with text; clear only over media, with 35% dim on bright media.
- [ ] One tinted primary action at most per view.
- [ ] Concentric radii; capsules for controls.
- [ ] Scroll edge effect under bars that have content scrolling beneath.
- [ ] Legible over the brightest and darkest parts of the background.
- [ ] Works with Reduce Transparency, Increase Contrast and Reduce Motion; focus visible; icon buttons labelled.
