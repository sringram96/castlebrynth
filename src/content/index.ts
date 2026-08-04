/**
 * src/content — every room, horror, die, and player-facing word, as typed
 * data. Engine code contains no prose and no tuning numbers; they are all
 * here, and this directory imports types from the engine, never the other
 * way around.
 */

export { GRID, AUTHORED_GRID, AUTHORED_HEIGHT, RENDER, atGrid } from './render.js'
export type { School } from './palettes.js'
export { ASH, IRON, MUTED, NOIR, OCHRE, WET, roomPalette } from './palettes.js'
export { WAKE, masonry } from './plates/wake.js'
export type { Dressing } from './plates/plain.js'
export { BARE, plainScene } from './plates/plain.js'
export {
  alcove,
  ashBanks,
  blackDoor,
  doorway,
  dragMark,
  dust,
  motes,
  runnel,
  seep,
  theKey,
} from './plates/props.js'
export {
  PLAIN_POUCH,
  PLAIN_BONE,
  THE_ORPHAN,
  THE_SISTERS,
  THE_LEECH,
  SISTERS_BOND,
  LEECH_RIDER,
  HAND_SIZE,
} from './dice.js'
export { LADDER, STRAIGHT, ANY_DICE, PAIRISH } from './ladder.js'
export { THE_OSSUARY, THE_ZEALOT, RUSTED_PLATE, LEECH, ALL_RIDERS, BASE_ARMOR } from './items.js'
export { YOUR_HEALTH_AT_WAKING, BARE_BODY } from './body.js'
export { DEMO_HAND, DEMO_GOODS, DEMO_ARMOR, DEMO_HEALTH } from './reference.js'
export {
  THE_GNAWING,
  GNAWING_SCRIPT,
  GNAWING_ESCALATION,
  GNAWING_HEALTH,
  loopOf,
  scriptedHorror,
} from './horrors.js'
export {
  BEATS,
  NOUNS,
  LOOKS,
  DOOR_SENSES,
  END_LINES,
  INTENT_SAYS,
  NOTICES,
  LABELS,
  READOUT,
  VERBS,
} from './prose.js'
export {
  dieLabel,
  intentChip,
  itemLabel,
  saysClaim,
  saysDie,
  saysIntent,
  saysItem,
} from './says.js'
export type { RoomContent } from './rooms.js'
export {
  CATALOG,
  CROSSING,
  GRAMMAR,
  ROOMS,
  ROOM_BOOK,
  WARDEN,
  WARDEN_KEY,
  WARDEN_KEY_ITEM,
  horrorAt,
  horrorById,
  roomContent,
  roomName,
} from './rooms.js'
export type { Utterance, VoiceCategory, VoiceComplaint } from './voice.js'
export { lintVoice, asBeats, asLabels, CANDLE_WORDS } from './voice.js'

import { GNAWING_SCRIPT } from './horrors.js'
import { LADDER } from './ladder.js'
import {
  BEATS,
  DOOR_SENSES,
  END_LINES,
  INTENT_SAYS,
  LABELS,
  LOOKS,
  NOTICES,
  NOUNS,
  READOUT,
} from './prose.js'
import type { Utterance } from './voice.js'
import { asBeats, asLabels } from './voice.js'

/**
 * Every player-facing string in the game, for the voice lint. If a string
 * reaches the player and is not in here, the lint cannot see it — and that
 * is the bug, not the exception.
 *
 * Two categories, by the ruling of 2026-08-04: prose answers to the whole
 * of rules/voice.md, and names — combos, items, rooms, horrors, the verbs
 * on an intent — answer to it minus second person and present tense.
 *
 * `VERBS` is deliberately not here. art. 66 exempts controls from
 * rules/voice.md and binds them to itself; they are linted against that
 * article in `test/content.voice.test.ts` instead, which is the same review
 * by a different rule and not an escape from one.
 */
export function everyString(): readonly Utterance[] {
  return [
    ...asBeats([
      ...Object.values(BEATS).flat(),
      ...Object.values(LOOKS),
      ...Object.values(DOOR_SENSES),
      ...Object.values(END_LINES),
      ...Object.values(INTENT_SAYS),
      ...Object.values(NOTICES),
    ]),
    ...asLabels([
      ...Object.values(NOUNS),
      ...Object.values(LABELS),
      ...Object.values(READOUT),
      ...Object.values(LADDER).map((tier) => tier.name),
      ...GNAWING_SCRIPT.map((intent) => intent.verb),
    ]),
  ]
}
