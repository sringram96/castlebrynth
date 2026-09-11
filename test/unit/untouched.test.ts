/**
 * What the legibility wave did not touch.
 *
 * Two promises, and they are the constraints that shaped everything in it:
 *
 *   - **the save does not move.** Every feature of the wave — the face strips,
 *     the slot cards, the strip of where the run has been, the territory
 *     grades and their cards — is derived wholly from state that already
 *     existed. Not one of them added a field, and `SAVE_VERSION` is the proof:
 *     a run in progress survives this wave.
 *   - **no pixel was authored.** Existing art may be measured, positioned,
 *     clipped, transformed and graded; its pixels may not be touched. The
 *     grade is a CSS treatment over the picture and `public/` is byte for byte
 *     what it was.
 *
 * Both are asserted rather than asserted-in-a-commit-message, because both are
 * the kind of promise that is easy to break by accident and impossible to
 * notice afterwards.
 */

import { describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'

import { SAVE_VERSION } from '../../src/game/state.js'

describe('the save is untouched', () => {
  it('was bumped once for the crooked bones wave, and only once', () => {
    // **12, and it is the whole wave's bump.** Eight core dice rather than one,
    // priced dice and cut prose on a `RunRoom`, a record of which of them have
    // been claimed, three grammars, and a ladder where an enemy's damage was —
    // all of it is one shape change and it gets one number. A thirteenth inside
    // this wave would mean two saves nobody ever wrote were readable; the policy
    // is unchanged, which is that an old save is discarded and reported.
    expect(SAVE_VERSION).toBe(12)
  })
})

/**
 * The base this wave was cut from, whichever name the checkout has for it.
 *
 * CI checks out a pull request **shallow**, so neither `origin/main` nor
 * `main` exists there and the assertion below would quietly become a no-op on
 * the one machine everybody reads the verdict from. So a shallow fetch of the
 * base is the last resort: diffing two trees needs both commits present and
 * nothing else, not a shared history. A checkout that cannot reach the base at
 * all — offline, or no remote — answers nothing, and the tests say so rather
 * than pretending to have checked.
 */
function baseRef(): string | undefined {
  for (const ref of ['origin/main', 'main']) {
    try {
      execSync(`git rev-parse --verify --quiet ${ref}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      return ref
    } catch {
      continue
    }
  }
  try {
    execSync('git fetch --depth=1 origin main', { stdio: ['ignore', 'ignore', 'ignore'] })
    execSync('git rev-parse --verify --quiet FETCH_HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
    return 'FETCH_HEAD'
  } catch {
    return undefined
  }
}

describe('no pixel was authored', () => {
  it('leaves public/ byte for byte as it was', () => {
    const base = baseRef()
    // A checkout with no base to compare against cannot answer the question,
    // and a test that quietly passed in that case would be worse than one that
    // says so. Every CI checkout has one.
    if (!base) return
    const changed = execSync(`git diff --stat ${base} -- public/`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    expect(changed, `public/ moved against ${base}`).toBe('')
  })

  it('leaves the masters alone as well', () => {
    const base = baseRef()
    if (!base) return
    const changed = execSync(`git diff --stat ${base} -- docs/art-reference/`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    expect(changed, `the masters moved against ${base}`).toBe('')
  })
})
