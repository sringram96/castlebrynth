/**
 * Short player-facing copy that is not attached to a room, a die or an enemy.
 *
 * Two voices and no narrator. **Thought** is him, in the moment: first person,
 * present tense, plain words. **Label** is a name for a state and is not a
 * sentence. Controls are neither — they are plain imperative verbs, two words
 * or fewer, and they live next to the code that dispatches them.
 */

export const TITLE_LINE = 'Down there somewhere. He went down there.'
export const TITLE_STALE = 'Whatever I was doing before, I have lost the thread of it. Start again.'

export const DEATH_LINE = 'Dark. Then nothing. Then the stair again.'
export const COMPLETE_LINE = 'Out. Carrying more than I came in with, and I am going back down.'

export const REWARD_PROMPT = 'One of them. Only one.'
export const GIFT_PROMPT = 'One of them. The other stays.'

/** Controls. Plain verbs, two words or fewer. */
export const VERBS = {
  descend: 'DESCEND',
  again: 'AGAIN',
  title: 'TITLE',
  continue: 'CONTINUE',
  inspect: 'INSPECT',
  fight: 'FIGHT',
  roll: 'ROLL',
  reroll: 'REROLL',
  score: 'SCORE',
  take: 'TAKE',
  close: 'CLOSE',
} as const

/** What the tray's well says when nothing has happened yet. */
export const WELL_IDLE = 'Pick dice.'
