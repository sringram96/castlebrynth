# Combat

The combat system, in full. This file is the contract: if the code and this
document disagree, one of them is a bug.

---

## The sentence

> I have a pile of bones. I throw up to six of them. I can hold what I like and
> throw the rest again, twice. The numbers themselves are my power; the pattern
> makes that power hit harder. I can only use each good pattern once against
> this thing. If I can't make anything I can still hit it badly. If it survives,
> I know exactly how many bones it is going to break.

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

**The pile is also the hand.** An attack throws `min(6, run.bones)` bones, so
damage does not merely count down — it narrows the dice game:

| pile | dice |
|---|---|
| 30 | 6 |
| 12 | 6 |
| 6 | 6 |
| 5 | 5 |
| 4 | 4 |
| 3 | 3 |
| 2 | 2 |
| 1 | 1 |
| 0 | dead |

There is **no minimum hand size**. A badly wounded player really does lose
access to the hands that need the width — a Full House needs five bones, a
Straight needs five, Six of a Kind needs six — and no rule anywhere says so.
It falls out of the counting, which is the point.

## The bones

An ordinary d6. Six faces, `1,2,3,4,5,6`, and nothing else: no profile table,
no face effect, no keyword, no modifier hook. Special dice are a future pass
and are not in this baseline. See *What is not here* below.

---

## The attack

Each attack is a Yahtzee turn against a thing with a health total.

```
FIGHT
  |
  v
dice = []                    nothing on the table
  |
  | ROLL                     throw min(6, bones) ordinary d6s
  v
dice, rollsUsed = 1          may SCORE, or hold and REROLL
  |
  | REROLL { held }          held bones stay; the rest are thrown
  v
dice, rollsUsed = 2          the same choice again
  |
  | REROLL { held }
  v
dice, rollsUsed = 3          must SCORE
  |
  | SCORE { hand }           the whole exchange, in one tick
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
their face and their position; everything else is thrown.

A hold is a **presentation-local draft**. It is not in `GameState`, it does not
survive a reload, and it reaches the reducer once, whole, as
`REROLL { held: number[] }`. The reducer canonicalises the list — unique,
whole, in range, sorted — so a stale index from a wider throw, a repeat, a
negative or a fraction all reduce to the same answer. A reload may forget which
dice were lit; it must not forget the faces, and it must not grant another
throw.

A REROLL with **everything** held is refused rather than charged. A throw in
which nothing moves is not a throw.

---

## The scorecard

The dice say two things at once, and the interesting decision is that they are
not the same thing:

- **they add up.** Every die on the table counts, including the ones that took
  no part in the pattern.
- **they make a shape.** The shape supplies exactly one multiplier.

```
damage = max(1, floor(sum(all dice) × multiplier))
```

That is the whole equation. There is no other bonus anywhere in the game, no
crit, no accuracy roll and no hidden modifier.

| hand | multiplier | what it takes |
|---|---|---|
| **CRAP** | ×0.50 | the fallback. Not a category. |
| **PAIR** | ×1.00 | two bones alike |
| **TWO PAIR** | ×1.25 | two different faces, twice each |
| **TRIPLE** | ×1.50 | three bones alike |
| **STRAIGHT** | ×1.75 | five distinct consecutive faces: 1–5 or 2–6 |
| **FULL HOUSE** | ×2.00 | three of one face and two of a *different* one |
| **FOUR** | ×2.50 | four bones alike |
| **FIVE** | ×3.00 | five bones alike |
| **SIX** | ×4.00 | all six alike |

These multipliers are **provisional tuning values**, not product law. They live
in exactly one place — `HAND_DEFINITIONS` in `src/combat/hands.ts` — and every
other part of the game reads them from there.

### A roll can be several hands at once

`5 5 5 2 2 4` is a Pair *and* a Two Pair *and* a Triple *and* a Full House. The
player chooses which one to spend, and **only the chosen one is consumed**. If
Triple is already spent, Full House is still legal; if Full House is spent,
Triple is still legal.

A larger group satisfies a smaller one: four alike is also a triple and also a
pair.

Two edges worth stating outright, because they are the two people get wrong:

- `3 3 3 3 5 5` **is** a Full House. Four threes contain three, and the fives
  are the distinct pair.
- `3 3 3 3 3 1` **is not**. There is a triple, but no second face appears
  twice.

### One use per fight

`combat.usedHands` belongs to the fight and resets when a new one begins. It
never persists across the run.

A named hand is consumed **only when the player deliberately scores it**. There
is no scratching, no burning and no forced zero. A bad roll costs a throw and
nothing else.

### CRAP is a fallback, not a hand to burn

```
const named = unusedNamedHandsThatMatch(dice)
return named.length > 0 ? named : ['crap']
```

CRAP appears **only** when no unspent named hand qualifies, and never alongside
one. It is never written into `usedHands`, so it can never run out, and the
ordinary formula applies: `sum × 0.5`, floored, with the minimum of one. A
single bone showing a 1 still does 1 damage rather than nothing.

---

## The enemy

An enemy has a health total and a fixed damage figure. **It rolls nothing.**

| | HP | breaks | pays | drops |
|---|---|---|---|---|
| **The Gnawing** | 70 | 3 | 60%, 1 card | — |
| **The Marrow** | 120 | 5 | 70%, 1 card | 1 Vial, always |
| **The Warden** | 180 | 8 | nothing | — |

Both numbers are on screen from the first frame of the fight and are never
hidden until they land. The entire tactical contract is:

> I know exactly how many bones this thing will break if it survives my attack.

These figures are **provisional**. Their job is to give three differently paced
fights so the hand mechanic can be played; `npm run balance` is what says what
they produce.

### The exchange

`SCORE` settles all of it, in one tick, with no randomness anywhere in it:

1. sum the dice;
2. take the chosen hand's multiplier;
3. `damage = max(1, floor(sum × multiplier))`;
4. subtract it from the enemy's total, floored at zero;
5. mark the chosen named hand used (CRAP marks nothing);
6. **if the enemy is dead, it does not retaliate** — however thin the pile is;
7. otherwise it breaks exactly `enemy.damage` bones;
8. if the pile reaches zero, the run ends;
9. otherwise the next attack begins immediately, with a clear table.

There is no ROUND button. The score *is* the commitment, and what follows it is
another empty table waiting for ROLL.

### Victory

Reaching zero health with an authored death parks the fight on
`combat.defeated` and plays it; `DEFEAT_DONE` is the single transition out and
grants the win. An enemy with no authored death settles the victory
immediately. Both paths draw from the same generator position, so a death that
is watched and one that is skipped pay identically, and neither can pay twice.

---

## Recovery

**The Font** — one press, once per run. `d6 + 2` bones, capped by the room left
under the ceiling. The worst face is still worth three bones; at a full pile it
says so plainly rather than paying nothing and looking broken.

**A Vial** — a satchel consumable. Five bones, capped the same way. Legal in
`explore` and in a live fight; not over a death, and not at a full pile, which
is what stops one being wasted. Because the pile is the hand, drinking widens
the next attack.

**A bone-denominated cost** — the Chain Vault's backlash today — takes exactly
one bone, and can kill a run that has one left.

---

## Rewards

One noun for this baseline: **Vials**. Named bones went with the fielding step
they modified, and nothing was invented to replace them — a boring reward pool
for one combat prototype is preferable to contaminating the experiment with
modifiers before the base dice game has been played.

The reward-screen machinery stays, because when modifiers return they will need
somewhere to enter a run. **SKIP is a real button**: a reward screen may never
force a change on the run.

---

## Determinism

A run is a seed plus its history. Every draw is derived from those two and
nothing else, so a fight replays identically after a reload and the balance
simulation and the runtime are the same game rather than two models of it.

Each event names a **channel** (`src/game/rng.ts`), so adding a draw somewhere
cannot perturb a result somewhere else:

| channel | drawn by |
|---|---|
| `playerRoll` | ROLL and REROLL |
| `reward` | the win |

The enemy channel is gone with the enemy's dice. A fight's position in the
stream is `(path length, round, roll number, channel)` — the roll number is
what the three-throw attack needs, because two draws sharing a salt would make
a reroll reproduce the throw it was rerolling.

Requirements, and all of them are tested:

- an initial ROLL after a reload produces the same dice;
- a REROLL after a reload with the same held indices produces the same dice;
- SCORE draws nothing;
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
3. An attack rolls at most six bones and never more than the player has.
4. An attack gets one initial throw and at most two rerolls.
5. Holds affect only the next reroll.
6. Dice values are ordinary d6 values.
7. All rolled dice contribute to the additive sum.
8. The selected hand supplies exactly one multiplier.
9. Damage is `max(1, floor(sum × multiplier))`.
10. Each named hand can be scored once per fight.
11. A named hand is consumed only when deliberately scored.
12. A bad roll never burns an unused hand.
13. CRAP is always available when no unused named hand qualifies.
14. CRAP is reusable.
15. The player chooses among multiple legal named hands.
16. Enemies have explicit HP.
17. Enemies have explicit fixed damage.
18. Enemy damage contains no RNG.
19. A dead enemy never retaliates.
20. A surviving enemy retaliates exactly once after SCORE.
21. Enemy damage removes bones from the pile.
22. Zero bones ends the run.
23. Injury naturally reduces future hand size below six bones.
24. There are no enemy dice.
25. There are no enemy armies.
26. There are no lanes.
27. There are no tie rules.
28. There are no special bones in this baseline.
29. There are no modifiers in this baseline.
30. The reducer alone decides rolls, legal scores, damage, retaliation, victory
    and death.
31. Animation draws no random values and decides no outcomes.
32. A committed deterministic action replays identically after reload.

---

## What is not here

Deliberately absent from this baseline, and none of it returns without a
product decision:

exploding damage · enemy dice · enemy bone armies · lane comparisons · tie
rules · armour · statuses · relic modifiers · special or named dice · crits ·
hidden accuracy rolls · a minimum hand size · scratching a category

This task exists to find out whether the base dice game is fun before adding
modifiers.

---

## Balance

`npm run balance` runs 400 seeds per cell **through the real reducer** with a
policy where the thumb goes. It is not a second model of combat: change a
multiplier in `combat/hands.ts` and the report changes with it.

Two tiers. **naive** throws once and scores the biggest number it can see — it
never uses the two free rerolls. **heuristic** keeps its best group and its
high faces, spends the throws it is given, and takes the cheapest hand that
will finish the thing rather than the biggest.

**This build measures rather than gates.** The multipliers, the three health
totals and the three damage figures are all first-pass numbers written before
the system existed, so the report prints **invariants** (which fail the build)
and **measurements** (which do not). There are no provisional bands yet;
turning any measurement into a gate is a product decision and belongs in a
commit that says so.

### Observed, on the first run of the new system

| | naive | heuristic |
|---|---|---|
| Gnawing, bare 30 | 100% win, 3.1 attacks, 6.4 bones | 100% win, 2.1 attacks, 3.3 bones |
| Marrow, 24 | **38% win**, 21.4 bones | 99% win, 12.2 bones |
| Warden, 26 + a Vial | **1% win** | **25% win** |
| Warden, bare 12 | 0% win | 0% win |
| safe route, whole run | **1% out** | 35% out |
| deep route, whole run | 0% out | 22% out |

Average damage an attack: 21–27 for naive, 31–40 for the solver. Throws per
attack: 1.0 for naive by construction, 1.8–2.4 for the solver. CRAP is 14–28%
of naive's scored hands and 0–3% of the solver's.

**Three things are open, and they are named rather than quietly moved.**

1. **The rerolls are not optional, and the numbers say so loudly.** A player
   who throws once and commits loses the slice almost every time; a player who
   uses all three throws wins about a third of their runs. That gap is much
   larger than the old game's skill gap, which is arguably the point — but a
   naive win rate of 1% on the safe route is a tutorial problem, not a depth
   one. The levers are the health totals, the damage figures, and how loudly
   the interface teaches that REROLL is free.
2. **The Warden may now be too hard**, which is the mirror of the complaint the
   old build had about it. 25% at a developed pile against an old want of
   45–60%.
3. **The deep route is still the harder branch**, which is correct, and it is
   the one thing in the table nobody needs to argue about.

None of these numbers were tuned to make a target pass. They are what the
provisional values produce, printed so a person can decide.
