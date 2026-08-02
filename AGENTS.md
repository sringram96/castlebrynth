# AGENTS.md — law for autonomous agents

You are one agent among several building **castlebrynth**. You work exactly
one task card from `tasks/`. Other agents are working other cards right now;
you never coordinate with them — you coordinate with this file and what it
cites.

## The law

1. **One card, one PR.** Touch only paths in your card's `scope`. Branch
   `factory/<id>`, PR title `<id> · <card title>`. `task-lint` compares your
   diff to the scope and fails on anything outside it — that is what makes a
   whole wave safe to merge in any order.
2. **Idempotency first.** Before writing anything, run your card's acceptance
   commands. Already green → stop, change nothing, report **"already
   satisfied."** That is a correct and valuable outcome, not a failure — it
   means a dependency carried the work, and the observation is the output.
3. **`.llm/rules/` is engineering law.** Purity, determinism, vocabulary
   closure, layering, testing, no-takebacks, affordance, saves. CI's `law` job
   enforces it; do not fight the lint.
4. **`VOCAB.md` is the closed word set.** The engine implements exactly those
   gates and deltas. A new word requires a **VOCAB amendment card** — never an
   inline special case.
5. **Design law lives in `GAME.md`, `LAWS.md`, `CANON.md`, and `TRUTH.md`.**
   If your card's cited law is ambiguous about behaviour, do not invent —
   bounce.
6. **Dependencies** enter only through your card's `allows_deps`. A card that
   adds a dependency owns `package.json` **and** `package-lock.json`; CI runs
   `npm ci` and fails on a lock that has drifted.
7. **The acceptance test is not yours.** Never edit, weaken, skip or delete
   anything under `tests/acceptance/`. If one looks wrong, bounce and say so.

## The ritual

1. Read your card fully, then every `context` reference it names.
2. Run the acceptance commands (expect red; green means stop — law 2).
3. Implement inside `scope`. Unit tests live next to code.
4. `npm run law` green, then your acceptance green.
5. Commit, merge to main, and confirm `law` still green there. **Do not stop
   at a commit** — a card left unmerged starves everything downstream of it.
6. PR body: what, how verified, judgment calls made.

## Bouncing

You cannot ask questions mid-run. On an ambiguity that changes behaviour, end
the run **blocked**: add `tasks/questions/<id>.md` with your question, and
nothing else.

**A bounce is a success state; a guess is not.** This has been proven here
more than once — an agent found a self-contradictory acceptance test and
refused to proceed rather than "fix" it, and three agents in a row hit the
same blocked scope and reported it instead of working around it. Each time the
bounce cost a round trip and saved a silently broken build.

## What never changes

The first tap is free (`GAME.md` #input). Objects change only by delta with a
cause (`.llm/rules/affordance.mdc`). Dice land and stand
(`.llm/rules/dice.mdc`). Same seed, same run
(`.llm/rules/determinism.mdc`).
