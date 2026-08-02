#!/usr/bin/env node
// The nine cards, green or red. Runs each card's acceptance.
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadCards, waves, ROOT } from './cards.mjs'

export function runAcceptance(card) {
  const a = card.acceptance
  if (!a) return { status: 'none', detail: 'no acceptance declared' }

  if (a.startsWith('npm run')) {
    return run(a)
  }
  if (!existsSync(join(ROOT, a))) {
    return { status: 'missing', detail: `${a} does not exist` }
  }
  return run(`npx vitest run ${a} --passWithNoTests`)
}

function run(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })
    return { status: 'green', detail: '' }
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`
    const first =
      out
        .split('\n')
        .find((l) => /FAIL|Error|Cannot find module|✗|×/.test(l))
        ?.trim() ?? 'failed'
    return { status: 'red', detail: first.slice(0, 120) }
  }
}

const MARK = { green: '●', red: '○', missing: '·', none: '·' }

async function main() {
  const cards = loadCards()
  const only = process.argv.slice(2)
  const targets = only.length ? cards.filter((c) => only.includes(c.id)) : cards

  const results = new Map()
  for (const [i, wave] of waves(cards).entries()) {
    const inWave = wave.filter((c) => targets.includes(c))
    if (!inWave.length) continue
    console.log(`\n  wave ${i + 1}`)
    for (const card of inWave) {
      const r = runAcceptance(card)
      results.set(card.id, r)
      const line = `  ${MARK[r.status]} ${card.id.padEnd(7)} ${card.title}`
      console.log(r.detail ? `${line.padEnd(52)}  ${r.detail}` : line)
    }
  }

  const green = [...results.values()].filter((r) => r.status === 'green').length
  console.log(`\n  ${green}/${results.size} green\n`)
  process.exit(green === results.size ? 0 : 1)
}

main()
