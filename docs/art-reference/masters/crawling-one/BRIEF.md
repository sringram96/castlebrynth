# The Crawling One — asset brief

**Delivered.** Seven plates, all at 1024 × 1536, sitting beside this file:
`hall`, `far`, `mid`, `close`, `hit`, `hand-rest`, `hand-thrust`. They are the
masters and are never served — `npm run art` builds the runtime plates from
them, and `docs/ART_DIRECTION.md` § *The pipeline* is where that is described.

The brief below is kept as the contract they were made against. It is what a
repaint has to meet, and it is what to hand an artist for the next encounter
that works this way.

`supplied/` holds the four mock-ups this brief was originally written from.
They are the look that was being aimed at, and they were never usable: each
paints a mock tray across the bottom third, and each is a separate painting of
the corridor rather than one corridor with the creature moved — so there is no
way to lift the creature off one and put it on another. The delivered set fixed
exactly that by separating the corridor from the things standing in it.

## What changed between the brief and the delivery

Two things, both improvements, and the pipeline was written to the delivery:

- **Black fields, not transparency.** The brief asked for transparent
  canvases; image tools do not do honest alpha, so every plate arrived on flat
  `#000000`. `tools/art.mjs` keys it — threshold, close, hole-fill, prune —
  which is a better matte than a soft alpha channel would have been.
- **The arm is a whole frame.** The hands are not trimmed; they stay the full
  scene and the foreground layer cover-fits them exactly as the backdrop is
  cover-fitted, so the arm lands in the corridor at every viewport with no
  coordinate to measure and none to drift.

---

## The one framing rule

Every file below is the **same frame at the same pixel size**: portrait, 2:3,
at least 960 × 1440. The corridor and every pose have to register with each
other pixel for pixel, because the pipeline reads each pose's position
straight off its own transparent canvas. That is what removes all coordinate
guesswork — paint the thing where it stands and it appears where it stands.

Two consequences worth painting to:

- **No HUD, no tray, no dice, no health orb, in any file.** The game draws its
  own over the bottom ~23% of the screen. Anything painted there is covered.
- On a 390 × 844 phone the player sees the **middle 90% of the width** and the
  full height. Keep anything that must be seen inside the central 90%.

Alpha is **hard**: 0 or 255, no soft edges, no alpha drop shadows. The
pipeline snaps at 128 and the encoder rejects anything in between. Paint
shadow as dark pixels, not as transparency.

---

## Required — five files

### `hall.png` — the corridor, empty

Opaque. The ossuary hall from `supplied/`, with **nothing standing in it**:
no creature, no claw, no player hand. Wet flagstones, alcoves of skulls,
candles, the arch receding to a cold blue vanishing point.

This is the room. It does not change during the fight — the camera never
moves, the creature does — so one is enough. (If you want the light to change
as it closes, add `hall-mid.png` and `hall-close.png` on the same frame and
say so; it costs about 250 KB each against the budget below.)

### `far.png`, `mid.png`, `close.png` — the three reaches

Transparent canvas, same frame. The creature only, painted at the size and
position it occupies in the corridor at that distance.

| | what it reads as |
| --- | --- |
| `far` | a shape at the end of the hall. Small, legible, unmistakably not near. Roughly a third of the frame's width. |
| `mid` | half the hall gone. About four times the area of `far` — the step has to be too big to be a trick of the light. |
| `close` | edge to edge. Jaw on the flagstones in front of you, no corridor left behind it. Fills the frame's full width. |

These are three authored compositions, not one drawing at three sizes. Nothing
in the game interpolates between them; the player sees `far`, then a 70 ms
shudder, then `mid`. The discontinuity is the effect, so each pose can be its
own drawing — different limb positions, different amount of it in frame.

The creature may be cropped by the frame at `close` (it should be). It may not
be cropped at `far` or `mid`.

### `hit.png` — the impact frame

The `close` pose, blown bright: flesh going white, mouth open, recoiling from
a blade going into it. `supplied/hit.png` is exactly right.

It is on screen for **130 ms** at the moment the player's weapon reaches full
extension, and then it is gone. It is punctuation, not a state.

---

## Wanted, not required

- **`far-hit.png`, `mid-hit.png`** — the same bright reaction at the other two
  reaches. Without them, a hit at `far` or `mid` brightens the normal pose
  instead, which is weaker. With them, every strike lands the same way.
- **`hand-rest.png`, `hand-thrust.png`** — the player's forearm and blade,
  from the bottom-right corner, on the same transparent frame. Two poses:
  at rest, and at full extension driving in. This is the only thing missing
  for the strike to move a real arm rather than lean the camera. There are no
  in-betweens: the code cuts REST → THRUST → REST in about 140 ms.

If the hand is not supplied separately, paint it into `hall.png` at rest and
the strike falls back to a camera lunge.

---

## Budget

Runtime art is capped at **4 MB** and currently sits at **2.44 MB**, measured
by `test/unit/assets.test.ts` and printed by `npm run art`. `hall.png` retires
`ossuary.png` (280 KB), so the whole set has about **1.3 MB** to live in after
the pipeline downsamples to 480 × 720 and posterises. That is comfortable for
five to nine plates; it is not comfortable for an animation sequence.

Four excellent paintings beat forty frames. Do not supply in-betweens — the
encounter is deliberately built out of stillness and two or three violent
frames, and extra frames would be deleted.

Masters can be any size at or above 960 × 1440; they are never served.

---

## Integration, once the files are here

1. `npm run art` — builds `public/assets/rooms/hall.png`,
   `public/assets/enemies/crawling-*.png`, and prints a stance line per pose.
2. Paste those stance lines into `MAW.stances` in `src/content/enemies.ts`.
3. Add the built files to the manifest in `src/render/assets.ts`:
   `hall` under `ROOM_ART`, and `gnawing.far` / `gnawing.mid` /
   `gnawing.close` / `gnawing.hit` under `ENEMY_ART` — `enemyArt(id, reach)`
   already looks for the dotted key and falls back to the plain sprite.
4. Point `ROOMS.hollow.art` at `hall`, and delete the `ossuary` entry.
5. `npm test && npm run test:browser`.
