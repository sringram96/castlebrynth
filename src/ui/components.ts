/**
 * The small pieces every view is built from.
 *
 * One rule runs through all of it: **a verb is a `<button>`**. Not a div with
 * a handler, not an image with a hit area, not a container that happens to be
 * clickable. If it can be pressed it is a button, it has an accessible name,
 * and it carries a `data-act` so a browser test can find it by intent rather
 * than by position.
 */

import type { Rect } from '../content/tray.js'
import type { Die, Face } from '../content/dice.js'
import { die as dieById } from '../content/dice.js'
import type { Relic } from '../content/relics.js'

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

/** The pips of one face, so a die reads as a die and not as a number. */
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

export function faceGlyph(face: Face, material: Die['material']): HTMLElement {
  const box = el('span', `die-face die-${material}`)
  box.dataset['value'] = String(face.value)
  for (const [gx, gy] of PIPS[face.value] ?? []) {
    const pip = el('i', 'pip')
    pip.style.left = `${12 + gx * 32}%`
    pip.style.top = `${12 + gy * 32}%`
    box.append(pip)
  }
  if (face.effect) {
    const mark = el('b', `mark mark-${face.effect.kind}`)
    // The mark says what it costs directly on the face. A player should never
    // have to open anything to learn that a die can hurt them.
    mark.textContent = face.effect.kind === 'hurt' ? `−${face.effect.amount}` : `+${face.effect.amount}`
    box.append(mark)
  }
  return box
}

export interface DieViewState {
  readonly slot: number
  readonly dieId: string
  readonly face: Face
  /** Chosen: kept across the reroll, and part of the hand you score. */
  readonly selected: boolean
}

/**
 * One die on the table.
 *
 * Chosen and idle are unmistakably different and pressing again undoes it.
 * The button is the touch target; the painted die inside it may be smaller.
 */
export function dieButton(state: DieViewState, onPress: (slot: number) => void): HTMLButtonElement {
  const d = dieById(state.dieId)
  const b = button({
    act: 'die',
    label: '',
    describe: `${d.name}, showing ${state.face.value}${state.selected ? ', chosen' : ''}`,
    onPress: () => onPress(state.slot),
    className: 'die',
  })
  b.dataset['slot'] = String(state.slot)
  b.dataset['dieId'] = state.dieId
  b.dataset['value'] = String(state.face.value)
  b.dataset['selected'] = state.selected ? 'yes' : 'no'
  b.setAttribute('aria-pressed', state.selected ? 'true' : 'false')
  b.append(faceGlyph(state.face, d.material))
  return b
}

/** A die's whole truth, in the one layout every die inspection uses. */
export function dieCard(d: Die): HTMLElement {
  const card = el('article', 'card die-card')
  card.dataset['dieId'] = d.id
  card.append(el('h3', 'card-name', d.name))

  const faces = el('div', 'card-faces')
  for (const face of d.faces) faces.append(faceGlyph(face, d.material))
  card.append(faces)

  card.append(el('p', 'card-rule', d.rule))
  card.append(el('p', 'card-good', `GOOD WITH · ${d.goodWith}`))
  if (d.flavour) {
    card.append(el('hr', 'card-rule-line'))
    card.append(el('p', 'card-flavour', d.flavour))
  }
  return card
}

export function relicCard(r: Relic): HTMLElement {
  const card = el('article', 'card relic-card')
  card.dataset['relicId'] = r.id
  const head = el('h3', 'card-name')
  head.append(el('span', 'relic-icon', r.icon), document.createTextNode(r.name))
  card.append(head)
  card.append(el('p', 'card-rule', r.rule))
  card.append(el('p', 'card-good', `BUILD · ${r.buildHint}`))
  return card
}
