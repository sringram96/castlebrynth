// castlebrynth · the content compiler — authored YAML in, typed room cards out.
//
// This is the layer IN FRONT of `loadRoom` (src/core/cards.ts) and nothing
// else. cards.ts is the whole of what a room may say — the closed vocabulary,
// the ledger prefixes, the whole-card laws — and it is already path-precise.
// So this file does not check a card. It TURNS A FILE INTO ONE and hands it
// over, then reports what comes back unchanged.
//
// TWO VALIDATORS THAT CAN DISAGREE IS WORSE THAN ONE. Every check here is one
// cards.ts structurally cannot make, because by the time cards.ts is handed
// data the fact is already gone:
//
//   · a file that is not one clean YAML document — `tap:` written twice on one
//     object parses to ONE key, the second value silently winning, and no card
//     check can see that the first line was ever there;
//   · a file that is no document at all, or more than one;
//   · a `%YAML 1.1` directive, which changes what the SCALARS MEAN under the
//     card's feet (under 1.1 a bare `no` is the boolean false, and a door
//     sensed as "no light" would arrive at cards.ts as `false`);
//   · two files claiming the same room id, which is invisible from inside
//     either one.
//
// Everything else — every unknown word, every missing line, every softlock —
// belongs to `loadRoom`, and its problems are passed through untouched so an
// author reads one voice.
//
// ─────────────────────────────────────────────────────────── purity, and I/O ──
//
// src/core is pure: no DOM, no I/O, no Date, no Math.random, no console
// (.llm/rules/engine.md). So this compiler DOES NOT READ A FILE, and the task's
// "read content/*.yaml" is answered by the caller: whoever walks the directory
// hands in `{ file, text }` pairs and gets cards back. Text to data is
// arithmetic on a string and stays here; opening a file is I/O and stays out.
// It is the same seam `loadRoom` and `loadManifest` already sit behind, and the
// `file` field exists for exactly the same reason it does there — so a problem
// can say where.
//
// ────────────────────────────────────────────────────────────── determinism ──
//
// A run is `seed + deaths + inputs`, exactly (.llm/rules/engine.md), which is a
// claim about the ENGINE and is worth nothing if the content underneath it
// wanders. `compileRooms` therefore keys its output in sorted room-id order
// rather than in whatever order the caller's directory walk produced, so the
// same content compiles to the same bytes on every machine and a compiled
// bundle diffs cleanly.
//
// ───────────────────────────────────────────────── deliberately not here ──
//
//   loadBundle()   `tests/acceptance/H000.root.test.ts` imports it from
//                  `src/core/bundle`, and this file is not that file. It cannot
//                  be: `loadBundle()` takes no arguments, so it must REACH for
//                  content, and reaching is the one thing src/core may not do.
//                  Whoever owns that module owns the reach; see the PR for
//                  H004, which states the case rather than guessing at it.
//   start / depth  `ContentBundle` (types.ts) declares `version` and `start` —
//                  which room the Crossing is — and cards.ts parks depth pools
//                  here too ("which pool a room is drawn into is the bundle's
//                  shape"). Neither is answerable from a room card: no card
//                  says it is the Crossing, and a card that declared its depth
//                  would be a second source of truth. Both want a content-level
//                  declaration that does not exist yet, and inventing one as a
//                  side effect of the room compiler is exactly the quiet edit
//                  .llm/rules/engine.md forbids. `compileRooms` returns the
//                  rooms; assembling a bundle around them is the next card's.

import { parseAllDocuments } from "yaml";
import { loadRoom } from "./cards";
import type { LoadResult, Problem, RoomCard } from "./cards";
import type { Id } from "./types";

/**
 * The YAML version a room card is read as, pinned rather than defaulted.
 *
 * 1.2 is the `yaml` package's default, and the pin is not belt-and-braces: a
 * file may carry a `%YAML 1.1` directive and CHANGE THE SCHEMA under itself.
 * Under 1.1 the plain scalars `no`, `off` and `n` resolve to the boolean false
 * and `yes`, `on`, `y` to true — the Norway problem — so a door sensed as
 * "no light, no sound" would reach cards.ts as `false` and be reported as a
 * missing sense line, at a key path that looks perfectly written on the page.
 * An author must never be sent to hunt a line that is right there. So the
 * version is stated here, and a document that declares a different one is
 * refused BY NAME below.
 */
const YAML_VERSION = "1.2";

/** One authored file: its name, and its text. Nothing here opens it. */
export interface Source {
  /** The path as an author knows it — `content/rooms/tallow-store.yaml`. Used
   *  only so a problem can say where (cards.ts `Problem`). */
  readonly file: string;
  readonly text: string;
}

/** Compiled rooms, keyed by the id each card declares. Plain JSON: a bundle is
 *  written to disk and read back, so no Map and no class survives this door. */
export type RoomCards = { readonly [room: string]: RoomCard };

export type CompileResult =
  | { readonly ok: true; readonly rooms: RoomCards }
  | { readonly ok: false; readonly problems: readonly Problem[] };

/** One file read as far as data, and no further. What the card language makes
 *  of that data is the card language's (`loadRoom`, `loadFoe`). */
export type ParseResult =
  | { readonly ok: true; readonly data: unknown }
  | { readonly ok: false; readonly problems: readonly Problem[] };

/**
 * What the `yaml` package found wrong, said in this project's voice.
 *
 * The package's own headline is kept verbatim — it is specific ("Tabs are not
 * allowed as indentation") and it already carries the line and column — and
 * only the trailing colon of its pretty-printed form is trimmed, because the
 * excerpt it introduced is not carried into a one-line problem. The error code
 * is kept too: it is the thing to search for when the sentence is not enough.
 */
function yamlMessage(headline: string, code: string): string {
  const said = headline.endsWith(":") ? headline.slice(0, -1) : headline;
  const why =
    code === "DUPLICATE_KEY"
      ? "A repeated key is not a warning here: the second value wins silently, " +
        "the line you wrote first disappears, and no check on the card can see " +
        "that it was ever written. Delete one of them."
      : "The file does not read as YAML, so nothing written in it has been " +
        "checked yet — the card's own words are read only once the file parses.";
  return `${said} (yaml ${code}). ${why}`;
}

/**
 * Read one authored file as far as DATA — the file's own problems, and nothing
 * about what the data says.
 *
 * Every check in here is about the FILE and is one no card language can make,
 * because by the time a loader is handed data the fact is already gone (see the
 * head of this file). So it is the same stage for every kind of authored card,
 * and it is exported rather than copied: a second parser with its own idea of
 * which YAML version a file is read as is exactly the two-validators problem
 * this file opens by refusing. The foe card (src/lots/foes.ts) comes through
 * here too.
 */
export function parseCard(file: string, text: string): ParseResult {
  const problems: Problem[] = [];
  // A file-level problem has no key path to point at — the keys are exactly
  // what did not parse — so the path is the root, and the location travels in
  // the message as the line and column an author opens the file to.
  const fault = (message: string): void => {
    problems.push({ file, path: "", message });
  };

  const [doc, ...rest] = parseAllDocuments(text, {
    version: YAML_VERSION,
    uniqueKeys: true,
    prettyErrors: true,
  });

  if (doc === undefined) {
    fault(
      "this file holds no YAML document — it is empty, or it is nothing but " +
        "comments. A room card is one document: a map of keys.",
    );
    return { ok: false, problems };
  }
  if (rest.length > 0) {
    fault(
      `this file holds ${rest.length + 1} YAML documents, separated by \`---\`. ` +
        `A room card is ONE document in ONE file, so that a problem can name a ` +
        `file and an author knows which room it means. Split them.`,
    );
    return { ok: false, problems };
  }

  const declared = doc.directives.yaml;
  if (declared.explicit === true && declared.version !== YAML_VERSION) {
    fault(
      `this file declares \`%YAML ${declared.version}\`, and a room card is read ` +
        `as YAML ${YAML_VERSION}. The version is not a formality: it decides what ` +
        `the words in the file MEAN — under 1.1 a bare \`no\` is the boolean ` +
        `false, so a door sensed as "no light" stops being a line of writing. ` +
        `Drop the directive.`,
    );
    return { ok: false, problems };
  }

  for (const error of doc.errors) {
    fault(yamlMessage(error.message.split("\n")[0] ?? error.message, error.code));
  }
  // The parser recovers from most of what it reports and would hand over a
  // half-built document. It is not read: a card assembled out of a file the
  // parser argued with is not the card the author wrote.
  if (problems.length > 0) return { ok: false, problems };

  return { ok: true, data: doc.toJS() };
}

/**
 * Read one authored file into a typed room card.
 *
 * Never throws: a file full of junk gives problems out, the way `loadRoom` and
 * `load` (api.ts) answer junk with problems and null rather than an exception.
 * Every problem is reported, not just the first.
 *
 * The two stages do not mix. If the FILE is wrong, the card is not read at all
 * and the problems are the file's — reporting "unknown room key" against a
 * document the parser has already given up on would send an author to fix a
 * line that only looks wrong because the parse went sideways. If the file is
 * clean, every problem from here on is `loadRoom`'s, in `loadRoom`'s words.
 */
export function compileRoom(file: string, text: string): LoadResult {
  const parsed = parseCard(file, text);
  if (!parsed.ok) return { ok: false, problems: parsed.problems };
  // Data, at last. From here the language is cards.ts's and so are the words of
  // every problem — this file adds nothing to them and takes nothing away.
  return loadRoom(file, parsed.data);
}

/**
 * Compile a whole set of authored files.
 *
 * Every file is read even when an earlier one failed, because an author fixing
 * content wants the whole list rather than one problem per run.
 *
 * The one thing checked HERE rather than in `loadRoom`: two files may not
 * declare the same room id. It is invisible from inside either card — each is
 * perfectly legal alone — and the cost of missing it is a room that silently
 * replaces another in the draw.
 */
export function compileRooms(sources: readonly Source[]): CompileResult {
  const problems: Problem[] = [];
  /** Room id → the first file that declared it. Local, and it never escapes:
   *  what leaves this function is plain JSON (types.ts, "THE STATE IS JSON"). */
  const declaredIn = new Map<Id, string>();
  const compiled: [Id, RoomCard][] = [];

  for (const source of sources) {
    const result = compileRoom(source.file, source.text);
    if (!result.ok) {
      problems.push(...result.problems);
      continue;
    }
    const card = result.card;
    const first = declaredIn.get(card.id);
    if (first !== undefined) {
      problems.push({
        file: source.file,
        path: "id",
        message:
          `"${card.id}" is already the id of a room, declared in ${first}. ` +
          `A room id names one room: two files answering to it means one of them ` +
          `silently replaces the other wherever the id is drawn. Rename one.`,
      });
      continue;
    }
    declaredIn.set(card.id, source.file);
    compiled.push([card.id, card]);
  }

  if (problems.length > 0) return { ok: false, problems };
  // Sorted by room id, not by the order the caller happened to walk the
  // directory in — see "determinism" at the head of this file.
  compiled.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return { ok: true, rooms: Object.fromEntries(compiled) };
}
