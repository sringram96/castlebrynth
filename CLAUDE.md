# CLAUDE.md

Castle Brynth — a text world built card by card by agents. Phase P0
builds the atom: *present → tap → act → delta → present*, headless.

## before you touch anything

Read **AGENTS.md**. It is the operating law and it is short. In
particular: you work exactly one card from `tasks/`, you run your
acceptance test *before* you write code, and you never edit anything in
`tests/acceptance/`.

## commands

```bash
npm run law        # typecheck + lint + unit tests + task-lint + content-lint — the only "green"
npm run board      # which cards are READY (deps met, acceptance red)
npm run progress   # the nine cards, green/red
npm run build:content   # content/*.yaml → content/bundle.json
npm run play       # play the atom in a terminal
```

Node 20 (`.nvmrc`). `nvm use` before anything.

## layout

```
src/core/      the engine — pure, JSON-safe, deterministic (.llm/rules/purity.mdc and state-is-json.mdc)
content/       *.yaml authored scenes → bundle.json (compiled, committed)
scripts/       build-content, content-lint, task-lint, board, progress, play
tasks/         the cards — one yaml per card, with scope and deps
tests/acceptance/   definition of done, authored ahead of the cards
```

## the shape of the thing

`GameState` is data: `{scene, flags, items, journal, refused, rng, seed}`.
It survives `JSON.stringify` and `structuredClone` unchanged. There is no
object graph, no engine instance, no hidden generator — `seedRng`/
`nextInt` thread the RNG through as a plain uint32.

The engine is three functions (`src/core/api.ts`):

```ts
newRun(seed, bundle) → GameState
act(state, ref, input?) → { state, effects }
getView(state) → View
```

P1's UI will consume only those three. Nothing else is public.

Content resolution: an action holds an **ordered** response list; the
**first** response whose gate passes wins; its deltas apply in **VOCAB.md
order**, not file order. The last response must be a gateless fallback.

## the one behaviour that matters

The book refuses, then the book opens. Tap `book.read` with no
`knows_glyph` and the world refuses and ledgers it. Study the stone.
Tap the same action again and it opens, and the journal gains
`procession`. Same tap, different world. That is the atom, and
`tests/acceptance/H000.root.test.ts` is its proof.

## gotchas

- Deltas apply in VOCAB order. Two authors, same result. Do not "fix"
  this to file order.
- `refuse` is pure — a response with `refuse` carries no other delta.
- Object sets change only via `addObject`/`removeObject`, never as a
  side effect of a flag (LAWS.md §affordance).
- `act` and `getView` do not mutate. Inputs are frozen in tests.
