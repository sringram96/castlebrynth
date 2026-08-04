import type { Horror, Intent } from '../lots/index.js'

/**
 * art. 58: an intent is a declared verb + number + optional rider, and the
 * taxonomy is content, authored per horror, not law.
 *
 * art. 42: the intent is visible from the top of the turn. The horror never
 * rolls — the only dice in the room are yours.
 */

const RAKE: Intent = { verb: 'RAKE', amount: 8 }
const BELLOW: Intent = { verb: 'BELLOW', amount: 13 }

/**
 * The Crawling One — the reference encounter's horror
 * (`reference/the-crawling-one-encounter.md`). Ninety health, and a bellow
 * on the second turn that is lethal against a raked player.
 */
export const CRAWLING_ONE: Horror = {
  id: 'horror.crawling-one',
  health: 90,
  intentFor(turnNumber) {
    return turnNumber === 2 ? BELLOW : RAKE
  },
}

export const YOUR_HEALTH_AT_WAKING = 20
