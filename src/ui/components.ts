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
 * A die's value is in its accessible name and in a `data-value`, always, and
 * so is whether it is held — `Die 3, showing 6, held`. The pips are the
 * picture; they are not the only statement of the number, and the hold state
 * is not colour alone.
 */

import type { Point, Rect } from '../content/tray.js'
import { TRAY } from '../content/tray.js'
import type { DieValue } from '../combat/roll.js'
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
 * `transform` is deliberately left alone — the held lift and the throw
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
 * One through six, and there is no seventh: a bone is an ordinary d6 in this
 * baseline, so every face is an arrangement everybody already knows and the
 * numeral that used to print above six has nothing left to explain.
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
}

/** One face of one bone. The value is data as well as pips. */
export function dieFace(value: DieValue): HTMLElement {
  const box = el('span', 'bone-face')
  box.dataset['value'] = String(value)
  for (const [gx, gy] of PIPS[value] ?? []) {
    const pip = el('i', 'pip')
    pip.style.left = `${12 + gx * 32}%`
    pip.style.top = `${12 + gy * 32}%`
    box.append(pip)
  }
  return box
}

/**
 * A bone that has not been thrown yet.
 *
 * The one moment it is used is before the initial ROLL, where the crown shows
 * *how many bones this attack has* and no face has been decided. It has to be
 * unmistakably not a face: no pips, and a mark rather than a number.
 */
export function dieBack(): HTMLElement {
  return el('span', 'bone-face bone-back')
}

export interface DieViewState {
  /** Its position in the roll. Stable across a reroll: a held six stays put. */
  readonly index: number
  /** Absent before the initial roll. */
  readonly value?: DieValue
  readonly held?: boolean
}

function dieName(view: DieViewState): string {
  const place = `Die ${view.index + 1}`
  if (view.value === undefined) return `${place}, not thrown yet`
  return `${place}, showing ${view.value}, ${view.held ? 'held' : 'not held'}`
}

/**
 * One bone of the attack, as a button.
 *
 * It is a button in every position of the attack, because in the two positions
 * that still have a reroll it toggles HOLD — and a control that becomes
 * pressable only sometimes is a control whose size and position must not
 * change when it does. When there is nothing left to throw, pressing it
 * inspects it instead.
 */
export function dieButton(
  view: DieViewState,
  spec: { readonly act: string; readonly describe?: string; readonly onPress: () => void },
): HTMLButtonElement {
  const b = button({
    act: spec.act,
    label: '',
    describe: spec.describe ?? dieName(view),
    onPress: spec.onPress,
    className: 'bone',
  })
  b.dataset['index'] = String(view.index)
  if (view.value !== undefined) b.dataset['value'] = String(view.value)
  b.dataset['held'] = view.held ? 'yes' : 'no'
  if (spec.act === 'hold') b.setAttribute('aria-pressed', view.held ? 'true' : 'false')
  b.append(view.value === undefined ? dieBack() : dieFace(view.value))
  return b
}

/** One carried utility, as its own card. Exact mechanic, then flavour. */
export function rewardCard(r: Reward, count?: number): HTMLElement {
  const card = el('article', `card reward-card reward-${r.kind}`)
  card.dataset['rewardId'] = r.id
  const head = el('h3', 'card-name', r.name)
  if (count !== undefined && count > 1) head.append(el('span', 'card-count', `×${count}`))
  card.append(head)
  card.append(el('p', 'card-rule', `EFFECT · ${r.rule}`))
  if (r.flavour) {
    card.append(el('hr', 'card-rule-line'))
    card.append(el('p', 'card-flavour', r.flavour))
  }
  return card
}
