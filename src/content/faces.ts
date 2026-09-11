/**
 * A carried thing's faces, as chips.
 *
 * `content/rewards.ts` has always stated the law — a card shows *"not a hint,
 * not a category — the faces"* — and what shipped was a sentence **about** the
 * faces. This is the law finished: one derivation, from the die's own table, of
 * the six things it can actually come up with.
 *
 *     Grave Candle     +3  +3  +5  +5  ·  ·
 *     Rustplate         0   0   3   3  5  7
 *     Splinter Fetish  +8  +8   ·   ·  −2 −2
 *
 * Two properties make this worth a module of its own:
 *
 * - **A die added later gets a strip for free.** Nothing below enumerates a
 *   die; every strip is `die.faces` mapped, so a seventh item die is legible
 *   the moment it is authored, and a die whose faces change cannot disagree
 *   with its card. The same rule `HAND_DEFINITIONS` is held to.
 * - **It is pure, and it is not a view.** Chips are data — a kind and a string
 *   — so the tray, the loot card and the inspection all draw the same strip
 *   from one place, and the whole of it is testable without a document.
 *
 * What the prose beside a strip is still for is the two things a strip cannot
 * say: **when the thing fires**, and **whether there is a press**. That is the
 * shape every `rule` in `content/dice.ts` is written to now.
 */

import { scoreName } from '../combat/hands.js'
import {
  CORE_DICE,
  IRON_DICE,
  ITEM_DICE,
  TALISMANS,
  coreDie,
  ironDie,
  itemDie,
  talisman,
} from './dice.js'
import type { CoreDieId, IronDieId, ItemDieId, TalismanId } from './dice.js'

/**
 * One chip of a strip.
 *
 * `kind` is what the thing does, not what colour it is: the stylesheet decides
 * how a cost looks, and it is the only place that decides it. `value` is an
 * ordinary d6 pip count, `block` is iron held off the answer, `flat` is added
 * after the multiply, `cost` is paid in bones, `blank` is a real face and the
 * reason an item die is upside rather than a tax, and `line` is a named hand a
 * talisman answers to.
 */
export type FaceChipKind = 'value' | 'block' | 'flat' | 'blank' | 'cost' | 'line'

export interface FaceChip {
  readonly kind: FaceChipKind
  /** What is printed on it. `·` for a blank — never an empty string. */
  readonly text: string
}

/** What a blank face reads as. A dim pip, never a gap. */
export const BLANK_CHIP = '·'

/** Which table a thing is in. The one discriminant the strips need. */
export type StripFamily = 'core' | 'iron' | 'item' | 'talisman'

export interface StripSubject {
  readonly family: StripFamily
  readonly id: string
}

const coreStrip = (id: CoreDieId): readonly FaceChip[] =>
  coreDie(id).faces.map((face) => ({ kind: 'value', text: String(face) }) as const)

const ironStrip = (id: IronDieId): readonly FaceChip[] =>
  ironDie(id).faces.map((face) => ({ kind: 'block', text: String(face) }) as const)

const itemStrip = (id: ItemDieId): readonly FaceChip[] =>
  itemDie(id).faces.map((face) => {
    if (face.kind === 'flat') return { kind: 'flat', text: `+${face.amount}` } as const
    if (face.kind === 'cost') return { kind: 'cost', text: `−${face.bones}` } as const
    return { kind: 'blank', text: BLANK_CHIP } as const
  })

/**
 * A talisman has no faces, and gets the honest equivalent rather than an
 * invented six: the lines it answers to, and the flat it pays when one of them
 * is the line that was scored.
 */
const talismanStrip = (id: TalismanId): readonly FaceChip[] => {
  const t = talisman(id)
  return [
    ...t.lines.map((line) => ({ kind: 'line', text: scoreName(line) }) as const),
    { kind: 'flat', text: `+${t.bonus}` } as const,
  ]
}

/** The strip for one carried thing, whatever kind of thing it is. */
export function faceStrip(subject: StripSubject): readonly FaceChip[] {
  switch (subject.family) {
    case 'core':
      return coreStrip(subject.id as CoreDieId)
    case 'iron':
      return ironStrip(subject.id as IronDieId)
    case 'item':
      return itemStrip(subject.id as ItemDieId)
    case 'talisman':
      return talismanStrip(subject.id as TalismanId)
  }
}

/**
 * Which table an id is in, if it is in one.
 *
 * The join a card makes: a reward id names a thing, and a thing with faces has
 * a strip. A Vial is in none of these tables and has no faces — it has a press
 * — so it answers `undefined` and its card says its press instead.
 */
export function familyOf(id: string): StripFamily | undefined {
  if (id in CORE_DICE) return 'core'
  if (id in IRON_DICE) return 'iron'
  if (id in ITEM_DICE) return 'item'
  if (id in TALISMANS) return 'talisman'
  return undefined
}

/** The strip for anything that has one, by id alone. */
export function stripFor(id: string): readonly FaceChip[] | undefined {
  const family = familyOf(id)
  return family ? faceStrip({ family, id }) : undefined
}

/**
 * One carried thing, whichever table it is in.
 *
 * The four tables have the same three fields on purpose, and this is the one
 * place they are read as one kind of thing: a card, a slot inspection and the
 * name over a pop all ask this rather than switching on a family of their own.
 */
export interface CarriedThing {
  readonly id: string
  readonly name: string
  readonly rule: string
  readonly flavour?: string
}

export function carried(id: string): CarriedThing | undefined {
  switch (familyOf(id)) {
    case 'core':
      return CORE_DICE[id as CoreDieId]
    case 'iron':
      return IRON_DICE[id as IronDieId]
    case 'item':
      return ITEM_DICE[id as ItemDieId]
    case 'talisman':
      return TALISMANS[id as TalismanId]
    default:
      return undefined
  }
}

/** What it is called, for a pop that carries its own cause. */
export function carriedName(id: string): string {
  return carried(id)?.name ?? id
}

/**
 * The strip, said out loud.
 *
 * Chips are a picture, and a picture is not a statement — so every place that
 * draws a strip also carries it in the accessible name, with a blank named
 * rather than drawn as a dot nobody can hear.
 */
export function stripSaid(id: string): string {
  const chips = stripFor(id)
  if (!chips) return ''
  return chips.map((chip) => (chip.kind === 'blank' ? 'blank' : chip.text)).join(', ')
}
