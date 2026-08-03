// castlebrynth · the content lint — the walk that carries every authored file
// to the compiler, and the exit code that stops a bad one landing.
//
// THIS FILE ENFORCES NOTHING OF ITS OWN. Every rule it reports is already
// `loadRoom`'s (src/core/cards.ts) reached through `compileRoom`
// (src/core/compile.ts): unknown vocabulary fails at LOAD, and `goto` names a
// door DECLARED by the room you are standing in. TWO VALIDATORS THAT CAN
// DISAGREE IS WORSE THAN ONE (compile.ts says it first), so this file adds no
// check a card can already answer and re-words no message the loader wrote.
//
// What it adds is the two things the compiler structurally cannot do:
//
//   · THE REACH. src/core is pure — no DOM, no I/O, no Date, no Math.random, no
//     console (.llm/rules/engine.md) — so `compileRoom` is handed `{ file, text }`
//     and never a path. Somebody has to open the files. This is that somebody,
//     and it lives in scripts/ for exactly that reason.
//   · THE VERDICT. A problem an author never sees is not a lint. This prints
//     every problem in the form cards.ts wrote it (`formatProblem`) and exits
//     non-zero, which is what wires it into `npm run law`.
//
// ────────────────────────────────────────────────── the two directories ──
//
// content/rooms/     the game's content. Compiled as a SET, because two files
//                    claiming one room id is invisible from inside either one
//                    (compile.ts `compileRooms`). Must be clean.
// content/fixtures/  authored wrong on purpose, and never drawn by a build.
//                    Each one must still FAIL, and its problems are printed
//                    rather than swallowed — a fixture is a claim about what
//                    the loader says, and a claim nobody reads rots. A fixture
//                    that quietly starts compiling is a check that has gone
//                    missing, so it fails this lint as loudly as a bad room.
//
// ─────────────────────────────────────────────── what is DEFERRED, by ruling ──
//
// H005's decision record (ratified, 2026-08-02) holds this to MINIMAL scope:
// unknown vocabulary, and `goto` naming a declared door of the CURRENT room as
// a DECLARATION-PRESENCE check. Named here so their absence reads as a decision:
//
//   cross-room graph   where a door leads, whether a gate's key is reachable in
//                      the push, whether the graph is acyclic — D002's, which
//                      binds doors at draw time and owns door correctness at
//                      runtime. Nothing here follows a door out of a room.
//   the law battery    DESIGN §content laws lists eleven. Gate satisfiability,
//                      softlock walks and death-pays-per-depth are properties of
//                      a POOL and a GRAPH, not of a file, and they are deferred
//                      past H180 rather than half-built here.
//   two with no home   "telegraphed harm" and "no pixel hunts" cannot be checked
//                      at all yet, and not because nobody wrote the code: a card
//                      carries no position and no size, so no lint can measure a
//                      tap target (cards.ts, "geometry"), and whether a free tap
//                      telegraphs the burn below it is a prose question about
//                      two strings. Both want schema that does not exist. They
//                      are filed, not forgotten.
//   prose and tier     scanning a line against the card's declared tier, and the
//                      banned-word list (DESIGN §world & voice), want the same
//                      prose pass and are not in skeleton scope.

import { readFile, readdir } from "node:fs/promises";
import { registerHooks } from "node:module";
import { join, relative, sep } from "node:path";

// ────────────────────────────────────────────────────── reaching into src/core ──
//
// The compiler is TypeScript and this is a plain Node script, which Node 22
// handles by stripping the types as it loads (package.json `engines`, and the
// CI job pins the same major). One thing it does not handle: src/ is written
// for a bundler and imports without file extensions (`./cards`), which is
// `tsconfig.json`'s `moduleResolution: "bundler"` and not something to churn
// twenty files over. So relative specifiers with no extension are pointed at
// the `.ts` file here, at the door, and nothing inside src/ changes shape to
// suit a script.
registerHooks({
  resolve(specifier, context, next) {
    const bare = specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier);
    return next(bare ? `${specifier}.ts` : specifier, context);
  },
});

if (process.features.typescript === false || process.features.typescript === undefined) {
  console.error(
    "content lint: this Node cannot read TypeScript, so the compiler cannot be " +
      "loaded. package.json asks for Node >= 22 and CI runs 22; you are on " +
      `${process.version}.`,
  );
  process.exit(1);
}

const { formatProblem } = await import("../src/core/cards.ts");
const { compileRoom, compileRooms } = await import("../src/core/compile.ts");

// ───────────────────────────────────────────────────────────────── the walk ──

const ROOMS = "content/rooms";
const FIXTURES = "content/fixtures";

const root = join(import.meta.dirname, "..");

/**
 * Every YAML file under one directory, as a repo-relative path.
 *
 * Two things it is careful about, and both are so that a problem says the same
 * thing everywhere. Sorted, because `readdir` order is the filesystem's and a
 * lint that reports its problems in a different order on a different machine is
 * a lint people learn to skim. And written with forward slashes whatever the
 * platform's separator is, because the path is not for opening a file with — it
 * is the `file` field of a `Problem` (cards.ts), which an author reads, a
 * fixture header quotes, and a test compares.
 */
async function yamlFiles(directory) {
  const entries = await readdir(join(root, directory), {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".yaml"))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .sort();
}

/** One authored file, as `compileRoom` wants it: its name, and its text. */
async function source(file) {
  return { file, text: await readFile(join(root, file), "utf8") };
}

const problemsOf = (result) => (result.ok ? [] : result.problems);

// ─────────────────────────────────────────────────────────────── the verdict ──

let failed = false;

const rooms = await Promise.all((await yamlFiles(ROOMS)).map(source));
const fixtures = await Promise.all((await yamlFiles(FIXTURES)).map(source));

console.log(
  `content lint · ${rooms.length} room${rooms.length === 1 ? "" : "s"}, ` +
    `${fixtures.length} fixture${fixtures.length === 1 ? "" : "s"}`,
);

// The content. Compiled as a set: a duplicate room id is a fact about the
// directory, not about any file in it.
const compiled = compileRooms(rooms);
const roomProblems = problemsOf(compiled);
if (roomProblems.length > 0) {
  failed = true;
  console.error(`\n${ROOMS} — ${roomProblems.length} problem(s):`);
  for (const problem of roomProblems) console.error(`  ${formatProblem(problem)}`);
} else {
  console.log(`\n${ROOMS} — clean`);
  for (const { file } of rooms) console.log(`  ${file}`);
}

// The fixtures. Each is compiled ALONE — they are not a set and they are not
// content — and each must have something wrong with it.
console.log(`\n${FIXTURES} — every one refused, as authored:`);
for (const { file, text } of fixtures) {
  const problems = problemsOf(compileRoom(file, text));
  if (problems.length === 0) {
    failed = true;
    console.error(
      `  ${file}: COMPILES CLEAN, and it is authored to fail. Either the check ` +
        `it stands for has gone missing from the loader, or the file was ` +
        `repaired — a fixture is repaired by deleting it, never by fixing it.`,
    );
    continue;
  }
  for (const problem of problems) console.log(`  ${formatProblem(problem)}`);
}

if (failed) {
  console.error("\ncontent lint: FAILED");
  process.exit(1);
}
console.log("\ncontent lint: green");
