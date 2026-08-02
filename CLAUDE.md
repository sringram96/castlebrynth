# CLAUDE.md

The law for all agents in this repo lives in **AGENTS.md**. Follow it exactly.

## the shape of the thing

**castlebrynth** is a still-frame, tap-driven dungeon-crawl roguelike for
phones. Two engines, one doorway:

- **the Descent** — navigation and investigation. Forward-only pushes through
  drawn rooms; free-tap examination; doors sensed two or three ahead, never a
  map. Speaks `VOCAB.md`.
- **the Lots** — dice combat and everything it spends. A hand of five bones plus
  a chosen signature die; loaded leans, gilded faces, combos, jokers. Speaks
  `GRAMMAR.md`.

`fight:` is the only crossing between them. The Descent finds what the Lots
spend.

## Claude-specific notes

- Skills are in `.claude/skills/` — your card's `context` names which apply
  (`skill:engine`, `skill:content`, `skill:grammar`).
- Run `npm run law` before opening any PR; run your card's acceptance commands
  **before** writing code (idempotency, AGENTS.md law 2).
- Commit small, present tense. Never rebase, amend, or force-push.
- Node 20 (`.nvmrc`). If `node --version` reports v14, the toolchain will fail
  in ways that look like code errors — fix the runtime first.

## the documents

| file | what it governs |
| --- | --- |
| `AGENTS.md` | how a card gets worked — read this first |
| `.llm/rules/` | engineering law; CI enforces it |
| `GAME.md` | ratified mechanics — cited by anchor (`#input`, `#combat`) |
| `VISION.md` | why the mechanics are what they are; pre-ratification design state |
| `VOCAB.md` | the Descent's closed word set |
| `GRAMMAR.md` | the Lots' closed language, the manifest, and F1–F7 |
| `LAWS.md` | content fairness, written as lint clauses |
| `CANON.md` | the world, the voice, the knowledge tiers |
| `TRUTH.md` | SPOILERS — the whole story, tiered |

`GAME.md` is ratified law. `VISION.md` is rationale and is explicitly
**pre-ratification** — where the two disagree, `GAME.md` wins and the
difference is a question, not a licence.

## the traps this repo has already fallen into

Worth knowing before you write, because each of these cost a phase:

- **A validator that rejects its own output.** If the compiler and the loader
  both pass through one gate, what the compiler writes must be something that
  gate accepts a second time.
- **An acceptance test with two fixtures that contradict each other.** No
  implementation can satisfy both, and the agent that finds it is right to stop.
- **A file in one card's scope and its module in another's.** The card that must
  change the module cannot reach the test that forbids the change.
- **Prose matched with `search()`.** It finds the first occurrence, so a line
  emitted twice reads as a pass.
