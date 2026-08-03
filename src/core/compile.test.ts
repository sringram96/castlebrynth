/// <reference types="vite/client" />
// H004 · the content compiler, asserted.
//
// The card's DONE WHEN is two halves and they are the first two blocks below:
//   1. the good fixture compiles — content/rooms/tallow-store.yaml, the file
//      src/core/cards.test.ts has always named, read off disk as an author
//      wrote it and coming out the other side as a typed `RoomCard`;
//   2. three bad fixtures each fail POINTEDLY, and each fails differently in
//      kind — an unknown word, a whole-card law, and the file itself.
//
// After those: the file-level checks nothing downstream can make, and the one
// multi-file check nothing inside a single card can make.
//
// The fixtures are read with vite's `?raw`, the way src/lots/manifest.test.ts
// reads grammar.yaml. That is the seam on purpose: `compileRoom` is handed the
// TEXT, never a path, because src/core does no I/O (.llm/rules/engine.md).
// Whoever walks the directory is the shell's, and this test stands in for it.
//
// Nothing here re-tests `loadRoom`. src/core/cards.test.ts owns the closed
// vocabulary, the ledger prefixes and the whole-card laws; what is asserted
// here is that a FILE reaches that loader intact, and that what the loader says
// comes back with the file's name on it, unaltered.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { formatProblem, loadRoom } from "./cards";
import type { Problem, RoomCard } from "./cards";
import { compileRoom, compileRooms } from "./compile";
import tallowStoreSource from "../../content/rooms/tallow-store.yaml?raw";
import unknownWordSource from "../../content/fixtures/bad-unknown-word.yaml?raw";
import sealedDoorSource from "../../content/fixtures/bad-sealed-door.yaml?raw";
import duplicateKeySource from "../../content/fixtures/bad-duplicate-key.yaml?raw";

const TALLOW_STORE = "content/rooms/tallow-store.yaml";
const UNKNOWN_WORD = "content/fixtures/bad-unknown-word.yaml";
const SEALED_DOOR = "content/fixtures/bad-sealed-door.yaml";
const DUPLICATE_KEY = "content/fixtures/bad-duplicate-key.yaml";

/** Every problem one file produced, as an author reads them. */
const faults = (file: string, text: string): readonly string[] => {
  const result = compileRoom(file, text);
  return result.ok ? [] : result.problems.map(formatProblem);
};

const problemsOf = (file: string, text: string): readonly Problem[] => {
  const result = compileRoom(file, text);
  return result.ok ? [] : result.problems;
};

/** The compiled card, or a failure loud enough to read. */
const cardOf = (file: string, text: string): RoomCard => {
  const result = compileRoom(file, text);
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join("\n"));
  return result.card;
};

// ─────────────────────────────────────────────── 1 · the good fixture compiles ──

describe("H004 · the good fixture compiles", () => {
  it("reads the tallow store off disk with nothing to report", () => {
    expect(faults(TALLOW_STORE, tallowStoreSource)).toStrictEqual([]);
    expect(compileRoom(TALLOW_STORE, tallowStoreSource).ok).toBe(true);
  });

  it("hands back a typed RoomCard — the annotation is the assertion", () => {
    // If the compiler's return type ever stops being a room card, `tsc --noEmit`
    // fails and this file never runs. What is left is that it is a real room and
    // not an empty shell.
    const card: RoomCard = cardOf(TALLOW_STORE, tallowStoreSource);
    expect(card.id).toBe("room:tallow-store");
    expect(card.tier).toBe("T0");
    expect(card.still).toBe("still:tallow-store");
    expect(card.doors).toHaveLength(3);
    expect(Object.keys(card.objects)).toStrictEqual([
      "vat",
      "ladle",
      "bench",
      "hatch",
      "stair",
      "near-door",
    ]);
  });

  it("carries the words through, not just the shape", () => {
    // A compiler that returned `{}` for every file would pass a shape test. The
    // beats of the room are asserted instead: the risk, the ratchet, the cause,
    // and the door.
    const card = cardOf(TALLOW_STORE, tallowStoreSource);
    const reach = card.objects["vat"]?.actions?.["reach"];
    expect(reach).toHaveLength(2);
    const took = reach?.[1];
    expect(took?.adjust).toStrictEqual({ hp: -1 });
    expect(took?.set).toStrictEqual(["flag:vat-opened", "knowledge:things-kept-in-tallow"]);
    expect(took?.give).toStrictEqual([{ id: "item:greased-key", keep: "none" }]);

    // `latent: true` and `cross_push: true` survive as booleans, not as the
    // strings YAML could have handed over.
    expect(card.objects["hatch"]?.latent).toBe(true);
    const lift = card.objects["hatch"]?.actions?.["lift"];
    expect(lift?.[0]?.if).toStrictEqual({ flags: ["knowledge:tallow-seal"], cross_push: true });
    expect(lift?.[1]?.refuse).toBe(true);

    // The ladle leaves once, with a cause, and nothing puts it back.
    const take = card.objects["ladle"]?.actions?.["take"];
    expect(take?.[0]?.removeObject).toStrictEqual({
      object: "ladle",
      cause: "the ladle is out of the vat",
    });
  });

  it("keeps the colons in ids, which is the one thing YAML could have eaten", () => {
    // Every id in this game carries a colon — `room:`, `door:`, `still:`,
    // `item:`, and the two ledger prefixes `flag:` and `knowledge:`. A colon is
    // YAML's key indicator, so this is the trap worth an assertion of its own:
    // in a flow sequence, `[flag:vat-opened]` must stay one string and must not
    // become the map `{ flag: vat-opened }`.
    const card = cardOf(TALLOW_STORE, tallowStoreSource);
    const set = card.objects["vat"]?.actions?.["reach"]?.[1]?.set;
    expect(set?.every((flag) => typeof flag === "string")).toBe(true);
    expect(card.doors.map((door) => door.id)).toStrictEqual([
      "door:stair-down",
      "door:lamp-corridor",
      "door:under-floor",
    ]);
    expect(card.objects["stair"]?.actions?.["go"]?.[0]?.goto).toBe("door:stair-down");
  });

  it("compiles to plain JSON — nothing from the parser survives the door", () => {
    // A bundle is written to disk and read back. A Map, a Date or a class from
    // the YAML layer would not survive that round trip, and would be found on
    // the far side of a build rather than here (types.ts, "THE STATE IS JSON").
    const card = cardOf(TALLOW_STORE, tallowStoreSource);
    expect(JSON.parse(JSON.stringify(card))).toStrictEqual(card);
  });
});

// ──────────────────────────────────── 2 · three bad fixtures, each pointed ──
//
// Three failures, different in KIND: a word that does not exist, a law about
// the whole card, and a file that is not one clean document. Each names the
// file and the key path, so the fix needs no engine source.

describe("H004 · bad fixture 1 — an unknown word", () => {
  it("names the file, the key path and the word", () => {
    const problems = problemsOf(UNKNOWN_WORD, unknownWordSource);
    expect(problems).toHaveLength(1);
    const problem = problems[0] as Problem;
    expect(problem.file).toBe(UNKNOWN_WORD);
    expect(problem.path).toBe("objects.brazier.actions.reach[0].harm");
    expect(problem.message).toContain('unknown response word "harm"');
    // `harm` was a delta word before H009. The message must carry the whole
    // vocabulary, so the fix is in the message rather than in cards.ts.
    expect(problem.message).toContain("adjust");
    expect(problem.message).toContain("A new word is its own Asana task");
    expect(formatProblem(problem)).toBe(
      `${UNKNOWN_WORD}: objects.brazier.actions.reach[0].harm — ${problem.message}`,
    );
  });
});

describe("H004 · bad fixture 2 — a law about the whole card", () => {
  it("names the door nothing walks through, at the door's own key path", () => {
    // Nothing in this file is misspelled and no line of it is wrong on its own.
    const problems = problemsOf(SEALED_DOOR, sealedDoorSource);
    expect(problems).toHaveLength(1);
    const problem = problems[0] as Problem;
    expect(problem.file).toBe(SEALED_DOOR);
    expect(problem.path).toBe("doors[2].id");
    expect(problem.message).toContain('"door:sump" is sensed but nothing goes through it');
    expect(problem.message).toContain("no softlocks");
  });
});

describe("H004 · bad fixture 3 — the file, not the card", () => {
  /** 1-based line of the second `tap:` — computed, so editing the file's header
   *  comment cannot make this assertion lie. */
  const secondTapLine = (): number => {
    const lines = duplicateKeySource.split("\n");
    const at: number[] = [];
    lines.forEach((line, index) => {
      if (line.trimStart().startsWith("tap:")) at.push(index + 1);
    });
    expect(at).toHaveLength(2);
    return at[1] as number;
  };

  it("refuses a repeated key, and says which line to open", () => {
    const problems = problemsOf(DUPLICATE_KEY, duplicateKeySource);
    expect(problems).toHaveLength(1);
    const problem = problems[0] as Problem;
    expect(problem.file).toBe(DUPLICATE_KEY);
    // A syntax fault has no key path to point at — the keys are what did not
    // parse — so the root is the honest path and the location is in the words.
    expect(problem.path).toBe("");
    expect(problem.message).toContain(
      `Map keys must be unique at line ${secondTapLine()}, column 5`,
    );
    expect(problem.message).toContain("yaml DUPLICATE_KEY");
    expect(problem.message).toContain("the second value wins silently");
    expect(formatProblem(problem)).toBe(`${DUPLICATE_KEY}: (root) — ${problem.message}`);
  });

  it("is the check nothing downstream can make — a lenient parse loads it clean", () => {
    // This is the whole argument for the layer. Parse the same file with the
    // uniqueness check off and the two keys collapse into one: the card is
    // legal, `loadRoom` has nothing to report, and the line the author wrote
    // first is not in the data for anything to find.
    const lenient: unknown = parse(duplicateKeySource, { uniqueKeys: false });
    const hidden = loadRoom(DUPLICATE_KEY, lenient);
    expect(hidden.ok ? [] : hidden.problems.map(formatProblem)).toStrictEqual([]);
    expect(hidden.ok).toBe(true);
    // Same bytes, through the compiler: refused.
    expect(compileRoom(DUPLICATE_KEY, duplicateKeySource).ok).toBe(false);
  });
});

// ────────────────────────────── what only the file layer can see ──

describe("H004 · the file itself", () => {
  const FILE = "content/rooms/probe.yaml";

  it("refuses a file with no document in it", () => {
    for (const empty of ["", "   \n", "# a note, and nothing else\n"]) {
      const problems = problemsOf(FILE, empty);
      expect(problems).toHaveLength(1);
      expect(problems[0]?.path).toBe("");
      expect(problems[0]?.message).toContain("holds no YAML document");
    }
  });

  it("refuses a file holding more than one document", () => {
    const two = `${tallowStoreSource}\n---\n${tallowStoreSource}`;
    const problems = problemsOf(FILE, two);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain("holds 2 YAML documents");
    expect(problems[0]?.message).toContain("ONE document in ONE file");
  });

  it("refuses a %YAML 1.1 directive, which changes what the words mean", () => {
    // The Norway problem, and it is not hypothetical: under 1.1 a bare `no` is
    // the boolean false. Proven both ways — the directive really does flip the
    // scalar, and the compiler really does refuse the file that carries it.
    const flipped: unknown = parse("%YAML 1.1\n---\nsense: no", { version: "1.1" });
    expect(flipped).toStrictEqual({ sense: false });

    const problems = problemsOf(FILE, `%YAML 1.1\n---\n${tallowStoreSource}`);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.path).toBe("");
    expect(problems[0]?.message).toContain("declares `%YAML 1.1`");
    expect(problems[0]?.message).toContain("read as YAML 1.2");

    // An explicit `%YAML 1.2` is the version we read anyway, so it is allowed.
    expect(faults(FILE, `%YAML 1.2\n---\n${tallowStoreSource}`)).toStrictEqual([]);
  });

  it("reports every syntax fault at once, not just the first", () => {
    const twice = duplicateKeySource.replace(
      "    actions:\n      go:",
      "    actions:\n      go:\n      go:",
    );
    const problems = problemsOf(FILE, twice);
    expect(problems).toHaveLength(2);
    expect(problems.every((problem) => problem.message.includes("DUPLICATE_KEY"))).toBe(true);
  });

  it("does not read a card out of a file the parser argued with", () => {
    // A tab for indentation: the parser recovers and would hand over a
    // half-built document. Reporting "unknown room key" against it would send
    // an author to fix a line that is only wrong because the parse went
    // sideways, so the card is not read at all.
    const tabbed = "id: room:probe\n\ttier: T0\n";
    const problems = problemsOf(FILE, tabbed);
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain("Tabs are not allowed as indentation");
    expect(problems[0]?.message).toContain("nothing written in it has been checked yet");
  });

  it("hands a document that is not a map straight to the card loader", () => {
    // A list, or a bare scalar, is a perfectly good YAML document and a
    // perfectly bad room card. That sentence is cards.ts's to say, and it says
    // it — this layer adds nothing.
    expect(faults(FILE, "- a\n- b")).toStrictEqual([
      `${FILE}: (root) — a room card is a map of keys, and this is not one`,
    ]);
  });
});

// ────────────────────────── what only the multi-file layer can see ──

describe("H004 · compiling a set of files", () => {
  const sources = [
    { file: TALLOW_STORE, text: tallowStoreSource },
    { file: SEALED_DOOR, text: sealedDoorSource },
  ];

  it("keys the compiled rooms by the id each card declares", () => {
    const result = compileRooms([sources[0] as { file: string; text: string }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.rooms)).toStrictEqual(["room:tallow-store"]);
    expect(result.rooms["room:tallow-store"]?.still).toBe("still:tallow-store");
  });

  it("keys them in sorted order, so the same content compiles to the same bytes", () => {
    const good = [
      { file: TALLOW_STORE, text: tallowStoreSource },
      // The same room under another name is a different id, and sorts first.
      { file: "content/rooms/aa.yaml", text: tallowStoreSource.replace("room:tallow-store", "room:aa") },
    ];
    const forward = compileRooms(good);
    const backward = compileRooms([...good].reverse());
    expect(forward.ok && Object.keys(forward.rooms)).toStrictEqual(["room:aa", "room:tallow-store"]);
    expect(JSON.stringify(forward)).toBe(JSON.stringify(backward));
  });

  it("refuses two files claiming one room id, and names the file that had it first", () => {
    const twice = [
      { file: TALLOW_STORE, text: tallowStoreSource },
      { file: "content/rooms/copy.yaml", text: tallowStoreSource },
    ];
    const result = compileRooms(twice);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.file).toBe("content/rooms/copy.yaml");
    expect(result.problems[0]?.path).toBe("id");
    expect(result.problems[0]?.message).toContain(
      `"room:tallow-store" is already the id of a room, declared in ${TALLOW_STORE}`,
    );
  });

  it("reads every file even after one fails, and every problem names its own file", () => {
    const mixed = [
      { file: UNKNOWN_WORD, text: unknownWordSource },
      ...sources,
      { file: DUPLICATE_KEY, text: duplicateKeySource },
    ];
    const result = compileRooms(mixed);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.map((problem) => problem.file)).toStrictEqual([
      UNKNOWN_WORD,
      SEALED_DOOR,
      DUPLICATE_KEY,
    ]);
  });

  it("compiles nothing out of nothing, without complaint", () => {
    const result = compileRooms([]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.rooms)).toStrictEqual([]);
  });
});
