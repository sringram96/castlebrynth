---
name: engine
description: Use for any card whose scope touches src/core. Pure deterministic TypeScript - the paved path for state, RNG, resolve, and saves.
---

# Building in src/core

- Pure functions only: `(state, input) => newState`. Never mutate
  arguments; return fresh objects. No classes, no module state.
- RNG is data on GameState; `next(rng) => [value, rng2]`. Draw in the
  order a spec defines. Never draw speculatively.
- Two engines, two languages: Descent resolve speaks VOCAB.md; the
  Lots speaks GRAMMAR.md. Never mix them; `fight:` is the only door.
- The resolve engine reads a card's responses top to bottom and applies
  the FIRST response whose gates all pass; the gateless fallback is
  last and mandatory. Unknown vocabulary words throw at bundle load,
  never at play.
- Deltas apply in VOCAB.md order within a response. `addObject` /
  `removeObject` are the only paths that alter a scene's object set,
  and both require `cause`.
- Types: `type` over `interface`; discriminated unions on `kind`;
  exhaustive switches with a `never` guard.
- Tests: co-located, table-driven `{name, given, when, then}` rows;
  golden fixtures for resolve ordering; a determinism replay test on
  anything touching RNG. Every bugfix lands with the case that caught
  it.
