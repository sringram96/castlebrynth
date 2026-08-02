// board.mjs — the board is computed, never stored. A card is DONE iff its
// acceptance commands pass right now; READY iff all deps are DONE and it
// isn't; BLOCKED otherwise. Run with --static to skip execution (everything
// treated as not-done) when you just want the dependency picture.
import { readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { parse } from "yaml";

const STATIC = process.argv.includes("--static");
const dir = path.join(process.cwd(), "tasks");
const cards = readdirSync(dir)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => parse(readFileSync(path.join(dir, f), "utf8")))
  .sort((a, b) => a.id.localeCompare(b.id));

function passes(card) {
  if (STATIC) return false;
  for (const cmd of card.acceptance.commands) {
    try {
      execSync(cmd, { stdio: "pipe", timeout: 120_000 });
    } catch {
      return false;
    }
  }
  return true;
}

const done = new Map();
for (const c of cards) {
  process.stdout.write(`checking ${c.id} … `);
  const ok = passes(c);
  done.set(c.id, ok);
  console.log(ok ? "green" : "red");
}

const cols = { DONE: [], READY: [], BLOCKED: [] };
for (const c of cards) {
  if (done.get(c.id)) cols.DONE.push(c);
  else if ((c.deps ?? []).every((d) => done.get(d))) cols.READY.push(c);
  else cols.BLOCKED.push(c);
}

console.log("\n─ board ───────────────────────────────────────");
for (const [name, list] of Object.entries(cols)) {
  console.log(`${name} (${list.length})`);
  for (const c of list) {
    const dep = c.deps?.length ? `  [needs ${c.deps.join(", ")}]` : "";
    console.log(`  ${c.id}  ${c.title}${name === "BLOCKED" ? dep : ""}`);
  }
}
const pct = Math.round((cols.DONE.length / cards.length) * 100);
console.log(`───────────────────────────────────────────────`);
console.log(`progress: ${cols.DONE.length}/${cards.length} cards green (${pct}%)`);
console.log(`dispatchable now in parallel: ${cols.READY.map((c) => c.id).join(", ") || "none"}`);
