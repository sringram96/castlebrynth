/**
 * The small pieces every view is built from.
 *
 * One rule runs through all of it: **a verb is a `<button>`**. Not a div with
 * a handler, not an image with a hit area, not a container that happens to be
 * clickable. If it can be pressed it is a button, it has an accessible name,
 * and it carries a `data-act` so a browser test can find it by intent rather
 * than by position.
 *
 * ## Every number is readable as text
 *
 * A bone's value is in its accessible name and in a `data-value`, always, and
 * a special's type is part of that name — `Knuckle, rolled 8`. The pips are
 * the picture; they are not the only statement of the number. A seven and an
 * eight exist now, and neither of them has a conventional pip arrangement a
 * player already knows, so relying on the drawing alone would be relying on a
 * convention the game just invented.
 */

import type { Point, Rect } from '../content/tray.js'
import { TRAY } from '../content/tray.js'
import type { BoneProfileId, SpecialBone, SpecialBoneInstance } from '../content/bones.js'
import { boneProfile, specialBone } from '../content/bones.js'
import type { Reward } from '../content/rewards.js'

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Place a node on the tray, in the tray's own fractions. */
export function place(node: HTMLElement, rect: Rect): void {
  node.style.left = `${rect.x * 100}%`
  node.style.top = `${rect.y * 100}%`
  node.style.width = `${rect.width * 100}%`
  node.style.height = `${rect.height * 100}%`
}

/**
 * Seat a control on a bay's centre, at the touch floor.
 *
 * This is the separation the tray needs and did not have: **a target's size is
 * not the painted object's size.** The width is given in the plate's own
 * fractions, so the row of six scales with the picture and cannot start
 * overlapping; the height is a flat 44 px, because the painted bays are far
 * shallower than a thumb and growing them in fractions would only make the
 * overhang scale too. The visible thing inside is sized by CSS to sit in the
 * bay.
 *
 * `transform` is deliberately left alone — the fielded lift and the throw
 * animation own it, and a placement that spent it would have to fight them.
 */
export function seat(node: HTMLElement, centre: Point, width: number): void {
  node.style.left = `${(centre.x - width / 2) * 100}%`
  node.style.width = `${width * 100}%`
  node.style.height = `${TRAY.minTouch}px`
  node.style.top = `calc(${centre.y * 100}% - ${TRAY.minTouch / 2}px)`
}

/**
 * Seat a bed's control: the bay's own width, grown to the touch floor and
 * centred on it, so the overhang is even top and bottom.
 */
export function seatBed(node: HTMLElement, bed: Rect): void {
  node.style.left = `${bed.x * 100}%`
  node.style.width = `${bed.width * 100}%`
  node.style.height = `${TRAY.minTouch}px`
  node.style.top = `calc(${(bed.y + bed.height / 2) * 100}% - ${TRAY.minTouch / 2}px)`
}

export interface ButtonSpec {
  /** The dispatch name. Browser tests select on this. */
  readonly act: string
  readonly label: string
  /** Accessible name, when the visible label is not enough on its own. */
  readonly describe?: string
  readonly onPress: () => void
  readonly className?: string
}

export function button(spec: ButtonSpec): HTMLButtonElement {
  const b = el('button', spec.className ?? 'act')
  b.type = 'button'
  b.dataset['act'] = spec.act
  b.textContent = spec.label
  b.setAttribute('aria-label', spec.describe ?? spec.label)
  b.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    spec.onPress()
  })
  return b
}

/**
 * The pips of one face, so a bone reads as a bone and not as a number.
 *
 * One through six are the arrangements everybody already knows. Seven and
 * eight are not — no die anybody has held has them — so they are drawn as a
 * six with one and two extra pips down the middle, and the numeral is printed
 * on the face alongside. The rule in `docs/ART_DIRECTION.md` is that a seven
 * and an eight must be readable at arm's length without a tooltip, and a
 * pattern nobody can count at a glance is not readable.
 */
const PIPS: Readonly<Record<number, readonly [number, number][]>> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
  7: [
    [0, 0],
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
  8: [
    [0, 0],
    [1, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
}

/** Which material a profile is drawn in, so the four are told apart. */
const MATERIAL: Readonly<Record<BoneProfileId, string>> = {
  common: 'bone',
  wrong: 'pale',
  cruel: 'ash',
  heavy: 'iron',
}

export function materialOf(profile: BoneProfileId): string {
  return MATERIAL[profile] ?? 'bone'
}

/**
 * One face of one bone.
 *
 * The value is on the element as data *and* as a numeral, because a seven has
 * no arrangement a player recognises and an eight has none either. The numeral
 * is the truth; the pips are the texture.
 */
export function boneFace(profile: BoneProfileId, value: number): HTMLElement {
  const box = el('span', `bone-face bone-${materialOf(profile)}`)
  box.dataset['value'] = String(value)
  box.dataset['profile'] = profile
  for (const [gx, gy] of PIPS[value] ?? []) {
    const pip = el('i', 'pip')
    pip.style.left = `${12 + gx * 32}%`
    pip.style.top = `${12 + gy * 32}%`
    box.append(pip)
  }
  // Above six there is no arrangement anybody knows, so the number is printed.
  if (value > 6) box.append(el('b', 'bone-numeral', String(value)))
  return box
}

/** A bone with its back to you: fielded, committed, and not yet thrown. */
export function boneBack(profile: BoneProfileId): HTMLElement {
  const box = el('span', `bone-face bone-back bone-${materialOf(profile)}`)
  box.dataset['profile'] = profile
  return box
}

export interface BoneViewState {
  readonly boneKey: string
  readonly profile: BoneProfileId
  /** Absent before the throw: a committed bone with its back showing. */
  readonly value?: number
  /** Set when it is a named bone, so the name can be in the accessible one. */
  readonly specialId?: string
  readonly broken?: boolean
  readonly safe?: boolean
  /** The lane it is standing in, so the DOM order is the visible order. */
  readonly lane: number
}

function boneName(view: BoneViewState): string {
  const named = view.specialId ? specialBone(view.specialId).name : 'Bone'
  const shown = view.value === undefined ? 'face down' : `rolled ${view.value}`
  const state = view.broken ? ', broken' : view.safe ? ', safe' : ''
  return `${named}, ${shown}${state}`
}

/**
 * One bone in a line, as a button.
 *
 * It is a button in every phase, because in `rolled` with a Charm armed it is
 * a target, and a control that becomes pressable only sometimes is a control
 * whose size and position must not change when it does. When there is nothing
 * to do with it, pressing it inspects it — the same rule the old crown had.
 */
export function boneButton(
  view: BoneViewState,
  spec: { readonly act: string; readonly describe?: string; readonly onPress: () => void },
): HTMLButtonElement {
  const b = button({
    act: spec.act,
    label: '',
    describe: spec.describe ?? boneName(view),
    onPress: spec.onPress,
    className: 'bone',
  })
  b.dataset['boneKey'] = view.boneKey
  b.dataset['profile'] = view.profile
  b.dataset['lane'] = String(view.lane)
  if (view.value !== undefined) b.dataset['value'] = String(view.value)
  if (view.specialId) b.dataset['specialId'] = view.specialId
  if (view.broken) b.dataset['broken'] = 'yes'
  if (view.safe) b.dataset['safe'] = 'yes'
  b.append(view.value === undefined ? boneBack(view.profile) : boneFace(view.profile, view.value))
  return b
}

/**
 * A bone's whole truth, in the one layout every bone inspection uses.
 *
 * Six faces in order and one literal sentence. That is the entire card,
 * because that is the entire bone.
 */
export function boneCard(bone: SpecialBone, count = 1): HTMLElement {
  const card = el('article', 'card bone-card')
  card.dataset['boneId'] = bone.id
  const head = el('h3', 'card-name', bone.name)
  if (count > 1) head.append(el('span', 'card-count', `×${count}`))
  card.append(head)

  const faces = el('div', 'card-faces')
  for (const value of boneProfile(bone.profile).faces) faces.append(boneFace(bone.profile, value))
  card.append(faces)

  card.append(el('p', 'card-rule', `FACES · ${bone.rule}`))
  if (bone.flavour) {
    card.append(el('hr', 'card-rule-line'))
    card.append(el('p', 'card-flavour', bone.flavour))
  }
  return card
}

/** The common bone's card. It has no name, so the pile is its subject. */
export function commonCard(count: number): HTMLElement {
  const card = el('article', 'card bone-card')
  card.dataset['boneId'] = 'common'
  const head = el('h3', 'card-name', 'Common bones')
  head.append(el('span', 'card-count', `×${count}`))
  card.append(head)
  const faces = el('div', 'card-faces')
  for (const value of boneProfile('common').faces) faces.append(boneFace('common', value))
  card.append(faces)
  card.append(el('p', 'card-rule', `FACES · ${boneProfile('common').rule}`))
  return card
}

/** One carried utility, as its own card. Exact mechanic, then flavour. */
export function rewardCard(r: Reward, count?: number): HTMLElement {
  const card = el('article', `card reward-card reward-${r.kind}`)
  card.dataset['rewardId'] = r.id
  const head = el('h3', 'card-name', r.name)
  if (count !== undefined && count > 1) head.append(el('span', 'card-count', `×${count}`))
  card.append(head)
  if (r.kind === 'bone') {
    const faces = el('div', 'card-faces')
    const bone = specialBone(r.id)
    for (const value of boneProfile(bone.profile).faces) faces.append(boneFace(bone.profile, value))
    card.append(faces)
  }
  card.append(el('p', 'card-rule', `EFFECT · ${r.rule}`))
  if (r.flavour) {
    card.append(el('hr', 'card-rule-line'))
    card.append(el('p', 'card-flavour', r.flavour))
  }
  return card
}

/**
 * One living special in the pouch.
 *
 * Grouped by type in the copy, and *not* grouped in identity: each instance is
 * its own row with its own instance id, because fielding one and losing one
 * are both about a particular object.
 */
export function pouchRow(
  instance: SpecialBoneInstance,
  view: { readonly fieldable: boolean; readonly fielded: boolean; readonly onPress: () => void },
): HTMLElement {
  const bone = specialBone(instance.specialId)
  const row = el('div', 'pouch-row')
  row.dataset['instanceId'] = instance.instanceId
  row.dataset['fielded'] = view.fielded ? 'yes' : 'no'

  const faces = el('div', 'card-faces')
  for (const value of boneProfile(bone.profile).faces) faces.append(boneFace(bone.profile, value))

  const text = el('div', 'pouch-text')
  text.append(el('h3', 'card-name', bone.name))
  text.append(el('p', 'card-rule', bone.rule))

  row.append(faces, text)

  if (view.fieldable || view.fielded) {
    const b = button({
      act: view.fielded ? 'unfield' : 'field-bone',
      label: view.fielded ? 'FIELDED' : 'FIELD',
      describe: view.fielded
        ? `Take ${bone.name} out of the line`
        : `Put ${bone.name} in the line`,
      onPress: view.onPress,
      className: `act act-pouch${view.fielded ? ' act-on' : ''}`,
    })
    b.dataset['instanceId'] = instance.instanceId
    b.setAttribute('aria-pressed', view.fielded ? 'true' : 'false')
    row.append(b)
  }
  return row
}
