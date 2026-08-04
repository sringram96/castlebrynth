# The Gnawing — the reference fight

The canonical encounter, re-authored under the demo ruling of 2026-08-04.
It replaces the Crawling One encounter, which was written for the
THROW/BRACE turn that arts 41 and 46–47 repealed.

`test/lots.fight.test.ts` reproduces this walkthrough turn for turn. If the
engine and this document disagree, one of them is wrong and the test says
which.

## The fixture

| | |
| --- | --- |
| seed | 20 |
| horror | THE GNAWING, 150 health |
| script | swipe 7 · seal 6 · covet 5 · corrode 9 · bellow 16 · swipe 8, then +3 a loop |
| you | 26 health, armor 3 (the Rusted Plate over a bare body) |
| hand | a plain bone, the two Sisters, two plain bones, the Leech |
| carried | the Ossuary, the Zealot |

The kit is the demo's, not the skeleton's: art. 55 keeps a first waking bare,
and this fixture exists to exercise every socket at once. It lives in
`src/content/reference.ts`, because every number in it is tuning.

The walkthrough keeps all six dice every turn — one casting, no recast. The
second casting is law (art. 41) and is proved in `test/lots.turn.test.ts`;
what this fixture proves is the claim, the card, and the resolution.

## Turn by turn

**Turn 1 — swipe 7.** The dice fall `5 3 4 2 3 2`.

Two threes and two twos: **two pair**, one claim and not two (art. 64).
`(3+3+2+2) × 3 = 30`. The five and the four fit nothing and do nothing
(art. 45). The swipe is 7; armor eats 3.

> Gnawing 150 → 120. You 26 → 22. Card: two pair.

**Turn 2 — seal 6.** The dice fall `5 6 3 6 2 1`.

The pair of sixes is worth nothing this turn: the seal shuts every
pair-shaped line, and the engine does not offer them (art. 65). What is
left is a **run of 3** — the one, the two, the three. `(1+2+3) × 2 = 12`.

> Gnawing 120 → 108. You 22 → 19. Card: two pair, run of 3.

**Turn 3 — covet 5.** The dice fall `2 4 2 2 6 2`.

Four twos: **quad**. `(2+2+2+2) × 4 = 32`. The six is the lesson — the
Ossuary would count it twelve, and the curse counts it nothing. Covet beats
the Ossuary (art. 65: the curse is applied before any talisman reads the
face), so the six is left unclaimed rather than spent for nothing.

> Gnawing 108 → 76. You 19 → 17. Card: two pair, run of 3, quad.

**Turn 4 — corrode 9.** The dice fall `1 2 1 2 3 6`.

Nothing large is left on the card, so the six goes out alone on **any
dice** — and the Ossuary doubles it: `12 × 1 = 12`. That six is the Leech's
marked face, and it is spent in a claim, so the rider fires and heals 2
(art. 51). Then the corrosion: armor does nothing this turn, and all 9
land.

> Gnawing 76 → 64. You 17 → 19 → 10. Card: two pair, run of 3, quad, any dice.

**Turn 5 — bellow 16.** The dice fall `6 6 6 2 2 3`.

The Sisters both show a six. Claimed as the exact two-die pair, the ghost
sister joins: three sixes, each counted twelve by the Ossuary, scored at
the triple's tier on the PAIR line. `(12+12+12) × 3 = 108`.

Sixty-four was all that was left. The horror falls before it breathes out,
so the bellow never lands — a killing blow is not also a killing blow taken.

> Gnawing 64 → 0. You 10. **Won.**

## What survives unamended

The recast odds table, from the superseded encounter and still binding:
hunting a face with 1 / 2 / 3 / 4 dice succeeds 17 / 31 / 42 / 52 per cent
of the time. `test/lots.invariants.test.ts` checks it by simulation.
