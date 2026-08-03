// castlebrynth · the engine surface: newRun, view, act, save, load.
//
// Pure and total. No DOM, no I/O, no Date, no Math.random, no console
// (.llm/rules/engine.md). Every function takes a state and returns a value;
// none of them can edit a state, because GameState is readonly throughout.
//
// This card (H001) lays the surface, not the behaviour behind it. Room
// content is H003, the compiler H004, the RNG algorithm H002, resolution
// H006. Where behaviour is missing here it is missing loudly: `view` returns
// empty content lists and `act` is the identity transition. Neither invents
// balance numbers or content ids this card has no authority over.

import type {
  CampaignBranch,
  ContentBundle,
  GameAPI,
  GameState,
  Pool,
  RunBranch,
  SaveEnvelope,
} from "./types";

/** Bump when the save shape changes. Older or newer → `load` returns null. */
export const SAVE_VERSION = 1;

const EMPTY_POOL: Pool = { current: 0, max: 0 };

/**
 * A fresh campaign ledger: nothing owned, nothing known, nothing remembered.
 * Death never touches this branch again once it exists.
 */
function freshCampaign(): CampaignBranch {
  return {
    branch: "campaign",
    dice: [],
    knowledge: [],
    journal: [],
    refused: [],
    landmarks: [],
    grants: [],
  };
}

/**
 * A fresh run branch.
 *
 * The pools open empty on purpose. Starting HP, Might and Will are balance,
 * balance is content, and content is compiled by H004 — this card will not
 * invent numbers that the fairness laws (DESIGN §fairness laws) would then
 * have to live with. Whoever opens the Crossing fills them.
 *
 * The RNG stream opens at (seed, 0). H002 owns how the campaign seed and the
 * death count mix into a run's stream; at `deaths === 0` they are the same
 * number, which is true under any mixing it chooses.
 */
function freshRun(seed: number, start: string): RunBranch {
  return {
    branch: "run",
    rng: { seed, draws: 0 },
    depth: 0,
    roomId: start,
    vitals: { hp: EMPTY_POOL, might: EMPTY_POOL, will: EMPTY_POOL, sanity: EMPTY_POOL },
    tithes: 0,
    consumables: [],
    equipment: [null, null, null, null],
    small: [null, null],
    skills: [],
    flags: [],
  };
}

/**
 * Mint a whole new save: a fresh campaign, and a first push standing at the
 * Crossing. The campaign-preserving rebirth after a death is a different
 * transition and belongs to H006 — it keeps `campaign`, increments `deaths`
 * and rebuilds only the run branch.
 */
export const newRun: GameAPI["newRun"] = (seed: number, bundle: ContentBundle) => ({
  seed,
  deaths: 0,
  campaign: freshCampaign(),
  run: freshRun(seed, bundle.start),
});

/**
 * The vignette: how far the aperture has closed. 0 = clear, 1 = closed.
 *
 * Sanity's ONLY route to the screen. It is derived here and stored nowhere,
 * because there is no sanity bar anywhere (DESIGN §frame) and no sanity number
 * is ever rendered (.llm/rules/ui.md 5) — `Strip` has no field for it, and
 * this number is what the shell dithers the aperture with instead.
 *
 * It runs the OTHER WAY from the bar it reads, and that is the whole of the
 * conversion: a full bar is a clear frame, and an empty one — death, by the
 * same rule as hp (DESIGN §ledgers) — is a closed one.
 *
 * `max === 0` answers 0, not NaN. A fresh run opens with every pool empty
 * (`freshRun` above: starting bars are balance, balance is content, content is
 * H004's), so `0/0` is the state this function meets FIRST and on every save
 * made before the Crossing fills the bars. An unfilled bar is not a closed
 * frame; it is a frame with nothing to say yet. Nothing is clamped here —
 * floors and the death predicate are H205/D003's, not the renderer's.
 */
function vignetteOf(sanity: Pool): number {
  if (sanity.max === 0) return 0;
  return 1 - sanity.current / sanity.max;
}

/**
 * The free tap. State in, picture out — it reads and it derives, and it cannot
 * do anything else: every field it can reach is readonly (.llm/rules/ui.md,
 * "Free tap NEVER mutates state"). The content lists are empty until rooms
 * (H003) and resolution (H006) land; the strip is real now.
 */
export const view: GameAPI["view"] = (state: GameState) => ({
  still: null,
  lines: [],
  objects: [],
  panel: { actions: [], skills: [], items: [] },
  strip: {
    hp: state.run.vitals.hp,
    might: state.run.vitals.might,
    will: state.run.vitals.will,
    tithes: state.run.tithes,
    depth: state.run.depth,
  },
  vignette: vignetteOf(state.run.vitals.sanity),
});

/**
 * Alias for {@link view}. `tests/acceptance/H000.root.test.ts` — the phase-0
 * definition of done — imports this name; the board's card for this work names
 * it `view`. Both are the same function object, so there is one implementation
 * and no second surface to keep honest.
 */
export const getView = view;

/**
 * The only transition. Returns a new state and the effects the shell should
 * present; it never edits the state it was given.
 *
 * Resolution is H006. Until then every intent is inert: the state comes back
 * untouched with no effects. The declared type carries all three parameters
 * (state, intent, input) even though this implementation reads only the first
 * — reading the intent here would be behaviour, which this card must not ship.
 */
export const act: GameAPI["act"] = (state: GameState) => ({ state, effects: [] });

/** Wrap the state in its versioned envelope and render it as JSON text. */
export const save: GameAPI["save"] = (state: GameState) =>
  JSON.stringify({ version: SAVE_VERSION, state } satisfies SaveEnvelope);

/**
 * Read a save back. Returns null — never throws — on malformed text, on a
 * missing or unknown envelope version, and on anything that is not a
 * castlebrynth state (.llm/rules/engine.md).
 *
 * The check is deliberately shallow: it proves the envelope is a save of a
 * version we speak and that both branches are present and are the branches
 * they claim to be. Validating content words is the content loader's job —
 * unknown words fail at LOAD, there.
 */
export const load: GameAPI["load"] = (text: string) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (parsed["version"] !== SAVE_VERSION) return null;
  const state = parsed["state"];
  return isGameState(state) ? state : null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  if (typeof value["seed"] !== "number") return false;
  if (typeof value["deaths"] !== "number") return false;
  const campaign = value["campaign"];
  const run = value["run"];
  return (
    isRecord(campaign) &&
    campaign["branch"] === "campaign" &&
    isRecord(run) &&
    run["branch"] === "run"
  );
}

/**
 * The surface, gathered. This binding is the compile-time proof that this
 * module implements {@link GameAPI} exactly — if a signature drifts, tsc says
 * so here rather than in whichever card imports it next.
 */
export const api: GameAPI = { newRun, view, act, save, load };
