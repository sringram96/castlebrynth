# AGENTS.md — how a card gets worked

You have been given exactly one card: a file in `tasks/`. Read it, read
the documents it names, and work only it. These laws are absolute and
they outrank your judgement about what the repo needs.

## law 1 · one card

You work the card you were given. You do not fix the neighbouring bug,
tidy the adjacent file, or start the next card because it is obvious.
Anything outside your card's `scope` is off limits — `task-lint` will
fail you for touching it (.llm/rules/scope.mdc), and it is right to.

If working your card requires a change outside your scope, **stop** and
say so in the PR body. That is a finding, not a failure.

## law 2 · acceptance first

Before you write a line of code, run your card's acceptance test.

```bash
npx vitest run tests/acceptance/<YOUR>.test.ts
```

If it is **already green**, you are done. Change nothing. Report
`already satisfied` and open no code diff. This is not a trick and it is
not laziness — a card whose acceptance passes on arrival is a card whose
work was carried by a dependency, and the correct output is the
observation.

If it is red, you now know exactly what done means. Read the failure
before you read the card again.

## law 3 · the acceptance test is not yours

You may not edit, skip, weaken, retitle, or delete anything in
`tests/acceptance/`. Not to "make it match the implementation", not to
fix a typo. If it is wrong, say so in the PR and stop.

Your own tests go beside your code: `src/core/rng.test.ts`.

## law 4 · the vocabulary is closed

Content speaks only VOCAB.md (.llm/rules/vocabulary.mdc). If your card needs a word
that is not there, you do not add it — you stop and say so. The
vocabulary is one of the three frozen things in P0 and it does not move
for a single card.

## law 5 · leave the tree green

`npm run law` must pass before you open the PR. Not "pass except for a
pre-existing failure" — if it was red when you arrived, say that in the
PR as the first line, then decide whether your card can honestly proceed.

## law 6 · report what you actually did

The PR body says what you changed, what you ran, and what came back. If
a test is flaky, say flaky. If you could not verify something, say you
could not verify it. A card reported green that is not green costs the
next five cards their afternoon.

Never describe work you did not do.

## the loop

```bash
git checkout -b factory/H00X
npx vitest run tests/acceptance/H00X.<name>.test.ts   # law 2 — first
# ... work the card, inside scope ...
npm run law                                           # law 5
npx vitest run tests/acceptance/H00X.<name>.test.ts   # green
```

Then open one PR, titled `H00X · <card title>`, body per law 6.

## the documents

| file | what it governs |
| --- | --- |
| `.llm/rules/` | engineering law — CI enforces it |
| `VOCAB.md` | the closed gate/delta word set |
| `LAWS.md` | the world's promises to the person in it |
| `CANON.md` | voice; banned words are scanned |
| `P0.md` | the phase: what is being built and why |
