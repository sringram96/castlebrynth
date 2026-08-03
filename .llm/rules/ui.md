# ui rules (non-negotiable)

- Free tap NEVER mutates state — it describes and selects only;
  mutations go through explicit actions.
- THREE SPACES (see art.md). In shell code: layout in frame
  fractions or theme tokens; geometry from the projector; touch
  sizing in device-independent points. NUMERIC PIXEL LITERALS IN
  LAYOUT CODE ARE A LINT ERROR — if you type "px", it belongs in a
  token derived from frame size or platform constants.
- One-thumb portrait: interactive controls live in the bottom ~40%
  of the screen; every tap target ≥44 device-independent points
  (≈7mm) regardless of art scale.
- The art frame renders at the asset grid profile's logical size,
  INTEGER upscale only, crisp edges, true-black letterbox filling
  the remainder. UI text is native-resolution OVER the art.
- The sanity vignette is an ordered-dither aperture ON the logical
  pixel grid — never a smooth gradient; it never occludes the panel;
  no sanity number is ever rendered.
- Nothing collapses or hides: the strip is always visible; panes
  page, never stack.
- Timed pressure exists only inside declared QTEs, each with its
  Will-check fallback and a global accessibility conversion.
