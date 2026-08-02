# AGENTS.md — law for autonomous agents (v2)

You are one agent among several building **castlebrynth**. You work exactly one
task card from `tasks/`. You coordinate with this file and what it cites —
never with other agents.

## the law

1. **One card, one PR.** Touch only your card's `scope`. Branch
   `factory/<ID>`, PR title `<ID>: <title>`. `task-lint` compares your diff to
   the scope and fails on anything outside it — that is what makes a whole wave
   safe to merge in any order.
2. **Idempotency first.** Run your card's acceptance before writing anything.
   Green → stop, change nothing, report **"already satisfied."** That is a
   correct outcome, not a failure: it means a dependency carried the work, and
   the observation is the deliverable.
3. **`.llm/rules/` is engineering law** — purity, determinism, the two closed
   languages, manifest discipline, layering, the F-laws, testing, no-takebacks,
   the two ledgers, saves. CI's `law` job enforces it; do not fight the lint.
4. **Design law:** `GAME.md` (ratified mechanics), `VISION.md` (rationale),
   `LAWS.md` (content fairness), `CANON.md` (voice and tiers), `TRUTH.md`
   (spoilers, tiered). Ambiguity that changes behaviour → **bounce**, never
   guess.
5. **Two languages, one doorway.** The Descent speaks `VOCAB.md`; the Lots
   speaks `GRAMMAR.md`; `fight:` is the only crossing. Never mix them.
6. **Combat content goes in the manifest, never in engine code.** A new die,
   joker, face or enemy rule is a `grammar.yaml` edit plus tests. A new effect
   verb or pipeline hook is an engine amendment card — rare and loud.
7. **Dependencies** enter only through your card's `allows_deps`. A card that
   adds one owns `package.json` **and** `package-lock.json`; CI runs `npm ci`
   and fails on a lock that has drifted.
8. **The acceptance test is not yours.** Never edit, weaken, skip or delete
   anything under `tests/acceptance/`. The card's `acceptance.spec` is the
   authority, not your code.

## the ritual

Read the card → read every `context` reference it names → run the acceptance
(expect red) → write or complete the acceptance to match the card's spec →
implement inside scope → `npm run law` green, including the F-laws when the
manifest changed → your acceptance green → **merge** → PR body: what, how
verified, judgment calls made.

Do not stop at a commit. A card left unmerged starves everything downstream of
it, and the next agent has no way to know why its dependency is missing.

## bouncing

You cannot ask questions mid-run. On an ambiguity that changes behaviour, end
the run **blocked**: a PR adding only `tasks/questions/<ID>.md`, and nothing
else.

**A bounce is a success state; a guess is not.** This is worth believing rather
than merely obeying — the expensive failures on this project have all been
guesses that looked reasonable, and the cheap ones have all been bounces.

If your acceptance test looks self-contradictory, if a law is silent on the
case in front of you, if the card's scope cannot contain the work it describes:
bounce. Do not widen the scope, do not soften the test, do not invent the word.

## what never changes

The first tap is free (`GAME.md` #input) — it describes and surfaces actions,
and never advances the world. Objects change only by delta with a cause
(`LAWS.md` #affordance). Dice land and stand (`.llm/rules/dice.mdc`). Same
seed, same run (`.llm/rules/determinism.mdc`). Death touches the run ledger
only (`.llm/rules/ledgers.mdc`).
