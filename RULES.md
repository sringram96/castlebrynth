# RULES.md — engineering law (CI-enforced)

1. **Purity.** `src/core` has no DOM, no I/O, no Capacitor, no `Date`,
   no `Math.random`, no `console`. It imports only `src/core`.
2. **Determinism.** Randomness enters as RNG state on GameState; drawing
   returns value + next state. Same seed, same run, forever. GameState
   survives structuredClone and JSON round-trip.
3. **Vocabulary closure.** The resolve engine implements the gates and
   deltas in VOCAB.md — all of them, only them. Unknown words fail at
   load time, never silently at play time.
4. **Cards are data.** All game content is YAML in `content/` through
   the content linter. No rules in the shell, no content in the engine.
5. **Testing.** Unit tests co-located (`src/**/*.test.ts`), run by the
   `law` job, always green. Acceptance tests (`tests/acceptance/`) are
   the scoreboard, red until their card lands, never a merge gate.
6. **No takebacks.** Nothing grants a reroll or cancels a landed die.
7. **Affordance (engine side).** Objects enter or leave scenes only via
   `addObject`/`removeObject` deltas carrying a `cause`. Nothing else
   may alter a scene's object set. (Design law: LAWS.md #affordance.)
8. **Saves.** Persist only the versioned envelope from `save.ts`;
   loading an unknown version returns null, never throws.
