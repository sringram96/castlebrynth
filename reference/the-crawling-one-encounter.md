# The Crawling One — the reference encounter
The canonical fight for turn feel and math (art. 45). The Lots engine
must reproduce this turn for turn as a test fixture. Rules in play:
arts 41–48, 60. Hand: five plain bones + the Orphan, a signature whose
1-face is a second 6 — faces {2,3,4,5,6,6}, declared on inspect.

Start: the Crawling One 90 health. You 20 health.

## Turn 1 — intent: RAKE 8
First casting: 3 3 6 4 2 6.
Freeze the two 6s; recast four, hunting a third
(P(at least one 6 in 4) = 1 − (5/6)^4 ≈ 52%).
Second casting: 6 4 2 1 — it lands.
THROW triple 6s: 18 × 3 = 54. Horror 90 → 36.
RAKE resolves: you 20 → 12.

## Turn 2 — intent: BELLOW 13 (lethal: 13 > 12)
First casting: 5 4 4 2 1 6.
The fork: a pair of 4s throws 16 (leaves it alive; BELLOW kills you) —
suicide. A triple of 4s throws 12 × 3 = 36 — exactly lethal, and it
dies before the intent fires. So: freeze 4-4 (the chase) AND 6-5 (the
shield); recast only 2 and 1 (P(third 4 in 2) = 1 − (5/6)^2 ≈ 31%).
Second casting: 3 2 — the chase fails, the plan holds.
BRACE 6+5+4 = 15, absorbing all 13. No harm either way. Horror stays 36.
(This turn is why BRACE is valued, not flat: under "eats one blow" it
is trivial; under brace-as-sum the dice had to be there, and freezing
them cost chase odds.)

## Turn 3 — intent: RAKE 8
First casting: 6 6 3 3 5 1. Freeze the 6s; recast four (the 52% coin).
Second casting: 6 5 2 2.
THROW triple 6s: 54 ≥ 36. Dead before it swings. You leave at 12.

## The fairness facts
1. Nothing is hidden: its health, its intent with the number, your
   declared leans. The horror never rolls — the only dice in the room
   are yours, and you choose which to expose to chance.
2. The whole probability table is four entries — recast 1, 2, 3, 4
   bones → 17%, 31%, 42%, 52% to find a given face. Learnable by hand
   by run three. The engine must not silently change these odds.
3. Pigeonhole: six dice on six values repeat somewhere, or all six
   distinct is the great straight. A full hand cannot whiff; only a
   diminished hand can fail (art. 46).
4. The signature is honest math, not vibes: the Orphan in the recast
   pool raises the 52% chase past 60%.

Tuning knob left visibly loose: whether bracing taxes the next turn.
Straw answer: no. If defense proves too cheap, that is the screw.
