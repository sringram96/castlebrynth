# GAME.md — CASTLEBRYNTH (design constitution, v5)

Two engines, one doorway. THE DESCENT: forward-only rooms you read by
tapping. THE LOTS: dice combat you resolve by throwing. High-fidelity
pixel stills, bleak and claustrophobic. VISION.md v1.1 is the design
rationale; this doc is the ratified law cards cite.

## frame (#frame)

Full-bleed pixel still; one or two lines of writing on top; fixed
bottom panel paged ◂ ACTIONS · SKILLS · ITEMS ▸ with a permanent strip
(HP · Might · Will · ◎ tithes · depth). Sanity is the vignette — the
dark border closing; no sanity bar exists anywhere.

## the descent (#descent)

- **Tap is free, always** — describes, selects, surfaces actions;
  never advances, costs, or harms. Investigation actions (PEER,
  LISTEN, REACH IN) are where risk lives (#situations may open).
- **Forward-only.** No backtracking within a push. The knowledge
  ratchet is cross-push: refusals and clues logged now pay off when
  their kind is met again later. Walker law: a clue-locked gate must
  draw its clue earlier in the push OR be cross-push by design.
- **Doors are the map:** the next 2–3 doors always show as sensed
  descriptions (light, sound, smell) — one step of lookahead, no map
  screen, ever.
- Rooms draw fresh each push from the authored pool; **landmarks are
  fixed per depth**. Exactly **one notable-die event per depth** —
  guarded, priced, or bargained; win, pay, or walk.
- Encounters are exactly: **merchant** (sells consumables incl.
  spell-instants, armor, upgrades — the run ledger's engine),
  **dialogue** (only dialogue), **fight** (opens the Lots). Every
  event carries dialogue; QTEs are their own category (#qte).
- **Affordance permanence** (LAWS.md #affordance) and **telegraphed
  harm** (LAWS.md #telegraph) are unchanged bedrock.

## the lots (#lots)

- **Hand = 5 regular bones + 1 signature die, chosen at the
  Crossing** ("one of these was yours" — never confirmed). The choice
  is the class system. First class: THE WIZARD — the Hollow Die, five
  blank faces + one power face; collected spells socket onto blanks
  (weakest start, hardest scale).
- **Loaded bones:** every die keeps all six numbers; weighting is a
  declared probability lean, stated on inspect and legible in the
  art. At most one gilded trigger face per die. No verb-faces, no
  self-cost faces.
- Turn: enemy intent shows (enemies never roll) → roll your hand →
  THROW a combination / hold / [gather — economy still open, see
  GRAMMAR] → each held die blocks 1 → intent lands → repeat.
- Combos multiply (pair ×2 … five-of-a-kind ×5, chunky); base = sum
  of thrown faces; **items are additive jokers**; F1–F7 fairness laws
  (GRAMMAR.md) are CI, not guidance.
- **Spells are instants.** Non-wizards: consumables (one cast, the
  two small-slots). Wizard: socketed faces — the roll is the cost.
  Mana does not exist.
- Elites/bosses may bend grammar as content ("seals sixes").

## the two ledgers (#ledgers)

- **Run ledger** — tithes, consumables, non-kept gear: death takes it.
- **Campaign ledger** — dice, knowledge/flags, landmarks, grants:
  death cannot touch it. **Dice survive death — law.**
- The pouch is packed at the Crossing from the stash; mid-push finds
  are swap-or-leave (no stash access below).

## death (#death)

Every death wakes you at the Crossing, bars and skill uses restored.
Run ledger wiped (except key ✦ and kept • items + one random
survivor); campaign ledger intact; the doors redraw. Every death pays
at least one new line (LAWS.md #death-pays).

## qtes (#qte)

Timed choice · swipe-parry · frame-grab · entry ambush (first arrival
in flagged rooms) · sequences at thresholds. Every QTE declares a
Will-check fallback; the setting converts all.

## grants, skills, improvements (#improvements)

No XP, no levels. Growth = dice (campaign), gear + grants (helpful
rooms give; evil tradeoffs charge), and skills (found, uses-per-rest,
spent in the skill_window after dice land).

## determinism

A run is fully determined by save seed + death count + inputs (leans
draw from the seeded stream). Same seed, same casts, same doors,
forever (.llm/rules/determinism.mdc).
