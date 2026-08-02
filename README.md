# castlebrynth

A still-frame, tap-driven dungeon-crawl roguelike for phones. You wake in a
dead portal chamber with no memory, and a labyrinth leads down.

**Two engines, one doorway.** *The Descent* is navigation and investigation:
forward-only pushes through drawn rooms, free-tap examination, doors sensed two
or three ahead and never a map. *The Lots* is dice combat and everything it
spends: five bones and a signature die you chose rather than were given, loaded
leans, gilded faces, combos and jokers. `fight:` is the only crossing. The
Descent finds what the Lots spend.

This repo currently holds the **constitution** — the law the agent factory
builds under. There is no engine, no content and no shell yet.

## the constitution

| file | what it governs |
| --- | --- |
| [AGENTS.md](AGENTS.md) | how a card gets worked. One card, one PR; acceptance first; bounce, never guess |
| [.llm/rules/](.llm/rules) | engineering law as ten glob-scoped rules; CI enforces it |
| [GAME.md](GAME.md) | ratified mechanics — the frame, the tap law, stats, slots, dice-stand combat, the death loop |
| [VISION.md](VISION.md) | why the mechanics are what they are. **Pre-ratification** — GAME.md wins where they differ |
| [VOCAB.md](VOCAB.md) | the Descent's closed word set: gates and deltas |
| [GRAMMAR.md](GRAMMAR.md) | the Lots' closed language, the combat manifest, and the F1–F7 fairness laws |
| [LAWS.md](LAWS.md) | content fairness, written as lint clauses rather than taste |
| [CANON.md](CANON.md) | the world, the narrator's voice, the knowledge tiers |
| [CLAUDE.md](CLAUDE.md) | Claude-specific notes on top of AGENTS.md |
| [.claude/skills/](.claude/skills) | the paved paths: `engine`, `content`, `grammar` |

## the two ideas the rest hangs off

**Everything is a closed language.** The Descent speaks VOCAB, the Lots speaks
GRAMMAR, and an unknown word fails at load rather than silently at play. A new
word is an amendment card — one word, its tests, its lint — never an inline
special case. This is what keeps two engines and a content pipeline from
drifting into each other.

**All combat content is data.** Dice, faces, jokers, spells, skills and enemy
rules live in `grammar.yaml`; engine code knows pipeline hooks and effect verbs
and nothing else. Adding a die is a data edit. If it takes an engine change,
the abstraction has already failed — and the F-laws run as CI over every
manifest change, so a balance claim is proved by ten thousand seeded fights
rather than asserted.

## not here yet

Referenced by the documents above but not in the repo:

- **`TRUTH.md`** — the spoilered truth, tiered. `CANON.md` and `LAWS.md`
  (#spoiler) both cite it; content tiers cannot be linted without it.
- **`GENERATOR.md`, `MVP.md`, `P0.md`** — the maze law, the slice definition,
  and the phase plan.
- **`grammar.yaml`** and `experiments/` — the combat manifest the F-laws run over.
- **`tasks/`** — the cards. `AGENTS.md` is a procedure for working a card, and
  there are none.
- **`scripts/`, `src/`, `tests/`, `content/`, `package.json`** — the factory
  tooling and everything it builds.

Nothing here is enforced yet: there is no `npm run law` to run, because there is
no `package.json`. The rules describe a CI that does not exist. That is the next
thing to build, not an oversight.
