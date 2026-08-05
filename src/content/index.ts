/**
 * src/content — every room, horror, die, and player-facing word, as typed
 * data. Engine code contains no prose and no tuning numbers; they are all
 * here, and this directory imports types from the engine, never the other
 * way around.
 */

export { GRID, AUTHORED_GRID, AUTHORED_HEIGHT, RENDER, atGrid } from './render.js'
export type { School, Shading } from './palettes.js'
export {
  ASH,
  IRON,
  MUTED,
  NOIR,
  OCHRE,
  VERDIGRIS,
  WET,
  lookOf,
  roomPalette,
  shadingOf,
} from './palettes.js'
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
  fontSteps,
  motes,
  runnel,
  seep,
  stillBasin,
  theKey,
  theMender,
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
  THE_MARROW,
  MARROW_SCRIPT,
  MARROW_ESCALATION,
  MARROW_HEALTH,
  HORRORS,
  endLineOf,
  horrorById,
  loopOf,
  scriptedHorror,
} from './horrors.js'
export {
  BASIN,
  BURNT,
  DROWNED,
  ENCOUNTERS,
  FONT,
  GNAWING,
  IRON_KEY,
  MARROW,
  MENDER,
  OSSUARY,
  SANCTUM_BREATH,
  SAVIOR_CHANCE,
  SAVIOR_MERCY,
  encounterProp,
  encounterWords,
} from './encounters.js'
export {
  ARRIVALS,
  BEATS,
  NOUNS,
  LOOKS,
  SOCKET_BEATS,
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
  DEPTH_ONE,
  FAR_SOCKET,
  FLOOR_SOCKET,
  GRAMMAR,
  MERCY_SOCKET,
  ROOMS,
  ROOM_BOOK,
  WARDEN,
  WARDEN_KEY,
  WARDEN_KEY_ITEM,
  horrorOf,
  roomContent,
  roomName,
  socketMark,
} from './rooms.js'
export type { Utterance, VoiceCategory, VoiceComplaint } from './voice.js'
export { lintVoice, asBeats, asLabels, CANDLE_WORDS } from './voice.js'

import { GNAWING_SCRIPT, MARROW_SCRIPT } from './horrors.js'
import { LADDER } from './ladder.js'
import {
  ARRIVALS,
  BEATS,
  END_LINES,
  INTENT_SAYS,
  LABELS,
  LOOKS,
  NOTICES,
  NOUNS,
  READOUT,
  SOCKET_BEATS,
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
      // art. 83: a socket's words reach the player exactly as a room's do,
      // so they are judged exactly as a room's are.
      ...Object.values(SOCKET_BEATS).flat(),
      // art. 78: the arrival is one candle like any other.
      ...Object.values(ARRIVALS).flat(),
      ...Object.values(LOOKS),
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
      ...MARROW_SCRIPT.map((intent) => intent.verb),
    ]),
  ]
}
