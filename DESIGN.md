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
- **src/lots** — the dice engine: turn, ladder, the card, armor, riders. (arts 41–65)
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
**The skeleton walks.** `npm run dev` is a playable loop in a portrait
browser: wake → descend a generated chain → take the key → fight the
Gnawing → win or die → the Book gains a line → a reseeded chain → the
Warden's door, refused without the key and terse with it. `npm test` is
green: 17 files, 100 tests.

It is an animatronic, not a game. The prose is functional placeholder,
the UI is bare, and nothing is styled. That is deliberate and it is the
next tranche's work.

### What exists
- **src/state** — the two branded ledgers and the five rituals (`wake`,
  `learn`, `collect`, `die`, `finish`). Persistence through the `Vault`
  port: one versioned key, a browser impl and an in-memory one, every
  mutation written. Health and base armor are body stats on the permanent
  beside hand size, because arts 47 and 60 make them stats and content
  owns the numbers. (arts 11, 36, 47, 56, 60)
- **src/gen** — the interim dealer: a seeded shuffle with hard placement
  (Crossing first, Warden's door last, key in the first half, fight-door
  between key and lock), `isWinnable`, and `explainWinnability` naming the
  failure. Placement is hard rather than sampled-and-rejected, so a chain
  it deals cannot be unwinnable. (arts 31–36, 38)
- **src/lots** — the whole duel. The turn (intent first, cast, keep, one
  recast); the shapes and the ladder; the card at once-per-fight; armor as
  a stat with corrode, seal and curse as declared intent data; riders,
  bonds, talismans and wearables as sockets with the demo's goods as
  content; and a headless fight loop emitting structured events and no
  prose. (arts 41–65)
- **src/descent** — a room plays: candles one at a time, taps free and
  always answering, doors as sensed lines, forward only, one `take` act.
  The `RoomBook` port keeps prose out of the engine. (arts 5–9, 29)
- **src/hinge** — the fight-door, the advance as a prop painted into the
  same box, the four exits, and death routing. (arts 30, 32)
- **src/room** — unchanged: the port of
  `reference/castlebrynth-wake-v3.html`, still byte-identical at GRID 240.
- **src/content** — six hand-authored rooms, the Gnawing at the demo's
  numbers, the demo's five goods, the ladder, the reference fight's kit,
  and every player-facing string. The voice lint is real and runs in two
  categories: prose owes the whole rule, a name owes it minus second
  person and present tense.
- **src/main.ts** — the shell: boot into a first waking or a resume, the
  three bands, the room, the bare fight tray, death, the Book, and down
  again. Reload lands at the room you were in.

### Tests
| area | what it enforces |
| --- | --- |
| `lots.turn` | two castings, keeping across the recast, seed determinism (arts 41–44, 60) |
| `lots.combos` | every shape the ladder names, and none it does not (arts 45, 48, 64) |
| `lots.card` | once per fight, disband, the seal mask (arts 63–65) |
| `lots.armor` | corrode for one turn, the floor of nothing, resolution order (arts 46–47) |
| `lots.items` | riders, the Sisters' ghost, the Ossuary, the Zealot, the audit (arts 49–56) |
| `lots.loop` | the three endings, the hand whole, the card refilled at the door (arts 44, 63) |
| `lots.floor` | all 46656 hands of six leave a line to claim (arts 46, 48, 63, 64) |
| `lots.invariants` | a die never twice, a line never twice, damage floors, the recast odds |
| `lots.fairness` | a bare player beats the Gnawing more often than not, and not always (art. 33) |
| `lots.fight` | `reference/the-gnawing-fight.md`, turn for turn |
| `gen` | 1000 seeds, every arrangement winnable (arts 32, 33, 36, 38) |
| `state` | kill the process, restore exactly; the ledgers never mix (arts 11, 36) |
| `descent` | candles, taps, doors, forward only, the candle written down (arts 5–9, 29, 36) |
| `hinge` | the fight-door, the four exits, wounds carried out (art. 30) |
| `death` | the run burns and the permanent survives a reload (arts 11, 32) |
| `room` | byte-identical renders, the GRID dial, the mouth (arts 13–18, 22–23) |
| `content.voice` | every player-facing string, in its category |

### Debt
Named, not hidden. Each of these is a task, not an accident.

- **Flee is a discard, not a pause.** The ruling of 2026-08-04 says a fled
  fight resolves as discarded this tranche; re-entering the door starts it
  fresh on a virgin card. The real ruling — a fled fight pauses, its card
  and its wounds persisting — is deferred.
- **Resume granularity is the room.** `FightSave` is typed and unused.
  Killing the app mid-fight resumes at the room with the fight-door
  unentered. Mid-turn resume is the later half of art. 36.
- **The dealer is dumb.** It deals a single path, so art. 31's two-to-three
  doors per room do not exist yet and blind play has nothing to choose
  between. The real grammar engine — adjacency bans, per-depth guarantees,
  fight-count bands, the depth weights of art. 39 — goes in behind the
  same three signatures. `Grammar` is honoured in shape and mostly empty.
- **No design pass.** Bare UI was authorised for this tranche without the
  design-agent consult. Nothing in `index.html` or `src/main.ts` is the
  real look; arts 26–30 are unspent, the tray is not diegetic, and the
  advance is a view swap with no staging.
- **Placeholder prose.** `src/content/prose.ts` is functional second
  person, not the register. Content review is voice review, and the lint
  passes — but passing the lint is not being in register.
- **One depth, one horror, no economy.** The phase-0 non-goals still hold.
- **The renderer is the shell's slow part.** The box is computed per pixel,
  so `src/main.ts` caches every rendered frame by scene and height. A room
  first seen costs about a second.

### What the rules still do not cover
- **A stranded run.** Art. 33 binds the generator, and it holds: the key is
  always upstream of the lock. But a player may walk past the key, and the
  engine has no back (art. 9) — so the Warden's door refuses a run that can
  no longer be finished. The shell offers that run an end ("the labyrinth
  keeps you"), which burns it and writes its own Book line under art. 32.
  Whether a run may strand itself at all, and whether being kept is a death
  or something else, is a question for the human.
- **The whiff guarantee is unstated law.** Art. 46 no longer says anything
  about a hand of six. Pigeonhole is still true of the dice, but it is the
  card and not the values that can leave a turn with nothing to claim, so
  `lots.floor.test.ts` asks about the floor and the card instead.
- **Art. 19's paint order.** Unchanged and still open: the reference lays
  the traveler over a light shaft standing nearer than it, `far2near`
  reports the plate as out of order, and the law does not say whether a
  light is a sprite or atmosphere.
- **The Warden is a door, not a being.** Art. 37 names the Warden's door as
  the anchor that ends a depth; nothing says what the Warden is.
- **Ladder modifiers are read as one multiplier per tier.** Art. 53 names
  the species and says "a tier higher" without saying what a tier is worth.
  No content ships one, and the engine's reading is declared on the
  talisman rather than assumed.

### Answered since the last cut
**Art. 25 is amended** (2026-08-04): exact fill via sharp upscale replaces
integer scaling with letterboxing. The article invited exactly this
revisit — *"revisit if the bars offend"* — and on a phone they offended:
a 390x675 world band held the box at 240x415, about 60% of each
dimension, with black around it. The frame's height already derives from
the device (art. 24), so a fractional scale fills the band and
nearest-coloured neighbours keep it sharp. Measured at 100% fill on four
phone sizes. The cost is declared in the article: at a fractional scale
neighbouring game pixels can land a device pixel apart at the seams.

The open questions the scaffolding raised are ruled on and applied: the
"arts 41–66" citation was an off-by-one and now reads 41–65; base armor is
0 and the demo's blocked 3 was the Rusted Plate; the Sisters' ghost is
taxed by a curse and fires only on the exact two-die pair claim; talismans
stack value-then-ladder-then-shape, with each shape trigger reading the
turn independently; and combo, item and room names are in `everyString()`
under a `label` category that skips second person.
