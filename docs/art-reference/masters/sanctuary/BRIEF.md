# The Font — asset brief

**Delivered.** Nine plates, all at 1024 × 1536, sitting beside this file:
`sanctuary`, `chalice-idle`, `chalice-emerge`, and `chalice-1` … `chalice-6`.
They are the masters and are never served — `npm run art` builds the runtime
plates from them.

The brief below is kept as the contract they were made against. It is what a
repaint has to meet, and it is what to hand an artist for the next room that
works this way.

`docs/art-reference/masters/crawling-one/BRIEF.md` is the set this one is
modelled on, and everything it says about black fields, hard alpha and one
shared frame applies here unchanged.

## What changed between the brief and the delivery

**The chalice plates are portraits, and the pipeline stages them.** Two things
the delivery does not do for itself, both handled by measurement rather than by
repainting:

- **They do not register with each other.** Painted separately, the basin
  wanders up to 73 master-pixels vertically and 2.4% in size between frames —
  at 480 wide that is the room jumping every time the die changes face, which
  is the one thing this set exists to avoid.
- **They fill their own frame.** A portrait of a font is not a picture of a
  font standing in a chapel; dropped in at delivered size the basin is four
  times the size of the room.

`buildSanctuary` measures each plate's **base** — the bottom 4% of its opaque
mask, which is the plinth and the one feature all eight share — and scales and
seats every plate onto one staged base: `SANCTUARY.stance` in `tools/art.mjs`,
which is `{ width: 0.3, at: 0.5, foot: 0.9 }` in the scene's own fractions and
is the only place the composition is decided. The per-frame numbers are printed
on every run.

No pixel of any plate is authored, retouched or recoloured. A repaint that
wants the basin larger or further back changes `stance` and nothing else.

---

## The one framing rule

Every file below is the **same frame at the same pixel size**: portrait, 2:3,
at least 960 × 1440 (1024 × 1536 is what this set was delivered at). The eight
chalice plates have to register with each other pixel for pixel — the pipeline
never trims them, so a plate is placed by nothing but its own contents, and the
room's central requirement is that **the chalice must not move by one pixel
between frames.** The die climbs out of the blood and turns over, so the
silhouette changes eight times in a second; a trimmed plate is registered by
its own silhouette, and the basin would walk across the screen as the die
tumbled.

The delivered set does not quite manage that, so `buildSanctuary` seats each
plate on its own measured base — see above. Paint them registered anyway: the
correction is a scale and a translate, and a plate that needs a big one loses
resolution to it.

Two consequences worth painting to:

- **No HUD, no tray, no dice, no health orb, in any file.** The game draws its
  own over the bottom ~23% of the screen. Anything painted there is covered.
- On a 390 × 844 phone the player sees the **middle 90% of the width** and the
  full height. Keep the basin and the die inside the central 90%.

Alpha is **hard**: 0 or 255. The chalice plates arrive on flat `#000000` and
the pipeline keys them; the room is opaque. Paint shadow as dark pixels, never
as transparency.

---

## Required — nine files

### `sanctuary.png` — the chapel, empty

Opaque, and with **no basin in it**. A vaulted chapel at the end of the
ossuary: skulls shelved into both walls, candles that somebody still lights,
wet flagstones, an altar wall going back into the dark. Cold everywhere except
the candles.

The basin is a separate plate and is composited over this at runtime, so the
floor in the middle of the frame has to be clear for it. Nothing may be painted
where the chalice stands.

### `chalice-idle.png` — the basin, no die

Transparent (that is: flat black) canvas, same frame. The stone chalice on its
skull-footed plinth, filled to the lip with blood, still. This is what the room
looks like before the player presses anything, and what it looks like for as
long as they stand there deciding.

Paint it at whatever size fills the frame comfortably; the pipeline stages it.
Where it ends up in the room is `SANCTUARY.stance`, and the ROLL control is put
on the bowl by `ROOMS.sanctuary.ritual.at` — the two are measured against each
other, so moving one means re-checking the other against a screenshot.

### `chalice-emerge.png` — the die coming out

The same basin, with the die breaking the surface: blood thrown outward in a
crown, the die half out and lit from underneath. On screen for **100 ms**, at
80 ms after the press. It is the loudest frame in the room and the only one
that is pure violence.

### `chalice-1.png` … `chalice-6.png` — the six results

The same basin, with the die held above it showing that number, blood falling
back. One per face, and the number has to be **readable at arm's length on a
390px-wide phone** — this is the plate the player reads their result off, and
the word band only names it.

These six are not six drawings of a room. They are one drawing with the die's
face changed, and they should differ in nothing else: the basin, the plinth,
the blood level and the light are identical in all six, or the room will appear
to twitch when it settles.

The frame that lands stays on screen. It is painted from `run.ritual` and
survives a reload, so it is the room's permanent state afterwards — not
punctuation like the Crawling One's impact plate.

---

## What the game does with them, exactly

| ms | frame |
| --- | --- |
| 0 | `idle` |
| 80 | `emerge` |
| 180 · 250 · 320 · 390 | `2` · `5` · `1` · `4` — cosmetic, a fixed list |
| 500 | the face the reducer rolled, and it stays |
| 650 | the health orb moves |
| 850 | the word band says what happened |
| 1000 | GO ON appears |

The four faces at 180–390 are the tumble and mean nothing. They are a constant
in `src/app/app.ts`, not a draw — nothing in a sequence in this repository is
allowed to produce a number.

With `prefers-reduced-motion`, the room cuts straight to the settled face.

---

## Budget

Runtime art is capped at **4 MB**, measured by `test/unit/assets.test.ts` and
printed by `npm run art`. The room costs **540 KB** of it — 256 KB for the
chapel and 284 KB for the eight plates — and the whole payload sits at
**3.75 MB**.

What a plate costs is almost exactly its **opaque area**: field pixels are free
and stone is not. `hands/rest.png` is a full 480 × 720 keyed scene that ships
in 30 KB because 94% of it is empty. These are 8–10% opaque at the staged size
and cost 37–48 KB each; at the delivered size they were 26–33% opaque and cost
82–89 KB each. Staging the basin down to something a person could get their
arms around paid for itself twice over, which is the happy case of a
composition decision and a budget decision being the same decision.

Do not supply in-betweens. There are eight frames because there are eight
things to say, and a ninth would be deleted.

---

## Integration, when a plate is replaced

1. `npm run art` — writes `public/assets/rooms/sanctuary.png` and
   `public/assets/props/chalice-*.png`, and prints where each plate was
   standing and how far it was moved to register with the others.
2. The manifest is `PROP_ART` in `src/render/assets.ts`, keyed `chalice.idle`,
   `chalice.emerge`, `chalice.1` … `chalice.6`, all 480 × 720. Nothing else in
   the codebase names one of their files.
3. `npm test && npm run test:browser`. The manifest test holds the declared
   sizes against the files, requires the family to be whole or absent, and
   requires every frame to share one box; the browser suite presses the font
   and asserts the basin does not move when the frame changes.
