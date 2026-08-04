# Castlebrynth — design

## What it is
A first-person descent played in a phone browser with one thumb. Rooms are
one-point-perspective boxes computed from three numbers and read like a
novel a candle at a time; the labyrinth is a blind chain of hand-authored
rooms, procedurally rearranged every run; fights are poker-dice duels
against horrors whose intents are always shown; death burns the run and
keeps the knowledge. `reference/GAME.md` is the fantasy. The binding law is in
`.claude/rules/` — 62 numbered articles; tasks cite them as "art. N".

## Components
- **src/state** — the two ledgers (run / permanent) behind named rituals;
  every mutation persists; boot restores exactly. (arts 11, 36)
- **src/gen** — seeds and deals the blind chain under the grammar rules;
  proves winnability. (arts 31–39)
- **src/room** — the computed-box renderer on the GRID dial; the port of
  `reference/castlebrynth-wake-v3.html`. (arts 13–25)
- **src/descent** — plays a room: candles, taps, acts, doors. (arts 5–9, 29)
- **src/lots** — the dice engine: turn, ladder, brace, riders. (arts 41–60)
- **src/hinge** — a door that is a fight; the advance; death routing.
  (art. 30)
- **src/content** — every room, horror, die, and player-facing word, as
  typed data. Engine code contains no prose and no tuning numbers.

No backend. Vite + strict TypeScript, no framework. URL is the install;
all state client-side.

## Key decisions
- **The box is computed, not painted** — rooms are `{lens, width, ceiling}`
  plus a sprite manifest; perspective cannot lie. (arts 13–15)
- **Relative scale everywhere** — one game pixel = 1/GRID of frame width;
  GRID is a dial (240 now, 480 a named option). (arts 22–25)
- **Blind chains, reseeded every death, provably winnable.** (arts 31–33)
- **Knowledge attaches to things, not places** — it survives the reseed.
  (arts 10, 34)
- **The poker duel** — combos only, brace-as-sum, intent first, Yahtzee
  turns; a full hand cannot whiff. (arts 41–48)
- **Dice are the loot** — shape, riders, bonds, talismans; every power
  declared and budgeted. v1 ships the sockets empty. (arts 49–56, 60)
- **No battle screen** — a fight is the room with the thing come close.
  (art. 30)
- **Content is data; prose is the sound design** — the voice rule binds
  every player-facing string. (rules/voice.md)

## The cut: phase 0 — "the skeleton walks"
One complete loop: wake → descend a generated chain → fight → die
knowing more → win because you know. The scope is tracked as tasks on
the board, not here.

## Phases (backlog prose, not promises)
1. **The living depth** — the economy (knucklebones, Merchant, Sanctum,
   Savior), QTE windows under arts 2/61/62, rider/bond/talisman content,
   more horrors, the Warden as a fight, rich Puzzle locks, sanity as the
   second bar.
2. **The look** — hero plates at the reference image's density, CINE
   moments, idle patches everywhere.
3. **The deep** — depths two and three, the truth, the Tenant, the
   Fraying.

Order of 1 vs 2 is a live argument; nothing in 0 forecloses either.

## Non-goals (phase 0)
No economy, no QTE windows, no riders/bonds/talismans in play, no hero
plates, no sanity bar, no classes, no audio, no lean, no native wrap, no
accounts, exactly one horror.

## Status
Vite + strict TypeScript, no framework, no backend, no state library.
`npm run dev` paints one room; `npm test` says what is missing.

**Stubs** — every export typed, every body `not implemented`:
- `src/state` — the two branded ledgers, the rituals (`wake`, `learn`,
  `keep`, `die`, `finish`), the `Vault` port, `snapshot` / `save` /
  `load`. (arts 11, 36)
- `src/gen` — `deal`, `isWinnable`, `explainWinnability`, the room
  taxonomy, the `Grammar` constraints. (arts 31–39)
- `src/descent` — the three bands, `look`, `act`, `doors`,
  `chooseDoor`, beats. (arts 5–9, 29)
- `src/lots` — `Face` with both rider sockets, `Die`, `Pouch`, `Hand`,
  the turn (`openTurn` / `freeze` / `recast` / `decide`), the duel
  (`bestCombo` / `harm` / `brace`), the `Ladder`. (arts 41–60)
- `src/hinge` — `openFightDoor`, `advance`, `routeTurn`, `routeDeath`.
  (art. 30)
- `src/content/voice.ts` — `lintVoice`, the only stub in content.

**Built** — `src/room`, the port of
`reference/castlebrynth-wake-v3.html`: the derived focal length, the
per-pixel first-hit box, world-space shaders, ordered dither, the
contour pass, the mouth. Headless: a room renders to bytes without a
canvas. The lean is not ported (art. 8). The port is byte-identical to
the reference at GRID 240.

**Content** — the two palette schools, the wake plate (three authored
numbers, masonry, four props), the render dial, six plain bones and the
Orphan, the ladder, the Crawling One's intents, the first prose.

**Acceptance tests** — 6 files, 22 tests, 14 failing:
| area | what it enforces | state |
| --- | --- | --- |
| `state` | kill and restore mid-turn; nothing lost (arts 11, 36) | failing |
| `gen` | 1000 seeds, every arrangement winnable (arts 32, 33, 36, 38) | failing |
| `lots` | the Crawling One turn for turn, turn two's brace (arts 41–48) | failing |
| `lots` | no hand of six or more can whiff (arts 46, 48, 50) | failing |
| `room` | the same room renders byte-identical twice (arts 13–18, 22–23) | passing |
| `content` | every player-facing string passes the voice lint | failing |

`room` passes because the renderer is the one thing phase 0 asked to be
finished rather than stubbed. The other five are the definition of done.

**Open questions**, raised by the scaffolding and not settled by the
rules:
- art. 19 asks for props painted near over far; the reference lays the
  traveler over the light shaft standing nearer than it. The reference's
  order is kept, and the light is arguably atmosphere rather than a
  sprite — but the law does not say so.
- art. 48 leaves the great straight's multiplier open; ×6 is the placed
  straw, one above the ×5 a six-long run would earn.
- art. 46 says a hand below six can whiff. Under sets of 2 and runs of
  3, five dice cannot whiff either — every five distinct values out of
  six contain a run. The shortest legal run is the loose screw.
