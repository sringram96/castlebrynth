#!/usr/bin/env node
// .llm/rules/scope.mdc — a card may only touch the paths it declared.
//
// This is the guarantee that lets a whole wave of agents merge in any order:
// within a wave, scopes are disjoint by construction, so there is nothing to
// conflict over. Breaking scope is a failed card even when the change is
// correct.
import { execFileSync } from 'node:child_process'
import { loadCards, ROOT } from './cards.mjs'

const cards = loadCards() // throws on a malformed card, an unknown dep, or a cycle

// Declared before the collision scan below, which calls fail(). A `const` in
// the temporal dead zone throws on access, so this must not drift downward.
const errors = []
function fail(msg) {
  errors.push(msg)
}

// Scopes within a wave must not overlap, or the guarantee is a lie.
const byId = new Map(cards.map((c) => [c.id, c]))
const seen = new Map()
for (const c of cards) {
  for (const p of c.scope) {
    // package.json is deliberately shared (H005 appends to the law line), and
    // package-lock.json is its generated companion — every card that adds a
    // dependency rewrites it, and npm ci fails if it drifts from package.json.
    if (p === 'package.json' || p === 'package-lock.json') continue
    if (seen.has(p) && !related(seen.get(p), c.id)) {
      fail(`scope collision: ${p} claimed by both ${seen.get(p)} and ${c.id}`)
    }
    seen.set(p, c.id)
  }
}

function related(a, b) {
  const reach = (id, acc = new Set()) => {
    for (const d of byId.get(id).deps) {
      acc.add(d)
      reach(d, acc)
    }
    return acc
  }
  return reach(a).has(b) || reach(b).has(a)
}

// Which card is this branch working?
const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).trim()
const match = /^factory\/(\S+)$/.exec(branch)

if (!match) {
  report()
  process.exit(errors.length ? 1 : 0)
}

const card = byId.get(match[1])
if (!card) {
  fail(`branch ${branch} names no card in tasks/`)
  report()
  process.exit(1)
}

// Prefer a local `main` when there is one (that is the truth during a local
// factory run); fall back to origin/main, which is what CI has on a PR.
const base = process.env.TASK_LINT_BASE ?? (resolves('main') ? 'main' : 'origin/main')

function resolves(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref])
    return true
  } catch {
    return false
  }
}
let changed = []
try {
  changed = git(['diff', '--name-only', `${base}...HEAD`])
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
} catch {
  // No base to compare against (a fresh clone with no remote). Fall back to
  // the working tree so the check still means something locally.
  changed = git(['status', '--porcelain'])
    .split('\n')
    .map((s) => s.slice(3).trim())
    .filter(Boolean)
}

// A scope entry ending in `/` claims the directory: a generated tree like
// android/ is hundreds of files nobody is going to enumerate by hand.
const inScope = (path) =>
  card.scope.some((s) => (s.endsWith('/') ? path.startsWith(s) : s === path))

// A bounce is a success state (AGENTS.md), and the way you bounce is to add
// `tasks/questions/<id>.md` and nothing else. Without this line the lint failed
// the one file the law tells a blocked agent to write — so the correct move
// looked like a broken one, and the agent that took it got a red board for
// obeying. Only your own question file: the exemption is not a door.
const bounce = `tasks/questions/${card.id}.md`

for (const path of changed) {
  if (path === bounce) continue
  if (!inScope(path)) {
    fail(
      `${card.id} touched ${path}, which is not in its scope.\n` +
        `      scope: ${card.scope.length ? card.scope.join(', ') : '(empty — this card writes no code)'}\n` +
        `      If the card genuinely needs this file, STOP and say so in the PR (AGENTS.md law 1).`,
    )
  }
}

// Nobody edits the definition of done (AGENTS.md law 3).
for (const path of changed) {
  if (path.startsWith('tests/acceptance/')) {
    fail(`${card.id} modified ${path} — acceptance tests are not yours (AGENTS.md law 3).`)
  }
}

report()
process.exit(errors.length ? 1 : 0)

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function report() {
  if (!errors.length) {
    console.log(`task-lint: ok (${cards.length} cards${match ? `, branch ${branch}` : ''})`)
    return
  }
  for (const e of errors) console.error(`task-lint: ${e}`)
}
