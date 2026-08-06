import type { Horror, Intent } from '../lots/index.js'
import { PAIRISH } from './ladder.js'

/**
 * art. 58: an intent is a declared verb + number + optional effect, and the
 * taxonomy is content, authored per horror, not law.
 *
 * art. 42: the intent is visible from the top of the turn. The horror never
 * rolls — the only dice in the room are yours.
 *
 * art. 65: an intent may attack the plan and not just the body. All three of
 * the demo's plan-attacks are here as declared data: a seal that shuts the
 * pair-shaped lines, a curse that counts sixes at nothing, and a corrosion
 * that turns armor off for the turn.
 */

/**
 * A horror that reads from a script, and gets worse each time it runs out of
 * script. This is the escalation hook: the loop is counted here, in content,
 * and the engine only ever asks what turn N intends.
 */
export function scriptedHorror(
  id: string,
  health: number,
  script: readonly Intent[],
  escalation: number,
): Horror {
  return {
    id,
    health,
    intentFor(turnNumber: number): Intent {
      const at = Math.max(0, turnNumber - 1)
      const intent = script[at % script.length]
      if (intent === undefined) throw new Error(`${id} has no script to read`)
      const loop = Math.floor(at / script.length)
      return { ...intent, amount: intent.amount + loop * escalation }
    },
  }
}

/** Which loop of its script a scripted horror is on — for the display. */
export function loopOf(script: readonly Intent[], turnNumber: number): number {
  return Math.floor(Math.max(0, turnNumber - 1) / script.length)
}

/**
 * THE GNAWING — the demo's horror, and the one horror phase 0 ships
 * (`reference/castlebrynth-lots-demo.html`). Six intents, then the script
 * begins again three points angrier.
 */
export const GNAWING_SCRIPT: readonly Intent[] = [
  { verb: 'SWIPE', amount: 7 },
  { verb: 'SEAL', amount: 6, effect: { kind: 'seal', lines: PAIRISH } },
  { verb: 'COVET', amount: 5, effect: { kind: 'curse', value: 6 } },
  { verb: 'CORRODE', amount: 9, effect: { kind: 'corrode' } },
  // art. 119 §3: the biggest hit in the depth, and the one the death
  // scrawl tells the player to count for. The tell is what makes counting
  // learnable by watching rather than only by dying.
  { verb: 'BELLOW', amount: 16, telegraph: true },
  { verb: 'SWIPE', amount: 8 },
]

/** Every loop of the script, its attacks come back this much heavier. */
export const GNAWING_ESCALATION = 3

export const GNAWING_HEALTH = 290

export const THE_GNAWING: Horror = scriptedHorror(
  'horror.gnawing',
  GNAWING_HEALTH,
  GNAWING_SCRIPT,
  GNAWING_ESCALATION,
)

/**
 * THE MARROW — the special horror, and the drift's proof (arts 83, 84). It
 * floats into whatever socket will take it, it is unique per run, and it
 * wakes only when the ossuary locks: a region's encounters activating is
 * what art. 78 means by arrival, and this is what arriving costs.
 *
 * Its numbers sit a little under the Gnawing's and its script runs one
 * shorter, so the loop comes round sooner. Rarer, not merely bigger.
 */
export const MARROW_SCRIPT: readonly Intent[] = [
  { verb: 'REND', amount: 9 },
  { verb: 'SEAL', amount: 6, effect: { kind: 'seal', lines: PAIRISH } },
  { verb: 'COVET', amount: 5, effect: { kind: 'curse', value: 5 } },
  { verb: 'CORRODE', amount: 8, effect: { kind: 'corrode' } },
  { verb: 'REND', amount: 13, telegraph: true },
]

export const MARROW_ESCALATION = 3

export const MARROW_HEALTH = 310

export const THE_MARROW: Horror = scriptedHorror(
  'horror.marrow',
  MARROW_HEALTH,
  MARROW_SCRIPT,
  MARROW_ESCALATION,
)

/**
 * THE SILT MOTHER — the drowned's unique (card 29).
 *
 * The Marrow's pattern, moved one region over: she floats, she is unique
 * per run, and she wakes only when the drowned locks. The playtest verdict
 * the company wave answers was *"there is still only one bad guy"*, and the
 * fix is the symmetry the Marrow already implied — every region gets its
 * unique, so arrival (art. 78) costs something wherever a run arrives.
 *
 * **The partition she forces**: hold your best die or spend it. She leans
 * `bind` — the water takes whatever you are holding highest — and `bleed`,
 * so a turn spent tidying up is a turn she is still charging for. Against
 * the Gnawing you can afford to wait for a shape; against her, waiting is
 * the expensive move and the shape you were waiting for is the die she
 * takes.
 *
 * Her numbers sit under the Marrow's and her script runs the same five, so
 * she is rarer rather than merely bigger (art. 83's scope, not its weight).
 */
export const SILT_MOTHER_SCRIPT: readonly Intent[] = [
  { verb: 'DRAG', amount: 6, effect: { kind: 'bind', rule: 'highest' } },
  { verb: 'CHILL', amount: 4, effect: { kind: 'bleed', amount: 5, turns: 3 } },
  { verb: 'SILT', amount: 8 },
  { verb: 'DRAG', amount: 7, effect: { kind: 'bind', rule: 'highest' } },
  { verb: 'UNDERTOW', amount: 12, telegraph: true },
]

export const SILT_MOTHER_ESCALATION = 3

export const SILT_MOTHER_HEALTH = 290

export const THE_SILT_MOTHER: Horror = scriptedHorror(
  'horror.silt-mother',
  SILT_MOTHER_HEALTH,
  SILT_MOTHER_SCRIPT,
  SILT_MOTHER_ESCALATION,
)

/**
 * THE KINDLED — the burnt's unique (card 29).
 *
 * Char over a fire that never went out. Same pattern and the same sizing
 * discipline: floating, unique per run, awake only when the burnt locks.
 *
 * **The partition it forces**: claim something every turn or feed it. It
 * leans `bleed` — the burn keeps — and `hunger`, which is the only intent
 * in the depth that punishes a turn you did nothing with. Where the Silt
 * Mother makes waiting expensive by taking, the Kindled makes it expensive
 * by *healing*, so the two lean on the same habit from opposite sides and a
 * player who has learned one has half-learned the other.
 */
export const KINDLED_SCRIPT: readonly Intent[] = [
  { verb: 'SEAR', amount: 5, effect: { kind: 'bleed', amount: 6, turns: 3 } },
  { verb: 'GAPE', amount: 6, effect: { kind: 'hunger', amount: 30 } },
  { verb: 'CHAR', amount: 9 },
  { verb: 'GAPE', amount: 5, effect: { kind: 'hunger', amount: 34 } },
  { verb: 'GUTTER', amount: 13, telegraph: true },
]

export const KINDLED_ESCALATION = 3

export const KINDLED_HEALTH = 310

export const THE_KINDLED: Horror = scriptedHorror(
  'horror.kindled',
  KINDLED_HEALTH,
  KINDLED_SCRIPT,
  KINDLED_ESCALATION,
)

/**
 * THE WARDEN — the keeper the door was built for (card 31, art. 37 as
 * amended 2026-08-06).
 *
 * It stands in no socket. It is not dealt, not weighted and not floated:
 * there is one hall, so it is unique by construction, and it does not exist
 * until the key turns. Everything else about it is content like any other
 * horror's.
 *
 * **Its script is the depth's exam.** Every effect kind the depth has to
 * teach is in it — seal, curse and corrode from the Gnawing's school, bind,
 * bleed and hunger from the region uniques — so a player who learned the
 * depth reads every intent on sight, and a player who skipped every fight
 * meets six strangers at once. That is the whole design of it: the fight is
 * a question about the run behind it.
 *
 * Numbers above the Gnawing's and escalation steeper, because the loop
 * coming round is what a long fight at the bottom of a depth should be
 * afraid of.
 */
export const WARDEN_SCRIPT: readonly Intent[] = [
  { verb: 'JUDGE', amount: 9, effect: { kind: 'seal', lines: PAIRISH } },
  { verb: 'BIND', amount: 8, effect: { kind: 'bind', rule: 'highest' } },
  { verb: 'TITHE', amount: 7, effect: { kind: 'curse', value: 6 } },
  { verb: 'FLENSE', amount: 5, effect: { kind: 'bleed', amount: 5, turns: 3 } },
  { verb: 'STRIP', amount: 12, effect: { kind: 'corrode' } },
  { verb: 'WAIT', amount: 4, effect: { kind: 'hunger', amount: 38 } },
  { verb: 'KEEP', amount: 18, telegraph: true },
]

export const WARDEN_ESCALATION = 5

export const WARDEN_HEALTH = 380

export const THE_WARDEN: Horror = scriptedHorror(
  'horror.warden',
  WARDEN_HEALTH,
  WARDEN_SCRIPT,
  WARDEN_ESCALATION,
)

/** Every horror the depth can deal, for restoring a fight by identity. */
export const HORRORS: readonly Horror[] = [
  THE_GNAWING,
  THE_MARROW,
  THE_SILT_MOTHER,
  THE_KINDLED,
  THE_WARDEN,
]

/**
 * Every script that ships, so the tests can walk them without a list that
 * has to be kept in step by hand. art. 73 asks every intent to explain
 * itself on a tap, and the only way to hold content to that is to be able
 * to enumerate the intents.
 */
export const HORROR_SCRIPTS: readonly (readonly Intent[])[] = [
  GNAWING_SCRIPT,
  MARROW_SCRIPT,
  SILT_MOTHER_SCRIPT,
  KINDLED_SCRIPT,
  WARDEN_SCRIPT,
]

export function horrorById(id: string): Horror | null {
  return HORRORS.find((held) => held.id === id) ?? null
}

/**
 * Which line the Book of Ends takes when a horror finishes a run (art. 11).
 * A death is authored per horror, like everything else it says.
 */
const END_LINE_OF: Readonly<Record<string, string>> = {
  'horror.gnawing': 'end.gnawing',
  'horror.marrow': 'end.marrow',
  'horror.silt-mother': 'end.silt-mother',
  'horror.kindled': 'end.kindled',
  'horror.warden': 'end.warden.keeper',
}

export function endLineOf(id: string): string {
  return END_LINE_OF[id] ?? 'end.gnawing'
}

/**
 * The Crawling One is retired. It was authored at ninety health for the
 * THROW/BRACE turn the demo ruling repealed, and the fight it belonged to
 * is superseded (`reference/the-crawling-one-encounter.md`). Nothing deals
 * it; the Gnawing is the depth's one horror this tranche.
 */
