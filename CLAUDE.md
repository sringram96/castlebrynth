# CLAUDE.md

**castlebrynth** — a still-frame, tap-driven dungeon-crawl roguelike for
phones. You wake in a dead portal chamber with no memory, and a labyrinth
leads down.

## before you touch anything

Read **AGENTS.md**. It is the operating law and it is short: you work exactly
one card from `tasks/`, you run your acceptance *before* you write code, you
never edit `tests/acceptance/`, and on real ambiguity you **bounce** rather
than guess.

The design constitution is **GAME.md** (cited by anchor, e.g. `#input`,
`#combat`). **LAWS.md** is fairness as eleven lintable statements.
**CANON.md** is the world and the voice; **TRUTH.md** is the spoilered truth,
tiered — content at tier N may not reference tier N+1. **GENERATOR.md** is how
the maze is laid.

## commands

```bash
npm run law        # typecheck + lint + unit tests + task-lint + content-lint — the only "green"
npm run board      # which cards are READY
npm run progress   # the scoreboard: acceptance per card, red until its card lands
npm run build:content   # content/*.yaml → content/bundle.json
npm run play       # play in a terminal
npm run dev        # the shell, in a browser
```

Node 20 (`.nvmrc`). The system `node` on this machine is v14 and cannot run
the toolchain — `nvm use` first, or prefix with the v20 bin path.

## the shape

```
src/core/     the engine — pure, deterministic, JSON-safe. Imports only src/core.
src/shell/    the screen. Consumes GameAPI and nothing else.
content/      *.yaml rooms → bundle.json (compiled, committed)
scripts/      build-content · content-lint · task-lint · board · progress · play
tasks/        the cards. tasks/questions/ is where a bounce lands.
tests/acceptance/   the scoreboard, authored ahead of the cards
```

`GameState` is seven keys of plain data — `{scene, flags, items, journal,
refused, rng, seed}` — surviving `JSON.stringify` and `structuredClone`
unchanged. Randomness is state as data: `seedRng`/`nextInt` thread a uint32
through, so the same seed and the same taps are the same run, forever.

The engine is three functions (`src/core/api.ts`): `newRun(seed, bundle)`,
`act(state, ref, input?)`, `getView(state)`. The shell consumes only those.

## the vocabulary is closed

Content speaks only `VOCAB.md`: gates `flags:` / `items:`, deltas `say` `set`
`give` `take` `journal` `refuse` `goto` `addObject` `removeObject` `end`.
Resolution takes the **first response whose gate passes**; deltas apply in
**VOCAB order**, not file order; every action ends in a gateless fallback.

`contest`, `dropObols`, `prompt`, `roll`, `counter` and `lies` are **reserved**
— dice, death, QTEs, chance gates, economies and sanity each arrive as their
own amendment card. Do not implement or use them.

## gotchas

- `refuse: true` implies no other delta fired. A refusal changes nothing but
  the ledger.
- `addObject`/`removeObject` are scene-scoped and carry a `cause`. Nothing else
  moves an object set.
- The first tap is always free — it describes and surfaces actions, never
  advances the world. Risk lives in the explicit investigation actions.
- `act` and `getView` never mutate. The acceptance suite deep-freezes inputs.

## history

`P0.md` and `P1.md` record the two phases already built — the engine, and the
shell on a phone. They describe an earlier design (v3) whose world has been
retired; the method they document is still exactly how this is built.
