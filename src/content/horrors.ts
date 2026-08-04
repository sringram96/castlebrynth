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
  { verb: 'BELLOW', amount: 16 },
  { verb: 'SWIPE', amount: 8 },
]

/** Every loop of the script, its attacks come back this much heavier. */
export const GNAWING_ESCALATION = 3

export const GNAWING_HEALTH = 150

export const THE_GNAWING: Horror = scriptedHorror(
  'horror.gnawing',
  GNAWING_HEALTH,
  GNAWING_SCRIPT,
  GNAWING_ESCALATION,
)

/**
 * The Crawling One is retired. It was authored at ninety health for the
 * THROW/BRACE turn the demo ruling repealed, and the fight it belonged to
 * is superseded (`reference/the-crawling-one-encounter.md`). Nothing deals
 * it; the Gnawing is the depth's one horror this tranche.
 */
