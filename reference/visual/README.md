# The visual reference

**None of these is a runtime asset.** Nothing under `reference/` is loaded
by the game, imported by `src`, or copied into `public/`. They are the bar,
not the art.

## `canonical-screen.png` — the canonical composition

The target for **composition, density and material language**, and the still
the dev fixture is pointed at (`?scene=canonical`, art. 126). What it is
authoritative about:

- portrait, first-person, the world holding most of the frame;
- deep darkness with light hoarded at one or two places (art. 112);
- a thing inhabiting the actual room rather than a separate battle screen
  (art. 30);
- first-person presence at the lower edge — what you are carrying;
- detail concentrated at focal points, masses dark and quiet (art. 26);
- a compact die-centric tray that is a **carved object in the picture** —
  bone and oxidised iron — rather than a panel under it.

What it is **not** authoritative about:

- **its resolution.** It is 1088 pixels wide; the frame is `GRID` (240).
  A master ships reduced into deliberate pixels at the frame's own scale.
  Using the reference itself as a background would be a room that cannot
  occlude, cannot diminish honestly, and cannot answer a tap where a thing
  stands (arts 15, 19, 68, 121).
- **its exact tray geometry.** Flask left, dice centre, rack right is an
  illustration's composition at 1088 pixels. On a 390-pixel phone, side
  columns take the width the dice need to stay hittable (art. 128), and
  art. 67's rail already puts the body on one side and the ways through on
  the other.

## The three beside it — the territory

`territory-ossuary-keeper.png`, `territory-gate-warden.png`,
`territory-close-maw.png`. These name the artistic register rather than a
screen: grotesque and intimate body-horror readability, solemn gothic and
religious composition, oppressive first-person proximity, architecture that
is old and damp and worn and inhabited.

They are also the density bar for the **third tier** (art. 26's hero
moments, and the CINE band): what a horror plate should eventually look
like when the art budget reaches it. `DESIGN.md` lists what is still owed.

## Nothing here is copied

The visual language is Castlebrynth's own. These images set a bar for
density, contrast and composition; no asset, palette or design is traced
from any other game.

## `reliquary-zones.png` — the tray's coordinate spec

The art director's own diagram of the combat panel: its four zones (top rail
0–18%, dice 18–42%, main well 42–88%, footer 88–100%), the orb, the menu
recess, the three tab beds and the die slots, all in **fractions of the panel**
rather than in pixels.

It is the source `src/content/ui/reliquary.ts` is built from, and it is what
makes the tray an authored object rather than a responsive layout over a
picture. Two notes on reading it against the shipped panel:

- **Its die-slot table and the painting disagree.** The table puts six
  0.11-wide slots at a pitch of 0.14 from x 0.14, which overlaps the orb it
  also declares at 0.02–0.20 and does not sit on the six recesses the panel
  carries. The painted cells win for the *drawing*; the table's sizes are used
  for the **hit areas**, which is what its own note says they are.
- **A zone is not a hit target.** The footer beds are 12% of a panel whose
  aspect is 2:1, so on a phone they are about twenty pixels tall. The word
  sits on the carving and the target is grown about it, exactly as a die's is.
