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
    expect(v.vignette).toBe(state.run.vitals.sanity);
  });

  it("is pure: the same state gives the same picture", () => {
    const state = newRun(42, BUNDLE);
    expect(JSON.stringify(view(state))).toBe(JSON.stringify(view(state)));
  });

  it("answers to getView, the name H000 imports", () => {
    expect(getView).toBe(view);
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
