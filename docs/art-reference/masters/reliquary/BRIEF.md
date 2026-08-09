# The Reliquary — asset brief

**The room is delivered.** `background.png`, and four objects: `altar-still`,
`bell-idle`, `brazier-lit`, `chest-closed`. The room is painted, the four are
independently addressable, and every verb sits on the thing it works.

What is outstanding is the **other positions** of three of them, and the
ambience. `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md` is the list and the
order to paint them in; this file is the contract for how they arrive.

`docs/art-reference/masters/sanctuary/BRIEF.md` is the set this one was modelled
on. Everything it says about black fields and hard alpha applies here unchanged.

## What is different from the Font, and it is the whole brief

The Font is a room plus **one** family of frames. This is a room plus **four
independent objects**, any of which can be in a different position while the
others hold still — the candles go out while the bell is still swinging.

That means **registration**: two plates of the same object must land in the same
place, or the object walks across the room as it changes frame. There are two
ways to get it, and which one a family is on is a property of that family.

### Registered — the way a family that *moves* must arrive

> **Every plate registers to the same 1024 × 1536 canvas as the background.**

Paint the object **where it stands in the room**, on flat `#000000`, at the same
frame as `background.png`. Not centred. Not filling the frame. `buildRooms` in
`tools/art.mjs` then only cover-crops, keys and resamples: if two frames are
aligned at 1024 × 1536 they are aligned at 480 × 720, and there is no per-frame
CSS offset anywhere to paper over it if they are not.

**Every multi-frame family must arrive this way.** `bell-ring-1`, `bell-ring-2`
and `bell-settle` are the clearest case: a bell in three portraits would be
seated by its own box three times, and its box changes as it swings, so it would
climb the ceiling on the way over.

### Portrait plus a stance — the way the four delivered objects arrived

The object centred in its own 1024 × 1536 frame, the way the chalice and every
enemy plate is painted, and **where it stands declared once** in
`ROOMS[].stances` in `tools/art.mjs`:

```
altar    { width: 0.34, at: 0.50, foot: 0.79 }
bell     { width: 0.19, at: 0.235, foot: 0.29 }
brazier  { width: 0.18, at: 0.185, foot: 0.80 }
chest    { width: 0.235, at: 0.80, foot: 0.83 }
```

All three numbers are fractions of the 480 × 720 scene, read off the plate's
**opaque box**: how wide it is, where its centre is, and where its bottom edge
lands. `stageOn` scales and moves; nothing is drawn, retouched or repainted.

This shape is fine for an object painted **once**, and only for that. Two
portraits of the same object are two different boxes, and two different boxes
are two different places.

### If you replace a delivered plate

Repaint it as the same silhouette in the same frame and the stance still holds.
Change the object's shape and the stance has to be re-set by eye against the
room — and so do the button coordinates in `ROOMS.reliquary`, which are the same
fractions converted into the world box's. `src/style.css` also measures one
thing off a stance: the bell's `transform-origin`, which is where its chain
leaves the ceiling.

## The framing rules

- Portrait 2:3, **1024 × 1536**, every file.
- Overlays on flat `#000000`; the background is opaque. Alpha is hard, 0 or 255
  — paint shadow as dark pixels, never as transparency.
- **No HUD, no tray, no dice, no health orb, no text, no borders.** The game
  draws its own over the bottom ~23%.
- On a 390 × 844 phone the player sees the **middle 92% of the width** and the
  full height. Keep every object inside the central 90%.

## The four objects

Where each sits is decided, and the hit targets are seated against it —
`ROOMS.reliquary` in `src/content/rooms.ts`. The composition is the reference
chapel in `docs/art-reference/visual/reliquary/`: a hero altar on the floor in
front of the steps, a bell hanging over it, the candles and the chest low on
either side, and the middle of the room left empty.

| object | frames | state |
| --- | --- | --- |
| altar | `altar-still` | ✅ delivered. The room's hero, and the mechanism the PULL works — there is no lever. |
| bell | `bell-idle` | ✅ delivered. `bell-ring-1` `bell-ring-2` `bell-settle` are owed, **registered**. |
| brazier | `brazier-lit` | ✅ delivered. `brazier-out` is owed and is the most valuable missing plate. |
| chest | `chest-closed` | ✅ delivered. `chest-open` is owed; `chest-opening` optional. |

**`brazier-out` is the room's other lighting state**, not punctuation. The player
can put the flame out and light it again as often as they like, so both `lit`
and `out` are permanent positions and both have to read as finished. Today `out`
is a CSS treatment of the lit plate and there are still five flame shapes in it.

**`chest-open` shows what is inside without naming it.** The word band says
`Inside: <relic name>`; the plate should read as *something is in there*.

**`bell-settle` is a resting state.** It is what the bell looks like for the rest
of the run once it has been rung, and it survives a reload — so it is a bell that
has *finished* moving, not a blurred frame.

## The five ambient loops

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
thing on screen. Two very small loops already run in CSS, on the candles and on
the blood in the basin; these replace them.

## Budget

Runtime art is capped at **5.6 MB**, measured by `test/unit/assets.test.ts` and
printed by `npm run art`. The payload sits at **5.53 MB**, so there is roughly
**70 KB** left, shared with the Chain Vault's thirty plates.

That is affordable only because **a plate costs almost exactly its opaque area**
— field pixels are free. The four objects above ship in 70 KB between them at
2–8% opaque, and `hands/rest.png` is a full 480 × 720 keyed scene that ships in
30 KB because 94% of it is empty. Keep every object and every ambient overlay
tight to itself and mostly black. If the set does not fit, the first lever is
fewer ambient loops, not worse objects.

## Integration, when the rest land

1. `npm run art` — it writes `public/assets/props/reliquary-*.png` and
   `public/assets/ambient/reliquary-*.png`, and throws on a partial family.
2. Add the rows to `PROP_ART` and `AMBIENT_ART` in `src/render/assets.ts`, keyed
   `brazier.out`, `chest.open`, `reliquary.candle.1` and so on. It is the only
   file that names a filename.
3. Point `platesFor` in `src/content/interactions.ts` at the authored frame
   instead of the `look`, and delete the CSS treatment that was standing in for
   it. That is where the stand-ins live and the only place they live.
4. `npm test && npm run test:browser`. Nothing else has to change: the room's
   state, verbs, order and copy are all in place and tested.
