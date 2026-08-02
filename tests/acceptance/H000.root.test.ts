// H000 — root acceptance, authored at the constitutional convention.
// Red until H004 + H006 land. Black-box: GameAPI + compiled shore only.
// This test IS the phase-0 definition of done: the book refuses, the
// refusal is remembered, knowledge is earned, the same tap opens.
import { describe, expect, it } from "vitest";
// @ts-expect-error — modules arrive via cards H006/H004; red-until-built by design
import { newRun, act, getView } from "../../src/core/api";
// @ts-expect-error — compiled by `npm run build:content` (H004)
import { loadBundle } from "../../src/core/bundle";

const SEED = 42;

function run() {
  const bundle = loadBundle();
  let state = newRun(SEED, bundle);
  const log: string[] = [];
  const step = (object: string, action: string, input?: unknown) => {
    const out = act(state, { object, action }, input);
    state = out.state;
    for (const e of out.effects ?? []) if (e.kind === "say") log.push(e.text);
    return out;
  };
  return { get state() { return state; }, step, log };
}

describe("H000 · the atom: refuses, then opens", () => {
  it("walks the book law end to end", () => {
    const r = run();

    // 1 — the book refuses, and the refusal is remembered
    r.step("book", "read");
    expect(r.log.join("\n")).toContain("script you don't know");
    expect(r.state.refused.length).toBe(1);
    expect(r.state.journal).toHaveLength(0);

    // 2 — knowledge is earned at the stone
    r.step("stone", "study");
    expect(r.state.flags).toContain("knows_glyph");

    // 3 — the same tap, transformed by understanding
    r.step("book", "read");
    expect(r.log.join("\n")).toContain("procession");
    expect(r.state.flags).toContain("read_book");
    expect(r.state.journal).toContain("procession");

    // 4 — spent pages: fallback after the gate has fired
    const before = JSON.stringify(r.state);
    r.step("book", "read");
    expect(r.state.journal.filter((j: string) => j === "procession")).toHaveLength(1);
    expect(JSON.stringify(r.state.flags)).toBe(JSON.parse(before) && JSON.stringify(JSON.parse(before).flags));
  });

  it("keeps the affordance law: the object set never changes", () => {
    const r = run();
    const ids = () => getView(r.state).objects.map((o: { id: string }) => o.id).sort().join(",");
    const first = ids();
    r.step("book", "read");
    r.step("stone", "study");
    r.step("book", "read");
    expect(ids()).toBe(first); // shore has no arrival deltas; nothing may drift
  });

  it("tap is free: getView never mutates", () => {
    const r = run();
    const snap = JSON.stringify(r.state);
    getView(r.state); getView(r.state);
    expect(JSON.stringify(r.state)).toBe(snap);
  });

  it("replays deterministically", () => {
    const script = (h: ReturnType<typeof run>) => {
      h.step("book", "read"); h.step("stone", "study"); h.step("book", "read");
      return JSON.stringify(h.state);
    };
    expect(script(run())).toBe(script(run()));
  });
});
