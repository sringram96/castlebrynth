// H004 — acceptance. The funnel, end to end.
//
//   content/*.yaml → scripts/build-content.mjs → content/bundle.json
//                                                      ↓
//                                              loadBundle → Bundle
//
// The scoreboard for four claims (the card's acceptance spec):
//   1. building the repo's content yields a bundle the loader accepts
//   2. a fixture with an unknown delta word fails the build, and the
//      failure names the exact path to the offending word
//   3. the compiled shore round-trips deep-equal through JSON
//   4. `npm run build:content` exists and is wired to the compiler
//
// Black-box: this drives the real script over the real content, and
// spawns the real npm script, so the wiring is not a story the test
// tells itself. Fixtures are written to a sandbox under the OS temp
// dir — never into content/, which holds authored canon.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadBundle, validateBundle } from "../../src/core/bundle";
import {
  CARD_DELTA_KEYS,
  CARD_GATE_KEYS,
  CARD_OBJECT_KEYS,
  CARD_SCENE_KEYS,
  CARD_TIERS,
  RESERVED_WORDS,
} from "../../src/core/cards";
import type { Bundle, Delta, Response } from "../../src/core/types";
// The compiler is .mjs on purpose: it runs under plain node, before any
// build step exists. Imported so fixtures can be compiled in process,
// and spawned below so the command-line door is proved too.
// @ts-expect-error — plain JavaScript, deliberately untyped
import { CompileError, DELTA_WORDS, GATE_KEYS, OBJECT_KEYS, RESERVED_WORDS as SCRIPT_RESERVED, SCENE_KEYS, TIERS, build, compileBundle } from "../../scripts/build-content.mjs";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCRIPT = path.join(ROOT, "scripts", "build-content.mjs");
const BUNDLE = path.join(ROOT, "content", "bundle.json");

let sandbox: string;

beforeAll(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), "h004-"));
  // Claim 1 begins here: build the repo's content, for real.
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8" });
});

afterAll(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

/** A whole scene file whose one action's response list is `body`. */
function sceneFile(id: string, body: string): string {
  return [
    `scene: ${id}`,
    "tier: T0",
    `line: "A room. The air does not move."`,
    "objects:",
    "  book:",
    `    tap: "A book, face up on the stone."`,
    "    actions:",
    "      read:",
    ...body.split("\n").map((line) => `        ${line}`),
    "",
  ].join("\n");
}

/** Run the real build over a sandboxed fixture, and hand back what broke. */
function compileFixture(files: Record<string, string>, start?: string): CompileError {
  const dir = mkdtempSync(path.join(sandbox, "case-"));
  for (const [name, source] of Object.entries(files))
    writeFileSync(path.join(dir, name), source, "utf8");
  try {
    build({ dir, out: path.join(dir, "bundle.json"), start });
  } catch (error) {
    return error as CompileError;
  }
  throw new Error("the build did not fail");
}

function compiled(): Bundle {
  return loadBundle(JSON.parse(readFileSync(BUNDLE, "utf8")));
}

function responsesOf(bundle: Bundle, object: string, action: string): readonly Response[] {
  const found = bundle.scenes[bundle.start]?.objects
    .find((o) => o.id === object)
    ?.actions.find((a) => a.id === action);
  if (!found) throw new Error(`no ${object}.${action} in the compiled bundle`);
  return found.responses;
}

function kindsOf(response: Response): readonly string[] {
  return response.deltas.map((delta: Delta) => delta.kind);
}

// ---------------------------------------------------------------------
// 1 — the repo's content compiles, and the loader takes it
// ---------------------------------------------------------------------

describe("H004 · building the repo's content yields a bundle the loader accepts", () => {
  it("writes content/bundle.json", () => {
    expect(() => readFileSync(BUNDLE, "utf8")).not.toThrow();
  });

  it("loads without a fault", () => {
    const raw: unknown = JSON.parse(readFileSync(BUNDLE, "utf8"));
    expect(validateBundle(raw)).toBeNull();
    const bundle = loadBundle(raw);
    expect(bundle.start).toBe("shore");
    expect(Object.keys(bundle.scenes)).toContain("shore");
  });

  it("carries the shore across whole: five objects, both lines", () => {
    const shore = compiled().scenes.shore!;
    expect(shore.id).toBe("shore");
    expect(shore.enter).toContain("Cold shingle");
    expect(shore.line).toContain("The shore");
    expect(shore.objects.map((o) => o.id).sort()).toEqual(
      ["book", "path", "pool", "self", "stone"].sort(),
    );
    for (const object of shore.objects)
      expect(object.line.length, object.id).toBeGreaterThan(0);
  });

  it("keeps the book's law: three responses, the last gateless and refusing", () => {
    const read = responsesOf(compiled(), "book", "read");
    expect(read).toHaveLength(3);

    const fallback = read[read.length - 1]!;
    expect(fallback.gates).toBeUndefined();
    expect(kindsOf(fallback)).toEqual(["say", "refuse"]);

    const opened = read.find((r) => r.gates?.flags?.includes("knows_glyph"))!;
    expect(kindsOf(opened)).toEqual(["say", "set", "journal"]);
  });

  it("emits deltas in VOCAB.md order, however the author laid them out", () => {
    const bundle = compiled();
    // shore.yaml writes `refuse:` above `say:`; VOCAB.md orders say first.
    expect(kindsOf(responsesOf(bundle, "book", "read")[2]!)).toEqual(["say", "refuse"]);

    const words = CARD_DELTA_KEYS as readonly string[];
    for (const scene of Object.values(bundle.scenes))
      for (const object of scene.objects)
        for (const action of object.actions)
          for (const response of action.responses) {
            const positions = kindsOf(response).map((kind) => words.indexOf(kind));
            expect(positions, `${object.id}.${action.id}`).toEqual(
              [...positions].sort((a, b) => a - b),
            );
          }
  });

  it("drops the authored tier: the engine's Scene has no such field", () => {
    for (const scene of Object.values(compiled().scenes))
      expect(Object.keys(scene).sort()).toEqual(["enter", "id", "line", "objects"]);
  });

  it("compiles the same bytes twice — the build is deterministic", () => {
    const once = readFileSync(BUNDLE, "utf8");
    execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf8" });
    expect(readFileSync(BUNDLE, "utf8")).toBe(once);
  });
});

// ---------------------------------------------------------------------
// 2 — an unknown word fails the build, with the path to it
// ---------------------------------------------------------------------

describe("H004 · an unknown delta word fails the build, path-precise", () => {
  it("names the file and the exact path to the offending word", () => {
    const broken = compileFixture({
      "bad.yaml": sceneFile("bad", `- say: "It opens."\n  shout: true`),
    });
    expect(broken).toBeInstanceOf(CompileError);
    expect(broken.where).toMatch(/bad\.yaml: objects\.book\.actions\.read\[0\]\.shout$/);
    expect(broken.message).toContain("shout");
    expect(broken.message).toContain("VOCAB.md");
  });

  it("points at the offending response, not merely the action", () => {
    const broken = compileFixture({
      "bad.yaml": sceneFile(
        "bad",
        [
          `- if: { flags: [knows_glyph] }`,
          `  say: "The mark again."`,
          `- say: "It opens."`,
          `  counter: 2`,
        ].join("\n"),
      ),
    });
    expect(broken.where).toContain("objects.book.actions.read[1].counter");
  });

  it("refuses VOCAB.md's reserved words by name", () => {
    for (const word of RESERVED_WORDS) {
      const broken = compileFixture({
        "bad.yaml": sceneFile("bad", `- say: "It opens."\n  ${word}: true`),
      });
      expect(broken.where, word).toContain(`objects.book.actions.read[0].${word}`);
      expect(broken.message, word).toContain("reserved");
    }
  });

  it("refuses an unknown gate key, object key, and scene key", () => {
    expect(
      compileFixture({
        "bad.yaml": sceneFile("bad", `- if: { depth: 2 }\n  say: "It opens."`),
      }).where,
    ).toContain("objects.book.actions.read[0].if.depth");

    expect(
      compileFixture({
        "bad.yaml": `scene: bad\ntier: T0\nline: "A room."\nobjects:\n  book:\n    tap: "A book."\n    smell: "damp"\n`,
      }).where,
    ).toContain("objects.book.smell");

    expect(
      compileFixture({
        "bad.yaml": `scene: bad\ntier: T0\nline: "A room."\nmap: north\nobjects: {}\n`,
      }).where,
    ).toContain("bad.yaml: map");
  });

  it("refuses a response that says nothing (VOCAB.md: say is always present)", () => {
    const broken = compileFixture({
      "bad.yaml": sceneFile("bad", `- set: [knows_glyph]`),
    });
    expect(broken.where).toContain("objects.book.actions.read[0]");
    expect(broken.message).toContain("say");
  });

  it("refuses a tier CANON.md does not know", () => {
    const broken = compileFixture({
      "bad.yaml": sceneFile("bad", `- say: "It opens."`).replace("tier: T0", "tier: T9"),
    });
    expect(broken.where).toContain("bad.yaml: tier");
    expect(broken.message).toContain("T9");
  });

  it("refuses a malformed delta payload at the sub-key", () => {
    const broken = compileFixture({
      "bad.yaml": sceneFile(
        "bad",
        `- say: "It opens."\n  addObject: { scene: bad, object: cairn }`,
      ),
    });
    expect(broken.where).toContain("read[0].addObject.cause");
  });

  it("fails the whole build over one bad file", () => {
    const broken = compileFixture({
      "good.yaml": sceneFile("good", `- say: "It opens."`),
      "bad.yaml": sceneFile("bad", `- say: "It opens."\n  shout: true`),
    });
    expect(broken.where).toContain("bad.yaml");
  });

  it("exits non-zero and says so on stderr when run as a command", () => {
    const dir = mkdtempSync(path.join(sandbox, "cli-"));
    writeFileSync(
      path.join(dir, "bad.yaml"),
      sceneFile("bad", `- say: "It opens."\n  shout: true`),
      "utf8",
    );
    const run = spawnSync(process.execPath, [SCRIPT, "--in", dir], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain("objects.book.actions.read[0].shout");
    // A failed build elsewhere leaves the repo's bundle as it was.
    expect(validateBundle(JSON.parse(readFileSync(BUNDLE, "utf8")))).toBeNull();
  });

  it("refuses to guess where a run starts, and says how to be told", () => {
    const two = {
      "one.yaml": sceneFile("one", `- say: "It opens."`),
      "two.yaml": sceneFile("two", `- say: "It opens."`),
    };
    const broken = compileFixture(two);
    expect(broken.message).toContain("--start");
    expect(broken.message).toContain("one");
    expect(broken.message).toContain("two");
    expect(compileFixture(two, "three").message).toContain("not a scene here");
  });

  it("takes the start it is given", () => {
    const dir = mkdtempSync(path.join(sandbox, "start-"));
    writeFileSync(path.join(dir, "one.yaml"), sceneFile("one", `- say: "It opens."`), "utf8");
    writeFileSync(path.join(dir, "two.yaml"), sceneFile("two", `- say: "It opens."`), "utf8");
    const out = path.join(dir, "bundle.json");
    build({ dir, out, start: "two" });
    const bundle = loadBundle(JSON.parse(readFileSync(out, "utf8")));
    expect(bundle.start).toBe("two");
    expect(Object.keys(bundle.scenes).sort()).toEqual(["one", "two"]);
  });
});

// ---------------------------------------------------------------------
// 3 — the compiled shore round-trips deep-equal through JSON
// ---------------------------------------------------------------------

describe("H004 · the compiled shore round-trips through JSON", () => {
  it("is deep-equal to itself after a trip through the text", () => {
    const bundle = compiled();
    const again = JSON.parse(JSON.stringify(bundle));
    expect(again).toEqual(bundle);
    expect(loadBundle(again)).toEqual(bundle);
  });

  it("is byte-identical after a trip through the text (RULES.md 2)", () => {
    const raw = readFileSync(BUNDLE, "utf8");
    const bundle: unknown = JSON.parse(raw);
    expect(`${JSON.stringify(bundle, null, 2)}\n`).toBe(raw);
  });

  it("holds nothing JSON cannot: no undefined, no NaN, no Date", () => {
    const seen: unknown[] = [JSON.parse(readFileSync(BUNDLE, "utf8"))];
    while (seen.length) {
      const value = seen.pop();
      if (value === null) continue;
      if (Array.isArray(value)) seen.push(...value);
      else if (typeof value === "object") seen.push(...Object.values(value!));
      else if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
      else expect(["string", "boolean"]).toContain(typeof value);
    }
  });
});

// ---------------------------------------------------------------------
// 4 — npm run build:content exists and is wired
// ---------------------------------------------------------------------

describe("H004 · npm run build:content is wired", () => {
  it("names the compiler in package.json", () => {
    const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["build:content"]).toBe("node scripts/build-content.mjs");
  });

  it("runs, and the loader takes what it wrote", () => {
    const run = spawnSync("npm", ["run", "--silent", "build:content"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toContain("shore");
    expect(validateBundle(JSON.parse(readFileSync(BUNDLE, "utf8")))).toBeNull();
  });
});

// ---------------------------------------------------------------------
// both ends of the funnel speak one language
// ---------------------------------------------------------------------

describe("H004 · the compiler and the schema agree on the words", () => {
  it("carries VOCAB.md's delta words, in VOCAB.md order", () => {
    expect(DELTA_WORDS).toEqual([...CARD_DELTA_KEYS]);
  });

  it("carries the same gate keys, object keys, scene keys, tiers, reserved words", () => {
    expect(GATE_KEYS).toEqual([...CARD_GATE_KEYS]);
    expect(OBJECT_KEYS).toEqual([...CARD_OBJECT_KEYS]);
    expect(SCENE_KEYS).toEqual([...CARD_SCENE_KEYS]);
    expect(TIERS).toEqual([...CARD_TIERS]);
    expect(SCRIPT_RESERVED).toEqual([...RESERVED_WORDS]);
  });

  it("compiles in memory to exactly what it writes to disk", () => {
    const source = readFileSync(path.join(ROOT, "content", "shore.yaml"), "utf8");
    const built = compileBundle([{ file: "content/shore.yaml", doc: parseYaml(source) }], {});
    expect(built).toEqual(JSON.parse(readFileSync(BUNDLE, "utf8")));
  });
});
