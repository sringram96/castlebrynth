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

import type { Door, InstanceId } from '../gen/index.js'
import type { Beat, Die, Face, Good, Intent, Line, Resolution } from '../lots/index.js'
import type { ItemId } from '../state/index.js'
import { LEVEL_CAP } from './items.js'
import { LADDER } from './ladder.js'
import { endLineOf } from './horrors.js'
import { ECHOES, marked } from './marks.js'
import {
  DEATHS,
  END_LINES,
  EXCHANGE,
  FIRING,
  INTENT_SAYS,
  LABELS,
  LOOKS,
  NOTICES,
  ORIGINS,
  READOUT,
  SENSES,
} from './prose.js'

// ── The doors speak (card 49, arts 31, 77) ─────────────────────────────

/**
 * A door's sense: **its region tag, leaking.**
 *
 * Which of the pool's lines this door gives is hashed off the door's own
 * identity — the instance it stands in and which door of that room it is —
 * so it is a function of the same two facts art. 82 already keys the world
 * on. Two consequences, and both are the point: a door says the same thing
 * every time it is tapped and every time it is come back to, and a
 * crossroads offering three doors tagged the same way still gives three
 * different sentences rather than the same one three times.
 *
 * Nothing about the road not taken is computed to produce one (art. 79). The
 * tag was dealt with the door; this only reads it.
 *
 * The last door of the depth has no tag to leak — there is nothing left to
 * lean toward (art. 37) — so it answers with what it is instead.
 */
export function saysDoor(door: Door, instance: InstanceId): string {
  if (door.ends === true) return NOTICES['door.last'] ?? NOTICES['door.blind'] ?? ''
  const pool = SENSES[(door.region as string | null) ?? '']
  if (pool === undefined || pool.length === 0) return NOTICES['door.blind'] ?? ''
  return pool[hashOf(`${instance as string}→${door.at}`) % pool.length] ?? pool[0] ?? ''
}

/**
 * A small deterministic hash — the same shape the world clock's phase offset
 * uses (art. 109), for the same reason: a choice that has to be identical on
 * every visit cannot be made by a lot that has already been spent.
 */
function hashOf(key: string): number {
  let held = 2166136261
  for (let i = 0; i < key.length; i++) {
    held ^= key.charCodeAt(i)
    held = Math.imul(held, 16777619)
  }
  return Math.abs(held)
}

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
 *
 * art. 84 (extended, card 87): **and it may say that you have been offered
 * one of these before.** The die you refused turns up in another traveler's
 * hand, and what changes is the sentence rather than the die — art. 87's
 * machinery needed a sentence and not a system, which is the whole reason
 * this is a second key in `ORIGINS` and not a field on `Good`.
 */
export function originOf(good: Good, remembered: readonly string[] = []): string {
  const id = good.id as string
  const again = ORIGINS[`${id}.again`]
  if (again !== undefined && marked(ECHOES, `${id}.origin`, remembered)) return again
  return ORIGINS[id] ?? ''
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
export function saysDie(
  die: Die,
  showing?: Face,
  spentIn?: Line,
  remembered: readonly string[] = [],
): string {
  const parts: string[] = [dieLabel(die)]
  if (showing === undefined) {
    parts.push(`${READOUT.faces} ${die.faces.map((face) => face.value).join(' ')}`)
    const origin = originOf(die, remembered)
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

/**
 * art. 73: the intent is tappable, and explains itself in plain words.
 *
 * card 71: **both halves, and the numbers are the intent's own.** Half of
 * these used to describe an effect and never the damage beside it, and the
 * other half described nothing at all. Filling from the intent rather than
 * writing the number into the sentence is also what stops COVET claiming to
 * eat sixes in the one script where it eats fives — the same line, told the
 * truth twice.
 */
export function saysIntent(intent: Intent): string {
  const said = INTENT_SAYS[intent.verb]
  if (said === undefined) return intentChip(intent)
  const effect = intent.effect
  return fill(said, {
    n: intent.amount,
    v: effect?.kind === 'curse' ? effect.value : 0,
    t: effect?.kind === 'bleed' ? effect.turns : 0,
    f: effect?.kind === 'hunger' ? effect.amount : 0,
  })
}

/** What a claimed line is worth, as a readout: the name and the number. */
export function saysClaim(line: Line, harm: number): string {
  return `${LADDER[line].name} ${harm}`
}

/**
 * arts 63, 65, 72: **the line these dice make, and what is holding it
 * shut.** A readout in the card's own register — the line's name, and the
 * two words that say why it is not on the strip.
 *
 * It names the line the player is looking at rather than the floor they are
 * being offered, because that is the fact they are missing: the dice are a
 * full house, the game knows it, and the reason it is scoring them as loose
 * dice is a seal that lifts next turn or a line already burned off the card.
 * Art. 42's promise is that a turn can be planned; a shape silently worth
 * nothing is the one thing that cannot be.
 */
export function saysWithheld(line: Line, why: 'spent' | 'sealed'): string {
  const said = NOTICES[why === 'sealed' ? 'claim.sealed' : 'claim.spent'] ?? ''
  return `${LADDER[line].name} · ${said}`
}

/**
 * art. 119: **the line names itself, with its multiplier.**
 *
 * A readout and not prose — a name and a number, in the tray with art. 57's
 * other numbers. The multiplier is the interesting half: it is what the
 * total is about to climb by, and naming it a beat before the climb is what
 * makes the climb read as an answer rather than as a number changing.
 *
 * The tier is handed in rather than looked up, because a talisman may have
 * moved it (art. 53) and the ladder's own entry would then be a lie.
 */
export function saysLine(line: Line, multiplier: number): string {
  return `${LADDER[line].name} ×${multiplier}`
}

/**
 * art. 119: **what a rider says in the moment it fires.**
 *
 * Keyed on the rider first and on what it does second, so a good that ships
 * without a line of its own still says something (art. 69: silence is a
 * bug) and a good that has one says the thing that teaches it. The words
 * are `prose.ts`'s and linted there; this puts the rider's own number in
 * one, exactly as `saysIntent` does for an intent.
 */
export function saysFiring(beat: Beat): string {
  if (beat.kind === 'bond') return FIRING.bond ?? ''
  if (beat.kind !== 'rider') return ''
  const said = FIRING[beat.rider as string] ?? FIRING[beat.effect.kind] ?? ''
  return fill(said, { n: beat.effect.amount })
}

/**
 * card 69: **what an act answers with.** art. 70 asks prose to confirm what
 * an act did, and the shell had one authored line for one act — so every
 * other press fell through to the candle underneath, which is the candle
 * describing the thing that had just been picked up.
 *
 * Keyed on the act's own id, because that is already the key art. 66 looks
 * its verb up by: one lookup, one place to author, and no field on `Act` for
 * content to forget to fill in. `test/answers.test.ts` enumerates the
 * catalog and fails on an act that has no line, so this can never quietly
 * return nothing again.
 */
export function saysAct(id: string): string {
  return NOTICES[`answer.${id}`] ?? ''
}

/**
 * card 69: **what the turn did**, both halves, in one line.
 *
 * The shape is chosen by what actually happened rather than by which numbers
 * are non-zero, and the distinction that earns its keep is `blocked`: armour
 * eating a blow is a different beat from nothing having been thrown, and a
 * player who cannot tell them apart cannot tell whether the armour is doing
 * anything. The cost face is said in the same breath (arts 54, 86) — it is a
 * price he chose, so it belongs in the sentence and not in a readout.
 *
 * The words are `prose.ts`'s and are linted there. All this does is pick one
 * and put the engine's numbers in it.
 */
export function saysExchange(resolution: Resolution): string {
  const dealt = Math.max(0, resolution.harmDealt)
  const taken = Math.max(0, resolution.harmTaken)
  const shape =
    dealt > 0 && taken > 0
      ? 'both'
      : dealt > 0
        ? resolution.blocked > 0
          ? 'blocked'
          : 'dealt'
        : taken > 0
          ? 'taken'
          : 'nothing'
  const parts = [fill(EXCHANGE[shape] ?? '', { dealt, taken, hurt: resolution.hurt })]
  if (resolution.hurt > 0) parts.push(fill(EXCHANGE.cost ?? '', { hurt: resolution.hurt }))
  if (resolution.healed > 0) parts.push(EXCHANGE.healed ?? '')
  return parts.filter((said) => said !== '').join(' ')
}

function fill(said: string, numbers: Readonly<Record<string, number>>): string {
  return said.replace(/\{(\w+)\}/g, (whole, key: string) => String(numbers[key] ?? whole))
}

/**
 * card 69: **which line the Book takes, keyed on the blow that landed.**
 *
 * A scrawl keyed on the horror teaches the wrong turn: a run killed by the
 * Gnawing's CORRODE was told to count to the fifth intent, which is a note
 * about a thing that did not happen. An intent kind means the same thing
 * wherever it appears, so its lesson is true of every horror carrying it.
 *
 * `verb` empty — a cost face, a bleed still ticking, a door that never
 * opened — falls back to the horror's own line, because there is no blow to
 * name and a wrong name is worse than a general one.
 */
export function endLineFor(verb: string, horror: string): string {
  const byBlow = `end.${verb.toLowerCase()}`
  return verb !== '' && END_LINES[byBlow] !== undefined ? byBlow : endLineOf(horror)
}

/**
 * card 69: the candle before the scrawl — him, having it. Death was not an
 * event: the run ended and the next thing on screen was the following run's
 * Crossing with the health bar full. Every killing blow falls to one line,
 * because the specificity belongs in the scrawl, where the lesson is.
 */
export function saysDeath(cause: string): string {
  return DEATHS[cause] ?? DEATHS['end.death'] ?? ''
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
export function saysGood(good: Good, remembered: readonly string[] = []): string {
  const label = LABELS[good.id as string] ?? (good.id as string)
  const origin = originOf(good, remembered)
  return [label, ...declaredBy(good), origin].filter((part) => part !== '').join(' · ')
}

/**
 * art. 54, card 90: **what a good that is not a die declares.**
 *
 * A talisman used to answer with a name and a sentence and no numbers at
 * all, which was survivable while every talisman in the game was an unplaced
 * fixture and is not survivable the moment one of them is the difference
 * between a line at ×4 and a line at ×5. Card 72's declaration duty applies
 * from birth: a power the player cannot read is a power they cannot price.
 *
 * It is a **readout**, not prose — the line's own name and a signed number,
 * in the same register as the tray's other numbers (art. 57). The words are
 * `prose.ts`'s and linted there; the numbers are the good's own, so a
 * talisman that is retuned cannot drift off its own description.
 *
 * The cap rides on the sharpening because art. 53 as the levels wave uses it
 * caps the lift and not the net, and a player holding two levels for one
 * line needs to know that the second one stopped counting.
 */
function declaredBy(good: Good): readonly string[] {
  if (!('species' in good)) {
    return 'armor' in good ? [`${READOUT.armor} ${good.armor}`] : []
  }
  const said: string[] = []
  const rung = (line: Line): string => LADDER[line].name
  if (good.species === 'ladder' && good.ladder !== undefined) {
    const { tiers, lines, dulls } = good.ladder
    if (lines !== undefined && lines.length > 0) {
      said.push(`${READOUT.sharpens} ${lines.map(rung).join(', ')} +${tiers}`)
    }
    if (dulls !== undefined && dulls.length > 0) {
      said.push(`${READOUT.dulls} ${dulls.map(rung).join(', ')} −${tiers}`)
    }
    said.push(`${READOUT.cap} +${LEVEL_CAP}`)
  }
  if (good.species === 'value' && good.value !== undefined) {
    said.push(`${good.value.of} ×${good.value.times}`)
  }
  if (good.species === 'shape' && good.shape !== undefined) {
    said.push(`${READOUT.everyDie} ×${good.shape.times}`)
  }
  return said
}

/**
 * art. 120: the price, put into the sentence that carries it.
 *
 * The look is authored with `{n}` in it and the number arrives from the act,
 * exactly as art. 42's intent lines fill from the intent — so no sentence
 * can drift off what a press actually charges, and a price that changed
 * would change the words with it.
 */
export function saysLook(said: string, price: number): string {
  return price <= 0 ? said : fill(said, { n: price })
}
