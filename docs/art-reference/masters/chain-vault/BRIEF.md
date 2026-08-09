# The Chain Vault — asset brief

**Partly delivered.** `background.png` is here, at 1024 × 1536. The thirty
plates below are not, and until they land the room runs with an empty midground:
every verb is still a button on the object, every outcome is still in the word
band, and the gate still cannot be walked through.

Read `docs/art-reference/masters/reliquary/BRIEF.md` first. It is the sibling
room, built by the same `buildRooms` in `tools/art.mjs`, and **every framing
rule it states applies here unchanged** — same canvas, same black fields, same
hard alpha, same whole-or-absent families, same prohibition on staging.

The one rule worth repeating, because it is the one that breaks everything:

> **Every plate registers to the same 1024 × 1536 canvas as the background.**
> Paint the object where it stands in the room. Not centred, not filling the
> frame. Nothing here is staged, measured or moved by the pipeline.

## What this room needs that the Reliquary does not

**The gate is the room's whole state, and it has to be unmistakable.** A player
who cannot tell at a glance whether the gate is up is a player who does not know
whether they can leave — and unlike the Reliquary, they *cannot*. `gate-closed`
and `gate-open` must read as different rooms from across the frame, not as two
similar plates. The two `opening` frames are the 280 ms between them.

**The plate has to visibly change when it is weighted.** It is the only feedback
that the cage did anything, and the whole puzzle is *weight, then lever*. If
`plate-off` and `plate-on` differ only subtly, the room becomes a guessing game
and the six-health mistake becomes unfair.

**`lever-up` is a position the player returns to by getting it wrong.** The
lever snaps back when there is nothing on the plate, so `up` is both the opening
state and the failure state. It must not look like a broken or half-pulled
thing — it is a lever at rest, and the punishment is in the word band and the
health orb, not in the plate.

## Required — thirty plates

### The six objects

Where each sits is already decided; the hit targets are seated against it —
`ROOMS['chain-vault'].interactables` in `src/content/rooms.ts`:

| object | `at` (scene fractions) | frames |
| --- | --- | --- |
| chain | x 0.81, y 0.28 | `chain-off` `chain-pulling` `chain-on` |
| cage | x 0.81, y 0.16 → down onto the plate | `cage-raised` `cage-lowering-1` `cage-lowering-2` `cage-lowered` |
| plate | x 0.61, y 0.69 | `plate-off` `plate-on` |
| lever | x 0.19, y 0.51 | `lever-up` `lever-pull-1` `lever-pull-2` `lever-down` |
| gate | x 0.61, y 0.55 | `gate-closed` `gate-opening-1` `gate-opening-2` `gate-open` |
| panel | x 0.13, y 0.36 | `panel-still` |

Those are not invented. The vault was painted with **a cage already hung
top-right, a barred arch across the middle and a round grate set into the
floor**, and the coordinates above are measured off it — the LOOK hotspots sit
on those features today. Paint each object onto the feature that is already
there rather than beside it, and the room stays one composed place instead of
sprites pasted over a picture.

Note the filename: the pipeline expects **`panel-still.png`**, following the
`<family>-<frame>.png` convention every other family uses. The original brief
called it `wall-panel.png`; either name describes the same single plate, but
`npm run art` looks for `panel-still.png`.

**The cage and the chain are one movement in two families.** They are separated
because the chain's switch is what is pressed and the cage is what answers, and
they play on slightly different clocks — but they must be painted as one
mechanism, and `cage-lowered` must sit *on* the plate, not above it.

**`wall-panel.png` is a single still plate.** Two figures cut into the stone:
first a weight falling, then a gate lifting. It is the room's instructions and
it never changes state — it is the reason a player can solve this without
losing six health, so the two figures must be legible at 390 px wide.

### The four ambient loops

Wallpaper. Nothing in them is information, and with `prefers-reduced-motion`
only frame 1 is shown.

| family | files | ms/frame |
| --- | --- | --- |
| fire | `ambient-fire-1…3` | 200 |
| chain | `ambient-chain-1…3` | 450 |
| smoke | `ambient-smoke-1…4` | 320 |
| shaft | `ambient-shaft-1…2` | 800 |

`ambient-chain` is the *scenery* chains swaying — the ones in the background,
not the one holding the cage. The cage's chain is a prop with authoritative
state and must never move on an ambient clock.

## Budget

Runtime art is capped at **4.5 MB**. The background costs **253 KB** and the
payload sits at **4.248 MB**, leaving roughly **250 KB** for these thirty
plates, shared with the Reliquary's twenty-nine.

A plate costs almost exactly its **opaque area** — field pixels are free. That
is affordable for a lever and a wall panel; it is the *gate* and the *cage* to
watch, because a full-height barred gate is a lot of opaque pixels four times
over. If the set does not fit, drop ambient loops before dropping object frames:
the loops are decoration and the frames are the game telling the player what
state the room is in.

## Integration, when the plates land

1. `npm run art` — writes `public/assets/props/chain-vault-*.png` and
   `public/assets/ambient/chain-vault-*.png`. It throws on a partial family.
2. Add the rows to `PROP_ART` and `AMBIENT_ART` in `src/render/assets.ts`, keyed
   `chain.off`, `cage.lowered`, `plate.on`, `gate.open`, `panel.still`,
   `chain-vault.fire.1` and so on.
3. `npm test && npm run test:browser`. Nothing else changes: the room's state,
   verbs, order, damage and copy are already in place and tested.
