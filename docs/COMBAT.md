# COMBAT.md

The whole of the fight. Read time: five minutes.

## The turn

Five steps, three model phases.

```
intent ──ROLL──▶ rolled ──REROLL──▶ rerolled
   ▲               │                    │
   │             SCORE                SCORE
   └────── enemy responds ◀────────────┘
```

`intent` — the enemy's next blow is on screen before you touch anything.
`rolled` — all six dice thrown. Tap dice to hold. Reroll is available.
`rerolled` — the unheld dice have been thrown once more. No further reroll.

Holding is not a phase: it is the set of held dice, legal in both `rolled` and
`rerolled`, and reversible by tapping again. Scoring is not a phase either: it
is the transition that ends the turn.

## Scoring

Select any dice. The game names the best hand that selection **exactly** forms
and previews the damage. There is no invalid selection — a selection that
forms nothing is `ANY`, which always scores.

| Hand | Requirement | × |
| --- | --- | --- |
| Any | 1–6 dice forming no better hand | 1 |
| Pair | 2 equal | 2 |
| Triple | 3 equal | 3 |
| Straight 3 | 3 consecutive values | 3 |
| Full House | 3 equal + 2 equal | 5 |
| Quad | 4 equal | 6 |
| Straight 5 | 5 consecutive values | 6 |

```
damage = sum(selected values) × multiplier + relic bonuses
```

The formula is shown in the tray before you commit, with every term visible:
`TRIPLE · 15 × 3 = 45`. Relic bonuses appear as their own term and the relic
pulses. Face costs appear as `−7 HP` next to the die that carries them.

**Hands are reusable every turn.** There is no card, no exhaustion, no line
that gets spent. A long fight is repetitive before it is empty, and that is
the trade the blueprint chose.

## What happens on SCORE

The order is fixed and the whole outcome is computed before a frame is drawn.

1. Damage lands on the enemy.
2. Marked faces in the selection resolve: hurt costs you HP, heal gives it.
3. If the enemy is at 0, the fight is won and nothing else happens. **A dead
   enemy never acts.**
4. Otherwise the enemy performs its declared intent. Armor (a relic effect)
   subtracts flat.
5. If you are at 0, you are dead.
6. The next intent is chosen and the turn returns to `intent`.

## Enemies

Each enemy is HP, an attack script, at most one special rule, art, and a
reward table. The script is a fixed cycle, so the intent is always knowable
and never random.

| Enemy | HP | Teaches | Special |
| --- | --- | --- | --- |
| The Gnawing | see `content/enemies.ts` | make a combination and hit it | none |
| The Marrow | ” | the telegraph | one blow in its cycle is announced a turn early and hits harder |
| The Warden | ” | both, together | the telegraph, plus a heavier floor |

No enemy in the slice applies a status to you. Nothing seals, curses, binds,
bleeds, corrodes or drains.

## Dice

Six, always. A die is six faces; a face is a value 1–6 and at most one
keyword. Two keywords exist:

- **hurt N** — if this face is in the hand you score, you lose N HP.
- **heal N** — if this face is in the hand you score, you gain N HP.

A keyword only fires when its face is part of the scored selection. Held dice
and unused dice do nothing.

Every die states its faces, its one rule sentence, and what it is good with.
If a die's rule cannot be read off the combat screen, the die does not ship.

## Relics

A relic is a passive rule outside the hand: one icon, one trigger, one effect,
one sentence. They are read at scoring time and never mutate state that other
relics read, so their order does not matter.

## Invariants

Enforced by `test/unit/` and, where they are visible, by `test/browser/`.

- Roll count equals active hand count. Always six in the slice.
- Reroll preserves held dice exactly, and rerolls every unheld die once.
- A selection never contains a duplicate slot.
- Hand recognition labels every supported pattern and invents none.
- The previewed damage equals the committed damage for the same settled state.
- An enemy at 0 HP cannot act.
- Reaching 0 HP always sets `mode: 'dead'`.
- A new run starts with six dice and no combat state.
- Every face keyword used in content has a visible descriptor in the UI.
