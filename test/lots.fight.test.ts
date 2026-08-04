import { describe, expect, it } from 'vitest'

/**
 * The reference fight — a placeholder standing where the fixture will be.
 *
 * The Crawling One walkthrough that lived here tested the THROW / BRACE /
 * FLEE turn, which the demo ruling repealed: arts 41 and 47 as amended
 * (dice attack, armor defends), art. 45 (a turn claims several combos, each
 * die spent at most once), art. 46 (the whiff clause repealed, ANY DICE is
 * the floor), arts 63–65 (the card, composites as single claims, intents
 * that attack the plan).
 *
 * `reference/the-crawling-one-encounter.md` now says so itself, and
 * `reference/castlebrynth-lots-demo.html` is the playable spec until the
 * encounter is re-authored ("Content · the reference fight", on the board).
 * This fails on purpose until that fixture exists: it is the row the
 * definition of done still owes.
 */

describe('lots — the reference fight (arts 41, 45–48, 63–65 as amended)', () => {
  it('reproduces the re-authored encounter turn for turn', () => {
    expect.fail('the reference fight fixture is not authored yet (arts 41, 45–47, 63–65)')
  })
})
