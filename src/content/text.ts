/**
 * Short player-facing copy that is not attached to a room, a hand or an enemy.
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
   * It opens the pile, the satchel and the rules, which is a menu. It was
   * called INSPECT, and that taught the wrong verb: **inspect** is reserved
   * for a close look at one concrete thing — this hand, this Vial — and never
   * for a global overlay.
   */
  menu: 'MENU',
  fight: 'FIGHT',
  /** The first throw of an attack. */
  roll: 'ROLL',
  /** The second and third. There is no fourth. */
  reroll: 'REROLL',
  drink: 'DRINK',
  take: 'TAKE',
  skip: 'SKIP',
  close: 'CLOSE',
} as const

/**
 * What the well says at each position of an attack.
 *
 * One line, and it is an instruction rather than a description: the player is
 * being asked for a decision and the well is the one region that can ask. The
 * position is derived from the dice and the rolls used — there is no phase
 * field to key this off, on purpose.
 */
export const ATTACK_LINE = {
  /** Nothing on the table. */
  waiting: 'Throw the bones.',
  /** Dice down, and a throw still in hand. */
  open: 'Hold, and throw the rest again.',
  /** Dice down, and nothing left to throw with. */
  last: 'Nothing left to throw. Score it.',
} as const

/** The whole fight, in five lines, for MENU. */
export const HOW_A_FIGHT_GOES: readonly string[] = [
  'I throw up to six bones. Never more than I have left.',
  'Hold what I want, throw the rest again. Twice at most.',
  'The bones add up. The pattern they make multiplies it.',
  'Each named hand can be scored once per fight.',
  'Nothing left that fits? CRAP, at half, as often as I like.',
]

/** What the well says out of a fight, when there is nothing else to carry. */
export const WELL_IDLE = 'Nothing here but the room.'
