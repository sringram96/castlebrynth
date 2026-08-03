// @vitest-environment jsdom
//
// H108 · the save, kept.
//
// The card's DONE WHEN is two sentences and both are proved here: "mid-anything
// reload resumes exactly", and "corrupt save → clean new-run path".
//
// THE MID-PUSH STATE IS PLAYED, NOT WRITTEN. A hand-built literal would prove
// that this file can round-trip a literal. So the state below is driven through
// the real engine — a room resolved, an item taken, a bar moved, a refusal
// remembered, a door walked — until it is somewhere no fresh run can be: a
// depth above zero, with a Descent stream off draw 0, on both ledgers at once.
// Then it is saved and read back, and it must come back EQUAL, whole.
//
// The reload is the real `localStorage` in one test and a fake in the rest. The
// fake is not a convenience: a browser store that throws on quota, or in
// private mode, or on a locked origin, is the case a player actually hits, and
// there is no way to reach it through the real one.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { newRun } from "../core/api";
import { descend } from "../core/doors";
import { resolve } from "../core/resolve";
import { save } from "../core/save";
import {
  QUARANTINE_KEY,
  SAVE_KEY,
  autosave,
  persisting,
  quarantine,
  restore,
} from "./storage";
import type { RoomCard } from "../core/cards";
import type { GameState } from "../core/types";
import type { Store } from "./storage";

const BUNDLE = { version: 1, start: "room:crossing" } as const;
const POOL = ["room:stair", "room:cistern", "room:tallow-store"] as const;
const SEED = 8_191;

/** One room, enough words in it to touch both ledgers, the pouch, a bar and the
 *  refused list. Ungated fallbacks throughout — this file is not testing gates. */
const CARD: RoomCard = {
  id: "room:crossing",
  tier: "T0",
  still: "still:crossing",
  line: "The portal is cold and has been for a long time.",
  doors: [
    { id: "door:down", sense: "A draught, and further down, water." },
    { id: "door:on", sense: "Tallow smoke." },
  ],
  objects: {
    portal: {
      tap: "Dead stone in a dead ring.",
      actions: {
        reach: [
          {
            say: "The ring takes the skin off two knuckles.",
            set: ["flag:touched-the-ring", "knowledge:the-ring-is-dead"],
            give: [{ id: "item:ring-flake", keep: "kept" }],
            adjust: { hp: -2, tithes: 3 },
            journal: "Put a hand in the ring. It was cold.",
          },
        ],
      },
    },
    door: {
      tap: "A door, and a draught under it.",
      actions: {
        name: [{ say: "The labyrinth does not answer to that.", refuse: true }],
        open: [{ say: "Down, then.", goto: "door:down" }],
      },
    },
  },
};

/** A store that is not a browser's: every call is watched, and any of them can
 *  be made to throw the way a real one does. */
function fakeStore(seed: Record<string, string> = {}): Store & {
  readonly cells: Record<string, string>;
  failWrites: boolean;
  failReads: boolean;
} {
  const cells: Record<string, string> = { ...seed };
  return {
    cells,
    failWrites: false,
    failReads: false,
    getItem(key) {
      if (this.failReads) throw new DOMException("SecurityError");
      return Object.prototype.hasOwnProperty.call(cells, key) ? (cells[key] as string) : null;
    },
    setItem(key, value) {
      if (this.failWrites) throw new DOMException("QuotaExceededError");
      cells[key] = value;
    },
    removeItem(key) {
      delete cells[key];
    },
  };
}

/**
 * Play into the middle of a push: touch the ring, be refused, walk a door.
 *
 * Every one of those lands somewhere different — the run's flags, the campaign's
 * knowledge and journal and refused list, the pouch, hp, tithes, the depth, and
 * the Descent's stream position — so a save that drops any one branch cannot
 * come back equal.
 */
function midPush(): GameState {
  const opened = newRun(SEED, BUNDLE);
  const touched = resolve(opened, CARD, { object: "portal", action: "reach" }).state;
  const refused = resolve(touched, CARD, { object: "door", action: "name" }).state;
  const walked = descend(refused.run, CARD, "door:down", POOL);
  if (walked === null) throw new Error("fixture: the door did not open");
  return { ...refused, run: walked };
}

beforeEach(() => {
  localStorage.clear();
});

describe("H108 · mid-anything reload resumes exactly", () => {
  it("is genuinely mid-push before it is saved", () => {
    const state = midPush();

    // If any of these matched a fresh run, the round-trip below would prove
    // nothing: an empty state survives any storage layer.
    expect(state.run.depth).toBe(1);
    expect(state.run.descent.draws).toBeGreaterThan(0);
    expect(state.run.flags).toContain("flag:touched-the-ring");
    expect(state.campaign.knowledge).toContain("knowledge:the-ring-is-dead");
    expect(state.campaign.journal).toHaveLength(1);
    expect(state.campaign.refused).toHaveLength(1);
    expect(state.run.pouch.consumables).toHaveLength(1);
    expect(state.run.vitals.hp.current).toBe(-2);
    expect(state.run.tithes).toBe(3);
  });

  it("comes back whole through the browser's own storage", () => {
    const state = midPush();
    autosave(localStorage, state);

    // The reload: nothing in memory, only what is on the origin.
    const found = restore(localStorage);

    expect(found.kind).toBe("resumed");
    if (found.kind !== "resumed") return;
    expect(found.state).toEqual(state);
    // Both branches, named, so a partial save cannot pass on the whole compare
    // alone if the shape ever loosens.
    expect(found.state.run).toEqual(state.run);
    expect(found.state.campaign).toEqual(state.campaign);
  });

  it("resumes the stream's POSITION, so the next door is the same door", () => {
    const state = midPush();
    autosave(localStorage, state);
    const found = restore(localStorage);
    if (found.kind !== "resumed") throw new Error("expected a resume");

    // Determinism across a reload is the whole point: `run = seed + deaths +
    // inputs, exactly` (.llm/rules/engine.md). A save that lost `descent.draws`
    // would still deep-equal on everything a player can see, and would open a
    // different labyrinth on the very next step.
    const before = descend(state.run, CARD, "door:on", POOL);
    const after = descend(found.state.run, CARD, "door:on", POOL);
    expect(after).toEqual(before);
    expect(after?.roomId).toBe(before?.roomId);
  });

  it("writes after EVERY act, not only the last one", () => {
    const store = fakeStore();
    // The transition is handed out WRAPPED. There is no unwrapped `act` in
    // reach of a caller, which is the point of `persisting`.
    const act = persisting(store, (state: GameState, object: string, action: string) =>
      resolve(state, CARD, { object, action }),
    );

    let state = newRun(SEED, BUNDLE);
    const readBack = (): GameState => {
      const found = restore(store);
      if (found.kind !== "resumed") throw new Error("expected a resume");
      return found.state;
    };

    state = act(state, "portal", "reach").state;
    expect(readBack()).toEqual(state);

    state = act(state, "door", "name").state;
    expect(readBack()).toEqual(state);

    // An act that changes nothing still writes: the engine hands back the very
    // same state object for an inert act (resolve.ts), and "after every act"
    // does not have an exception for the boring ones.
    const writes = vi.spyOn(store, "setItem");
    state = act(state, "portal", "no-such-action").state;
    expect(writes).toHaveBeenCalledTimes(1);
    expect(readBack()).toEqual(state);
  });

  it("hands back exactly what the transition returned", () => {
    const store = fakeStore();
    const act = persisting(store, (state: GameState) =>
      resolve(state, CARD, { object: "portal", action: "reach" }),
    );
    const out = act(newRun(SEED, BUNDLE));

    // The wrapper is a save, not a filter: the effects and emissions the shell
    // needs ride through untouched.
    expect(out.effects).toEqual([
      { kind: "say", text: "The ring takes the skin off two knuckles." },
    ]);
    expect(out.emissions).toEqual([]);
  });
});

describe("H108 · boot restores, or offers a new run", () => {
  it("calls an empty origin fresh, not broken", () => {
    expect(restore(fakeStore()).kind).toBe("fresh");
  });

  it("calls an empty string fresh — a half-finished write is not a loss", () => {
    expect(restore(fakeStore({ [SAVE_KEY]: "" })).kind).toBe("fresh");
  });

  it("calls a store that will not even be read fresh, instead of throwing", () => {
    const store = fakeStore({ [SAVE_KEY]: save(midPush()) });
    store.failReads = true;
    expect(() => restore(store)).not.toThrow();
    expect(restore(store).kind).toBe("fresh");
  });
});

describe("H108 · corrupt save → clean new-run path", () => {
  const CORRUPT = '{"version":3,"state":{"seed":1,"run":';

  it("refuses a corrupt save without throwing, and without touching it", () => {
    const store = fakeStore({ [SAVE_KEY]: CORRUPT });
    const found = restore(store);

    expect(found.kind).toBe("unreadable");
    if (found.kind !== "unreadable") return;
    expect(found.text).toBe(CORRUPT);
    // BOOT DESTROYS NOTHING. The player has not chosen yet.
    expect(store.cells[SAVE_KEY]).toBe(CORRUPT);
    expect(store.cells[QUARANTINE_KEY]).toBeUndefined();
  });

  it("refuses a save from a newer build the same way — and that is why nothing is deleted", () => {
    const future = JSON.stringify({ version: 99, state: midPush() });
    const found = restore(fakeStore({ [SAVE_KEY]: future }));

    // A campaign this build cannot read is still a campaign: dice, knowledge,
    // landmarks, the ledger death cannot touch (DESIGN §ledgers). It reads
    // identically to corruption from here, which is the whole argument for
    // moving an unreadable save aside instead of overwriting it.
    expect(found.kind).toBe("unreadable");
  });

  it("begins again over an unreadable save without losing it", () => {
    const store = fakeStore({ [SAVE_KEY]: CORRUPT });

    expect(quarantine(store)).toBe("saved");
    expect(store.cells[QUARANTINE_KEY]).toBe(CORRUPT);
    expect(store.cells[SAVE_KEY]).toBeUndefined();

    // And the path is clean: a new run boots fresh and saves over nothing.
    expect(restore(store).kind).toBe("fresh");
    const begun = newRun(SEED, BUNDLE);
    expect(autosave(store, begun)).toBe("saved");
    const found = restore(store);
    expect(found.kind).toBe("resumed");
    if (found.kind === "resumed") expect(found.state).toEqual(begun);
    // Still there. Beginning again cost the player nothing they had.
    expect(store.cells[QUARANTINE_KEY]).toBe(CORRUPT);
  });

  it("keeps the original when the aside copy cannot be written", () => {
    const store = fakeStore({ [SAVE_KEY]: CORRUPT });
    store.failWrites = true;

    // A full store is the likeliest reason a save went bad in the first place,
    // so this is the case where a remove-then-copy would lose everything.
    expect(quarantine(store)).toBe("refused");
    expect(store.cells[SAVE_KEY]).toBe(CORRUPT);
  });

  it("has nothing to set aside when nothing is saved", () => {
    const store = fakeStore();
    expect(quarantine(store)).toBe("saved");
    expect(store.cells[QUARANTINE_KEY]).toBeUndefined();
  });
});

describe("H108 · a store that refuses does not end the run", () => {
  it("reports a refused write instead of throwing", () => {
    const store = fakeStore();
    store.failWrites = true;
    expect(autosave(store, midPush())).toBe("refused");
  });

  it("lets a wrapped act carry on unsaved", () => {
    const store = fakeStore();
    store.failWrites = true;
    const act = persisting(store, (state: GameState) =>
      resolve(state, CARD, { object: "portal", action: "reach" }),
    );

    // The run continues. A game that stopped mid-push because a disk filled up
    // would be worse than one that failed to save.
    expect(() => act(newRun(SEED, BUNDLE))).not.toThrow();
    expect(act(newRun(SEED, BUNDLE)).state.run.tithes).toBe(3);
  });
});
