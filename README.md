# castlebrynth

A text world, built card by card by agents.

Castle Brynth is old, quiet, and indifferent to you. Phase **P0** builds the
atom of it — *present → tap → act → delta → present* — headless, with no UI,
proven by one behaviour:

> **The book refuses, then the book opens.**

Tap `book.read` on the shore and the world refuses, and remembers being
asked. Study the stone. Tap the same action again and it opens, and your
journal gains the procession. Same tap, different world. That is the whole
thesis, and [`tests/acceptance/H000.root.test.ts`](tests/acceptance/H000.root.test.ts)
is its proof.

## running it

Node 20 (`.nvmrc`).

```bash
npm install
npm run law        # typecheck + lint + unit tests + task-lint — the only "green"
npm run board      # which cards are ready to dispatch
npm run progress   # the cards, green or red
npm run play       # play the atom in a terminal
```

## how it gets built

Work arrives as **cards** in [`tasks/`](tasks). One agent takes one card,
works only the paths that card declares, and opens one PR. The acceptance
tests are authored *ahead* of the cards and no agent may edit them — they are
the definition of done, not a thing to negotiate with.

```bash
git checkout -b factory/H002
claude -p "Work exactly one card: tasks/H002-rng.yaml. Follow AGENTS.md to the letter." --max-turns 60
npm run law && npx vitest run tests/acceptance/H002.rng.test.ts
```

`task-lint` compares the diff to the card's declared scope and fails on
anything outside it. That is what makes a whole wave of agents safe to merge
in any order: within a wave, scopes are disjoint by construction.

## the documents

| file | what it governs |
| --- | --- |
| [AGENTS.md](AGENTS.md) | how a card gets worked — read this first |
| [RULES.md](RULES.md) | engineering law; CI enforces it |
| [VOCAB.md](VOCAB.md) | the closed gate/delta word set content may speak |
| [LAWS.md](LAWS.md) | the world's promises to the person inside it |
| [CANON.md](CANON.md) | the voice; banned words are scanned |
| [P0.md](P0.md) | this phase — what is being built, and why |

Three things are frozen and expensive to change: **VOCAB.md**, the
**GameAPI**, and **RULES.md**. Everything else is disposable.

## the shape of it

```
src/core/           the engine — pure, JSON-safe, deterministic
content/            *.yaml scenes → bundle.json
scripts/            build-content, content-lint, task-lint, board, progress, play
tasks/              the cards
tests/acceptance/   the definition of done
```

`GameState` is seven keys of plain data: `{scene, flags, items, journal,
refused, rng, seed}`. It survives `JSON.stringify` and `structuredClone`
unchanged. Randomness is state as data — `seedRng`/`nextInt` thread a uint32
through, so the same seed and the same taps are the same run, forever, on any
machine.
