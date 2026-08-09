# PRODUCT.md

What Castlebrynth is, and what is in the vertical slice. Read this first.
Read time: five minutes.

## The pitch

> Castlebrynth is a portrait pixel-horror roguelike where you descend through
> hand-authored rooms carrying a pile of thirty bones, fight grotesque enemies
> by choosing how many of those bones to risk against the line they have
> already thrown, collect strange named bones that roll higher than any
> ordinary one, and decide how far to push before the dungeon kills you.

The whole of the fight is four sentences. **It throws first. High kills low.
Ties kill both. What dies stays dead.** Everything else in the system exists to
make those four legible: the width control is how the player prices them, and
the pile is what pays.

## The player verbs

Everything that ships supports one of these. If a feature cannot be explained
as support for one of them, it is out of scope.

| Verb | What it means |
| --- | --- |
| **LOOK** | Tap a visible thing in the room. Always answers. Never commits. |
| **GO** | Choose the next room. |
| **FIELD** | Commit how many bones to risk this round, and which named ones. |
| **THROW** | Throw the committed line. Once. |
| **CHARM** | Spend a Charm to throw one rolled bone again. Once per fight. |
| **SMASH** | Meet the two lines lane by lane, and break the losers. |
| **ROUND** | Let it throw again. |
| **DRINK** | Spend a Vial: five bones back. |
| **TAKE** | Choose a reward. |
| **SKIP** | Leave a reward where it fell. |
| **RESTART** | Begin a new run after death. |

## The slice

Ten rooms, three fights, one font, two worked rooms, two rewards, one ending
each way.

```
entry → passage → hollow(FIGHT: the Gnawing) → sanctuary(THE FONT)
   → reliquary(OPTIONAL: bell, dark, lever → a find) → fork ┬→ STAIR ─────────┐
                                                             └→ DEEP          │
                                                    chain-vault(LOCKED:       │
                                                    cage → plate → lever) ────┤
                                                                 ↓            │
                                                    deep(FIGHT: the Marrow) ──┤
                                                                              ↓
                                                              gate(FIGHT: the Warden)
                                                                              ↓
                                                                            exit
```

## Rooms you work

Two rooms answer a complaint that was true of every other one: *enter, look at
picture, read prose, press exit.* A room is a backdrop, ambient motion, several
concrete objects, state those objects keep, and actions with consequences.

They are a matched pair, and the pairing is the design:

- **The Reliquary is optional and free.** GO ON is on screen from the first
  frame and never leaves. Ring the bell, put out the brazier, pull the skull
  lever, and the chest opens on one thing from the reward pool. Ignore all of
  it and walk out having lost nothing. It is there to be *found*, not to be passed.
- **The Chain Vault is mandatory and costs blood.** It is the toll on the deep
  route, paid before the fight rather than during it. Drop the cage onto the
  pressure plate, then pull the lever, and the gate rises. Pull the lever
  against an unweighted plate and the mechanism takes a bone through your hand —
  as often as you have blood for it. It is the first place in the slice where a
  *room* can kill you.

Neither is a guessing game. Every mechanical relationship is readable through
ordinary LOOK: three cuts beside the skull lever name the bell, the black flame
and the lowered jaw, in the order they have to happen; a wall panel in the vault
draws a weight falling and then a gate lifting.

Neither adds a noun. No key, no puzzle currency, no new stat, no new find, no
new die, no new screen mode — both rooms are `explore`, and the chest pays out
of the reward pool that already exists.

The fork is the whole of the expedition pressure: the deep way is another
fight and another reward before the boss, and bones do not come back on their
own — the Font answers once, and a Vial has to be found. That is enough to make
*do I keep going?* a real question without a second subsystem.

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
| `combat` | How many bones do I risk? | its army empty → `reward`; my pile empty → `dead` |
| `reward` | What do I take, if anything? | `TAKE` or `SKIP` → `explore` |
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

Three collectible nouns exist: **bones** (including named ones), **Charms**
and **Vials**. Adding a fourth is a product decision, not an engineering one.

Relics are gone. A passive arithmetic modifier has nothing to modify in a game
whose whole combat rule is *higher kills lower*, and keeping them would have
meant keeping a number for them to add to.

## Definition of done for the slice

- A fresh mobile browser completes the whole route without a reload.
- Every enemy is visibly present before FIGHT is offered.
- The enemy's line is face-up and readable before FIELD is offered.
- Field, throw, charm, smash, round, drink, inspect, reward, skip, navigation
  and death-restart all have passing browser tests.
- A first-time player can say what their named bone rolls, in digits.
- Death to new run is one press, and never leaves stale combat UI.
- The active docs read in under twenty minutes.

### Still open

- **The Warden is too easy.** 84% at a developed pile against a wanted 45–60%.
  The levers are its army, its profiles, and how much a run arrives carrying;
  all three are content decisions. See `docs/COMBAT.md` § *Balance*.
- **The War of Bones art has not been drawn.** The bones are rendered from the
  pip geometry the game has always drawn a face with. The plates that are owed
  — bone bodies, a broken state, the satchel icons, a shatter family, a tray
  repaint with a bay for the enemy's line — are written out under
  `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md`.

## The gate

Until every line above is green, no change may add a new collectible species,
status-effect family, persistent ledger category, screen mode, procedural
world rule, or UI panel.
