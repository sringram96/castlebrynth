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
//
// ───────────────────────────────────── known, and deliberately not fixed ──
//
// AN ALIAS PUTS ONE OBJECT IN TWO PLACES ON THE CARD. Two keys written from the
// same `*anchor` come out of `toJS()` as the SAME array or map, not as copies —
// `a === b` is true in memory — and a compiled card is not frozen. Write that
// card to content/bundle.json and read it back and they are two, because JSON
// has no aliases. So the in-memory card and the shipped card are the same VALUE
// and not the same graph.
//
// Harmless today, and left alone on purpose: nothing mutates a card (the state
// is JSON and the cards are read-only to the engine), a round trip through
// JSON.stringify is asserted to reload clean through `loadRoom`, and both the
// obvious fixes cost more than the problem. Deep-cloning every card would spend
// a copy on every room to defend against a mutation nobody makes; refusing
// aliases outright would take a real authoring convenience away for the same
// reason. What would make it matter is the day something writes to a card — and
// that day the fix belongs wherever that write is, not here.
//
// Recorded so that whoever meets `a === b` finds it described rather than
// discovering it in the dark.

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

/**
 * What the `yaml` package found wrong, said in this project's voice.
 *
 * The package's own headline is kept verbatim — it is specific ("Tabs are not
 * allowed as indentation") and it already carries the line and column — and
 * only the trailing colon of its pretty-printed form is trimmed, because the
 * excerpt it introduced is not carried into a one-line problem. The error code
 * is kept too: it is the thing to search for when the sentence is not enough.
 *
 * The code decides the sentence that follows, because the package's two piles
 * mean opposite things about the file. An ERROR means the file did not read as
 * YAML. A WARNING means it read fine and SOMETHING IN IT WAS DROPPED — which is
 * the more dangerous of the two here, because what is dropped is a word the
 * author wrote and no check downstream can miss what is no longer there.
 */
function yamlMessage(headline: string, code: string): string {
  const said = headline.endsWith(":") ? headline.slice(0, -1) : headline;
  const why =
    code === "DUPLICATE_KEY"
      ? "A repeated key is not a warning here: the second value wins silently, " +
        "the line you wrote first disappears, and no check on the card can see " +
        "that it was ever written. Delete one of them."
      : code === "TAG_RESOLVE_FAILED"
        ? "A tag is a word, and this one is not in the language. The parser did " +
          "not recognise it either: it DROPPED the tag and kept the bare value, " +
          "so what reaches the card loader reads as correct and the word you " +
          "wrote is not in the data for anything to find. Room cards carry no " +
          "tags at all — delete it. (Unknown vocabulary fails at LOAD, and a new " +
          "word is its own Asana task: .llm/rules/engine.md 3.)"
        : code === "BAD_DIRECTIVE"
          ? `The parser does not have that version and read the file as YAML ` +
            `${YAML_VERSION} regardless, so the directive is not a statement — ` +
            `it is overruled, quietly. The version decides what the words in the ` +
            `file MEAN: under 1.1 a bare \`no\` is the boolean false, and a door ` +
            `sensed as "no light" stops being a line of writing. Drop it.`
          : "The file does not read as YAML, so nothing written in it has been " +
            "checked yet — the card's own words are read only once the file parses.";
  return `${said} (yaml ${code}). ${why}`;
}

/**
 * The parse, with this project's options pinned in one place.
 *
 * It is its own function so that the `let` below can be typed by inference off
 * it. `parseAllDocuments` is generic, and naming its `ReturnType` directly
 * instantiates the generics at their defaults and loses `Document.Parsed` —
 * which is the type that guarantees `directives` is there.
 */
function parseDocuments(text: string) {
  return parseAllDocuments(text, {
    version: YAML_VERSION,
    uniqueKeys: true,
    prettyErrors: true,
  });
}

/**
 * What to say when the parser THREW instead of reporting.
 *
 * `yaml` answers almost everything with `doc.errors`. Not everything: it
 * defends itself against a billion-laughs expansion by counting how often each
 * anchor is resolved, and at 100 uses of one anchor it throws a bare
 * `ReferenceError`. The throw is not at the parse — it is at `toJS()`, where
 * the aliases are actually expanded — so both stages are wrapped below.
 *
 * 100 is not a hostile number. One anchored tap reused down a row of alcoves
 * reaches it, and content/fixtures/bad-alias-storm.yaml is exactly that file.
 *
 * A thrown error is the one failure this compiler must never pass on. It names
 * no file, which is the opposite of this layer's whole job; and it takes the
 * run down with it, so `compileRooms`' promise that every file is read even
 * after an earlier one failed would be worth nothing. Whatever the parser
 * decides to throw, it comes back as a problem with the file's name on it.
 */
function thrownMessage(thrown: unknown): string {
  const raw = thrown instanceof Error ? thrown.message : String(thrown);
  // The thrown text is somebody else's sentence and it does not always end like
  // one. It is quoted, and the punctuation is ours.
  const said = /[.!?]$/.test(raw.trim()) ? raw.trim() : `${raw.trim()}.`;
  return (
    `the YAML parser gave up on this file rather than reporting a problem in ` +
    `it: ${said} Nothing in the file has been checked, and no line can be ` +
    `named. The one cause the parser refuses this way is anchors: it allows ` +
    `100 uses of any one anchor, and past that it stops rather than expanding ` +
    `them. If this file repeats an alias down a long list, write the repeated ` +
    `block out in full or split the room in two.`
  );
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
  const problems: Problem[] = [];
  // A file-level problem has no key path to point at — the keys are exactly
  // what did not parse — so the path is the root, and the location travels in
  // the message as the line and column an author opens the file to.
  const fault = (message: string): void => {
    problems.push({ file, path: "", message });
  };

  let parsed: ReturnType<typeof parseDocuments>;
  try {
    parsed = parseDocuments(text);
  } catch (thrown) {
    fault(thrownMessage(thrown));
    return { ok: false, problems };
  }
  const [doc, ...rest] = parsed;

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

  // This catches ONE version and it is the important one: 1.1, which the parser
  // supports, so it reports nothing and hands back a card whose scalars have
  // quietly changed meaning. Every other version an author might write — 1.3,
  // 2.0 — is normalised to "1.2" here before this line can read it, and arrives
  // instead as a BAD_DIRECTIVE in `doc.warnings` below. Both paths refuse; they
  // are two different silences and it takes both checks to close them.
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

  // BOTH PILES, and the warnings are the ones that bite. `doc.errors` is a file
  // that did not read; `doc.warnings` is a file that read fine with something
  // TAKEN OUT of it — an unresolved tag dropped off a value, a version directive
  // overruled. Nothing downstream can object to a word that is no longer in the
  // data, which is the same reason the duplicate-key check lives here, so a
  // warning is refused exactly as hard as an error.
  for (const complaint of [...doc.errors, ...doc.warnings]) {
    fault(yamlMessage(complaint.message.split("\n")[0] ?? complaint.message, complaint.code));
  }
  // The parser recovers from most of what it reports and would hand over a
  // half-built document. It is not read: a card assembled out of a file the
  // parser argued with is not the card the author wrote.
  if (problems.length > 0) return { ok: false, problems };

  // Data, at last — and this is the line that actually throws on an alias
  // storm, because `toJS()` is where the aliases are expanded. A clean parse is
  // not yet a safe document.
  let data: unknown;
  try {
    data = doc.toJS();
  } catch (thrown) {
    fault(thrownMessage(thrown));
    return { ok: false, problems };
  }

  // From here the language is cards.ts's and so are the words of every problem —
  // this file adds nothing to them and takes nothing away.
  return loadRoom(file, data);
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
