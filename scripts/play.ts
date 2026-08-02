#!/usr/bin/env tsx
// H008 · the loop, in your hands. Ugly on purpose — a harness, not a shell.
//
//   npm run play -- --seed 42
//
// Print the scene, number every tap it affords, read a line, act, print what
// the world said. A line is either a number off the list or `<object> <action>`
// — the list prints the second form, so the number is a shortcut for a thing
// you can always type out. `quit` stops. Anything unreadable reprints the list
// rather than crashing: you are meant to be able to lean on the keyboard.
//
// Everything below the printing is the engine's. P0 could not reach it — a
// plain .mjs under Node 20 cannot import a .ts module without a loader the
// repo did not have — so this file carried a small engine of its own and said
// so in its header. It had already drifted: it dropped the `say` on a
// refusing branch which resolve.ts now carries on the refusal itself, and no shore refusal carried
// one, so nothing showed. P106 brought `tsx` in and deleted it. What is left
// here is a terminal: `loadBundle`, `createGame`, and the four Effects turned
// into lines.
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { createGame } from '../src/core/api'
import type { ActionRef, Effect, View } from '../src/core/api-types'
import { loadBundle } from '../src/core/bundle'
import type { Bundle } from '../src/core/cards'
import { refKey } from '../src/core/types'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUNDLE = join(ROOT, 'content', 'bundle.json')

// Nothing in P0's vocabulary draws from the generator, so every run is the
// same run whatever you pass. The seed is carried anyway because GameState
// carries it, and the day a word does draw, this is where it comes in.
const DEFAULT_SEED = 1

main()

function main(): void {
  const seed = readArgs(process.argv.slice(2))
  const game = createGame(readBundle())

  let state = game.newRun(seed)
  let menu = present(game.getView(state))

  const rl = createInterface({ input: process.stdin, terminal: false })

  rl.on('line', (raw: string) => {
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
      const turn = game.act(state, ref)
      state = turn.state
      // An unknown object or an action it does not afford resolves to nothing
      // at all, which would otherwise look exactly like a working tap.
      if (turn.effects.length === 0) console.log(`  (nothing answers to ${refKey(ref)})`)
      for (const effect of turn.effects) report(effect)
    }

    menu = present(game.getView(state))
  })

  // No process.exit: stdout is a pipe under the acceptance and exiting on the
  // spot would cut the transcript off mid-write. Let the loop drain.
  rl.on('close', () => process.stdin.pause())
}

function readArgs(args: readonly string[]): number {
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

/**
 * The compiled world, checked as hard as the engine checks it.
 *
 * `loadBundle` (H004b) is the same gate a shell comes through, so a stale or
 * hand-edited bundle.json is refused here rather than half-played.
 */
function readBundle(): Bundle {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(BUNDLE, 'utf8'))
  } catch {
    die('content/bundle.json is missing or unreadable — run npm run build:content')
  }
  try {
    return loadBundle(parsed)
  } catch (e) {
    die(`content/bundle.json: ${e instanceof Error ? e.message : String(e)}`)
  }
}

// --- what the person sees ----------------------------------------------------

/** Prints the scene and its taps, numbered, and returns them in that order. */
function present(view: View): readonly ActionRef[] {
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
function taps(view: View): readonly ActionRef[] {
  return view.objects.flatMap((object) =>
    object.actions.map((action) => ({ object: object.id, action })),
  )
}

// say and refuse are both the world speaking and print as themselves. The
// parenthetical after a refusal is the harness, not the world: it names the
// ledger key, which is the whole reason to run this thing by hand.
function report(effect: Effect): void {
  if (effect.kind === 'say') console.log(`  ${effect.text}`)
  else if (effect.kind === 'refused') {
    console.log(`  ${effect.line}`)
    console.log(`  (refused — ${refKey(effect.ref)})`)
  } else if (effect.kind === 'journal') console.log(`  (journal + ${effect.entry})`)
  else if (effect.kind === 'end') {
    console.log(`\n  ${effect.line}`)
    if (effect.note !== undefined) console.log(`  (${effect.note})`)
  } else console.log(`  (enter ${effect.scene})`)
}

/** A menu number or `<object> <action>`. Anything else is nothing. */
function read(line: string, menu: readonly ActionRef[]): ActionRef | null {
  if (/^\d+$/.test(line)) return menu[Number(line) - 1] ?? null
  const [object, action, ...rest] = line.split(/\s+/).filter(Boolean)
  if (object === undefined || action === undefined || rest.length > 0) return null
  return { object, action }
}

function die(what: string): never {
  console.error(`play: ${what}`)
  process.exit(1)
}
