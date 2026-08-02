# ui rules (non-negotiable)

- Free tap NEVER mutates state — it describes and selects only;
  mutations go through explicit actions.
- One-thumb portrait: interactive controls live in the bottom ~40%;
  every tap target ≥44px effective.
- Pixel art renders at logical 240-wide, integer upscale,
  crisp-edges, true-black letterbox; UI text is native-res OVER the
  art; the sanity vignette is dithered on the pixel grid.
- Nothing collapses or hides: the strip is always visible; panes page,
  never stack.
- Timed pressure exists only inside declared QTEs, each with its
  Will-check fallback and a global accessibility conversion.
