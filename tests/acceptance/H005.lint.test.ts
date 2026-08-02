// H005 — acceptance. The law walk, over content that breaks it.
//
//   content/*.yaml → build-content.mjs → compiled → content-lint.mjs
//
// The scoreboard for the card's acceptance spec:
//   1. the lint passes on the repo's real content (content/shore.yaml)
//   2. a seeded bad fixture for EACH of the four checks fails, and the
//      failure names the offending card path:
//        · a gate flag (or item) nothing in the content set produces
//        · an action whose responses do not end in a gateless fallback
//        · a `refuse: true` carrying another delta
//        · a CANON.md banned word
//   3. `npm run law` invokes it
//
// Black-box: this drives the real script over the real content and
// spawns the real npm script, so the wiring is not a story the test
// tells itself. Fixtures are written to a sandbox under the OS temp
// dir — never into content/, which holds authored canon.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// The linter is .mjs on purpose: it runs under plain node, in `npm run
// law`, before any build step exists. Imported so fixtures can be
// linted in process, and spawned below so the command-line door is
// proved too.
// @ts-expect-error — plain JavaScript, deliberately untyped
import { BANNED_PHRASES, META_PHRASES, lint } from "../../scripts/content-lint.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCRIPT = path.join(ROOT, "scripts", "content-lint.mjs");
const CONTENT = path.join(ROOT, "content");

/** One complaint: where it is, what is wrong, and the two joined. */
type Problem = { readonly where: string; readonly detail: string; readonly message: string };

let sandbox: string;

beforeAll(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), "h005-"));
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

/**
 * A whole scene file. `objects` is authored YAML, indented into place,
 * so a fixture reads as the thing an author would actually write.
 */
function sceneFile(id: string, objects: string, tier = "T0"): string {
  return [
    `scene: ${id}`,
    `tier: ${tier}`,
    `line: "A room. The air does not move."`,
    "objects:",
    ...objects.split("\n").map((line) => (line ? `  ${line}` : line)),
    "",
  ].join("\n");
}

/** One object, one action, the response list you hand it. */
function oneAction(objectId: string, actionId: string, responses: string): string {
  return [
    `${objectId}:`,
    `  tap: "A book, face up on the stone."`,
    "  actions:",
    `    ${actionId}:`,
    ...responses.split("\n").map((line) => (line ? `      ${line}` : line)),
  ].join("\n");
}

/** The commonest fixture: scene `bad`, object `book`, action `read`. */
function badCard(responses: string, tier = "T0"): Record<string, string> {
  return { "bad.yaml": sceneFile("bad", oneAction("book", "read", responses), tier) };
}

/** Write a fixture to its own sandbox dir and lint it for real. */
function lintFixture(files: Record<string, string>): readonly Problem[] {
  const dir = mkdtempSync(path.join(sandbox, "case-"));
  for (const [name, source] of Object.entries(files))
    writeFileSync(path.join(dir, name), source, "utf8");
  return (lint({ dir }) as { problems: readonly Problem[] }).problems;
}

/** The one complaint whose path ends where it was expected to. */
function problemAt(problems: readonly Problem[], trail: string): Problem {
  const found = problems.filter((problem) => problem.where.endsWith(trail));
  if (found.length !== 1)
    throw new Error(
      `expected exactly one problem at "${trail}", got ${found.length} of ${problems.length}:\n` +
        problems.map((problem) => `  ${problem.message}`).join("\n"),
    );
  return found[0]!;
}

// ---------------------------------------------------------------------
// 1 — the repo's real content is lawful
// ---------------------------------------------------------------------

describe("H005 · the lint passes on the repo's content", () => {
  it("finds nothing to complain about in content/shore.yaml", () => {
    const { cards, problems } = lint({ dir: CONTENT }) as {
      cards: readonly unknown[];
      problems: readonly Problem[];
    };
    expect(problems.map((problem) => problem.message)).toEqual([]);
    expect(cards.length).toBeGreaterThan(0);
  });

  it("exits zero and says so when run as a command", () => {
    const run = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8" });
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("content-lint:");
  });

  it("holds the shore's own gates open: knows_glyph and read_book are set somewhere", () => {
    // The reference scene gates on two flags. If either stopped being
    // settable, check 1 would have to fire — this pins that it can.
    const shore = readFileSync(path.join(CONTENT, "shore.yaml"), "utf8");
    expect(shore).toContain("set: [knows_glyph]");
    expect(shore).toContain("set: [read_book]");
    expect(lintFixture({ "shore.yaml": shore })).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 2a — gate satisfiability (LAWS.md #gates)
// ---------------------------------------------------------------------

describe("H005 · a gate nothing can open fails, naming the card path", () => {
  it("names the file, the response, and the flag", () => {
    const problems = lintFixture(
      badCard(
        [
          `- if: { flags: [never_set] }`,
          `  say: "The mark again."`,
          `- say: "It opens."`,
        ].join("\n"),
      ),
    );
    const problem = problemAt(problems, "objects.book.actions.read[0].if.flags[0]");
    expect(problem.where).toContain("bad.yaml");
    expect(problem.detail).toContain("never_set");
    expect(problem.detail).toContain("LAWS.md #gates");
    expect(problems).toHaveLength(1);
  });

  it("names an item no response gives", () => {
    const problems = lintFixture(
      badCard(
        [
          `- if: { items: [brass_key] }`,
          `  say: "The lock turns."`,
          `- say: "It holds."`,
        ].join("\n"),
      ),
    );
    expect(problemAt(problems, "objects.book.actions.read[0].if.items[0]").detail).toContain(
      "brass_key",
    );
  });

  it("is satisfied by a key produced anywhere in the content set, not just this card", () => {
    const gate = [
      `- if: { flags: [knows_glyph], items: [brass_key] }`,
      `  say: "The mark again."`,
      `- say: "It opens."`,
    ].join("\n");
    const source = [
      `- say: "You put a thumb in the cuts."`,
      `  set: [knows_glyph]`,
      `  give: [brass_key]`,
    ].join("\n");

    // Same card: the key is set by the fallback below the gate.
    expect(
      lintFixture({
        "bad.yaml": sceneFile(
          "bad",
          [oneAction("book", "read", gate), oneAction("stone", "study", source)].join("\n"),
        ),
      }),
    ).toEqual([]);

    // Another card entirely: still produced, so the gate still opens.
    expect(
      lintFixture({
        "one.yaml": sceneFile("one", oneAction("book", "read", gate)),
        "two.yaml": sceneFile("two", oneAction("stone", "study", source)),
      }),
    ).toEqual([]);
  });

  it("does not count unset or take as producing a key", () => {
    const problems = lintFixture(
      badCard(
        [
          `- if: { flags: [knows_glyph] }`,
          `  say: "The mark again."`,
          `- say: "It goes."`,
          `  unset: [knows_glyph]`,
          `  take: [brass_key]`,
        ].join("\n"),
      ),
    );
    expect(problemAt(problems, "read[0].if.flags[0]").detail).toContain("knows_glyph");
  });
});

// ---------------------------------------------------------------------
// 2b — the mandatory fallback (VOCAB.md)
// ---------------------------------------------------------------------

describe("H005 · an action with no gateless fallback fails, naming the card path", () => {
  it("names the action's last response when the list ends on a gate", () => {
    const problems = lintFixture({
      "bad.yaml": sceneFile(
        "bad",
        [
          oneAction(
            "book",
            "read",
            [`- if: { flags: [knows_glyph] }`, `  say: "The mark again."`].join("\n"),
          ),
          oneAction("stone", "study", [`- say: "Cuts, deliberate."`, `  set: [knows_glyph]`].join("\n")),
        ].join("\n"),
      ),
    });
    const problem = problemAt(problems, "objects.book.actions.read[0]");
    expect(problem.where).toContain("bad.yaml");
    expect(problem.detail).toContain("gateless fallback");
    expect(problem.detail).toContain("VOCAB.md");
    expect(problems).toHaveLength(1);
  });

  it("names a gateless response that sits above the end, hiding what follows", () => {
    const problems = lintFixture(
      badCard(
        [
          `- say: "It opens."`,
          `- if: { flags: [never_read] }`,
          `  say: "Again."`,
          `- say: "It holds."`,
          `  set: [never_read]`,
        ].join("\n"),
      ),
    );
    const problem = problemAt(problems, "objects.book.actions.read[0]");
    expect(problem.detail).toContain("nothing below it can ever be read");
    expect(problems).toHaveLength(1);
  });

  it("treats a gate that lists nothing as gateless — it always passes", () => {
    const problems = lintFixture(
      badCard([`- if: {}`, `  say: "It opens."`, `- say: "It holds."`].join("\n")),
    );
    expect(problemAt(problems, "objects.book.actions.read[0]").detail).toContain(
      "VOCAB.md",
    );
  });

  it("says nothing about an action that ends in its fallback", () => {
    expect(
      lintFixture(
        badCard(
          [
            `- if: { flags: [knows_glyph] }`,
            `  say: "The mark again."`,
            `- say: "It opens."`,
            `  set: [knows_glyph]`,
          ].join("\n"),
        ),
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 2c — refuse purity (VOCAB.md: no other delta)
// ---------------------------------------------------------------------

describe("H005 · a refusal that carries a delta fails, naming the card path", () => {
  it("names the offending delta word beside the refusal", () => {
    const problems = lintFixture(
      badCard([`- say: "The ink swims."`, `  refuse: true`, `  set: [read_book]`].join("\n")),
    );
    const problem = problemAt(problems, "objects.book.actions.read[0].set");
    expect(problem.where).toContain("bad.yaml");
    expect(problem.detail).toContain("refuse");
    expect(problem.detail).toContain("VOCAB.md");
    expect(problems).toHaveLength(1);
  });

  it("names every delta riding along, one complaint each", () => {
    const problems = lintFixture(
      badCard(
        [
          `- say: "The ink swims."`,
          `  refuse: true`,
          `  give: [brass_key]`,
          `  journal: procession`,
        ].join("\n"),
      ),
    );
    expect(problems.map((problem) => problem.where.split(": ")[1]).sort()).toEqual([
      "objects.book.actions.read[0].give",
      "objects.book.actions.read[0].journal",
    ]);
  });

  it("says nothing about a refusal that only says (VOCAB.md exempts say)", () => {
    expect(
      lintFixture(badCard([`- say: "The ink swims."`, `  refuse: true`].join("\n"))),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 2d — canon voice (CANON.md #tone)
// ---------------------------------------------------------------------

describe("H005 · a banned word fails, naming the card path", () => {
  it("names the response's say", () => {
    const problems = lintFixture(badCard(`- say: "Suddenly the ink swims."`));
    const problem = problemAt(problems, "objects.book.actions.read[0].say");
    expect(problem.where).toContain("bad.yaml");
    expect(problem.detail).toContain("suddenly");
    expect(problem.detail).toContain("CANON.md");
    expect(problems).toHaveLength(1);
  });

  it("catches every word CANON.md names, case-blind and across a line break", () => {
    for (const { phrase } of BANNED_PHRASES as readonly { phrase: string }[]) {
      // Tier-gated words are proved below; here, T3 content may say them.
      const problems = lintFixture(badCard(`- say: "${phrase.toUpperCase()} in the dark."`));
      expect(problems.length, phrase).toBeGreaterThan(0);
      expect(problems[0]!.detail, phrase).toContain(phrase);
    }
    // "you feel" written across a wrapped YAML line is still "you feel".
    expect(
      lintFixture(badCard([`- say: >-`, `    you`, `    feel the cold.`].join("\n"))),
    ).toHaveLength(1);
  });

  it("catches a meta reference to games, stats, or UI", () => {
    for (const phrase of ["the player", "your hit points", "a menu", "press it on screen"]) {
      const problems = lintFixture(badCard(`- say: "${phrase} waits."`));
      expect(problems.length, phrase).toBeGreaterThan(0);
      expect(problems[0]!.detail, phrase).toContain("meta");
    }
    expect(META_PHRASES.length).toBeGreaterThan(0);
  });

  it("bans the plain name below T3 and permits it at T3", () => {
    const line = `- say: "They will not say devil, and they will not say his name."`;
    const below = lintFixture(badCard(line, "T2"));
    expect(problemAt(below, "objects.book.actions.read[0].say").detail).toContain("T3");
    expect(problemAt(below, "objects.book.actions.read[0].say").detail).toContain("T2");
    expect(lintFixture(badCard(line, "T3"))).toEqual([]);
  });

  it("reads the scene's own lines and every object's free tap", () => {
    const enter = lintFixture({
      "bad.yaml": `${sceneFile("bad", oneAction("book", "read", `- say: "It opens."`))}enter: "Suddenly, cold shingle."\n`,
    });
    expect(problemAt(enter, "bad.yaml: enter").detail).toContain("suddenly");

    const line = lintFixture({
      "bad.yaml": sceneFile("bad", oneAction("book", "read", `- say: "It opens."`)).replace(
        "A room. The air does not move.",
        "A creepy room.",
      ),
    });
    expect(problemAt(line, "bad.yaml: line").detail).toContain("creepy");

    const tap = lintFixture({
      "bad.yaml": sceneFile("bad", oneAction("book", "read", `- say: "It opens."`)).replace(
        "A book, face up on the stone.",
        "A mysterious book.",
      ),
    });
    expect(problemAt(tap, "objects.book.tap").detail).toContain("mysterious");
  });

  it("reads an end card and a diegetic cause, not ids", () => {
    const problems = lintFixture(
      badCard(
        [
          `- say: "It opens."`,
          `  addObject: { scene: bad, object: cairn, cause: "the evil stone shifts" }`,
          `  end: { line: "You go down.", note: "creepy" }`,
        ].join("\n"),
      ),
    );
    expect(problems.map((problem) => problem.where.split(": ")[1]).sort()).toEqual([
      "objects.book.actions.read[0].addObject.cause",
      "objects.book.actions.read[0].end.note",
    ]);
    // An id is not prose: a flag may be named for what it tracks.
    expect(
      lintFixture(
        badCard([`- say: "It opens."`, `  set: [saw_the_evil_thing]`].join("\n")),
      ),
    ).toEqual([]);
  });

  it("does not cry wolf on plain prose that merely contains a banned word", () => {
    // "devil" contains "evil": at T3 the plain name is permitted, and
    // the "evil" ban must not fire inside it.
    expect(
      lintFixture(badCard(`- say: "They speak of the devil plainly now."`, "T3")),
    ).toEqual([]);
    // "state" contains "stat"; "level" alone is not "level up"; a coat
    // may have a button and a lock may click.
    expect(
      lintFixture(
        badCard(
          [
            `- say: "Black water finding its level. The bone button clicks. The state of the lock is bad."`,
            `  journal: procession`,
          ].join("\n"),
        ),
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// 3 — the command-line door, and npm run law
// ---------------------------------------------------------------------

describe("H005 · the linter is a command, and npm run law invokes it", () => {
  it("exits non-zero and names the path on stderr", () => {
    const dir = mkdtempSync(path.join(sandbox, "cli-"));
    writeFileSync(
      path.join(dir, "bad.yaml"),
      badCard([`- say: "The ink swims."`, `  refuse: true`, `  set: [read_book]`].join("\n"))[
        "bad.yaml"
      ]!,
      "utf8",
    );
    const run = spawnSync(process.execPath, [SCRIPT, "--in", dir], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("bad.yaml: objects.book.actions.read[0].set");
    expect(run.stderr).toContain("problem(s)");
  });

  it("names the linter in package.json's law", () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.law).toContain("node scripts/content-lint.mjs");
  });

  it("actually runs inside npm run law", { timeout: 300_000 }, () => {
    const run = spawnSync("npm", ["run", "--silent", "law"], { cwd: ROOT, encoding: "utf8" });
    expect(`${run.stdout}${run.stderr}`).toContain("content-lint:");
    expect(run.status).toBe(0);
  });
});
