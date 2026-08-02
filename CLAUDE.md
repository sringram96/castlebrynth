# CLAUDE.md

The law for all agents in this repo lives in **AGENTS.md**. Follow it
exactly.

Claude-specific notes:
- Skills are in `.claude/skills/` — your card's `context` names which
  apply (`skill:engine`, `skill:content`).
- Run `npm run law` before opening any PR; run your card's acceptance
  commands before writing code (idempotency, AGENTS.md law 2).
- Commit small, present tense. Never rebase, amend, or force-push.
