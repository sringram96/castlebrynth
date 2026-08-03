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
  GameView,
  ItemRef,
  Pool,
  RunBranch,
  Strip,
  Vitals,
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
    // H010: a bar, exactly like hp — "either bar at zero is death, by the same
    // rule" (DESIGN §ledgers), so the same rule gets the same type.
    sanity: { current: 0, max: 0 },
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
        // H010: campaign ids carry `knowledge:`, run ids carry `flag:` — the
        // prefix is how a card names the ledger it writes (cards.ts).
        knowledge: ["knowledge:knows_glyph"],
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
        flags: ["flag:read_book"],
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
    const reborn = rebirth({ ...RUN, depth: 4, tithes: 12, flags: ["flag:opened_gate"] });
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

describe("H010 · no sanity bar exists anywhere", () => {
  // DESIGN §frame: "Sanity is the vignette closing in — no sanity bar exists
  // anywhere." This block is the whole reason sanity may safely BE a `Pool`:
  // a Pool is what the three rendered bars are, so the honest objection to
  // typing it as one is that it now LOOKS like them. The answer is that
  // looking like them is not enough to become one — there is nowhere to put
  // it on the strip, and tsc is what says so.
  const POOL: Pool = { current: 3, max: 4 };

  it("types sanity as a bar, by the same rule as hp", () => {
    // DESIGN §ledgers: "EITHER bar at zero — health or sanity — is death, by
    // the same rule." Same rule, same kind of quantity, same type.
    const vitals: Vitals = { hp: POOL, might: POOL, will: POOL, sanity: POOL };
    // @ts-expect-error — sanity is a Pool, not the vignette's 0..1 scalar. The
    // vignette is DERIVED from this bar and lives only on GameView.
    const scalar: Vitals = { hp: POOL, might: POOL, will: POOL, sanity: 0.25 };
    expect(vitals.sanity).toStrictEqual(vitals.hp);
    expect(scalar).toBeDefined();
  });

  it("gives the strip no sanity field to draw", () => {
    // The strip is the list of bars that render (DESIGN §frame: HP · Might ·
    // Will · ◎ tithes · depth). A sanity field here would BE the forbidden
    // bar, so its absence is the law — not a note asking a renderer to behave.
    const strip: Strip = { hp: POOL, might: POOL, will: POOL, tithes: 0, depth: 0 };
    // @ts-expect-error — there is nowhere on `Strip` to put sanity, and adding
    // one is the repeal of a design law rather than a widening of a type.
    const barred: Strip = { hp: POOL, might: POOL, will: POOL, tithes: 0, depth: 0, sanity: POOL };
    expect(Object.keys(strip)).not.toContain("sanity");
    expect(Object.keys(strip).sort()).toStrictEqual(["depth", "hp", "might", "tithes", "will"]);
    expect(barred).toBeDefined();
  });

  it("lets sanity reach the shell only as the vignette", () => {
    // @ts-expect-error — `GameView` has no sanity of any shape: the derived
    // `vignette` is the whole of what the shell is handed.
    const leaked: GameView["sanity"] = 0;
    const vignette: GameView["vignette"] = 0.5;
    expect(leaked).toBeDefined();
    expect(vignette).toBe(0.5);
  });
});
