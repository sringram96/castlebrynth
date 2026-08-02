#!/usr/bin/env node
// H008 · the loop, in your hands. Ugly on purpose — a harness, not a shell.
//
//   node scripts/play.mjs [--seed 42]
//
// Print the scene, number every tap it affords, read a line, act, print what
// the world said. A line is either a number off the list or `<object> <action>`
// — the list prints the second form, so the number is a shortcut for a thing
// you can always type out. `quit` stops. Anything unreadable reprints the list
// rather than crashing: you are meant to be able to lean on the keyboard.
//
// On the engine below, honestly: the card asks this to hand the parsed bundle
// to loadBundle (src/core/bundle.ts, H004b) and play through the API
// (src/core/api.ts, H006b). It cannot. Neither module is on main, and a plain
// .mjs under Node 20 could not import a .ts one even if they were, without a
// loader this repo does not have and may not grow (.llm/rules/no-dead-scaffolding.mdc).
// build-content.mjs stands in the same place and took the same way out. What
// follows is the smallest engine that plays VOCAB.md as written — first
// passing gate, deltas in DELTA_ORDER, a refusal ledgered once and changing
// nothing else, the object set folded out of the reserved flags. It is a
// second copy of a thing meant to have exactly one, and it should be deleted
// in favour of the import the moment one is reachable.
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE = join(ROOT, 'content', 'bundle.json')

// Nothing in P0's vocabulary draws from the generator, so every run is the
// same run whatever you pass. The seed is carried anyway because GameState
// carries it, and the day a word does draw, this is where it comes in.
const DEFAULT_SEED = 1

/** The delta words in application order — VOCAB.md's table, top to bottom. */
const DELTA_ORDER = [
  'refuse',
  'setFlag',
  'clearFlag',
  'addItem',
  'removeItem',
  'addObject',
  'removeObject',
  'journal',
  'goto',
]

// H006a's reserved prefixes: the object set is not an eighth key on GameState,
// it is a fold over the flags.
const ADDED = 'obj+:'
const REMOVED = 'obj-:'

main()

function main() {
  const seed = readArgs(process.argv.slice(2))
  const bundle = loadBundle(readBundle())

  let state = newRun(seed, bundle)
  let menu = present(getView(bundle, state))

  const rl = createInterface({ input: process.stdin, terminal: false })

  rl.on('line', (raw) => {
    // Closes the prompt line. A terminal has already echoed the newline the
    // person typed; a pipe has not, and without this the world's answer lands
    // on the end of the prompt.
    console.log('')

    const line = raw.trim()
    if (line === 'quit') {
      rl.close()
      return
    }

    const ref = read(line, menu)
    if (ref === null) {
      console.log('  (unreadable — a number, "<object> <action>", or "quit")')
    } else {
      const turn = act(bundle, state, ref)
      state = turn.state
      // An unknown object or an action it does not afford resolves to nothing
      // at all, which would otherwise look exactly like a working tap.
      if (turn.effects.length === 0) console.log(`  (nothing answers to ${refKey(ref)})`)
      for (const effect of turn.effects) report(effect)
    }

    menu = present(getView(bundle, state))
  })

  // No process.exit: stdout is a pipe under the acceptance and exiting on the
  // spot would cut the transcript off mid-write. Let the loop drain.
  rl.on('close', () => process.stdin.pause())
}

function readArgs(args) {
  let seed = DEFAULT_SEED
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--seed') die(`unknown argument "${args[i]}"`)
    const value = args[++i]
    if (value === undefined) die('--seed wants a number')
    seed = Number(value)
    if (!Number.isInteger(seed)) die(`--seed wants a whole number, not "${value}"`)
  }
  return seed
}

function readBundle() {
  try {
    return JSON.parse(readFileSync(BUNDLE, 'utf8'))
  } catch {
    die('content/bundle.json is missing or unreadable — run npm run build:content')
  }
}

// --- what the person sees ----------------------------------------------------

/** Prints the scene and its taps, numbered, and returns them in that order. */
function present(view) {
  const menu = taps(view)

  console.log('')
  console.log(`${view.scene} — ${view.line}`)
  console.log('')
  menu.forEach((tap, index) => console.log(`  ${index + 1}) ${tap.object} ${tap.action}`))
  console.log('')
  process.stdout.write('> ')

  return menu
}

/** One row per tap, not per object: a number has to name a thing you can do. */
function taps(view) {
  return view.objects.flatMap((object) =>
    object.actions.map((action) => ({ object: object.id, action })),
  )
}

// say and refuse are both the world speaking and print as themselves. The
// parenthetical after a refusal is the harness, not the world: it names the
// ledger key, which is the whole reason to run this thing by hand.
function report(effect) {
  if (effect.kind === 'say') console.log(`  ${effect.text}`)
  else if (effect.kind === 'refused') {
    console.log(`  ${effect.line}`)
    console.log(`  (refused — ${refKey(effect.ref)})`)
  } else if (effect.kind === 'journal') console.log(`  (journal + ${effect.entry})`)
  else if (effect.kind === 'enter') console.log(`  (enter ${effect.scene})`)
}

/** A menu number or `<object> <action>`. Anything else is nothing. */
function read(line, menu) {
  if (/^\d+$/.test(line)) return menu[Number(line) - 1] ?? null
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length !== 2) return null
  return { object: words[0], action: words[1] }
}

// --- the engine (api.ts's and resolve.ts's, copied — see the header) ---------

/**
 * Validates a parsed bundle far enough to play it, or dies.
 *
 * Not as far as H004b's loadBundle: every scene here came through
 * build-content's parseScene on the way to disk, so the words are already
 * known to be VOCAB.md's. What is checked is what a stale or hand-edited
 * bundle.json gets wrong — the version, and a start with no scene behind it.
 */
function loadBundle(raw) {
  if (!isRecord(raw)) die('content/bundle.json is not a bundle')
  if (raw.v !== 1) die(`content/bundle.json is v${raw.v}, and this build plays v1`)
  if (!isRecord(raw.scenes)) die('content/bundle.json has no scenes')
  if (!isRecord(raw.scenes[raw.start])) die(`no scene is named "${raw.start}" — a run has nowhere to open`)
  return raw
}

/** A fresh run: the bundle's start scene, the given seed, nothing remembered. */
function newRun(seed, bundle) {
  return {
    scene: bundle.start,
    flags: [],
    items: [],
    journal: [],
    refused: [],
    rng: seed >>> 0,
    seed,
  }
}

function getView(bundle, state) {
  const scene = sceneOf(bundle, state)
  return {
    line: scene.line,
    scene: scene.id,
    objects: visible(scene, state).map((object) => ({
      id: object.id,
      actions: Object.keys(object.actions),
    })),
  }
}

/**
 * One tap. Returns the state it was handed, untouched, plus what it produced.
 *
 * An object that is not in view, or an action it does not afford, is a no-op
 * and not a throw — the harness lets you type anything and this is where most
 * of that lands.
 */
function act(bundle, state, ref) {
  const object = visible(sceneOf(bundle, state), state).find((o) => o.id === ref.object)
  const responses = object?.actions[ref.action]
  if (!Array.isArray(responses)) return { state, effects: [] }

  // The first response whose gate passes. Not the best, not the most specific.
  const response = responses.find((r) => passes(state, r.gate))
  if (response === undefined) return { state, effects: [] }

  // A refusal applies and stops: the ledger, once, and nothing else moves
  // (VOCAB.md §refuse purity).
  if (response.refuse !== undefined) {
    return {
      state: { ...state, refused: withMember(state.refused, refKey(ref)) },
      effects: [{ kind: 'refused', ref, line: response.refuse }],
    }
  }

  let next = state
  const effects = []
  // say is not a delta — it is the line the narrator speaks for this branch.
  if (response.say !== undefined) effects.push({ kind: 'say', text: response.say })

  // DELTA_ORDER, top to bottom, whatever order the file wrote the keys in.
  // This is the whole reason the order is a table and not a convention.
  for (const word of DELTA_ORDER) {
    const value = response[word]
    if (value === undefined) continue

    if (word === 'setFlag') for (const f of value) next = { ...next, flags: withMember(next.flags, f) }
    else if (word === 'clearFlag') for (const f of value) next = { ...next, flags: without(next.flags, f) }
    else if (word === 'addItem') for (const i of value) next = { ...next, items: withMember(next.items, i) }
    else if (word === 'removeItem') for (const i of value) next = { ...next, items: without(next.items, i) }
    else if (word === 'addObject') for (const o of value) next = { ...next, flags: withMember(next.flags, ADDED + o) }
    else if (word === 'removeObject') for (const o of value) next = { ...next, flags: withMember(next.flags, REMOVED + o) }
    else if (word === 'journal') {
      for (const entry of value) {
        next = { ...next, journal: [...next.journal, entry] }
        effects.push({ kind: 'journal', entry })
      }
    } else if (word === 'goto') {
      next = { ...next, scene: value }
      effects.push({ kind: 'enter', scene: value })
    }
  }

  return { state: next, effects }
}

/** A gate is a conjunction; an absent or empty one is the fallback. */
function passes(state, gate) {
  if (gate === undefined) return true
  return (
    (gate.flag ?? []).every((f) => state.flags.includes(f)) &&
    (gate.notFlag ?? []).every((f) => !state.flags.includes(f)) &&
    (gate.item ?? []).every((i) => state.items.includes(i)) &&
    (gate.notItem ?? []).every((i) => !state.items.includes(i))
  )
}

/**
 * The scene's object set: what it was authored with, minus the hidden, plus
 * every addObject, minus every removeObject. Nothing else moves it — a flag on
 * its own never does (LAWS.md §affordance).
 */
function visible(scene, state) {
  return scene.objects
    .filter((o) => o.hidden !== true || state.flags.includes(ADDED + o.id))
    .filter((o) => !state.flags.includes(REMOVED + o.id))
}

function sceneOf(bundle, state) {
  const scene = bundle.scenes[state.scene]
  if (!isRecord(scene)) die(`the run is in "${state.scene}", and no scene is named that`)
  return scene
}

/** The ledger key for an action: `book` + `read` is `book.read`. */
function refKey(ref) {
  return `${ref.object}.${ref.action}`
}

// Never in place: the state handed in is not ours to touch (.llm/rules/purity.mdc).
function withMember(list, member) {
  return list.includes(member) ? list : [...list, member]
}

function without(list, member) {
  return list.filter((m) => m !== member)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function die(message) {
  console.error(`play: ${message}`)
  process.exit(1)
}
