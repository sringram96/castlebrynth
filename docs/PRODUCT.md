# PRODUCT.md

What Castlebrynth is, and what is in the vertical slice. Read this first.
Read time: five minutes.

## The pitch

> Castlebrynth is a portrait pixel-horror roguelike where you descend through
> hand-authored rooms carrying a pile of thirty bones. In a fight you throw up
> to six at a time, hold and reroll them into Yahtzee-like hands, and turn the
> total of the dice through the hand's multiplier into damage. Every named hand
> can be spent once per fight. If the thing survives, it breaks a fixed number
> of your bones. As the pile gets thin, so does your hand.

The whole of the fight is four sentences. **The numbers are my power. The
pattern makes that power hit harder. Each good pattern goes once. If it
survives, I know exactly what it costs me.** Everything else in the system
exists to make those four legible.

## The run is a reel

**Ratified, and it is the frame everything else hangs on.** A descent is an
authored reel — Dragon's Lair by way of a dice game — and it is **forward
only**: the map is a directed acyclic graph and `validateRunMap` asserts it.

The maze feeling does not come from returning. It comes from *seeing the mouths
of roads you cannot take this run*, and the unchosen branch is what the next run
is for. So the run forks, twice, and both mouths are painted in the room you are
standing in with their labels on them and what is behind them written under
them.

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
| **RESTART** | Begin a new run after death. |

There is no **SKIP**. Leaving a thing where it fell is walking to the exit
without touching it, which is what skipping always meant and now needs no
button of its own. The descent is forward only, so the thing stays behind and
the word band says so on the way through.

There is deliberately **no verb for an item die**. Item dice fire automatically
at SCORE, as a beat in the cascade; adding a press for them was explicitly
rejected. See `COMBAT.md` § Item dice.

## The slice

Thirteen rooms, three fights, one font, three worked rooms, two decision points,
one ending each way — and four reels through it.

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

**A fresh run starts with six bare bones and nothing else.** Every carried thing
in the game is now a thing that was found somewhere, which is what makes the
route the build.

Named bones are gone with the fielding step they modified. When modifiers
return — unusual dice that change Yahtzee probabilities — they will be built
for the combat that actually exists, and they will come in through the reward
screen, which is why that machinery stayed.

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
- **A third fork.** The Cleft and the Split are two decision points and the
  descent could plainly carry a third. It is **not** in this build. Adding one
  is a product decision about how much of a run should be unseen, not a
  director change, and the plan is data so it costs one edit when it is made.
- **The acyclicity assertion is written to be repealed.** Forward-only is this
  wave's law, and `cyclesIn` in `game/mapValidation.ts` plus one `problem` call
  is the whole of it. A loop wave deletes those and argues with the product,
  not with the validator.
- **Dual-purpose relics.** A found thing does one thing today. Whether a
  talisman should also, say, change what a room offers is the next design
  conversation and is deliberately not started here.
- **Two rooms are standing in a painting drawn for another one.** The Cleft and
  the Confluence reuse the Split's picture and the Offertory reuses the Choir's
  with the Reliquary's furniture in it. Recorded as owed art, gated by a list in
  `test/unit/assets.test.ts`, and not a licence for a fourth.
- **A second worked room per branch.** The right-hand branch has one worked room
  and one press-and-leave transition; the left has a fight and a transition.
  Whether the reel wants more machinery or more fights is a playtest question.
- **The dice art has not been drawn.** The bones are rendered from the pip
  geometry the game has always drawn a face with. The plates that are owed —
  a bone body with faces 1–6 and a held state, and a Vial plate — are written
  out under `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md`.

## The gate

Until every line above is green, no change may add a new collectible species,
status-effect family, persistent ledger category, screen mode, procedural
world rule, or UI panel.
