# Castlebrynth — design

## What it is
A first-person descent played in a phone browser with one thumb. Rooms are
one-point-perspective boxes computed from three numbers and read like a
novel a candle at a time; the labyrinth is a blind chain of hand-authored
rooms, procedurally rearranged every run; fights are poker-dice duels
against horrors whose intents are always shown; death burns the run and
keeps the knowledge. `reference/GAME.md` is the fantasy. The binding law is in
`.claude/rules/` — 76 numbered articles; tasks cite them as "art. N".

## Components
- **src/state** — the two ledgers (run / permanent) behind named rituals;
  every mutation persists; boot restores exactly. (arts 11, 36)
- **src/gen** — seeds and deals the blind chain under the grammar rules;
  proves winnability. (arts 31–39)
- **src/room** — the computed-box renderer on the GRID dial; the port of
  `reference/castlebrynth-wake-v3.html`; the world marks a thumb answers
  through. (arts 13–25, 68)
- **src/descent** — plays a room: candles, taps, acts, doors, and what has
  happened in the room. (arts 3, 5–9, 29, 70)
- **src/lots** — the dice engine: turn, ladder, the card, armor, riders. (arts 41–65)
- **src/hinge** — a door that is a fight; the advance; death routing; the
  fight that survives a lock screen and a retreat. (arts 30, 63, 75)
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
  every player-facing string, and art. 66 binds the controls instead.
  (rules/voice.md, the-thumb.md)
- **The tray is anatomy, not a menu** — fixed regions, plain imperative
  verbs, things tapped where they stand, and every act that changes state
  changing the scene. (arts 66–76)

## The cut: phase 0 — "the skeleton walks", then reads
One complete loop: wake → descend a generated chain → fight → die
knowing more → win because you know. The scope is tracked as tasks on
the board, not here. The first wave of phase 1 makes that loop legible
rather than adding to it: the thumb's laws, in the shell.

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
**The game is legible.** `npm run dev` is a playable loop in a portrait
browser: wake → descend a generated chain → take the key → fight the
Gnawing → win or die → the Book gains a line → a reseeded chain → the
Warden's door, refused without the key and terse with it. `npm test` is
green: 21 files, 132 tests.

The skeleton walked; it could not be read. Every room rendered
identically, acts changed only the bottom text, the tray was a menu of
prose buttons, four dice states were four border colours, and a
half-spent turn died with the tab. All of that was written down as a
violation list under arts 66–76, and this tranche is that list closed.
A player can now tell where they are, see that their actions did
something, read the fight at a glance, and never lose progress.

What is still deliberately unfinished: the prose is functional
placeholder rather than the register, the ordinary rooms are art. 26's
first tier and not its second, and phase 0's non-goals all still hold.

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
  Also `SceneState` — what has happened in this room, which is what the
  renderer reads and what the frame cache is keyed on (art. 70) — and
  `mayLeave`, which is art. 3: a required thing still lying here refuses
  every door in the room. The `RoomBook` port keeps prose out of the
  engine. (arts 3, 5–9, 29, 70)
- **src/hinge** — the fight-door, the staged advance as a prop painted
  into the same box, the four exits, death routing, and the two laws
  about a fight's place in a *run*: `saveFight`/`restoreFight` (art. 75)
  and `routeFlight` as a pause rather than a discard (art. 63).
  `turnLot` derives each casting's lot from seed, step, turn and casting
  number, which is what lets a turn be replayed instead of stored.
  (arts 28, 30, 32, 63, 75)
- **src/room** — the port of `reference/castlebrynth-wake-v3.html`,
  still byte-identical at GRID 240. Gains `WorldMark`/`markRect`, so the
  region that answers a tap on a thing is derived from the same world
  coordinates the thing is painted at (arts 19, 68), and `overpaint`, so
  a motion can be laid over a cast box without casting it again.
- **src/content** — six hand-authored rooms, each with its own school
  and its own props; the Gnawing at the demo's numbers, the demo's five
  goods, the ladder, the reference fight's kit, and every player-facing
  string. The voice lint runs in two categories — prose owes the whole
  rule, a name owes it minus second person and present tense — and the
  controls in `VERBS` are held to art. 66 instead, which is the same
  review by a different rule.
- **src/main.ts** — the shell: boot into a first waking, a resume, or a
  fight you were mid-turn in; the three bands; the world's tappable
  marks; the tray as anatomy; the crown and the card's sheet; death, the
  Book, and down again.

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
| `room.scene` | a palette and a prop per room, distinct pixels, the name in the first candle, the taken key gone, the opened door open (arts 19, 21, 34, 70) |
| `fight.persist` | the round trip at every point in a turn over 30 seeds, and the card that flight can never refresh (arts 63, 75) |
| `descent.required` | no legal walk reaches a lock without its key — with the control that proves the law is doing the work (arts 3, 4, 9) |
| `content.voice` | every player-facing string, in its category; every control against art. 66 |

### Debt
Named, not hidden. Each of these is a task, not an accident.

- **The dealer is dumb.** It deals a single path, so art. 31's two-to-three
  doors per room do not exist yet and blind play has nothing to choose
  between. The real grammar engine — adjacency bans, per-depth guarantees,
  fight-count bands, the depth weights of art. 39 — goes in behind the
  same three signatures. `Grammar` is honoured in shape and mostly empty.
- **Still no design pass.** The shell is now legible, which is law; it is
  not styled, which is not. arts 26–30's second tier is unspent: the
  ordinary rooms are the computed box plus basic sprites, there are no
  hero plates, and art. 28's idle patches do not exist. `index.html`'s
  CSS is anatomy and four dice states, not a look. The design-agent
  consult is still owed.
- **Placeholder prose.** `src/content/prose.ts` is functional second
  person, not the register. Content review is voice review, and the lint
  passes — but passing the lint is not being in register.
- **One depth, one horror, no economy.** The phase-0 non-goals still hold.
- **The renderer is the shell's slow part.** The box is computed per pixel,
  so `src/main.ts` caches every rendered frame by scene state and height.
  A room first seen costs about a second, and a *state* first seen costs
  it again — taking the key re-casts the box. `overpaint` fixed this for
  the advance, which needed to be cheap per frame; the same trick would
  fix it for props generally, and has not been applied.
- **New: the resolve beat is not persisted.** Art. 57's dimming of unused
  dice needed a moment to happen in, so `End turn` shows one for 700ms
  before advancing. Killing the app inside that window restores the turn
  as it was *before* the press — a settled state, and a legal one under
  art. 1, but the press is lost and no other pulse in the game loses one.
- **New: the Book of Ends reaches the player through `Read`.** Art. 67
  bans its lines from the tray, so they live in the sheet behind a plain
  verb, offered at the Crossing and on the two ending screens. That is
  one verb in the act strip doing what art. 74's glyph does for the card;
  whether the Book deserves its own glyph is a design question, not a
  law one.
- **New: `end.kept` is unreachable.** Art. 3 now refuses the door rather
  than letting a run strand, so the ending that burned a stranded run
  cannot be arrived at by play. The valve is kept in `roomActs` against a
  chain that failed art. 33's guarantee, and its line is still authored.

### What the rules still do not cover
- **What may block a door, beyond a required item.** Art. 3 is now
  enforced: a required thing lying in the room refuses every door in it,
  and `test/descent.required.test.ts` proves no legal walk reaches a lock
  without its key. What the article does not say is where the line falls
  once there is more than one required thing per depth, or whether a
  *required* flag can ever be earned rather than authored — the flag is
  content's word today, and the test checks it against the chain's own
  demands rather than trusting it.
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

### The thumb is law (arts 66–76)
The skeleton was played by a human, and the playtest found one bug and
seven interaction failures. The failures were not the skeleton's: the law
said what the screen *is* (arts 29–30) and what touching *means* (arts
5–8), and never said how the game is operated. The vacuum was filled with
guesses. `.claude/rules/the-thumb.md` is ratified and binds like any
other rule file — the two registers (66), the tray as anatomy (67), look-
then-take (68–71), the dice under the thumb (72–73), the card behind a
glyph and interaction as state (74–75), and the interaction budget (76).
The law index, the design agent, and the pointers in voice.md,
the-world.md and the-room.md are wired to it. No UI was built in that
tranche; the tranche after it is the one below.

### Where the shell broke the thumb, and where it no longer does
The list below is the audit taken when `.claude/rules/the-thumb.md` was
ratified. Every line of it is closed. What each article got is named, so
that a later playtest can argue with the reading rather than guess it.

- **art. 66 — controls narrated.** Closed. Controls come from `VERBS` in
  content and are plain imperative verbs of two words or fewer: Take,
  Open, Fight, Descend, Roll, Recast, Keep all, Claim, Take back, End
  turn, Run, Read, Close, Wake, End run. A door's sensed line is what
  tapping the door answers with, never what a button says.
  `test/content.voice.test.ts` holds every verb to the article — two
  words, a capital, no punctuation, no article and no second person —
  and checks that no act invents a verb of its own.
- **art. 67 — the tray was a menu.** Closed. Three regions in fixed
  places, rebuilt in place rather than appended to: vitals (the body's
  numbers, and in a fight the turn's running totals under art. 57), the
  pouch as slots with the empty ones drawn, and the act strip. The card's
  glyph sits at the end of vitals and never moves. What art. 67 says
  never appears there no longer does: world nouns and doors are tapped in
  the world, the beat advance is a tap on the word band, and the Book's
  lines are in the sheet.
  *Two readings are declared rather than assumed.* The turn's running
  totals live in vitals, because art. 57 requires them visible and vitals
  is the numbers region. What you carry sits in the pouch after the dice
  slots, because art. 68 requires a possession to be tappable and the
  pouch is the possessions region.
- **art. 68 — possessions could not be tapped.** Closed. Every die in the
  pouch, every die on the table, every empty slot and every carried thing
  answers with its declared truth (art. 54) — `src/content/says.ts`, made
  of names from `prose.ts` and numbers from the engine. The world band
  takes taps: `WorldMark` is a billboard in world units, `markRect`
  projects it with the same projector the props are painted through, and
  the shell lays the marks over the canvas, smallest last, at no less
  than a thumb's width. No `inspect` button exists.
- **art. 69 — dead tappables.** Closed. A die spent in a claim is not
  disabled; it is tappable and answers with the line it was spent in.
  Tapping to keep or select answers with the die. The card is a sheet
  behind a glyph rather than an inert strip.
- **art. 70 — acts changed no pixel.** Closed, and this was the section
  everything else waited on. `SceneState` — what has been done here, what
  has been opened, how the horror stands — is what content binds props to
  and what the frame cache is keyed on. Rooms have contents to subtract
  from: the key lies in the alcove and is gone when taken; the fight-door
  stands open once entered.
- **art. 71 — a bare tap walked you through a door.** Closed. Tapping a
  door senses it and chooses it; going through it is Open, Fight or
  Descend in the act strip. `chooseDoor` refuses outright if the room is
  still holding something back (art. 3).
- **art. 72 — keep-marks outlived the recast.** Closed at the engine and
  not at the tray: `recast` clears every mark as the second casting
  lands, so a tray that forgot the rule could not break it. The first
  casting keeps its marks because nothing player-facing reads them and a
  resume replays from them. The four states are a plain face, a cold tab
  along the top, a full inversion, and a sunk gold ring — not four border
  colours. Unused dice dim through the resolve beat.
- **art. 73 — the intent was a note.** Closed. It is a chip in the
  crown over the world band; tapping it says `INTENT_SAYS` in plain
  words.
- **art. 74 — the card was parked mid-screen.** Closed. A persistent
  glyph at the end of vitals opens it in one tap, as a sheet over the
  world, with a Close verb.
- **art. 75 — a half-spent turn did not survive the lock screen.**
  Closed. `FightSave` is written on every fight mutation. The dice are
  not stored: each casting's lot is a pure function of seed, step, turn
  number and casting number, so a resume replays the turn and gets the
  same faces. The phase and the half-made selection are state like any
  other. `test/fight.persist.test.ts` round-trips through the vault at
  five points in a turn across thirty seeds.
- **art. 76 — inside the budget.** Still inside it. The tap is the whole
  vocabulary; nothing here proposes leaving it.

Two rulings landed with the list, because the list could not be closed
around them:

**A fled fight pauses** (art. 63). The skeleton's discard was an
acceptable shortcut while nothing could be carried out of a fight; it
becomes an exploit the moment anything can, which is the next wave. Spent
lines and wounds now persist in the run, re-entering the door resumes,
and the card refills at exactly two moments — a fresh door and the death
that burns the run. It is the same `FightSave` machinery as art. 75:
running out and locking the screen differ only in where you are standing.

**A run can never be walked into unwinnable** (art. 3). Art. 33 binds the
generator and always held — the key is upstream of its lock — but nothing
made the player *carry* it, and the engine has no back (art. 9). Content
marks required items; while one lies unclaimed the room's door verbs
refuse with one line that names nothing and points at nothing. Taking
stays a deliberate act, and optional treasure may still be walked past
and lost, which is art. 4 working. The proof searches every legal path
over the carried-set as well as the room, for two hundred seeds, with a
control run that strands every one of them the moment the law is off.

### The full-house defect, still fixed
**It was interactive, and it was fixed at the interaction layer.** The
engine was never wrong: `shapesOf` names FULL HOUSE for every five-die
selection of signature 3-2, and `test/thumb.claim.test.ts` proves that
exhaustively — all 7776 five-die hands, and all 300 arrangements of
AAABB through the claim path the shell calls. What failed was the
sentence the shell never said. Claim offers match the *exact* selection
(art. 72's DEFAULT), so a hand of six holding a full house offers FULL
HOUSE on the exact five and nothing on all six — and the thumb that
selects the whole hand is shown the ANY DICE floor, which art. 46 always
keeps on offer.

`fitsNothing(turn, dice, ladder)` in `src/lots/card.ts` is art. 72's
other half, and the shell now says both halves at once: the offer's name
and number in vitals, and `NOTICES['claim.exact']` beside it when the
offer is only the floor. A selection makes at most one combo, so `Claim`
is a single verb that takes the highest tier on the table rather than a
row of names and numbers wearing the coat of controls.
