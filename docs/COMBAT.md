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

`run.hand` is six ids from `content/dice.ts`. Every slot holds an ordinary
`bone` — six faces, `1,2,3,4,5,6`, no profile, no face effect, no keyword. The
reducer's `REPLACE_DIE { slot, die }` swaps one slot for another and cannot
lengthen the array; a slot outside `0..5` is refused.

**Scope, stated plainly.** This wave lands the state shape, the action and its
coverage. The economy that *finds* a die, the content of special dice and the
replacement UI beyond what a fixture can drive are the next wave's — see
*Open questions*.

---

## The iron die

**Armour is not a stat. It is a die that rolls alongside the six.**

`run.ironDice` — exactly one this wave, `Rustplate`, faces `[0, 0, 3, 3, 5, 7]`.
First-pass values, reported rather than tuned.

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

They **never appear at ROLL or REROLL and there is no press for them, ever.**
They roll automatically at Attack as a beat in the scoring cascade. That is the
whole point: an item die is a treat that lands mid-cascade, not a decision tax.
Any design that adds a fourth press or an item reroll is explicitly rejected.

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
the scored line.

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
- Item results fire **on the item die**.
- The talisman's flat fires **on the talisman**.
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

An enemy has a health total and a fixed damage figure. **It rolls nothing.**

| | HP | breaks | pays | drops |
|---|---|---|---|---|
| **The Gnawing** | 70 | 3 | 60%, 1 card | — |
| **The Marrow** | 120 | 5 | 70%, 1 card | 1 Vial, always |
| **The Warden** | 180 | 8 | nothing | — |

Both numbers are on screen from the first frame of the fight and are never
hidden until they land. Enemy content is **untouched** by this wave. The iron
die does not change what a thing swings; it stands in front of it, and the
caption says by how much before anything is committed.

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

## Rewards

Two nouns: **Vials**, and **item dice**. A Vial is the consumable it has always
been; an item die goes into the loadout and fires automatically at every Attack
from then on.

The reward screen is where a loadout thing enters a run, which is the machinery
this pool kept through the baseline that had nothing to put in it. A run already
carrying two item dice is offered no TAKE for a third and the card says why —
the cap is enforced in the reducer, not by the screen.

**SKIP is a real button**: a reward screen may never force a change on the run.

The iron die and the talisman start in a fresh run's loadout as **provisional
starting content** for this wave — the acquisition path for them is the next
wave's. Recorded in *Open questions*.

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
| `reward` | the win |

A fight's position in the stream is `(path length, round, roll number,
channel)`. The iron and the item dice have channels of their own, so adding
either could not perturb what the core dice come up.

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
9. Core die values are ordinary d6 values.
10. All rolled core dice contribute to the additive sum.
11. The selected hand supplies exactly one multiplier.
12. The iron die contributes nothing to the sum and nothing to qualification.
13. The iron die rolls on ROLL only, and is never rerolled or held.
14. Damage is `max(1, floor(sum × mult) + itemFlats + talismanFlat)`.
15. Everything the loadout adds to damage is flat.
16. There is no multiplier anywhere but `HAND_DEFINITIONS`.
17. Item dice never appear at ROLL or REROLL and have no press.
18. At most two item dice, enforced in the reducer.
19. An item cost charges before the blow lands; a lethal cost ends the run and
    the blow never lands.
20. A talisman fires only on the line it names, and adds a flat.
21. No balance target requires an item die, a talisman or the iron die.
22. Each named hand can be scored once per fight.
23. A named hand is consumed only when deliberately scored *and landed*.
24. CRAP is always available when no unused named hand qualifies, and reusable.
25. Enemies have explicit HP and explicit fixed damage, with no RNG.
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

---

## Rejected alternatives

None of these returns without a product decision that says so:

optional-throw presses (always-throwing dominated at every cost value measured)
· global or compounding multipliers · desperation curves · item-die rerolls or a
fourth press · void faces · v1 fly-away numbers · v2 receipt readout ·
always-on armour stats · a minimum hand size · scratching a category · exploding
damage · enemy dice · enemy bone armies · lane comparisons · tie rules ·
statuses · crits · hidden accuracy rolls · the `min(6, bones)` throw width

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
3. **The replacement economy.** Where a core die is found, what special dice
   exist, and what the replacement UI is. Deferred to the next wave; nothing in
   this one improvises it.
4. **Cost lethality.** A cost that empties the pile ends the run before the blow
   lands. Deliberate, asserted, and revisable.
5. **The iron die's starting loadout.** The iron and the talisman start in a
   fresh run because the acquisition path does not exist yet. **Provisional**,
   and it is the first thing the next wave should replace.

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

### Observed, on the first run of the loadout system

The fights, bare:

| | naive | heuristic |
|---|---|---|
| Gnawing, bare 30 | 100% win, 2.4 attacks (median 2) | 100% win, 2.1 (median 2) |
| Marrow, 24 | 100% win, 5.0 attacks (median 5) | 100% win, 3.4 (median 3) |
| Warden, 26 + a Vial | **1% win**, median 4 | **25% win**, median 4 |
| Warden, bare 12 | 0% win | 0% win |

Whole runs:

| | out | died at |
|---|---|---|
| safe · naive, bare | **2%** | gate 98% |
| safe · heuristic, bare | **54%** | gate 47% |
| deep · naive, bare | 0% | gate 86%, deep 14% |
| deep · heuristic, bare | 33% | gate 67% |
| safe · heuristic, carrying the loadout | 93% | gate 7% |
| deep · heuristic, carrying the loadout | 96% | gate 4% |

What the loadout is worth, on the Warden at 26 with a Vial (heuristic):

| | win | attacks | bones lost |
|---|---|---|---|
| bare | 25% | 4.0 | 30.0 |
| + iron | **89%** | 5.1 | 21.3 |
| + iron + talisman | 91% | 5.2 | 21.6 |
| + everything | 93% | 4.5 | 17.7 |

**Median fight length: 2–5 attacks, mean 3.2 across cells.** The standing
concern — that fights end near three and a half attacks, which starves anything
wanting to escalate over a fight — is **reported and not tuned in this wave.**

### #93's open question, re-measured

#93 recorded solver 35% / never-reroll 1% on the safe route, against an
equation this wave replaced. Re-measured on the bare rows: **54% / 2%.** The
skill gap is still enormous and a naive win rate of 2% on the safe route is
still a tutorial problem rather than a depth one. What changed is that the
fixed hand made the *solver's* route survivable without making the beginner's
one so; the levers are unchanged — the health totals, the damage figures, and
how loudly the interface teaches that REROLL is free.

### Two re-based gates, and one added

Named in the report's own output rather than only here:

- *a wounded run is a worse run* — **re-based.** It used to hold for two
  reasons, fewer exchanges *and* a narrower hand, and the second is repealed.
  It still holds on exchanges alone, which is the interesting half of the
  finding: the width coupling was not what made a wound matter.
- *an attack rolls at most six and never more than the pile* — **re-based** to
  *the hand is six dice, at every pile, in every cell*.
- *no figure above assumes the loadout: every cell is bare* — **added**, with
  *the loadout is upside: carrying things is never worse than carrying
  nothing*.

### The finding nobody should skip

**The iron die is doing most of the work.** 25% → 89% on the boss row, from one
die with first-pass faces. That is a much larger swing than the talisman (+2
points) or both item dice (+2 more), and it is exactly the dominance the
always-on armour stat was rejected for — now attached to a die rather than a
stat, which is the ratified shape, but at faces that may be too generous.

It is **reported, not tuned**, per the wave's own instruction. `[0, 0, 3, 3, 5,
7]` against a boss that swings 8 blocks the whole hit a third of the time. If
that is the wrong number, the fix is the faces, and it belongs in a commit that
says so.

None of these numbers were tuned to make a target pass. They are what the
provisional values produce, printed so a person can decide.
