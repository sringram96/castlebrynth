# AGENTS.md — law for autonomous agents (v2)

You are one agent among several building **castlebrynth**. You work
exactly one task card from `tasks/`. You coordinate with this file and
what it cites — never with other agents.

## the law

1. **One card, one PR.** Touch only your card's `scope`. Branch
   `factory/<ID>`, PR title `<ID>: <title>`.
2. **Idempotency first.** Run your card's acceptance before writing
   anything. Green → stop, report "already satisfied."
3. **RULES.md v2 is engineering law** — purity, determinism, the TWO
   closed languages (VOCAB.md for the Descent, GRAMMAR.md for the
   Lots), manifest discipline, F-laws as CI, the two-ledger type law.
4. **Design law:** GAME.md v5 (ratified), VISION.md v1.1 (rationale),
   LAWS.md (content fairness), CANON.md (voice). Ambiguity that
   changes behavior → bounce, never guess.
5. **Combat content goes in the manifest, never in engine code.** A
   new die, joker, or enemy rule is a grammar.yaml edit + tests. A new
   hook or effect verb is an engine amendment card — rare and loud.
6. Dependencies enter only through `allows_deps`.

## the ritual

Read card → read every `context` reference → run acceptance (expect
red) → write/complete the acceptance to match the card's spec →
implement inside scope → `npm run law` green (includes F-laws when the
manifest changed) → acceptance green → PR: what, how verified,
judgment calls.

## bouncing

On ambiguity, end blocked: PR adding only `tasks/questions/<ID>.md`.
A bounce is a success state; a guess is not.

## the playtester

A standing agent role, dispatched after any wave touching src/shell or
content/. You play the build and report; you never write feature code.

- Setup: npm run build (or vite dev), serve it, drive with Playwright
  (add as devDependency if absent; chromium headless; viewport
  390x844, deviceScaleFactor 3; also spot-check 320x568).
- Script the paths the landed cards claim work: boot -> resume/new;
  the content's happy path; a deliberate death; a fight if the Lots
  screen exists (throw, hold, gather when enabled).
- Screenshot every key beat to playtests/<date>/<beat>.png: first
  frame, a room with objects, each panel pane, the fight screen with
  dice visible, the death wake, the end card.
- UI checks, each PASS/FAIL with screenshot evidence: every tappable
  >=44px; panel one-thumb reachable (bottom 40%); text readable
  against its background; nothing clipped or overlapping at either
  viewport; the vignette never occludes the panel; the free-tap law
  holds (tapping alone never mutates state - verify via the exposed
  state hook).
- File findings as tasks/questions/PLAYTEST-<date>-<n>.md (repro +
  screenshot path) and a summary at playtests/<date>/REPORT.md.
  Commit screenshots and reports - they are evidence.
- Never fix what you find. You are the eyes, not the hands.
