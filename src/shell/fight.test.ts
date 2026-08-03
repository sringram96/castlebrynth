/// <reference types="vite/client" />
// @vitest-environment jsdom
//
// D006 · the fight screen, against the shipped grammar.
//
// The manifest is the REAL grammar.yaml, loaded the way L008 loads it. A fight
// screen tested against a manifest written in its own test file proves that the
// screen agrees with a fixture; the claim this card has to make is that select
// → throw matches THE CORE, on the table the game actually ships.
//
// Fights are opened off seeded streams and played, never faked. Where a
// particular hand is needed, seeds are searched for one — the same way L008
// does it — so nothing here asserts against dice that could not land.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";
import grammarSource from "../../grammar.yaml?raw";
import { STREAM, fork } from "../core/rng";
import { formatProblem, loadManifest } from "../lots/manifest";
import { brace, flee, openFight, rollHand, throwBones } from "../lots/turn";
import {
  FIGHT,
  economyRefusal,
  foeLine,
  leanOf,
  completions,
  openScreen,
  panesFor,
  previewBrace,
  previewFlee,
  previewThrow,
  stripFor,
} from "./fight";
import type { RngState, RunBranch } from "../core/types";
import type { Manifest } from "../lots/manifest";
import type { Fight, Foe } from "../lots/turn";

const manifest = ((): Manifest => {
  const result = loadManifest("grammar.yaml", parse(grammarSource));
  if (!result.ok) throw new Error(result.problems.map(formatProblem).join(" | "));
  return result.manifest;
})();

/** "Hand = 5 plain bones + 1 signature die" — six, all plain for now (L008). */
const HAND = ["bone", "bone", "bone", "bone", "bone", "bone"];

/** The Lots' own stream, forked off a run's — never sharing the Descent's. */
const lots = (seed: number): RngState => fork({ seed, draws: 0 }, STREAM.lots);

const foe = (over: Partial<Foe> = {}): Foe => ({
  id: "tallow-thing",
  hp: 60,
  intents: [7],
  pursuit: 0.3,
  ...over,
});

/** A fight with its hand already cast, at the given seed. */
function rolled(seed: number, over: Partial<Foe> = {}): Fight {
  return rollHand(manifest, openFight(manifest, lots(seed), foe(over), HAND, 20));
}

/** A run branch, for the strip. Only the fields `Strip` reads are meaningful. */
const RUN: RunBranch = {
  branch: "run",
  rng: { seed: 1, draws: 0 },
  descent: { seed: 1, draws: 0 },
  depth: 1,
  roomId: "room:the-drying-room",
  vitals: {
    hp: { current: 20, max: 24 },
    might: { current: 3, max: 3 },
    will: { current: 2, max: 4 },
    sanity: { current: 5, max: 8 },
  },
  tithes: 11,
  pouch: {
    consumables: [{ id: "item:tallow-stub", keep: "none" }],
    // A hole in the middle on purpose: an empty slot is null, not a gap in the
    // list, and the pane must skip it rather than render a blank.
    equipment: [{ id: "item:rusted-knife", keep: "none" }, null, null, { id: "item:the-key", keep: "key" }],
    small: [null, { id: "item:whetstone", keep: "kept" }],
  },
  skills: [
    { id: "skill:steady-hand", uses: { current: 1, max: 2 } },
    { id: "skill:read-the-room", uses: { current: 0, max: 1 } },
  ],
  flags: [],
};

/** A run carrying nothing — the other half of the pouch's shape. */
const EMPTY_RUN: RunBranch = {
  ...RUN,
  pouch: { consumables: [], equipment: [null, null, null, null], small: [null, null] },
  skills: [],
};

function mount(fight: Fight): {
  screen: ReturnType<typeof openScreen>;
  host: HTMLElement;
  ended: ReturnType<typeof vi.fn>;
  changed: ReturnType<typeof vi.fn>;
} {
  const host = document.createElement("section");
  host.className = "stage";
  document.body.replaceChildren(host);
  const ended = vi.fn();
  const changed = vi.fn();
  const screen = openScreen(host, manifest, fight, { ended, changed });
  return { screen, host, ended, changed };
}

const bones = (host: HTMLElement): HTMLButtonElement[] => [
  ...host.querySelectorAll<HTMLButtonElement>(".bone"),
];

beforeEach(() => {
  document.body.replaceChildren();
});

describe("D006 · select → throw matches core exactly", () => {
  it("previews every field the throw will produce, on many seeds and selections", () => {
    let checked = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const fight = rolled(seed);
      const roll = fight.roll ?? [];
      // Every non-empty selection of a six-die roll: 63 per seed.
      for (let mask = 1; mask < 1 << roll.length; mask += 1) {
        const indices: number[] = [];
        for (let i = 0; i < roll.length; i += 1) if ((mask & (1 << i)) !== 0) indices.push(i);

        const shown = previewThrow(manifest, fight, indices);
        const after = throwBones(manifest, fight, indices);
        const landed = after.last;
        if (landed === null) throw new Error("a throw with no resolution");

        // The label on the button and the result of pressing it, field for
        // field. `scoreThrow` is called by both, so this cannot drift.
        expect(shown.tier).toBe(landed.tier);
        expect(shown.score).toBe(landed.score);
        expect(shown.held).toBe(landed.held);
        expect(shown.block).toBe(landed.block);
        expect(shown.harm).toBe(landed.harm);
        expect(shown.intent).toBe(landed.intent);
        expect(shown.thrown).toEqual(landed.thrown);
        expect(shown.sum * shown.mult).toBe(shown.score);
        checked += 1;
      }
    }
    expect(checked).toBe(40 * 63);
  });

  it("previews BRACE exactly as the engine braces", () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const fight = rolled(seed);
      const shown = previewBrace(fight);
      const landed = brace(fight).last;
      expect(shown.held).toBe(landed?.held);
      expect(shown.block).toBe(landed?.block);
      expect(shown.harm).toBe(landed?.harm);
      expect(shown.score).toBe(0);
    }
  });

  it("previews FLEE's harm as a risk, never as a fact", () => {
    const fight = rolled(3);
    const shown = previewFlee(fight);

    // "the parting harm ... is UNBLOCKED: the dice you were holding are not
    // between you and it any more" (turn.ts).
    expect(shown.block).toBe(0);
    expect(shown.harm).toBe(fight.intent);
    expect(shown.pursuit).toBe(0.3);

    // The engine's answer depends on a draw, so the screen states the chance and
    // not the outcome. Both outcomes are reachable from the same preview.
    const never = flee(rolled(3, { pursuit: 0 })).last;
    const always = flee(rolled(3, { pursuit: 1 })).last;
    expect(never?.pursued).toBe(false);
    expect(never?.harm).toBe(0);
    expect(always?.pursued).toBe(true);
    expect(always?.harm).toBe(fight.intent);
  });

  it("throws exactly what the thumb selected, in the engine's own hands", () => {
    const { screen } = mount(rolled(7));
    screen.tap(0);
    screen.tap(3);
    screen.tap(1);
    screen.tap(3); // tapped twice: put back down

    const chosen = screen.chosen();
    expect(chosen).toEqual([0, 1]);
    const shown = screen.preview();

    screen.say("throw");
    const landed = screen.fight().last;
    expect(landed?.action).toBe("throw");
    expect(landed?.thrown).toEqual(shown.thrown);
    expect(landed?.score).toBe(shown.score);
    expect(landed?.harm).toBe(shown.harm);
  });

  it("never sends the engine a throw of nothing — that word is BRACE", () => {
    const { screen, changed } = mount(rolled(7));
    // turn.ts refuses an empty throw, loudly and rightly. The screen does not
    // send one: the button says "pick your bones".
    expect(() => screen.say("throw")).not.toThrow();
    expect(screen.fight().last).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  it("drops the selection when the turn resolves — nothing carries across", () => {
    const { screen } = mount(rolled(7));
    screen.tap(0);
    screen.tap(1);
    screen.say("brace");

    // `Fight.roll` is null once a turn resolves (turn.ts), so a selection into
    // it would name dice that no longer exist.
    expect(screen.fight().roll).toBeNull();
    expect(screen.chosen()).toEqual([]);
  });

  it("refuses a reroll by never offering one", () => {
    const { screen } = mount(rolled(7));
    // NO REROLLS EVER (DESIGN §content laws). ROLL is not on the pane once the
    // hand has landed, so the button that would raise the refusal is not there.
    const actions = panesFor(manifest, RUN, screen.fight(), []).actions.map((a) => a.intent.action);
    expect(actions).toEqual(["throw", "brace", "flee"]);
    expect(actions).not.toContain("roll");
  });
});

describe("D006 · the six-die hand on the floor", () => {
  it("draws one bone per die of the hand, in hand order, with its pips", () => {
    const fight = rolled(5);
    const { host } = mount(fight);

    expect(bones(host)).toHaveLength(HAND.length);
    expect(bones(host).map((b) => b.textContent)).toEqual(
      (fight.roll ?? []).map((bone) => String(bone.pips)),
    );
  });

  it("shows no floor before the hand is cast — the intent shows first", () => {
    const opened = openFight(manifest, lots(5), foe(), HAND, 20);
    const { host, screen } = mount(opened);

    // "enemy intent shows (enemies never roll) → roll your hand" — in that
    // order, and the banner carries it.
    expect(bones(host)).toHaveLength(0);
    expect(host.querySelector(".fight-intent")?.textContent).toContain("It will take 7");
    expect(panesFor(manifest, RUN, screen.fight(), []).actions[0]?.intent.action).toBe("roll");
  });

  it("tap-selects and tap-deselects, and marks what is picked up", () => {
    const { screen, host } = mount(rolled(5));

    bones(host)[2]?.click();
    expect(screen.chosen()).toEqual([2]);
    expect(bones(host)[2]?.classList.contains("bone--chosen")).toBe(true);
    expect(bones(host)[2]?.getAttribute("aria-pressed")).toBe("true");

    bones(host)[2]?.click();
    expect(screen.chosen()).toEqual([]);
    expect(bones(host)[2]?.classList.contains("bone--chosen")).toBe(false);
  });

  it("highlights nothing before a bone is picked up", () => {
    // The obvious highlight — "every bone in some scoring subset" — lit all six
    // on 3000 of 3000 real rolls (six dice over six faces always contain a
    // repeat or a run of three). A mark everything carries is a coat of paint.
    const { host, screen } = mount(rolled(5));
    expect(screen.chosen()).toEqual([]);
    expect(bones(host).some((b) => b.classList.contains("bone--completes"))).toBe(false);
  });

  it("lights the bones that would raise what you are holding to a better tier", () => {
    // A roll with a duplicate: picking up one of the pair must light the other.
    let found: Fight | null = null;
    let twin: readonly [number, number] | null = null;
    for (let seed = 1; seed <= 200 && found === null; seed += 1) {
      const fight = rolled(seed);
      const roll = fight.roll ?? [];
      for (let a = 0; a < roll.length && twin === null; a += 1) {
        for (let b = a + 1; b < roll.length && twin === null; b += 1) {
          if (roll[a]?.pips === roll[b]?.pips) {
            found = fight;
            twin = [a, b];
          }
        }
      }
    }
    if (found === null || twin === null) throw new Error("no seed rolled a pair");

    const { host, screen } = mount(found);
    screen.tap(twin[0]);

    const lit = bones(host)
      .map((b, i) => (b.classList.contains("bone--completes") ? i : -1))
      .filter((i) => i >= 0);

    // Its twin lights: a pair beats nothing. And every lit bone really does
    // raise the tier — checked against the same preview the throw uses.
    expect(lit).toContain(twin[1]);
    expect(new Set(lit)).toEqual(completions(manifest, found.roll ?? [], [twin[0]]));
    const alone = previewThrow(manifest, found, [twin[0]]);
    for (const index of lit) {
      expect(previewThrow(manifest, found, [twin[0], index]).mult).toBeGreaterThan(alone.mult);
    }
  });

  it("has nothing to light on an empty roll", () => {
    expect(completions(manifest, [], [])).toEqual(new Set());
  });
});

describe("D006 · inspect shows the lean, and the foe declares its pursuit", () => {
  it("says a plain bone is even, in the odds the die actually has", () => {
    // Derived from the same ticks `cast` draws across — grammar.yaml: "The
    // inspect line is derived from the weights, so it cannot lie about the odds."
    expect(leanOf(manifest, "bone")).toBe("Knucklebone — even. Every face 17%.");
  });

  it("names the faces a loaded bone leans to, and keeps all six possible", () => {
    // grammar.yaml leans the River Stone to three and four, weight 2 of 8 each.
    const said = leanOf(manifest, "river-stone");
    expect(said).toBe(
      "River Stone — leans to 3 at 25%, 4 at 25%. All six faces stay possible.",
    );
    // DESIGN §the lots: "all six faces always possible". A lean shifts the odds
    // and never deletes a face, and the line says so.
    expect(said).toContain("All six faces stay possible");
  });

  it("writes the lean of the bone you just picked up", () => {
    const { screen, host } = mount(rolled(5));
    bones(host)[0]?.click();

    expect(screen.inspect()).toBe(leanOf(manifest, "bone"));
    expect(host.querySelector(".fight-inspect")?.textContent).toContain("Knucklebone");
  });

  it("declares the pursuit chance alongside the intent, on the foe's inspect", () => {
    const fight = rolled(5);
    const { screen, host } = mount(fight);

    host.querySelector<HTMLButtonElement>(".fight-intent")?.click();

    // "every enemy's inspect declares its PURSUIT chance alongside its intent"
    // (DESIGN §the lots). Both, in one line — a chance you have to go looking
    // for is not declared.
    expect(screen.inspect()).toBe("The Tallow Thing — 60 left. It will take 7. Pursuit 30%.");
    expect(foeLine(manifest, fight)).toContain("Pursuit 30%");
  });

  it("inspects without touching the fight — the tap is still free", () => {
    const { screen, host } = mount(rolled(5));
    const before = structuredClone(screen.fight());

    host.querySelector<HTMLButtonElement>(".fight-intent")?.click();
    bones(host)[0]?.click();
    bones(host)[1]?.click();
    bones(host)[0]?.click();

    // Selecting and inspecting live in the shell. Nothing here moved a fight.
    expect(screen.fight()).toEqual(before);
  });
});

describe("D006 · panes v3", () => {
  it("puts the three words on ACTIONS, addressed to the fight", () => {
    const fight = rolled(5);
    const panes = panesFor(manifest, RUN, fight, [0, 1]);

    expect(panes.actions.map((a) => a.intent)).toEqual([
      { object: FIGHT, action: "throw" },
      { object: FIGHT, action: "brace" },
      { object: FIGHT, action: "flee" },
    ]);
  });

  it("carries the live arithmetic in THROW's own label", () => {
    const fight = rolled(5);
    const shown = previewThrow(manifest, fight, [0, 1]);
    const label = panesFor(manifest, RUN, fight, [0, 1]).actions[0]?.label ?? "";

    // The decision is made where it is taken: sum × mult = score, in the open.
    expect(label).toContain(`${shown.sum}×${shown.mult} = ${shown.score}`);
    expect(label).toContain(`hold ${shown.held}`);
    expect(label).toContain(`take ${shown.harm}`);
  });

  it("offers FLEE before the roll as well as after it", () => {
    const opened = openFight(manifest, lots(5), foe(), HAND, 20);
    const before = panesFor(manifest, RUN, opened, []).actions.map((a) => a.intent.action);
    const after = panesFor(manifest, RUN, rollHand(manifest, opened), []).actions.map(
      (a) => a.intent.action,
    );

    // "FLEE is always offered" (DESIGN §the lots).
    expect(before).toContain("flee");
    expect(after).toContain("flee");
  });

  it("reads SKILLS off the RUN BRANCH, not the manifest", () => {
    const panes = panesFor(manifest, RUN, rolled(5), []);

    // The manifest is what EXISTS in the world and ships `skills: {}` by
    // decision (L006). The run branch is what YOU HAVE. Reading the manifest
    // reports an empty page forever, whatever the player is carrying.
    expect(Object.keys(manifest.skills)).toEqual([]);
    expect(panes.skills.map((s) => s.label)).toEqual([
      "skill:steady-hand — 1/2",
      // Spent, and still listed with its count: "spent AFTER the dice land",
      // and hiding an exhausted skill would be a collapse.
      "skill:read-the-room — 0/1",
    ]);
    // A skill is addressed to ITSELF, the way a room's acts are.
    expect(panes.skills[0]?.intent).toEqual({ object: "skill:steady-hand", action: "use" });
  });

  it("reads ITEMS off the pouch, in the engine's own fixed order, with keep marks", () => {
    const panes = panesFor(manifest, RUN, rolled(5), []);

    // Consumables, then the four equipment slots, then the two small ones —
    // the order `heldAt` (resolve.ts) and `contents` (death.ts) walk, so the
    // list a player reads is the list death draws a survivor from. Null slots
    // are skipped, not rendered as blanks. ✦ key and • kept come back with you.
    expect(panes.items.map((i) => i.label)).toEqual([
      "item:tallow-stub",
      "item:rusted-knife",
      "✦ item:the-key",
      "• item:whetstone",
    ]);
    expect(panes.items[0]?.intent).toEqual({ object: "item:tallow-stub", action: "use" });
    expect(Object.keys(manifest.jokers)).toEqual([]);
  });

  it("keeps both pages when the run carries nothing", () => {
    const panes = panesFor(manifest, EMPTY_RUN, rolled(5), []);

    // The pages still exist (nothing collapses, H105) — H105's own empty-state
    // line is what a player reads.
    expect(panes.skills).toEqual([]);
    expect(panes.items).toEqual([]);
  });

  it("still offers what you are carrying once the fight is over", () => {
    const finished = flee(rolled(5, { pursuit: 0 }));
    const panes = panesFor(manifest, RUN, finished, []);

    // The three words are gone — a finished fight takes no more acts — but the
    // pouch has not emptied itself, and a pane that vanished would move the
    // pager under a thumb.
    expect(panes.actions).toEqual([]);
    expect(panes.items).toHaveLength(4);
  });

  it("offers no acts once the fight is over", () => {
    const finished = flee(rolled(5, { pursuit: 0 }));
    expect(finished.ending).toBe("fled");
    expect(panesFor(manifest, RUN, finished, []).actions).toEqual([]);
  });
});

describe("D006 · the strip reads one ledger, live", () => {
  it("reads the fight's hp, and the run's ceiling", () => {
    const fight = { ...rolled(5), hp: 13 };
    const strip = stripFor(RUN, fight);

    // Mid-fight the two disagree and only one of them can kill you this turn.
    expect(strip.hp).toEqual({ current: 13, max: 24 });
    expect(strip.might).toEqual(RUN.vitals.might);
    expect(strip.tithes).toBe(11);
    expect(strip.depth).toBe(1);
  });

  it("reads the run's own bar when there is no fight", () => {
    expect(stripFor(RUN, null).hp).toEqual({ current: 20, max: 24 });
  });

  it("has no field for sanity and none for the campaign ledger", () => {
    // `Strip` is the list of bars that render. A field added to it "is not a
    // widening of the strip, it is the repeal of a design law" (types.ts) — so
    // the fight's strip carries the same five, and no more.
    expect(Object.keys(stripFor(RUN, rolled(5))).sort()).toEqual([
      "depth",
      "hp",
      "might",
      "tithes",
      "will",
    ]);
  });
});

describe("D006 · the fight's ending is reported, never rendered as a run's", () => {
  it("reports a win, a loss and a flight to the shell, once each", () => {
    for (const [word, over, expected] of [
      ["throw", { hp: 1, intents: [0] }, "won"],
      ["brace", { hp: 60, intents: [99] }, "lost"],
      ["flee", { hp: 60, intents: [0] }, "fled"],
    ] as const) {
      const { screen, ended } = mount(rolled(5, over));
      if (word === "throw") for (let i = 0; i < 6; i += 1) screen.tap(i);
      screen.say(word);

      expect(screen.fight().ending).toBe(expected);
      expect(ended).toHaveBeenCalledTimes(1);
      expect(ended).toHaveBeenCalledWith(expected, screen.fight());
    }
  });

  it("takes no more acts once it is over", () => {
    const { screen, changed } = mount(rolled(5, { pursuit: 0 }));
    screen.say("flee");
    const after = screen.fight();
    changed.mockClear();

    // turn.ts refuses an act on a finished fight, loudly. The screen does not
    // make one.
    expect(() => screen.say("brace")).not.toThrow();
    expect(screen.fight()).toBe(after);
    expect(changed).not.toHaveBeenCalled();
  });

  it("raises no end card: a lost fight is not an ended run", () => {
    const { screen, ended } = mount(rolled(5, { hp: 60, intents: [99] }));
    screen.say("brace");

    // A loss is a bar at zero, and death "wakes you at the Crossing" (death.ts).
    // Only the Descent's `end` word ends a run, and only an `end` emission may
    // raise H114's card — so this file reports and does not decide.
    expect(ended).toHaveBeenCalledWith("lost", screen.fight());
    expect(document.querySelector(".end")).toBeNull();
  });
});

describe("D006 · the economy, held open", () => {
  it("plays the shipped economy: refresh per fight", () => {
    // "the whole hand is cast every turn and nothing is spent" (turn.ts).
    expect(economyRefusal(manifest)).toBeNull();

    const first = rolled(5);
    const second = rollHand(manifest, brace(first));
    expect(second.roll).toHaveLength(HAND.length);
    expect(first.hand).toEqual(second.hand);
  });

  it("says why gather cannot be ruled on yet, instead of crashing on it", () => {
    // DESIGN §open parks the spend economy, "ruled by thumb at the fight
    // screen" — and this is that screen. It cannot make the ruling: the turn
    // loop only knows one economy and refuses the other by name.
    const gathering: Manifest = {
      ...manifest,
      economy: { ...manifest.economy, gather: { enabled: true } },
    };
    const refusal = economyRefusal(gathering);
    expect(refusal).toContain("economy.gather");
    expect(refusal).toContain("H199");
    // And the refusal is the engine's, said before a fight is opened rather
    // than thrown from inside one.
    expect(() => openFight(gathering, lots(5), foe(), HAND, 20)).toThrow(/gather/);
  });

  it("says why a manifest with neither economy on cannot be played", () => {
    const neither: Manifest = {
      ...manifest,
      economy: { ...manifest.economy, refresh_per_fight: { enabled: false } },
    };
    expect(economyRefusal(neither)).toContain("refresh_per_fight");
  });
});
