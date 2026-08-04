import type { Die, DieId, Face, Pouch, Value } from '../lots/index.js'

/**
 * art. 55: v1 ships six plain bones with all four sockets empty and their
 * laws already in force. art. 50: shapes are free, values are law — every
 * face shows a value 1–6, whatever the body.
 */

const id = (s: string): DieId => s as DieId

const plainFaces: readonly Face[] = [1, 2, 3, 4, 5, 6].map((v) => ({ value: v as Value }))

function plainBone(n: number): Die {
  return { id: id(`bone.${n}`), body: 6, faces: plainFaces }
}

/** art. 60: v1 ships a pouch of six plain bones, hand size six. */
export const PLAIN_POUCH: Pouch = {
  dice: [plainBone(1), plainBone(2), plainBone(3), plainBone(4), plainBone(5), plainBone(6)],
}

export const HAND_SIZE = 6

/**
 * The Orphan — the signature of `reference/the-crawling-one-encounter.md`,
 * whose 1-face is a second 6. Declared on inspect (art. 54); the exotic
 * distribution is stated, never hidden.
 */
export const THE_ORPHAN: Die = {
  id: id('bone.orphan'),
  body: 6,
  faces: [{ value: 6 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }],
}

/** The hand the reference encounter is fought with: five plain, one Orphan. */
export const REFERENCE_POUCH: Pouch = {
  dice: [plainBone(1), plainBone(2), plainBone(3), plainBone(4), plainBone(5), THE_ORPHAN],
}
