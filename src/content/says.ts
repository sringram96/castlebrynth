/**
 * The declared truths (arts 54, 68, 73).
 *
 * A tap investigates, and what it gets back is what the thing declares about
 * itself: a die's faces, what it is showing, which line it is spent in; an
 * intent's number and what that number does to the plan. None of it is
 * prose — it is a name from `prose.ts` and a number from the engine, joined.
 * The words are all in `prose.ts` and all linted there; nothing new is said
 * here.
 */

import type { Die, Face, Good, Intent, Line } from '../lots/index.js'
import type { ItemId } from '../state/index.js'
import { LADDER } from './ladder.js'
import { INTENT_SAYS, LABELS, LOOKS, ORIGINS, READOUT } from './prose.js'

/** Which name a die answers to. Shapes are free; the names are authored. */
export function dieLabel(die: Die): string {
  const id = die.id as string
  if (id.startsWith('bone.sister')) return LABELS['die.sisters'] ?? id
  if (id === 'bone.orphan') return LABELS['die.orphan'] ?? id
  if (id === 'bone.leech') return LABELS['die.leech'] ?? id
  if (id === 'bone.pusher') return LABELS['die.pusher'] ?? id
  if (id === 'bone.careful') return LABELS['die.careful'] ?? id
  if (id === 'bone.runner') return LABELS['die.runner'] ?? id
  return LABELS['die.plain'] ?? id
}

/**
 * art. 87: the one sentence that makes a good an item rather than a stat
 * block. Empty for the plain bones, which came off nobody.
 */
export function originOf(good: Good): string {
  return ORIGINS[good.id as string] ?? ''
}

/**
 * art. 68: a possession's answer is its declared truth. In the pouch that is
 * its faces; on the table it is the face it shows, the rider on that face,
 * and the claim it has already been spent in (art. 45).
 *
 * art. 87: and in the pouch it is also where the die came from. The origin
 * rides with the numbers rather than behind another tap, because the whole
 * claim of the article is that the two explain each other.
 */
export function saysDie(die: Die, showing?: Face, spentIn?: Line): string {
  const parts: string[] = [dieLabel(die)]
  if (showing === undefined) {
    parts.push(`${READOUT.faces} ${die.faces.map((face) => face.value).join(' ')}`)
    const origin = originOf(die)
    if (origin !== '') parts.push(origin)
  } else {
    parts.push(`${READOUT.showing} ${showing.value}`)
    if (showing.rider !== undefined) {
      parts.push(LABELS[showing.rider as string] ?? (showing.rider as string))
    }
  }
  if (spentIn !== undefined) parts.push(`${READOUT.spent} ${LADDER[spentIn].name}`)
  return parts.join(' · ')
}

/**
 * art. 65 (`bind`), and art. 69: a die taken out of your hand still answers,
 * and what it answers with is who took it. Silence is a bug, and a die that
 * is simply missing from the tray without saying why is worse than silence.
 */
export function saysBound(die: Die, horror: string): string {
  return `${dieLabel(die)} · ${READOUT.bound} ${LABELS[horror] ?? horror}`
}

/** The chip an intent wears: a declared verb and a number (art. 58). */
export function intentChip(intent: Intent): string {
  return `${intent.verb} ${intent.amount}`
}

/** art. 73: the intent is tappable, and explains its effect in plain words. */
export function saysIntent(intent: Intent): string {
  return INTENT_SAYS[intent.verb] ?? intentChip(intent)
}

/** What a claimed line is worth, as a readout: the name and the number. */
export function saysClaim(line: Line, harm: number): string {
  return `${LADDER[line].name} ${harm}`
}

/** Which thing in the world a carried item is, so it answers the same way. */
const CARRIED: Readonly<Record<string, string>> = { 'key.warden': 'alcove.key' }

/** art. 68: a thing you carry answers the same way a thing on the floor does. */
export function saysItem(item: ItemId): string {
  const id = item as string
  const was = CARRIED[id]
  return (was === undefined ? undefined : LOOKS[was]) ?? LABELS[id] ?? id
}

/** The name a carried thing wears in the pouch (art. 67). */
export function itemLabel(item: ItemId): string {
  const id = item as string
  return LABELS[id] ?? id
}

/**
 * arts 54, 87: what a good that is not a die declares — its name, then the
 * sentence that says where its rules come from. Talismans and wearables
 * answer the same way a die does, because a tap is a tap (art. 68).
 */
export function saysGood(good: Good): string {
  const label = LABELS[good.id as string] ?? (good.id as string)
  const origin = originOf(good)
  return origin === '' ? label : `${label} · ${origin}`
}
