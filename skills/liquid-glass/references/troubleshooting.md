# Troubleshooting

Check the element's `data-lg-mode` attribute first (`backdrop`, `scene` or `fallback`).

| Symptom | Cause | Fix |
|---|---|---|
| Glass looks like plain frosted blur in Safari/Firefox | No scene → `fallback` | Wrap the background: `.lg-scene > .lg-backdrop` + glass as a sibling of the backdrop |
| Glass is blank/transparent or shows the page background colour in Chrome | An ancestor has `opacity < 1`, `filter`, `mask`, `clip-path`, `mix-blend-mode`, `backdrop-filter` or `will-change` of those (backdrop root) | Remove it from ancestors. Animate with `scale`/`translate`; fade children instead of the glass |
| A rectangle is visible around rounded glass | Custom CSS overrides `.lg-refract` radius, or the element has no `border-radius` | Don't restyle `.lg-layers` internals; set `border-radius` on the `.glass` element |
| No refraction visible at all, only tint | `data-glass-refraction="0"`, or the background is a flat colour | Refraction needs detail behind it (image, text, gradient with texture) |
| Opaque white/grey surface | `prefers-reduced-transparency` or `prefers-contrast: more` is on | Expected (accessibility). Test with them off |
| Glass refracts itself / double image | The glass element is inside `.lg-backdrop` | Move it out of the backdrop (keep it inside the `.lg-scene`) |
| Lens lags behind a moving element in Safari/Firefox | The scene is off-screen or the backdrop is transformed in 3D | Keep the backdrop 2D; the scene loop only runs while visible |
| Edges show dark smears near the scene border | Lens samples outside the backdrop | Make the backdrop larger than the visible area (`inset: -40px`) or keep lenses away from edges |
| Text on glass hard to read | Clear variant over busy/bright media | Use regular, or `data-glass-dim`, larger/bolder text, `data-glass-appearance="dark"` |
| Menu panel cut off | An ancestor has `overflow: hidden` | Move `.lg-menu` outside the clipping ancestor or use `data-placement="top"` |
| Tab labels overflow on small screens | 1fr columns with long labels | `.lg-tabs-list { grid-auto-columns: minmax(0,1fr) }` + smaller tab padding |
| Changing `border-radius` from JS doesn't update the lens | Radius isn't observed | Call `LiquidGlass.refresh(el)` |
| Jank with many glass elements | Each is a live filter | Fewer glass elements, smaller blur, avoid full-screen glass; prefer `transform` animations |
| Element not upgraded | Added inside Shadow DOM, or script loaded with `data-manual` | Call `LiquidGlass.apply(el)` / `LiquidGlass.init()` |
