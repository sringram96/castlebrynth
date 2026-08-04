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
- **src/lots** — the dice engine: turn, ladder, the card, armor, riders. (arts 41–66)
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
- **The poker duel, carded** — intent first, keep-and-recast, then
  multi-combo claims scored sum × tier, each line once per fight;
  defense is armor from items, not dice. (arts 41–48, 63–66)
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
  `collect`, `die`, `finish`), the `Vault` port, `snapshot` / `save` /
  `load`. (arts 11, 36)
- `src/gen` — `deal`, `isWinnable`, `explainWinnability`, the room
  taxonomy, the `Grammar` constraints. (arts 31–39)
- `src/descent` — the three bands, `look`, `act`, `doors`,
  `chooseDoor`, beats. (arts 5–9, 29)
- `src/lots` — `Face` with its one rider socket, `Die`, `Wearable`,
  `Pouch`, `Hand`, the turn (`openTurn` / `keep` / `recast` / `decide`),
  the duel (`claimable` / `claim` / `disband` / `harm` / `attack`), the
  card (`freshCard` / `spend` / `unspent`), armor (`armorFrom` /
  `armorAgainst`), the `Ladder`. (arts 41–65)
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
Orphan, the demo's goods (the Sisters, the Leech, the Ossuary, the
Zealot, the Rusted Plate), the expanded ladder, the Crawling One's
intents, the first prose.

**Acceptance tests** — 6 files, 19 tests, 11 failing:
| area | what it enforces | state |
| --- | --- | --- |
| `state` | kill and restore mid-turn; nothing lost (arts 11, 36) | failing |
| `gen` | 1000 seeds, every arrangement winnable (arts 32, 33, 36, 38) | failing |
| `lots` | the reference fight turn for turn (fixture re-authoring on the board) | failing |
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
- resolved by the demo ruling: the straight is ×6 in the expanded
  ladder (art. 48), and the whiff clause is repealed — unused dice do
  nothing and the ANY DICE line is the floor (art. 46).

**The amendment of 2026-08-04** — the dice ruling, applied. The law
moved first; this repo followed it, and nothing here implements the
mechanics: the nine board tasks starting with "1 · Lots — the turn
core" still own that.

Law and reference, replaced wholesale: `.claude/rules/the-lots.md` (BRACE
repealed for armor, multi-combo claims, the card at arts 63–65, the
whiff clause struck), `.claude/agents/arithmetic.md`,
`.claude/agents/design.md`, `AGENTS.md`, and this file's prose.
`reference/the-crawling-one-encounter.md` is now a superseded notice;
`reference/castlebrynth-lots-demo.html` arrives as the playable spec and
wins ties about behaviour until the encounter fixture is re-authored.

Tests: `test/lots.crawling-one.test.ts` is gone — renamed to
`test/lots.fight.test.ts` and gutted to one failing placeholder naming
the amended articles, because every assertion in it tested turn two's
BRACE. That is 4 tests replaced by 1; the suite is 19 tests, 11 failing.
No other test was touched.

Types, stubs only: `src/lots` loses the brace-rider socket (art. 51) and
BRACE from the decision type (now `end-turn` / `flee`), and gains the
`Line` keys of the expanded ladder, `Claim` with `claimable` / `claim` /
`disband` / `unused`, `Card` with `freshCard` / `spend` / `unspent`,
`Armor` with `Wearable` / `armorFrom` / `armorAgainst`, `IntentEffect`
for sealing, cursing, and corroding (art. 65), and `TalismanSpecies`
(art. 53). `src/state` carries armor and the worn wearables on the run,
the wearable collection on the permanent beside the keepsakes, and a
`FightSave` that now writes down the card and the turn's claims.
`src/content` holds every multiplier (`ladder.ts`), the demo's goods
(`items.ts`, `dice.ts`), and `BASE_ARMOR`.

What the amended rules still do not cover, and what the code left open:
- `AGENTS.md` and this file cite "arts 41–66", but `the-lots.md` ends at
  art. 65. Either an article is missing from the ruling or the citation
  is off by one.
- Base armor has no number. Art. 55 ships the start bare, and the demo's
  blocked 3 comes from the Rusted Plate, so `BASE_ARMOR` is the straw 0
  — a bare player blocks nothing. Arithmetic's call, not a stub's.
- `test/lots.whiff.test.ts` stays failing and untouched as instructed,
  but it no longer compiles: it imports `bestCombo`, which the amendment
  deletes, and builds `Landed` with `frozen`. Under art. 46 as amended
  its subject is gone — ANY DICE ×1 means no hand can whiff, trivially —
  so it needs re-authoring rather than an implementation.
- The card's refill boundary is "between fights" (art. 63); nothing says
  what a fled fight leaves behind, or whether an unfinished fight
  resumed from a `FightSave` keeps its spent lines. The save assumes it
  does.
- Art. 52 gives the Sisters a ghost that scores the pair at triple tier
  on the PAIR line, but not whether the ghost's value is taxed by a
  cursing intent, nor which line a bond spends when the pair is part of
  a composite.
- Art. 53's three talisman species are named, not bounded: nothing says
  how a value modifier and a ladder modifier stack, or whether two shape
  triggers can both read one turn.
- Combo names (`ladder.ts`) and item names reach the player but are not
  in `everyString()`, so the voice lint cannot see them. That predates
  the amendment; the amendment adds thirteen more of them.
- `src/state`'s ritual `keep` is renamed `collect`: art. 41 now spends
  *keep* on mid-turn holding, and one word could not mean both.
