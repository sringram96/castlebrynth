# tasks/ — the queue

Card schema (YAML, one per file, `<ID>-slug.yaml`): `id` (`[HLD]###` —
`H` for the engine and shell waves, `L` for the Lots, `D` for the
Descent), `title` (≤60), `goal` (2–5 sentences), `context` (docs/skills
to read), `deps` (card ids), `scope` (only paths the agent may touch),
`non_goals` (≥1), `allows_deps` (runtime deps permitted, usually []),
`acceptance.spec` (prose contract) and `acceptance.commands`
(executable definition of done). `scripts/task-lint.mjs` enforces all
of it, plus: deps exist and are acyclic, and no two cards share scope
unless one depends on the other.
