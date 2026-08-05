# Castlebrynth — design

## What it is
A first-person descent played in a phone browser with one thumb. Rooms are
one-point-perspective boxes computed from three numbers and read like a
novel a candle at a time; the labyrinth is a blind chain of hand-authored
rooms, procedurally rearranged every run; fights are poker-dice duels
against horrors whose intents are always shown; death burns the run and
keeps the knowledge. `reference/GAME.md` is the fantasy. The binding law is in
`.claude/rules/` — 92 numbered articles; tasks cite them as "art. N".

## Components
- **src/state** — the two ledgers (run / permanent) behind named rituals;
  every mutation persists; boot restores exactly. (arts 11, 36)
- **src/gen** — seeds and deals the blind chain under the grammar rules;
  proves winnability. (arts 31–39)
- **src/room** — the computed-box renderer on the GRID dial; one ramp per
  surface and one dither between adjacent steps; the world marks a thumb
  answers through. (arts 13–25, 68)
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
- **Dice are the loot, and the loot belonged to somebody** — shape,
  riders, bonds, talismans, wearables; every power declared and budgeted;
  every good carrying one sentence of origin that explains its rules, or
  it does not ship. You start with five bare bones against a hand of six,
  and every die that closes that gap came off someone who came down here
  and did not come back. (arts 49–56, 60, 86–88)
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
1. **The living depth** — the economy (knucklebones, the Merchant; the
   Sanctum and the Savior are built and take no price),
   QTE windows under arts 2/61/62, rider/bond/talisman content,
   more horrors, the Warden as a fight, rich Puzzle locks, sanity as the
   second bar.
2. **The look** — hero plates at the reference image's density, CINE
   moments, idle patches everywhere.
3. **The deep** — depths two and three, the truth, the Tenant, the
   Fraying.

Order of 1 vs 2 is a live argument; nothing in 0 forecloses either.

## Non-goals (phase 0)
No economy, no QTE windows, no hero plates, no sanity bar, no audio, no
lean, no native wrap, no accounts, exactly one horror. Classes are not a
non-goal any more — art. 12 is repealed, so they are not coming at all.
Riders, bonds, talismans and wearables *are* in play as of the travelers
wave; what is still absent is anything to spend on them.


## Status
**The labyrinth leans, and the collection has people in it.** `npm run dev`
is a playable loop in a portrait browser: wake → open one of one to three
blind doors → the room behind it is dealt on the spot → keep choosing → a
region locks and the depth announces where you have arrived → the rest of
the depth deals from that region and its encounters wake → the Warden's
door, refused without the key and terse with it. `npm test` is green: 31
files, 279 tests.

**And the tray became a rail and panels.** The playtest found two
immersion breaks, and the tray stand-up of 2026-08-05 ruled on both. The
dice sat on screen during exploration as if a fight were always
happening; and you could take a thing you had never looked at, so a
room's contents were a list before they were a place.

- **Art. 67 amended.** The tray is a **persistent rail** — vitals and the
  tabs — and a **panel area** beneath it. ACTS is home, where the room is
  played from; POUCH is art. 60's swap surface; FIGHT exists only while a
  fight does. The fixed regions are not repealed, only relocated: what
  changed is that the tray stopped showing all of them at once. **Outside
  a fight, no die is drawn anywhere but in POUCH.**
- **Art. 68 strengthened — the summons.** An act about a thing does not
  exist until the thing has been tapped. Tap the alcove, the word band
  answers — that answer *is* the inspection — and only then does Take
  appear. The summons persists for the instance (arts 70, 82) and two
  copies of one room summon independently. No inspect buttons and no
  tooltips: a tooltip with an inspect button is what art. 68 abolished.
  Doors were already this shape (art. 71) and are untouched.
- **Art. 90 — tabs are taps.** A tab bar spends nothing from art. 76's
  budget. A tab is a *label*, not a control, so art. 66 does not govern
  it and art. 90 does; the tab words live in their own `TABS` record
  rather than in `VERBS`, because putting nouns under art. 66's lint
  would have meant quietly widening that article. **The slide is a named
  option** — weighed at the same stand-up, not admitted, still eligible,
  and nothing here forecloses it.
- **Art. 91 — panel focus is state.** It rides the run ledger and the
  vault. Transitions are a *table* (`panelAfter`) rather than a branch at
  each call site, because "declared events, never inferences" is only
  checkable if you can read every transition in one go. Booting is
  deliberately not a transition: a player who locked the phone on the
  pouch comes back to the pouch, fight or no fight.
- **Art. 92 — the map is a socket.** A disabled tab is legal; pixels
  behind it are not (arts 31, 85). `Panel` has no `map` member, so
  nothing can focus it even by accident.

The FIGHT panel is its own animal without breaking art. 30 — the world
band is still the room with the horror advanced. What changes mode is the
tray: darker ground, ruled off, lit along its top edge, with art. 57's
running totals and the card's glyph pinned in its header and the hand
under them.

**The pouch is informative, and the hand is chosen at the waking.** The
first cut let you swap dice from the POUCH panel at any time, which put a
hand-change inside a descent and made the panel a working surface with a
guard on it. Art. 60 already said the hand is assembled *for the
descent*, so the choosing moved to where a descent begins: after an
ending, when the pouch has outgrown the hand, the run opens on a screen
that asks which dice come down. A die found mid-descent goes into the
pouch and stays there.

That makes three things true by construction rather than by a guard. The
hand never moves inside a descent, so a fight can never be re-armed
(arts 63, 75). POUCH is a thing you *read* — every die answers with its
declared truth and commits nothing — so it needs no verb. And **the
pouch is shut during a fight**: there is nothing to do in there, and a
tab that only ever says "not now" is worse than a tab that is not
offered.

The ending announces it. A death with a choice waiting behind it says so
in the word band — *"What is on you now is more than your hand holds"* —
and the verb on the strip is **Choose** rather than Descend, because the
press opens a question rather than the labyrinth and no press should lie
about where it takes you (art. 71). An ending with nothing to decide is
untouched: the plain line, and Descend. The prose still never instructs
(art. 66) — it states what is true of the pouch, and the verb is the
only thing that says what to press.

The choosing screen is a screen and not a panel, because it is a
decision of its own. It has no tabs — there is nowhere else to be until
it is answered — and it spends no new vocabulary: the dice are tapped
the way every die is tapped, the picks are staged the way a claim is
(art. 72), and one plain verb commits. It also gives the spare row the
room the POUCH panel could not: **the "spare row has no ceiling" debt is
closed**, because the place that has to show everything you own is now a
screen rather than a strip in the tray.

**And FIGHT is not a tab.** The first cut of this shipped with a real
bug: the duel's verbs were rendered into ACTS, so a fight force-focused a
panel you then had to *leave* in order to roll. Fixing that made the
shape obvious — the fight is not one of the places you can go, it is what
the panel area becomes while a fight is on. It carries everything the
duel needs, takes no room on the rail, and you return to it by pressing
the tab you are already on: a tab is somewhere you step aside to. The
dice of a turn are drawn in FIGHT and nowhere else; ACTS keeps the room's
summoned verbs, which is where spells and consumables will sit.

**FIGHT holds only the duel, so Run moved out of it.** The fight's strip
is three different sets of verbs across a turn — Roll, then Recast and
Keep all, then Claim and Take back and End turn — and Run was riding
along at the end of each, shifting position every time the phase turned.
Running is not a move in the duel anyway: it is the one thing you can
still do about the door you are standing at, which is a room act. So it
sits in ACTS, in one place, for the whole fight, and it is the first
thing that panel has ever had a reason to hold. It is offered
unconditionally now, through the resolve beat as well — `runFromTheFight`
clears its own timers, so art. 41's "always" can mean always.

The cost is honest and worth stating: **fleeing is two taps now** — the
acts tab, then Run — where it used to be one. Art. 41 says FLEE is always
*offered*, not that it is always one press, and no fight in this game is
timed (art. 1), so the tap buys a strip that holds still. If flight ever
wants to be instant again, the fix is a fixed slot on the rail rather
than a verb back in the shifting strip.

**The vault carried all of it.** `VAULT_VERSION` went 3 → 4 → 5 in one
wave, and both rungs are the *good* kind: nothing about the arrangement
moved, so they fill the new field and leave the run standing where it
was. That is a second shape of migration (`fillingTheRun`) beside the
run-dropping one, and the difference between them is now explicit. A
tray change may not cost anybody a descent.

**And the dice belonged to somebody.** The collection has been a socket
with nothing in it for four waves. The **travelers wave** fills it, and
changes what loot *is* on the way past. An item that is a stat block with
a name on it is more mechanics, and players can tell; what makes a found
thing mean something is that it came from somewhere and tells you
something true about the place. So the ruling of 2026-08-05:

- **Art. 12 is repealed.** There are no classes, ever. Your build is who
  you have found, and nothing may be built that assumes otherwise.
- **The start is five bare dice** against a hand size of six (art. 55), so
  the tray shows one empty slot from the first waking. The hole in your
  hand is the invitation — and once it is filled, **six is the standard
  and every further find is a swap**, never an addition (art. 60, amended
  the same day).
- **Every die past those five belonged to someone who came down here and
  did not come back** (art. 86). Each rare individual leaves exactly one
  unique die, and a die's shape is how its owner died: the distribution is
  how they played, the cost face is the mistake that killed them.
- **An item's origin explains its rules, in one sentence** (art. 87), for
  every good that ships. A rider is a habit somebody carried into a fight;
  a bond is two people who went down together; a talisman is the luck
  someone brought; a wearable is what they wore. If the sentence cannot be
  written the item does not ship — and the sentence is prose, so it is
  linted as prose.
- **A good may be pure knowledge** — a name, a mark, no stat (art. 88).
  Nothing ships on that axis yet; the socket is named.
- **A floor socket may offer a fork** (art. 89): two goods, where taking
  one forfeits the other, stated plainly before the take and final after.

The Crossing's waking ritual went with the law that needed it. There is no
pale bone to pick out of your own hand any more — waking is the room, and
your first die is a dead traveler's, which is also your signature
(art. 56).

**And the vault stopped being one schema change from a disaster.** `load`
answered a snapshot from another version with `return null`, and the next
`save` wrote over it, so the next time the ledger's shape moved it would
have taken every Book of Ends with it — the one thing art. 11 promises
survives everything. There is a migration ladder now, and a quarantine for
anything it cannot walk. Nothing is destroyed. That debt is closed.

The dealer was dumb. It dealt a single path, so art. 31's two-to-three
doors did not exist and blind play had nothing to choose between; that
was the first debt on this list, and it is closed. The replacement is
**the drift** (arts 77–85): every dealt door carries a hidden region
tag, choosing tallies it, and the pools weight by the tally, so the
labyrinth leans as the player leans. At a content-set door count one
region locks and takes the rest of the depth. Twenty questions, not a
fork in a road — no single door means much, the pattern means
everything, and every run arrives somewhere.

Three things changed shape underneath that. Dealing is **lazy**: a room
is dealt when its door is opened, from seed plus choice history, so the
road not taken is never computed and cannot leak (art. 79). Winnability
stopped being a **search** and became a **construction**: required items
are unbound from rooms, and the dealer places the key in the path ahead
of the lock it opens (art. 80). And a room now has a **template** and an
**instance** (art. 82): rooms repeat within a run, knowledge keys on
what you recognise, and scene state keys on where you stand.

### The travelers, and every good that ships

Three travelers, each an encounter through art. 83's registry — floating,
rare, unique per run, met-flagged per art. 84 — each leaving exactly one
die through the `meet` and `collect` rituals. Their dice, and the rest of
the catalog, with the sentence each one ships under (art. 87):

| good | what it is | origin |
| --- | --- | --- |
| **the last push** | die {1,5,5,6,6,6}, cost 3 on the 1 | *The one who throws high, and again, and again, until the throw that lands low.* |
| **the careful bone** | die {2,3,3,4,4,5}, no cost | *The one who never throws high and never throws low, and dies here regardless.* |
| **the last room** | die {2,3,4,5,6,6}, cost 2 on each 6 | *The one who keeps the strong throw for the last room, and opens something reaching for it.* |
| **the sisters** (two halves) | plain faces, bonded (art. 52) | *Two who go down together, and are worth anything only when they land together.* |
| **the leech** | die with a healing rider on its 6 | *The habit of taking a little back off whatever you hit, which does not keep you alive.* |
| **the counting cord** | talisman, ladder species: runs score a tier higher | *The cord of one who counts the way down in order, and what you claim in order scores a tier higher.* |
| **the rusted plate** | wearable, armor 3 | *Iron somebody wears down here, rusted through in two places, and still good for three.* |

A **cost face** is a rider in the ordinary art. 51 sense: it fires only
when its face is *spent in a claim*, so carrying one is free and reaching
for it is not. Armor does not eat it — it did not come from the horror.
That is what makes a cost face a decision rather than a tax, and it is why
the pusher's price sits on the throw that fails and the runner's sits on
the throw that works.

**The Orphan does not ship.** It is over the plain bone's budget with no
cost face and nobody it came off, so art. 87 refuses it. It survives as
the die the audit is pointed at — `paid: false` — because an audit no die
ever fails is an audit nobody can trust.

**The Sisters' halves are banded apart**, the elder to the first half of
the depth and the younger to the second. Finding one half then means the
other is somewhere below you, which is a goal the labyrinth gave you
rather than a quest handed to you.

**Two forks ship** (art. 89): the elder Sister against the plate — build
against body — and the leech against the careful bone — sustain against
consistency. Taking one writes two deeds: the other's act, which closes
the offer, and its loss, which is what the floor remembers. The room says
the terms in one candle before either verb reaches the strip, and the good
you left leaves its shape in the dust.

**A found thing is worth something now.** A die fills the empty slot the
moment it is taken rather than at the next waking, a wearable arms you
from the next blow, and a talisman is in the next fight because the fight
reads the permanent at the door.

**And past a full hand, a find is a swap** (art. 60, amended by the
ruling of 2026-08-05). The first version of this wave let a find *fill*
the hole and then had every find after it pile up in a pouch no waking
ever looked at again — the collection grew and the build did not, which
is the opposite of what art. 86 claims. The fix: the pouch is ordered,
the hand is its first `handSize`, and everything past that is a
**spare** — owned, kept between runs, not in play. Taking a die with the
hand full asks which one it replaces, and the exchange is a straight swap
of positions. Nothing is destroyed and nothing is sold; the pouch is the
collection and a swap only moves things inside it. Because the order *is*
the hand, the six you chose are still the six you wake with, for free.

Under the thumb it is staged the way a claim already is (arts 68, 72):
tap the die that leaves, tap the spare that takes its place, press
**Swap**. No new interaction type enters the game (art. 76) — the tray's
dice were already tappable and selection was already a staged concept.
The hand does not move while a fight is in flight or paused behind a
door: art. 75 replays a fight off the hand it was opened with, and
re-arming between backing out and going back in would launder a card
(art. 63). A good found in that state lands the moment the fight ends.

**It does not move the survival curve, and that is the honest finding.**
Six runs, 1200 players, coin-flip doors, taking every good: without the
swap 0.226 / 0.390 / 0.493 / 0.570 / 0.617 / 0.652; with a crude
biggest-numbers chooser swapping, 0.221 / 0.393 / 0.493 / 0.558 / 0.621 /
0.647. Identical inside the noise — because the cost faces price the
bigger dice correctly, so a greedy "take the higher sum" swap buys
nothing. The swap is not a power increase; it is the difference between a
collection and a pile, and its value is a decision a simulator cannot
make.

**And the depth heals — half as lethal, not solved.** A bare player now
finishes depth one about a third of the time rather than a fifth; the
numbers and the model behind them are in Debt, below.
Art. 40 named a Sanctum and a Savior and left
what each restores to the economy; the economy is still parked, and healing
never needed it — only numbers. The ruling of 2026-08-05 sets them: **the
Sanctum restores half of missing health, the Savior all of it, and neither
charges anything.** Both are built. The Sanctum is a *place* — the font, a
room in the neutral pool with a basin bound to it, promised to every run at
step 2 or 3 whatever the drift does. The Savior is a *being* — the Mender,
which floats into any ordinary room's mercy socket, is unique per run, and
remembers you. That fills the last two rows of art. 83's straw table and
writes the first mark into art. 84's memory socket.

**And the rooms stopped wearing a screen door.** At GRID 240 on a phone —
about three device pixels to a game pixel — the box dithered four times
per pixel: light, light-accent, fog, fog-accent, each pass with the same
4×4 Bayer matrix, each between colours far enough apart that a dot read
as a dot. Layered lattices compound into a lattice, and a lattice over
every surface is a screen door rather than shading. The **ramp wave**
replaces the whole of that with one rule. Each surface gets **one ramp**
— a dark end, a light end, a step count, a bend — and a pixel resolves to
a single scalar, a position on that ramp, before any colour is chosen.
Everything that used to pick a colour now moves that scalar: the stone's
variation, the seam (a groove, so it stays a groove when the light moves
across it), the defect drop where a cell came up wrong, the pale cell's
inclusion lift, the light's lift falling off with distance, the air's
drop with z. Then **one** dither, between the two adjacent steps the
scalar falls between, thresholded against **interleaved gradient noise**
instead of Bayer — deterministic, so art. 17's identical-re-render law
holds unchanged, but scattered rather than gridded, so a half-lit surface
reads as a surface. Nothing moved: the same box (art. 15), the same
derived contours (art. 18), still no alpha and no gradient (art. 17),
still nothing in device pixels (arts 22–23). The visual bar is
`reference/castlebrynth-ramp-shading.html`.

**The knobs, named.** Per school, in `src/content/palettes.ts`: the three
**ramp ends** — the darkest and lightest tone the school already declared
for that surface, the light end carried 45% further along the same line so
the light has somewhere to lift into (along the line, not toward a pale
neutral, or the kiln stops being hot); the **step count**, 10 wall, 10
floor, 8 ceiling — under seven and the bands show, over about fourteen and
it stops reading as pixel art; the **bend**, 1.5 / 1.6 / 1.35, weighting
steps toward the dark end where this game lives; the **base**, where that
surface's commonest stone already sits on its own ramp, derived rather
than typed so every room starts exactly where it stood; and the **light**
(reach 22 world units, lift 1.9 steps, a 10% tint after quantisation) and
the **air** (the mouth's own darkness). Per depth, in
`src/content/plates/wake.ts`, the masonry's **offsets**, all in ramp
steps: seam −2.9, brick tones −1.25 / 0 / +1.1, the pale cell +2.4,
defect −2, damp −0.9, moss −1.5, and the flags' and slats' own. The
distance drop is `RENDER.fog`: nothing until 0.3 of the cutoff, nine
steps by it.

**What converted badly: nothing, and one thing.** Every school's mortar,
bricks and flagstones land within four bytes of their own ramp's line —
the fourteen palettes were in key with themselves, which is the good news
this measurement was asked for. The exceptions are **`moss`, `moss2` and
`damp`**, which were never value departures but hue ones: a green patch
on a warm wall, a blue one on a cold floor. One ramp can only spend them
as drops, so the waking corridor and the wet passage lose a little of
their green (MUTED off the line by 16 bytes, WET by 14, BRINE by 11,
SILT and VERDIGRIS by 8; every other tone in every school is under 5).
Giving those cells a short ramp of their own, or a tint after
quantisation like the light's, is a question for the wave that ratifies
the articles — not a licence to re-author a room.

One lattice survives, deliberately: **props still dither with Bayer**.
The grate's falling light in the waking corridor is the visible one. A
sprite covers tens of pixels rather than a wall, the reference plate was
authored against that matrix, and props were outside this wave.

What is still deliberately unfinished: the prose is functional
placeholder rather than the register — more of it than before — the
ordinary rooms are art. 26's first tier and not its second, and phase
0's non-goals all still hold.

### What exists
- **src/state** — the two branded ledgers and the six rituals (`wake`,
  `learn`, `meet`, `collect`, `die`, `finish`). Persistence through the `Vault`
  port: one versioned key, a browser impl and an in-memory one, every
  mutation written. Health and base armor are body stats on the permanent
  beside hand size, because arts 47 and 60 make them stats and content
  owns the numbers. The run now carries its **history graph** — the doors
  taken, in order — which is the source of truth art. 36 names: every
  room the run has dealt is the replay of it, so there is one statement
  of where the player has been and nothing that can disagree with it. It
  also carries the deeds, keyed on the instance (art. 82). The permanent
  gained `met` and a typed, empty `memories`: unique encounters respawn
  with the reseed, but meetings are knowledge, and the labyrinth
  remembers you (art. 84). A sixth ritual, `meet`, is the only way a
  meeting crosses. A seventh, `remember`, writes a mark into `memories` —
  the socket is no longer empty, because art. 40's Savior is the first
  thing with something to remember about you. An eighth, `tookIntoRun`,
  is what a good just collected does to the run already in flight: the
  die fills the slot art. 55 left open, the wearable arms you from the
  next blow. And **`load` is a migration ladder** rather than a version
  check — `MIGRATIONS` walks a snapshot from whatever version it says it
  is up to `VAULT_VERSION`, keeping the permanent and dropping the run
  (which art. 36 makes unreplayable across schemas), and anything it
  cannot walk is copied to `castlebrynth.quarantine` and left alone.
  (arts 11, 36, 40, 47, 55–56, 60, 82, 84, 86)
- **src/gen** — the drift, behind the three signatures the shell always
  knew: `deal`, `isWinnable`, `explainWinnability`. `deal` now takes the
  run's choice history and returns the history graph replayed — every
  room dealt, in order, and the doors in front of the last one, and
  nothing further. `lot.ts` folds seed, depth, step and the choices
  upstream of a decision into that decision's lot, which is what makes
  the replay exact and the road not taken uncomputable. `drift.ts` is the
  tally, the pools, and the forced lock. Room choice is a weighted draw
  under pressures — depth tendencies, the fight band, the guarantees, the
  adjacency bans, the no-clump penalty — none of which solve anything.
  They lean, and whether they held is asked of a thousand runs.
  One thing in the dealer does not lean: a `MercyPlan` is a room type the
  depth *owes* inside a band of steps, dealt out of the neutral pool with
  the chance rising to certainty at the band's last step. It is art. 80's
  just-in-time key in the shape of a room, and it is why every run holds a
  Sanctum however the drift is steered (arts 31–40, 77–83).
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
  engine. Two of the drift's articles land here because both are about a
  room under the thumb: art. 82's template/instance split, so what you
  took *here* is gone from here and not from every copy; and art. 83's
  socket composition, where a room's own words are laid end to end with
  the words each socket brought with it. `chooseDoor` hands back the run
  *and* the chain, because under art. 79 committing a door is what deals
  the room behind it. Art. 40's mercies land here too, as `breathOf`: an
  act may declare a *share of what is missing* it gives back, and the
  engine spends it rounded the player's way and never past the maximum.
  Once-per-instance is now the engine's law rather than the tray's — a
  deed already written refuses a second pressing — and a mercy that would
  restore nothing is not spent at all, so pressing a verb on a whole body
  never costs you the verb. (arts 3, 5–9, 29, 40, 70, 79, 82–83)
- **src/hinge** — the fight-door, the staged advance as a prop painted
  into the same box, the four exits, death routing, and the two laws
  about a fight's place in a *run*: `saveFight`/`restoreFight` (art. 75)
  and `routeFlight` as a pause rather than a discard (art. 63).
  `turnLot` derives each casting's lot from seed, step, turn and casting
  number, which is what lets a turn be replayed instead of stored.
  (arts 28, 30, 32, 63, 75)
- **src/room** — the box of `reference/castlebrynth-wake-v3.html` with the
  shading of `reference/castlebrynth-ramp-shading.html`: the geometry, the
  contours and the mouth are v3's, and what colour a surface takes is the
  ramp's. `ramp.ts` builds a ramp and says where a tone already sits on
  one; `dither.ts` gained `ign`, the scattered noise the box thresholds
  against; a `Look` — palette, ramps, light, air — is what a scene now
  declares, and a `SurfaceShaders` answers a step rather than a colour.
  Also `WorldMark`/`markRect`, so the region that answers a tap on a thing
  is derived from the same world coordinates the thing is painted at
  (arts 19, 68), and `overpaint`, so a motion can be laid over a cast box
  without casting it again.
- **src/content** — fourteen hand-authored rooms, each with its own
  school and its own signature prop: two fixed anchors, three in the
  neutral pool, and three each in the drowned, the burnt and the
  ossuary. Every room declares the same three sockets — a far one that
  takes teeth, a floor one that takes what can be picked up, and a mercy
  one that takes what is offered rather than taken — and no room's prose
  or pixels assume what fills any of them. Five encounters ship
  against art. 83's two axes: the Gnawing floats and repeats freely; the
  Marrow floats, is unique per run, and wakes only when the ossuary
  locks; the iron key floats and is placed by the dealer alone; the basin
  is **bound** to the font, which is what makes the Sanctum a place; and
  the Mender floats, is rare, is unique per run, and **remembers**, which
  is what makes the Savior a being. The
  Gnawing at the demo's numbers, the demo's five goods, the ladder, the
  reference fight's kit, and every player-facing string. The voice lint runs in two categories — prose owes the whole
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
| `lots.floor` | all 7776 hands of five leave a line to claim, and a shape above the floor: a pair or a run of 3, tight at ×2; the three lines a hand of five can never reach (arts 46, 48, 55, 63, 64) |
| `lots.invariants` | a die never twice, a line never twice, damage floors, the recast odds |
| `lots.fairness` | a bare five-die player beats the Gnawing rarely and not never; a found bone moves that past a coin flip, and moves it further than the Rusted Plate does (arts 33, 55, 86) |
| `lots.fight` | `reference/the-gnawing-fight.md`, turn for turn |
| `gen` | the dealer run by run: lazy dealing, one-to-three doors, the instance, the prefix property, winnability by construction (arts 31, 33, 36, 79–82) |
| `gen.drift` | 1000 runs per policy: every run locks and announces, a committed policy locks its own region, a coin flip still arrives, the fight band, the bans, the repeats, the tendencies (arts 31, 36–39, 77–78, 82) |
| `encounters` | binding and scope on every encounter, the room that never speaks for its sockets, unique-per-run, the region that wakes one, and the meeting that survives death and a reload (arts 78, 83–84) |
| `mercy` | the two tiers: half of missing rounded the player's way over every health-and-maximum pair, all of it for the Savior, no overheal and nothing for a whole body; once per instance and still offered by the next instance; the Sanctum in every run of every policy over 7000 runs, inside its band and before the lock — with the control that deals none the moment the promise is switched off; the Mender rare, unique per run, met and remembered through death and reload (arts 40, 70, 77–78, 82–84) |
| `state` | kill the process, restore exactly; the ledgers never mix (arts 11, 36) |
| `descent` | candles, taps, doors, forward only, the candle written down (arts 5–9, 29, 36) |
| `hinge` | the fight-door, the four exits, wounds carried out (art. 30) |
| `death` | the run burns and the permanent survives a reload (arts 11, 32) |
| `room` | byte-identical renders, the GRID dial, the mouth (arts 13–18, 22–23) |
| `room.scene` | a look and a prop per room, ramps that only ever dither between adjacent steps, distinct pixels, the name in the first candle, the taken key gone, the opened door open (arts 17, 19, 21, 34, 70) |
| `fight.persist` | the round trip at every point in a turn over 30 seeds, and the card that flight can never refresh (arts 63, 75) |
| `descent.required` | the key unbound from rooms, placed once and before its lock across 7000 runs of adversarial policies; no legal walk reaches the lock keyless — with the control that proves the law is doing the work (arts 3, 4, 9, 80) |
| `travelers` | three travelers on both of art. 83's axes, each die shaped like its death, every face 1–6, the catalog priced against the plain bone with the Orphan as the die that fails it, cost faces firing only when spent and never eaten by armor, an origin sentence per good linted as prose, the signature named by the first bone and the slot filled the moment it is taken (arts 50–51, 54–56, 60, 86–87) |
| `goods` | the Sisters, the cord and the plate placed through the registry, the halves banded apart across 400 runs, no good dealt twice, a seeded run that meets a traveler and walks out with three goods, builds that differ run to run; and the fork — both goods in one socket, the terms said first and once, two verbs the thumb can tell apart, taking one closing the other irrevocably and showing the loss in the scene (arts 52–53, 70, 83, 89) |
| `swap` | the hand as a chosen six: five bones and one free slot, the first find filling it and asking nothing, the second going spare, the exchange both ways round and reversible, the pouch whole across it, a chosen hand carried through a death by the order alone, and the hand refusing to move while a fight is paused (arts 55, 60, 63, 86) |
| `walkthrough` | the wave's acceptance walk end to end: five dice and an empty slot, a traveler met, their die taken and signed and slotted, a tap that answers with the distribution *and* the origin, a fork that closes what you leave, and a death that keeps both the die and the meeting — through the vault (arts 11, 32, 54–56, 84, 86–87, 89) |
| `vault` | a v1 snapshot with two Book lines loading clean at version 3; the ladder with no gap in it; a current snapshot untouched; and quarantine rather than destruction for unreadable bytes, an unknown version, a newer build's snapshot, and a step that refuses (art. 11) |
| `content.voice` | every player-facing string, in its category — origins included; every control against art. 66 |

### Debt
Named, not hidden. Each of these is a task, not an accident.

- **~~The dealer is dumb.~~** Closed by this wave. The drift replaced it:
  one to three doors per room, hidden region tags, lazy dealing, the
  forced lock, keys placed just in time, template and instance, sockets
  and encounters. `Grammar` and `DepthPlan` are honoured in full.
- **New: the drift's knobs are all in content, and one depth uses them.**
  Everything the drift can be tuned by lives in `src/content/rooms.ts`
  and nowhere else. Per depth (`DEPTH_ONE`): `length` (9 rooms, art. 81),
  `lockAt` (4 doors, art. 78), the `regions` and what is in each pool,
  the `neutral` pool, the `tendencies` per room type (art. 39), and the
  `locks` the depth is committed to (art. 80). Across depths (`GRAMMAR`):
  `doorWeights` (art. 31), `fightBand`, `adjacencyBans` and `guarantees`
  (art. 38), `clumpPenalty` (art. 82), `driftPull` — how hard the tally
  leans the pools (art. 77) — and `bandPull`, how hard an unmet band
  pulls back. Per room: each socket's `chance`. Turning any of them needs
  no engine change, and the distributional suite is how you find out what
  you did.
- **New: a door says nothing, and that may be too little.** Door senses
  are gone: art. 31 parked them with the hint system, and art. 77 notes
  that a sense is simply a region tag leaking. So a door answers a tap
  with one line that is true and carries no information. Art. 69 is
  satisfied and art. 77 is protected, but a crossroads of three
  indistinguishable doors is a thinner moment than the old sensed door
  was. Whether the drift wants a partial, unreliable, or earned leak —
  and what it costs — is the hint system's wave, and a design question.
- **New: only one depth exists, so art. 39 is half-exercised.** Depth
  tendencies are per depth by construction, and the tests show that
  moving them moves the distribution. But "shallow leans quiet, deep
  leans toward teeth" is a claim about *two* depths, and there is one.
- **~~The boon socket is never filled of the dealer's own accord.~~**
  Closed by the travelers wave. The floor socket fills at `FLOOR_CHANCE`
  (0.34) with whichever good the weights draw, and eight goods are on
  offer against art. 80's key, which still fills it first because a lock
  is owed and a bone never is. What is still open on that socket is
  art. 4's *fleeting* treasure: a good on the floor waits as long as you
  do, and nothing yet opens a window and closes it. That wants the
  economy, or a ruling that a window is a socket's business.
- **New: rarity is one number per encounter, and it is doing two jobs.**
  `RARITY` bands the goods against each other — common for a traveler,
  uncommon for the plate and the cord, rare for a Sister — and
  `FLOOR_CHANCE` decides whether the socket fills at all. Between them a
  run averages one or two finds. But `weight` is a *relative* number, so
  as goods are added every existing good gets rarer without anyone
  choosing that; and once a good is placed it is out of the pool for the
  run, so the last good in a long run is far likelier than the first.
  Neither is wrong yet at eight goods. Both will be at thirty, and the
  fix is a ruling about what rarity means, not a number.
- **~~A schema change eats every Book of Ends.~~** Closed. `load` used to
  answer an unknown version with `return null`, and the next `save` wrote
  over the bytes it had just refused — so the next time the ledger's
  shape moved, every Book in existence went with it. There is a ladder
  now (`MIGRATIONS`, 1→2→3), the run is dropped because art. 36 makes an
  old one unreplayable, the permanent is carried forward, and anything
  the ladder cannot walk — bad bytes, an unknown version, a snapshot from
  a *newer* build, a step that refuses — is copied to
  `castlebrynth.quarantine` and left alone. Only the first casualty is
  kept, so a later boot cannot overwrite the interesting bytes.
- **New: the ladder has no reader for what it quarantines.** Nothing in
  the game shows a quarantined snapshot, offers to retry it against a
  later build, or tells the player it exists. That is deliberate for now
  — the point was to stop destroying it — but "we kept your Book
  somewhere you cannot see" is only half a promise kept.
- **New: a cost face can kill you on a turn you won.** A `wound` rider
  fires with the claims, which is where art. 51 puts riders, and the
  demo's order returns `won` before your health is checked — so a killing
  blow is not also a killing blow taken, cost face included. That is
  consistent and it is generous, and it is also the kind of thing a
  player will find and either love or call a bug. No article covers the
  order; art. 61's "never kills outright" is about ambush QTEs, not about
  a price you chose to pay.
- **~~A full hand cannot be chosen, only grown.~~** Closed by the swap
  ruling. The hand is a chosen six: spares show in the tray, a tap stages
  each half of the exchange, and `Swap` commits it. What is *not* closed
  is the shape of the choice — there is one chooser (the tray) and it
  offers no help at all: no sorting, no comparison, no "this is what you
  would give up" beyond the two declared truths a tap answers with. At
  eight goods that is fine. At thirty it is a spreadsheet.
- **~~The spare row has no ceiling.~~** Closed by moving the choice to
  its own screen. The place that has to show everything you own is no
  longer a strip in the tray, and the POUCH panel is informative rather
  than a working surface. What is still true is that a pouch of thirty
  is thirty slots to read on the choosing screen — but a screen can
  scroll, sort and group, and a tray strip could not.
- **New: the forks are rare and nobody chose how rare.** A fork forms
  only when both of its goods are still free to be dealt, so how often a
  player meets one falls out of `FLOOR_CHANCE`, the weights, and where
  the road went. Art. 89 says a fork is the cheapest lever for making a
  room a decision; a lever whose frequency is an accident of three other
  numbers is not being pulled on purpose.
- **New: the neutral pool holds no lair.** A consequence rather than a
  decision: it caps how far a tendency change can move the mix, because a
  run's pre-lock rooms may come from a pool the change cannot reach.
  Whether the neutral pool should mirror the regions' shape or stay
  deliberately quiet is a content question nobody has ruled on.
- **A whole depth is still hard to survive — but half as hard.** Reduced,
  not closed. Art. 40 is ruled and both its tiers are built, so a depth is
  no longer a one-way ratchet down: **every** run holds one Sanctum, at
  step 2 or 3, restoring half of what is missing for free; and about a
  fifth of runs also hold the Savior, restoring all of it. Against the
  drift's ~2.5 fights a run that is roughly one fight's worth of body
  handed back, guaranteed, plus a rarer full reset.

  **Measured, so the claim is not a feeling.** A bare-pouch player who
  keeps the biggest set, recasts, and then claims greedily — the same
  model `lots.fairness` uses for one fight, run over a whole depth for
  2000 seeds under three door policies — finishes depth one:

  | | before this wave | font dealt, breath refused | after |
  | --- | --- | --- | --- |
  | first door | 0.195 | 0.246 | 0.355 |
  | last door | 0.191 | 0.239 | 0.357 |
  | coin flip | 0.199 | 0.245 | 0.359 |

  **Then the travelers wave took a die away, and the numbers moved
  again.** The same model, the same 2000 seeds, the same three policies,
  now against a bare hand of five (arts 55, 60):

  | | before the mercies | after the mercies | five dice, walking past every good | five dice, taking every good |
  | --- | --- | --- | --- | --- |
  | first door | 0.195 | 0.355 | 0.090 | 0.247 |
  | last door | 0.191 | 0.357 | 0.086 | 0.243 |
  | coin flip | 0.199 | 0.359 | 0.085 | 0.236 |

  Say that plainly too: **removing one die cut survival by about three
  quarters**, and the goods put back about two thirds of what it cost. A
  single fight tells the same story — a bare player's win rate against
  the Gnawing falls from ~0.78 to ~0.28, and one found bone takes it back
  over 0.5, which is more than the Rusted Plate does. Three lines of the
  ladder (the straight, three pairs, two triples) leave a bare hand's
  reach entirely, and only a sixth die opens them again.

  **That is the progression, not a regression.** The point of a five-die
  start is that the sixth is somebody's, so the number to look at is not
  one run but the chain of them. The same model, 1500 players, six runs
  each, coin-flip doors, keeping whatever it finds:

  | run | mean hand | finished depth one |
  | --- | --- | --- |
  | 1 | 5.00 | 0.216 |
  | 2 | 5.47 | 0.371 |
  | 3 | 5.73 | 0.456 |
  | 4 | 5.87 | 0.547 |
  | 5 | 5.93 | 0.575 |
  | 6 | 5.96 | 0.605 |

  Before this wave that column was 0.357 on run one and 0.357 forever.
  Now the first waking is expected to die, the third run matches what
  every run used to be, and the sixth is comfortably ahead of it. Death
  became the progression system in the arithmetic and not only in the
  pitch — which is what the wave was for, and is also the thing to watch:
  if run one reads as unfair rather than as the beginning, the number to
  turn is the Gnawing's, not the hand's.

  So: **survival roughly doubles, and a depth is still lost more often
  than it is won.** Say it plainly — this did not make depth one
  survivable, it made it survivable *sometimes*. About a third of the
  gain is not the mercy at all but the font displacing a room that could
  have had teeth in it; the breath itself is the other two thirds.

  And that is the number for a player who claims *well*. Driving the real
  shell in a browser with a crude thumb — biggest set, then the first
  claim that is offered — finished one run in eighteen. The gap between
  0.36 and 0.06 is the duel's skill ceiling, not the depth's, and it is
  the strongest argument on this list that the fights are where the
  difficulty actually lives.

  What this wave is **not** is a solved economy. The breath lands early
  by construction (the band is fenced by art. 78 — see the knobs below),
  so a run that takes its fights late still spends the back half of the
  depth on whatever it has left, and there is nothing to carry, buy or
  drink between the font and the door. The Loot stream is the other half
  of that answer and this wave was not asked to be it. If one more knob
  had to move first, it is the Savior's rarity or a second mercy band —
  both content, neither ruled.
- **New: three mercy knobs, and one of them is fenced by another law.**
  All three live in content. `SANCTUM_BREATH` (0.5) and `SAVIOR_MERCY`
  (1) are the two shares in `src/content/encounters.ts`; `SAVIOR_CHANCE`
  (0.04 per ordinary room's mercy socket, ≈ a fifth of runs) is the
  Savior's whole rarity; and `DEPTH_ONE.mercies` is the Sanctum's
  guarantee — one entry, `{type: 'sanctum', band: [2, 3]}`. The band's
  upper end is not taste: the font is in the *neutral* pool so that no
  lean of the drift can steer a run away from it, and art. 78 hands every
  room from `lockAt` down to the locked region — so a neutral room can
  only be dealt at steps 1–3, and the guarantee sits at the back of that
  window. Wanting the breath later in the depth means moving `lockAt`,
  which is a drift question, or putting a Sanctum in every region's pool,
  which is a different ruling. Neither was this task's to make.
- **Still no design pass.** The shell is now legible, which is law; it is
  not styled, which is not. arts 26–30's second tier is unspent: the
  ordinary rooms are the computed box plus basic sprites, there are no
  hero plates, and art. 28's idle patches do not exist. `index.html`'s
  CSS is anatomy and four dice states, not a look. The design-agent
  consult is still owed.
- **Placeholder prose, and more of it.** `src/content/prose.ts` is
  functional second person, not the register — and this wave more than
  doubled it: seven new rooms, three arrival lines (art. 78), three
  socket beats (art. 83), and the line a blind door answers with. Content
  review is voice review, and the lint passes — but passing the lint is
  not being in register. The arrivals are the most exposed of these: an
  arrival is the payoff of a whole depth of committing, and it is
  currently one flat sentence.
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
- **New: at the Warden's door, the lock covers the door's tap region.**
  Found by walking the real app. Art. 69 puts the small thing on the
  large thing it is part of, so `warden.lock` is laid over `warden.door`
  — and a single door is centred on the same mark, so the middle of the
  one door in that room answers "the lock" rather than picking the door.
  Nothing is unreachable: `Descend` is in the act strip, the door is
  already the chosen one, and the door's edge still answers. It predates
  the drift, and a corridor moment being a single centred door makes it
  easier to meet.
- **The trail is PARKED.** Art. 85 says the run's history graph could
  someday be shown as where you have been, and that showing it still
  requires an amendment. The graph now exists and is trivially
  renderable, which makes the temptation worse rather than better. There
  is a board task saying do not pick it up.
- **`end.kept` is unreachable.** Art. 3 now refuses the door rather
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
- **The whiff guarantee is unstated law, and the hand it was about is a
  die smaller.** Art. 46 says nothing about a hand of any size. Pigeonhole
  is still true of the dice and `lots.floor.test.ts` states what it is now
  true *of*: five dice always leave a pair or a run of 3, tight at ×2
  (witness 1-1-2-3-5), where six always left a pair or the straight. It is
  still the card and not the values that can leave a turn with nothing to
  claim. What is genuinely new and unwritten in the law: **three lines of
  the ladder cannot be claimed by a bare hand at all** — the straight,
  three pairs, two triples — so a first-run player sees three lines on the
  card that are not for them yet. That reads as a promise if it is
  deliberate and as a bug if it is not, and no article says which.
- **Art. 19's paint order.** Unchanged and still open: the reference lays
  the traveler over a light shaft standing nearer than it, `far2near`
  reports the plate as out of order, and the law does not say whether a
  light is a sprite or atmosphere.
- **The Warden is a door, not a being.** Art. 37 names the Warden's door as
  the anchor that ends a depth; nothing says what the Warden is.
- **Ladder modifiers are read as one multiplier per tier, and now one
  ships.** Art. 53 names the species and says "a tier higher" without
  saying what a tier is worth. The counting cord is the first content to
  exercise it: `+1` to the multiplier on the three run lines, declared on
  the talisman rather than assumed. That makes the engine's reading
  load-bearing rather than hypothetical, and the article still does not
  say it is right.

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
