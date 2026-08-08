/**
 * The screenshot acceptance set.
 *
 * `tools/shot.mjs` takes one picture after a sequence of presses. This takes
 * the whole set, at both phone widths, into `screens/<label>/` — which is what
 * a person actually looks at when the question is "does the tray fit", and
 * what a before/after comparison needs.
 *
 * These are evidence, never content: nothing here draws anything. Each file is
 * a photograph of the running game.
 *
 *   npm run dev
 *   npm run shots -- baseline
 *   npm run shots -- after
 */

import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from '@playwright/test'

const label = process.argv[2] ?? 'now'
const dir = `screens/${label}`
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

const BASE = 'http://127.0.0.1:5173/'

/** name, fixture, presses. A press is a selector clicked in order. */
const SHOTS = [
  ['explore-entry', '?room=entry', []],
  ['explore-with-relic', '?room=fork&relics=thimble', []],
  ['combat-idle', '?room=hollow&mode=combat', []],
  ['combat-rolled', '?room=hollow&mode=combat', ['[data-act=roll]']],
  ['combat-selected', '?room=hollow&mode=combat', ['[data-act=roll]', '.die[data-slot="0"]', '.die[data-slot="1"]']],
  ['menu', '?room=hollow&mode=combat', ['[data-act=menu]']],
  ['reward', '?room=hollow&enemyHp=1', ['[data-act=roll]', '.die[data-slot="0"]', '[data-act=score]']],
  ['dead', '?mode=dead', []],
  ['complete', '?mode=complete', []],
]

/** Shots that need a special loadout to say what they are for. */
const EXTRA = [
  ['red-face-selected', '?room=hollow&mode=combat&dice=pusher,pusher,pusher,pusher,pusher,pusher', ['[data-act=roll]']],
  ['inspect-die', '?room=fork&dice=pusher', ['.die[data-slot="0"]']],
  ['inspect-relic', '?room=fork&relics=thimble', ['.relic[data-relic-id=thimble]']],
]

const SIZES = [
  ['390x844', 390, 844],
  ['360x800', 360, 800],
]

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)

const problems = []
for (const [sizeName, width, height] of SIZES) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  page.on('pageerror', (e) => problems.push(`${sizeName}: ${e.message}`))
  for (const [name, fixture, presses] of [...SHOTS, ...EXTRA]) {
    await page.goto(`${BASE}${fixture}`, { waitUntil: 'networkidle' })
    for (const selector of presses) {
      const target = page.locator(selector).first()
      if ((await target.count()) === 0) {
        problems.push(`${sizeName}/${name}: nothing matches ${selector}`)
        break
      }
      // A press that cannot land is a finding, not a crash: the rest of the
      // set is still worth having, and the missing one is reported at the end.
      try {
        await target.click({ timeout: 2000 })
      } catch {
        problems.push(`${sizeName}/${name}: ${selector} would not take a press`)
        break
      }
    }
    // Motion is real now, so settle before the shutter.
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${dir}/${name}-${sizeName}.png` })
  }
  await page.close()
}

await browser.close()
for (const p of problems) console.error(p)
console.log(`${SHOTS.length + EXTRA.length} shots × ${SIZES.length} widths → ${dir}/`)
if (problems.length > 0) process.exitCode = 1
