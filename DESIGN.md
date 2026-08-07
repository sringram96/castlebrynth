# Castlebrynth — design

**This file is the spec, and it is one screen.** What the game *is* right
now: what it is made of, what was decided, what runs, what is green, what is
owed. Nothing chronological lives here.

- The **law** is `.claude/rules/` — 124 numbered articles, cited as "art. N".
  The player's journey through them is `.claude/rules/journey.md`, which is
  the one place every mode, every mechanic and every ledger is listed.
- The **history** is `CHRONICLE.md` — every wave journal, append-only.
- The **fantasy** is `reference/GAME.md`. Where a rule conflicts with it, the
  rule wins.

## What it is
A first-person descent played in a phone browser with one thumb. Rooms are
one-point-perspective boxes computed from three numbers and read like a
novel a candle at a time; the labyrinth is a blind chain of hand-authored
rooms, procedurally rearranged every run; fights are poker-dice duels
against horrors whose intents are always shown; death burns the run and
keeps the knowledge.

## Components
- **src/state** — the two ledgers (run / permanent) behind named rituals;
  every mutation persists; boot restores exactly. (arts 11, 36)
- **src/gen** — seeds and deals the blind chain under the grammar rules;
  proves winnability. (arts 31–39, 77–85)
- **src/room** — the computed-box renderer on the GRID dial; one ramp per
  surface and one dither between adjacent steps; the world marks a thumb
  answers through. (arts 13–25, 68, 93–115)
- **src/descent** — plays a room: candles, taps, acts, doors, and what has
  happened in the room. (arts 3, 5–9, 29, 70, 118, 120)
- **src/hinge** — a door that is a fight; the advance; death routing; the
  fight that survives a lock screen and a retreat. (arts 30, 63, 75)
- **src/lots** — the dice engine: turn, ladder, the card, armor, riders, and
  the beats a fight event resolves in. (arts 41–65, 119)
- **src/shell** — the pieces of the shell that are decisions rather than
  DOM: the act strip's questions, the word band's priority, the beat
  player, the face painter, the two screens.
- **src/content** — every room, horror, die, and player-facing word, as
  typed data. Engine code contains no prose and no tuning numbers.
- **src/main.ts** — the shell itself: boot, the three bands, the tray, the
  screens, death, the Book, and down again.

No backend. Vite + strict TypeScript, no framework. URL is the install;
all state client-side.

## Key decisions
- **The box is computed, not painted** — rooms are `{lens, width, ceiling}`
  plus a sprite manifest; perspective cannot lie. (arts 13–15)
- **Relative scale everywhere** — one game pixel = 1/GRID of frame width;
  GRID is a dial (240 now, 480 a named option). (arts 22–25)
- **Blind chains, reseeded every death, provably winnable** — and blind is not
  mute: a door leaks its region's sense, true and partial and never a label,
  so the drift's twenty questions are asked in a language the player can
  read. (arts 31–33, 77)
- **An act may cost something, and the cost is in the look** — the Descent's
  art. 42. Looking is free and says the price; pressing pays; a price is never
  the run; and every priced act returns knowledge, leverage, a relationship, a
  permanent change or an exceptional object. (arts 5, 120)
- **Knowledge attaches to things, not places** — it survives the reseed, and
  so does some of what you refused. (arts 10, 34, 84)
- **The poker duel, carded** — intent first, then three presses: Roll,
  Reroll, Attack. The selection is the attack, scored sum × tier, each
  line once per fight; defense is armor from items, not dice. A claim
  resolves in beats, and each beat says one thing. (arts 41–48, 63–65, 119)
- **Dice are the loot, and the loot belonged to somebody** — shape,
  riders, bonds, talismans, wearables; every power declared and budgeted;
  every good carrying one sentence of origin that explains its rules, or
  it does not ship. You start with six bare bones and a full hand, and
  every die past those six came off someone who came down here and did
  not come back — only a *special* die is ever discovered. (arts 49–56,
  60, 86–88)
- **No battle screen** — a fight is the room with the thing come close, and
  it is begun by tapping the thing. (arts 30, 68)
- **A room is six parts, and what stands in it is drawn, scattered or
  cast** — a school of surfaces, light and air; a shape above its
  proportions; a door that is a hole and never furniture; objects as ramp
  indices, fields as scatter, masses as height on the floor; one hero, and
  stillness spent a loop at a time; a deep hue-shifted ramp that blends in
  the lights and dithers in the darks, and a light that is a station and a
  colour. (arts 93–115)
- **Content is data; prose is the sound design** — the voice rule binds
  every player-facing string, and art. 66 binds the controls instead.
  (rules/voice.md, the-thumb.md)
- **The tray is anatomy, not a menu** — fixed regions, plain imperative
  verbs, things tapped where they stand, and every act that changes state
  changing the scene. A decision of its own gets a screen instead: the
  choosing, the threshold, the settings. (arts 66–76, 90–92, 116, 121, 123–124)
- **A setting shows the game differently and never makes it different** —
  presentation only, permanent rather than run state, and the vault as text
  the player can carry off. (art. 116)
- **Nothing may be a dead press** — an act that cannot change anything is
  not offered, and the thing's look says what withholds it. (art. 118)

## The cut: phase 0 — "the skeleton walks", then reads
One complete loop: wake → descend a generated chain → fight → die
knowing more → win because you know. The scope is tracked as tasks on
the board, not here.

## Phases (backlog prose, not promises)
1. **The living depth** — the economy (knucklebones, the Merchant; the
   Sanctum and the Savior are built and take no price),
   QTE windows under arts 2/61/62, rider/bond/talisman content,
   more horrors, rich Puzzle locks, sanity as the second bar.
2. **The look** — hero plates at the reference image's density, CINE
   moments, idle patches everywhere.
3. **The deep** — depths two and three, the truth, the Tenant, the
   Fraying.

Order of 1 vs 2 is a live argument; nothing in 0 forecloses either.

## Non-goals (phase 0)
No economy, no QTE windows, no hero plates, no sanity bar, no audio, no
lean, no native wrap, no accounts. Classes are not a non-goal any more —
art. 12 is repealed, so they are not coming at all. Riders, bonds,
talismans and wearables *are* in play as of the travelers wave; what is
still absent is anything to spend on them.

---

## Status

### What runs
`npm run dev` is a playable loop in a portrait browser. Boot lands on the
threshold; Descend deals a labyrinth; each room offers one to three blind
doors, each of which leaks its region's sense on a tap; the room behind a
door is dealt when the door is opened; a lean of four doors locks a region
and the next room announces the arrival; the rest of the depth deals from
that pool and its bound encounters wake; the Warden's door ends it, and the
keeper behind it wakes when the key turns. Fights are begun by tapping the
horror and resolve in beats. Death writes a line in the Book, burns the run
and keeps the pouch, the meetings and the knowledge.

Fourteen hand-authored rooms, five horrors, one depth of nine rooms, three
regions and a neutral pool, and a catalog of dice, riders, bonds, talismans,
levels, wearables and rolling goods — all of it in `src/content`.

What is deliberately unfinished: the ordinary rooms are art. 26's first
tier and not its second, much of the prose is still in the repealed
register (below), and phase 0's non-goals hold.

### What is green
`npm test`: 58 files, 673 tests.

| area | what it enforces |
| --- | --- |
| `lots.turn` | two castings, keeping across the recast, seed determinism (arts 41–44, 60) |
| `lots.combos` | every shape the ladder names, and none it does not (arts 45, 48, 64) |
| `lots.card` | once per fight, disband, the seal mask (arts 63–65) |
| `lots.armor` | corrode for one turn, the floor of nothing, resolution order (arts 46–47) |
| `lots.items` | riders, the Sisters' ghost, the Ossuary, the Zealot, the audit (arts 49–56) |
| `lots.loop` | the three endings, the hand whole, the card refilled at the door (arts 44, 63) |
| `lots.floor` | every bare hand leaves a line to claim, and a shape above the floor (arts 46, 48, 55, 63–64) |
| `lots.invariants` | a die never twice, a line never twice, damage floors, the recast odds |
| `lots.fairness` | a bare six-die player is expected to beat the Gnawing and not certain to; each effect kind priced alone (arts 33, 55, 65, 86, 89) |
| `lots.effects` | bind, bleed and hunger as declared data, and the one order all six resolve in (art. 65) |
| `lots.fight` | `reference/the-gnawing-fight.md`, turn for turn |
| `levels` | the five levels: one line raised, one lowered, and the audit that says a level is not a talisman (arts 53–54) |
| `goods` · `travelers` | every good placed through the registry, banded, priced against the plain bone, with an origin sentence linted as prose (arts 50–56, 83, 86–89) |
| `rolling.*` | the carried species: its faces, its beat, its seam, and carrying none as the normal state (arts 51, 54, 119) |
| `faces` | every face a thing can show, drawn as ramp indices and marked where it sits (arts 100, 115) |
| `beats.*` | the beat order, nothing decided mid-timeline, every rider's own beat, every beat settled, no leaked timers (arts 1, 116, 119) |
| `warden` | the ceremony and the keeper, headless, from the turn of the key to the thing that goes down (arts 37, 68–70, 82, 97) |
| `horrors.regions` | 1000 runs: each region's unique awake only when that region locks, and every lean survivable (arts 78, 83–84) |
| `gen` · `gen.drift` | the dealer run by run and 1000 runs per policy: lazy dealing, the prefix property, winnability by construction, the lock, the bands (arts 31–39, 77–82) |
| `encounters` · `mercy` | binding and scope; the two mercy tiers, guaranteed and rare, over 7000 runs (arts 40, 70, 77–78, 82–84) |
| `descent` · `descent.required` | candles, taps, doors, forward only; and no legal walk reaching a lock keyless (arts 3–9, 29, 36, 80) |
| `senses` · `price` | a door's sense true and partial and never a label; a priced act's price in the look before the press (arts 31, 77, 120) |
| `dead-press` · `summons` · `answers` | no act offered that cannot change anything, no verb without its look, no act without its answer (arts 68–69, 118) |
| `hinge` · `hinge.summon` | the fight-door, the four exits, wounds carried out, the fight summoned by the thing (arts 30, 68) |
| `state` · `vault` · `death` · `fight.persist` | kill the process and restore exactly; the ladder with no gap; the run burns and the permanent survives; a half-spent turn round-tripped (arts 11, 32, 36, 63, 75) |
| `room` · `room.scene` · `room.junction` · `stir` | byte-identical renders, the GRID dial, the mouth, the shapes, the doorway stir (arts 13–25, 70, 96, 106–110) |
| `panels` · `pick` · `thumb.claim` · `threshold` · `choosing` | the rail and its panels, the pick that follows the thumb, the exact selection, the front door, the chosen hand (arts 60, 67, 71–72, 90–92, 123–124) |
| `scrawl` · `turn.speaks` · `content.voice` | the ending as his handwriting, the turn saying what it did, and every player-facing string in its category (rules/voice.md, art. 66) |
| `walkthrough` · `acceptance` | the acceptance walk end to end, through the vault |

### What is owed
Named, not hidden. Each of these is a task, not an accident. The struck-out
history — what was owed and why it closed — is in `CHRONICLE.md`.

**Balance and the catalog**

- **Rarity is one number doing two jobs.** `RARITY` bands the goods against
  each other and `FLOOR_CHANCE` decides whether the socket fills at all.
  But `weight` is *relative*, so every good added rarifies every existing
  one without anyone choosing that; and a placed good leaves the pool for
  the run, so the last find in a long run is far likelier than the first.
  Neither is wrong at eight goods. Both will be at thirty, and the fix is a
  ruling about what rarity *means*, not a number.
- **The forks are rare and nobody chose how rare.** A fork forms only when
  both of its goods are still free to be dealt, so how often a player meets
  one falls out of `FLOOR_CHANCE`, the weights, and where the road went.
  Art. 89 calls a fork the cheapest lever for making a room a decision; a
  lever whose frequency is an accident of three other numbers is not being
  pulled on purpose.
- **The Zealot is unaudited.** It is the strongest good in the game — a
  whole turn's attack doubled when every die is claimed, measured at +0.260
  against a probe — and it carries no cost face, no fork and no table
  proving its condition prices it. Every other good is audited against the
  plain bone's budget (art. 54); this one is not.
- **A cost face can kill you on a turn you won.** A `wound` rider fires with
  the claims (art. 51) and the resolution returns `won` before your health
  is checked, so a killing blow is never also a killing blow taken. It is
  consistent and generous, and no article covers the order.
- **A whole depth is still hard to survive.** The live table is the levels
  wave's, in `CHRONICLE.md`. The shape of it: a first waking is expected to
  die, a taught run wins about half the time, and about a third of the
  survival gain came from a mercy displacing a room that could have had
  teeth in it. The knobs are `WARDEN_HEALTH`, the uniques' health,
  `SAVIOR_CHANCE` and the Sanctum's band — all content.

**The rules' own gaps**

- **Art. 46's whiff guarantee is unstated law, and it is stated about the
  wrong hand.** The article says nothing about a hand of any size.
  `lots.floor.test.ts` proves what is true of the hand the game actually
  has; the article should say what the test proves.
- **PAIRISH and the full house.** `PAIRISH` names four lines a SEAL intent
  shuts, and whether the full house belongs among them has been deferred
  twice. It is a one-line content ruling.
- **What may block a door, beyond a required item.** Art. 3 is enforced and
  proved, but it does not say where the line falls once there is more than
  one required thing per depth, or whether `required` can ever be earned
  rather than authored.
- **Art. 19's paint order** when a drawn thing and a field share a depth.
  Art. 101 settled that a shaft of motes is a field; it did not settle who
  is painted first.
- **Ladder modifiers are read as one multiplier per tier.** Art. 53 names
  the species and says "a tier higher" without saying what a tier is worth.
  The counting cord and the five levels exercise the engine's reading; the
  article still does not say it is right.
- **Three lines of the ladder cannot be claimed by a wounded hand at all** —
  the straight, three pairs, two triples. That reads as a promise if it is
  deliberate and as a bug if it is not, and no article says which.

**The look, the words, and the shell**

- **Still no design pass.** The shell is legible, which is law; it is not
  styled, which is not. Arts 26–30's second tier is unspent: ordinary rooms
  are the computed box plus basic sprites, there are no hero plates, and
  `index.html`'s CSS is anatomy and dice states, not a look.
- **Placeholder prose.** Thirteen of the fourteen rooms, every `LOOKS` line
  outside the named exemptions, and most origins are still in the repealed
  register. `src/content/voice.ts`'s `placeholder` category is where that
  debt is counted; the count is the task.
- **`blendAbove` is a guess at a fifth.** Art. 95 says the dither threshold
  must be settled on a phone, at real brightness, in a dark room. It has
  been settled on a desktop panel, which cannot show the thing being
  decided. Treat the number in `render.ts` as unverified.
- **The fight's timings have never been felt.** ~3.1s of animation per turn,
  measured in a headless browser at 390×844 and never under a thumb. The
  cuts are pre-registered in `.claude/skills/phone-pass/SKILL.md`.
- **The Warden's body does not thin as it is hurt.** Art. 70 wants a wounded
  horror to stay wounded and the hinge's default mass does that; a drawn
  body cannot, so the keeper's wounds read only from the bar above it.
- **The renderer is the shell's slow part.** The box is computed per pixel
  and cached by scene state and height, so a room first seen costs about a
  second and a *state* first seen costs it again. `overpaint` fixes this for
  the advance; the same trick would fix it for props generally.
- **The resolve beat is not persisted.** `End turn` shows a 700ms dim before
  advancing; killing the app inside that window restores the turn as it was
  before the press. A settled state, and a legal one (art. 1), but the press
  is lost and no other pulse in the game loses one.
- **The ladder has no reader for what it quarantines.** Nothing offers to
  retry a quarantined snapshot against a later build. "We kept your Book
  somewhere you cannot see" is half a promise kept.
- **The Book of Ends reaches the player through `Read`.** One verb in the
  act strip doing what art. 74's glyph does for the card. Whether the Book
  deserves its own glyph is a design question, not a law one.

**Consequences nobody has ruled on**

- **Only one depth exists, so art. 39 is half-exercised.** "Shallow leans
  quiet, deep leans toward teeth" is a claim about *two* depths.
- **The neutral pool holds no lair**, which caps how far a tendency change
  can move the mix. Whether it should mirror the regions' shape or stay
  deliberately quiet is unruled.
- **The trail is PARKED** (art. 85). The history graph now exists and is
  trivially renderable, which makes the temptation worse rather than
  better. There is a board task saying do not pick it up.
- **`end.kept` is unreachable.** Art. 3 refuses the door rather than letting
  a run strand, so the ending that burned a stranded run cannot be arrived
  at by play. The valve is kept against a chain that failed art. 33.

### The knobs, and where they live
Everything tunable is in `src/content` and nowhere else.

- **The drift**, in `rooms.ts`. Per depth (`DEPTH_ONE`): `length` (9 rooms,
  art. 81), `lockAt` (4 doors, art. 78), the `regions` and their pools, the
  `neutral` pool, the `tendencies` per room type (art. 39), the `locks` the
  depth is committed to (art. 80), and `mercies` (art. 40). Across depths
  (`GRAMMAR`): `doorWeights`, `fightBand`, `adjacencyBans`, `guarantees`,
  `clumpPenalty`, `driftPull` and `bandPull`. Per room: each socket's
  `chance`.
- **The mercies**, in `encounters.ts`: `SANCTUM_BREATH` (0.5),
  `SAVIOR_MERCY` (1), `SAVIOR_CHANCE` (0.04 per mercy socket, ≈ a fifth of
  runs). The Sanctum's band is fenced by art. 78 — the font is in the
  neutral pool so no lean can steer a run away from it, and every room from
  `lockAt` down belongs to the locked region, so a neutral room can only be
  dealt at steps 1–3.
- **The body and the ladder**, in `body.ts` and `ladder.ts`. **The
  goods and their rarity**, in `items.ts`, `dice.ts`, `trinkets.ts` and
  `encounters.ts`. **The look**, in `render.ts` and `palettes.ts`.

Turning any of them needs no engine change, and the distributional suite is
how you find out what you did.
