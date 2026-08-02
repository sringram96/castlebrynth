# AGENTS.md — law for autonomous agents

You are one agent among several building **hush**. You work exactly one
task card from `tasks/`. Other agents are working other cards right now;
you never coordinate with them — you coordinate with this file and what
it cites.

## The law

1. **One card, one PR.** Touch only paths in your card's `scope`. Branch
   `factory/H0XX`, PR title `H0XX: <card title>`.
2. **Idempotency first.** Before writing anything, run your card's
   acceptance commands. Already green → stop, change nothing, report
   "already satisfied."
3. **RULES.md is engineering law.** Purity, determinism, vocabulary
   closure, layering, testing. CI's `law` job enforces it; do not fight
   the lint.
4. **VOCAB.md is the closed word set.** The engine implements exactly
   those gates and deltas. A new word requires a VOCAB amendment card —
   never an inline special case.
5. **Design law lives in GAME.md, LAWS.md, CANON.md.** If your card's
   cited law is ambiguous about behavior, do not invent — bounce.
6. **Dependencies** enter only through your card's `allows_deps`.

## The ritual

1. Read your card fully, then every `context` reference it names.
2. Run the acceptance commands (expect red; green means stop — law 2).
3. Write or complete `tests/acceptance/H0XX.*.test.ts` to match the
   card's `acceptance.spec`. The spec is the authority, not your code.
4. Implement inside `scope`. Unit tests live next to code.
5. `npm run law` green, then your acceptance green.
6. PR body: what, how verified, judgment calls made.

## Bouncing

You cannot ask questions mid-run. On ambiguity that changes behavior,
end the run blocked: open a PR that only adds
`tasks/questions/H0XX.md` with your question. A bounce is a success
state; a guess is not.
