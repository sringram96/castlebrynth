import { describe, expect, it } from 'vitest'

import {
  DIE_CELLS,
  DIE_SPRITE,
  RELIQUARY,
  RELIQUARY_FRAME,
  posesFor,
} from '../src/content/ui/reliquary.js'

describe('the reliquary art-direction contract', () => {
  it('ships exactly six authored crown sockets', () => {
    expect(DIE_CELLS).toHaveLength(6)
  })

  it('keeps every crown socket inside normalized tray-space', () => {
    for (const cell of DIE_CELLS) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.x + cell.width).toBeLessThanOrEqual(1)
      expect(cell.y + cell.height).toBeLessThanOrEqual(1)
    }
  })

  it('the canonical six are one die per crown socket', () => {
    const poses = posesFor(6)
    expect(poses).toHaveLength(6)
    for (let i = 0; i < 6; i++) {
      const pose = poses[i]!
      const cell = DIE_CELLS[i]!
      expect(pose.x).toBeGreaterThanOrEqual(cell.x)
      expect(pose.y).toBeGreaterThanOrEqual(cell.y)
      expect(pose.x + pose.width).toBeLessThanOrEqual(cell.x + cell.width)
      expect(pose.y + pose.height).toBeLessThanOrEqual(cell.y + cell.height)
      expect(pose.rotation ?? 0).toBe(0)
    }
  })

  it('keeps the six bones visually substantial', () => {
    expect(DIE_SPRITE).toBeGreaterThanOrEqual(0.09)
  })

  it('fits the health fill wholly inside the left instrument', () => {
    expect(RELIQUARY.healthOrb.x).toBeGreaterThan(0.05)
    expect(RELIQUARY.healthOrb.y).toBeGreaterThan(0.28)
    expect(RELIQUARY.healthOrb.x + RELIQUARY.healthOrb.width).toBeLessThan(0.22)
    expect(RELIQUARY.healthOrb.y + RELIQUARY.healthOrb.height).toBeLessThan(0.66)
  })

  it('gives the score most of the central well rather than a tiny readout slot', () => {
    expect(RELIQUARY.score.x).toBeGreaterThanOrEqual(RELIQUARY.mainWell.x)
    expect(RELIQUARY.score.y).toBeGreaterThanOrEqual(RELIQUARY.mainWell.y)
    expect(RELIQUARY.score.x + RELIQUARY.score.width).toBeLessThanOrEqual(
      RELIQUARY.mainWell.x + RELIQUARY.mainWell.width,
    )
    expect(RELIQUARY.score.y + RELIQUARY.score.height).toBeLessThanOrEqual(
      RELIQUARY.mainWell.y + RELIQUARY.mainWell.height,
    )
    expect(RELIQUARY.score.width).toBeGreaterThan(RELIQUARY.mainWell.width * 0.9)
    expect(RELIQUARY.score.height).toBeGreaterThan(RELIQUARY.mainWell.height * 0.7)
  })

  it('preserves the runtime asset dimensions expected by the manifest', () => {
    expect(RELIQUARY_FRAME).toEqual({ authoredWidth: 1460, authoredHeight: 727 })
  })
})
