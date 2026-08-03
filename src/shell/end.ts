// castlebrynth · the end card — the run is over, and the one way on. (H114)
//
// ────────────────────────────────────────────────────────── THE LAYERING LAW ──
//
// THE END CARD MAY ONLY APPEAR FROM AN `end` WORD OF THE LANGUAGE. NEVER
// INFERRED FROM A FLAG.
//
// The Descent's vocabulary has an `end` word (cards.ts `Deltas.end`), and
// resolution carries it out whole as an emission: `{ kind: "end", ending }`
// (resolve.ts). That emission is the ONLY thing in this file that can raise the
// card, and the law is kept structurally rather than by discipline:
//
//   `endingOf` TAKES EMISSIONS AND NOTHING ELSE. There is no overload that
//   takes a `GameState`, so there is no flag to read, no `knowledge:` id to
//   check, no `run.depth === 0` to notice. The inference is not forbidden here;
//   it is unavailable.
//
//   `mountEnd` EXPOSES NO `show(ending)`. `consider(emissions)` is the whole
//   surface. A second door would be a second answer to "why is the card up",
//   and the first time those two disagreed the card would appear over a run
//   that had not ended.
//
// This matters because inferring is so easy and so nearly right. A run that has
// ended almost always has a flag saying so, and a card raised off that flag
// works — until content raises the flag one act early, or a save from a dead
// run is resumed, or a `knowledge:` id ratchets across a death and greets the
// next push with somebody else's ending. The engine EMITS an ending exactly
// once, at the moment it happens (resolve.ts: "nothing on GameState says a run
// is over"), and that moment is what this card renders.
//
// ────────────────────────────────────────────────── the strip stays visible ──
//
// The overlay covers the art and the pages; it does NOT cover the strip.
// .llm/rules/ui.md: "Nothing collapses or hides: the strip is always visible."
// An ending does not repeal that — shell.css raises the strip above this
// overlay in the stacking order rather than this file trying to measure around
// it. What the overlay DOES take is the panel's options: an ended run must not
// still offer acts, and an overlay that intercepts the taps is how that is true
// without any control being disabled or removed.
//
// ────────────────────────────────────────────────────── what this card is not ──
//
//   not the ENDING'S WORDS  the engine never names an ending (.llm/rules/
//                           engine.md) and neither does this file: it is handed
//                           an id and shows it. The prose, the plate, and the
//                           Book of Ends are content and their own cards.
//   not the REBIRTH         "Death wakes you at the Crossing ... doors redraw"
//                           is a lifecycle transition that keeps the campaign
//                           and increments `deaths` (types.ts
//                           `DeathTransition`). That is DEATH's path and it
//                           never reaches this file. What IS here is the card's
//                           own GOAL — begin again on a cleared save and a
//                           fresh seed (`startOver`), which is a different
//                           thing entirely and starts a new campaign.
//   not DEATH               death is a bar at zero (death.ts) and it does not
//                           end a run — it wakes you at the Crossing. Only the
//                           `end` word ends one.

import { newRun } from "../core/api";
import { SAVE_KEY, autosave } from "./storage";
import type { Emission } from "../core/resolve";
import type { ContentBundle, GameState, Id } from "../core/types";
import type { Store } from "./storage";

/**
 * The ending in these emissions, or null.
 *
 * THE WHOLE LAYERING LAW, as one pure function. It reads a list of emissions.
 * It cannot read anything else, because nothing else is in its type.
 *
 * FIRST WINS if an act somehow emitted two. Resolution emits at most one `end`
 * per response (resolve.ts applies each word once), so this is a total
 * function's answer rather than a case content can reach — and answering the
 * first is the only choice that does not depend on list length.
 */
export function endingOf(emissions: readonly Emission[]): Id | null {
  for (const emission of emissions) {
    if (emission.kind === "end") return emission.ending;
  }
  return null;
}

// ────────────────────────────────────────────────────────── beginning again ──

/**
 * A seed for a run nobody has played yet.
 *
 * The shell may do this and the engine may not: "no Date, no Math.random"
 * binds src/core (.llm/rules/engine.md), and the whole point of a seed is that
 * it comes from outside the deterministic world it then defines. A run is
 * `seed + deaths + inputs, exactly` — this is where the first of the three
 * comes from.
 *
 * A uint32, so it survives the save envelope's `isSafeInt` audit (save.ts) and
 * `runStream`'s mixing without ever being a float. `crypto` where there is one,
 * and a clock where there is not — a repeated seed is a repeated labyrinth, not
 * a crash, so the fallback degrades quietly.
 */
export function freshSeed(): number {
  const source = globalThis.crypto;
  if (source !== undefined && typeof source.getRandomValues === "function") {
    const drawn = source.getRandomValues(new Uint32Array(1))[0];
    if (drawn !== undefined) return drawn;
  }
  return Date.now() >>> 0;
}

/**
 * BEGIN AGAIN: clear the save, mint a run on a fresh seed, and write it.
 *
 * This is the card's GOAL — "begin-again (clear save, fresh seed)" — and it is
 * a function rather than something the button does, because the button is in a
 * document and this is not. `mountEnd` takes the card down and calls the
 * handler; a shell that has a bundle calls THIS from that handler.
 *
 * THE OLD SAVE DOES NOT SURVIVE, whatever happens. The new run is written over
 * it, and if that write is refused — quota, private mode, a locked origin — the
 * key is removed instead. Either way the next boot cannot resume the run that
 * just ended: a finished run that comes back on reload is worse than no save at
 * all, because the end card would raise again over a state nothing can move.
 *
 * A WHOLE NEW CAMPAIGN, and this is the reading to confirm. `newRun` mints a
 * fresh campaign ledger, so the dice, knowledge, landmarks and grants of the
 * run that just ended are gone. That is what "clear save, fresh seed" says, and
 * it is right for an ENDING — endings "read ledger + choices, severance through
 * inheritance" (DESIGN §spoilers), and a campaign that continued past its own
 * ending would have nothing to have ended. It is emphatically NOT what death
 * does: "DICE SURVIVE DEATH — law", death "wakes you at the Crossing" and never
 * reaches this function. If an ending is meant to keep the campaign ledger, this
 * is the line to change, and it is one line.
 */
export function startOver(store: Store, bundle: ContentBundle, seed: number): GameState {
  const begun = newRun(seed, bundle);
  if (autosave(store, begun) === "refused") {
    try {
      store.removeItem(SAVE_KEY);
    } catch {
      // A store that will not write and will not delete is a store with nothing
      // we can do about it. The run in memory is still the new one.
    }
  }
  return begun;
}

export interface EndHandlers {
  /**
   * Begin again, from this ending.
   *
   * The CARD's part is done before this is called: it takes itself down. What
   * happens next needs a bundle and a store, which a renderer has no business
   * holding, so the shell wires `startOver` (above) in here. The ending id is
   * passed on because what a new run opens with may depend on which ending you
   * got, and losing it here would make that unknowable later.
   */
  readonly beginAgain: (ending: Id) => void;
}

export interface EndCard {
  readonly element: HTMLElement;
  /**
   * Look at what an act emitted. Raises the card if — and only if — one of them
   * is an `end`. Answers the ending it raised, or null.
   *
   * THE ONLY WAY THE CARD GOES UP. There is deliberately no `show`.
   */
  consider(emissions: readonly Emission[]): Id | null;
  /** The ending on screen, or null when the card is down. */
  showing(): Id | null;
}

/**
 * Build the end card into `host` — the frame's root (main.ts `Frame.root`).
 *
 * Mounted once, hidden, and never rebuilt: the same discipline as the panel and
 * the scene. It sits in the DOM from boot so that raising it is one attribute
 * and not a construction that could fail at the worst moment a shell has.
 */
export function mountEnd(host: HTMLElement, handlers: EndHandlers): EndCard {
  const owner = host.ownerDocument;

  const card = owner.createElement("div");
  card.className = "end";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-modal", "true");
  card.setAttribute("aria-label", "the run is over");
  card.hidden = true;

  const title = owner.createElement("p");
  title.className = "end-title";
  title.textContent = "THE RUN IS OVER";

  // The ending, by id. The engine never names one and neither does this card:
  // the words are content, and this is the wireframe that shows WHICH ending
  // arrived without inventing what it says.
  const named = owner.createElement("p");
  named.className = "end-ending";

  const again = owner.createElement("button");
  again.type = "button";
  again.className = "end-again";
  again.textContent = "BEGIN AGAIN";

  card.append(title, named, again);
  host.append(card);

  let ending: Id | null = null;

  again.addEventListener("click", () => {
    const was = ending;
    if (was === null) return;
    // Down first, then out. Whoever begins the next run will render into this
    // frame, and it should not have to render around a card that is still up.
    ending = null;
    card.hidden = true;
    named.textContent = "";
    handlers.beginAgain(was);
  });

  return {
    element: card,
    consider(emissions: readonly Emission[]): Id | null {
      const found = endingOf(emissions);
      if (found === null) return null;
      ending = found;
      named.textContent = found;
      card.hidden = false;
      return found;
    },
    showing: () => ending,
  };
}
