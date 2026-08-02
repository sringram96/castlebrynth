#!/usr/bin/env node
// H004a · content/*.yaml → content/bundle.json.
//
//   node scripts/build-content.mjs                 # the world
//   node scripts/build-content.mjs --only <path>   # one file, checked
//
// The output is byte-stable — keys sorted, two-space indent, trailing newline
// — so a rebuild that changes nothing changes no bytes, and the bundle
// committed beside the yaml can be trusted to be the yaml.
//
// `--only` compiles one file and reports it; it does not write the bundle. A
// bundle is the whole world (it names the scene a run opens on, and H005
// checks every goto against the scenes that exist), so writing one from a
// single file would quietly truncate it.
//
// On the vocabulary, honestly: the card asks this compiler to validate through
// parseScene (src/core/cards.ts, H003a) so the compiler and the engine can
// never disagree about a word. It cannot. That module is not on main, and a
// plain .mjs under Node 20 cannot import a .ts one without a loader this repo
// does not have and may not grow (RULES.md §7). What follows is parseScene's
// gate copied word for word from VOCAB.md, with the same paths in the same
// messages. It is a second copy of a thing that is meant to have one, and it
// should be deleted in favour of the import the moment one is reachable.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')
const BUNDLE = join(CONTENT, 'bundle.json')

// P0 is one scene, and a run opens on it (CANON.md §the shore).
const START = 'shore'

/** The gate words, as VOCAB.md lists them. A gate is a conjunction of these. */
const GATE_WORDS = ['flag', 'notFlag', 'item', 'notItem']

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

const SCENE_KEYS = ['id', 'line', 'objects']
const OBJECT_KEYS = ['id', 'name', 'actions', 'hidden']
// `gate` selects the branch and `say` produces an Effect; neither is a delta.
const RESPONSE_WORDS = ['gate', 'say', ...DELTA_ORDER]
const UNKNOWN = 'unknown vocabulary word'
const NAMES = 'must be a name or a list of names'

main()

function main() {
  const only = readArgs(process.argv.slice(2))
  const files = only === null ? sceneFiles() : [only]

  const scenes = new Map()
  const source = new Map()
  const errors = []

  for (const file of files) {
    let scene
    try {
      scene = parseScene(yaml.load(readFileSync(resolve(ROOT, file), 'utf8')))
    } catch (e) {
      // RULES.md §3 — the file, then the path inside it, then what is wrong.
      errors.push(`${file}: ${e.message}`)
      continue
    }
    if (scenes.has(scene.id)) {
      errors.push(`${file}: id — the scene id "${scene.id}" is already ${source.get(scene.id)}'s`)
      continue
    }
    scenes.set(scene.id, scene)
    source.set(scene.id, file)
    console.log(`  ${file} — ${scene.id}, ${count(scene.objects.length, 'object')}`)
  }

  if (errors.length) {
    for (const e of errors) console.error(e)
    process.exit(1)
  }

  if (only !== null) {
    console.log('  --only — content/bundle.json not written')
    return
  }

  if (!scenes.has(START)) {
    die(`no scene is named "${START}" — a run has nowhere to open`)
  }

  writeFileSync(BUNDLE, stable({ v: 1, start: START, scenes: Object.fromEntries(scenes) }))
  console.log(`  content/bundle.json — ${count(scenes.size, 'scene')}, opening on ${START}`)
}

function readArgs(args) {
  let only = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--only') die(`unknown argument "${args[i]}"`)
    only = args[++i]
    if (only === undefined) die('--only wants a path')
  }
  return only
}

// Sorted, because readdir order is the filesystem's and the bundle is ours.
function sceneFiles() {
  const names = readdirSync(CONTENT)
    .filter((f) => f.endsWith('.yaml'))
    .sort()
  if (names.length === 0) die('content/ holds no .yaml scenes')
  return names.map((f) => `content/${f}`)
}

/**
 * Byte-stable JSON: keys sorted, two-space indent, trailing newline.
 *
 * Lists keep the order they were written in — a response list is ordered and
 * that order is the meaning (VOCAB.md: the first passing gate wins).
 */
function stable(value) {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (typeof value !== 'object' || value === null) return value
  const out = {}
  for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key])
  return out
}

function count(n, thing) {
  return `${n} ${thing}${n === 1 ? '' : 's'}`
}

// --- the vocabulary gate (parseScene's, copied — see the header) ------------

/** Validates and normalises one already-parsed scene, or throws naming the path. */
function parseScene(raw) {
  if (!isRecord(raw)) throw new Error('the scene is not a mapping')

  for (const key of Object.keys(raw)) {
    if (!SCENE_KEYS.includes(key)) fail(key, UNKNOWN)
  }

  if (!Array.isArray(raw.objects)) fail('objects', 'must be a list of objects')

  return {
    id: text(raw.id, 'id', 'must be a scene id (string)'),
    line: text(raw.line, 'line', 'must be a line (string)'),
    objects: raw.objects.map(parseObject),
  }
}

function parseObject(raw, index) {
  // Until the id is read there is nothing to name the object by, so the path
  // falls back to where it sits in the file.
  const here = `objects[${index}]`
  if (!isRecord(raw)) fail(here, 'must be a mapping')

  const id = text(raw.id, `${here}.id`, 'must be an object id (string)')
  const path = `objects.${id}`

  for (const key of Object.keys(raw)) {
    if (!OBJECT_KEYS.includes(key)) fail(`${path}.${key}`, UNKNOWN)
  }

  const name = text(raw.name, `${path}.name`, 'must be a name (string)')
  if (!isRecord(raw.actions)) fail(`${path}.actions`, 'must be a mapping of action to responses')

  const actions = {}
  for (const action of Object.keys(raw.actions)) {
    actions[action] = parseResponses(raw.actions[action], `${path}.${action}`)
  }

  // An absent word stays absent — the bundle is JSON and JSON has no undefined.
  if (raw.hidden === undefined) return { id, name, actions }
  if (typeof raw.hidden !== 'boolean') fail(`${path}.hidden`, 'must be true or false')
  return { id, name, actions, hidden: raw.hidden }
}

// The path here is the action's — `objects.book.read` — because the vocabulary
// hides the `actions` key from content: an object affords `read`, it does not
// have an `actions` that contains `read`.
function parseResponses(raw, path) {
  if (!Array.isArray(raw)) fail(path, 'must be a list of responses')

  const responses = raw.map((response, index) => parseResponse(response, `${path}[${index}]`))

  // Checked after the responses parse, so a malformed gate is reported as the
  // malformed gate it is rather than as a missing fallback.
  const last = responses[responses.length - 1]
  if (last === undefined || (last.gate !== undefined && Object.keys(last.gate).length > 0)) {
    fail(path, 'a response list must end in a gateless fallback (VOCAB.md)')
  }
  return responses
}

function parseResponse(raw, path) {
  if (!isRecord(raw)) fail(path, 'must be a mapping')

  for (const word of Object.keys(raw)) {
    if (!RESPONSE_WORDS.includes(word)) fail(`${path}.${word}`, UNKNOWN)
  }

  const response = {}
  if (raw.gate !== undefined) response.gate = parseGate(raw.gate, `${path}.gate`)
  if (raw.say !== undefined) response.say = text(raw.say, `${path}.say`, 'must be a line (string)')

  for (const word of DELTA_ORDER) {
    const value = raw[word]
    if (value === undefined) continue
    const at = `${path}.${word}`
    if (word === 'refuse') response.refuse = text(value, at, 'must be a line (string)')
    else if (word === 'goto') response.goto = text(value, at, 'must be a scene id (string)')
    // VOCAB.md writes the rest "(s)": one name or many, and the array is the
    // shape resolve applies, so the author's scalar is normalised here once.
    else response[word] = names(value, at)
  }

  if (response.refuse !== undefined) {
    const other = DELTA_ORDER.find((word) => word !== 'refuse' && response[word] !== undefined)
    if (other !== undefined) {
      fail(path, `refuse may carry no other delta, and carries ${other} (VOCAB.md refuse purity)`)
    }
  }

  return response
}

function parseGate(raw, path) {
  if (!isRecord(raw)) fail(path, 'must be a mapping of conditions')

  const gate = {}
  for (const word of Object.keys(raw)) {
    if (!GATE_WORDS.includes(word)) fail(`${path}.${word}`, UNKNOWN)
    gate[word] = names(raw[word], `${path}.${word}`)
  }
  return gate
}

function names(value, path) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value) && value.every((name) => typeof name === 'string')) return [...value]
  fail(path, NAMES)
}

function text(value, path, what) {
  if (typeof value !== 'string') fail(path, what)
  return value
}

function fail(path, what) {
  throw new Error(`${path} — ${what}`)
}

// Arrays are not records: a scene written as a list has no `id` to read, and
// reading one off would find undefined rather than say what is wrong.
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function die(message) {
  console.error(`build-content: ${message}`)
  process.exit(1)
}
