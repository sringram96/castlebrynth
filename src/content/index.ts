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
export { GATE } from './plates/gate.js'
export type { Dressing } from './plates/plain.js'
export { BARE, plainScene } from './plates/plain.js'
export {
  alcove,
  ashBanks,
  dragMark,
  dust,
  fontSteps,
  motes,
  runnel,
  seep,
  stillBasin,
  theKey,
  theMender,
  threshold,
} from './plates/props.js'
export type { ThresholdState } from './plates/props.js'
export { THINNEST, framedWidth } from './plates/props.js'
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
export {
  BLEED_RIDER,
  PUSH_RIDER,
  THE_BLEED,
  THE_CAREFUL,
  THE_PUSH,
  THE_PUSHER,
  THE_RUNNER,
  TRAVELER_DICE,
  TRAVELER_RIDERS,
} from './travelers.js'
export { LADDER, STRAIGHT, ANY_DICE, PAIRISH } from './ladder.js'
export {
  ALL_RIDERS,
  BASE_ARMOR,
  CATALOG_GOODS,
  LEECH,
  RUSTED_PLATE,
  THE_CORD,
  THE_OSSUARY,
  THE_ZEALOT,
} from './items.js'
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
  CAREFUL,
  CORD,
  DROWNED,
  ENCOUNTERS,
  FLOOR_CHANCE,
  FONT,
  GNAWING,
  IRON_KEY,
  LEAVES_A_GOOD,
  LEECH_BONE,
  MARROW,
  MENDER,
  OSSUARY,
  PLATE,
  PUSHER,
  RARITY,
  RUNNER,
  SANCTUM_BREATH,
  SAVIOR_CHANCE,
  SAVIOR_MERCY,
  SISTER_ELDER,
  SISTER_YOUNGER,
  encounterProp,
  encounterWords,
  fillProps,
  fillWords,
  leftBy,
  lostId,
  takeActId,
} from './encounters.js'
export {
  ARRIVALS,
  BEATS,
  NOUNS,
  LOOKS,
  ORIGINS,
  SOCKET_BEATS,
  END_LINES,
  INTENT_SAYS,
  NOTICES,
  LABELS,
  READOUT,
  TABS,
  VERBS,
} from './prose.js'
export {
  dieLabel,
  intentChip,
  itemLabel,
  originOf,
  saysClaim,
  saysDie,
  saysGood,
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
export {
  lintVoice,
  asLabels,
  asPlaceholders,
  asScrawls,
  asThoughts,
  CANDLE_WORDS,
  SCRAWL_WORDS,
} from './voice.js'

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
  ORIGINS,
  READOUT,
  TABS,
  SOCKET_BEATS,
} from './prose.js'
import type { Utterance } from './voice.js'
import { asLabels, asPlaceholders, asThoughts } from './voice.js'

/**
 * Which of the shell's notices have been rewritten into the amended
 * register. Everything else in `NOTICES` is prose in the repealed voice and
 * is declared a placeholder rather than quietly counted as passing.
 *
 * It is an explicit list because the honest answer is a list: a string is in
 * the new voice because somebody wrote it in the new voice, never because a
 * regular expression failed to object to it. **Empty until this wave's third
 * commit**, which is the one that does the writing.
 */
const AMENDED_NOTICES: readonly string[] = []

/**
 * Every player-facing string in the game, for the voice lint. If a string
 * reaches the player and is not in here, the lint cannot see it — and that
 * is the bug, not the exception.
 *
 * **Four categories** (the mind wave). A **thought** is him in live play; a
 * **scrawl** is anything he wrote down; a **label** is a name and answers to
 * neither register; a **placeholder** is prose in the repealed voice that
 * cards 27–29 have not reached yet. The placeholders are the debt, declared
 * where it can be counted.
 *
 * `VERBS` is deliberately not here. art. 66 exempts controls from
 * rules/voice.md and binds them to itself; they are linted against that
 * article in `test/content.voice.test.ts` instead, which is the same review
 * by a different rule and not an escape from one.
 */
export function everyString(): readonly Utterance[] {
  const noticesIn = (amended: boolean): readonly string[] =>
    Object.entries(NOTICES)
      .filter(([key]) => AMENDED_NOTICES.includes(key) === amended)
      .map(([, said]) => said)
  return [
    // The amended register, as far as it has been written. Everything the
    // wave has not reached yet is a declared placeholder below rather than a
    // string the lint was talked into passing.
    ...asThoughts(noticesIn(true)),
    ...asPlaceholders([
      // The Book of Ends becomes the pile of things he wrote down in the
      // next commit of this wave; until the lines are rewritten they are
      // what they have always been, and saying otherwise here would be the
      // lint agreeing with a claim nobody has made good on.
      ...Object.values(END_LINES),
      ...Object.values(BEATS).flat(),
      // art. 78: the arrival is one candle like any other, and waits on the
      // same rewriting.
      ...Object.values(ARRIVALS).flat(),
      // art. 83: a socket's words reach the player exactly as a room's do,
      // so they are judged exactly as a room's are — and wait on the same
      // card.
      ...Object.values(SOCKET_BEATS).flat(),
      ...Object.values(LOOKS),
      // art. 87: an origin is prose that reaches the player, so it is judged
      // as prose. If a sentence cannot pass the lint the item does not ship,
      // which is the article's acceptance test enforced rather than quoted.
      ...Object.values(ORIGINS),
      ...Object.values(INTENT_SAYS),
      ...noticesIn(false),
    ]),
    ...asLabels([
      ...Object.values(NOUNS),
      ...Object.values(LABELS),
      ...Object.values(READOUT),
      // art. 90: a tab names a place. It is a label, and the lint judges it
      // as one — not as a control, which is what art. 66 governs.
      ...Object.values(TABS),
      ...Object.values(LADDER).map((tier) => tier.name),
      ...GNAWING_SCRIPT.map((intent) => intent.verb),
      ...MARROW_SCRIPT.map((intent) => intent.verb),
    ]),
  ]
}
