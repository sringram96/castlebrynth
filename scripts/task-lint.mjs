// task-lint.mjs — the queue gate. A card that fails here never reaches Ready.
// Checks: schema, unique ids, deps exist + acyclic, sane scopes, and the
// parallelism guarantee: no two cards share a path unless one depends
// (transitively) on the other.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

const dir = path.join(process.cwd(), "tasks");
const files = readdirSync(dir).filter((f) => f.endsWith(".yaml"));
const errors = [];
const cards = new Map();

const REQUIRED = ["id", "title", "goal", "context", "deps", "scope", "non_goals", "allows_deps", "acceptance"];

for (const f of files) {
  let c;
  try { c = parse(readFileSync(path.join(dir, f), "utf8")); }
  catch (e) { errors.push(`${f}: YAML parse error — ${e.message}`); continue; }

  for (const k of REQUIRED) if (!(k in c)) errors.push(`${f}: missing field "${k}"`);
  if (!/^[HLD]\d{3}$/.test(c.id ?? "")) errors.push(`${f}: id must match [HLD]###`);
  if (cards.has(c.id)) errors.push(`${f}: duplicate id ${c.id}`);
  if ((c.title ?? "").length > 60) errors.push(`${c.id}: title over 60 chars`);
  if (!Array.isArray(c.non_goals) || c.non_goals.length < 1)
    errors.push(`${c.id}: non_goals must list at least one exclusion`);
  if (!Array.isArray(c.scope) || c.scope.length < 1)
    errors.push(`${c.id}: scope must list at least one path`);
  for (const p of c.scope ?? [])
    if (p.includes("..") || path.isAbsolute(p))
      errors.push(`${c.id}: scope path "${p}" must be repo-relative`);
  if (!c.acceptance?.spec?.trim()) errors.push(`${c.id}: acceptance.spec is empty`);
  if (!Array.isArray(c.acceptance?.commands) || c.acceptance.commands.length < 1)
    errors.push(`${c.id}: acceptance.commands must list at least one command`);
  cards.set(c.id, { ...c, file: f });
}

// deps exist + transitive closure (also detects cycles)
const closure = new Map();
function deps(id, seen = new Set()) {
  if (closure.has(id)) return closure.get(id);
  if (seen.has(id)) { errors.push(`dependency cycle through ${id}`); return new Set(); }
  seen.add(id);
  const out = new Set();
  for (const d of cards.get(id)?.deps ?? []) {
    if (!cards.has(d)) { errors.push(`${id}: unknown dep ${d}`); continue; }
    out.add(d);
    for (const dd of deps(d, seen)) out.add(dd);
  }
  closure.set(id, out);
  return out;
}
for (const id of cards.keys()) deps(id);

// scope collisions between order-independent cards break parallelism
const ids = [...cards.keys()];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = cards.get(ids[i]), b = cards.get(ids[j]);
    const shared = a.scope.filter((p) => b.scope.includes(p));
    const related = deps(a.id).has(b.id) || deps(b.id).has(a.id);
    if (shared.length && !related)
      errors.push(`${a.id} and ${b.id} share scope (${shared.join(", ")}) but neither depends on the other`);
  }
}

if (errors.length) {
  console.error(`task-lint: ${errors.length} problem(s)`);
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log(`task-lint: ${cards.size} cards OK — schema, deps, and scopes are clean`);
