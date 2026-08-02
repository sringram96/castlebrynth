// Shared card loading. Used by task-lint, board and progress.
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TASKS = join(ROOT, 'tasks')

export function loadCards() {
  const cards = readdirSync(TASKS)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const card = yaml.load(readFileSync(join(TASKS, f), 'utf8'))
      if (!card || typeof card !== 'object') throw new Error(`tasks/${f}: not a mapping`)
      for (const key of ['id', 'title', 'deps']) {
        if (!(key in card)) throw new Error(`tasks/${f}: missing "${key}"`)
      }
      if (!Array.isArray(card.deps)) throw new Error(`tasks/${f}: "deps" must be a list`)
      if (!Array.isArray(card.scope)) throw new Error(`tasks/${f}: "scope" must be a list`)
      return { ...card, file: `tasks/${f}` }
    })

  const byId = new Map(cards.map((c) => [c.id, c]))
  for (const c of cards) {
    for (const d of c.deps) {
      if (!byId.has(d)) throw new Error(`${c.file}: dep "${d}" names no card`)
    }
  }

  // Cycle check — a factory that deadlocks at 3am is nobody's friend.
  const state = new Map()
  const visit = (id, trail) => {
    if (state.get(id) === 'done') return
    if (state.get(id) === 'open') {
      throw new Error(`dependency cycle: ${[...trail, id].join(' -> ')}`)
    }
    state.set(id, 'open')
    for (const d of byId.get(id).deps) visit(d, [...trail, id])
    state.set(id, 'done')
  }
  for (const c of cards) visit(c.id, [])

  return cards.sort((a, b) => a.id.localeCompare(b.id))
}

// Kahn layering — everything in a wave can run at once.
export function waves(cards) {
  const byId = new Map(cards.map((c) => [c.id, c]))
  const depth = new Map()
  const of = (id) => {
    if (depth.has(id)) return depth.get(id)
    const c = byId.get(id)
    const d = c.deps.length === 0 ? 0 : Math.max(...c.deps.map(of)) + 1
    depth.set(id, d)
    return d
  }
  cards.forEach((c) => of(c.id))
  const out = []
  for (const c of cards) {
    const d = depth.get(c.id)
    ;(out[d] ??= []).push(c)
  }
  return out
}
