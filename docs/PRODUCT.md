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

## The player verbs

Everything that ships supports one of these. If a feature cannot be explained
as support for one of them, it is out of scope.

| Verb | What it means |
| --- | --- |
| **LOOK** | Tap a visible thing in the room. Always answers. Never commits. |
| **GO** | Choose the next room. |
| **ROLL** | Throw `min(6, bones)` ordinary d6s. The first press of an attack. |
| **HOLD** | Tap a die to keep it. A draft; nothing is committed. |
| **REROLL** | Throw the unheld ones again. Twice at most. |
| **SCORE** | Commit the dice as one hand. The whole exchange, in one press. |
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
| `combat` | What can I make of these, and what will it cost? | its health empty → `reward`; my pile empty → `dead` |
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

One collectible noun exists for this baseline: **Vials**. Adding a second is a
product decision, not an engineering one.

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
- **The dice art has not been drawn.** The bones are rendered from the pip
  geometry the game has always drawn a face with. The plates that are owed —
  a bone body with faces 1–6 and a held state, and a Vial plate — are written
  out under `## HUMAN ART REQUIRED` in `POLISH_PROGRESS.md`.

## The gate

Until every line above is green, no change may add a new collectible species,
status-effect family, persistent ledger category, screen mode, procedural
world rule, or UI panel.
