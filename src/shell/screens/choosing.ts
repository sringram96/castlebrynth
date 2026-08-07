/**
 * The choosing screen — pure selection geometry and selection state.
 *
 * The shell owns DOM and persistence. This file answers only three questions:
 * where the owned dice stand, what a tap does to the selected identities, and
 * whether the hand is complete. Keeping those questions pure makes the screen
 * testable without teaching the shell a second model of a die.
 */

import type { DieId } from '../../lots/index.js'

/** One authored point in the black choosing field, expressed as fractions. */
export interface OrbitPoint {
  readonly x: number
  readonly y: number
  readonly rotation: number
}

/**
 * Toggle a die by identity. A full hand stays full until the player puts one
 * down; tapping an unselected die at the limit still performs its free look in
 * the shell, but selection itself does not silently replace another die.
 */
export function toggledSelection(
  selected: readonly DieId[],
  die: DieId,
  limit: number,
): readonly DieId[] {
  if (selected.includes(die)) return selected.filter((one) => one !== die)
  const cap = Math.max(0, Math.floor(limit))
  if (selected.length >= cap) return selected
  return [...selected, die]
}

/** Confirm exists only when the hand is exactly whole. */
export function selectionComplete(selected: readonly DieId[], required: number): boolean {
  const need = Math.max(0, Math.floor(required))
  return need > 0 && selected.length === need
}

const TAU = Math.PI * 2

/**
 * Put every owned die on the table at once.
 *
 * Up to twelve dice use one broad ellipse. Larger collections use two
 * concentric ellipses rather than a scroll: every option remains visible and
 * the empty centre keeps the composition legible. The result is deterministic
 * for a count, so the screen does not reshuffle under the thumb between taps.
 */
export function orbitPositions(count: number): readonly OrbitPoint[] {
  const n = Math.max(0, Math.floor(count))
  if (n === 0) return []
  if (n === 1) return [{ x: 0.5, y: 0.46, rotation: 0 }]
  if (n <= 12) return ring(n, 0.34, 0.285, -Math.PI / 2, n)

  const outer = Math.ceil(n * 0.58)
  const inner = n - outer
  return [
    ...ring(outer, 0.38, 0.31, -Math.PI / 2, n),
    ...ring(inner, 0.205, 0.165, -Math.PI / 2 + Math.PI / Math.max(1, inner), n + 17),
  ]
}

function ring(
  count: number,
  radiusX: number,
  radiusY: number,
  phase: number,
  salt: number,
): readonly OrbitPoint[] {
  if (count <= 0) return []
  return Array.from({ length: count }, (_, at) => {
    const angle = phase + (TAU * at) / count
    return {
      x: 0.5 + Math.cos(angle) * radiusX,
      y: 0.48 + Math.sin(angle) * radiusY,
      // Small deterministic irregularity: physical bones, not menu icons.
      rotation: ((at * 7 + salt * 3) % 9) - 4,
    }
  })
}
