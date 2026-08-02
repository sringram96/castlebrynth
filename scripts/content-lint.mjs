#!/usr/bin/env node
// H005 · content-lint. The compiler proves the words are legal; this proves
// the scene is playable.
//
//   node scripts/content-lint.mjs                  # every scene in content/
//   node scripts/content-lint.mjs <paths...>       # just these
//
// Five checks, and every one of them is a thing a scene can be while still
// compiling clean:
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
// Every failure is reported, not just the first: a scene is authored in one
// pass and should be fixable in one pass. Each names the file and the path
// inside it, in build-content's shape (RULES.md §3).
//
// Checks 1 and 3 look across every file given at once — a flag is set in one
// scene and wanted in another, and a goto leaves the file it is written in.
// So linting a subset can only report what that subset can see; `npm run
// content-lint` passes no paths and gets the whole world.
//
// On reading the yaml itself: this walks the raw tree rather than compiling
// through build-content.mjs, which runs its build on import and is another
// card's file. The walk is deliberately incurious — anything shaped wrong is
// skipped, because the vocabulary is the compiler's to enforce and a second
// opinion about it here could only ever disagree with the first.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')

/** The authored strings, as CANON.md §banned words lists them. */
const PROSE_WORDS = ['say', 'refuse', 'journal', 'line', 'enter']

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

// CANON.md §banned words, in its four groups and its order.
const BANNED = [
  // Meta — breaks the frame.
  'player', 'game', 'gameplay', 'level', 'quest', 'xp', 'inventory',
  'checkpoint', 'respawn', 'tutorial', 'unlock', 'unlocked', 'menu',
  // Anachronism — Brynth has none of these.
  'computer', 'phone', 'email', 'internet', 'okay', 'ok',
  // Intensifiers — the world does not editorialise.
  'very', 'really', 'truly', 'literally', 'suddenly', 'somehow',
  'amazing', 'awesome', 'incredible', 'epic', 'mysterious', 'eerie',
  // Deferral — the tell of a refusal that is a wall (LAWS.md §refusal).
  'yet', 'not now', 'later', 'come back',
]

// Whole-word, case-insensitive: "invention" is not "vent", and a two-word
// phrase is two whole words with any run of space between them.
const BANNED_PATTERNS = BANNED.map((word) => ({
  word,
  re: new RegExp(`\\b${word.split(/\s+/).join('\\s+')}\\b`, 'i'),
}))

main()

function main() {
  const files = process.argv.length > 2 ? process.argv.slice(2) : sceneFiles()
  const errors = []

  // Read first, check second: satisfiability and goto are questions about the
  // whole set, so nothing can be judged until all of it is on the table.
  const scenes = []
  for (const file of files) {
    let raw
    try {
      raw = yaml.load(readFileSync(resolve(ROOT, file), 'utf8'))
    } catch (e) {
      errors.push(`${file}: ${e.message}`)
      continue
    }
    if (!isRecord(raw) || !Array.isArray(raw.objects)) {
      errors.push(`${file}: not a scene this lint can read — run npm run build:content`)
      continue
    }
    scenes.push({ file, raw })
  }

  const world = survey(scenes)
  for (const scene of scenes) check(scene, world, errors)

  if (errors.length) {
    for (const e of errors) console.error(e)
    console.error(`content-lint: ${count(errors.length, 'failure')} in ${count(files.length, 'file')}`)
    process.exit(1)
  }

  console.log(`content-lint: ok (${count(scenes.length, 'scene')})`)
}

// Sorted, because readdir order is the filesystem's and a report is ours.
function sceneFiles() {
  const names = readdirSync(CONTENT)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
  if (names.length === 0) die('content/ holds no .yaml scenes')
  return names.map((f) => `content/${f}`)
}

/** What the world can offer: the scenes that exist, the flags and items a run can come to hold. */
function survey(scenes) {
  const ids = []
  const flags = []
  const items = []

  for (const { raw } of scenes) {
    if (typeof raw.id === 'string') ids.push(raw.id)
    for (const object of objects(raw)) {
      for (const [, responses] of actions(object)) {
        for (const response of responses.filter(isRecord)) {
          // `notFlag`/`notItem` want a thing absent, and everything is absent
          // at the start of a run — only the positive want needs granting.
          for (const flag of names(response.setFlag)) flags.push(flag)
          for (const item of names(response.addItem)) items.push(item)
        }
      }
    }
  }
  return { ids, flags, items }
}

function check({ file, raw }, world, errors) {
  const fail = (path, what) => errors.push(`${file}: ${path} — ${what}`)
  const prose = (path, value) => {
    for (const text of names(value)) {
      for (const { word, re } of BANNED_PATTERNS) {
        // The offending line is not quoted back: the banned word is the whole
        // of the finding, and echoing the line buries it in the sentence it
        // came from.
        if (re.test(text)) fail(path, `banned word "${word}" (CANON.md)`)
      }
    }
  }

  if (raw.line !== undefined) prose('line', raw.line)

  for (const object of objects(raw)) {
    const at = `objects.${object.id}`

    for (const [action, responses] of actions(object)) {
      const path = `${at}.${action}`

      responses.forEach((response, index) => {
        if (!isRecord(response)) return
        const here = `${path}[${index}]`

        for (const word of PROSE_WORDS) {
          if (response[word] !== undefined) prose(`${here}.${word}`, response[word])
        }

        if (isRecord(response.gate)) {
          for (const flag of names(response.gate.flag)) {
            if (!world.flags.includes(flag)) {
              fail(`${here}.gate.flag`, `nothing sets the flag "${flag}"`)
            }
          }
          for (const item of names(response.gate.item)) {
            if (!world.items.includes(item)) {
              fail(`${here}.gate.item`, `nothing grants the item "${item}"`)
            }
          }
        }

        if (typeof response.goto === 'string' && !world.ids.includes(response.goto)) {
          fail(`${here}.goto`, `no scene is named "${response.goto}"`)
        }

        if (response.refuse !== undefined) {
          for (const word of DELTA_ORDER) {
            if (word !== 'refuse' && response[word] !== undefined) {
              fail(here, `refuse carries ${word}, and a refusal changes nothing (VOCAB.md §refuse purity)`)
            }
          }
        }
      })

      const last = responses[responses.length - 1]
      const gated =
        last === undefined || (isRecord(last) && isRecord(last.gate) && Object.keys(last.gate).length > 0)
      if (gated) {
        fail(path, 'a response list must end in a gateless fallback (VOCAB.md)')
      }
    }
  }
}

// --- reading the tree, incuriously ------------------------------------------

function objects(raw) {
  return raw.objects.filter((o) => isRecord(o) && typeof o.id === 'string' && isRecord(o.actions))
}

function actions(object) {
  return Object.entries(object.actions).filter(([, responses]) => Array.isArray(responses))
}

/** VOCAB.md writes most arguments "(s)": one name or many. Absent is none. */
function names(value) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string')
  return []
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function count(n, thing) {
  return `${n} ${thing}${n === 1 ? '' : 's'}`
}

function die(message) {
  console.error(`content-lint: ${message}`)
  process.exit(1)
}
