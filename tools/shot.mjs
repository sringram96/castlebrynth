/**
 * Take a screenshot of the running game after a sequence of presses.
 *
 * A development convenience, not part of the suite — the acceptance tests are
 * in test/browser. This exists because looking at the thing is the only way to
 * catch what a headless assertion cannot: a tray hanging off the right edge, a
 * backdrop that is really a cut-out, an enemy behind its own room.
 *
 *   npm run dev
 *   node tools/shot.mjs out.png '[data-act=start]' '[data-act=go]' ...
 */

import { chromium } from '@playwright/test'

const [, , out, ...steps] = process.argv
if (!out) throw new Error('usage: node tools/shot.mjs <out.png> [selector...]')

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
})

const problems = []
page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
for (const step of steps) {
  if (step.startsWith('wait:')) {
    await page.waitForTimeout(Number(step.slice(5)))
    continue
  }
  await page.locator(step).first().click({ timeout: 5000 })
  await page.waitForTimeout(150)
}
await page.screenshot({ path: out })
console.log(problems.length ? problems.join(' | ') : 'no console errors')
await browser.close()
