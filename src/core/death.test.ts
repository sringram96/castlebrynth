// D003 · death: either bar at zero, and what comes back with you.
//
// The expensive law here is the one that is hardest to notice being broken:
// DICE SURVIVE DEATH. A death that reached the campaign branch would take them,
// and nothing in a playtest would say so until a campaign's worth were gone. So
// it is checked three ways — by the type (`DeathTransition`, types.ts), by the
// lint (eslint.config.mjs forbids death.ts from naming the campaign branch at
// all), and here, by IDENTITY: the campaign that goes into a death is the very
// object that comes out, not a deep-equal copy of it.
//
// This file may name the campaign branch. death.ts may not — proving the ledger
// came through untouched requires reaching for it, which is exactly what the
// lint rule exists to stop the implementation doing.

import { describe, expect, it } from "vitest";
import { newRun } from "./api";
import { death, isDead } from "./death";
import { openPush } from "./doors";
import { runStream } from "./rng";
import { load, save } from "./save";
import type { ContentBundle, GameState, ItemRef, Pool, Pouch, RunBranch, Vitals } from "./types";

const BUNDLE: ContentBundle = { version: 1, start: "room:crossing" };

const bar = (current: number, max: number): Pool => ({ current, max });

const VITALS: Vitals = {
  hp: bar(4, 6),
  might: bar(2, 3),
  will: bar(1, 3),
  sanity: bar(5, 6),
};

const KEY: ItemRef = { id: "item:iron-key", keep: "key" };
const KEPT: ItemRef = { id: "item:knife", keep: "kept" };
const LOOSE = (n: number): ItemRef => ({ id: `item:candle-${n}`, keep: "none" });

const POUCH: Pouch = {
  consumables: [LOOSE(1), LOOSE(2), LOOSE(3)],
  equipment: [KEPT, LOOSE(4), null, null],
  small: [KEY, null],
};

/** A run mid-push, carrying everything, about to die. */
function dying(over: Partial<RunBranch> = {}): RunBranch {
  return {
    ...newRun(42, BUNDLE).run,
    depth: 3,
    roomId: "room:cistern",
    vitals: { ...VITALS, hp: bar(0, 6) },
    tithes: 11,
    pouch: POUCH,
    skills: [{ id: "skill:steady", uses: { current: 0, max: 2 } }],
    flags: ["flag:door-opened", "flag:ambush-sprung"],
    ...over,
  };
}

const ids = (pouch: Pouch): readonly string[] =>
  [
    ...pouch.consumables,
    ...pouch.equipment.filter((slot) => slot !== null),
    ...pouch.small.filter((slot) => slot !== null),
  ].map((item) => item.id);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// ────────────────────────────────────────────────────────── the predicate ──

describe("D003 · either bar at zero is death, by the same rule", () => {
  const withBar = (track: "hp" | "sanity", pool: Pool): RunBranch =>
    dying({ vitals: { ...VITALS, [track]: pool } });

  it("kills on hp and on sanity alike — one rule, so one predicate", () => {
    // DESIGN §ledgers: "EITHER bar at zero — health or sanity — is death, by
    // the same rule." There is nothing hp-shaped or sanity-shaped in the
    // answer, which is the point.
    for (const track of ["hp", "sanity"] as const) {
      expect(isDead(withBar(track, bar(0, 6))), track).toBe(true);
      expect(isDead(withBar(track, bar(1, 6))), track).toBe(false);
    }
  });

  it("kills below zero too — nothing is clamped in this engine", () => {
    // A room's `adjust` moves a bar by exactly what the card said, and "the
    // delta arrived first" (resolve.ts). A 3-point blow to a 2-point bar lands
    // on -1, and `=== 0` would let a player walk out of the room that killed
    // them.
    for (const track of ["hp", "sanity"] as const) {
      expect(isDead(withBar(track, bar(-1, 6))), track).toBe(true);
      expect(isDead(withBar(track, bar(-99, 6))), track).toBe(true);
    }
  });

  it("is not fooled by the stats — might and will are the body, not bars", () => {
    // DESIGN §the lots: "Stats are the body ... dice are the hands." Neither
    // kills, at any value.
    const alive = dying({ vitals: { ...VITALS, might: bar(0, 3), will: bar(-2, 3) } });
    expect(isDead(alive)).toBe(false);
  });

  it("does not call an unopened run dead", () => {
    // `freshRun` mints every pool at {0,0} — starting bars are balance, and
    // balance is content (api.ts). Without the guard, `newRun` would answer
    // dead and the lifecycle's first act would be a funeral.
    const fresh = newRun(42, BUNDLE).run;
    expect(fresh.vitals.hp).toStrictEqual({ current: 0, max: 0 });
    expect(isDead(fresh)).toBe(false);
    // But a bar that WAS opened and then emptied is death, at the same reading.
    expect(isDead({ ...fresh, vitals: { ...fresh.vitals, hp: bar(0, 1) } })).toBe(true);
  });

  it("is a question, not a transition — asking does not kill", () => {
    const run = dying();
    const before = clone(run);
    isDead(run);
    isDead(run);
    expect(clone(run)).toStrictEqual(before);
  });
});

// ─────────────────────────────────────────────────── what death cannot touch ──

describe("D003 · DICE SURVIVE DEATH", () => {
  it("hands the campaign branch back by identity, not by copy", () => {
    // The strongest form available: the object that went in is the object that
    // comes out. A deep-equal assertion would pass a death that rebuilt the
    // ledger correctly by accident; this one does not.
    const state: GameState = { ...newRun(42, BUNDLE), run: dying() };
    const campaign = {
      ...state.campaign,
      dice: [{ id: "die:hollow" }, { id: "die:bone" }],
      signature: { id: "die:hollow" },
      stash: [{ id: "item:rope", keep: "none" } as ItemRef],
      knowledge: ["knowledge:the-book"],
      journal: ["A line already written."],
      landmarks: ["landmark:the-well"],
      grants: ["grant:steady-hands"],
    };
    const after: GameState = { ...state, campaign, run: death(state.run) };
    expect(after.campaign).toBe(campaign);
    expect(after.campaign.dice).toBe(campaign.dice);
    expect(after.campaign.signature).toBe(campaign.signature);
    expect(after.campaign.stash).toBe(campaign.stash);
  });

  it("takes a run branch and returns one — there is no state to reach through", () => {
    // The type says it (types.ts `DeathTransition`) and the lint says it again
    // over the file (eslint.config.mjs). This is the runtime shape of the same
    // fact: what death answers is a run branch, wearing the run's discriminant.
    const reborn = death(dying());
    expect(reborn.branch).toBe("run");
    expect(Object.keys(reborn)).not.toContain("campaign");
    expect(JSON.stringify(reborn)).not.toContain("knowledge");
  });

  it("does not mutate the branch it was handed", () => {
    const run = dying();
    const before = clone(run);
    death(run);
    death(run);
    expect(clone(run)).toStrictEqual(before);
  });
});

// ──────────────────────────────────────────────────────── what death takes ──

describe("D003 · death takes the run ledger", () => {
  it("takes the coin, the flags, the depth and the room", () => {
    const reborn = death(dying());
    expect(reborn.tithes).toBe(0);
    expect(reborn.flags).toStrictEqual([]);
    expect(reborn.depth).toBe(0);
    // Nowhere, yet: which room the Crossing IS comes from the bundle, and the
    // engine never names a room. Standing you there is the lifecycle's.
    expect(reborn.roomId).toBeNull();
  });

  it("restores every bar, and every skill's uses", () => {
    // "Death wakes you at the Crossing, bars and uses restored"
    // (DESIGN §ledgers).
    const reborn = death(dying());
    for (const track of ["hp", "might", "will", "sanity"] as const) {
      expect(reborn.vitals[track].current, track).toBe(reborn.vitals[track].max);
    }
    expect(reborn.skills[0]?.uses).toStrictEqual({ current: 2, max: 2 });
  });

  it("leaves every ceiling where it was — what a bar's max is remains content", () => {
    const reborn = death(dying());
    expect(reborn.vitals.hp.max).toBe(6);
    expect(reborn.vitals.sanity.max).toBe(6);
    expect(reborn.vitals.might.max).toBe(3);
  });

  it("wakes you alive — the restored bars are not a corpse", () => {
    expect(isDead(dying())).toBe(true);
    expect(isDead(death(dying()))).toBe(false);
  });
});

// ────────────────────────────────────────────────── what comes back with you ──

describe("D003 · ✦ key, • kept, and one random survivor", () => {
  it("brings back every key and every kept thing", () => {
    const kept = ids(death(dying()).pouch);
    expect(kept).toContain(KEY.id);
    expect(kept).toContain(KEPT.id);
  });

  it("brings back exactly one of the rest, and takes the others", () => {
    // Four `keep: "none"` items go in; one comes back.
    const survivors = ids(death(dying()).pouch);
    const loose = survivors.filter((id) => id.startsWith("item:candle-"));
    expect(loose).toHaveLength(1);
    expect(survivors).toHaveLength(3);
  });

  it("keeps a survivor in the place it was carried", () => {
    // The pouch's shape never changes (types.ts `Pouch`), and where a thing was
    // is information death has no reason to take.
    const reborn = death(dying());
    expect(reborn.pouch.small[0]).toStrictEqual(KEY);
    expect(reborn.pouch.small[1]).toBeNull();
    expect(reborn.pouch.equipment[0]).toStrictEqual(KEPT);
    expect(reborn.pouch.equipment).toHaveLength(4);
    expect(reborn.pouch.small).toHaveLength(2);
  });

  it("takes everything when everything is loose, but for the one", () => {
    const run = dying({
      pouch: { consumables: [LOOSE(1), LOOSE(2)], equipment: [null, null, null, null], small: [null, null] },
    });
    expect(ids(death(run).pouch)).toHaveLength(1);
  });

  it("takes nothing when nothing is loose — and draws no word for it", () => {
    // A pouch of pure keeps has no pool to draw from. `pick` charges for a
    // one-item pool (rng.ts) but there is no such discipline for an empty one.
    const run = dying({
      pouch: { consumables: [], equipment: [KEPT, null, null, null], small: [KEY, null] },
    });
    const reborn = death(run);
    expect([...ids(reborn.pouch)].sort()).toStrictEqual([KEPT.id, KEY.id].sort());
    expect(reborn.rng.draws).toBe(run.rng.draws);
  });

  it("survives an empty pouch without drawing or failing", () => {
    const run = dying({
      pouch: { consumables: [], equipment: [null, null, null, null], small: [null, null] },
    });
    expect(() => death(run)).not.toThrow();
    expect(ids(death(run).pouch)).toStrictEqual([]);
    expect(death(run).rng.draws).toBe(run.rng.draws);
  });

  it("keeps two of the same thing straight — a pouch is not a set", () => {
    const twin: ItemRef = { id: "item:candle-1", keep: "none" };
    const run = dying({
      pouch: { consumables: [twin, twin], equipment: [null, null, null, null], small: [null, null] },
    });
    expect(death(run).pouch.consumables).toHaveLength(1);
  });
});

// ────────────────────────────────────────────────────────── the survivor draw ──

describe("D003 · the survivor is drawn off the run's ROOT stream", () => {
  it("spends exactly one word of the root when something is doomed", () => {
    const run = dying();
    expect(death(run).rng.draws).toBe(run.rng.draws + 1);
    expect(death(run).rng.seed).toBe(run.rng.seed);
  });

  it("does not spend the Descent's stream — the doors were already drawn", () => {
    // Spending a word of `run.descent` here would shift every door of the push:
    // WHICH push you died on would change where its doors led. So death must
    // not read it, and the proof is that two runs differing ONLY in their
    // descent position die identically, but for that field.
    const a = dying({ descent: { seed: 500, draws: 0 } });
    const b = dying({ descent: { seed: 500, draws: 37 } });
    expect(death(a).pouch).toStrictEqual(death(b).pouch);
    expect(death(a).rng).toStrictEqual(death(b).rng);
  });

  it("is deterministic: the same death saves the same thing, every replay", () => {
    expect(JSON.stringify(death(dying()))).toBe(JSON.stringify(death(dying())));
  });

  it("is seed-sensitive: which thing survives is a draw, not a rule", () => {
    // Over a spread of roots, more than one of the four loose items comes back.
    // (Not "every seed differs" — that would be asserting the mixer's output.)
    const saved = new Set(
      Array.from({ length: 24 }, (_, seed) =>
        ids(death(dying({ rng: { seed, draws: 0 } })).pouch)
          .filter((id) => id.startsWith("item:candle-"))
          .join(),
      ),
    );
    expect(saved.size).toBeGreaterThan(1);
  });

  it("leaves the root's forks where they were — advancing a root moves no child", () => {
    // A fork reads its parent's SEED and never its position (rng.ts), which is
    // the whole reason the survivor may be drawn from the root at all.
    const run = dying();
    expect(openPush(death(run).rng)).toStrictEqual(openPush(run.rng));
  });
});

// ─────────────────────────────────────────────────────────────── doors redraw ──

describe("D003 · doors redraw off the death count, and not off death", () => {
  it("re-opens the Descent's stream, so no mid-push draw rides through", () => {
    const run = dying({ descent: { seed: 500, draws: 37 } });
    const reborn = death(run);
    expect(reborn.descent).toStrictEqual(openPush(reborn.rng));
    expect(reborn.descent.draws).toBe(0);
  });

  it("does NOT itself redraw the labyrinth — that is the death COUNT's doing", () => {
    // Stated plainly so the re-opening above is never misread as the redraw.
    // Death is handed a run branch; it has no idea how many times you have
    // died. The labyrinth changes because REBIRTH re-roots the run at
    // `runStream(seed, deaths + 1)` and the push's stream forks off that root —
    // walked end to end in doors.test.ts.
    const run = dying();
    expect(death(run).descent).toStrictEqual(openPush(run.rng));
    // Re-rooted for the next push, it is a different stream entirely.
    const nextPush = openPush(runStream(42, 1));
    expect(nextPush).not.toStrictEqual(death(run).descent);
  });
});

// ──────────────────────────────────────────────────────────────── the save ──

describe("D003 · a death survives the envelope", () => {
  it("round-trips the state a death produced, unchanged", () => {
    const state: GameState = { ...newRun(42, BUNDLE), run: dying() };
    const after: GameState = { ...state, run: death(state.run) };
    expect(load(save(after))).toStrictEqual(after);
  });

  it("produces a run branch that is still JSON to the leaves", () => {
    const reborn = death(dying());
    expect(JSON.parse(JSON.stringify(reborn))).toStrictEqual(reborn);
  });
});
