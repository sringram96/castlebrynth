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

  it('draws the canonical dice materially larger than the previous 0.062 tray width', () => {
    expect(DIE_SPRITE).toBeGreaterThan(0.062)
  })

  it('keeps the central well below the crown and the footer below the well', () => {
    expect(RELIQUARY.mainWell.y).toBeGreaterThan(RELIQUARY.diceZone.y)
    expect(RELIQUARY.tabs[0]!.y).toBeGreaterThan(
      RELIQUARY.mainWell.y + RELIQUARY.mainWell.height,
    )
  })

  it('preserves the runtime asset dimensions expected by the manifest', () => {
    expect(RELIQUARY_FRAME).toEqual({ authoredWidth: 1460, authoredHeight: 727 })
  })
})
