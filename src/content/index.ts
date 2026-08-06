/**
 * src/content — every room, horror, die, and player-facing word, as typed
 * data. Engine code contains no prose and no tuning numbers; they are all
 * here, and this directory imports types from the engine, never the other
 * way around.
 */

export { GRID, AUTHORED_GRID, AUTHORED_HEIGHT, MOTION, RENDER, atGrid } from './render.js'
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
// arts 100, 107–108: the things drawn once by hand, and the further frames
// the ones that move are drawn in. A loop's frames share one silhouette, and
// that is a claim about these drawings rather than about the renderer.
export {
  BEARER,
  BEARER_FRAMES,
  BRAZIER,
  BRAZIER_FRAMES,
  CHOIR,
  CHOIR_DARK,
  LANTERN,
  LANTERN_FRAMES,
  WATCHER,
  WATCHER_DARK,
} from './plates/bestiary.js'
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
  THE_SILT_MOTHER,
  SILT_MOTHER_SCRIPT,
  SILT_MOTHER_ESCALATION,
  SILT_MOTHER_HEALTH,
  THE_KINDLED,
  KINDLED_SCRIPT,
  KINDLED_ESCALATION,
  KINDLED_HEALTH,
  THE_WARDEN,
  WARDEN_SCRIPT,
  WARDEN_ESCALATION,
  WARDEN_HEALTH,
  HORRORS,
  HORROR_SCRIPTS,
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
  KINDLED,
  LEAVES_A_GOOD,
  LEECH_BONE,
  MARROW,
  MENDER,
  OSSUARY,
  SILT_MOTHER,
  PLATE,
  PUSHER,
  RARITY,
  RUNNER,
  SANCTUM_BREATH,
  SAVIOR_CHANCE,
  SAVIOR_MERCY,
  SISTER_ELDER,
  SISTER_YOUNGER,
  WARDEN_KEEPER,
  encounterOfHorror,
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
  DEATHS,
  EXCHANGE,
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
  UNBIDDEN,
  VERBS,
} from './prose.js'
export {
  dieLabel,
  intentChip,
  itemLabel,
  endLineFor,
  originOf,
  saysAct,
  saysBound,
  saysClaim,
  saysDeath,
  saysDie,
  saysExchange,
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
  WARDEN_DOWN,
  WARDEN_KEY,
  WARDEN_KEY_ITEM,
  advanceBodyOf,
  horrorIn,
  keeperStanding,
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

import { HORROR_SCRIPTS } from './horrors.js'
import { LADDER } from './ladder.js'
import { CROSSING as THE_CROSSING } from './rooms.js'
import {
  ARRIVALS,
  BEATS,
  DEATHS,
  END_LINES,
  EXCHANGE,
  INTENT_SAYS,
  LABELS,
  LOOKS,
  NOTICES,
  NOUNS,
  ORIGINS,
  READOUT,
  TABS,
  SOCKET_BEATS,
  UNBIDDEN,
} from './prose.js'
import type { Utterance } from './voice.js'
import { asLabels, asPlaceholders, asScrawls, asThoughts } from './voice.js'

/**
 * art. 37: the Crossing opens every run, so the Crossing's beats are the
 * waking — the one room the mind wave rewrote. The other thirteen are
 * cards 27–28's.
 */
const WAKING = THE_CROSSING as string

/**
 * Which of the shell's notices have been rewritten into the amended
 * register. Everything else in `NOTICES` is prose in the repealed voice and
 * is declared a placeholder rather than quietly counted as passing.
 *
 * It is an explicit list because the honest answer is a list: a string is in
 * the new voice because somebody wrote it in the new voice, never because a
 * regular expression failed to object to it.
 */
const AMENDED_NOTICES: readonly string[] = [
  'gate.cold',
  'gate.held',
  'gate.abandon.asked',
  'gate.abandoned',
  'run.finished',
  'run.finished.choose',
  'choose.which',
  'book.title',
  'book.empty',
  // The answer wave. Card 68 has not landed, so the rest of this map is
  // still the debt — but nothing new may be written in the repealed voice
  // (rules/voice.md), so every line this wave touched is judged as a
  // thought from the moment it is written.
  'door.blind',
  'door.held',
  // card 71: the totals line, said as one statement rather than as an offer
  // and a refusal standing next to each other.
  'claim.exact',
  'claim.floor',
]

/**
 * card 69: every `answer.*` line is this wave's, so it is a prefix rather
 * than a list. A new act ships with a new answer, and the answer is judged
 * as a thought the moment it is written — there is no version of that where
 * somebody has to remember to add a key here as well.
 */
const AMENDED_PREFIXES: readonly string[] = ['answer.']

function amendedNotice(key: string): boolean {
  return AMENDED_NOTICES.includes(key) || AMENDED_PREFIXES.some((at) => key.startsWith(at))
}

/**
 * The same declaration for the looks, and for the same reason. `LOOKS` is
 * cards 27–29's debt and is otherwise a placeholder wholesale; these are the
 * lines the answer wave wrote, and they answer to the amended register from
 * the day they were written rather than from the day the card lands.
 */
const AMENDED_LOOKS: readonly string[] = ['basin.water.kept', 'mender.figure.kept']

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
      .filter(([key]) => amendedNotice(key) === amended)
      .map(([, said]) => said)
  const looksIn = (amended: boolean): readonly string[] =>
    Object.entries(LOOKS)
      .filter(([key]) => AMENDED_LOOKS.includes(key) === amended)
      .map(([, said]) => said)
  return [
    // The amended register, as far as it has been written. Everything the
    // wave has not reached yet is a declared placeholder below rather than a
    // string the lint was talked into passing.
    ...asThoughts([
      // The waking, in his head. The candle before it is the scrawl, and it
      // is not in `BEATS` at all — the Book lays it down (`RoomBook.scrawl`).
      ...(BEATS[WAKING] ?? []),
      // art. 78: the arrival is one candle like any other, and it is him
      // working out what his own choosing has done.
      ...Object.values(ARRIVALS).flat(),
      ...noticesIn(true),
      ...looksIn(true),
      // card 69: what a turn did, and the candle before the scrawl. Both are
      // him in live play, so both are thoughts — the `{dealt}` tokens are
      // filled by `saysExchange` and are words like any other to the lint.
      ...Object.values(EXCHANGE),
      ...Object.values(DEATHS),
      // card 71: rewritten this wave — impending, and carrying both halves.
      // The `{n}` tokens are filled by `saysIntent` and are words like any
      // other to the lint.
      ...Object.values(INTENT_SAYS),
    ]),
    // The Book of Ends is the pile of things he wrote down, and the line at
    // the head of it is the oldest of them.
    ...asScrawls(Object.values(END_LINES)),
    ...asPlaceholders([
      ...Object.entries(BEATS)
        .filter(([room]) => room !== WAKING)
        .flatMap(([, said]) => said),
      // art. 83: a socket's words reach the player exactly as a room's do,
      // so they are judged exactly as a room's are — and wait on the same
      // card.
      ...Object.values(SOCKET_BEATS).flat(),
      // art. 117: a room speaking of its own accord is still him noticing
      // it, so the unbidden lines are prose like any other — and they were
      // written days before the register changed under them, so they wait on
      // the same card as the rooms they belong to.
      ...Object.values(UNBIDDEN),
      ...looksIn(false),
      // art. 87: an origin is prose that reaches the player, so it is judged
      // as prose. If a sentence cannot pass the lint the item does not ship,
      // which is the article's acceptance test enforced rather than quoted.
      ...Object.values(ORIGINS),
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
      // art. 58: every verb of every script that ships, walked rather than
      // listed — a horror added to the catalog and forgotten here would be
      // a horror the lint never saw.
      ...HORROR_SCRIPTS.flat().map((intent) => intent.verb),
    ]),
  ]
}
