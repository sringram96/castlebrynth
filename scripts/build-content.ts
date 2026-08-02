#!/usr/bin/env tsx
// H004a · content/*.yaml → content/bundle.json.
//
//   npm run build:content                    # the world
//   npm run build:content -- --only <path>   # one file, checked
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
// On the vocabulary: it is `parseScene`'s, and only ever `parseScene`'s
// (src/core/cards.ts, H003a). P0 could not reach that module — a plain .mjs
// under Node 20 cannot import a .ts one without a loader the repo did not
// have — so this file carried the gate itself and said so in its header.
// P106 brought `tsx` in and deleted it. The compiler and the engine now read
// one file, and can no longer disagree about a word.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'
import { parseScene } from '../src/core/cards'
import type { Scene } from '../src/core/cards'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')
const BUNDLE = join(CONTENT, 'bundle.json')

// P0 is one scene, and a run opens on it (CANON.md §the shore).
const START = 'crossing'

main()

function main(): void {
  const only = readArgs(process.argv.slice(2))
  const files = only === null ? sceneFiles() : [only]

  const scenes = new Map<string, Scene>()
  const source = new Map<string, string>()
  const errors: string[] = []

  for (const file of files) {
    let scene: Scene
    // The bundle holds the NORMALISED scene. parseScene accepts both that and
    // the authored mapping, so the artefact passes back through the same gate
    // the compiler used (.llm/rules/vocabulary.mdc).
    try {
      scene = parseScene(yaml.load(readFileSync(resolve(ROOT, file), 'utf8')))
    } catch (e) {
      // .llm/rules/vocabulary.mdc — the file, then the path inside it, then what is wrong.
      errors.push(`${file}: ${reason(e)}`)
      continue
    }
    if (scenes.has(scene.scene)) {
      errors.push(`${file}: id — the scene id "${scene.scene}" is already ${source.get(scene.scene)}'s`)
      continue
    }
    scenes.set(scene.scene, scene)
    source.set(scene.scene, file)
    console.log(`  ${file} — ${scene.scene}, ${count(scene.objects.length, 'object')}`)
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

function readArgs(args: readonly string[]): string | null {
  let only: string | null = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] !== '--only') die(`unknown argument "${args[i]}"`)
    const path = args[++i]
    if (path === undefined) die('--only wants a path')
    only = path
  }
  return only
}

// Sorted, because readdir order is the filesystem's and the bundle is ours.
function sceneFiles(): string[] {
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
function stable(value: unknown): string {
  return `${JSON.stringify(sortKeys(value), null, 2)}\n`
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (!isRecord(value)) return value
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key])
  return out
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function count(n: number, thing: string): string {
  return `${n} ${thing}${n === 1 ? '' : 's'}`
}

// parseScene throws an Error naming the path inside the file; anything else
// that lands here came out of js-yaml and is reported as it stands.
function reason(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function die(what: string): never {
  console.error(`build-content: ${what}`)
  process.exit(1)
}
