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

```
FIGHT
  |
  v
thrown       its line is already rolled, face-up and sorted
  |
  | FIELD { width, specialIds }
  v
fielded      exactly those bones committed; no face decided yet
  |
  | THROW
  v
rolled       my line rolled once and sorted
  |  \
  |   \ CHARM { boneKey }   optional, once a fight, costs a Charm
  |    \__________________  back to rolled, whole line re-sorted
  |
  | SMASH
  v
smashed      the casualties are settled and visible
  |
  | ROUND    only while both sides still have bones
  v
thrown       its next line
```

Each phase has **exactly one** verb. FIELD, THROW, SMASH and ROUND are never on
screen together.

### 1. It throws first

The enemy fields up to six bones from its army in **authored priority order** —
a number on the content, not a heuristic — rolls them, and stands them high to
low. This happens in the same tick as FIGHT or ROUND, and it is public before
the player commits anything. That is what makes the next step a decision.

### 2. Width is a decision

The player fields `1 .. min(6, totalBones)`. Narrow play risks fewer bones and
kills fewer of its; wide play does the opposite. Named bones occupy slots
*inside* the width rather than adding to it.

While the phase is `thrown` the player is editing a **draft** — a stepper and
the pouch — and none of it is a move. It reaches the reducer once, whole, as
`FIELD`. A reload before that loses the thought and nothing else; a save can
never hold a half-selected army.

### 3. One throw

There is no HOLD, no general reroll, and no second throw. A Charm is the only
rethrow in the game: it costs a charge, it throws exactly one already-rolled
bone, and it may be spent **once per fight** however many are carried.

Arming is two presses — tap the Charm bay, then tap a bone. A rare consumable a
stray tap could spend is one the player loses by accident exactly once.

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

Three nouns and no fourth: **bones**, **Charms**, **Vials**. No new collectible
category without a product decision.

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
| `charm` | CHARM, for its one target |
| `reward` | the win |

SMASH draws no random number and takes no generator. Presentation draws none
either — the faces that flicker past a tumbling bone come from a counter.

A reload at `fielded` and a press of THROW give the same line. A reload at
`rolled` rolls nothing at all.

---

## Invariants

The list a change has to keep true.

1. A fresh run is exactly thirty common bones.
2. No health, no damage, no hit points — under any name.
3. The enemy's line is public before the player commits.
4. The player fields 1–6, and never more than the pile allows.
5. One player throw. A Charm is the only rethrow, once per fight.
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

Two tiers. **naive** fields everything and drinks only when a bad round could
end the run — the first-time player, and the floor the slice has to be winnable
from. **heuristic** reads the public line, compares every legal width, and
spends a Charm on a losing lane it could actually win. It is allowed to be
better than a first-time human; it is not allowed to know anything a human at
the same screen does not.

The report prints **invariants**, which fail the build, and **provisional
bands**, which print `WATCH` and do not. That split is deliberate: the bands
were written before this implementation existed, and a target that predates its
own simulator is a hypothesis rather than a gate.

### Observed, at first ratification

| | naive | note |
|---|---|---|
| Gnawing, bare | 100% win, 2 rounds, **3.1 bones** | band wanted 4–7 |
| Marrow, bare 24 | 99% win, **9.0 bones** | in band |
| Marrow, with a Knuckle | 100% win, **6.7 bones** | in band |
| Warden, developed | **84% win**, 11.4 bones | band wanted 45–60% |
| Warden, bare 12 | 10% win | in band |
| safe route | 69% out | in band |
| deep route | 60% out | in band |

**Three bands are open, and they are named rather than quietly moved.**

The Gnawing costs about three bones instead of four to seven. That reads as
correct rather than wrong: it is the tutorial, it is five common bones against
thirty, and a first fight that takes a fifth of the run is a first fight that
punishes not yet knowing the rules.

**The Warden is too easy, and this is the one open content question.** 84% at a
developed pile is not an exam. The cause is legible in the numbers: eight bones
against a player carrying twenty-six is not enough army for held ties to bite,
because the fight ends before attrition does. The levers are its army size, its
profile mix, and how many bones a run arrives with — all three are content
decisions, and none of them belongs in the commit that built the system. The
army in this document is the one the specification fixes; changing it is a
product decision and should arrive in a commit that says so.

Until then the report says `WATCH` on every run, which is the point: a number
outside its band is a conversation, and a conversation nobody can see is a
number somebody will quietly nudge.
