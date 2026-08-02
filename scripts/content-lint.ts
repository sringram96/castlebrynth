#!/usr/bin/env tsx
// H005 · content-lint. The compiler proves the words are legal; this proves
// the scene is playable.
//
//   npm run content-lint                     # every scene in content/
//   npm run content-lint -- <paths...>       # just these
//
// Five checks, and every one of them is a thing a scene can be while still
// looking finished:
//
//   1. gate satisfiability — a gate that wants a flag nothing sets is a
//      branch no run reaches
//   2. mandatory fallback   — a response list that can fall off the end is a
//      tap that does nothing
//   3. goto targets         — a goto with no scene behind it is a dead end
//   4. refuse purity        — a refusal that changes the world is not a
//      refusal (VOCAB.md §refuse purity)
//   5. banned words         — CANON.md's list, whole-word
//
// Checks 2 and 4 are `parseScene`'s (src/core/cards.ts, H003a) and are not
// re-stated here: a scene is read through the same gate the compiler and the
// engine read it through, and whatever that gate says is what this reports.
// P0 walked the raw yaml tree instead, because a plain .mjs under Node 20
// cannot import a .ts module without a loader the repo did not have; P106
// brought `tsx` in and the walk went with it. Checks 1, 3 and 5 are the ones
// parseScene has no way to make — they are about the world, not the words.
//
// Every failure is reported, not just the first: a scene is authored in one
// pass and should be fixable in one pass. Each names the file and the path
// inside it, in build-content's shape (.llm/rules/vocabulary.mdc). A file
// whose words are wrong is reported and then set aside — there is no scene
// to ask the other three questions of until it parses.
//
// Checks 1 and 3 look across every file given at once — a flag is set in one
// scene and wanted in another, and a goto leaves the file it is written in.
// So linting a subset can only report what that subset can see; `npm run
// content-lint` passes no paths and gets the whole world.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { parseScene } from '../src/core/cards'
import type { Response, Scene } from '../src/core/cards'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')

// CANON.md §banned words, in its four groups and its order.
const BANNED = [
  // Meta — CANON.md bans any reference to games, stats or UI.
  'player', 'game', 'gameplay', 'level', 'quest', 'xp', 'inventory',
  'checkpoint', 'respawn', 'tutorial', 'unlock', 'unlocked', 'menu',
  'health', 'mana', 'stats', 'hp',
  // The narrator observes; it does not tell you what you are having.
  'you feel', 'suddenly', 'mysterious', 'evil', 'creepy',
  // Named below T3 only in TRUTH.md. The cult says "the Morning King".
  'satan', 'devil', 'lucifer',
  // Anachronism.
  'computer', 'phone', 'email', 'internet', 'okay', 'ok',
  // Intensifiers — the world does not editorialise.
  'very', 'really', 'truly', 'literally', 'somehow',
  'amazing', 'awesome', 'incredible', 'epic', 'eerie',
  // Deferral — the tell of a refusal that is a wall rather than a signpost.
  'yet', 'not now', 'later', 'come back',
]

// Whole-word, case-insensitive: "invention" is not "vent", and a two-word
// phrase is two whole words with any run of space between them.
const BANNED_PATTERNS = BANNED.map((word) => ({
  word,
  re: new RegExp(`\\b${word.split(/\s+/).join('\\s+')}\\b`, 'i'),
}))

/** One scene, and the file it was authored in — every failure names both. */
interface Authored {
  readonly file: string
  readonly scene: Scene
}

/** What the world can offer: the scenes that exist, the flags and items a run can come to hold. */
interface World {
  readonly ids: readonly string[]
  readonly flags: readonly string[]
  readonly items: readonly string[]
}

main()

function main(): void {
  const files = process.argv.length > 2 ? process.argv.slice(2) : sceneFiles()
  const errors: string[] = []

  // Read first, check second: satisfiability and goto are questions about the
  // whole set, so nothing can be judged until all of it is on the table.
  const authored: Authored[] = []
  for (const file of files) {
    try {
      authored.push({ file, scene: parseScene(yaml.load(readFileSync(resolve(ROOT, file), 'utf8'))) })
    } catch (e) {
      errors.push(`${file}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const world = survey(authored)
  for (const scene of authored) check(scene, world, errors)

  if (errors.length) {
    for (const e of errors) console.error(e)
    console.error(`content-lint: ${count(errors.length, 'failure')} in ${count(files.length, 'file')}`)
    process.exit(1)
  }

  console.log(`content-lint: ok (${count(authored.length, 'scene')})`)
}

// Sorted, because readdir order is the filesystem's and a report is ours.
function sceneFiles(): string[] {
  const names = readdirSync(CONTENT)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
  if (names.length === 0) die('content/ holds no .yaml scenes')
  return names.map((f) => `content/${f}`)
}

function survey(authored: readonly Authored[]): World {
  const ids: string[] = []
  const flags: string[] = []
  const items: string[] = []

  for (const { scene } of authored) {
    ids.push(scene.scene)
    for (const response of responses(scene)) {
      flags.push(...(response.set ?? []))
      items.push(...(response.give ?? []))
    }
  }
  return { ids, flags, items }
}

function check({ file, scene }: Authored, world: World, errors: string[]): void {
  const fail = (path: string, what: string): void => {
    errors.push(`${file}: ${path} — ${what}`)
  }
  const prose = (path: string, texts: readonly string[]): void => {
    for (const text of texts) {
      for (const { word, re } of BANNED_PATTERNS) {
        // The offending line is not quoted back: the banned word is the whole
        // of the finding, and echoing the line buries it in the sentence it
        // came from.
        if (re.test(text)) fail(path, `banned word "${word}" (CANON.md)`)
      }
    }
  }

  // CANON.md bans these words in every authored string. `journal` is an entry
  // id now, not prose, so it is not scanned — the entry it names is.
  prose('enter', [scene.enter])

  for (const object of scene.objects) {
    // The free tap is the line a player reads most often (GAME.md #input).
    prose(`objects.${object.id}.tap`, [object.tap])

    for (const [action, list] of Object.entries(object.actions)) {
      // The path is the action's — `objects.book.read` — because the
      // vocabulary hides the `actions` key from content: an object affords
      // `read`, it does not have an `actions` that contains `read`.
      const path = `objects.${object.id}.${action}`

      list.forEach((response, index) => {
        const here = `${path}[${index}]`

        prose(`${here}.say`, [response.say])

        for (const flag of response.if?.flags ?? []) {
          if (!world.flags.includes(flag)) fail(`${here}.if.flags`, `nothing sets the flag "${flag}"`)
        }
        for (const item of response.if?.items ?? []) {
          if (!world.items.includes(item)) fail(`${here}.if.items`, `nothing grants the item "${item}"`)
        }

        if (response.goto !== undefined && !world.ids.includes(response.goto)) {
          fail(`${here}.goto`, `no scene is named "${response.goto}"`)
        }
      })
    }
  }
}

/** Every response in a scene, flattened — the survey does not care where they sit. */
function responses(scene: Scene): readonly Response[] {
  const all: Response[] = []
  for (const object of scene.objects) {
    for (const list of Object.values(object.actions)) all.push(...list)
  }
  return all
}

function count(n: number, thing: string): string {
  return `${n} ${thing}${n === 1 ? '' : 's'}`
}

function die(what: string): never {
  console.error(`content-lint: ${what}`)
  process.exit(1)
}
