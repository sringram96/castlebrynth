// H001 · the type laws, asserted.
//
// Half of this file never runs: `@ts-expect-error` is the assertion, and tsc
// fails the law if the line it guards stops being an error. That is how the
// branch law and the readonly law are proved — the compiler is the test
// runner for those.

import { describe, expect, it } from "vitest";
import type {
  CampaignBranch,
  DeathTransition,
  EquipmentSlots,
  GameState,
  ItemRef,
  RunBranch,
} from "./types";

const CAMPAIGN: CampaignBranch = {
  branch: "campaign",
  dice: [],
  knowledge: [],
  journal: [],
  refused: [],
  landmarks: [],
  grants: [],
};

const RUN: RunBranch = {
  branch: "run",
  rng: { seed: 42, draws: 0 },
  depth: 0,
  roomId: null,
  vitals: {
    hp: { current: 0, max: 0 },
    might: { current: 0, max: 0 },
    will: { current: 0, max: 0 },
    sanity: 0,
  },
  tithes: 0,
  consumables: [],
  equipment: [null, null, null, null],
  small: [null, null],
  skills: [],
  flags: [],
};

const TRIVIAL: GameState = { seed: 42, deaths: 0, campaign: CAMPAIGN, run: RUN };

describe("H001 · state is JSON", () => {
  it("round-trips a trivial state, byte for byte", () => {
    const text = JSON.stringify(TRIVIAL);
    const back: unknown = JSON.parse(text);
    expect(back).toStrictEqual(TRIVIAL);
    expect(JSON.stringify(back)).toBe(text);
  });

  it("round-trips a furnished state, byte for byte", () => {
    const key: ItemRef = { id: "item:key", keep: "key" };
    const furnished: GameState = {
      seed: 7,
      deaths: 3,
      campaign: {
        ...CAMPAIGN,
        dice: [{ id: "die:hollow" }],
        knowledge: ["knows_glyph"],
        journal: ["procession"],
        refused: [{ intent: { object: "book", action: "read" }, depth: 0 }],
        landmarks: ["landmark:well"],
        grants: ["grant:lantern"],
      },
      run: {
        ...RUN,
        depth: 2,
        roomId: "room:cistern",
        tithes: 6,
        consumables: [{ id: "item:candle", keep: "none" }],
        equipment: [key, null, null, null],
        small: [null, { id: "item:knife", keep: "kept" }],
        skills: [{ id: "skill:steady", uses: { current: 1, max: 2 } }],
        flags: ["read_book"],
      },
    };
    const text = JSON.stringify(furnished);
    const back: unknown = JSON.parse(text);
    expect(back).toStrictEqual(furnished);
    expect(JSON.stringify(back)).toBe(text);
  });

  it("carries no undefined, so no field can vanish in a save", () => {
    // JSON.stringify drops keys whose value is undefined. If the round-trip
    // above is byte-identical AND the key sets match, nothing was dropped.
    const back = JSON.parse(JSON.stringify(TRIVIAL)) as Record<string, unknown>;
    expect(Object.keys(back).sort()).toStrictEqual(Object.keys(TRIVIAL).sort());
    expect(Object.keys(back["run"] as object).sort()).toStrictEqual(Object.keys(RUN).sort());
    expect(Object.keys(back["campaign"] as object).sort()).toStrictEqual(
      Object.keys(CAMPAIGN).sort(),
    );
  });
});

describe("H001 · the state cannot be written in place", () => {
  it("rejects every mutation the free tap might attempt", () => {
    // Never called. The assertions are the @ts-expect-error directives: if any
    // of these stops being a compile error, `npm run law` goes red.
    const attempt = (state: GameState): void => {
      // @ts-expect-error — readonly: this is why `view` cannot mutate (ui.md)
      state.run.depth = 1;
      // @ts-expect-error — readonly, all the way down
      state.run.vitals.hp.current = 99;
      // @ts-expect-error — lists are ReadonlyArray, so nothing can be pushed
      state.campaign.journal.push("no");
      // @ts-expect-error — nor spliced out
      state.campaign.dice.splice(0, 1);
      // @ts-expect-error — nor can a branch be swapped wholesale
      state.campaign = CAMPAIGN;
    };
    expect(typeof attempt).toBe("function");
  });
});

describe("H001 · run and campaign are disjoint branches", () => {
  it("refuses to pass one where the other is wanted", () => {
    // @ts-expect-error — a campaign branch is not a run branch (engine.md)
    const asRun: RunBranch = CAMPAIGN;
    // @ts-expect-error — and a run branch is not a campaign branch
    const asCampaign: CampaignBranch = RUN;
    expect(asRun.branch).toBe("campaign");
    expect(asCampaign.branch).toBe("run");
  });

  it("lets death empty the run branch", () => {
    const rebirth: DeathTransition = (dying) => ({
      ...dying,
      depth: 0,
      tithes: 0,
      consumables: [],
      equipment: [null, null, null, null],
      small: [null, null],
      flags: [],
    });
    const reborn = rebirth({ ...RUN, depth: 4, tithes: 12, flags: ["opened_gate"] });
    expect(reborn.depth).toBe(0);
    expect(reborn.tithes).toBe(0);
    expect(reborn.flags).toStrictEqual([]);
  });

  it("forbids death code from reaching the campaign ledger", () => {
    // DICE SURVIVE DEATH — enforced by tsc, not by a comment. A death
    // transition cannot be handed the campaign branch...
    // @ts-expect-error — the whole state is not a death transition's business
    const takesState: DeathTransition = (state: GameState) => state.run;
    // @ts-expect-error — nor the campaign branch on its own
    const takesCampaign: DeathTransition = (ledger: CampaignBranch) => ({ ...RUN, flags: ledger.knowledge });
    // ...and cannot hand one back.
    // @ts-expect-error — death may not return a campaign branch
    const returnsCampaign: DeathTransition = () => CAMPAIGN;
    expect([takesState, takesCampaign, returnsCampaign].every((f) => typeof f === "function")).toBe(true);
  });
});

describe("H001 · design law the compiler keeps", () => {
  it("fixes the pouch at 4 equipment + 2 small slots", () => {
    // @ts-expect-error — 5 is not 4 (DESIGN §ledgers, death, growth)
    const tooMany: EquipmentSlots = [null, null, null, null, null];
    // @ts-expect-error — 3 is not 4
    const tooFew: EquipmentSlots = [null, null, null];
    expect(tooMany).toHaveLength(5);
    expect(tooFew).toHaveLength(3);
    // A slot read is exact — tuples have no holes, so no undefined creeps in.
    const slot = RUN.equipment[0];
    expect(slot).toBeNull();
  });

  it("compiles under noUncheckedIndexedAccess", () => {
    // @ts-expect-error — an array read may be undefined, and must be handled
    const first: ItemRef = RUN.consumables[0];
    expect(first).toBeUndefined();
  });
});
