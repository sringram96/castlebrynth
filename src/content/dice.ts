import type { BondId, Die, DieId, Face, Pouch, RiderId, Value } from '../lots/index.js'

/**
 * art. 55 (amended 2026-08-05): the start is bare — **five** plain bones, no
 * riders, no bonds, no talismans. art. 50: shapes are free, values are law —
 * every face shows a value 1–6, whatever the body.
 *
 * art. 86: every die past the bare five belonged to someone who came down
 * here and did not come back. Those live in `travelers.ts`, beside the
 * people they came off; nothing in this file has an owner.
 */

const id = (s: string): DieId => s as DieId
const rider = (s: string): RiderId => s as RiderId
const bond = (s: string): BondId => s as BondId

const plainFaces: readonly Face[] = [1, 2, 3, 4, 5, 6].map((v) => ({ value: v as Value }))

function plainBone(n: number): Die {
  return { id: id(`bone.${n}`), body: 6, faces: plainFaces }
}

/** art. 54: the bone every other die is audited against. */
export const PLAIN_BONE: Die = plainBone(0)

/**
 * arts 55, 60: v1 ships a pouch of five plain bones against a hand size of
 * six. The pouch is one short of the hand on purpose — the empty slot is
 * visible from the first waking, and art. 56 makes the first traveler's die
 * the thing that fills it.
 */
export const PLAIN_POUCH: Pouch = {
  dice: [plainBone(1), plainBone(2), plainBone(3), plainBone(4), plainBone(5)],
}

/**
 * art. 60: hand size is a body stat, and it is six. It is deliberately not
 * `PLAIN_POUCH.dice.length` — the gap between the two is art. 55's
 * invitation, and deriving one from the other would quietly close it.
 */
export const HAND_SIZE = 6

/**
 * The Orphan — faces {6,2,3,4,5,6}, over the plain bone's budget with no
 * cost face on it and nobody it came off.
 *
 * art. 87 refuses it: no origin sentence can be written for a die that has
 * no owner, so it ships nowhere. It stays here as the fixture the audit is
 * pointed at — a die that fails `paid` — because an audit no die ever fails
 * is an audit nobody can trust (`test/lots.items.test.ts`).
 */
export const THE_ORPHAN: Die = {
  id: id('bone.orphan'),
  body: 6,
  faces: [{ value: 6 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }, { value: 6 }],
}

/**
 * The Sisters — the demo's bond (`reference/castlebrynth-lots-demo.html`),
 * and since the travelers ruling a findable good rather than a fixture.
 *
 * art. 52: the bond triggers when both are spent in the same claim at equal
 * value; a ghost sister joins, and the pair scores at triple tier on the PAIR
 * line. Carrying both halves in a finite hand is the cost.
 *
 * art. 87, canon: two who went down together. Neither half is over budget —
 * a plain bone's faces, and the power is entirely in the other one being
 * somewhere below you. The halves are banded apart when they are dealt
 * (`encounters.ts`), so finding one always means walking for the other.
 */
export const SISTERS_BOND = bond('bond.sisters')

export const THE_SISTERS: readonly [Die, Die] = [
  { id: id('bone.sister.elder'), body: 6, faces: plainFaces, bond: SISTERS_BOND },
  { id: id('bone.sister.younger'), body: 6, faces: plainFaces, bond: SISTERS_BOND },
]

/**
 * The Leech — the demo's rider, and now a findable good. art. 51: it fires
 * only when its face is spent in a claim; kept or unused, the 6 does nothing.
 *
 * art. 87: a rider is a habit somebody carried into a fight, and this one is
 * the habit of taking something back off whatever it hit. Its faces are the
 * plain bone's, so the habit is the whole of the power and there is nothing
 * else to pay for.
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
