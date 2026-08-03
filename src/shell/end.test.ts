// @vitest-environment jsdom
//
// H114 · the end card, and the law about when it may appear.
//
// The card's DONE WHEN is two proofs: effect → card → begin-again, and a
// FLAG-ONLY fixture that provably shows nothing.
//
// Both are driven through the real engine. The flag-only fixture is a room card
// that raises every flag an inferring shell would be tempted by — a `flag:` one
// and a `knowledge:` one that ratchets across death — and does not say `end`.
// Resolution emits nothing, and the card stays down. A hand-made empty array
// would prove that `[]` is not an ending; this proves that a run which LOOKS
// over is not over.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { newRun } from "../core/api";
import { resolve } from "../core/resolve";
import { SAVE_KEY, restore } from "./storage";
import { endingOf, freshSeed, mountEnd, startOver } from "./end";
import type { RoomCard } from "../core/cards";
import type { Emission } from "../core/resolve";
import type { GameState } from "../core/types";
import type { Store } from "./storage";

const BUNDLE = { version: 1, start: "room:the-cold-ring" } as const;

const CARD: RoomCard = {
  id: "room:the-cold-ring",
  tier: "T0",
  still: "still:the-cold-ring",
  line: "The ring is cold and has been for a long time.",
  doors: [
    { id: "door:down", sense: "A draught, and further down, water." },
    { id: "door:on", sense: "Tallow smoke." },
  ],
  objects: {
    ring: {
      tap: "Dead stone in a dead ring.",
      actions: {
        // THE FLAG-ONLY FIXTURE. Everything an inferring shell would read, and
        // no `end` word: a one-shot of this push, a `knowledge:` id that
        // survives death, a journal line, and prose that says the word.
        finish: [
          {
            say: "That is the end of it.",
            set: ["flag:the-run-is-over", "knowledge:the-ending-was-reached"],
            journal: "Ended it, or thought so.",
          },
        ],
        // The real thing: the language's own `end` word.
        enter: [{ say: "The ring takes you.", end: "ending:the-cold-ring" }],
        // An ending that also writes: the emission must still be found.
        spend: [
          {
            say: "You give it the last of them.",
            adjust: { tithes: -3 },
            set: ["flag:paid"],
            end: "ending:paid-in-full",
          },
        ],
        // No ending at all.
        listen: [{ say: "Water, a long way down." }],
      },
    },
  },
};

function act(action: string): { state: GameState; emissions: readonly Emission[] } {
  const out = resolve(newRun(11, BUNDLE), CARD, { object: "ring", action });
  return { state: out.state, emissions: out.emissions };
}

function mount(): {
  card: ReturnType<typeof mountEnd>;
  host: HTMLElement;
  beginAgain: ReturnType<typeof vi.fn>;
} {
  const host = document.createElement("div");
  host.className = "frame";
  document.body.replaceChildren(host);
  const beginAgain = vi.fn();
  const card = mountEnd(host, { beginAgain });
  return { card, host, beginAgain };
}

const overlay = (host: HTMLElement): HTMLElement => {
  const found = host.querySelector<HTMLElement>(".end");
  if (found === null) throw new Error("no end card");
  return found;
};

/** A store that can be made to refuse, the way a real one does. */
function fakeStore(seed: Record<string, string> = {}): Store & {
  readonly cells: Record<string, string>;
  failWrites: boolean;
} {
  const cells: Record<string, string> = { ...seed };
  return {
    cells,
    failWrites: false,
    getItem: (key) => (Object.prototype.hasOwnProperty.call(cells, key) ? (cells[key] as string) : null),
    setItem(key, value) {
      if (this.failWrites) throw new DOMException("QuotaExceededError");
      cells[key] = value;
    },
    removeItem: (key) => {
      delete cells[key];
    },
  };
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("H114 · begin again: clear save, fresh seed", () => {
  const FINISHED = '{"version":3,"state":{"the run that just ended":true}}';

  it("mints a run on the seed it is given, and writes it over the old save", () => {
    const store = fakeStore({ [SAVE_KEY]: FINISHED });

    const begun = startOver(store, BUNDLE, 4_242);

    expect(begun.seed).toBe(4_242);
    expect(begun.deaths).toBe(0);
    expect(begun.run.roomId).toBe(BUNDLE.start);
    // The old save is gone, and what is there now is the new run.
    expect(store.cells[SAVE_KEY]).not.toBe(FINISHED);
    const found = restore(store);
    expect(found.kind).toBe("resumed");
    if (found.kind === "resumed") expect(found.state).toEqual(begun);
  });

  it("starts a WHOLE NEW CAMPAIGN — the reading to confirm", () => {
    const begun = startOver(fakeStore(), BUNDLE, 7);

    // `newRun` mints a fresh campaign ledger: the dice, knowledge, landmarks
    // and grants of the run that just ended are gone. That is what "clear save"
    // says, and it is emphatically NOT what death does — "DICE SURVIVE DEATH".
    expect(begun.campaign.dice).toEqual([]);
    expect(begun.campaign.knowledge).toEqual([]);
    expect(begun.campaign.landmarks).toEqual([]);
    expect(begun.campaign.signature).toBeNull();
  });

  it("clears the old save even when the new one cannot be written", () => {
    const store = fakeStore({ [SAVE_KEY]: FINISHED });
    store.failWrites = true;

    const begun = startOver(store, BUNDLE, 7);

    // A finished run that comes back on reload is worse than no save at all:
    // the end card would raise again over a state nothing can move.
    expect(store.cells[SAVE_KEY]).toBeUndefined();
    expect(restore(store).kind).toBe("fresh");
    // And the run in memory is still the new one.
    expect(begun.seed).toBe(7);
  });

  it("mints a fresh seed the engine could not have minted itself", () => {
    // "no Date, no Math.random" binds src/core; the whole point of a seed is
    // that it comes from outside the deterministic world it defines.
    const seeds = new Set(Array.from({ length: 32 }, () => freshSeed()));

    for (const seed of seeds) {
      expect(Number.isSafeInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
    }
    // Not a constant. (32 draws colliding into one value is ~2^-960.)
    expect(seeds.size).toBeGreaterThan(1);
  });

  it("survives the save envelope on a minted seed", () => {
    const store = fakeStore();
    const begun = startOver(store, BUNDLE, freshSeed());
    const found = restore(store);

    // `save.ts` audits `seed: isSafeInt` — a float or an out-of-range seed
    // would load back as null and the next boot would offer a new run.
    expect(found.kind).toBe("resumed");
    if (found.kind === "resumed") expect(found.state.seed).toBe(begun.seed);
  });
});

describe("H114 · the layering law: only an `end` word raises the card", () => {
  it("reads emissions, and there is nothing else it could read", () => {
    // `endingOf` takes a list of emissions. It has no parameter for a state, so
    // there is no flag to infer from — the inference is not forbidden, it is
    // unavailable.
    expect(endingOf([])).toBeNull();
    expect(endingOf([{ kind: "goto", door: "door:down" }])).toBeNull();
    expect(endingOf([{ kind: "end", ending: "ending:x" }])).toBe("ending:x");
  });

  it("shows nothing for the flag-only fixture, which is as ended as a state gets", () => {
    const { state, emissions } = act("finish");
    const { card, host } = mount();

    // The state now carries a run flag saying the run is over AND a knowledge
    // id that death cannot lower. A card raised off either would be up.
    expect(state.run.flags).toContain("flag:the-run-is-over");
    expect(state.campaign.knowledge).toContain("knowledge:the-ending-was-reached");
    expect(emissions).toEqual([]);

    expect(card.consider(emissions)).toBeNull();
    expect(card.showing()).toBeNull();
    expect(overlay(host).hidden).toBe(true);
  });

  it("shows nothing for an ordinary act", () => {
    const { card, host } = mount();
    expect(card.consider(act("listen").emissions)).toBeNull();
    expect(overlay(host).hidden).toBe(true);
  });

  it("offers no second door: `show` does not exist", () => {
    const { card } = mount();
    // The whole surface is `consider`. A `show(ending)` would be a second
    // answer to "why is the card up", and the first time the two disagreed the
    // card would appear over a run that had not ended.
    expect("show" in card).toBe(false);
    expect(Object.keys(card).sort()).toEqual(["consider", "element", "showing"]);
  });
});

describe("H114 · effect → card → begin again", () => {
  it("raises the card on the `end` word, named by the ending the engine emitted", () => {
    const { emissions } = act("enter");
    const { card, host } = mount();

    expect(emissions).toEqual([{ kind: "end", ending: "ending:the-cold-ring" }]);
    expect(card.consider(emissions)).toBe("ending:the-cold-ring");
    expect(card.showing()).toBe("ending:the-cold-ring");
    expect(overlay(host).hidden).toBe(false);
    // The engine never names an ending, and neither does this card: it shows
    // the id it was handed. The words are content.
    expect(host.querySelector(".end-ending")?.textContent).toBe("ending:the-cold-ring");
  });

  it("finds the ending in an act that also wrote to the state", () => {
    const { state, emissions } = act("spend");
    const { card } = mount();

    expect(state.run.tithes).toBe(-3);
    expect(card.consider(emissions)).toBe("ending:paid-in-full");
  });

  it("begins again, and takes the card down before handing the ending on", () => {
    const { card, host, beginAgain } = mount();
    card.consider(act("enter").emissions);

    let cardWasUp = true;
    beginAgain.mockImplementation(() => {
      // Whoever begins the next run renders into this frame; it must not have
      // to render around a card that is still up.
      cardWasUp = !overlay(host).hidden;
    });
    host.querySelector<HTMLButtonElement>(".end-again")?.click();

    expect(beginAgain).toHaveBeenCalledTimes(1);
    // The ending is passed on: what a new run opens with may depend on which
    // ending you got, and losing it here would make that unknowable later.
    expect(beginAgain).toHaveBeenCalledWith("ending:the-cold-ring");
    expect(cardWasUp).toBe(false);
    expect(card.showing()).toBeNull();
    expect(overlay(host).hidden).toBe(true);
  });

  it("does nothing when BEGIN AGAIN is pressed with no card up", () => {
    const { host, beginAgain } = mount();
    host.querySelector<HTMLButtonElement>(".end-again")?.click();
    expect(beginAgain).not.toHaveBeenCalled();
  });

  it("is in the DOM from the start, hidden — never built at the worst moment", () => {
    const { host } = mount();
    expect(host.querySelector(".end")).not.toBeNull();
    expect(overlay(host).hidden).toBe(true);
    expect(host.querySelector(".end-again")).not.toBeNull();
  });

  it("can end a second run after beginning again", () => {
    const { card, host } = mount();
    card.consider(act("enter").emissions);
    host.querySelector<HTMLButtonElement>(".end-again")?.click();

    expect(card.consider(act("spend").emissions)).toBe("ending:paid-in-full");
    expect(overlay(host).hidden).toBe(false);
  });
});
