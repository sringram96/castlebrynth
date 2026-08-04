import type { BondId, Die, DieId, Face, Pouch, RiderId, Value } from '../lots/index.js'

/**
 * art. 55 (amended): the start is bare — six plain bones, no riders, no
 * bonds, no talismans. art. 50: shapes are free, values are law — every face
 * shows a value 1–6, whatever the body.
 */

const id = (s: string): DieId => s as DieId
const rider = (s: string): RiderId => s as RiderId
const bond = (s: string): BondId => s as BondId

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
 * The Orphan — a signature whose 1-face is a second 6: faces {2,3,4,5,6,6}.
 * The exotic distribution is declared on inspect (art. 54), never hidden.
 */
export const THE_ORPHAN: Die = {
  id: id('bone.orphan'),
  body: 6,
  faces: [{ value: 6 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }],
}

/**
 * The Sisters — the demo's bond (`reference/castlebrynth-lots-demo.html`).
 * art. 52: the bond triggers when both are spent in the same claim at equal
 * value; a ghost sister joins, and the pair scores at triple tier on the PAIR
 * line. Carrying both halves in a finite hand is the cost.
 */
export const SISTERS_BOND = bond('bond.sisters')

export const THE_SISTERS: readonly [Die, Die] = [
  { id: id('bone.sister.elder'), body: 6, faces: plainFaces, bond: SISTERS_BOND },
  { id: id('bone.sister.younger'), body: 6, faces: plainFaces, bond: SISTERS_BOND },
]

/**
 * The Leech — the demo's rider. art. 51: it fires only when its face is spent
 * in a claim; kept or unused, the 6 does nothing.
 */
export const LEECH_RIDER = rider('rider.leech')

export const THE_LEECH: Die = {
  id: id('bone.leech'),
  body: 6,
  faces: [
    { value: 1 },
    { value: 2 },
    { value: 3 },
    { value: 4 },
    { value: 5 },
    { value: 6, rider: LEECH_RIDER },
  ],
}
