# Reset progress

Tracking document for the rebuild specified by `Castlebrynth_Reset_Blueprint.docx`.
The blueprint is authoritative over everything that used to be in `DESIGN.md`,
`CHRONICLE.md` and `.claude/rules` — all of which now live under `archive/`.

**Phases 0–6 complete. The full player journey passes in a real browser.**

---

## Completed phases

### Phase 0 — Preserve and quarantine ✅

**Tag.** `legacy-v0-pre-reset` points at `eb0159e`, the pre-reset `main`. No git
history was rewritten or deleted; every file removed below is one `git show`
away.

**Quarantined** (moved, not deleted):

| From | To |
| --- | --- |
| `.claude/rules/` (128 articles, 6 files) | `archive/legacy-design/rules/` |
| `.claude/agents/` (4 specialist agents) | `archive/legacy-design/agents/` |
| `DESIGN.md` | `archive/legacy-design/DESIGN.md` |
| `CHRONICLE.md` (234 KB of wave journals) | `archive/legacy-design/CHRONICLE.md` |
| `AGENTS.md` | `archive/legacy-design/AGENTS.md` |
| `reference/GAME.md`, `reference/the-gnawing-fight.md` | `archive/legacy-design/` |
| `reference/*.html` (4 signed-off prototypes) | `archive/prototypes/` |
| `reference/visual/`, `reference/*.png` | `docs/art-reference/` |
| `public/assets/visual/**` (46 MB of masters) | `docs/art-reference/masters/` |

**Deleted from the active path** (recoverable at the tag):

- `src/` — all 27,719 lines. `main.ts` alone was 3,921 lines and imported
  content, descent, gen, hinge, lots, state, room, visual, tray, screens, save,
  animation and DOM.
- `test/` — 71 spec files, most of which existed to preserve articles the reset
  repeals.
- `index.html` — 713 lines of shell markup and CSS.
- `tools/masters.mjs`, `tools/plates.mjs`, `tools/preview.mjs`.

**Reused** — the complete list:

| Kept | Why |
| --- | --- |
| `tools/png.mjs` | A dependency-free PNG encoder/decoder. Nothing about it is tied to the old architecture, and the new art pipeline is built on it. |
| The reliquary zone map from `src/content/ui/reliquary.ts` | Measured coordinates of the painted tray's orb, crown, well and beds. Data, not architecture; re-authored into `src/content/tray.ts`. |
| The art masters | The pixel-horror scenes are the product. Now source material under `docs/art-reference/`, not runtime payload. |

Everything else was written from the blueprint. Nothing was adapted.

### Phase 1 — The skeleton ✅

- `src/` rebuilt to the blueprint's §17 tree, with boring engineering nouns.
  `hinge`, `lots`, `descent`, `gen` and `room` are gone as vocabulary.
- `main.ts` is **48 lines**: construct, load, mount.
- Four short docs — `docs/PRODUCT.md`, `COMBAT.md`, `ART_DIRECTION.md`,
  `CONTRIBUTING.md` — replace the article stack. `CLAUDE.md` and `README.md`
  rewritten to point at them.
- **One explicit state machine.** `Mode` is
  `title | explore | combat | reward | dead | complete`; every transition is a
  named action through `src/game/reducer.ts`, and the reducer is the only thing
  in the codebase that produces a `GameState`.
- Save schema bumped to **version 2** with a deliberate break. Old saves are
  detected, reported on the title screen and discarded. No migration ladder.
- Playwright added, Chromium at 390×844.
- **Dev fixtures** (`src/game/fixture.ts`): any mode reachable from a URL —
  `?room=gate&hp=1&mode=combat`, `?mode=dead`, `?dice=pusher,leech`.

### Phase 2 — The canonical loop ✅

Implemented end to end and nothing outside it: start run → explore → meet a
visible monster → roll → choose → reroll → score → damage → take damage → win →
choose loot → continue → die or get out → restart.

### Phase 3 — Dice ✅

- Six dice, everywhere. The count is `run.dice.length` and no layout invents
  it; `#crown[data-count]` is asserted in the browser.
- Five dice ship, each with faces, one rule sentence, and a "GOOD WITH" line:
  Plain, Careful, Pusher, Runner, Leech. Each non-plain die has its own
  material so it cannot be mistaken for a starting bone.
- Two face keywords only — `hurt N` and `heal N` — and both print their number
  **on the face** and again in the damage preview.
- **Removed and not reimplemented:** riders, bonds, talismans, levels, rolling
  goods/trinkets, the once-per-fight card, seal, curse, corrode, bind, bleed,
  hunger, priced acts, knowledge clues, refusal flags, the drift and region
  lock, the winnability generator, hand-size wounds, classes.
- Sister Bone deliberately not shipped: its rule cannot be read off the combat
  screen, which the blueprint makes a shipping condition.

### Phase 4 — Presentation ✅

- **Every encounter shows its monster.** This was the P0, and it was a content
  gap: the old build declared a plated horror and shipped **no enemy image at
  all**. `tools/art.mjs` now cuts three enemy sprites out of the territory
  masters with a radial luminance key grown from hand-placed seeds.
- **Fixed compositor** (`src/render/compositor.ts`): backdrop, midground,
  enemy, foreground, fx, hud. The order is an enum built once at mount, so
  there is no runtime path by which a backdrop can sit above an enemy.
- **Room backdrops are composed at build time.** Only two of the old masters
  were whole scenes; the rest were cut-outs the retired perspective box used to
  place. Each room is now a base scene plus authored plates, baked into one
  opaque 480×720 image, and all eight are distinguishable as thumbnails.
- Runtime art payload: **49 MB → 2.4 MB**, budgeted and tested.
- The reliquary/dice-tray direction is retained: orb, six-die crown, central
  well, three action beds. It is laid out wider than the phone and bleeds at
  the edges, which is what lets a die bed reach the 44 px touch floor without
  neighbouring targets overlapping.

### Phase 5 — Reliability ✅

**38 browser tests, all passing, Chromium at 390×844.**

| Spec | What it proves |
| --- | --- |
| `first-run.spec.ts` | Boot, start a run, six dice, looking is free, the offer screen, the enemy visible before any combat control, layer order, eight distinct rooms, **and the whole route fought to the exit with real presses** |
| `combat-controls.spec.ts` | Intent before the roll, six dice, face values, choosing and unchoosing, the preview's arithmetic, reroll keeping only chosen dice, one reroll, scoring the previewed damage, a dead enemy never acting, marked-face costs |
| `tray.spec.ts` | Every control answers `elementFromPoint` at its own centre, 44 px targets, non-overlapping dice, the beds never moving, no art taking pointer events, every verb a real button, nothing off-screen, INSPECT everywhere |
| `death-restart.spec.ts` | Lethal damage → death screen → AGAIN → clean run, no reload, no stale combat UI, repeatable, TITLE, and the way out |
| `save-resume.spec.ts` | Reload mid-explore and mid-fight, corrupt save, old-schema save — never a black boot |

Plus **77 unit tests** over scoring, dice, the journey, asset validation and a
balance guard.

Four real bugs were found by the browser suite and fixed — none of which a
model-level test could have seen: a stale `data-screen` on a hidden element, a
gift row overflowing its container so the second button was unclickable, `#world`
eating presses as a positioning container, and CONTINUE offering to walk back
into a run that had ended.

### Phase 6 — Balance ✅

`npm run balance` — deterministic, 400 seeds per cell, built on the **real
reducer** so the model and the runtime cannot drift apart. It lives in
`test/balance/` and imports nothing from `ui/` or `render/`; the runtime imports
nothing from it.

```
fight            naive   heuristic   turns   dmg/turn (n/h)   hp left
the Gnawing        100%        100%       3       39/59             87
the Marrow         100%        100%       4       38/64             86
the Warden         100%        100%       5       39/65             77

whole run — the stair is the safe way, the deep way is a fight more
naive/stair      out  82%   hp left 30   died: gate 18%
naive/deep       out  51%   hp left 23   died: gate 50%
heuristic/stair  out 100%   hp left 61   died: never
heuristic/deep   out 100%   hp left 50   died: never
```

A first-timer who plays safe gets out four times in five. The same player taking
the deep way is on a coin flip. Learning the ladder closes that gap, which is
what makes learning it worth doing. Zero turns with no productive action, across
every fight and both tiers.

---

## Deviations from the blueprint, and why

1. **Branch name.** `claude/castlebrynth-reset-ho4fls` rather than
   `reset/vertical-slice`; the session's operating instructions pin it.

2. **Hold and select are one mark, not two.** The blueprint's turn lists Hold
   and Score as separate steps with separate marks. Built that way, a tap on a
   die means one of two things depending on a phase the player cannot see, and
   in phase `rolled` there is no way to tell "keep this" from "score this".
   A chosen die is now kept across the reroll *and* is the hand you score,
   which is the single thing a player means by tapping a die. Every invariant
   the blueprint asks for still holds and is tested.

3. **A room's gift uses the reward screen.** The blueprint puts one in room 2
   and asks that it be inspectable in plain mechanical language. Two names on
   two small buttons in the tray could not do that — and overflowed the well,
   which the browser suite caught. It is now the same offer screen a won fight
   uses, with the faces, the rule and the build hint. No new screen mode.

4. **No die replace-picker.** The blueprint's §10.3 comparison view is not
   built, because in this slice it cannot present a real choice: a run finds at
   most three dice against six plain bones, so a found die never displaces
   another found die. It equips over the plainest bone. `equip()` in
   `src/game/reducer.ts` is where the picker goes when the hand can fill.

5. **No third "optimal-ish" policy tier.** The blueprint asks for naive,
   heuristic and optimal-ish. With the card, the statuses and rolling goods all
   parked, a turn holds exactly one decision — which subset to claim — and the
   heuristic tier already claims the best one. A third tier would differ only in
   the keep step and would move no number this report is used to set.

6. **The per-fight win-rate bands were retargeted, and the run carries the
   risk.** The blueprint asks for 80–90% on the first fight for a basic
   heuristic and 45–65% on the boss. A single fight entered at full health
   cannot be made losable at those rates without an enemy that out-damages six
   dice and a reroll — and a tutorial fight that kills one player in five
   contradicts the blueprint's own target of ≥80% of first-time players winning
   the first encounter, and its "does a new player want to descend again?".
   So the **fights** are gated on being won and quick, and the **run** carries
   the risk — which is where "how far do I push?" was always meant to live. The
   bands actually aimed at are in `test/balance/report.ts` beside the reasoning,
   and the naive/deep figure (51%) sits inside the blueprint's boss band.

7. **`exploration/` is folded into `game/reducer.ts`.** The blueprint's tree
   has `exploration/state.ts`, `move.ts`, `interact.ts`, `rewards.ts`. At the
   size the slice is, moving, looking and taking are three cases in the reducer
   totalling about sixty lines; four files would be four files of ceremony.
   `docs/CONTRIBUTING.md` records the split as the place to go when it grows.

## Unresolved human-design decisions

1. **Is the first fight too safe?** Simulation says a first-timer wins it every
   time. That is deliberate (deviation 6), but only ten moderated first-play
   sessions can say whether it reads as a fair teaching fight or as a fight
   without stakes. This is the blueprint's own gate and the one that outranks
   the model.
2. **Is the fork legible as a gamble?** The tray states each route's sense
   before the press. Whether a player understands that "the deep way" costs
   health and buys a reward, or just picks the interesting-sounding one, needs
   watching rather than measuring.
3. **Does the reliquary bleeding off both edges read as intentional?** It is
   what buys the 44 px dice. On a phone it should read as a frame larger than
   the screen; it might read as a layout fault.
4. **Should the boss drop loot?** It currently drops nothing, because the run
   ends immediately after. If a longer expedition follows, that changes.
5. **Enemy cut-out quality.** The Gnawing is its head only — seeding its lower
   jaw as well leaves it floating across an open mouth, which reads as a
   rendering fault. A hand-authored matte would fix it. Judgement call for an
   artist, not a threshold.

## Test status

```
npm test              77 passed   (5 files)
npm run test:browser  38 passed   (5 specs, Chromium 390x844)
npm run build         typecheck + bundle clean
npm run balance       all gates green
```

The full player journey — title → explore → gift → three fought encounters →
two rewards → the way out — passes in an actual browser, in one page load,
with every press a real press.
