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
- ASSET GRID PROFILES, one per register: rooms author on GRID-240;
  cinema authors on CINE-480 (2x linear — the register's "~2x
  detail" made literal). Profiles are product choices, not law;
  changing one re-authors that register's assets and changes no
  rule and no code.
- Hand art is painted OVER the solver's guides: VP + corner rays +
  harmonic rungs. The math scaffolds; the hand bricks.

## figure drawing (earned — the lum() lesson)

- PLANES, NOT LIGHTING: a figure is authored as explicit flat color
  planes (scalp, cheek, muzzle, chin...) chosen by material and
  form. Light functions may only place sparse highlights; they never
  generate anatomy.
- AUTHORED SILHOUETTES: figure contours are hand-placed lumpy
  polygons or row spans — never a recognizable ellipse or box under
  deformation. Architecture is solved; figures are drawn.
- TWO BRUSHES: the design unit is a 2x2 block on the fine canvas —
  outlines, wrinkles, teeth, nails, brick marks all use it. Single
  canvas pixels are reserved for wet highlights and dust (~2%).
- HEAVY INTERIOR OUTLINES: every form-on-form overlap gets a dark
  separation 1–2 units thick (eyelids, each tooth, each claw, major
  folds, limb boundaries).
- CONSTRUCTED FEATURES: teeth/claws are built socket → body → light
  plane → chipped tip, with dark separators between every unit.
- CLUSTERS, NOT SPECKLES: texture is connected 2–10 unit clusters
  whose direction follows the surface; independent 1px noise is
  banned on figures.
- DENSITY BUDGET: ~65% broad quiet masses · 25% form-defining
  clusters · 8% texture · 2% single-pixel accents. Detail is
  hoarded at focal points (eyes, mouth, hands); everything else
  stays quiet.

## hero reference

- reference/crawling-one-hero.png is the ratified quality and
  composition target for cinema plates: authored silhouette, planes,
  heavy outlines, constructed teeth, focal density at eye/mouth/
  hand, quiet masses, single motivated underlight, the environment
  visibly losing (displaced bricks at the scalp). H220 conforms
  toward it; H115 paints to it; new cinema art is judged against it.
