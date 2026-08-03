# art rules — graphics conformance review

Run this against any change that draws, renders, or ships art. Answer
every item PASS/FAIL **with evidence** — a screenshot, a measurement, a
test, or the line of code. "Looks right" is not evidence.

Items marked → cite the file that already owns the law; this list is
the review instrument, not a second copy of the rule.

## projective law (owned here)

1. One camera, frontal one-point only — no rotation, no second VP.
2. Eye height constant: horizon (CY) = eye line; HF = 15u in every
   scene.
3. Lens by register: rooms F≈115, cinema F≈170+ — no per-scene whims.
4. Geometry solved, not sketched: surfaces from first-hit projection
   (or hand art drawn over the solver's guides); seams meet exactly.
5. Texture in world space: mortar/detail thins with distance as 1/z;
   grime hashes on world coords, not screen coords.

## canvas & rendering (→ ui.md, DESIGN.md §art direction)

6. Logical 240-wide portrait; INTEGER upscale only; crisp-edges /
   `imageSmoothingEnabled = false`; never fractional-scale the art
   layer.
7. True-black letterbox fills the remainder.
8. UI text is native-res DOM/type OVER the art — never dithered canvas
   text, never scaled pixel text for body copy.
9. Vignette = ordered-dither aperture ON the pixel grid — not a CSS
   radial-gradient; maps to sanity; never occludes the panel; no
   sanity number rendered anywhere.

## image laws (owned here)

10. One motivated light source per scene; 30–40% true black.
11. Hand dither only: no tool gradients, no auto-AA, no mixels, no
    off-grid rotation/scaling.
12. CONTOUR: every gameplay mass has a continuous silhouette (dark cut
    vs light, lit edge vs dark) + a contact shadow.
13. If it's tappable, it catches the light — rim readable with the
    outline toggle OFF.
14. Stillness: ≤2 ambient touches; no idle animation; motion only on
    declared scares.
15. Palette: on-master colors only; per-depth base + ONE accent; dice
    sprites ≥24 logical px with leans drawn physically.

## engine purity, if renderer code (→ ui.md, engine.md)

16. Free tap mutates nothing — deep-clone-proven in a test.
17. Renderer reads View, computes nothing, never writes state.
