# art rules — the projective system (non-negotiable)

THREE SPACES, three units. Never leak one into another:
- WORLD space: game geometry, in world units (1u = 10cm).
- FRAME space: composition, in FRACTIONS of the logical frame.
- PHYSICAL space: touch, in device-independent points / millimeters.
Raw pixel constants are FORBIDDEN everywhere except inside a named
ASSET GRID PROFILE (see below).

- THE BODY IS THE CONSTANT: eye height = 15u above the floor in
  every scene, forever — rooms scale, the protagonist does not. The
  horizon is the eye line; the vanishing point lives on it. Horizon
  sits at ≈0.45 of frame height in the room register.
- FRONTAL LAW: the camera never rotates. Every room is one-point
  perspective looking straight down +z. The stare is the style.
- LENSES ARE FIELDS OF VIEW, by register: rooms ≈92° horizontal ·
  cinema ≈70° or tighter (compression is the claustrophobia). Focal
  length is derived per frame: F = (frameWidth/2) / tan(FOV/2).
- PROJECTION: sx = cx + F·X/z · sy = horizon − F·Y/z. Size falls as
  1/z; equal world spacing compresses harmonically.
- SCENES ARE PLANES + BOXES in that camera; per pixel the first hit
  (smallest z) wins — seams exact by construction; the contour cut
  is drawn on surface boundaries, not guessed.
- TEXTURE IN WORLD SPACE: brick courses, mortar, grime hash on world
  coordinates — mortar thins with distance on its own; dirt sticks
  to the wall under any camera shift.
- OBJECTS ARE DECLARATIVE: placed at world (X, z) with world sizes;
  screen position, scale, contact shadow, and TAP HOTSPOT are all
  derived by projection, never hand-placed.
- DEPTH CUES, in order: reference geometry at equal world intervals
  (courses, flags, colonnades, treads) · z-dithered fog · known-size
  props (the body, a door, a die).
- SPRITE MINIMUMS in frame fractions: dice read at ≥0.10 of frame
  width; no gameplay-critical read below ≈0.03 of frame width.
- ASSET GRID PROFILE: hand-painted pixel art is authored on ONE
  named logical grid per asset set (current profile: GRID-240,
  portrait). The profile is a product choice, not law; switching
  profiles re-authors assets and changes no rule and no code.
- Hand art is painted OVER the solver's guides: VP + corner rays +
  harmonic rungs. The math scaffolds; the hand bricks.

## image laws

Carried forward from the conformance review (PR #12). The projective
system above supersedes that file's camera items — with better math,
since FOV survives a frame-size change and a fixed focal length does
not. These were not restated there, so they are kept, not superseded.
Answer each PASS/FAIL with evidence.

- One motivated light source per scene; 30–40% true black.
- Hand dither only: no tool gradients, no auto-AA, no mixels, no
  off-grid rotation/scaling.
- CONTOUR: every gameplay mass has a continuous silhouette (dark cut
  vs light, lit edge vs dark) + a contact shadow.
- If it's tappable, it catches the light — rim readable with the
  outline toggle OFF.
- Stillness: ≤2 ambient touches; no idle animation; motion only on
  declared scares.
- Palette: on-master colors only; per-depth base + ONE accent.
- Renderer purity (→ ui.md, engine.md): the free tap mutates nothing,
  proven by deep clone in a test; the renderer reads View, computes
  nothing, and never writes state.
