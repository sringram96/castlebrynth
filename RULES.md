# RULES.md — the engineering law

CI enforces this. `npm run law` is the same command locally and in the
`law` job, and it is the only definition of "green".

## 1 · purity and determinism

`src/core` is pure. No I/O, no `Date`, no `Math.random`, no module-level
mutable state, no `process`. Everything the engine needs is in the
`GameState` it was handed.

Randomness is state as data: `seedRng(seed)` produces an `Rng`, and
`nextInt(rng, n)` returns `[k, rng2]`. There is no hidden generator. Two
runs from one seed and one tap list are byte-identical.

`act` and `getView` never mutate their arguments. They return new state.
The acceptance suite deep-freezes inputs and will catch you.

## 2 · state is JSON

`GameState` survives `JSON.parse(JSON.stringify(s))` and
`structuredClone(s)` unchanged, deep-equal. That means no `Set`, no
`Map`, no `Date`, no class instances, no `undefined` members. Collections
are arrays kept in insertion order; membership helpers live beside the
types.

## 3 · the closed vocabulary

Content may use only the words in VOCAB.md. `build-content` fails on any
other key and the error **names the path** to the offending node:

```
content/shore.yaml: objects.book.read[0].setFlagg — unknown vocabulary word
```

A message that does not name the path is a failing build message.

## 4 · scope

Every card declares the paths it may touch. `task-lint` compares the
working diff to the card's `scope` and fails on anything outside it. This
is what makes a wave of agents safe to merge in any order: within a wave,
scopes are disjoint by construction.

Touching a file outside your card's scope is a failed card, even if the
change is correct and the tests pass.

## 5 · tests

- **Co-located unit tests** (`src/core/foo.test.ts`) — yours, write as
  many as you like.
- **Acceptance tests** (`tests/acceptance/*.test.ts`) — **not yours.**
  They are the card's definition of done and they are authored before the
  card is dispatched. You may not edit, skip, relax, or delete one.

If an acceptance test looks wrong, stop and say so in the PR. Do not fix
it.

## 6 · types

`strict` TypeScript. No `any`, no `as` casts to force a shape, no
`@ts-expect-error` in `src/`. If the types fight you, the model is wrong
— change the model, in a card that owns it.

## 7 · no dead scaffolding

Do not add a dependency, a config, an abstraction layer, or a "we'll need
this later" export. P0 is nine cards long. Build the ninth card's needs
in the ninth card.
