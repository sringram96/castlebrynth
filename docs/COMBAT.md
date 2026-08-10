# The War of Bones

The combat system, in full. This file is the contract: if the code and this
document disagree, one of them is a bug.

---

## The sentence

> It throws first. I decide how many of my bones to risk. I throw once. We line
> them up highest to lowest and break the losers. Ties break both — except the
> Warden, who keeps his. Whatever I lose is gone.

A player who has watched one round should be able to say that. It is the design
test, and it is the reason the system is what it is: the old one asked them to
hold a six-die loadout, hold state, a reroll, subset selection, seven hand
classes, multipliers, face riders, relic bonuses, enemy damage and HP in their
head at once.

---

## Life

**A run's life is a pile of bones.** Thirty of them, all common, at the start.
There is no health, no maximum-health field, and no hit points anywhere in the
codebase — see `src/game/state.ts`. A bone counter that behaves like a health
bar is the old game wearing this one's coat, and it is not to be built.

Two kinds of bone:

| | what it is | how it is carried |
|---|---|---|
| **common** | an ordinary d6: `1,2,3,4,5,6` | a **count**. It is anonymous; there is no such thing as *that* common bone. |
| **special** | a named bone with its own faces | an **instance**. Two Cinderbones are two objects and one can break while the other does not. |

The pile is `commonBones + specials.length`, and there is exactly one function
that says so: `totalBones` in `src/content/bones.ts`. Every rule that asks *am
I alive* or *how much can I recover* calls it. Reaching zero ends the run.

The ceiling is **30 bones in all, specials included** (`BONE_CEILING`).

---

## The bones

Four distributions. They are mechanical law; two faces showing the same number
resolve identically however they are drawn.

| profile | faces | who has it |
|---|---|---|
| `common` | 1, 2, 3, 4, 5, 6 | the pile; every enemy's rank and file |
| `wrong` | 2, 3, 4, 5, 6, 7 | the Marrow's two front bones |
| `cruel` | 3, 4, 5, 6, 7, 7 | the **Cinderbone**; one of the Warden's |
| `heavy` | 4, 5, 6, 6, 7, 8 | the **Knuckle**; one of the Warden's |

A bone's card is its numbers and nothing else. `3, 4, 5, 6, 7, 7.` is the whole
of a Cinderbone, and a player who has read that sentence knows everything the
game knows about it.

Seven and eight have no pip pattern anybody recognises, so they **print their
number** as well as their pips. See `docs/ART_DIRECTION.md`.

---

## The round

**Choose your modifiers, then throw and watch what it costs.** Two steps, and
each of them is one of those sentences.

```
FIGHT
  |
  v
thrown       its line is already rolled, face-up and sorted
  |          yours is not: the pile throws as wide as it can, and the only
  |          thing you decide is which named bones stand in it
  |
  | THROW { specialIds }
  |          fields, rolls, sorts and resolves — one action, one tick
  v
smashed      the casualties are settled and visible
  |
  | ROUND    only while both sides still have bones
  v
thrown       its next line
```

Each phase has **exactly one** verb: THROW, then ROUND. There were four phases
and four verbs, and `fielded` and `rolled` are gone with the decisions they
existed to carry — see *What was cut, and why* below.

### 1. It throws first

The enemy fields up to six bones from its army in **authored priority order** —
a number on the content, not a heuristic — rolls them, and stands them high to
low. This happens in the same tick as FIGHT or ROUND, and it is public before
the player throws. That is what makes the round something you answer rather
than something you start.

### 2. Width is not a decision; composition is

The line is `min(6, commonBones + named bones standing)`, always. There is no
stepper and no width to commit: a run throws everything it can, every round.

What the player chooses is **which named bones are in it**. Every named bone
stands by default — a bone you are carrying is a bone you are fighting with —
and the pouch lets you hold one back. A Knuckle in the line is four faces of
six-or-better and one more thing that can break forever; against a line it
cannot beat, holding it back is the better bet. Holding one back costs a lane
whenever the pile has no spare common to take its place, and the width recomputes
to say so rather than inventing a bone.

While the phase is `thrown` that selection is a **draft** and none of it is a
move. It reaches the reducer once, whole, on the `THROW` that acts on it. A
reload before that loses the thought and nothing else.

### 3. One throw, and no way to take it back

There is no HOLD, no reroll, and no second throw. Not one under any name: the
Charm was the last rethrow in the game and it is gone with the phase it was
spent in — a reroll needs a moment between seeing your throw and living with
it, and the round no longer has one.

### What was cut, and why

The round was `thrown → fielded → rolled → smashed`: four phases, four verbs,
three presses to get through one exchange. FIELD committed a width, THROW
rolled it, and SMASH resolved it.

Two of those presses were confirmations. Between THROW and SMASH there was
exactly one thing a player could do — spend a Charm — and between FIELD and
THROW there was nothing at all. A phase whose only content is confirming a
decision already taken is a phase that exists to be pressed through, and three
taps to resolve one exchange is what a fight felt like from the outside.

So: **throwing and finding out are one press**, and the beat that was spread
across three of them is spent on showing the throw instead — the bones turn
over, both lines stand for a moment, and then one clear break per lane.

The honest cost is written down in *Balance* below: the width control was the
game's skill ceiling, and removing it lowered it. What is left is real but
smaller.

### 4. Both lines sort themselves

High to low, automatically. There is no manual lane rearrangement, which makes
the sort a *rule*: which of two equal bones stands earlier decides which meets
the enemy's higher bone.

- **mine:** value ↓, then **common before special**, then instance id, then key.
  A special must not die because an array happened to be built one way.
- **its:** value ↓, then authored priority, then bone id.

### 5. Smash

Paired lanes resolve left to right, which after the sort is highest to lowest.

| | outcome |
|---|---|
| mine > its | its bone breaks |
| mine < its | my bone breaks |
| equal | **both break** |
| equal, vs the Warden | **my bone breaks; its bone stands** |
| unpaired | **safe** — it fought nothing and cannot die |

The pile is tested **after every lane**. If it reaches zero the run ends on that
lane and the lanes after it *never resolve* — not as a draw, not as a mutual
wipe. A lane that would have taken the enemy's last bone simply does not happen.

**Zero outranks victory.** If a mutual tie takes my last bone and its last bone
on the same lane, the run is dead.

Casualties are removed immediately and permanently. A dead special is removed
**by instance**; it is never converted into a common bone and nothing in the
game brings it back.

---

## The enemies

| | army | ties | pays | drops |
|---|---|---|---|---|
| **The Gnawing** | 5 common | both die | 60%, 2 cards | — |
| **The Marrow** | 2 wrong, 7 common | both die | 70%, 2 cards | 1 Vial, always |
| **The Warden** | 1 heavy, 1 cruel, 6 common | **it holds** | nothing | — |

The Gnawing is the base war: five bones, all of them fielded, no exception to
remember. The Marrow teaches **reserves** — nine bones against a six-wide line,
so killing what is in front of you promotes what is behind it — and puts a
profile at the top of its line that a common bone cannot beat.

The Warden is the exam. Everything already taught, plus one sentence: **an equal
lane takes your bone and leaves its own standing.** That sentence is printed in
its brief, in the room, and in MENU, before anything can be committed. A boss
rule the player discovers by losing to it is not a boss rule.

The Warden pays nothing. It is standing at the way out; the open door is the
reward.

---

## Recovery

Nothing resurrects a named bone. That is the whole weight of fielding one.

**The Font** — one press, once per run. `d6 + 2` common bones, capped by the
room left under the ceiling. The worst face is still worth three bones; at a
full pile it says so plainly rather than paying nothing and looking broken.

**A Vial** — a satchel consumable. Five common bones, capped the same way.
Legal in `explore` and in any combat phase that still has a decision in it; not
while a smash is being read, and not at a full pile, which is what stops one
being wasted. Drunk mid-round it adds reserves and does not touch the line
already thrown.

**A bone-denominated cost** — the Chain Vault's backlash today — takes a common
bone first, and the oldest living special when there is nothing anonymous left.
It can therefore kill a run made entirely of named bones, which is the honest
reading of *dead stays dead*.

---

## Rewards

Two nouns and no third: **bones** and **Vials**. No new collectible category
without a product decision. Relics went first — a passive arithmetic modifier
has nothing to modify in a game whose whole rule is *higher kills lower* — and
the Charm followed the phase it was spent in.

What is left is the shape of the two things a fight lets you decide: a Vial is
*how long do I last*, and a named bone is *what is standing in the line*.

Taking a named bone at the ceiling **transmutes one common bone** into it: the
total stays at thirty and there is no replacement picker. The player asked for
the bone; making them then choose which anonymous one to sacrifice is a
decision with no information in it. If the pile is thirty named bones and no
common one, bone rewards drop out of the pool entirely — an offer that cannot
be taken is not an offer.

**SKIP is a real button.** Taking a bone is a physical change to the army, and
a screen with no way out would be the game making that change for you.

---

## Determinism

A run is a seed plus its history. Every draw is derived from those two and
nothing else, so a fight replays identically after a reload and the balance
simulation and the runtime are the same game rather than two models of it.

Each event names a **channel** (`src/game/rng.ts`), so adding a draw somewhere
cannot perturb a result somewhere else:

| channel | drawn by |
|---|---|
| `enemyThrow` | FIGHT (round 1) and ROUND |
| `playerThrow` | THROW |
| `reward` | the win |

`resolveSmash` draws no random number and takes no generator — it is a pure
function of two lines and a tie rule. Presentation draws none either: the faces
that flicker past a tumbling bone come from a counter, not a generator, so a
replay of the same seed is identical on screen as well as in state.

A reload at `thrown` and a press of THROW give the same round. A reload at
`smashed` rolls nothing at all: the throw and every casualty were written by
the press that caused them, before a frame of the sequence ran.

---

## Invariants

The list a change has to keep true.

1. A fresh run is exactly thirty common bones.
2. No health, no damage, no hit points — under any name.
3. The enemy's line is public before the player throws.
4. The line is as wide as the pile allows, capped at six. Width is never asked
   for and never offered.
5. One player throw, and no rethrow of any kind.
6. Both lines sort high to low automatically; no manual lane order.
7. High kills low; ties kill both; the Warden holds ties.
8. Extras are safe.
9. Casualties persist; special casualties persist by instance.
10. Zero bones ends the run mid-smash and cancels the lanes after it.
11. The reducer alone decides an outcome, and saves it before anything moves.
12. No animation draws a random number.
13. No combat rule is imported from `ui/` or `render/`.

---

## Balance

`npm run balance` runs 400 seeds per cell **through the real reducer** with a
policy where the thumb goes. It is not a second model of combat.

Two tiers. **naive** stands every named bone it owns and drinks only when a bad
round could end the run — the first-time player, and the floor the slice has to
be winnable from. **heuristic** reads the public line and holds a named bone
back when the lane it will land in is likely to break it for less than it is
worth. It is allowed to be better than a first-time human; it is not allowed to
know anything a human at the same screen does not.

The report prints **invariants**, which fail the build, and **provisional
bands**, which print `WATCH` and do not. That split is deliberate: the bands
were written before this implementation existed, and a target that predates its
own simulator is a hypothesis rather than a gate.

### What collapsing the round cost, measured

Worth stating plainly, because it is the price of the two-step round and it is
not small.

The old invariant was *reading the line is worth something: the solver spends
fewer bones*, and it held because a solver could narrow against a line it could
not beat. **That decision is gone**, and with it most of the skill expression:
the solver now spends about 4.5 bones a fight *more* than the beginner at the
boss, because the only lever left — holding a named bone back — is paid for in
common bones.

What it buys is real: across 400 boss fights the solver finishes with **326
more named bones** than the beginner. That is the trade the game now offers, so
that is what the invariant measures, and both halves of it print in the report
where a person can watch them move.

A shallower skill ceiling was the accepted cost of one press per round. If it
turns out to be too shallow, the lever to reach for is content — enemy armies
and what a run arrives carrying — not putting the stepper back.

### Observed, after the round collapsed

| | naive | note |
|---|---|---|
| Gnawing, bare | 100% win, 2 rounds, **3.1 bones** | band wanted 4–7 |
| Marrow, bare 24 | 99% win, **9.0 bones** | in band |
| Marrow, with a Knuckle | 100% win, **6.7 bones** | in band |
| Warden, developed | **84% win**, 11.4 bones | band wanted 45–60% |
| Warden, bare 12 | 10% win | in band |
| safe route | 70% out | in band |
| deep route | **65% out** | band wanted 20–60% |

**Five bands are open, and they are named rather than quietly moved.**

The Gnawing costs about three bones instead of four to seven. That reads as
correct rather than wrong: it is the tutorial, it is five common bones against
thirty, and a first fight that takes a fifth of the run is a first fight that
punishes not yet knowing the rules.

**The Warden is too easy, and this is the one open content question.** 84% at a
developed pile is not an exam. The cause is legible in the numbers: eight bones
against a player carrying twenty-six is not enough army for held ties to bite,
because the fight ends before attrition does. The levers are its army size, its
profile mix, and how many bones a run arrives with — all three are content
decisions, and none of them belongs in the commit that built the system.

**The deep route got easier**, from 60% out to 65%, and the two-step round is
why: forcing a full-width line every round is on average good play, and the
route that used to punish over-committing no longer can. Whether that makes the
fork a real choice is a content question, and it is now the second one on the
list.

Until they are answered the report says `WATCH` on every run, which is the
point: a number outside its band is a conversation, and a conversation nobody
can see is a number somebody will quietly nudge.
