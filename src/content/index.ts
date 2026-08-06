/**
 * src/content — every room, horror, die, and player-facing word, as typed
 * data. Engine code contains no prose and no tuning numbers; they are all
 * here, and this directory imports types from the engine, never the other
 * way around.
 */

export { CASCADE, GRID, AUTHORED_GRID, AUTHORED_HEIGHT, MOTION, RENDER, atGrid } from './render.js'
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
  // card 90: the levels, and the ceiling on how far one line may be lifted.
  LEVELS,
  LEVEL_CAP,
  RUSTED_PLATE,
  THE_BOWL,
  THE_CHAIN,
  THE_CORD,
  THE_NOTCHED_STICK,
  THE_OSSUARY,
  THE_RING,
  THE_WHETSTONE,
  THE_ZEALOT,
} from './items.js'
/**
 * card 93: **the rolling goods.** One file, and it is the mechanic — the
 * engine's socket is a no-op when empty, so emptying `ROLLING_GOODS` empties
 * the species with no dead branch left behind it.
 */
export { ROLLING_CAP, ROLLING_GOODS, THE_SLIVER, THE_TIN_SAINT } from './trinkets.js'
export { YOUR_HEALTH_AT_WAKING, BARE_BODY } from './body.js'
export {
  DEMO_ARMOR,
  DEMO_GNAWING,
  DEMO_GNAWING_HEALTH,
  DEMO_GOODS,
  DEMO_HAND,
  DEMO_HEALTH,
} from './reference.js'
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
  BOWL,
  CHAIN,
  LEECH_BONE,
  MARROW,
  NOTCH,
  RING,
  WHETSTONE,
  ZEALOT,
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
  // card 93: the two rolling goods, on the floor like anything else.
  SLIVER,
  TIN_SAINT,
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
  FIRING,
  NOUNS,
  LOOKS,
  ORIGINS,
  SOCKET_BEATS,
  END_LINES,
  INTENT_SAYS,
  NOTICES,
  LABELS,
  READOUT,
  SENSES,
  TABS,
  UNBIDDEN,
  VERBS,
} from './prose.js'
// arts 84, 88, 120: what he still knows, and where a mark lands.
export { CLUES, ECHOES, EVERY_CLUE, EVERY_REFUSAL, KNOWS, REFUSALS, marked } from './marks.js'
export {
  dieLabel,
  intentChip,
  itemLabel,
  endLineFor,
  originOf,
  saysAct,
  saysBound,
  saysClaim,
  saysDoor,
  saysFiring,
  saysLine,
  saysLook,
  saysDeath,
  saysDie,
  saysExchange,
  saysGood,
  saysIntent,
  saysItem,
  saysWithheld,
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
  FIRING,
  INTENT_SAYS,
  LABELS,
  LOOKS,
  NOTICES,
  NOUNS,
  ORIGINS,
  READOUT,
  SENSES,
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
  // card 49: what the last door of the depth says, which is the one door in
  // the game with no region tag to leak.
  'door.last',
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
 * lines the answer and descent waves wrote, and they answer to the amended
 * register from the day they were written rather than from the day the card
 * lands.
 *
 * The descent wave's are a **suffix rule** rather than a list, and that is
 * honest rather than convenient: `.kept`, `.price`, `.knows` and `.again`
 * are keys that did not exist before art. 118 and art. 120, so every string
 * under one of them was written after the register changed. There is no
 * version of the list where somebody has to remember to add a key as well
 * as author a line.
 */
const AMENDED_LOOK_SUFFIXES: readonly string[] = ['.kept', '.price', '.knows', '.again']

/**
 * And the covered font's own three (card 88). The exemplar room is written
 * in the amended voice from the first line — a room later authors are told
 * to read cannot be a room in the repealed register.
 */
const AMENDED_LOOKS: readonly string[] = [
  'font.cloth',
  'font.basin',
  'font.dry',
  // card 90: the six levels, as they lie. Written after the register
  // changed, so judged by it — the placeholder category is a debt with a
  // name and not a category anything new may be written in.
  'whetstone.thing',
  'chain.thing',
  'ring.thing',
  'bowl.thing',
  'notch.thing',
  'zealot.thing',
]

function amendedLook(key: string): boolean {
  return AMENDED_LOOKS.includes(key) || AMENDED_LOOK_SUFFIXES.some((at) => key.endsWith(at))
}

/**
 * card 90: **the origins written in the amended register.** `ORIGINS` is
 * cards 27–29's debt wholesale, exactly as `LOOKS` is; these are the
 * sentences the levels wave wrote, and art. 87's sentence is prose that
 * reaches the player, so a new one has to be judged as prose in the voice
 * the game actually has.
 */
const AMENDED_ORIGINS: readonly string[] = [
  'talisman.whetstone',
  'talisman.chain',
  'talisman.ring',
  'talisman.bowl',
  'talisman.notch',
  'talisman.zealot',
]

function amendedOrigin(key: string): boolean {
  return AMENDED_ORIGINS.includes(key)
}

/**
 * card 88: the rooms whose beats are in the amended voice. The Crossing is
 * the mind wave's; the covered font is this wave's, and it is the exemplar,
 * so it is not allowed to be part of the debt cards 27–28 are clearing.
 */
const AMENDED_ROOMS: readonly string[] = [THE_CROSSING as string, 'room.trove.covered-font']

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
      .filter(([key]) => amendedLook(key) === amended)
      .map(([, said]) => said)
  const originsIn = (amended: boolean): readonly string[] =>
    Object.entries(ORIGINS)
      .filter(([key]) => amendedOrigin(key) === amended)
      .map(([, said]) => said)
  return [
    // The amended register, as far as it has been written. Everything the
    // wave has not reached yet is a declared placeholder below rather than a
    // string the lint was talked into passing.
    ...asThoughts([
      // The waking, in his head. The candle before it is the scrawl, and it
      // is not in `BEATS` at all — the Book lays it down (`RoomBook.scrawl`).
      // card 88: and the covered font's, because the exemplar cannot be
      // written in a register the game has repealed.
      ...AMENDED_ROOMS.flatMap((room) => BEATS[room] ?? []),
      // card 49: **a door's sense**, unparked (art. 31 as amended). Every
      // line of every pool, so the lint sees the one thing in the game that
      // is authored per region and read per door.
      ...Object.values(SENSES).flat(),
      // art. 78: the arrival is one candle like any other, and it is him
      // working out what his own choosing has done.
      ...Object.values(ARRIVALS).flat(),
      ...noticesIn(true),
      ...looksIn(true),
      // card 90: art. 87's sentence, for the goods this wave wrote. The rest
      // of `ORIGINS` is the declared debt below.
      ...originsIn(true),
      // card 69: what a turn did, and the candle before the scrawl. Both are
      // him in live play, so both are thoughts — the `{dealt}` tokens are
      // filled by `saysExchange` and are words like any other to the lint.
      ...Object.values(EXCHANGE),
      // art. 119: a rider gets its own beat, and what it says in it is him
      // watching a bone he chose to spend do the thing it does. Live play,
      // so a thought; the `{n}` is filled by `saysFiring`.
      ...Object.values(FIRING),
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
        .filter(([room]) => !AMENDED_ROOMS.includes(room))
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
      ...originsIn(false),
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
