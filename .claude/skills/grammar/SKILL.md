---
name: grammar
description: Use for any card touching grammar.yaml, the Lots engine, F-laws, or the fight sim - the paved path for combat content and experiments.
---

# Working the Lots

- Engine knows only the pipeline hooks (on_roll, skill_window,
  on_score, on_hold, on_block, on_turn_end) and the closed effect
  verbs (add, mult, promote, block, burn, hp, seal, curse). Content =
  manifest entries attaching verbs to hooks. Never hardcode a die.
- Dice: faces always [1..6]; weighting is a `lean` table (declared,
  inspectable); at most one gilded trigger face. The wizard's hollow
  die is `socketable` with blank faces.
- Every manifest PR: `npm run law` runs F1-F7 — mult cap static check,
  bone-standard TTK/TTD sim, EV bands per rarity, risk symmetry,
  termination, dominance tournament, one-shot guard. Red F-law = no
  merge; do not tune around the law, fix the content.
- Experiments: copy base -> experiments/exp-NNN.yaml (enable lists +
  numeric overrides only), run `npm run sim:fight -- --manifest ...
  --fights 10000 --seed N`, paste the report table in your PR body.
- Determinism: leans draw from the run's seeded stream in fixed
  order. Never Math.random, never Date.
