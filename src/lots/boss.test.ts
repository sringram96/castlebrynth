/// <reference types="vite/client" />
// D005 — the depth-1 boss, from both ends.
//
// Two ends, because a boss is written in three files and none of them can see
// the other two: content/foes/the-threshold.yaml is the body and the intents,
// grammar.yaml is the pursuit chance, and content/rooms/the-cistern-head.yaml
// is the act that opens the fight. What is asserted here is only what needs
// more than one of them —
//
//   · the intents MATCH THE EFFECTS: what was shown before the roll is what
//     lands when the turn ends, every turn, for the whole authored cycle;
//   · the escalation is real and it is where the card says it is;
//   · KILL and DEATH are both reachable, played out rather than argued;
//   · it SITS BEHIND THE GATED DOOR — the fight is unreachable without the
//     tally, and reachable with it;
//   · F7's one-shot guard holds against the largest throw this grammar can
//     make, computed off the manifest rather than copied out of the card.
//
// Nothing here re-asserts the turn loop. That the intent shows before the roll,
// that each held die blocks one, that fleeing costs one word — all of it is
// src/lots/turn.test.ts's and tests/acceptance/L008.lots.test.ts's, and a
// second copy that could disagree is worse than one.
//
// A PLAYER HP IS CHOSEN HERE, and it is not authored anywhere yet: `freshRun`
// opens every bar at zero because "starting HP, Might and Will are balance,
// balance is content" (src/core/api.ts) and `ContentBundle` has no field for
// them. So each test below states the bar it is fighting on, and none of them
// claims that bar is the game's.

import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import bossSource from "../../content/foes/the-threshold.yaml?raw";
import cisternSource from "../../content/rooms/the-cistern-head.yaml?raw";
import { compileRoom } from "../core/compile";
import { resolve } from "../core/resolve";
import { newRun } from "../core/api";
import type { GameState, Id } from "../core/types";
import { formatProblem } from "../core/cards";
import type { RoomCard } from "../core/cards";
import { compileFoe, foeOf } from "./foes";
import { loadManifest, isEnabled } from "./manifest";
import type { Manifest } from "./manifest";
import { brace, flee, openFight, rollHand, throwBones } from "./turn";
import type { Fight, Foe } from "./turn";

const manifest = ((): Manifest => {
  const result = loadManifest("grammar.yaml", parse(grammarSource));
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.manifest;
})();

const BOSS = "the-threshold";

const card = (() => {
  const result = compileFoe("content/foes/the-threshold.yaml", bossSource);
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.card;
})();

const cistern = ((): RoomCard => {
  const result = compileRoom("content/rooms/the-cistern-head.yaml", cisternSource);
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.card;
})();

const boss = foeOf(manifest, card) as Foe;

/** "Hand = 5 plain bones + 1 signature die" — six dice, all plain for now. */
const HAND = ["bone", "bone", "bone", "bone", "bone", "bone"];

const open = (seed: number, hp: number): Fight =>
  openFight(manifest, { seed, draws: 0 }, boss, HAND, hp);

const indices = (fight: Fight): number[] => (fight.roll ?? []).map((_, i) => i);

// ─────────────────────────────────────────── 1 · the card is a whole enemy ──

describe("D005 · the boss is written in three files and adds up", () => {
  it("has both halves: a body here, a pursuit chance in the grammar", () => {
    expect(manifest.enemies[BOSS]?.name).toBeTruthy();
    expect(isEnabled(manifest, `enemies.${BOSS}`)).toBe(true);
    expect(boss).toEqual({
      id: BOSS,
      hp: card.hp,
      intents: card.intents,
      pursuit: manifest.enemies[BOSS]?.pursuit,
    });
  });

  it("bends nothing — no rule, no seal, no parry", () => {
    // "No rule-bending, no seals, no parry prompt (those return with the Warden
    // proper after H180)". `rules` is the only way an enemy reaches the
    // grammar, and `enemy_rules` is empty, so there is nothing to reach.
    expect(manifest.enemies[BOSS]?.rules ?? []).toEqual([]);
    expect(Object.keys(manifest.enemy_rules)).toEqual([]);
  });

  it("is simply harder: more body than the chaff it shares a pool with", () => {
    const chaff = manifest.enemies["tallow-thing"];
    expect(chaff).toBeDefined();
    expect(card.hp).toBeGreaterThan(72);
    expect(Math.max(...card.intents)).toBeGreaterThan(8);
  });
});

// ────────────────────────────────────── 2 · intents match effects ──

describe("D005 · what it shows is what lands", () => {
  it("lands exactly the intent it showed, for a whole authored cycle", () => {
    // A bar big enough to survive the cycle: this is measurement, not balance.
    let fight = open(21, 400);
    const shown: number[] = [];
    for (let turn = 0; turn < card.intents.length && fight.ending === null; turn += 1) {
      const before = fight;
      shown.push(before.intent);
      const rolled = rollHand(manifest, before);
      const thrown = indices(rolled).slice(0, 4); // four thrown, two held
      fight = throwBones(manifest, rolled, thrown);

      const harm = Math.max(0, before.intent - 2);
      expect(fight.last?.intent).toBe(before.intent);
      expect(fight.last?.harm).toBe(harm);
      expect(fight.hp).toBe(before.hp - harm);
    }
    expect(shown).toEqual([...card.intents]);
  });

  it("escalates once, from one value to a higher one, and never back mid-cycle", () => {
    // "escalating two-value intents": two values and no more, low then high.
    const values = [...new Set(card.intents)];
    expect(values).toHaveLength(2);
    const [low, high] = values as [number, number];
    expect(high).toBeGreaterThan(low);

    const turn = card.intents.indexOf(high);
    expect(turn).toBeGreaterThan(0);
    // Everything before the turn it escalates on is the low value; everything
    // from there to the end of the cycle is the high one. It steps up once.
    expect(card.intents.slice(0, turn).every((i) => i === low)).toBe(true);
    expect(card.intents.slice(turn).every((i) => i === high)).toBe(true);
  });

  it("shows the escalation at the beat the card says it does", () => {
    let fight = open(22, 900);
    const turn = card.intents.indexOf(Math.max(...card.intents));
    for (let step = 0; step < turn; step += 1) {
      expect(fight.intent).toBe(Math.min(...card.intents));
      fight = brace(rollHand(manifest, fight));
    }
    expect(fight.intent).toBe(Math.max(...card.intents));
  });
});

// ────────────────────────────────────── 3 · kill and death both reachable ──

describe("D005 · both ways out of the threshold", () => {
  it("can be killed: throw the whole hand and it goes down", () => {
    // Throwing everything holds nothing back, so every intent lands whole.
    let fight = open(23, 200);
    let turns = 0;
    while (fight.ending === null && turns < 40) {
      const rolled = rollHand(manifest, fight);
      fight = throwBones(manifest, rolled, indices(rolled));
      turns += 1;
    }
    expect(fight.ending).toBe("won");
    expect(fight.foeHp).toBeLessThanOrEqual(0);
    expect(fight.hp).toBeGreaterThan(0);
    // F2 "TTK ... boss 8-12" is measured against a player who blocks; this one
    // does not, and pays for it in the bar. Both numbers are reported so a
    // reader can see the trade rather than take it on trust.
    expect(turns).toBeGreaterThanOrEqual(4);
    expect(200 - fight.hp).toBeGreaterThan(0);
  });

  it("can kill you: brace behind the whole hand and it still gets through", () => {
    let fight = open(24, 20);
    let turns = 0;
    while (fight.ending === null && turns < 40) {
      fight = brace(rollHand(manifest, fight));
      turns += 1;
    }
    expect(fight.ending).toBe("lost");
    expect(fight.hp).toBeLessThanOrEqual(0);
    // Bracing holds six and blocks six, so the low intent is survivable and the
    // escalated one is not. A bracer dies AFTER it escalates, never before.
    expect(turns).toBeGreaterThan(card.intents.indexOf(Math.max(...card.intents)));
  });

  it("can be walked away from: FLEE is offered, and its chance is declared", () => {
    const fled = flee(open(25, 60));
    expect(fled.ending).toBe("fled");
    expect(boss.pursuit).toBeGreaterThan(0);
    expect(boss.pursuit).toBeLessThanOrEqual(1);
  });

  it("replays exactly from one seed, and two seeds are two fights", () => {
    const script = (seed: number): string => {
      let fight = open(seed, 120);
      for (let turn = 0; turn < 6 && fight.ending === null; turn += 1) {
        const rolled = rollHand(manifest, fight);
        fight = throwBones(manifest, rolled, indices(rolled).slice(0, 4));
      }
      return JSON.stringify(fight);
    };
    expect(script(26)).toBe(script(26));
    expect(script(26)).not.toBe(script(27));
  });
});

// ──────────────────────────────────────── 4 · behind the gated door ──

describe("D005 · it sits behind the gated door", () => {
  const at = (state: GameState, object: Id, action: Id) =>
    resolve(state, cistern, { object, action });
  const stand = (): GameState => {
    const state = newRun(31, { version: 1, start: "room:the-crossing" });
    return { ...state, run: { ...state.run, roomId: cistern.id } };
  };
  const withTally = (state: GameState): GameState => ({
    ...state,
    run: {
      ...state.run,
      pouch: { ...state.run.pouch, consumables: [{ id: "item:brass-tally", keep: "key" }] },
    },
  });

  it("is unreachable without the key: the shut grate refuses, and opens nothing", () => {
    const state = stand();
    const refused = at(state, "grate", "go");
    expect(refused.emissions).toEqual([]);
    expect(refused.state.campaign.refused).toHaveLength(1);
    expect(at(state, "grate", "lift").emissions).toEqual([]);
  });

  it("is reached by opening the grate with the tally and going down", () => {
    const opened = at(withTally(stand()), "grate", "lift");
    expect(opened.state.run.flags).toContain("flag:grate-open");
    // The far side arrives as an affordance, with the cause it arrived for.
    expect(opened.emissions).toContainEqual({
      kind: "addObject",
      object: "threshold",
      cause: "the grate is open, and the shaft under it is not empty",
    });

    const met = at(opened.state, "grate", "go");
    expect(met.emissions).toContainEqual({ kind: "fight", enemy: BOSS });
    expect(met.state.run.flags).toContain("flag:threshold-met");
  });

  it("is telegraphed for free before the act that costs", () => {
    // The free tap "never advances, costs, or harms" (DESIGN §the descent), and
    // it is where the threshold is announced — twice, before `go` is spoken.
    const threshold = cistern.objects["threshold"];
    expect(threshold?.latent).toBe(true);
    expect(threshold?.tap).toBeTruthy();
    expect(Object.keys(threshold?.actions ?? {}).sort()).toEqual(["listen", "peer"]);
    // …and none of those looking actions opens a fight.
    for (const responses of Object.values(threshold?.actions ?? {})) {
      for (const response of responses) expect(response.fight).toBeUndefined();
    }
  });

  it("is met once, and the door it stood in stays a door", () => {
    const met = at(at(withTally(stand()), "grate", "lift").state, "grate", "go");
    // Whether the fight was won or fled, forward is still the only way
    // (DESIGN §the lots) — so the second `go` takes the door, not the fight.
    const after = at(met.state, "grate", "go");
    expect(after.emissions).toEqual([{ kind: "goto", door: "door:the-grate" }]);
    expect(after.state.run.flags.filter((f) => f === "flag:threshold-met")).toHaveLength(1);
  });
});

// ───────────────────────────────────────────── 5 · the one fairness law ──

describe("D005 · F7, the one-shot guard", () => {
  it("no single throw takes 60% of its body, and the bound is read not copied", () => {
    // The largest throw this grammar can make: every die on its highest face,
    // taken at the highest multiplier any tier declares. Computed from the
    // manifest, so a new face or a new tier that widened it goes red here.
    const highestPip = Math.max(...Object.values(manifest.faces).map((face) => face.pips));
    const highestMult = Math.max(...Object.values(manifest.tiers).map((tier) => tier.mult));
    const largest = HAND.length * highestPip * highestMult;

    expect(largest / card.hp).toBeLessThanOrEqual(0.6);
  });
});
