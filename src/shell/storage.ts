// castlebrynth · persistence — the save, kept. (H108)
//
// H007 built the envelope: `save` renders a versioned JSON envelope, `load`
// reads one back or answers null, and it never throws on any input
// (.llm/rules/engine.md). This card is the other half — WHERE that text lives
// between two openings of the app, and what boot does with what it finds.
//
// It adds no format. Everything written here went through `save`, everything
// read came back through `load`, and this file does not know one field of a
// GameState. If it did, there would be two places that understand a save and
// only one of them would be audited.
//
// ──────────────────────────────────────────────── autosave cannot be forgotten ──
//
// "Autosave after every act" is the kind of law that holds for a month and then
// quietly stops at the one new call site nobody wrapped. So it is not offered as
// a function to remember to call: `persisting` WRAPS a transition, and the
// caller is handed the wrapped one. There is no path that produces a new state
// and skips the write, because producing the state IS the write.
//
// ────────────────────────────────────────────────── nothing here throws, ever ──
//
// `localStorage` is not a reliable object. It throws on quota, it throws in
// Safari's private mode, it is absent under some embeddings, and a game that
// dies mid-push because a disk filled up is worse than a game that fails to
// save. Every function below is TOTAL and answers with a value — the same
// discipline `load` keeps at the engine's end.
//
// ──────────────────────────────────────────── a save we cannot read is not rubbish ──
//
// `load` answers null for a corrupt save AND for a save from a build newer than
// this one (save.ts refuses `version > SAVE_VERSION`). Those look identical from
// here, and one of them is a player's whole campaign — dice, knowledge,
// landmarks, the ledger death cannot touch (DESIGN §ledgers). So the new-run
// path does not overwrite an unreadable save: it moves it aside, once, to a key
// nothing else writes. Beginning again costs the player nothing they had, and
// the bytes are still there for whoever asks.

import { load, save } from "../core/save";
import type { GameState } from "../core/types";

/** Where the run lives. Namespaced, because a browser origin is shared with
 *  whatever else is served from it. */
export const SAVE_KEY = "castlebrynth:save";

/** Where a save this build cannot read is set down, unaltered. Written only by
 *  `quarantine`, read by nothing — it exists so that "begin again" is never
 *  also "throw away what you had". */
export const QUARANTINE_KEY = "castlebrynth:save:unreadable";

/**
 * The slice of `Storage` this card uses.
 *
 * Structural on purpose: a test hands in a fake that is full, or hostile, or
 * absent, and gets the same code the browser runs. Naming the DOM `Storage`
 * type here would make those cases unreachable.
 */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * What boot found.
 *
 * Three answers, and the shell must handle all three — which is why this is a
 * union and not a `GameState | null`. "Nothing saved yet" and "something is
 * saved and this build cannot read it" are different situations for a player:
 * the first is a first opening, the second is a loss, and offering them the
 * same silent new run would hide the loss.
 */
export type Restored =
  /** A save was there and it loaded. Resume exactly here. */
  | { readonly kind: "resumed"; readonly state: GameState }
  /** Nothing is saved. A first opening — begin. */
  | { readonly kind: "fresh" }
  /**
   * Something is saved and `load` refused it: corrupt, or from a newer build.
   * The shell OFFERS a new run; it does not start one silently, and it does not
   * overwrite until the player says so (see `quarantine`).
   */
  | { readonly kind: "unreadable"; readonly text: string };

/** Whether the last write landed. A refusal is reported, never thrown. */
export type Wrote = "saved" | "refused";

/**
 * Read whatever the storage will give us, never throwing.
 *
 * A `getItem` that raises — an embedding with storage disabled, an origin the
 * browser has locked — is the same as nothing saved: a first opening. It is not
 * "unreadable", because there is no text to have lost.
 */
function peek(store: Store, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/**
 * What is saved, as boot sees it.
 *
 * PURE with respect to the store: it reads and it decides, and it writes
 * nothing at all — not even to tidy away a save it could not read. Boot is not
 * the moment to destroy anything; the player has not chosen yet.
 *
 * An EMPTY STRING is treated as nothing saved rather than as corruption. It is
 * what a half-finished write leaves behind, it carries no campaign, and calling
 * it a loss would show a player an alarm about zero bytes.
 */
export function restore(store: Store): Restored {
  const text = peek(store, SAVE_KEY);
  if (text === null || text === "") return { kind: "fresh" };
  const state = load(text);
  return state === null ? { kind: "unreadable", text } : { kind: "resumed", state };
}

/**
 * Write the state, through the envelope, now.
 *
 * `save` is total (types.ts law 3: the state is JSON to the leaves), so the only
 * thing that can fail here is the store, and it fails by throwing — quota,
 * private mode, a disabled origin. That answers "refused", and the game goes on
 * unsaved rather than stopping.
 */
export function autosave(store: Store, state: GameState): Wrote {
  try {
    store.setItem(SAVE_KEY, save(state));
    return "saved";
  } catch {
    return "refused";
  }
}

/**
 * Set an unreadable save aside so a new run may begin over it.
 *
 * Called when the player ACCEPTS the new run offered after an `unreadable`
 * restore — not at boot, and not automatically. Copy first, remove second: if
 * the copy is refused (a full store is the likeliest reason a save went bad in
 * the first place), the original stays exactly where it is and the player keeps
 * their bytes. A new run then overwrites it, which is the player's own choice
 * and the only thing in this file that can lose anything.
 *
 * Answers whether the aside copy landed, so a shell may say so.
 */
export function quarantine(store: Store): Wrote {
  const text = peek(store, SAVE_KEY);
  if (text === null || text === "") return "saved";
  try {
    store.setItem(QUARANTINE_KEY, text);
    store.removeItem(SAVE_KEY);
    return "saved";
  } catch {
    return "refused";
  }
}

/**
 * Wrap a transition so its result is saved before anyone sees it.
 *
 * THIS IS THE AUTOSAVE. Not a call to remember after each act — the act itself,
 * with the write inside it. `act` (types.ts `GameAPI`) returns
 * `{ state, effects }` and every other transition this shell grows will return
 * something with a `state` on it, so the constraint is written as exactly that
 * and no more: the wrapper does not know what else rides along.
 *
 * The wrapped function returns what the transition returned, unchanged. A
 * refused write does not alter the result and does not throw — the run
 * continues, unsaved, and `autosave`'s answer is discarded here on purpose:
 * whether to tell the player is the frame's decision, and the frame can call
 * `autosave` itself to ask.
 */
export function persisting<Args extends readonly unknown[], Out extends { readonly state: GameState }>(
  store: Store,
  transition: (...args: Args) => Out,
): (...args: Args) => Out {
  return (...args: Args): Out => {
    const out = transition(...args);
    autosave(store, out.state);
    return out;
  };
}
