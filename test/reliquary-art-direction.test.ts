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

  it('keeps every crown socket inside normalized tray-space and the authored crown zone', () => {
    for (const cell of DIE_CELLS) {
      expect(cell.x).toBeGreaterThanOrEqual(RELIQUARY.diceZone.x)
      expect(cell.y).toBeGreaterThanOrEqual(RELIQUARY.diceZone.y)
      expect(cell.x + cell.width).toBeLessThanOrEqual(
        RELIQUARY.diceZone.x + RELIQUARY.diceZone.width,
      )
      expect(cell.y + cell.height).toBeLessThanOrEqual(
        RELIQUARY.diceZone.y + RELIQUARY.diceZone.height,
      )
    }
  })

  it('the canonical six are one large die per crown socket', () => {
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

  it('gives the canonical dice visual priority instead of icon scale', () => {
    expect(DIE_SPRITE).toBeGreaterThanOrEqual(0.09)
  })

  it('makes scoring occupy the centre of the main well', () => {
    expect(RELIQUARY.score.x).toBeGreaterThanOrEqual(RELIQUARY.mainWell.x)
    expect(RELIQUARY.score.y).toBeGreaterThanOrEqual(RELIQUARY.mainWell.y)
    expect(RELIQUARY.score.x + RELIQUARY.score.width).toBeLessThanOrEqual(
      RELIQUARY.mainWell.x + RELIQUARY.mainWell.width,
    )
    expect(RELIQUARY.score.y + RELIQUARY.score.height).toBeLessThanOrEqual(
      RELIQUARY.mainWell.y + RELIQUARY.mainWell.height,
    )
    expect(RELIQUARY.score.width).toBeGreaterThan(RELIQUARY.mainWell.width * 0.8)
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
