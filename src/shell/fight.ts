// castlebrynth · the fight screen — six bones on the floor, and three words.
// (D006)
//
// DESIGN §the lots is the whole spec: "Turn: enemy intent shows (enemies never
// roll) → roll your hand → THROW a combo / brace / [gather — economy still
// open] / FLEE → each held die blocks 1 → intent lands." L002 built that loop
// (src/lots/turn.ts). This card is the thumb on it.
//
// ─────────────────────────────────────────── the screen never does the arithmetic ──
//
// What THROW will do is not computed here twice. `previewThrow` calls the very
// functions `throwBones` calls — `scoreThrow`, and the same `intent - held`
// line — so "select → throw matches core exactly" is true by construction and
// not by two implementations agreeing for now. Score.ts already says why the
// engine reports every field: "so a fight screen prints the arithmetic instead
// of asserting it". This file prints it.
//
// ────────────────────────────────────────────────────── the tap is still free ──
//
// Tapping a bone SELECTS it and INSPECTS it, and does neither anything else nor
// anything to the state: the selection lives here, in the shell, exactly as the
// panel's does (panel.ts). The three words — THROW, BRACE, FLEE — are the acts,
// and they are the only things in this file that move a `Fight`.
//
// ──────────────────────────────────────────── the inspect line cannot lie ──
//
// "Loaded bones: all six faces always possible; weighting is a declared
// probability lean, STATED ON INSPECT and legible in the art" (DESIGN §the
// lots). The lean text is DERIVED from `castOdds`, which is derived from the
// same ticks `cast` draws across — grammar.yaml says it in its own comment:
// "The inspect line is derived from the weights, so it cannot lie about the
// odds." Nothing here is authored prose about a probability.
//
// The foe's line is the other half: "every enemy's inspect declares its PURSUIT
// chance alongside its intent" (DESIGN §the lots).
//
// ────────────────────────────────────────── the end card is not raised from here ──
//
// A fight can end three ways and NONE of them is a run ending. `won` returns you
// to the room. `fled` ends the fight and "the room's door draw stands — forward
// is still the only way". `lost` is a bar at zero, and death "wakes you at the
// Crossing" (death.ts) — it does not end a run either. Only the Descent's `end`
// word ends a run, and only an `end` EMISSION may raise H114's card. So this
// file reports its ending to the shell and never touches the card; end.test.ts
// and fight.test.ts both hold that line from their own side.
//
// ──────────────────────────────────────────────────────────── panes v3 ──
//
// The same three panes (DESIGN §frame; there is no fourth and nothing
// collapses), reading a fight instead of a room:
//
//   ACTIONS  ROLL before the cast; THROW · BRACE · FLEE after it. THROW carries
//            the live arithmetic in its own label, so the decision is made
//            where it is taken.
//   SKILLS   `run.skills` — "found, uses-per-rest, spent AFTER the dice land".
//   ITEMS    `run.pouch` — consumables, then the four equipment slots, then the
//            two small ones, in the engine's own fixed order, each carrying its
//            ✦/• keep mark.
//
// BOTH READ THE RUN BRANCH, NOT THE MANIFEST, and getting that wrong is the
// mistake this card actually made first: the manifest is what EXISTS in the
// world (and ships its skill/joker/spell collections empty by decision), while
// the run branch is what YOU HAVE. Reading the manifest showed a player carrying
// a knife an empty ITEMS page.
//
// ───────────────────────────────────────────────────── the strip reads ONE ledger ──
//
// `stripFor` builds the permanent strip from the RUN branch and the live fight,
// and it reads the campaign ledger nowhere. That is deliberate and it is
// types.ts's own argument about `Strip`: the interface is the list of bars that
// render, and a field added to it "is not a widening of the strip, it is the
// repeal of a design law". Mid-fight, `hp` comes off the `Fight` rather than off
// `run.vitals` — the bar that can kill you this turn is the one being watched,
// and it is still the run ledger's bar.

import { castOdds } from "../lots/cast";
import { isEnabled } from "../lots/manifest";
import { bestTier, scoreThrow } from "../lots/score";
import { brace, flee, rollHand, throwBones } from "../lots/turn";
import type { Bone } from "../lots/cast";
import type { Manifest } from "../lots/manifest";
import type { Action, Ending, Fight } from "../lots/turn";
import type { ActionOption, Id, ItemRef, PanelView, Pouch, RunBranch, Strip } from "../core/types";

/** The object every fight act is addressed to. One name, so the shell's router
 *  has one thing to look for (types.ts `Intent`). */
export const FIGHT = "fight";

/** The words the screen may speak. `roll` is the cast; the other three are
 *  DESIGN §the lots' own verbs. */
export type Word = "roll" | Action;

// ───────────────────────────────────────────────────────── legal combos ──

/** The multiplier the table gives this handful, or 0 for no combo at all. */
function tierMult(manifest: Manifest, bones: readonly Bone[]): number {
  const tier = bestTier(manifest, bones);
  return tier === null ? 0 : (manifest.tiers[tier]?.mult ?? 0);
}

/**
 * Which bones would RAISE the selection you are holding to a better tier.
 *
 * The highlight is relative to what is already picked up, and that is the whole
 * design of it. The obvious version — "every bone that is part of some scoring
 * subset" — was built first and measured, and it lit all six bones on 3000 of
 * 3000 real rolls: six dice over six faces always contain either a repeat or a
 * run of three, so participation is universal and a mark everything carries is
 * a coat of paint, not a highlight.
 *
 * So: with nothing chosen, nothing is lit. Pick up a bone and its duplicates
 * light (a pair beats nothing); pick up two in a row and the third of the run
 * lights (a straight beats nothing). It shows the LEGAL MOVES FROM HERE, which
 * is the question a thumb is actually asking.
 *
 * It is not a recommendation and it does not rank. Which combo to throw is the
 * decision the fight screen exists to put under a thumb — "ruled by thumb at
 * the fight screen" — and answering it here would be the shell playing.
 *
 * `bestTier` is the same function the throw is scored by, so a highlight can
 * never disagree with the score it promises.
 */
export function completions(
  manifest: Manifest,
  roll: readonly Bone[],
  chosen: readonly number[],
): ReadonlySet<number> {
  const picked = chosen.filter((index) => index >= 0 && index < roll.length);
  const held = picked.map((index) => roll[index] as Bone);
  const now = tierMult(manifest, held);
  const better = new Set<number>();
  for (let index = 0; index < roll.length; index += 1) {
    if (picked.includes(index)) continue;
    if (tierMult(manifest, [...held, roll[index] as Bone]) > now) better.add(index);
  }
  return better;
}

// ──────────────────────────────────────────────────────────── the preview ──

/**
 * What a word will do, before it is spoken.
 *
 * Every number here is the number the engine will produce. Nothing is rounded,
 * nothing is estimated, and `pursued` is deliberately absent from a flee's
 * preview: whether it follows you is a draw, and printing a guess would be the
 * screen lying about a die that has not been cast.
 */
export interface Preview {
  readonly word: Word;
  readonly thrown: readonly Bone[];
  readonly tier: Id | null;
  readonly sum: number;
  readonly mult: number;
  /** `sum × mult`. Harm to the foe. */
  readonly score: number;
  readonly held: number;
  readonly block: number;
  readonly intent: number;
  /** What lands on you. For FLEE this is what lands IF it follows. */
  readonly harm: number;
  /** FLEE only: the chance it follows, 0..1. */
  readonly pursuit: number | null;
}

/**
 * THROW these positions of this turn's roll.
 *
 * `scoreThrow` is called here — the same call `throwBones` makes on the same
 * bones — and `held`, `block` and `harm` are the same three lines. That is what
 * makes the label on the button and the result of pressing it the same number.
 *
 * An out-of-range or repeated position previews as if it were not there.
 * `throwBones` REFUSES both, loudly (turn.ts `chosen`), and it is right to: they
 * are caller bugs. But a preview is drawn on every tap, including the tap that
 * is about to be corrected, so it answers rather than throws — and the screen
 * never sends the engine a selection it did not build itself.
 */
export function previewThrow(
  manifest: Manifest,
  fight: Fight,
  indices: readonly number[],
): Preview {
  const roll = fight.roll ?? [];
  const seen = new Set<number>();
  const thrown: Bone[] = [];
  for (const index of indices) {
    if (!Number.isInteger(index) || index < 0 || index >= roll.length) continue;
    if (seen.has(index)) continue;
    seen.add(index);
    thrown.push(roll[index] as Bone);
  }
  const scored = scoreThrow(manifest, thrown);
  const held = roll.length - thrown.length;
  return {
    word: "throw",
    thrown,
    tier: scored.tier,
    sum: scored.sum,
    mult: scored.mult,
    score: scored.score,
    held,
    block: held,
    intent: fight.intent,
    harm: Math.max(0, fight.intent - held),
    pursuit: null,
  };
}

/** BRACE: throw nothing, hold everything, every die blocks 1 (turn.ts). */
export function previewBrace(fight: Fight): Preview {
  const held = (fight.roll ?? []).length;
  return {
    word: "brace",
    thrown: [],
    tier: null,
    sum: 0,
    mult: 1,
    score: 0,
    held,
    block: held,
    intent: fight.intent,
    harm: Math.max(0, fight.intent - held),
    pursuit: null,
  };
}

/**
 * FLEE. Always offered — before the roll or after it, at any turn.
 *
 * The parting harm is UNBLOCKED: "the dice you were holding are not between you
 * and it any more, because you turned around" (turn.ts). So `block` is 0 and
 * `harm` is the whole intent, and it is stated as a risk rather than a fact,
 * because it lands only if the pursuit draw says so.
 */
export function previewFlee(fight: Fight): Preview {
  return {
    word: "flee",
    thrown: [],
    tier: null,
    sum: 0,
    mult: 1,
    score: 0,
    held: 0,
    block: 0,
    intent: fight.intent,
    harm: fight.intent,
    pursuit: fight.foe.pursuit,
  };
}

// ──────────────────────────────────────────────────────────── the inspect ──

const percent = (fraction: number): string => `${Math.round(fraction * 100)}%`;

/**
 * A die's declared lean, in words, DERIVED FROM THE WEIGHTS.
 *
 * `castOdds` reads the same ticks `cast` draws across, so this line cannot
 * disagree with the die. A flat die says so; a leaned one names the faces it
 * leans toward and what they actually come to.
 *
 * Faces are named by their PIPS, not by their manifest ids: the player is
 * looking at a bone with a number on it, and "leans 3 and 4" is the sentence
 * that matches the thing in their hand.
 */
export function leanOf(manifest: Manifest, die: Id): string {
  const entry = manifest.dice[die];
  const odds = castOdds(manifest, die);
  if (entry === undefined || odds === null) return "";
  const faces = entry.faces.map((face) => ({
    pips: manifest.faces[face]?.pips ?? 0,
    odds: odds[face] ?? 0,
  }));
  const even = 1 / faces.length;
  // A tick's worth of slack: a die whose weights are all equal must read as
  // even however the normalisation rounded.
  const leaning = faces.filter((face) => face.odds > even + 1e-9);
  if (leaning.length === 0) {
    return `${entry.name} — even. Every face ${percent(even)}.`;
  }
  const said = leaning.map((face) => `${face.pips} at ${percent(face.odds)}`).join(", ");
  return `${entry.name} — leans to ${said}. All six faces stay possible.`;
}

/**
 * The foe, on inspect: what it will do, and how hard it follows.
 *
 * "every enemy's inspect declares its PURSUIT chance alongside its intent"
 * (DESIGN §the lots). Both, always, in one line — a pursuit chance a player has
 * to go looking for is not declared.
 */
export function foeLine(manifest: Manifest, fight: Fight): string {
  const named = manifest.enemies[fight.foe.id]?.name ?? fight.foe.id;
  return (
    `${named} — ${fight.foeHp} left. It will take ${fight.intent}. ` +
    `Pursuit ${percent(fight.foe.pursuit)}.`
  );
}

// ─────────────────────────────────────────────────────────────── the strip ──

/**
 * The permanent strip, mid-fight.
 *
 * ONE LEDGER. Every field is the RUN branch's — the branch death takes — and
 * the campaign ledger is read nowhere, because `Strip` has no field for it and
 * adding one is a types.ts change and its own card, by exactly the argument
 * types.ts makes about sanity.
 *
 * `hp` comes off the FIGHT and not off `run.vitals`, because mid-fight those two
 * disagree and only one of them can kill you this turn. It is still the run
 * ledger's bar; it is the live reading of it. `max` stays the run's — a ceiling
 * is balance, and balance is content.
 */
export function stripFor(run: RunBranch, fight: Fight | null): Strip {
  return {
    hp: fight === null ? run.vitals.hp : { current: fight.hp, max: run.vitals.hp.max },
    might: run.vitals.might,
    will: run.vitals.will,
    tithes: run.tithes,
    depth: run.depth,
  };
}

// ────────────────────────────────────────────────────────────── panes v3 ──

/**
 * A fight action, addressed.
 *
 * The three words are addressed to `FIGHT` — one name, so the shell's router
 * has one thing to look for. A SKILL or an ITEM is addressed to ITSELF, the way
 * a room's acts are (types.ts `Intent`): the object is the thing you are
 * spending, and the action is what you are doing with it.
 */
const option = (action: Word, label: string): ActionOption => ({
  intent: { object: FIGHT, action },
  label,
});

const spend = (thing: Id, label: string): ActionOption => ({
  intent: { object: thing, action: "use" },
  label,
});

/** THROW's label carries its own arithmetic, so the decision is made where it
 *  is taken. `sum × mult` in the open — score.ts asks for exactly this. */
function throwLabel(preview: Preview): string {
  if (preview.thrown.length === 0) return "THROW — pick your bones";
  const combo = preview.tier === null ? "no combo" : preview.tier.replace(/_/g, " ");
  return (
    `THROW ${preview.thrown.length} — ${combo}: ${preview.sum}×${preview.mult} = ` +
    `${preview.score}; hold ${preview.held}, take ${preview.harm}`
  );
}

/**
 * What you are carrying, in the FIXED order the engine walks it: the loose
 * consumables, then the four equipment slots, then the two small ones.
 *
 * The same order `heldAt` (resolve.ts) and `contents` (death.ts) use, and for
 * the same reason they use it — so the list a player reads is the list death
 * will draw a survivor from, in the order it will draw it.
 *
 * The KEEP MARK is on the label because it is the only thing about an item that
 * matters at the moment you might spend it: ✦ key and • kept come back with you
 * (DESIGN §ledgers), and everything else is what death takes. An empty slot is
 * null, not a hole, so it is skipped rather than shown as a blank.
 */
function carried(pouch: Pouch): readonly ItemRef[] {
  const held: ItemRef[] = [...pouch.consumables];
  for (const slot of pouch.equipment) if (slot !== null) held.push(slot);
  for (const slot of pouch.small) if (slot !== null) held.push(slot);
  return held;
}

const KEEP_MARK: { readonly [K in ItemRef["keep"]]: string } = {
  key: "✦ ",
  kept: "• ",
  none: "",
};

/**
 * The three panes, reading a fight AND THE RUN BRANCH.
 *
 * SKILLS and ITEMS come off `run` — state v3's `skills` and `pouch` (D001) —
 * and NOT off the manifest. That distinction is the whole of this function's
 * second half and it was got wrong first: reading `manifest.skills` /
 * `manifest.jokers` / `manifest.spells` reports both pages empty forever,
 * because grammar.yaml ships those collections empty by decision (L005, L006).
 * But the manifest is what EXISTS in the world; the run branch is what YOU
 * HAVE. A player carrying a knife would have read an empty ITEMS page.
 *
 * OFFERED, NOT YET SPENDABLE. The turn loop has no word for spending a skill or
 * an item — DESIGN's pipeline names a `skill_window` hook and turn.ts does not
 * implement one — so these options are surfaced and the shell has nothing to
 * route them to. That is the honest skeleton: the panes show what state v3
 * holds, and the hook that spends it is the engine's card. Showing nothing
 * would have hidden the pouch; showing it and pretending it fires would be
 * worse.
 *
 * The pages still exist when they are empty (H105): nothing collapses, and a
 * pane that vanished mid-fight would move the pager under a thumb.
 */
export function panesFor(
  manifest: Manifest,
  run: RunBranch,
  fight: Fight,
  chosen: readonly number[],
): PanelView {
  // "found, uses-per-rest, spent AFTER the dice land" — so an exhausted skill
  // is still listed, with its count. Hiding it would be a collapse, and the
  // count is the thing worth reading.
  const skills = run.skills.map((skill) =>
    spend(skill.id, `${skill.id} — ${skill.uses.current}/${skill.uses.max}`),
  );
  const items = carried(run.pouch).map((item) =>
    spend(item.id, `${KEEP_MARK[item.keep]}${item.id}`),
  );

  if (fight.ending !== null) return { actions: [], skills, items };

  if (fight.roll === null) {
    return {
      // FLEE is always offered — before the roll as well as after it.
      actions: [option("roll", "ROLL YOUR HAND"), option("flee", fleeLabel(fight))],
      skills,
      items,
    };
  }

  const preview = previewThrow(manifest, fight, chosen);
  const braced = previewBrace(fight);
  return {
    actions: [
      option("throw", throwLabel(preview)),
      option("brace", `BRACE — hold ${braced.held}, take ${braced.harm}`),
      option("flee", fleeLabel(fight)),
    ],
    skills,
    items,
  };
}

function fleeLabel(fight: Fight): string {
  return `FLEE — pursuit ${percent(fight.foe.pursuit)}, unblocked ${fight.intent}`;
}

// ────────────────────────────────────────────────────────────── the economy ──

/**
 * Why this manifest's economy cannot be played, or null.
 *
 * DESIGN §open parks the spend economy — "knucklebones gather vs
 * refresh-per-fight — RULED BY THUMB AT THE FIGHT SCREEN" — and this is that
 * screen. It cannot make the ruling yet: `openFight` refuses a manifest with
 * `economy.gather` on, because the turn loop only knows refresh-per-fight and
 * would otherwise run the wrong economy quietly (turn.ts). Gather is not the
 * shell's to build — the turn loop is the engine's — so the screen SAYS what is
 * switched on and what the loop will do about it rather than crashing on it.
 *
 * When the loop learns gather, this function stops answering and both ways are
 * playable through the same screen with no change here.
 */
export function economyRefusal(manifest: Manifest): string | null {
  if (isEnabled(manifest, "economy.gather")) {
    return (
      "economy.gather is switched on, and the turn loop only knows " +
      "refresh-per-fight (src/lots/turn.ts). The spend economy is DESIGN §open, " +
      "parked in Asana H199. Nothing can be ruled by thumb until the loop can run it."
    );
  }
  if (!isEnabled(manifest, "economy.refresh_per_fight")) {
    return (
      "economy.refresh_per_fight is switched off and it is the only economy the " +
      "turn loop knows. There is no third option to fall back to."
    );
  }
  return null;
}

// ────────────────────────────────────────────────────────────── the screen ──

export interface FightHandlers {
  /**
   * The fight is over: won, lost, or fled.
   *
   * REPORTED, NOT ACTED ON. None of the three is a run ending — a loss is a bar
   * at zero and wakes you at the Crossing, a flight leaves the room's door draw
   * standing — so what happens next is the shell's, and H114's card stays out of
   * it (see the header).
   */
  readonly ended: (ending: Ending, fight: Fight) => void;
  /** The fight moved. The shell redraws the panel and the strip from it. */
  readonly changed: (fight: Fight) => void;
}

export interface FightScreen {
  readonly element: HTMLElement;
  fight(): Fight;
  /** The positions selected for the throw, in the order they were tapped. */
  chosen(): readonly number[];
  /** FREE: select or deselect a bone, and inspect its lean. */
  tap(index: number): void;
  /** Inspect the foe: intent and pursuit. Also free. */
  tapFoe(): void;
  /** The line the last inspect wrote. */
  inspect(): string;
  /** What THROW would do with the current selection. */
  preview(): Preview;
  /** The three panes, fight-aware. Takes the run branch because SKILLS and
   *  ITEMS are state v3's, not the manifest's. */
  panes(run: RunBranch): PanelView;
  /** Speak a word. The only thing here that moves a fight. */
  say(word: Word): void;
  render(): void;
}

function element(owner: Document, tag: string, className: string): HTMLElement {
  const node = owner.createElement(tag);
  node.className = className;
  return node;
}

/**
 * Open the fight screen over the stage.
 *
 * Takes a `Fight` that has already been opened (turn.ts `openFight`), because
 * joining an enemy card to its grammar half and forking the Lots' stream belong
 * to whoever handled the Descent's `fight` emission, not to a renderer.
 */
export function openScreen(
  host: HTMLElement,
  manifest: Manifest,
  opened: Fight,
  handlers: FightHandlers,
): FightScreen {
  const owner = host.ownerDocument;

  const screen = element(owner, "div", "fight");

  // THE INTENT SHOWS BEFORE YOU ROLL — always, and at the top, because it is
  // what the whole turn is decided against (DESIGN §the lots).
  const banner = owner.createElement("button");
  banner.type = "button";
  banner.className = "fight-intent";

  const floor = element(owner, "div", "floor");
  floor.setAttribute("aria-label", "the bones on the floor");

  const said = element(owner, "p", "fight-inspect");
  said.setAttribute("aria-live", "polite");

  screen.append(banner, floor, said);
  host.append(screen);

  let fight = opened;
  let chosen: number[] = [];
  let inspected = "";

  banner.addEventListener("click", () => tapFoe());

  function tapFoe(): void {
    // A free tap: it describes, and nothing else.
    inspected = foeLine(manifest, fight);
    render();
  }

  function tap(index: number): void {
    const roll = fight.roll;
    if (roll === null || index < 0 || index >= roll.length) return;
    const at = chosen.indexOf(index);
    if (at >= 0) chosen.splice(at, 1);
    else chosen.push(index);
    // Selecting IS inspecting: the bone you are about to throw says what it
    // leans toward, at the moment you pick it up.
    const bone = roll[index];
    if (bone !== undefined) inspected = leanOf(manifest, bone.die);
    render();
  }

  function say(word: Word): void {
    if (fight.ending !== null) return;
    const before = fight;
    if (word === "roll") fight = rollHand(manifest, fight);
    else if (word === "brace") fight = brace(fight);
    else if (word === "flee") fight = flee(fight);
    else {
      // A throw of nothing is a BRACE and has its own word (turn.ts refuses it).
      // The screen does not send one: the button says "pick your bones".
      if (chosen.length === 0) return;
      fight = throwBones(manifest, fight, chosen);
    }
    // The roll is gone once the turn resolves (turn.ts `Fight.roll`), so a
    // selection into it is gone too. Nothing is carried across a turn.
    if (fight.roll === null) chosen = [];
    render();
    if (fight !== before) handlers.changed(fight);
    if (fight.ending !== null && before.ending === null) handlers.ended(fight.ending, fight);
  }

  function render(): void {
    banner.textContent =
      fight.ending === null
        ? foeLine(manifest, fight)
        : `${foeLine(manifest, fight)} — ${fight.ending.toUpperCase()}`;

    const roll = fight.roll;
    if (roll === null) {
      floor.replaceChildren();
    } else {
      const completes = completions(manifest, roll, chosen);
      floor.replaceChildren(
        ...roll.map((bone, index) => {
          const press = owner.createElement("button");
          press.type = "button";
          const marks = ["bone"];
          if (chosen.includes(index)) marks.push("bone--chosen");
          // Would raise what you are holding to a better tier. A highlight,
          // not a recommendation — which combo to throw is the player's.
          if (completes.has(index)) marks.push("bone--completes");
          press.className = marks.join(" ");
          press.dataset["at"] = String(index);
          press.dataset["die"] = bone.die;
          press.textContent = String(bone.pips);
          press.setAttribute(
            "aria-label",
            `${manifest.dice[bone.die]?.name ?? bone.die}, ${bone.pips}`,
          );
          press.setAttribute("aria-pressed", chosen.includes(index) ? "true" : "false");
          press.addEventListener("click", (event) => {
            event.stopPropagation();
            tap(index);
          });
          return press;
        }),
      );
    }

    said.textContent = inspected;
  }

  render();

  return {
    element: screen,
    fight: () => fight,
    chosen: () => [...chosen],
    tap,
    tapFoe,
    inspect: () => inspected,
    preview: () => previewThrow(manifest, fight, chosen),
    panes: (run: RunBranch) => panesFor(manifest, run, fight, chosen),
    say,
    render,
  };
}
