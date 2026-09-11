# PRODUCT.md

What Castlebrynth is, and what is in the vertical slice. Read this first.
Read time: five minutes.

## The pitch

> Castlebrynth is a portrait pixel-horror roguelike where you descend through
> hand-authored rooms carrying a pile of thirty bones. In a fight you throw
> **six**, hold and reroll them into Yahtzee-like hands, and turn the total of
> the dice through the hand's multiplier into damage. Every named hand can be
> spent once per fight. If the thing survives, it breaks a fixed number of your
> bones — and the pile is what you have left, never what you throw.

The whole of the fight is four sentences. **The numbers are my power. The
pattern makes that power hit harder. Each good pattern goes once. If it
survives, I know exactly what it costs me.** Everything else in the system
exists to make those four legible.

Two sentences of that pitch were stale and are corrected above: a throw is
**six, always**, and the hand does not narrow as the pile thins — `min(6,
run.bones)` was repealed when the run's progression became *replacement*. The
old wording survived here after the code stopped being true, which is the
failure mode this document exists to prevent.

## The errand

**Bone remembers.** That is the only strange thing about this place, it is
stated once on the title screen and once in the first room, and everything else
follows from it.

You came down looking for someone. The thirty bones in the pile are what you
still know — and what breaks one takes what was in it. **At zero you do not
die. You stop knowing why you came down, and you walk back to the stair.**

This is a re-reading of the machinery rather than an addition to it, and it
adds no gameplay noun, no screen and no mechanic. What it buys is that three
laws stop being assertions and start being consequences:

- **A throw is always six**, at thirty bones and at one, because the pile was
  never the ammunition. The six are casting-bones — tools, kept as a set,
  swapped one-for-one at the Carver. The thirty are what you have left to lose.
  `src/content/text.ts` has said *"bones are what I have left, not what I
  throw"* since the pile was built; the story is what that sentence means.
- **There is no way back up**, because the descent is what costs you. Going
  deeper is how you find him and going deeper is what makes you forget him,
  and that tension is the only question the run ever asks.
- **The map shows what you walked and nothing else.** *"Ahead of me: nothing I
  have seen"* is not a missing minimap. It is the affliction, on screen.

Two pieces of copy that predate the story now carry it and must not be
softened: the Font's *"never one that had a name"*, and the ending screens,
which say whether the **errand** survived rather than whether the run did.
`test/unit/copy.test.ts` § *the run says what it is for* and
`test/browser/errand.spec.ts` hold both.

Three things are deliberately unanswered, and are recorded here so that
answering one is a decision rather than a drift: **you never find him** in this
slice, **he is never named** — the narrator cannot remember, which is the
difference between eerie and confusing — and the Vial gives back somebody
else's, where the Font gives back yours.

## The run is a reel

**Ratified, and it is the frame everything else hangs on.** A descent is an
authored reel — Dragon's Lair by way of a dice game — and it is **forward
only**: the map is a directed acyclic graph and `validateRunMap` asserts it.

The maze feeling does not come from returning. It comes from *seeing the mouths
of roads you cannot take this run*, and the unchosen branch is what the next run
is for. So the run forks, twice, and both mouths are painted in the room you are
standing in with their labels on them and what is behind them written under
them.

**Amended: the castle has something you want.** For three waves everything down
there was payment — a toll, a fight, a price on a verb — and a reel whose every
room is an invoice is a reel nobody goes *looking* through. So one thing per run
is put somewhere a run has to choose to go, two lines of prose say it exists, and
nothing anywhere says where. Descending is no longer only surviving.

Choices are irreversible, and their stakes are **printed before the press**:

> **We hide places, never rules.**

A way on says what it costs and what it pays before it is taken. A room that
charges says the price on the verb before the verb charges. A found thing states
its exact mechanic where it lies. What a run does not know is what is *down the
other road*, and that is the only thing it is allowed not to know.

Two consequences worth stating outright, because they are what the wave that
ratified this actually built:

- **Movement is in the picture.** There is no GO button in the tray. Every open
  way out is a hotspot seated on the painted feature it passes through, and a
  held exit renders **nothing** — not a greyed arch.
- **Loot happens in the world.** There is no reward screen. What a fight pays
  falls beside the body; what a chest holds renders in the chest. Discover,
  reveal, inspect, decide, take, possess — all of it in the room, every time.
  Title, death and getting out remain screens, because they are framings of a
  run rather than things in it.

### The strip shows what was seen, and nothing else

A reel deserves a filmstrip, and **MAP** is it: the rooms this run has stood
in, in order, the current one bordered, and beside a junction it walked out of,
the mouths it did not take — each carrying the word that was on its hotspot.

**Ahead is void.** No sockets for rooms not reached, no count of what is left,
no silhouette of the plan. That is the hiding rule stated the other way round:
*we hide places, never rules*, and a road not walked is the one thing a run is
allowed not to know. The room being stood in shows no mouths either — its ways
out are in the picture, under the thumb, and printing them in the strip would
make a record into a plan.

It adds nothing to the save. Every frame is `run.path`, every mouth is an edge
of the map the run was built with, and the death screen prints the same strip
as the run's epitaph — the frames are the "rooms down" it already counts.

Whether the strip should one day mark **deaths across runs** is a meta
question, it needs state, and it is deliberately not this wave. See *Still
open*.

## The player verbs

Everything that ships supports one of these. If a feature cannot be explained
as support for one of them, it is out of scope.

| Verb | What it means |
| --- | --- |
| **LOOK** | Tap a visible thing in the room. Always answers. Never commits. |
| **GO** | Choose the next room. |
| **ROLL** | Throw six ordinary d6s, and the iron die with them. The first press of an attack. |
| **HOLD** | Tap a die to keep it. A draft; nothing is committed. |
| **REROLL** | Throw the unheld ones again. Twice at most. |
| **SCORE** | Commit the dice as one hand. The whole cascade, in one press. |
| **DRINK** | Spend a Vial: five bones back. |
| **TAKE** | Pick up a thing lying in the room. |
| **MAP** | Read the run back: where it has been, and the roads it left. Explore only, and it changes nothing. |
| **RESTART** | Begin a new run after death. |

There is no **SKIP**. Leaving a thing where it fell is walking to the exit
without touching it, which is what skipping always meant and now needs no
button of its own. The descent is forward only, so the thing stays behind and
the word band says so on the way through.

There is deliberately **no verb for an item die**. Item dice fire automatically
at SCORE, as a beat in the cascade; adding a press for them was explicitly
rejected. See `COMBAT.md` § Item dice.

## Three grammars

**A run is one of three descents, and the seed chooses.** They agree on almost
nothing: where the Font is, whether there is a Font at all, where the place that
sells dice sits, how many rooms the legs of the last fork carry. The one fixed law
is that the keeper and the way out are in the threshold.

| | what it is |
|---|---|
| **DESCENT** | the slice's original shape, with a room cut into each leg of the Split so the short way carries a certain thing too |
| **THE LONG WAY** | the Font **first**, before either fight, and the Bone Carver late: you are told your budget before you have spent anything, and then there is nothing to top up with |
| **THE TITHE** | **no Font at all.** Thirty bones are the whole budget and a bought die is the only way to change fate |

A **fourth** grammar is explicitly not in this build. Three is what makes a run
stop being one shape with two branches in it; a fourth is a product decision.

### Placements, and the treasure law

A plan may stand things in a room the room knows nothing about. Templates declare
**spare seats** — pre-measured places in a picture, counted against the
negative-space budget whether they are filled or not — and the generator seats
each placement into one. What is seated is then an ordinary in-world object under
the existing LOOK/TAKE contract.

Three kinds and no framework: a **chained die**, the **treasure**, and a
**hint carving**, which is prose, takes no seat, and says a thing exists without
saying where.

**The treasure law**, and all four clauses are asserted:

1. Every grammar names **two candidates**, and they are always on different
   branches of a fork.
2. Per seed, **one** of them holds the Hand of Saint Orrin; the other resolves as
   an ordinary chained bargain.
3. A treasure is **never on a spine** — some route to a way out does not pass it.
   A thing every run gets is a step, not a treasure.
4. It is **unpriced**. Its price is the road to it.

So sometimes the treasure is behind the mouth you did not take, and the strip
will show you that mouth for the rest of the run.

## The slice

Thirteen rooms per descent, three fights, two decision points, one ending each
way — and four reels through each grammar.

```
                        ┌→ hollow(FIGHT: the Gnawing) ──┐
entry → passage → cleft ┤                               ├→ confluence → sanctuary(THE FONT)
        (JUNCTION: two ways) └→ offertory(TOLL: 2 bones) ┘                        │
                                                                                  ↓
                              reliquary(OPTIONAL: bell, dark, lever → a find) ────┘
                                     │
                                     ↓
                                   fork ┬→ STAIR ────────────────────────────┐
                                        └→ DEEP                              │
                                           chain-vault(LOCKED: cage →        │
                                           plate → lever; iron in the cage) ─┤
                                                        ↓                    │
                                           deep(FIGHT: the Marrow) ──────────┤
                                                                             ↓
                                                       gate(FIGHT: the Warden)
                                                                             ↓
                                                                           exit
```

**Two decision points, and they ask different questions.**

- **The Cleft** asks *what do I want to be carrying*. Left is a fight and a
  sixty-percent draw; right is a flat two-bone toll and a certain item die.
  Route is build.
- **The Split** asks *how much health am I willing to spend*. It sits behind the
  Font on purpose: the question is only a question if the run has just been told
  what it has to spend. The deep way now certainly pays iron, and the way's own
  line says so before the press.

A third fork was considered and is **not** here. See *Still open*.

## Rooms you work

Two rooms answer a complaint that was true of every other one: *enter, look at
picture, read prose, press exit.* A room is a backdrop, ambient motion, several
concrete objects, state those objects keep, and actions with consequences.

**Several is a number now.** Every frame declares what it can hold — furniture
seated into the painting, and hotspots besides the ways out — and a breach fails
at the press of START. What that cost these three rooms was their flavour LOOKs:
a press on the bell beside the bell's own RING is two presses on one thing, and
the line it carried is still in the room, verbatim, on the arrival or on the one
LOOK that kept its place. See `docs/ART_DIRECTION.md` § *The negative-space
law*.

They are a matched set, and the pairing is the design:

- **The Reliquary is optional and free.** GO ON is on screen from the first
  frame and never leaves. Ring the bell, put out the brazier, pull the skull
  lever, and the chest opens on one thing from the reward pool. Ignore all of
  it and walk out having lost nothing. It is there to be *found*, not to be passed.
- **The Chain Vault is mandatory and costs blood.** It is the toll on the deep
  route, paid before the fight rather than during it. Drop the cage onto the
  pressure plate, then pull the lever, and the gate rises. Pull the lever
  against an unweighted plate and the mechanism takes a bone through your hand —
  as often as you have blood for it. It is the first place in the slice where a
  *room* can kill you. And the cage is holding the Rustplate, which is what
  makes the deep way a build decision rather than only a longer walk.
- **The Offertory is the vault's grammar spent a second way.** It charges two
  bones for the *correct* answer rather than one for a mistake, and it prints
  the price on the wall and on the verb before either charges — which is the
  whole difference between a toll and a trap. Put the candles out so the carving
  can be read, feed the slot, and the wall recess and the way on open together.
  Prying at the lid first costs a bone and moves nothing, as often as there is
  blood for it. It is the right-hand branch of the Cleft, and the Grave Candle
  is in the recess.

Neither is a guessing game. Every mechanical relationship is readable through
ordinary LOOK: three cuts beside the skull lever name the bell, the black flame
and the lowered jaw, in the order they have to happen; a wall panel in the vault
draws a weight falling and then a gate lifting.

Neither adds a noun. No key, no puzzle currency, no new stat, no new find, no
new bone species, no new screen mode — both rooms are `explore`, and the chest
pays out of the reward pool that already exists.

The fork is the whole of the expedition pressure: the deep way is another
fight and another reward before the boss, and bones do not come back on their
own — the Font answers once, and a Vial has to be found. That is enough to make
*do I keep going?* a real question without a second subsystem.

**The font is what makes that question answerable.** One press, one throw, and
common bones come back onto the pile — `d6 + 2` of them, three at worst and
eight at best, and never past thirty. It sits immediately before the fork on
purpose: the deep way is a gamble about how much body you have left, and a
gamble is only a decision if you know the number. Capping at the ceiling rather
than paying flat is what keeps it honest at both ends — it is worth most to a
player who has been ground down, and worth literally nothing to a player who is
whole, so there is no version of it that can be farmed.

It is deliberately the smallest room in the game: no shop, no currency, no
second shrine, no reroll. One object, one press, one number.

## The modes

Six, and each one is a screen. Every transition is an explicit action; nothing
is inferred.

| Mode | The question | Leaves by |
| --- | --- | --- |
| `title` | Do I go down? | `START_RUN`, `CONTINUE` |
| `explore` | Which way — and what do I touch? | `GO`, or a room's fight begins |
| `combat` | What can I make of these, and what will it cost? | its health empty → `explore`; my pile empty → `dead` |
| `dead` | (nothing — it is over) | `START_RUN` |
| `complete` | (nothing — you got out) | `START_RUN`, `TITLE` |

**Five, and `reward` is gone.** It is not coming back under another name: a
full-screen interruption between a kill and the corridor behind it takes the
player out of the world to hand them a thing that is lying in it. What a fight
pays is a room object with its own LOOK and its own TAKE.

## What is deliberately not here

Parked by the blueprint's §6 cut. None of it may return without playtest
evidence, and none of it may return as a general framework:

once-per-fight scoring card · seal · curse · corrode · bind · bleed · hunger ·
rolling goods and trinkets · the rider taxonomy · the bond framework ·
talismans and levels as separate species · priced exploration acts ·
permanent knowledge clues · refusal flags · the Book of Ends as state ·
procedural region lean and lock · the provable-winnability generator ·
hand-size wounds and upgrades · classes · QTE windows · merchants and currency

Four carried nouns exist for this baseline: **Vials**, **item dice**, the
**iron die** and a **talisman**. Adding a fifth is a product decision, not an
engineering one — and note what the reel wave added, which is *placement* and
not vocabulary: the iron and the talisman already existed and stopped being
starting equipment.

The crooked bones wave added **no fifth noun either**, and that is the point of
how it was built. A core die was already one of the four things a run carries; what
changed is that there are eight of them rather than one, and a core die is still
**its faces and nothing else** — no rule, no trigger, no keyword. Eight dice are
eight distributions, not eight mechanics. Likewise an enemy's one rule bends the
number it already had; it adds no status, no part to tear off and no threshold on
the player's damage.

**A fresh run starts with six bare bones and nothing else.** Every carried thing
in the game is now a thing that was found somewhere, which is what makes the
route the build.

Named bones are gone with the fielding step they modified, and what replaced them
is **not** a rider taxonomy: the crooked dice change Yahtzee probabilities and
nothing else, and they come in through the world rather than a screen — a table
that sells them, an alcove that chains one, and one treasure per run. Fights pay
item dice and Vials and never a core die, because the build is found in places and
paid for in bones.

Relics and Charms were already gone. Nothing has been invented to replace any
of them: a boring reward pool for one combat prototype is preferable to
contaminating the experiment. See `docs/COMBAT.md` § *What is not here*.

## Definition of done for the slice

- A fresh mobile browser completes the whole route without a reload.
- Every enemy is visibly present before FIGHT is offered.
- The enemy's health and its damage are both readable before ROLL is offered.
- Roll, hold, reroll, score, drink, reward, skip, navigation and death-restart
  all have passing browser tests.
- A first-time player can say what a hand multiplies by, in digits.
- Death to new run is one press, and never leaves stale combat UI.
- The active docs read in under twenty minutes.

### Still open

- **The rerolls are not optional, and the numbers say so loudly.** A simulated
  player who throws once and commits finishes the safe route 1% of the time; a
  player who uses all three throws finishes it 35% of the time. That is a
  tutorial problem rather than a depth one. See `docs/COMBAT.md` § *Balance*.
- **The Warden may now be too hard**, at 25% for the solver at a developed
  pile. Its health total and its damage figure are both first-pass values.
- **A third fork.** Each grammar has two decision points and could plainly carry
  a third. It is **not** in this build. Adding one is a product decision about how
  much of a run should be unseen, not a director change, and the plan is data so
  it costs one edit when it is made. The same is true of a **fourth grammar**,
  which is explicitly rejected by the wave that wrote the first three.
- **The Hand of Saint Orrin measures as a loss at one copy.** `1 1 1 1 6 6` has a
  lower mean than a plain bone, so the one thing a run goes out of its way for is
  worth three points *less* than the bone it replaces. It is an archetype piece in
  a game that can only ever hand you one. Reported and not tuned; the levers are
  its faces and whether a run may ever hold two, and both are product decisions.
  See `docs/COMBAT.md` § Balance.
- **Three bones may be a formality.** The sweep says always-take dominates on two
  of three grammars at thirty bones. Whether it *feels* like paying is a hand
  question, pre-registered in `POLISH_PROGRESS.md`.
- **THE LONG WAY shows the Split's painting twice.** Both of its junctions are
  chapel junctions and the Split is the only chapel junction painted, so one
  descent reuses one picture at two moments. Recorded as owed art rather than
  hidden by a content edit.
- **The acyclicity assertion is written to be repealed.** Forward-only is this
  wave's law, and `cyclesIn` in `game/mapValidation.ts` plus one `problem` call
  is the whole of it. A loop wave deletes those and argues with the product,
  not with the validator.
- **Dual-purpose relics.** A found thing does one thing today. Whether a
  talisman should also, say, change what a room offers is the next design
  conversation and is deliberately not started here.
- **Five rooms are standing in a painting drawn for another one.** The Cleft and
  the Confluence reuse the Split's picture, the Offertory and the Bone Carver reuse
  the Choir's with the Reliquary's furniture in them, and the niche reuses the Deep
  Way's with the vault's chain across it. Recorded as owed art, gated by a list in
  `test/unit/assets.test.ts`, and not a licence for a sixth. **Every one of those
  composed paintings is on that ledger whatever its budget says** — they are all
  inside the negative-space law now, and the reuse was always debt.
- **A second worked room per branch.** The right-hand branch has one worked room
  and one press-and-leave transition; the left has a fight and a transition.
  Whether the reel wants more machinery or more fights is a playtest question.
- **Should the strip mark deaths across runs?** A frame that said *this is
  where the last one ended* is the obvious next thing a filmstrip wants, and it
  is **meta state** — a ledger that survives a death — which is a product
  decision and a save change. Deliberately not this wave, which added no state
  at all. Recorded rather than smuggled in.
- **The territory cards are unpainted.** `THE OSSUARY` is type on the arrival
  beat. A painted treatment is owed and recorded under
  `POLISH_PROGRESS.md` § HUMAN ART REQUIRED; the ambient grades under them are
  measured first-pass values, reported rather than tuned.
- **An enemy's idle life.** Rooms breathe now — see `ART_DIRECTION.md`
  § *Quiet motion* — and **no ambient may be put on an enemy or run during a
  fight.** A horror already has an idle loop of authored plates, which is a
  different thing from a treatment on a room's furniture, and whether the two
  should ever meet is a design conversation rather than a cap to raise.
  Deliberately not started here.
- **Should the strip breathe?** MAP is chrome over art and under the pixel-grid
  law; whether the current frame should pulse, or a mouth should gutter, is the
  obvious next thing quiet motion wants and is the first place it would stop
  being a property of *rooms*. Recorded rather than smuggled in.
- **Two per room, or one too many?** The ambient cap is two, counting the
  territory's own, and the Offertory is the only room that spends both. Whether
  a candle *and* dust is a room breathing or a room fussing is a hand question
  and is pre-registered in `POLISH_PROGRESS.md` § The phone pass.
- **The dice art has not been drawn.** The bones are rendered from the pip
  geometry the game has always drawn a face with. The plates that are owed —
  a bone body with faces 1–6 and a held state, and a Vial plate — are written
  out under `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md`.

## The gate

Until every line above is green, no change may add a new collectible species,
status-effect family, persistent ledger category, screen mode, procedural
world rule, or UI panel.
