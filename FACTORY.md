# FACTORY.md — what is seed, what is a card

The methodology's one razor, for anyone cutting tasks.

## the three-prong test (ask of any would-be file)

1. **Taste?** Could two competent agents produce different versions,
   both defensibly correct? Then it encodes a CHOICE — it is LAW.
   Law precedes work; agents can only be consistent with taste, never
   supply it. Law may be DRAFTED by agents or AI, but only a human
   signature freezes it (the human's irreducible job is signing, not
   typing).
2. **Ritual dependency?** Does the agents' own ritual consume it
   (law runner, board, card schema, linter)? Then it is BOOTSTRAP
   SEED — it cannot be card #1's output, because card #1 cannot run
   without it.
3. **Blast radius?** Wrong deliverable = one broken card. Wrong law =
   every citing card silently corrupted. High fan-in ⇒ constitution
   (amendment cards only). Low fan-in ⇒ deliverable (churns freely).

## consequences

- Everything may live on the board — LAW lives there as HUMAN-LANE
  ratification tasks (e.g. L000); deliverables are factory-lane.
  The lane tag IS the delineation.
- Guardrails are not overhead; they are the compiler for tasks. Each
  ratified law converts a category of judgment calls into checkable
  work forever (TRUTH.md → tier lint → story content becomes factory
  work).
- Failure both directions: under-seed → constant bounces or, worse,
  silent taste-drift by guessing. Over-seed → hand-written
  implementations, decorative factory.
- Equilibrium: SEED = constitution + bootstrap toolchain + phase
  scope. EVERYTHING else is a card.

## this repo, decomposed

Law: GAME · VISION · GRAMMAR · TRUTH · CANON · LAWS · RULES · VOCAB ·
AGENTS · CLAUDE · MVP · P0 · skills/. Bootstrap: package.json ·
scripts/ · eslint · tsconfig · CI. Queue mirror: tasks/. Spec
exhibit: mock/slice-mvp.html. Deliverables (correctly absent until
their cards land): src/ · grammar.yaml · content beyond fixtures.
