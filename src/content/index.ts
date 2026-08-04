/**
 * src/content — every room, horror, die, and player-facing word, as typed
 * data. Engine code contains no prose and no tuning numbers; they are all
 * here, and this directory imports types from the engine, never the other
 * way around.
 */

export { GRID, AUTHORED_HEIGHT, RENDER, atGrid } from './render.js'
export type { School } from './palettes.js'
export { MUTED, NOIR, roomPalette } from './palettes.js'
export { WAKE } from './plates/wake.js'
export { PLAIN_POUCH, REFERENCE_POUCH, THE_ORPHAN, HAND_SIZE } from './dice.js'
export { LADDER, GREAT_STRAIGHT } from './ladder.js'
export { CRAWLING_ONE, YOUR_HEALTH_AT_WAKING } from './horrors.js'
export { BEATS, NOUNS, LOOKS, DOOR_SENSES, END_LINES } from './prose.js'
export type { VoiceComplaint } from './voice.js'
export { lintVoice, CANDLE_WORDS } from './voice.js'

import { BEATS, DOOR_SENSES, END_LINES, LOOKS, NOUNS } from './prose.js'

/**
 * Every player-facing string in the game, for the voice lint. If a string
 * reaches the player and is not in here, the lint cannot see it — and that
 * is the bug, not the exception.
 */
export function everyString(): readonly string[] {
  return [
    ...Object.values(BEATS).flat(),
    ...Object.values(NOUNS),
    ...Object.values(LOOKS),
    ...Object.values(DOOR_SENSES),
    ...Object.values(END_LINES),
  ]
}
