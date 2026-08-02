#!/usr/bin/env node
// Which cards are READY to dispatch right now.
//
// READY = every dep is green, and this card's own acceptance is still red.
// A card whose acceptance is already green is DONE — including one whose work
// a dependency happened to carry (AGENTS.md law 2).
import { loadCards, waves } from './cards.mjs'
import { runAcceptance } from './progress.mjs'

const cards = loadCards()
const status = new Map()

for (const wave of waves(cards)) {
  for (const card of wave) {
    status.set(card.id, runAcceptance(card).status)
  }
}

const done = (id) => status.get(id) === 'green'

const ready = []
const blocked = []
const finished = []

for (const card of cards) {
  if (done(card.id)) finished.push(card)
  else if (card.deps.every(done)) ready.push(card)
  else blocked.push(card)
}

const show = (title, list, extra = () => '') => {
  if (!list.length) return
  console.log(`\n  ${title}`)
  for (const c of list) console.log(`    ${c.id.padEnd(7)} ${c.title}${extra(c)}`)
}

show('READY', ready)
show('blocked', blocked, (c) => `  ← waiting on ${c.deps.filter((d) => !done(d)).join(', ')}`)
show('done', finished)

console.log(`\n  ${finished.length}/${cards.length} done, ${ready.length} ready\n`)

if (ready.length) {
  const first = ready[0]
  console.log('  dispatch:')
  console.log(`    git checkout -b factory/${first.id}`)
  console.log(
    `    claude -p "Work exactly one card: ${first.file}. Follow AGENTS.md to the letter." --max-turns 60`,
  )
  console.log('')
}
