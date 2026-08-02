# RULES.md — engineering law v2 (CI-enforced)

1. **Purity.** src/core: no DOM, I/O, Date, Math.random, console;
   imports only core.
2. **Determinism.** All randomness (room draws, lean-weighted casts)
   flows from RNG state on GameState; state survives JSON round-trip.
3. **Two closed languages.** The Descent speaks VOCAB.md (gates +
   deltas). The Lots speaks GRAMMAR.md (hooks + effect verbs).
   Unknown words fail at load, never at play. New words = amendment
   cards only.
4. **Manifest discipline.** All combat content (dice, leans, gilded
   faces, jokers, spells, skills, enemy rules, economy toggles) lives
   in grammar.yaml + experiments overlays. Engine code never names a
   specific die or joker.
5. **Cards are data.** All Descent content is YAML through
   content-lint. No rules in the shell, no content in engines.
6. **F-laws are CI.** F1–F7 (GRAMMAR.md) run as lint + sim on every
   PR touching the manifest; red F-law blocks merge.
7. **Testing.** Unit tests co-located, green in law; acceptance tests
   are the scoreboard, red-until-built, never a merge gate.
8. **No takebacks.** Nothing rerolls or cancels a landed die,
   anywhere, ever.
9. **Two ledgers in the type system.** Run-scoped vs campaign-scoped
   state are distinct branches of GameState; death code may only
   touch the run branch (lintable import/field rule).
10. **Saves.** Versioned envelope only; unknown versions parse to
    null, never throw.
