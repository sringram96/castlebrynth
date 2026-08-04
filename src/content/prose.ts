/**
 * Every player-facing word. rules/voice.md binds all of it: second person,
 * present tense, no "you feel", no jokes, no exclamation marks, one candle
 * of text at a time — a beat is ~45 words or fewer. The labyrinth never
 * explains itself twice.
 *
 * Engine code contains no prose. This is the only file that says anything
 * out loud.
 */

/** The word band, one candle at a time (art. 29). */
export const BEATS: Readonly<Record<string, readonly string[]>> = {
  'crossing.wake': [
    'You wake. The ceiling is close enough to touch.',
    'Six bones lie where your hand fell open. One of them is paler than the rest.',
    'The corridor goes down. Behind you the stone is unbroken.',
  ],
}

/** Tappable nouns are concrete and singular (voice). */
export const NOUNS: Readonly<Record<string, string>> = {
  'crossing.grate': 'the grate',
  'crossing.bones': 'the bones',
  'crossing.traveler': 'the traveler',
  'crossing.chain': 'the chain',
}

/** What looking answers. Looking is free and always answers (art. 6). */
export const LOOKS: Readonly<Record<string, string>> = {
  'crossing.grate': 'Light comes down through iron you cannot reach.',
  'crossing.bones': 'Six bones, worn smooth. The pale one has your thumb worn into it.',
  'crossing.traveler': 'A traveler lies along the wall. The cloak has gone stiff.',
  'crossing.chain': 'A chain comes out of the dark above and stops short of the floor.',
}

/** A door's sense is one line — true, and incomplete (voice). */
export const DOOR_SENSES: Readonly<Record<string, string>> = {
  'sense.wet': 'Behind this one, something wet is scratching.',
  'sense.iron': 'Cold air comes under this one, and the smell of iron.',
  'sense.quiet': 'Nothing comes from this one. The nothing goes on a long way.',
}

/** One line per death, written into the Book of Ends (art. 11). */
export const END_LINES: Readonly<Record<string, string>> = {
  'end.rake': 'The Crawling One opens you at the second turn and goes back to its corner.',
  'end.warden': 'The Warden stands aside. The stair keeps going down.',
}
