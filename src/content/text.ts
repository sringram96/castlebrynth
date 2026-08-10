/**
 * Short player-facing copy that is not attached to a room, a bone or an enemy.
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

export const REWARD_PROMPT = 'Take one, or leave it.'

/** Controls. Plain verbs, two words or fewer. */
export const VERBS = {
  descend: 'DESCEND',
  again: 'AGAIN',
  title: 'TITLE',
  continue: 'CONTINUE',
  /**
   * The persistent bottom-left control.
   *
   * It opens the army, the satchel and the rules, which is a menu. It was
   * called INSPECT, and that taught the wrong verb: **inspect** is reserved
   * for a close look at one concrete thing — this bone, this Vial — and never
   * for a global overlay.
   */
  menu: 'MENU',
  fight: 'FIGHT',
  throw: 'THROW',
  round: 'ROUND',
  drink: 'DRINK',
  pouch: 'POUCH',
  take: 'TAKE',
  skip: 'SKIP',
  close: 'CLOSE',
} as const

/**
 * What the well says at each phase.
 *
 * One line, and it is an instruction rather than a description: the player is
 * being asked for a decision and the well is the one region that can ask.
 */
export const PHASE_LINE = {
  thrown: 'Its line is up. Throw yours against it.',
  smashed: 'What is broken is broken.',
} as const

/** The whole game, in four lines, for MENU and for the first fight. */
export const WAR_OF_BONES: readonly string[] = [
  'The enemy throws first.',
  'Field 1–6 bones, then throw once.',
  'High kills low. Ties kill both.',
  'Extra bones are safe. What dies stays dead.',
]

/** What the well says out of a fight, when there is nothing else to carry. */
export const WELL_IDLE = 'Nothing here but the room.'
