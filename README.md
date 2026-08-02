# HUSH (working title)

A still-frame, tap-driven dungeon-crawl roguelike for phones. You wake on
a shore with no memory; the pull is downward. This repo is the design
constitution for the agent factory that will build it.

- **GAME.md** — ratified mechanics: the frame, tap law, stats
  (HP / Sanity / Might / Will), 4+2 item slots, dice-stand combat, free
  flee rolls, the death/obol loop, undocumented consequences, QTEs.
- **CANON.md** — world, tone, narrator voice, knowledge tiers (T0–T3).
- **TRUTH.md** — SPOILERS. The complete story and what each tier may
  carry.
- **LAWS.md** — fairness as lintable statements: affordance permanence,
  gate satisfiability, telegraphs, spoiler containment, breadcrumbs,
  no rerolls.
- **mock/index.html** — a playable slice of the waking place: the tap
  layer, the gated book, a shade fight with a flee roll, the sanity
  vignette, and one bad hand out of the dark. Open it on a phone.

Next: ratify the mock's feel, then cut the engineering constitution
(CLAUDE.md, ARCHITECTURE.md, skills) and the first cards — same factory
pattern as undertile, plus a content pipeline where events are data
through the LAWS linter.
