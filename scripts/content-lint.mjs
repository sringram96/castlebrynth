// H005 — content-lint: the law walk over compiled content.
//
//   content/*.yaml → scripts/build-content.mjs → compiled scenes
//                                                      ↓ THIS
//                                              the laws, checked
//
// The compiler (H004) asks whether every word is a word. This asks
// whether the content those words spell is lawful: can each gate ever
// open, can each action always answer, does a refusal cost nothing,
// and does the prose keep canon voice.
//
// It walks the COMPILED shapes — the same `{gates?, deltas:[{kind}]}`
// the engine plays — so lint and play never disagree about what a card
// says. But it reports in AUTHORED paths (`objects.book.actions.read[2]
// .set`), because the person who has to fix a complaint is holding the
// YAML, not the bundle. Compiling per file rather than through
// `compileBundle` is deliberate: it keeps the source file on every
// scene (so a complaint can name it) and keeps the authored `tier`,
// which the bundle drops and CANON.md's tier-gated words need.
//
// Law this file answers to:
//   LAWS.md 2   #gates — a gate's key must be producible by some other
//               content. A gate no delta can open is a dead end.
//   VOCAB.md    the gateless fallback is mandatory and last;
//               `refuse: true` logs to the refused ledger and carries
//               no other delta.
//   CANON.md    #tone — the banned words, and the plain name that is
//               never written below T3.
//   RULES.md 5  cards are data — this file reads content and decides
//               nothing about the game.
//   RULES.md 7  it is lint, so it lists everything wrong; a checker
//               that stops at the first fault is a loader (bundle.ts).
//
// Not here (H005 non-goals): goto/door-ref resolution — a goto names a
// door, not a scene (VOCAB.md), and nothing in P0 declares the door
// namespace; D002's draw engine owns that check. Spoiler-tier entity
// scans and telegraph reachability arrive with P2/P3.
//
// Usage:
//   node scripts/content-lint.mjs [--in <dir>]

import { pathToFileURL } from "node:url";
import {
  CompileError,
  GATE_KEYS,
  TIERS,
  compileScene,
  readScenes,
} from "./build-content.mjs";

// ---------------------------------------------------------------------
// canon voice — CANON.md #tone, as patterns
//
// A phrase is matched whole and case-blind, on word boundaries, so
// "devil" never fires on "devils' club" being absent and "evil" never
// fires inside "devil". Interior spaces match any run of whitespace,
// so a line broken across YAML still gets caught.
//
// Only unambiguous words are listed. "button", "click", "level",
// "score", "save" and "tap" all have plain diegetic senses in this
// world (a bone button, a lock clicking, water finding its level, a
// score of men), and a linter that cries wolf on real prose teaches
// authors to route around it. CANON.md's clause is enforced by the
// terms below, which cannot be anything but meta.
// ---------------------------------------------------------------------

/** CANON.md's named bans. `from` marks a word a tier finally permits. */
export const BANNED_PHRASES = [
  { phrase: "suddenly", why: "the narrator does not startle" },
  { phrase: "you feel", why: "the narrator observes; it never reports the player's insides" },
  { phrase: "mysterious", why: "dread is specific, never labelled" },
  { phrase: "evil", why: "dread is specific, never labelled" },
  { phrase: "creepy", why: "dread is specific, never labelled" },
  { phrase: "satan", why: "the plain name is never written below T3", from: "T3" },
  { phrase: "devil", why: "the plain name is never written below T3", from: "T3" },
  { phrase: "lucifer", why: "the plain name is never written below T3", from: "T3" },
];

/** CANON.md: "any meta reference to games, stats, or UI". */
export const META_PHRASES = [
  "game", "games", "gameplay", "gamer", "video game", "videogame",
  "player", "players", "playthrough", "respawn", "checkpoint",
  "cutscene", "npc", "hud", "ui", "user interface", "menu", "tooltip",
  "sprite", "pixel", "pixels", "screen", "inventory",
  "hit points", "hitpoints", "hp", "xp", "experience points",
  "level up", "levels up", "levelled up", "leveled up",
  "stat", "stats", "health bar", "mana", "cooldown", "hotkey",
  "save file", "savegame", "autosave", "quicksave",
  "tutorial", "achievement", "leaderboard", "high score",
  "difficulty setting",
];

const META_WHY = "no meta reference to games, stats, or UI";

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** One phrase as a whole-word, whitespace-tolerant, case-blind pattern. */
function pattern(phrase) {
  return new RegExp(
    `\\b${phrase.split(/\s+/).map(escape).join("\\s+")}\\b`,
    "i",
  );
}

/** Every ban, compiled once. */
const BANS = [
  ...BANNED_PHRASES.map((ban) => ({ ...ban, test: pattern(ban.phrase) })),
  ...META_PHRASES.map((phrase) => ({
    phrase,
    why: META_WHY,
    test: pattern(phrase),
  })),
];

/** T0 < T1 < T2 < T3, as CANON.md orders them. */
function knows(tier, atLeast) {
  return TIERS.indexOf(tier) >= TIERS.indexOf(atLeast);
}

// ---------------------------------------------------------------------
// paths — authored, because the author reads the complaint
// ---------------------------------------------------------------------

function step(trail, key) {
  return trail ? `${trail}.${key}` : String(key);
}

function at(trail, index) {
  return `${trail}[${index}]`;
}

/** `<file>: <dotted.path>` — the compiler's format, so both read alike. */
function where(card, trail) {
  return trail ? `${card.file}: ${trail}` : card.file;
}

// ---------------------------------------------------------------------
// reading — compiled scenes, each still knowing its file and its tier
// ---------------------------------------------------------------------

/**
 * Every scene file in `dir`, compiled. Throws CompileError on a file
 * that will not compile: an unlawful bundle is the compiler's
 * complaint to make, and it makes it better than this would.
 */
export function readCards(dir) {
  return readScenes(dir).map(({ file, doc }) => ({
    file,
    scene: compileScene(file, doc),
    // Authored law the bundle drops; CANON.md's tier-gated words need it.
    tier: doc.tier,
  }));
}

// ---------------------------------------------------------------------
// the walk
// ---------------------------------------------------------------------

/** Every response in every card, with the authored path to it. */
function* responses(cards) {
  for (const card of cards)
    for (const object of card.scene.objects)
      for (const action of object.actions) {
        const trail = step(step(step("objects", object.id), "actions"), action.id);
        for (const [index, response] of action.responses.entries())
          yield { card, action, trail: at(trail, index), response };
      }
}

/** Every action in every card, with the authored path to it. */
function* actions(cards) {
  for (const card of cards)
    for (const object of card.scene.objects)
      for (const action of object.actions)
        yield {
          card,
          action,
          trail: step(step(step("objects", object.id), "actions"), action.id),
        };
}

/**
 * No gate at all, or a gate that lists nothing. VOCAB.md gates on "all
 * listed must hold", so a gate listing nothing holds vacuously — it is
 * a fallback however it was written, and it must be last.
 */
function alwaysPasses(response) {
  const gates = response.gates;
  if (gates === undefined) return true;
  return GATE_KEYS.every((key) => (gates[key] ?? []).length === 0);
}

// ---------------------------------------------------------------------
// 1 — gate satisfiability (LAWS.md #gates)
// ---------------------------------------------------------------------

/** Every flag some response sets, and every item some response gives. */
function keysProduced(cards) {
  const flags = new Set();
  const items = new Set();
  for (const { response } of responses(cards))
    for (const delta of response.deltas) {
      if (delta.kind === "set") for (const flag of delta.flags) flags.add(flag);
      if (delta.kind === "give") for (const item of delta.items) items.add(item);
    }
  return { flags, items };
}

function checkGates(cards, report) {
  const produced = keysProduced(cards);
  for (const { card, trail, response } of responses(cards)) {
    const gates = response.gates;
    if (gates === undefined) continue;
    const gateTrail = step(trail, "if");

    for (const [i, flag] of (gates.flags ?? []).entries())
      if (!produced.flags.has(flag))
        report(
          card,
          at(step(gateTrail, "flags"), i),
          `gate flag "${flag}" is never set by any response in the content set — nothing can open this gate (LAWS.md #gates)`,
        );

    for (const [i, item] of (gates.items ?? []).entries())
      if (!produced.items.has(item))
        report(
          card,
          at(step(gateTrail, "items"), i),
          `gate item "${item}" is never given by any response in the content set — nothing can open this gate (LAWS.md #gates)`,
        );
  }
}

// ---------------------------------------------------------------------
// 2 — the mandatory fallback (VOCAB.md)
// ---------------------------------------------------------------------

function checkFallbacks(cards, report) {
  for (const { card, action, trail } of actions(cards)) {
    const list = action.responses;

    if (list.length === 0) {
      report(
        card,
        trail,
        "an action with no responses can never answer — every action ends in a gateless fallback (VOCAB.md)",
      );
      continue;
    }

    if (!alwaysPasses(list[list.length - 1]))
      report(
        card,
        at(trail, list.length - 1),
        "the last response is gated — every action ends in a gateless fallback that can always answer (VOCAB.md)",
      );

    for (const [i, response] of list.slice(0, -1).entries())
      if (alwaysPasses(response))
        report(
          card,
          at(trail, i),
          "a gateless response above the end always answers, so nothing below it can ever be read — the fallback is last (VOCAB.md)",
        );
  }
}

// ---------------------------------------------------------------------
// 3 — refuse purity (VOCAB.md)
// ---------------------------------------------------------------------

function checkRefusals(cards, report) {
  for (const { card, trail, response } of responses(cards)) {
    if (!response.deltas.some((delta) => delta.kind === "refuse")) continue;
    for (const delta of response.deltas) {
      // `say` is exempt: VOCAB.md has it always present.
      if (delta.kind === "refuse" || delta.kind === "say") continue;
      report(
        card,
        step(trail, delta.kind),
        `a refusal carries no other delta — "${delta.kind}" rides beside "refuse: true", which logs to the refused ledger and nothing else (VOCAB.md)`,
      );
    }
  }
}

// ---------------------------------------------------------------------
// 4 — canon voice (CANON.md #tone)
// ---------------------------------------------------------------------

/** Every string in a prompt spec, with the path to it. */
function* promptProse(trail, value) {
  if (typeof value === "string") {
    yield [trail, value];
  } else if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) yield* promptProse(at(trail, i), item);
  } else if (typeof value === "object" && value !== null) {
    for (const key of Object.keys(value)) yield* promptProse(step(trail, key), value[key]);
  }
}

/** The prose a delta puts on the screen. Ids are not prose. */
function* deltaProse(trail, delta) {
  switch (delta.kind) {
    case "say":
      yield [step(trail, "say"), delta.text];
      break;
    case "addObject":
    case "removeObject":
      yield [step(step(trail, delta.kind), "cause"), delta.cause];
      break;
    case "end":
      yield [step(step(trail, "end"), "line"), delta.line];
      yield [step(step(trail, "end"), "note"), delta.note];
      break;
    case "prompt":
      yield* promptProse(step(trail, "prompt"), delta.prompt);
      break;
    default:
      break;
  }
}

/** Every line of a card the player can read, with the path to it. */
function* cardProse(card) {
  const scene = card.scene;
  if (scene.enter !== undefined) yield ["enter", scene.enter];
  yield ["line", scene.line];

  for (const object of scene.objects) {
    const objectTrail = step("objects", object.id);
    // The free tap: authored as `tap`, hoisted to `line` by the compiler.
    yield [step(objectTrail, "tap"), object.line];

    for (const action of object.actions) {
      const actionTrail = step(step(objectTrail, "actions"), action.id);
      for (const [i, response] of action.responses.entries())
        for (const delta of response.deltas)
          yield* deltaProse(at(actionTrail, i), delta);
    }
  }
}

function checkVoice(cards, report) {
  for (const card of cards)
    for (const [trail, line] of cardProse(card))
      for (const ban of BANS) {
        if (ban.from !== undefined && knows(card.tier, ban.from)) continue;
        if (!ban.test.test(line)) continue;
        report(
          card,
          trail,
          ban.from === undefined
            ? `banned word "${ban.phrase}" — CANON.md #tone: ${ban.why}`
            : `banned word "${ban.phrase}" below ${ban.from}; this scene declares ${card.tier} — CANON.md #tone: ${ban.why}`,
        );
      }
}

// ---------------------------------------------------------------------
// the lint
// ---------------------------------------------------------------------

/** The four checks, in the order their complaints read best. */
const CHECKS = [checkGates, checkFallbacks, checkRefusals, checkVoice];

/**
 * Every problem in a set of read cards. Pure: cards in, complaints
 * out, nothing thrown and nothing printed.
 */
export function lintCards(cards) {
  const problems = [];
  const report = (card, trail, detail) => {
    const path = where(card, trail);
    problems.push({ where: path, detail, message: `${path} — ${detail}` });
  };
  for (const check of CHECKS) check(cards, report);
  return problems;
}

/** Read a content directory and lint it. Throws only on a bad compile. */
export function lint({ dir = "content" } = {}) {
  const cards = readCards(dir);
  return { cards, problems: lintCards(cards) };
}

// ---------------------------------------------------------------------
// cli
// ---------------------------------------------------------------------

const OPTIONS = { "--in": "dir" };

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = OPTIONS[argv[i]];
    if (key === undefined)
      throw new CompileError(
        "argv",
        `unknown option "${argv[i]}" — expected ${Object.keys(OPTIONS).join(", ")}`,
      );
    const value = argv[i + 1];
    if (value === undefined) throw new CompileError("argv", `${argv[i]} needs a value`);
    args[key] = value;
    i += 1;
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const { cards, problems } = lint(parseArgs(argv));
    if (problems.length > 0) {
      console.error(`content-lint: ${problems.length} problem(s)`);
      for (const problem of problems) console.error(`  ✗ ${problem.message}`);
      return 1;
    }
    console.log(
      `content-lint: ${cards.length} card(s) OK — gates open, every action answers, refusals cost nothing, canon voice holds`,
    );
    return 0;
  } catch (error) {
    if (!(error instanceof CompileError)) throw error;
    console.error(`content-lint: ${error.message}`);
    return 1;
  }
}

const invoked =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (invoked) process.exit(main());
