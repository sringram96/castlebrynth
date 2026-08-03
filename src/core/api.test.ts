// H001 · the surface: newRun, view, act, save, load.

import { describe, expect, it } from "vitest";
import { SAVE_VERSION, act, api, getView, load, newRun, save, view } from "./api";
import type { ContentBundle, GameState } from "./types";

const BUNDLE: ContentBundle = { version: 1, start: "room:test-start" };

/** A deep copy taken through JSON — the only honest "before" for a purity
 *  check, since reference equality would pass even if a field were rewritten. */
const clone = (state: GameState): unknown => JSON.parse(JSON.stringify(state));

describe("H001 · newRun", () => {
  it("opens a save with both branches present", () => {
    const state = newRun(42, BUNDLE);
    expect(state.seed).toBe(42);
    expect(state.deaths).toBe(0);
    expect(state.campaign.branch).toBe("campaign");
    expect(state.run.branch).toBe("run");
  });

  it("stands the run at the room the bundle names", () => {
    expect(newRun(42, BUNDLE).run.roomId).toBe("room:test-start");
  });

  it("opens the RNG stream on state, at the campaign seed, undrawn", () => {
    const state = newRun(1234, BUNDLE);
    expect(state.run.rng).toStrictEqual({ seed: 1234, draws: 0 });
  });

  it("is deterministic: the same seed mints the same save", () => {
    expect(JSON.stringify(newRun(42, BUNDLE))).toBe(JSON.stringify(newRun(42, BUNDLE)));
  });

  it("is seed-sensitive: a different seed mints a different stream", () => {
    expect(newRun(1, BUNDLE).run.rng.seed).not.toBe(newRun(2, BUNDLE).run.rng.seed);
  });
});

describe("H001 · save and load", () => {
  it("round-trips a state through the envelope, unchanged", () => {
    const state = newRun(42, BUNDLE);
    const back = load(save(state));
    expect(back).toStrictEqual(state);
    expect(JSON.stringify(back)).toBe(JSON.stringify(state));
  });

  it("round-trips again from the reloaded state, byte for byte", () => {
    const text = save(newRun(42, BUNDLE));
    const back = load(text);
    expect(back).not.toBeNull();
    expect(save(back as GameState)).toBe(text);
  });

  it("writes a versioned envelope", () => {
    const envelope = JSON.parse(save(newRun(42, BUNDLE))) as { version: number };
    expect(envelope.version).toBe(SAVE_VERSION);
  });

  it("returns null on an unknown version, and does not throw", () => {
    const alien = JSON.stringify({ version: SAVE_VERSION + 99, state: newRun(42, BUNDLE) });
    expect(() => load(alien)).not.toThrow();
    expect(load(alien)).toBeNull();
    const ancient = JSON.stringify({ version: 0, state: newRun(42, BUNDLE) });
    expect(load(ancient)).toBeNull();
    const unversioned = JSON.stringify({ state: newRun(42, BUNDLE) });
    expect(load(unversioned)).toBeNull();
  });

  it("returns null on anything it does not speak, and never throws", () => {
    const junk = [
      "",
      "{not json",
      "null",
      "[]",
      '"a string"',
      "17",
      JSON.stringify({ version: SAVE_VERSION }),
      JSON.stringify({ version: SAVE_VERSION, state: null }),
      JSON.stringify({ version: SAVE_VERSION, state: { seed: 1, deaths: 0 } }),
      // both branches must be the branches they claim to be
      JSON.stringify({
        version: SAVE_VERSION,
        state: { seed: 1, deaths: 0, campaign: { branch: "run" }, run: { branch: "run" } },
      }),
    ];
    for (const text of junk) {
      expect(() => load(text), text).not.toThrow();
      expect(load(text), text).toBeNull();
    }
  });
});

describe("H001 · view is the free tap", () => {
  it("does not mutate the state, ever", () => {
    const state = newRun(42, BUNDLE);
    const before = clone(state);
    view(state);
    view(state);
    getView(state);
    // Compared against a deep copy taken before the calls, not against the
    // same reference (DESIGN §the descent: tap never advances, costs, or harms).
    expect(clone(state)).toStrictEqual(before);
  });

  it("derives the strip from the state", () => {
    const state = newRun(42, BUNDLE);
    const v = view(state);
    expect(v.strip.depth).toBe(state.run.depth);
    expect(v.strip.tithes).toBe(state.run.tithes);
    expect(v.strip.hp).toStrictEqual(state.run.vitals.hp);
    expect(v.strip.might).toStrictEqual(state.run.vitals.might);
    expect(v.strip.will).toStrictEqual(state.run.vitals.will);
  });

  it("is pure: the same state gives the same picture", () => {
    const state = newRun(42, BUNDLE);
    expect(JSON.stringify(view(state))).toBe(JSON.stringify(view(state)));
  });

  it("answers to getView, the name H000 imports", () => {
    expect(getView).toBe(view);
  });
});

describe("H010 · the vignette is the whole of what sanity shows", () => {
  /** The fresh save with the sanity bar set to a reading. */
  const withSanity = (current: number, max: number): GameState => {
    const state = newRun(42, BUNDLE);
    return {
      ...state,
      run: { ...state.run, vitals: { ...state.run.vitals, sanity: { current, max } } },
    };
  };

  it("derives the aperture from the bar, and runs it the other way", () => {
    // The bar and the aperture are opposites on purpose: a full bar is a clear
    // frame, and an empty one is a closed one — and an empty one is also death,
    // by the same rule as hp (DESIGN §ledgers).
    expect(view(withSanity(4, 4)).vignette).toBe(0);
    expect(view(withSanity(3, 4)).vignette).toBe(0.25);
    expect(view(withSanity(2, 4)).vignette).toBe(0.5);
    expect(view(withSanity(0, 4)).vignette).toBe(1);
  });

  it("answers 0 on an unfilled bar, rather than NaN", () => {
    // `freshRun` opens every pool at {0, 0} — starting bars are balance, and
    // balance is content (H004). So 0/0 is the FIRST state this ever meets,
    // and without the guard every fresh save would render a NaN aperture.
    const fresh = newRun(42, BUNDLE);
    expect(fresh.run.vitals.sanity).toStrictEqual({ current: 0, max: 0 });
    expect(view(fresh).vignette).toBe(0);
    expect(Number.isNaN(view(fresh).vignette)).toBe(false);
    expect(Number.isNaN(view(withSanity(0, 0)).vignette)).toBe(false);
  });

  it("keeps sanity off the strip — there is no bar to find", () => {
    // DESIGN §frame: "no sanity bar exists anywhere". types.test.ts proves the
    // TYPE has no room for one; this proves the picture `view` actually builds
    // carries none either, and that the only name sanity answers to is
    // `vignette` (.llm/rules/ui.md 5: no sanity number is ever rendered).
    const v = view(withSanity(1, 4));
    expect(Object.keys(v.strip).sort()).toStrictEqual(["depth", "hp", "might", "tithes", "will"]);
    expect(Object.keys(v.strip)).not.toContain("sanity");
    expect(Object.keys(v)).not.toContain("sanity");
    expect(JSON.stringify(v)).not.toContain("sanity");
  });

  it("stores the vignette nowhere — it is derived on every look", () => {
    const state = withSanity(1, 4);
    const before = clone(state);
    expect(view(state).vignette).toBe(0.75);
    expect(clone(state)).toStrictEqual(before);
    expect(JSON.stringify(state)).not.toContain("vignette");
  });
});

describe("H001 · act is the only transition", () => {
  it("does not mutate the state it is given", () => {
    const state = newRun(42, BUNDLE);
    const before = clone(state);
    act(state, { object: "book", action: "read" });
    act(state, { object: "book", action: "read" }, "an answer");
    expect(clone(state)).toStrictEqual(before);
  });

  it("returns a state that still round-trips", () => {
    const out = act(newRun(42, BUNDLE), { object: "book", action: "read" });
    expect(load(save(out.state))).toStrictEqual(out.state);
    expect(Array.isArray(out.effects)).toBe(true);
  });
});

describe("H001 · the surface is exactly five functions", () => {
  it("gathers newRun, view, act, save, load", () => {
    expect(Object.keys(api).sort()).toStrictEqual(["act", "load", "newRun", "save", "view"]);
  });
});
