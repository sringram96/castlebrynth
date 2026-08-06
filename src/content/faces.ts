/**
 * **The two materials** (card 94, arts 100, 113).
 *
 * The playtest of the rolling goods could not tell the six from the carried
 * things: *"I have no idea how to tell core die apart from item die."* They
 * were the same box in two border colours, and a border colour is not a
 * material. So they stop being one object in two palettes and become two
 * objects.
 *
 * **The six are bone.** A warm ramp, a rounded body, pips, lit on the near
 * corner. **A trinket is iron.** A cold ramp, a bevelled octagon, and a
 * **glyph per face kind** rather than pips — so the face says what kind of
 * thing it is before any number is read.
 *
 * The bar the wave set is the one worth keeping: **the two rows are tellable
 * apart with the screen upside down.** A colour swap alone does not pass it,
 * which is why shape and mark move as well as hue. Once the materials differ,
 * a dashed hairline is the whole separator the tray needs — no heading, no
 * label.
 *
 * **Everything here is data** (art. 100). A thing meant to be recognised is
 * drawn once, by hand, as a small grid of indices into its own ramp; the
 * shell colours it at paint time (`src/shell/faces.ts`) and this file knows
 * nothing about a canvas. Three consequences, and each is the article: a
 * drawing cannot fall out of palette, one drawing can be lit two ways
 * (claimed, landing) by swapping the ramp under it, and readable size is a
 * property of the drawing rather than of whatever is drawing it.
 *
 * The drawings are the signed-off demo's, replayed pixel for pixel with one
 * correction, which is noted where it is made (`PIPS`). No number in this file
 * is a tuning number: nothing here is worth anything.
 */

import type { Amend } from '../lots/index.js'

/**
 * The grid every drawing below is authored on. It is not a device pixel and
 * not a game pixel — the tray is not the world band (arts 22–23) — it is the
 * side of a square the shell scales to whatever the slot came to.
 */
export const FACE_GRID = 16

/** One authored drawing: `FACE_GRID` rows, a digit per cell, `.` for nothing. */
export type Drawing = readonly string[]

// ── Bone (the six) ─────────────────────────────────────────────────────

/**
 * The bone ramp, dark to light, and the scar last.
 *
 * The scar is past the end of the ramp on purpose: it is not a step of the
 * material, it is a mark *on* it (art. 86 — the cost face is the mistake that
 * killed its owner), and a mark that lived on the ramp would move whenever
 * the material was relit.
 */
export const BONE_RAMP: readonly string[] = [
  'hsl(26, 22%, 17%)', // 0 · the pips
  'hsl(28, 18%, 20%)', // 1 · the far corner, in its own shadow
  'hsl(30, 20%, 30%)', // 2 · the edge
  'hsl(38, 26%, 74%)', // 3 · the face
  'hsl(44, 46%, 90%)', // 4 · the near corner, lit
  'hsl(8, 52%, 42%)', //  5 · the scar
]

/**
 * art. 115: the light is derived, never hand-shaded — one drawing, relit by
 * swapping what its ramp says. A claimed bone lifting takes the whole face to
 * the top of its own ramp, and nothing about the drawing changes.
 */
export const BONE_RAMP_LIT: readonly string[] = BONE_RAMP.map((step, at) =>
  at === 3 ? (BONE_RAMP[4] as string) : step,
)

/** Rounded, and lit on the near corner, so it never reads as a UI chip. */
export const BONE_BODY: Drawing = [
  '................',
  '..222222222222..',
  '.23333333333332.',
  '.23444444444332.',
  '.23433333333332.',
  '.23433333333332.',
  '.23433333333332.',
  '.23433333333332.',
  '.23433333333332.',
  '.23433333333332.',
  '.23433333333332.',
  '.23433333333332.',
  '.23311111111112.',
  '.23333333333112.',
  '..222222222222..',
  '................',
]

/**
 * arts 54, 86: **the cost face is marked where it sits.** The pusher's price
 * is on its 1, and looking at the die is how a player learns it is on the 1 —
 * which is the difference between *it costs you sometimes* and knowing which
 * face to dread.
 */
export const BONE_SCAR: Drawing = [
  '................',
  '................',
  '................',
  '............55..',
  '.............5..',
  '.............5..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]

/**
 * The pips, one grid a value.
 *
 * They are the demo's own layout moved a pixel right and a pixel down, which
 * is the wave's one correction to the reference rather than a difference of
 * opinion with it: at three device pixels to an authored one the demo's block
 * sits a pixel and a half left of the body's centre, and on a phone a die
 * whose pips are shoved into one corner reads as a broken die. Everything
 * about the layout — the spacing, the block size, which cells a value uses —
 * is unchanged.
 */
const PIPS: Readonly<Record<number, Drawing>> = {
  1: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......00.......',
    '.......00.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  2: [
    '................',
    '................',
    '................',
    '................',
    '....00..........',
    '....00..........',
    '................',
    '................',
    '................',
    '................',
    '..........00....',
    '..........00....',
    '................',
    '................',
    '................',
    '................',
  ],
  3: [
    '................',
    '................',
    '................',
    '................',
    '....00..........',
    '....00..........',
    '................',
    '.......00.......',
    '.......00.......',
    '................',
    '..........00....',
    '..........00....',
    '................',
    '................',
    '................',
    '................',
  ],
  4: [
    '................',
    '................',
    '................',
    '................',
    '....00....00....',
    '....00....00....',
    '................',
    '................',
    '................',
    '................',
    '....00....00....',
    '....00....00....',
    '................',
    '................',
    '................',
    '................',
  ],
  5: [
    '................',
    '................',
    '................',
    '................',
    '....00....00....',
    '....00....00....',
    '................',
    '.......00.......',
    '.......00.......',
    '................',
    '....00....00....',
    '....00....00....',
    '................',
    '................',
    '................',
    '................',
  ],
  6: [
    '................',
    '................',
    '................',
    '................',
    '....00....00....',
    '....00....00....',
    '................',
    '....00....00....',
    '....00....00....',
    '................',
    '....00....00....',
    '....00....00....',
    '................',
    '................',
    '................',
    '................',
  ],
}

/** The pips for a value. art. 50: any body, but every face shows a 1–6. */
export function pipsFor(value: number): Drawing {
  return PIPS[Math.min(6, Math.max(1, Math.round(value)))] ?? (PIPS[1] as Drawing)
}

// ── Iron (a trinket) ───────────────────────────────────────────────────

/** The iron ramp, dark to light, and the glyph last — it is above the metal. */
export const IRON_RAMP: readonly string[] = [
  'hsl(220, 18%, 13%)', // 0 · the far bevel
  'hsl(218, 20%, 20%)', // 1 · the edge
  'hsl(216, 10%, 30%)', // 2 · dull — the metal with nothing in it
  'hsl(214, 16%, 44%)', // 3 · the face
  'hsl(204, 32%, 70%)', // 4 · the near bevel, lit
  'hsl(200, 34%, 84%)', // 5 · the glyph
]

/**
 * A face that did nothing. The metal goes dull and the glyph is a bar — the
 * drawing is the same drawing, relit (art. 115), because *nothing happened*
 * is a state of the thing and not a different thing.
 */
export const IRON_RAMP_NULL: readonly string[] = IRON_RAMP.map((step, at) =>
  at === 3 ? (IRON_RAMP[2] as string) : step,
)

/** art. 119: the one beat it moves on — the face it rolled, taking the light. */
export const IRON_RAMP_LIT: readonly string[] = IRON_RAMP.map((step, at) =>
  at === 3 ? (IRON_RAMP[4] as string) : step,
)

/** Bevelled, and eight-sided, so the silhouette differs before the hue does. */
export const IRON_BODY: Drawing = [
  '................',
  '....11111111....',
  '...1444444431...',
  '..133333333331..',
  '.14333333333331.',
  '.14333333333331.',
  '.14333333333331.',
  '.14333333333331.',
  '.14333333333331.',
  '.14333333333331.',
  '.14333333333331.',
  '.13333333333031.',
  '..133333333000..',
  '...1333333330...',
  '....11111111....',
  '................',
]

/**
 * **A glyph per face kind** (art. 100's alphabet, said about a face).
 *
 * The glyph is the whole point of the material: pips would say *which face*
 * and the player does not care which face, they care what it does. A shield
 * turns a blow aside, a plus adds, a plus in a frame of four adds per die, and
 * teeth bite. A null is a bar through dull metal.
 *
 * They are drawn at the same size as a pip layout and read at the same
 * distance, which is the bar art. 100 sets for anything meant to be
 * recognised. Nothing here is worth anything: the numbers are the good's, in
 * `trinkets.ts`, and the words are `prose.ts`'s.
 */
const GLYPHS: Readonly<Record<Amend['kind'], Drawing>> = {
  null: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....111111.....',
    '.....111111.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  block: [
    '................',
    '................',
    '................',
    '................',
    '.....555555.....',
    '....5......5....',
    '....5......5....',
    '....5......5....',
    '....5......5....',
    '.....555555.....',
    '......5555......',
    '.......55.......',
    '................',
    '................',
    '................',
    '................',
  ],
  add: [
    '................',
    '................',
    '................',
    '................',
    '.......55.......',
    '.......55.......',
    '.......55.......',
    '....55555555....',
    '....55555555....',
    '.......55.......',
    '.......55.......',
    '.......55.......',
    '................',
    '................',
    '................',
    '................',
  ],
  per: [
    '................',
    '................',
    '................',
    '...5........5...',
    '................',
    '.......55.......',
    '.......55.......',
    '.....555555.....',
    '.....555555.....',
    '.......55.......',
    '.......55.......',
    '................',
    '...5........5...',
    '................',
    '................',
    '................',
  ],
  cost: [
    '................',
    '................',
    '................',
    '................',
    '.....55..55.....',
    '.....55..55.....',
    '.......55.......',
    '.......55.......',
    '................',
    '......5...5.....',
    '......5.5.5.....',
    '........5.......',
    '................',
    '................',
    '................',
    '................',
  ],
}

/** A trinket that has not rolled yet: a slot in the metal, and nothing in it. */
export const IRON_EMPTY: Drawing = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......0000......',
  '......0000......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]

export function glyphFor(kind: Amend['kind']): Drawing {
  return GLYPHS[kind]
}

/**
 * card 94: **the pop is coloured by kind** — gold adds, cold blocks, red
 * bites, and a null is claimed by nothing at all.
 *
 * It is the one place a colour carries a meaning rather than a material, and
 * it is legal because the caption under the thing is already saying the same
 * fact in words (art. 111): the colour is the second telling, never the only
 * one.
 */
export const KIND_INK: Readonly<Record<Amend['kind'], string>> = {
  block: 'hsl(202, 44%, 66%)',
  add: 'hsl(40, 62%, 64%)',
  per: 'hsl(40, 62%, 64%)',
  cost: 'hsl(8, 56%, 58%)',
  null: 'hsl(216, 10%, 40%)',
}
