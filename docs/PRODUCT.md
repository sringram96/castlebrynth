# PRODUCT.md

What Castlebrynth is, and what is in the vertical slice. Read this first.
Read time: five minutes.

## The pitch

> Castlebrynth is a portrait pixel-horror roguelike where you descend through
> hand-authored rooms, fight grotesque enemies by building and rolling a
> six-die loadout, collect strange dice and relics that create escalating
> scoring synergies, and decide how far to push before the dungeon kills you.

## The player verbs

Everything that ships supports one of these. If a feature cannot be explained
as support for one of them, it is out of scope.

| Verb | What it means |
| --- | --- |
| **LOOK** | Tap a visible thing in the room. Always answers. Never commits. |
| **GO** | Choose the next room. |
| **ROLL** | Throw the six active dice. |
| **HOLD** | Tap dice to keep them across the reroll. |
| **REROLL** | Reroll everything not held. Once per turn. Skippable. |
| **SCORE** | Commit one valid combination and deal its previewed damage. |
| **TAKE** | Choose a reward. |
| **RESTART** | Begin a new run after death. |

## The slice

Eight rooms, three fights, one font, two rewards, one ending each way.

```
entry → passage → hollow(FIGHT: the Gnawing) → sanctuary(THE FONT) → fork ┬→ stair ─┐
                                                                         └→ deep(   │
                                                                    FIGHT: the      │
                                                                        Marrow) ────┤
                                                                                    ↓
                                                                    gate(FIGHT: the Warden)
                                                                                    ↓
                                                                                  exit
```

The fork is the whole of the expedition pressure: the deep way is another
fight and another reward before the boss, and health does not come back on its
own. That is enough to make *do I keep going?* a real question without a
second subsystem.

**The font is what makes that question answerable.** One press, one die, and a
share of the health you are *missing* comes back — 19% of it on a one, all of
it on a six. It sits immediately before the fork on purpose: the deep way is a
gamble about how much body you have left, and a gamble is only a decision if
you know the number. A share of the wound rather than a flat gift is what keeps
it honest at both ends — it is worth most to a player who is nearly dead, and
worth literally nothing to a player who is whole, so there is no version of it
that can be farmed.

It is deliberately the smallest room in the game: no shop, no currency, no
second shrine, no reroll. One object, one press, one number.

## The modes

Six, and each one is a screen. Every transition is an explicit action; nothing
is inferred.

| Mode | The question | Leaves by |
| --- | --- | --- |
| `title` | Do I go down? | `START_RUN`, `CONTINUE` |
| `explore` | Which way — and what do I touch? | `GO`, or a room's fight begins |
| `combat` | How do I spend this hand? | enemy dead → `reward`; player dead → `dead` |
| `reward` | What do I take? | `TAKE` → `explore` |
| `dead` | (nothing — it is over) | `START_RUN` |
| `complete` | (nothing — you got out) | `START_RUN`, `TITLE` |

## What is deliberately not here

Parked by the blueprint's §6 cut. None of it may return without playtest
evidence, and none of it may return as a general framework:

once-per-fight scoring card · seal · curse · corrode · bind · bleed · hunger ·
rolling goods and trinkets · the rider taxonomy · the bond framework ·
talismans and levels as separate species · priced exploration acts ·
permanent knowledge clues · refusal flags · the Book of Ends as state ·
procedural region lean and lock · the provable-winnability generator ·
hand-size wounds and upgrades · classes · QTE windows · merchants and currency

Two collectible nouns exist: **dice** and **relics**. Adding a third is a
product decision, not an engineering one.

## Definition of done for the slice

- A fresh mobile browser completes the whole route without a reload.
- Every enemy is visibly present before the first roll.
- Exactly six dice are shown whenever six dice are active.
- Roll, hold, reroll, score, inspect, reward, navigation and death-restart all
  have passing browser tests.
- A first-time player can say what their special die and their relic do.
- Death to new run is one press, and never leaves stale combat UI.
- The active docs read in under twenty minutes.

## The gate

Until every line above is green, no change may add a new collectible species,
status-effect family, persistent ledger category, screen mode, procedural
world rule, or UI panel.
