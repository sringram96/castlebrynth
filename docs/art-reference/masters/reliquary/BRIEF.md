# The Reliquary — asset brief

**Partly delivered.** `background.png` is here, at 1024 × 1536. The twenty-nine
plates below are not, and until they land the room runs with an empty midground:
every verb is still a button on the object and every outcome is still in the
word band, which is the degradation `ART_DIRECTION.md` allows for scenery.

`docs/art-reference/masters/sanctuary/BRIEF.md` is the set this one is modelled
on. Everything it says about black fields, hard alpha and one shared frame
applies here unchanged. Read it first.

## What is different from the Font, and it is the whole brief

The Font is a room plus **one** family of frames. This is a room plus **four
independent objects**, any of which can be in a different position while the
others hold still — the brazier goes out while the bell is still swinging.

That changes one thing about delivery, and it is the thing to get right:

> **Every plate registers to the same 1024 × 1536 canvas as the background.**

The chalice plates are portraits, and `buildSanctuary` stages them by measuring
each one's plinth and seating it on a shared base. **Nothing here is staged.**
These objects do not share a base — a bell hanging in the left aisle and a chest
on the floor below it have nothing in common to measure against — so
`buildRooms` in `tools/art.mjs` only cover-crops, keys and resamples. If two
frames are aligned at 1024 × 1536 they are aligned at 480 × 720, and there is no
per-frame CSS offset anywhere to paper over it if they are not.

So: paint the object **where it stands in the room**, on flat `#000000`, at the
same frame as `background.png`. Not centred. Not filling the frame.

A family must be **whole or absent**. `buildRooms` throws on a partial family,
because the missing frames would fall back to whatever plate was up and the
object would freeze mid-swing on exactly the states that matter.

## The framing rules

- Portrait 2:3, **1024 × 1536**, every file.
- Overlays on flat `#000000`; the background is opaque. Alpha is hard, 0 or 255
  — paint shadow as dark pixels, never as transparency.
- **No HUD, no tray, no dice, no health orb, no text, no borders.** The game
  draws its own over the bottom ~23%.
- On a 390 × 844 phone the player sees the **middle 90% of the width** and the
  full height. Keep all four objects inside the central 90%.

## Required — twenty-nine plates

### The four objects

Where each sits is already decided, because the hit targets are seated against
it — `ROOMS.reliquary.interactables` in `src/content/rooms.ts`, in fractions of
the scene. Paint to these and the button lands on the object:

| object | `at` | frames |
| --- | --- | --- |
| bell | x 0.20, y 0.30 | `bell-idle` `bell-ring-1` `bell-ring-2` `bell-settle` |
| brazier | x 0.79, y 0.48 | `brazier-lit` `brazier-dim` `brazier-out` `brazier-igniting` |
| lever | x 0.50, y 0.41 | `lever-up` `lever-pulling` `lever-down` |
| chest | x 0.29, y 0.63 | `chest-closed` `chest-opening` `chest-open` |

**`bell-settle` is a resting state, not punctuation.** It is what the bell looks
like for the rest of the run once it has been rung, and it survives a reload —
so it is a bell that has *finished* moving, not a blurred frame.

**`brazier-out` is the room's other lighting state.** The player can put the
flame out and light it again as often as they like, so both `lit` and `out` are
permanent positions and both have to read as finished. `dim` and `igniting` are
the 170 ms in between.

**`chest-open` shows what is inside without naming it.** The word band says
`Inside: <relic name>`; the plate should read as *something is in there*.

### The five ambient loops

Whole-scene overlays on flat black, cycling on their own fixed clocks. They are
wallpaper: **nothing in them is information**, the game is identical with every
one of them missing, and with `prefers-reduced-motion` only frame 1 is shown.

| family | files | ms/frame |
| --- | --- | --- |
| candle | `ambient-candle-1…3` | 180 |
| chain | `ambient-chain-1…3` | 420 |
| drip | `ambient-drip-1…3` | 300 |
| embers | `ambient-embers-1…4` | 240 |
| window | `ambient-window-1…2` | 700 |

The periods are deliberately nowhere near each other — loops that share a period
resynchronise, and five overlays blinking together is a lighting cue rather than
a room. Keep each loop **subtle**: this is a dead chapel with four things in it
the player has to be able to find, and the ambience must never be the loudest
thing on screen.

## Budget

Runtime art is capped at **4.5 MB**, measured by `test/unit/assets.test.ts` and
printed by `npm run art`. The background costs **259 KB** of it and the payload
currently sits at **4.248 MB**, so there is roughly **250 KB** for these
twenty-nine plates, shared with the Chain Vault's thirty.

That is affordable only because **a plate costs almost exactly its opaque area**
— field pixels are free. `hands/rest.png` is a full 480 × 720 keyed scene that
ships in 30 KB because 94% of it is empty. Keep every object and every ambient
overlay tight to itself and mostly black, and the set fits. If it does not, the
first lever is fewer ambient loops, not worse objects.

## Integration, when the plates land

1. `npm run art` — writes `public/assets/props/reliquary-*.png` and
   `public/assets/ambient/reliquary-*.png`. It throws on a partial family.
2. Add the rows to `PROP_ART` and `AMBIENT_ART` in `src/render/assets.ts`, keyed
   `bell.idle`, `brazier.lit`, `chest.open`, `reliquary.candle.1` and so on. It
   is the only file that names a filename.
3. `npm test && npm run test:browser`. Nothing else has to change: the room's
   state, verbs, order and copy are all already in place and tested, and the
   plates only make them visible.
