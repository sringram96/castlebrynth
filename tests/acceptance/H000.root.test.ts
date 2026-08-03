// H000 — root acceptance, authored at the constitutional convention.
//
// Black box: the GameAPI surface and the compiled shore, nothing else. This
// file IS the phase-0 definition of done — the book refuses, the refusal is
// remembered, knowledge is earned elsewhere, the same tap now opens, and the
// spent page does not re-journal (DESIGN §the descent).
//
// RED ON PURPOSE, AND NEVER A MERGE GATE. `src/core/bundle` arrives with H004
// and resolution with H006, so today this fails at import. It sits outside
// `tsconfig.json`'s `include` and outside `vitest run src`, so `npm run law`
// neither type-checks nor runs it; run it by hand until it is real. Do not
// stub the missing modules and do not weaken an assertion to reach green.
//
// Lines are COUNTED, never searched. A room line printed twice is a bug this
// project has shipped before, and `toContain` on a joined log cannot see it.
//
// State paths follow the landed H001 types (src/core/types.ts): knowledge,
// journal and refusals ratchet on the CAMPAIGN branch — they must survive
// death and pay off on later meetings — while a push's one-shot gates live in
// `run.flags`.
//
// Ledger ids carry their prefix (H010, cards.ts `LedgerPrefix`): `knowledge:`
// for what survives death, `flag:` for a one-shot of this push. The ledgers
// STORE the prefix — nothing strips it on the way in — so the fixtures below
// are asserted in the prefixed form, matching src/core/types.test.ts. Object
// ids ("book", "stone") are not ledger entries and carry no prefix.
import { describe, expect, it } from "vitest";
import { act, getView, newRun } from "../../src/core/api";
import type { ActInput } from "../../src/core/types";
// @ts-expect-error — compiled by `npm run build:content` (H004)
import { loadBundle } from "../../src/core/bundle";

const SEED = 42;

/** How many of these lines carry the phrase. A count, so a doubled line fails. */
const saying = (lines: readonly string[], phrase: string): number =>
  lines.filter((line) => line.includes(phrase)).length;

function run() {
  const bundle = loadBundle();
  let state = newRun(SEED, bundle);
  const log: string[] = [];
  /** Acts, and returns what THIS act said — not the whole log. */
  const step = (object: string, action: string, input?: ActInput): readonly string[] => {
    const out = act(state, { object, action }, input);
    state = out.state;
    const said: string[] = [];
    for (const e of out.effects) if (e.kind === "say") said.push(e.text);
    log.push(...said);
    return said;
  };
  return { get state() { return state; }, step, log };
}

describe("H000 · the atom: refuses, then opens", () => {
  it("walks the book law end to end", () => {
    const r = run();
    const depth = r.state.run.depth;

    // 1 — the book refuses, and the labyrinth remembers being refused
    const refusal = r.step("book", "read");
    expect(saying(refusal, "script you don't know")).toBe(1);
    expect(r.state.campaign.refused).toHaveLength(1);
    expect(r.state.campaign.refused[0]?.intent).toEqual({ object: "book", action: "read" });
    expect(r.state.campaign.refused[0]?.depth).toBe(depth);
    // being refused is not an act: the journal records acts (DESIGN §content laws)
    expect(r.state.campaign.journal).toHaveLength(0);
    expect(r.state.campaign.knowledge).not.toContain("knowledge:knows_glyph");

    // 2 — knowledge is earned at the stone, and it ratchets
    r.step("stone", "study");
    expect(r.state.campaign.knowledge).toContain("knowledge:knows_glyph");
    // the stone does not un-refuse the book; what was refused stays refused
    expect(r.state.campaign.refused).toHaveLength(1);

    // 3 — the same tap, transformed by understanding
    const opening = r.step("book", "read");
    expect(saying(opening, "procession")).toBe(1);
    expect(saying(opening, "script you don't know")).toBe(0);
    expect(r.state.run.flags).toContain("flag:read_book");
    expect(saying(r.state.campaign.journal, "procession")).toBe(1);

    // 4 — the spent page: it still answers, and it changes nothing
    const journal = [...r.state.campaign.journal];
    const flags = [...r.state.run.flags];
    const knowledge = [...r.state.campaign.knowledge];
    const spent = r.step("book", "read");
    expect(spent.length).toBeGreaterThan(0); // spent, not dead
    expect(saying(spent, "script you don't know")).toBe(0); // and never refused twice
    expect(r.state.campaign.journal).toEqual(journal); // the spent page does not re-journal
    expect(r.state.run.flags).toEqual(flags);
    expect(r.state.campaign.knowledge).toEqual(knowledge);
    expect(r.state.campaign.refused).toHaveLength(1);
  });

  it("keeps the affordance law: the object set never changes", () => {
    const r = run();
    const ids = (): string[] => getView(r.state).objects.map((o) => o.id).sort();
    const first = ids();
    // named, so an empty room cannot satisfy "never changes" for free
    expect(first).toContain("book");
    expect(first).toContain("stone");
    r.step("book", "read");
    r.step("stone", "study");
    r.step("book", "read");
    expect(ids()).toEqual(first); // shore has no arrival deltas; nothing may drift
  });

  it("tap is free: getView never mutates, and answers the same twice", () => {
    const r = run();
    r.step("book", "read");
    r.step("stone", "study"); // a state with something in it to corrupt
    const snap = JSON.stringify(r.state);
    const once = JSON.stringify(getView(r.state));
    const twice = JSON.stringify(getView(r.state));
    expect(JSON.stringify(r.state)).toBe(snap); // never advances, costs, or harms
    expect(twice).toBe(once); // total and pure
  });

  it("replays deterministically from seed + inputs", () => {
    const script = (h: ReturnType<typeof run>) => {
      h.step("book", "read"); h.step("stone", "study"); h.step("book", "read");
      return JSON.stringify({ state: h.state, log: h.log });
    };
    expect(script(run())).toBe(script(run()));
  });
});
