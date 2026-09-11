# Combat

The combat system, in full. This file is the contract: if the code and this
document disagree, one of them is a bug.

---

## The sentence

> I throw six bones and a piece of iron. I can hold what I like of the six and
> throw them again, twice. The numbers themselves are my power; the pattern
> makes that power hit harder, and my charms add a little on top. I can only
> use each good pattern once against this thing. If I can't make anything I can
> still hit it badly. If it survives, I know exactly how many bones it is going
> to break — less whatever the iron came up holding.

A player who has watched one attack should be able to say that. It is the
design test. If the implementation needs significantly more explanation than
that paragraph, simplify it before adding anything else.

---

## Life

**A run's life is a pile of bones.** Thirty of them at the start, and one
number: `run.bones`. There is no separate HP field for the player, no maximum
health, and no second life bar under another name.

The ceiling is **30** (`BONE_CEILING` in `src/content/bones.ts`). Reaching zero
ends the run.

**Bones are health, and only health.** They were once the width of the attack
as well — an attack threw `min(6, run.bones)` — and that coupling is
**repealed**. It was elegant, and it fought the ratified progression model:

> **Replacement, not growth.** The run carries six die slots. A found die
> replaces one of the six — the player chooses which — and never adds a
> seventh.

A width that shrank with the pile would spend every fight taking those slots
away again. So what a wound costs now is **exchanges**, not dice, and every
shape stays reachable at one bone.

---

## The hand

Six dice. From the first fight of a run to the last turn of the boss, at thirty
bones and at one. `HAND_DICE` in `src/combat/roll.ts` is that number, and it is
not a maximum: **nothing anywhere reads the pile to decide how many dice are in
the air**, and there is no width control, no minimum hand size and no
desperation curve.

`run.hand` is six ids from `content/dice.ts`. A fresh run's six slots all hold
the plain `bone`; the reducer's `REPLACE_DIE { slot, die }` swaps one slot for
another and cannot lengthen the array, and a slot outside `0..5` is refused.

---

## The crooked dice

**A core die is its faces and nothing else.** There is no `rule` field on one,
no trigger, no keyword, no exception anywhere in `hands.ts`, and nowhere to
write any of them. Every face is an integer one to six, asserted in content, so
the sum, the shapes, the strips and the solver all work on a crooked die
unchanged: **it changes what the throw comes up with and never what the throw
means.**

| id | name | faces | what it is for |
|---|---|---|---|
| `bone` | Bone | 1 2 3 4 5 6 | the plain one; the floor |
| `knucklebone` | Knucklebone | 1 1 2 2 6 6 | pairs and multiples |
| `long-bone` | Long Bone | 1 2 3 4 5 5 | straights |
| `saints-finger` | Saint's Finger | 2 3 3 4 4 5 | reliable middles, no sixes |
| `jawbone` | Jawbone | 1 1 1 6 6 6 | variance as a choice |
| `heavy-bone` | Heavy Bone | 2 3 4 5 6 6 | high average, no ones |
| `cracked-bone` | Cracked Bone | 1 1 4 4 4 4 | a four-of-a-kind seed |
| `hand-of-orrin` | The Hand of Saint Orrin | 1 1 1 1 6 6 | **treasure only** |

First-pass values, reported rather than tuned.

The whole mechanical footprint is `rollSlot` in `src/combat/roll.ts`: a face
index, and a lookup in that slot's own table. One draw per slot, exactly as
before, so **a hand of six plain bones replays a seed byte for byte** —
`rng.int(6)` is `rng.int(6)` whichever table it indexes.

### The laws of the hand

- **The hand is six, and nothing sits outside it.** No spare-dice inventory, no
  bag, no stash. Taking a core die means giving one up, in the same press.
- **Replacement is a beat.** Taking a core die from any source opens the
  **picker**: the six current dice shown as strips, tap one, and the swap is one
  reducer transition — `CLAIM_DIE { index, slot }`, which charges the price,
  swaps the slot and marks the seat claimed in the same tick. There is no state
  in which a run has paid and not been given the die.
- **The picker is presentation-local**, exactly as the hold draft is. Opening it
  reduces nothing; cancelling is legal and leaves the die where it lay,
  uncharged; a reload in the middle of it loses the picker and nothing else. It
  is the only place a core die is ever swapped, and it is never offered
  mid-cascade.
- **The discarded die is gone.** The say line owns it once — *I put the old one
  down. It had been with me since the stair.* — and no screen anywhere lists it.
- **Where core dice live:** the Bone Carver, a chained bargain, and the
  treasure. **Never the fight-offer pool.** Fights pay item dice and Vials; the
  build is found in places and paid for in bones, which is the route-is-build law
  extended to hand-is-build.

### The bargain law

A **bargain** is an in-world object holding **a specific core die**, with its
strip shown and its price in bones printed before the press. That is the whole
definition and it is the law: there is no field anywhere for generic power, no
percentage, no *choose one of*, and nowhere to write one. The Carver's table and
a chained alcove are the same transaction seen twice, which is why they are one
type — `DieOffer` in `src/game/map.ts`.

**A bargain is never lethal.** The pile has to be strictly bigger than the
price: at the price or under it the press is **hidden, not greyed**, and the
refusal is a sentence — *It wants three. I have three. No.* The reducer refuses
it as well, because the view's claim that a press is legal is not what makes it
legal.

The treasure is the one unpriced object in the game. It costs what it cost to
get there.

---

## The iron die

**Armour is not a stat. It is a die that rolls alongside the six.**

`run.ironDice` — at most one, `Rustplate`, faces `[0, 0, 3, 3, 5, 7]`.
First-pass values, reported rather than tuned.

**A fresh run has none.** It lies in the Chain Vault's cage, on the deep route,
and the way's own line says so before the press: *One more fight. Pay at the
gate; iron waits in the cage.* Which route a run takes is which build it gets.

- It rolls **on ROLL only**, in the same tick, with a channel of its own. It is
  never holdable and **REROLL does not touch it**: what it shows is the turn's
  terrain. *(Provisional — see* Open questions*.)*
- Its settled effect is stated in a caption **before commitment**:
  `Rustplate holds: blocks 5 this turn.` / `Rustplate came up empty.`
- Its effect is a flat block against the enemy's answer this turn:
  `answer = max(0, enemyHit − block)`.
- It contributes **nothing to the sum** and **nothing to line qualification**.

**Why it is a die.** Armour as an always-on stat made plate dominate every
loadout it appeared in. That was measured, and moving the effect onto a die
that rolls each turn fixed the dominance without nerfing the numbers. **Do not
reintroduce any always-on damage-reduction stat anywhere.**

---

## Item dice

`run.itemDice`, hard cap **two**, enforced in the reducer.

They **never appear at ROLL or REROLL and there is no verb for them, ever.**
They roll automatically at Attack as a beat in the scoring cascade. That is the
whole point: an item die is a treat that lands mid-cascade, not a decision tax.
Any design that adds a fourth press or an item reroll is explicitly rejected.

**The one press a slot has is reading it.** Tapping a filled slot — an item
die, the iron, the talisman — opens that thing's card: its name, its faces as a
strip, when it fires, and whether there is a press. It changes nothing, it
writes nothing, and it is **not offered while a cascade is running**. This is
the talisman bay's ruling extended to the rail, and it exists for the reason
the bay did: a carried thing whose faces can only be learned by watching them
happen is not a stated mechanic. It is not a decision inside a turn, and it is
not the fourth press: nothing about the attack changes when it is pressed or
when it is not.

Faces are **flat adds**, **blanks**, or **cost faces** paid in bones. There are
no multiplier faces — global and compounding multipliers were measured and
rejected — and no void faces.

First-pass content, reported rather than tuned:

| | faces |
|---|---|
| **Grave Candle** | `+3, +3, +5, +5, —, —` |
| **Splinter Fetish** | `+8, +8, —, —, −2 bones, −2 bones` |

### Costs

**A cost charges at the item beat, before the blow lands.** If a cost drops the
player to zero, **the run ends there and the blow never lands**: the enemy is
untouched, and the line is not written into `usedHands` because it was never
played. A cost is a cost.

This is deliberate, it is asserted in both suites, and it is revisable later.
It is recorded in *Open questions*.

### Balance never assumes them

No gate, target or enemy number may require an item die. The balance model
cannot even see them — they have not been thrown when a decision is due — so
whatever they add is upside on top of every figure the report prints.

---

## Talismans

A talisman names a line, or a small family of lines, and adds a flat `+N` when
that line is the one scored. **Flat, never a multiplier.** Optional upside,
never a gate.

First-pass content: **Talisman of the Pair** — `+12` when PAIR or TWO PAIR is
the scored line. **A fresh run has none**; it is in the Reliquary's chest, which
is what makes the optional room worth working rather than worth walking past.

---

## The attack

```
FIGHT
  |
  v
dice = []                    nothing on the table
  |
  | ROLL                     throw six ordinary d6s, and the iron with them
  v
dice, rollsUsed = 1          may SCORE, or hold and REROLL
  |
  | REROLL { held }          held dice stay; the rest are thrown.
  v                          the iron does not move
dice, rollsUsed = 2          the same choice again
  |
  | REROLL { held }
  v
dice, rollsUsed = 3          must SCORE
  |
  | SCORE { hand }           the whole cascade, in one tick
  v
dice = [], rollsUsed = 0     the next attack, one round on
```

**There is no phase field.** The position is derivable from the dice and the
count of throws, and saying it twice is how two fields come to disagree:

```
dice.length === 0                     → waiting for ROLL
dice.length > 0 && rollsUsed < 3      → may SCORE or REROLL
dice.length > 0 && rollsUsed === 3    → must SCORE
```

### Holds

After a throw, tapping a die toggles whether it is held. Held dice keep both
their face and their position; everything else is thrown. The iron die is not
in this at all.

A hold is a **presentation-local draft**. It is not in `GameState`, it does not
survive a reload, and it reaches the reducer once, whole, as
`REROLL { held: number[] }`. The reducer canonicalises the list — unique,
whole, in range, sorted — so a stale index, a repeat, a negative or a fraction
all reduce to the same answer. A reload may forget which dice were lit; it must
not forget the faces, the iron, or the throws already spent.

A REROLL with **everything** held is refused rather than charged.

---

## The scorecard

The dice say two things at once, and the interesting decision is that they are
not the same thing:

- **they add up.** Every core die on the table counts, including the ones that
  took no part in the pattern.
- **they make a shape.** The shape supplies exactly one multiplier.

| hand | multiplier | what it takes |
|---|---|---|
| **CRAP** | ×0.50 | the fallback. Not a category. |
| **PAIR** | ×1.00 | two dice alike |
| **TWO PAIR** | ×1.25 | two different faces, twice each |
| **TRIPLE** | ×1.50 | three dice alike |
| **STRAIGHT** | ×1.75 | five distinct consecutive faces: 1–5 or 2–6 |
| **FULL HOUSE** | ×2.00 | three of one face and two of a *different* one |
| **FOUR** | ×2.50 | four dice alike |
| **FIVE** | ×3.00 | five dice alike |
| **SIX** | ×4.00 | all six alike |

These multipliers are **provisional tuning values**, not product law. They live
in exactly one place — `HAND_DEFINITIONS` in `src/combat/hands.ts` — and every
other part of the game reads them from there. **A multiplier written down twice
is a multiplier that will disagree with itself**, and the same rule now covers
an item die's faces and a talisman's bonus: `content/dice.ts` is the one table,
and the reward card, the menu and the cascade all read it.

**And the card now draws them rather than describing them.** A carried thing's
card shows its six faces as a strip of chips — `+3 +3 +5 +5 · ·` — derived from
that same `faces` table by `content/faces.ts`, everywhere the thing is read:
the loot card where it lies, the tray slot inspection, the menu. A die authored
later gets a strip for free, and a rule string can no longer disagree with the
table beside it. What the prose carries is the two things a row of chips cannot
say: **when the thing fires**, and **whether there is a press**.

### A roll can be several hands at once

`5 5 5 2 2 4` is a Pair *and* a Two Pair *and* a Triple *and* a Full House. The
player chooses which one to spend, and **only the chosen one is consumed**.

A larger group satisfies a smaller one: four alike is also a triple and also a
pair. Two edges worth stating outright:

- `3 3 3 3 5 5` **is** a Full House. Four threes contain three, and the fives
  are the distinct pair.
- `3 3 3 3 3 1` **is not**. There is a triple, but no second face appears twice.

### One use per fight

`combat.usedHands` belongs to the fight and resets when a new one begins. It
never persists across the run.

A named hand is consumed **only when the player deliberately scores it**. There
is no scratching, no burning and no forced zero. A bad roll costs a throw and
nothing else. (A line whose blow never landed — see *Costs* — is not consumed
either.)

### CRAP is a fallback, not a hand to burn

```
const named = unusedNamedHandsThatMatch(dice)
return named.length > 0 ? named : ['crap']
```

CRAP appears **only** when no unspent named hand qualifies, and never alongside
one. It is never written into `usedHands`, so it can never run out.

---

## The equation

```
damage = max(1, floor(sum6 × mult) + itemFlats + talismanFlat)
```

One multiplier, applied to the six core dice and to nothing else. **Everything
the loadout contributes is flat, and added after the multiply.** The iron
contributes nothing to it at all. There is no crit, no accuracy roll, no hidden
modifier and no compounding anything — `src/combat/loadout.ts` is where this
lives and there is nowhere in it to express a global multiplier.

And the answer:

```
answer = max(0, enemyHit − block)
```

---

## The cascade

`SCORE` settles all of it in one tick. The only draw in it is the item dice.
The presentation then reveals that record, **in this order**, and the browser
suite asserts the order rather than the end state:

1. **the core dice pop their values**, each on itself;
2. **the readout resolves `sum × line`** — before anything is added to it;
3. **the item dice fire**: flats add, and costs charge. *The lethal check is
   here.* If the pile empties, the run ends and nothing below happens;
4. **the talisman fires**, if its line matched;
5. **the total lands on the enemy**, floored at zero;
6. **the enemy answers** — its fixed hit less the iron's block — **unless it is
   dead. A dead enemy never answers**, however thin the pile is;
7. if the pile reaches zero, the run ends;
8. otherwise the next attack begins immediately, with a clear table and the
   iron waiting to be thrown again.

There is no ROUND button. The score *is* the commitment.

### Victory

Reaching zero health with an authored death parks the fight on
`combat.defeated` and plays it; `DEFEAT_DONE` is the single transition out and
grants the win. An enemy with no authored death settles the victory
immediately. Both paths draw from the same generator position, so a death that
is watched and one that is skipped pay identically, and neither can pay twice.

---

## The readout — numbers pop on the thing that made them

The scoring presentation was iterated three times and **v3 won**. The two
rejected versions are rejected permanently:

- **v1 — fly-away numbers migrating to an aggregate.** Rejected.
- **v2 — a persistent receipt/spreadsheet region.** Rejected.

Feedback stays **spatially grounded on its source**:

- **One running readout** of `sum × line`, resolving through the cascade to
  `sum × line + flats = total`. It is the **only aggregate on screen**.
- Each core die pops its own value **on itself**.
- Item results fire **on the item die**, carrying **the die's own name**:
  `GRAVE CANDLE +5`, `SPLINTER FETISH −2`. Every attack, not only the first —
  repetition is how a face gets welded to the card that stated it, and a number
  over an unlabelled object is a number whose cause has to be memorised. The
  name is on the source; nothing migrates to an aggregate.
- The talisman's flat fires **on the talisman**, named the same way.
- The enemy's loss lands **on the enemy**.
- Costs land **on the player's health**.
- Captions under the iron state what it is holding **before commitment**.

The reducer settled every one of those numbers before a frame of the cascade
ran. `paintCascade` in `src/ui/trayView.ts` reveals them; it derives nothing and
decides nothing, and with `?motion=0` or `prefers-reduced-motion` there are no
beats at all and the settled screen states every one of them as text.

**Where the caption actually sits.** The plate was painted with six die bays.
The iron sits at the left of the same rail and the item dice at the right, and
the caption is the first line of the well rather than literally under the die —
the plate gives a 32 px bay no room for a sentence. A painted bay and a caption
plinth are owed; see `POLISH_PROGRESS.md` § HUMAN ART REQUIRED — the loadout.
**No art was authored for this wave.**

---

## The enemy

An enemy has a health total, **one rule that bends the throw**, and a reward
table. **It rolls nothing.**

| | HP | breaks | pays | drops |
|---|---|---|---|---|
| **The Gnawing** | 70 | FAR 2 · MID 4 · CLOSE 8 | 60%, 1 card | — |
| **The Marrow** | 120 | 5 → at 80: 4 → at 40: 3 | 70%, 1 card | 1 Vial, always |
| **The Warden** | 180 | 8, and 12 for a CRAP | nothing | — |

Every one of those numbers is on screen from the first frame of the fight and
none of them is hidden until it lands. The iron die does not change what a thing
swings; it stands in front of it, and the caption says by how much before
anything is committed.

### One rule each, and `breakFor` is the only authority

Three enemies used to be three difficulty settings for one puzzle: the same
attack, the same decision, at 70, 120 and 180 health. Each of them now asks a
different question, and **not one new noun was added to the game** to do it.

- **The Gnawing — the staging stops being cosmetic.** The three painted stances
  were a picture of a fight getting worse and cost nothing; now the picture *is*
  the rule. Same three drawings, same round counter, and the first monster in the
  game is the one that makes you hurry.
- **The Marrow — wound it and it breaks less.** Deliberately the *inverse* of the
  Gnawing's and deliberately the same concept, so a player comes away holding one
  word rather than two: *a thing's number is a ladder, and the ladder is printed
  before the fight.* One climbs as the fight lasts; one falls as the thing does.
- **The Warden — the door examines the build.** The one rule that reads the
  *hand* rather than the fight. A build that keeps making named lines walks
  through; a hand that has run out of lines late is punished exactly where this
  document always said the story lives. CRAP's infinite availability is
  untouched — it is still never spent and still always there — and what changed
  is what leaning on it costs at the door.

`breakFor(enemy, combat, line?)` in `content/enemies.ts` is a pure function over
the fight and the line just committed, and it is the **only** place in the
codebase that may compute what an enemy breaks. The reducer commits the answer
through it, the tray's number derives from it on every paint, the card's chips are
drawn off the same ladder, and the balance harness reads it — so the number on
the screen and the number that takes your bones cannot disagree.

`line` is `undefined` wherever no line has been scored yet, which is every paint
before a SCORE, and a `line` ladder reads as its ordinary rung there. That is
exactly what the Warden's card promises in capitals.

**A ladder is drawn, never described.** `ladderChips` in `content/faces.ts`
extends the strip system rather than inventing a second one: a ladder is the same
kind of statement a die's faces are, so it is the same chips in the same
component from the same shape of data. A ladder written once as chips and once as
a sentence is a ladder that will disagree with itself.

No thresholds on the player's damage, no part-tearing, no status vocabulary. A
rule that needs a new noun is not one of these three, and a new gameplay noun is
a product decision.

---

## Recovery

**The Font** — one press, once per run. `d6 + 2` bones, capped by the room left
under the ceiling.

**A Vial** — a satchel consumable. Five bones, capped the same way. Legal in
`explore` and in a live fight; not over a death, and not at a full pile. It
buys **exchanges**, not dice: the hand was already six.

**A bone-denominated cost** — the Chain Vault's backlash, and an item die's
cost face — takes bones out of the pile and can end a run.

---

## Loot

**A fresh run carries six bare bones and nothing else.** `STARTING_BONES` is
thirty and `STARTING_IRON` and `STARTING_TALISMANS` are empty. Every carried
thing in the game is a thing that was found somewhere, which is what makes a
route a build choice rather than a walk.

Four nouns, and none of them is new — what changed is **placement**:

| | where it is | how it is got |
|---|---|---|
| **Vial** | beside a body | the Marrow always drops one; the Gnawing may |
| **Splinter Fetish** | beside a body | **pool only.** The one thing a fight's offer is for |
| **Grave Candle** | the Offertory's recess | placed. Pay the two-bone toll |
| **Rustplate** | the Chain Vault's cage | placed. Take the deep way |
| **Talisman of the Pair** | the Reliquary's chest | placed. Work the optional room |

### There is no reward screen

**Discover → reveal → inspect → decide → take → possess. In the world, every
time.** `mode: 'reward'` is gone and is not coming back under another name.

- A win settles the room and what it pays **falls beside the body**, as one or
  more room objects. The Marrow's guaranteed Vial and its rolled offer are
  separate objects, never one card with two things on it.
- A chest's find is drawn **at the moment of opening** and recorded on the node,
  so a reload renders the same thing and can never redraw it. The grant no
  longer rides that transition: opening a chest puts a thing *in the room*.
- **LOOK** gives the thing's name and its exact rule — the same contract a
  reward card was always held to — and commits nothing.
- **TAKE** grants it, fills its slot, and marks it taken. The caps are the
  reducer's: TAKE on a third item die is refused, no TAKE is drawn, and the
  refusal prints in the room as a sentence rather than as a grey button.
- **Walking on without taking is legal.** The thing stays in the room's state,
  and in a forward DAG that means it stays behind. The say line owns it:
  *I left it. The door does not open twice.*

An **authored find beats the pool, always**. A template that names a `find`
contains exactly that; a template that names nothing draws, and the draw
machinery stays for the rooms that will want it.

---

## Determinism

A run is a seed plus its history. Every draw is derived from those two and
nothing else, so a fight replays identically after a reload and the balance
simulation and the runtime are the same game rather than two models of it.

Each event names a **channel** (`src/game/rng.ts`):

| channel | drawn by |
|---|---|
| `playerRoll` | ROLL and REROLL |
| `ironRoll` | the iron die, on ROLL, once a turn |
| `itemRoll` | the item dice, at the item beat of an Attack |
| `reward` | what a win leaves in the room |

A fight's position in the stream is `(node, round, roll number, channel)`, and
the node's id is hashed rather than its depth counted. It used to be the path
length, which was an honest position only while the descent was a line: the map
is a DAG and both branches of the Cleft arrive at the same room, so a draw that
depended on *how far you had walked* would be a chest you could shake. The font
and the chests are keyed the same way, with constants of their own.

The iron and the item dice have channels of their own, so adding either could
not perturb what the core dice come up.

Requirements, and all of them are tested:

- an initial ROLL after a reload produces the same dice **and the same iron**;
- a REROLL after a reload with the same held indices produces the same dice,
  and leaves the iron exactly as it was;
- SCORE draws exactly once, on the item channel, and nothing else;
- retaliation draws nothing;
- presentation draws nothing — the faces that flicker past a tumbling bone come
  from a counter, not a generator.

Once a throw is committed its values live in `GameState`. Animation reveals
them; it does not create them.

---

## Invariants

The list a change has to keep true.

1. A fresh run begins with exactly thirty bones.
2. The player has no separate HP stat; the bone pile is life.
3. **An attack rolls exactly six dice, always, at every pile.**
4. **Nothing reads `run.bones` to decide how many dice are thrown.**
5. The run carries exactly six core slots, and no action can lengthen them.
6. A found core die replaces a slot; it never adds one.
7. An attack gets one initial throw and at most two rerolls.
8. Holds affect only the next reroll, and never the iron.
9. Core die values are ordinary d6 values: every face of every core die is an
   integer one to six.
9a. A slot is thrown off **its own** die's faces, and a held slot keeps its lane.
9b. A core die has no rule, no trigger and no keyword, and nothing outside
    `content/dice.ts` knows how many of them there are.
10. All rolled core dice contribute to the additive sum.
11. The selected hand supplies exactly one multiplier.
12. The iron die contributes nothing to the sum and nothing to qualification.
13. The iron die rolls on ROLL only, and is never rerolled or held.
14. Damage is `max(1, floor(sum × mult) + itemFlats + talismanFlat)`.
15. Everything the loadout adds to damage is flat.
16. There is no multiplier anywhere but `HAND_DEFINITIONS`.
17. Item dice never appear at ROLL or REROLL and have no verb: no roll, no
    reroll, no fire. The only press on a slot is a read-only inspection, which
    changes nothing and is absent mid-cascade.
18. At most two item dice, enforced in the reducer.
19. An item cost charges before the blow lands; a lethal cost ends the run and
    the blow never lands.
20. A talisman fires only on the line it names, and adds a flat.
21. No balance target requires an item die, a talisman or the iron die.
22. Each named hand can be scored once per fight.
23. A named hand is consumed only when deliberately scored *and landed*.
24. CRAP is always available when no unused named hand qualifies, and reusable.
25. Enemies have explicit HP and explicit damage, with no RNG. Damage is a
    **ladder** the player can read in full before the first ROLL, and `breakFor`
    is the only thing that may compute which rung a turn is on.
26. The answer is `max(0, enemyHit − block)`, never negative.
27. A dead enemy never retaliates.
28. A surviving enemy retaliates exactly once after SCORE.
29. Zero bones ends the run.
30. There are no enemy dice, armies, lanes or tie rules.
31. There is no always-on damage-reduction stat anywhere.
32. The reducer alone decides rolls, legal scores, damage, retaliation, victory
    and death.
33. Animation draws no random values and decides no outcomes.
34. A committed deterministic action replays identically after reload.
35. There is exactly one aggregate on screen, and it is the readout.
36. A fresh run carries six bare bones and nothing else.
37. What a win pays lies in the room it was won in. There is no reward screen
    and no mode for one.
38. A found thing is drawn once, recorded on the node, and can never redraw.
39. Walking away from a found thing is legal, and it stays where it was left.
40. Every draw is positioned by the **node** it happens in, never by how far the
    run walked to get there.
41. A priced die is never lethal: the press is absent when the pile is not
    strictly bigger than the price.
42. Taking a core die charges, swaps and claims in one transition, or does none
    of the three.
43. A bargain holds one specific die, with its strip and its price shown before
    the press. There is no shape of offer that can be generic power.
44. There is exactly one treasure in a run, and no route is obliged to pass it.

---

## Rejected alternatives

None of these returns without a product decision that says so:

optional-throw presses (always-throwing dominated at every cost value measured)
· global or compounding multipliers · desperation curves · item-die rerolls or a
fourth press · void faces · v1 fly-away numbers · v2 receipt readout ·
always-on armour stats · a minimum hand size · scratching a category · exploding
damage · enemy dice · enemy bone armies · lane comparisons · tie rules ·
statuses · crits · hidden accuracy rolls · the `min(6, bones)` throw width ·
**a spare-dice inventory** (the hand is six and nothing sits outside it) ·
**a rule, trigger or keyword on a core die** · **core dice in the fight-offer
pool** · **a generic-power bargain** · **a lethal bargain** · **enemy thresholds
on the player's damage, part-tearing, or a status family** · **a fourth grammar**
· **a treasure on a spine**

---

## Open questions

Named rather than quietly settled.

1. **Is there a cap above one iron die?** `IRON_CAP` is one and the arithmetic
   already sums several blocks. Whether more than one should ever be carried is
   **not decided here.**
2. **Should the iron be rerollable?** It is not, this wave, and that is stated
   as **provisional**. The argument for it is that terrain the player cannot
   touch is terrain; the argument against is a fourth thing to think about
   inside a turn that already has three.
3. **The replacement economy — settled.** Where a core die is found is the Bone
   Carver, a chained bargain and the treasure; what special dice exist is the
   table above; the replacement UI is the picker. What is open in its place is
   **the Hand of Saint Orrin's faces**: the swing table measures one copy of
   `1 1 1 1 6 6` as a *loss* against a plain bone, because it is an archetype
   piece in a game that can only ever hand you one. Reported and not tuned; the
   levers are its faces and whether a run may ever hold more than one, and either
   is a product decision. See *Balance* below.
3a. **Is three bones a price or a formality?** The sweep says always-take
    dominates on two of three grammars, which is what a formality looks like in
    numbers. Whether it *feels* like paying is a hand question and is
    pre-registered in `POLISH_PROGRESS.md`.
4. **Cost lethality.** A cost that empties the pile ends the run before the blow
   lands. Deliberate, asserted, and revisable.
5. **The iron die's starting loadout — settled.** It was provisional, and it is
   replaced: a fresh run starts bare and both the iron and the talisman are
   placed finds. What is open in its place is **whether one iron die is the
   cap** (question 1 above) and whether a second placed find should ever be
   able to make a run carry two.

---

## Balance

`npm run balance` runs 400 seeds per cell **through the real reducer** with a
policy where the thumb goes. It is not a second model of combat: change a
multiplier in `combat/hands.ts` or a face in `content/dice.ts` and the report
changes with it.

Two tiers. **naive** throws once and scores the biggest number it can see —
it never uses the two free rerolls. **heuristic** keeps its best group and its
high faces, spends the throws it is given, and takes the cheapest hand that will
finish the thing.

**Every fight cell is bare** — no iron die, no talisman, no item dice — because
no gate, target or enemy number may require upside. What the loadout adds is
measured separately and is never a target. The policy cannot see the item dice
at all: they have not been thrown when a decision is due.

Since the reel wave, "bare" is not a hypothetical stripped run: it is **what a
run is** until it finds something. A whole-run row marked *taking* is one that
picks up what it walks past; the rest take nothing.

### Observed, on the reel

The fights, bare:

| | naive | heuristic |
|---|---|---|
| Gnawing, bare 30 | 100% win, 3.1 attacks (median 3) | 100% win, 2.1 (median 2) |
| Marrow, 24 | 59% win, 4.5 (median 5) | 100% win, 3.4 (median 3) |
| Warden, 26 + a Vial | **1% win**, median 4 | **32% win**, median 4 |
| Warden, bare 12 | 0% win | 0% win |

Whole runs:

| | out | died at |
|---|---|---|
| safe · naive, taking nothing | **0%** | gate 100% |
| safe · heuristic, taking nothing | **32%** | gate 68% |
| deep · naive, taking nothing | 0% | gate 77%, deep 23% |
| deep · heuristic, taking nothing | 3% | gate 98% |
| safe · heuristic, taking what it finds | 41% | gate 59% |
| deep · heuristic, taking what it finds | **90%** | gate 10% |

What the loadout is worth, on the Warden at 26 with a Vial (heuristic):

| | win | attacks | bones lost |
|---|---|---|---|
| bare | 32% | 4.0 | 29.3 |
| + iron | **91%** | 5.0 | 20.0 |
| + iron + talisman | 93% | 5.2 | 21.0 |
| + everything | 94% | 4.5 | 17.3 |

**Median fight length: 2–5 attacks, mean 3.1 across cells.** The standing
concern — that fights end near three and a half attacks, which starves anything
wanting to escalate over a fight — is **reported and not tuned.**

### Acquisition, and the branch delta

New readings, added by the reel wave and **reported rather than tuned**. A run
starts with nothing, so *how often the policy ends up carrying each placed
find* is now the interesting half of the route question.

| route | talisman | iron | candle | vial | fetish |
|---|---|---|---|---|---|
| safe · LEFT | 100% | 0% | 0% | 44% | 14% |
| safe · RIGHT | 100% | 0% | 100% | 0% | 0% |
| deep · LEFT | 100% | 100% | 0% | 100% | 30% |
| deep · RIGHT | 100% | 100% | 100% | 100% | 18% |

And the Cleft, on the safe route:

| | out | bones broken | things found |
|---|---|---|---|
| LEFT · the Gnawing | 41% | 35.0 | 1.6 |
| RIGHT · the Offertory | 27% | 31.8 | 2.0 |
| **delta** (right − left) | **−14%** | **−3.2** | +0.4 |

The right-hand branch is cheaper in bones and richer in things and **gets out
less often**, because what it skips is the Gnawing's Vial. Neither branch is
meant to be the correct answer, and the numbers are printed so a person can
decide whether that spread is the one the design wants.

### Two findings nobody should skip

- **The deep route is now the *easier* one at 90%**, where the safe route is
  41%. That is a direct consequence of the Rustplate living in the cage: the
  long way is an extra toll and an extra fight, and it pays for both with the
  die that swings the boss from 32% to 91%. It is the ratified shape — route is
  build — and it is a large enough swing to be a product decision rather than a
  fact. **Reported, not tuned.** The lever is where the iron lives.
- **A naive run now gets out 0% of the time on either route.** It was 2%. What
  changed is that a fresh run is bare, so the beginner's route no longer starts
  with the die that was doing most of the work. The skill gap is still a
  tutorial problem rather than a depth one, and the levers are unchanged: the
  health totals, the damage figures, and how loudly the interface teaches that
  REROLL is free.

### #93's open question, re-measured again

#93 recorded solver 35% / never-reroll 1% on the safe route. #94 re-measured it
at 54% / 2% on the bare rows. On the reel it is **32% / 0% taking nothing**, and
**41% / — taking what it finds**. The skill gap is still enormous. What moved
the solver's number down is the empty starting loadout, not the dice.

### Re-based gates, and the ones added

Named in the report's own output rather than only here:

- *a wounded run is a worse run* — **re-based.** It used to hold for two
  reasons, fewer exchanges *and* a narrower hand, and the second is repealed.
  It still holds on exchanges alone, which is the interesting half of the
  finding: the width coupling was not what made a wound matter.
- *an attack rolls at most six and never more than the pile* — **re-based** to
  *the hand is six dice, at every pile, in every cell*.
- *no figure above assumes the loadout: every cell is bare* — **added** by the
  loadout wave, with *the loadout is upside*, which the reel wave re-worded to
  *taking what you find is never worse than walking past it*.
- *a fresh run starts bare: no iron, no talisman, no item die* — **added** by
  the reel wave. It is the same rule as the bare cells, stated about the game
  rather than about the report.

### The finding from the loadout wave, restated

**The iron die is doing most of the work.** 32% → 91% on the boss row, from one
die with first-pass faces. That is a much larger swing than the talisman (+2
points) or both item dice (+1 more), and it is exactly the dominance the
always-on armour stat was rejected for — now attached to a die rather than a
stat, which is the ratified shape, but at faces that may be too generous.

It matters more than it did, because the die is no longer starting equipment:
it is behind one branch of one fork, so the swing above is now the *price of a
route* rather than a thing every run has.

It is **reported, not tuned**. `[0, 0, 3, 3, 5, 7]` against a boss that swings
8 blocks the whole hit a third of the time. If that is the wrong number, the fix
is the faces, and it belongs in a commit that says so.

None of these numbers were tuned to make a target pass. They are what the
provisional values produce, printed so a person can decide.

---

### Observed, on the crooked bones

The whole-run figures above are now an **average over three grammars**, because a
run is one of three descents and the seed chooses. Split out, from the bare floor
— six plain bones, nothing found, nothing bought:

| grammar | solver · stair | solver · deep | beginner |
|---|---|---|---|
| DESCENT | 26% | 2% | 0% |
| THE LONG WAY | 26% | 2% | 0% |
| THE TITHE | 24% | 1% | 0% |

Bare is *bare*, and on the deep route bare means an extra toll and an extra fight
with no iron in the cage picked up. The interesting rows are the ones where the
run answers what it finds, and they are in the fork table below.

#### The die swing, on the safe route, solver

One copy in place of a bone, and then a whole build. **Upside, never a target** —
the floor stays six plain bones, exactly as no figure may require the iron.

| hand | out | delta | damage/attack |
|---|---|---|---|
| six plain bones | 26% | — | 39.3 |
| +1 Knucklebone | 26% | −0 | 38.8 |
| +1 Long Bone | 22% | −4 | 39.0 |
| +1 Saint's Finger | 25% | −1 | 38.9 |
| +1 Jawbone | 31% | +5 | 39.8 |
| +1 Heavy Bone | 39% | **+12** | 40.5 |
| +1 Cracked Bone | 17% | **−10** | 37.2 |
| six Knucklebones | 37% | +10 | 40.6 |
| Long Bone ×4 + bone ×2 | 38% | +11 | 40.5 |
| Jawbone ×3 + bone ×3 | 54% | **+28** | 42.7 |
| the Hand of Saint Orrin ×1 | 24% | **−3** | 37.9 |

#### The bargain policy sweep

Six answers to *three bones for a specific die*, on every grammar, solver, deep
route. The expectation going in was that always-take dominates at thirty bones,
and the sweep is what says so rather than the expectation.

| grammar | dominating policy | out | bought | spent |
|---|---|---|---|---|
| DESCENT | **always-take** | 83% | 1.0 | 1.5 |
| THE LONG WAY | **take above 20** | 67% | 2.4 | 6.5 |
| THE TITHE | **always-take** | 72% | 1.0 | 1.4 |

Never-take is 2% / 2% / 1%. Three bones is not a price on two of the three.

#### The forks, all six of them

The reel wave measured one fork on one grammar and reported −14 points. There are
two forks on each of three grammars now, with the run answering what it finds:

| grammar | first fork (left → right) | last fork (stair → deep) |
|---|---|---|
| DESCENT | 26% → 28% (**+2**) | 26% → 83% (**+57**) |
| THE LONG WAY | 10% → 5% (**−5**) | 10% → 61% (**+51**) |
| THE TITHE | 21% → 1% (**−20**) | 21% → 72% (**+51**) |

#### The treasure

Reached by the solver on 47–53% of runs, on every grammar and either leg, and
carried out every time it is reached — which is what *one of two branches* costs
and is the shape the design asked for.

#### The ladders

| | naive | heuristic |
|---|---|---|
| Gnawing, bare 30 | 100% win, 3.0 attacks (median 3) | 100%, 2.1 (median 2) |
| Marrow, bare 24 | 83% win, 5.0 (median 5) | 100%, 3.4 (median 3) |
| Warden, bare 26 + Vial | 1% win, median 4 | 32% win, median 4 |

The Gnawing's median kill round is **2** for the solver and **3** for the
beginner, which is the ladder doing exactly what it was built for: a third round
costs four times a first one, and the player who has not worked out that the
rerolls are free is the one who pays it.

### Three findings from the crooked bones

All three are **reported, not tuned.**

- **The treasure is weaker than a plain bone on its own.** `1 1 1 1 6 6` has a
  mean of 2.67 against a bone's 3.5, and one copy measures as a three-point
  *loss*. It is an archetype piece in a game that can only ever hand you one,
  which is the shape of the problem rather than its size. The levers are its
  faces and whether a run may ever hold more than one; both are product
  decisions, and it is recorded as an open question above.
- **Narrowness beats average, and by a lot.** Three Jawbones is the strongest
  build measured at +28, on a die whose mean is *identical* to a bone's. Six
  Knucklebones is +10 on a die whose mean is *lower*. The crooked dice are working
  as distributions rather than as stat sticks, which is what they were for — and
  it means a player who reads a strip for its spread is reading it correctly.
- **Always-take dominates, and the sweep was not asked to agree.** Only THE LONG
  WAY — which puts three priced dice in front of a run that has already spent its
  Font — prefers a floor, and it prefers twenty. If three bones is a formality the
  lever is the price, and the hand has to say so: see `POLISH_PROGRESS.md` § the
  hand pass, question 2.
