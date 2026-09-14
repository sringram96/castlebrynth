/**
 * Short player-facing copy that is not attached to a room, a hand or an enemy.
 *
 * Two voices and no narrator. **Thought** is him, in the moment: first person,
 * present tense, plain words. **Label** is a name for a state and is not a
 * sentence. Controls are neither — they are plain imperative verbs, two words
 * or fewer, and they live next to the code that dispatches them.
 */

/**
 * The premise, and it is stated exactly once here and once in the first room.
 *
 * **Bone remembers.** That is the only strange thing about this place. The
 * thirty in the pile are what he still knows; what breaks them takes what was
 * in them; and at zero he does not die, he stops knowing why he came down and
 * walks back to the stair.
 *
 * It is the reason three otherwise arbitrary laws are the way they are — a
 * throw is always six because the pile was never the ammunition, the pile and
 * the loadout are separate because tools are not memory, and there is no way
 * back up because the descent is what costs him. None of that is said out
 * loud anywhere: the lines below state the situation and the mechanics state
 * themselves, which is the same division of labour the rest of this file keeps.
 */
export const TITLE_LINE = 'I am looking for someone. I still know that much.'
/** A save from a build that no longer exists. It reads as the same affliction. */
export const TITLE_STALE = 'Whatever I was doing before, I have lost the thread of it. Start again.'

/**
 * Zero bones, and **it is not a death**.
 *
 * Nothing killed him. He ran out of the thing he was using to know why he was
 * down there, and he went back up. The screen it sits on is headed with what
 * actually happened rather than with a death, because a game that says *you
 * died* when nobody died is lying in the one place it cannot afford to.
 */
export const DEATH_LINE = 'I cannot remember what I came down for. Dark, and then the stair again.'
/** Out of the door, which is not the same as having found him. */
export const COMPLETE_LINE = 'Out. I did not find him, and I still know to look.'

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
  close: 'CLOSE',
  /** The strip: where this run has been, and the roads it did not take. */
  map: 'MAP',
} as const

/**
 * What a territory is called, on the card that names it on first entry.
 *
 * Four words for the four stretches of the descent, and they are the same four
 * `Territory` names the rooms are classified by — so a fifth territory cannot
 * be added without a card for it, and a card cannot name a place the game does
 * not have. Shown once per territory per run, derived from the path.
 */
export const TERRITORY_CARD: Readonly<Record<string, string>> = {
  threshold: 'THE THRESHOLD',
  ossuary: 'THE OSSUARY',
  chapel: 'THE CHAPEL',
  deep: 'THE DEEP',
}

/**
 * What a hint cut into a wall says.
 *
 * The second of the game's two lines about the treasure, and like the first it
 * says **that** rather than **where**. *We hide places, never rules*: what the
 * Hand of Saint Orrin does is printed on it where it lies, and which of two
 * alcoves it is chained in is the one thing a run is allowed not to know.
 *
 * One string, so the grammars cannot each write their own version of it.
 */
export const HINT_CARVING =
  'A hand scratched into the stone with too many fingers. Somebody came down here for it.'

/** The strip's own two lines. It is a record, and it says so. */
export const STRIP_HEAD = 'THE WAY DOWN'
export const STRIP_AHEAD = 'Ahead of me: nothing I have seen.'

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
  waiting: 'ROLL to begin.',
  /** Dice down, and a throw still in hand. */
  open: 'Tap dice to hold. Tap a hand to attack.',
  /** Dice down, and nothing left to throw with. */
  last: 'Tap a hand to attack.',
} as const

/** What the iron says before it has been thrown. */
export const IRON_IDLE = 'The iron has not been thrown yet.'

/** The whole fight, in seven lines, for MENU. */
export const HOW_A_FIGHT_GOES: readonly string[] = [
  'I throw six dice. Six, always — bones are what I have left, not what I throw.',
  'The iron throws with them, once. I cannot hold it and I cannot throw it again.',
  'Hold what I want of the six, throw the rest again. Twice at most.',
  'The dice add up. The line they make multiplies it. Everything else is flat.',
  'Each named hand can be scored once per fight.',
  'Nothing left that fits? CRAP, at half, as often as I like.',
  'Item dice fire on their own when I attack. There is no press for them.',
]

/** What the well says out of a fight, when there is nothing else to carry. */
export const WELL_IDLE = 'Nothing here but the room.'
