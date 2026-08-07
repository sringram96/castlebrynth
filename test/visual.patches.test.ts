import { describe, expect, it } from 'vitest'

import type { AnimatedPatch } from '../src/visual/index.js'
import {
  Layer,
  MOST_PATCH_FRAMES,
  MOST_PATCH_LOOPS,
  overspentPatches,
  patchAsset,
  patchFrame,
  phaseOfPatch,
} from '../src/visual/index.js'

/**
 * arts 107, 109, 116, 122: a patch is a function of the world clock and its
 * own identity, and of nothing else. That is what makes "the same room
 * breathes the same way every time you stand in it" a fact rather than a
 * hope.
 */

const anchor = { space: 'frame', x: 0.5, y: 1, origin: 'bottom-center', width: 0.1 } as const

const loop = (id: string, frames: readonly string[], every = 3, phase = 0): AnimatedPatch => ({
  id,
  frames,
  every,
  anchor,
  layer: Layer.Patch,
  trigger: 'idle',
  phase,
})

const still = { tick: 0, still: true, inFight: false }
const running = (tick: number): { tick: number; still: boolean; inFight: boolean } => ({
  tick,
  still: false,
  inFight: false,
})

describe('patch frames — art. 109 (one clock, phase off identity)', () => {
  it('advances one frame every `every` ticks and wraps', () => {
    const candle = loop('c', ['a', 'b'], 3)
    expect([0, 1, 2, 3, 4, 5, 6].map((t) => patchFrame(candle, running(t)))).toEqual([
      0, 0, 0, 1, 1, 1, 0,
    ])
  })

  it('is a pure function of the tick, so the same tick is the same frame', () => {
    const candle = loop('c', ['a', 'b', 'c'], 2)
    expect(patchFrame(candle, running(41))).toBe(patchFrame(candle, running(41)))
  })

  it('names the asset the frame index points at', () => {
    const candle = loop('c', ['patch.a', 'patch.b'], 1)
    expect(patchAsset(candle, running(0))).toBe('patch.a')
    expect(patchAsset(candle, running(1))).toBe('patch.b')
  })

  it('offsets phase off the id, so two candles do not gutter together', () => {
    // No declared phase, so both fall back to the hash of their own id.
    const unphased = (id: string): AnimatedPatch => ({
      id,
      frames: ['a', 'b'],
      every: 3,
      anchor,
      layer: Layer.Patch,
      trigger: 'idle',
    })
    const left = unphased('choir.candle.left')
    const right = unphased('choir.candle.right')
    // Deterministic: the same id always hashes to the same offset.
    expect(phaseOfPatch(left)).toBe(phaseOfPatch(left))
    expect(phaseOfPatch(left)).not.toBe(phaseOfPatch(right))
  })

  it('shows nothing for a patch with no frames', () => {
    expect(patchFrame(loop('empty', []), running(3))).toBeNull()
  })
})

describe('triggers — arts 30, 107', () => {
  it('runs a fight patch only while something is close', () => {
    const roar: AnimatedPatch = { ...loop('roar', ['a', 'b']), trigger: 'fight' }
    expect(patchFrame(roar, { tick: 0, still: false, inFight: false })).toBeNull()
    expect(patchFrame(roar, { tick: 0, still: false, inFight: true })).toBe(0)
  })

  it('shows a one-shot only once it has fired, and never wraps it', () => {
    const shot: AnimatedPatch = { ...loop('bars.fall', ['a', 'b', 'c'], 2), trigger: 'event' }
    // Not fired is not "paused on frame zero" — it is a thing that has not
    // happened, so there is nothing on the frame at all.
    expect(patchFrame(shot, running(10))).toBeNull()
    const fired = { tick: 10, still: false, inFight: false, fired: { 'bars.fall': 10 } }
    expect(patchFrame(shot, fired)).toBe(0)
    expect(patchFrame(shot, { ...fired, tick: 12 })).toBe(1)
    expect(patchFrame(shot, { ...fired, tick: 14 })).toBe(2)
    // art. 1: it ends in the settled state and stays there.
    expect(patchFrame(shot, { ...fired, tick: 40 })).toBe(2)
  })
})

describe('reduced motion — art. 116 (the settled state is the whole truth)', () => {
  it('holds a loop on its first frame, whatever the clock says', () => {
    const candle = loop('c', ['a', 'b', 'c'], 1)
    expect(patchFrame(candle, { ...still, tick: 0 })).toBe(0)
    expect(patchFrame(candle, { ...still, tick: 999 })).toBe(0)
  })

  it('holds a fired one-shot on its *last* frame, because that is what it settles in', () => {
    const shot: AnimatedPatch = { ...loop('bars.fall', ['a', 'b', 'c'], 2), trigger: 'event' }
    expect(patchFrame(shot, { ...still, fired: { 'bars.fall': 0 } })).toBe(2)
    // A one-shot that never fired is still nothing at all.
    expect(patchFrame(shot, still)).toBeNull()
  })

  it('still refuses a fight patch out of a fight', () => {
    const roar: AnimatedPatch = { ...loop('roar', ['a']), trigger: 'fight' }
    expect(patchFrame(roar, still)).toBeNull()
  })
})

describe('the motion budget — art. 107 (stillness is the capital motion spends)', () => {
  it('passes a room inside the budget', () => {
    expect(overspentPatches([loop('a', ['1', '2']), loop('b', ['1', '2', '3'])])).toEqual([])
  })

  it('names a room running too many loops', () => {
    const many = Array.from({ length: MOST_PATCH_LOOPS + 1 }, (_, i) => loop(`p${i}`, ['1']))
    expect(overspentPatches(many).length).toBeGreaterThan(0)
  })

  it('names a loop with too many authored frames', () => {
    const long = loop('p', Array.from({ length: MOST_PATCH_FRAMES + 1 }, (_, i) => `f${i}`))
    expect(overspentPatches([long]).length).toBeGreaterThan(0)
  })

  it('does not count one-shots against the loop budget', () => {
    const shots = Array.from({ length: 8 }, (_, i) => ({
      ...loop(`s${i}`, ['1', '2']),
      trigger: 'event' as const,
    }))
    expect(overspentPatches(shots)).toEqual([])
  })
})
