# AGENTS.md — how work happens

## the queue
All work is Asana tasks in project 1217090587861739 — READY =
incomplete, all dependency links complete, LANE: factory (never pick
up LANE: human or milestones). The task's notes are the spec: GOAL,
SCOPE, DEPS, DONE WHEN. Implementation detail, work split, and
parallelism live on the board, not in this repo.

## the ritual
1. Read the task; read the DESIGN.md sections it cites; read every
   .llm/rules/ file matching the areas you will touch.
2. Idempotency first: run the task's DONE WHEN check before writing.
   Already green → comment "already satisfied" and complete the task.
3. Touch only the task's SCOPE. One task, one change.
4. `npm run law` green + the task's check green before landing.
5. Land: PR preferred (`factory/<id>` branch); if auth blocks PRs,
   direct commit to main is allowed ONLY with law + the task's check
   re-run on the integrated tree, one task per commit, never force,
   never amend.
6. Complete the Asana task with a one-line comment: what landed, how
   verified. COMPLETE, NEVER DELETE — deletions strand dependency
   links.
7. Every PR body opens with `Task: <ID>` and a `Scope:` bullet list of
   the paths from the task's SCOPE (a directory entry covers all files
   beneath it); CI's scope-guard fails any PR changing a file outside
   it.

## bouncing
Ambiguity that changes behavior → do not guess. Comment the question
on the Asana task, leave it incomplete, move on. A good bounce is a
success state.

## the perspectives (differing views, forced convergence)
Every substantial change gets a second set of eyes from a DIFFERENT
role before landing. Roles:
- BUILDER — default implementer; owns the task end to end.
- DESIGN'S ADVOCATE — checks the change against DESIGN.md letter and
  spirit; flags drift.
- SYSTEMS — fairness math, determinism, degenerate-combo hunting;
  owns sim evidence.
- UX — one-thumb mobile, legibility, tap targets, art laws on screen.
- RED TEAM — kills complexity; hunts contradictions between the
  change, DESIGN.md, and the board.
- PLAYTESTER — plays the build (Playwright, 390x844 + 320x568 spot),
  screenshots key beats to playtests/<date>/, checks the free-tap
  law, tap sizes, readability; files findings as NEW Asana tasks;
  never fixes anything. Dispatched after any change to UI or content.
Reviewer disagreement → converge in the PR; if you cannot, bounce to
the human with both positions stated in one comment.

## rules and skills are earned
When a mistake recurs or a pattern stabilizes, propose a rule: a PR
adding one short .llm/rules/<area>.md (or a .claude/skills/ entry for
a repeatable procedure). Rules are written AFTER the lesson, never
before. Cite the rule files you obeyed in your PR description.
