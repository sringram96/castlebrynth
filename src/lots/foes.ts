// castlebrynth · the foe card — an enemy's body and its intents, as authored data.
//
// This is the file two landed headers already point at by name, and it invents
// no vocabulary to be it.
//
//   src/lots/manifest.ts:  "An enemy here is its PURSUIT chance and the rules it
//                           bends … Its intents, its health and its art are the
//                           enemy card's, and this schema is additive to them."
//   src/lots/turn.ts:      "`Foe` is handed in, not looked up … the body and the
//                           intents arrive as data from whoever opened the fight."
//
// So a foe card is `Foe` (turn.ts) MINUS the one field the grammar already owns.
// Its whole key set is `id`, `hp`, `intents` — three fields of a landed,
// exported interface, written down in a file — and `pursuit` is deliberately not
// among them: grammar.yaml declares it, `loadManifest` refuses an enemy without
// one, and a second copy here would be a second source of truth for the one
// number DESIGN requires every enemy to state ("FLEE is always offered: every
// enemy's inspect declares its PURSUIT chance alongside its intent"). `foeOf`
// below is the join, and it is the only place the two halves meet.
//
// THE KEY SET IS CLOSED AND IT FAILS AT LOAD, by name and by key path, exactly
// as cards.ts and manifest.ts close theirs (.llm/rules/engine.md: unknown words
// fail at LOAD; a new word is its own Asana task, never a side effect). An
// `armour:` line written from memory is refused here rather than dropped, for
// the reason content/fixtures/bad-unknown-word.yaml gives: a dropped word is a
// card that promises something and then does not do it.
//
// ─────────────────────────────────────────────────────────── purity, and I/O ──
//
// Nothing here opens a file. `loadFoe` is handed parsed data and the file's
// name, and the name exists only so a problem can say where — the same seam
// `loadRoom` and `loadManifest` sit behind. `compileFoes` reaches for the parse
// stage in src/core/compile.ts rather than carrying its own, because a second
// parser with its own idea of which YAML version a file is read as is the
// two-validators problem that file opens by refusing.
//
// ─────────────────────────────────────────────────────── deliberately absent ──
//
//   pursuit          the grammar's. See above.
//   name / art       the grammar names an enemy (`EnemyEntry.name`, stated on
//                    inspect); the still is the room's business and the art
//                    pipeline's, and no field here reaches either.
//   rules            a grammar bend is `enemy_rules` and the grammar's `rules`
//                    list. A card that could bend the grammar would put balance
//                    decisions in two files.
//   hp-read intents  an intent is read by TURN and by nothing else
//                    (turn.ts `intentAt`). An intent that escalated off the
//                    foe's REMAINING hp — the shape a threshold fight wants — is
//                    a word the turn loop does not have, and adding one is an
//                    engine amendment with its own Asana task. Named here
//                    because content/foes/the-threshold.yaml wanted it and had
//                    to say what it did instead.
//   effects          an intent is harm, a whole number, and nothing else. "An
//                    intent that is anything other than harm (a grab, a seal, a
//                    summons) is an enemy-card question and a DEFERRED one"
//                    (turn.ts). Deferred here too, and not half-built.

import { parseCard } from "../core/compile";
import type { Problem } from "../core/cards";
import type { Id } from "../core/types";
import { isEnabled } from "./manifest";
import type { Manifest } from "./manifest";
import type { Foe } from "./turn";

/** One authored foe. `Foe` minus the field grammar.yaml owns. */
export interface FoeCard {
  /** Names an enemy declared in grammar.yaml's `enemies`. */
  readonly id: Id;
  /** Whole, 1 or more — `openFight` refuses anything else. */
  readonly hp: number;
  /** Harm per turn, cycled by turn number. Enemies never roll. */
  readonly intents: readonly number[];
}

export type FoeLoadResult =
  | { readonly ok: true; readonly card: FoeCard }
  | { readonly ok: false; readonly problems: readonly Problem[] };

/** Compiled foes, keyed by the id each card declares. Plain JSON. */
export type FoeCards = { readonly [foe: string]: FoeCard };

export type FoeCompileResult =
  | { readonly ok: true; readonly foes: FoeCards }
  | { readonly ok: false; readonly problems: readonly Problem[] };

const FOE_KEY_TABLE: Record<keyof FoeCard, true> = { id: true, hp: true, intents: true };

/** The keys a foe card may carry. The whole of the language, in order. */
export const FOE_KEYS = Object.keys(FOE_KEY_TABLE) as readonly (keyof FoeCard)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read one authored foe card.
 *
 * Never throws, and reports every problem rather than the first — an author
 * fixing a file wants the whole list (cards.ts `loadRoom`).
 */
export function loadFoe(file: string, source: unknown): FoeLoadResult {
  const problems: Problem[] = [];
  const fault = (path: string, message: string): void => {
    problems.push({ file, path, message });
  };

  if (!isRecord(source)) {
    fault("", "a foe card is a map of keys, and this is not one");
    return { ok: false, problems };
  }

  for (const key of Object.keys(source)) {
    if (Object.prototype.hasOwnProperty.call(FOE_KEY_TABLE, key)) continue;
    fault(
      key,
      `unknown foe key "${key}" — the foe card vocabulary is closed: ` +
        `${FOE_KEYS.join(", ")}. Its pursuit chance, its name and the rules it ` +
        `bends are grammar.yaml's (src/lots/manifest.ts); a new word is its own ` +
        `Asana task, never a side effect (.llm/rules/engine.md).`,
    );
  }

  const id = source["id"];
  if (typeof id !== "string" || id.trim() === "") {
    fault("id", "the foe id is required, and it names an enemy declared in grammar.yaml");
  }

  const hp = source["hp"];
  if (!Number.isInteger(hp) || (hp as number) < 1) {
    fault(
      "hp",
      "`hp` is required, and is a whole number of 1 or more — a body that cannot " +
        "be reduced to zero is a fight with no end in it (src/lots/turn.ts `openFight`).",
    );
  }

  const intents = source["intents"];
  if (!Array.isArray(intents)) {
    fault(
      "intents",
      "`intents` is a list of whole numbers: the harm this enemy will do, by turn, " +
        "cycled. The intent shows BEFORE you roll (DESIGN §the lots), so a foe " +
        "without one has nothing to show.",
    );
  } else {
    if (intents.length === 0) {
      fault("intents", "`intents` is empty — an enemy that shows nothing has nothing to show");
    }
    intents.forEach((intent: unknown, index) => {
      if (Number.isInteger(intent) && (intent as number) >= 0) return;
      fault(
        `intents[${index}]`,
        "an intent is a whole number of 0 or more: the harm that lands when the turn " +
          "ends. There is no negative harm — an enemy that healed you on its own turn " +
          "would be a heal wearing a threat's clothes.",
      );
    });
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, card: source as unknown as FoeCard };
}

/** Read one authored file into a typed foe card. The file's problems first, and
 *  only then the card's — see `compileRoom`, which splits the same two stages. */
export function compileFoe(file: string, text: string): FoeLoadResult {
  const parsed = parseCard(file, text);
  if (!parsed.ok) return { ok: false, problems: parsed.problems };
  return loadFoe(file, parsed.data);
}

/**
 * Compile a whole set of authored foe files.
 *
 * The one thing checked HERE rather than in `loadFoe`: two files may not declare
 * the same foe id. It is invisible from inside either card, and the cost of
 * missing it is one enemy silently standing in for another wherever a room says
 * `fight:` (compile.ts `compileRooms` makes the same argument for rooms).
 */
export function compileFoes(sources: readonly { file: string; text: string }[]): FoeCompileResult {
  const problems: Problem[] = [];
  const declaredIn = new Map<Id, string>();
  const compiled: [Id, FoeCard][] = [];

  for (const source of sources) {
    const result = compileFoe(source.file, source.text);
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
          `"${card.id}" is already the id of a foe, declared in ${first}. A foe id ` +
          `names one enemy: two files answering to it means one of them silently ` +
          `stands in for the other wherever a room says \`fight: ${card.id}\`. Rename one.`,
      });
      continue;
    }
    declaredIn.set(card.id, source.file);
    compiled.push([card.id, card]);
  }

  if (problems.length > 0) return { ok: false, problems };
  // Sorted by foe id, for the reason `compileRooms` sorts by room id: the same
  // content compiles to the same bytes on every machine.
  compiled.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return { ok: true, foes: Object.fromEntries(compiled) };
}

/**
 * The two halves of an enemy, joined: the card's body and intents, the
 * grammar's pursuit chance.
 *
 * null when the manifest declares no such enemy, or has it switched off. Null
 * rather than a throw for the reason `drawDoors` answers an empty pool with one
 * (src/core/doors.ts): nothing fails at play. A room that says `fight:` at an
 * enemy the grammar does not know is a content bug, and the place to refuse it
 * is the content lint, which does — at LOAD, before anybody is standing in the
 * room.
 */
export function foeOf(manifest: Manifest, card: FoeCard): Foe | null {
  const entry = manifest.enemies[card.id];
  if (entry === undefined) return null;
  if (!isEnabled(manifest, `enemies.${card.id}`)) return null;
  return { id: card.id, hp: card.hp, intents: card.intents, pursuit: entry.pursuit };
}
