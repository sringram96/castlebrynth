// The content card schema — exactly VOCAB.md, nothing else
// (.llm/rules/vocabulary.mdc).
//
// A scene lists objects; every object is tappable for its whole lifetime in the
// scene (.llm/rules/affordance.mdc). An object's `tap` is the free tap: it
// describes, and it never advances the world (GAME.md #input). Risk lives in
// the actions the tap surfaces, never in the tap itself.
//
// parseScene is the only gate, and both the compiler and the loader come
// through it — so the two can never disagree about what a word is. Unknown
// words fail here, at load, naming the path. Never silently at play.

/** The `if` of a response. Every condition listed must hold. */
export const GATE_WORDS = ['flags', 'items'] as const
export type GateWord = (typeof GATE_WORDS)[number]

/**
 * The `then`, applied in this order within a response. All optional except
 * `say`. The order is the contract: it is what makes two authors who write the
 * same response produce the same run.
 */
export const DELTA_ORDER = [
  'say',
  'set',
  'give',
  'take',
  'journal',
  'refuse',
  'goto',
  'addObject',
  'removeObject',
  'end',
] as const
export type DeltaWord = (typeof DELTA_ORDER)[number]

/**
 * Reserved for later waves — dice, death, QTEs, chance, economies, sanity.
 * Known here only so that using one fails loudly with the reason, instead of
 * failing as an anonymous unknown word (VOCAB.md).
 */
export const RESERVED_WORDS = [
  'contest',
  'dropObols',
  'prompt',
  'roll',
  'counter',
  'lies',
] as const

export type Gate = { readonly [W in GateWord]?: readonly string[] }

/** An affordance change. The `cause` is required by law, not decoration. */
export interface ObjectDelta {
  readonly scene: string
  readonly object: string
  readonly cause: string
}

export interface EndDelta {
  readonly line: string
  readonly note?: string
}

export interface Response {
  /** Absent or empty is the fallback, which every action must end with. */
  readonly if?: Gate
  readonly say: string
  readonly set?: readonly string[]
  readonly give?: readonly string[]
  readonly take?: readonly string[]
  /** A journal entry id, not prose (LAWS.md #consequences). */
  readonly journal?: string
  /** True logs the refusal and means nothing else fired. */
  readonly refuse?: true
  readonly goto?: string
  readonly addObject?: ObjectDelta
  readonly removeObject?: ObjectDelta
  readonly end?: EndDelta
}

export interface ObjectCard {
  readonly id: string
  /** The free tap. Describes; never advances the world (GAME.md #input). */
  readonly tap: string
  readonly actions: Readonly<Record<string, readonly Response[]>>
  /** In the file but not in the scene until an addObject brings it in. */
  readonly hidden?: boolean
}

export interface Scene {
  readonly scene: string
  /** The line on arriving. */
  readonly enter: string
  /** The knowledge tier this scene may speak from (CANON.md, LAWS.md #spoiler). */
  readonly tier?: string
  readonly objects: readonly ObjectCard[]
}

export interface Bundle {
  readonly v: 1
  readonly start: string
  readonly scenes: Readonly<Record<string, Scene>>
}

const GATES: readonly string[] = GATE_WORDS
const DELTAS: readonly string[] = DELTA_ORDER
const RESERVED: readonly string[] = RESERVED_WORDS

function fail(path: string, msg: string): never {
  throw new Error(`${path} — ${msg}`)
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Scalar or list → list, so everything downstream sees one shape. */
const strings = (v: unknown, path: string): readonly string[] => {
  if (typeof v === 'string') return [v]
  if (Array.isArray(v)) {
    return v.map((x, i) =>
      typeof x === 'string' ? x : fail(`${path}[${i}]`, 'expected a string'),
    )
  }
  return fail(path, 'expected a string or a list of strings')
}

const str = (v: unknown, path: string): string =>
  typeof v === 'string' ? v : fail(path, 'expected a string')

const objectDelta = (v: unknown, path: string): ObjectDelta => {
  if (!isRecord(v)) return fail(path, 'expected {scene, object, cause}')
  for (const key of Object.keys(v)) {
    if (!['scene', 'object', 'cause'].includes(key)) {
      fail(`${path}.${key}`, 'unknown key — expected scene, object, cause')
    }
  }
  return {
    scene: str(v['scene'], `${path}.scene`),
    object: str(v['object'], `${path}.object`),
    cause: str(v['cause'], `${path}.cause`),
  }
}

const parseGate = (v: unknown, path: string): Gate => {
  if (!isRecord(v)) return fail(path, 'expected a mapping of gate words')
  const gate: { -readonly [W in GateWord]?: readonly string[] } = {}
  for (const [word, arg] of Object.entries(v)) {
    if (!GATES.includes(word)) {
      fail(`${path}.${word}`, `unknown vocabulary word (gates: ${GATES.join(', ')})`)
    }
    gate[word as GateWord] = strings(arg, `${path}.${word}`)
  }
  return gate
}

const OTHER_DELTAS = [
  'set',
  'give',
  'take',
  'journal',
  'goto',
  'addObject',
  'removeObject',
  'end',
] as const

const parseResponse = (raw: unknown, path: string): Response => {
  if (!isRecord(raw)) return fail(path, 'expected a mapping')

  for (const key of Object.keys(raw)) {
    if (key === 'if') continue
    if (RESERVED.includes(key)) {
      fail(`${path}.${key}`, 'reserved for a later wave — see VOCAB.md; do not use')
    }
    if (!DELTAS.includes(key)) fail(`${path}.${key}`, 'unknown vocabulary word')
  }

  if (raw['say'] === undefined) fail(path, 'every response must say something')

  const out: { -readonly [K in keyof Response]: Response[K] } = {
    say: str(raw['say'], `${path}.say`),
  }
  if (raw['if'] !== undefined) out.if = parseGate(raw['if'], `${path}.if`)
  if (raw['set'] !== undefined) out.set = strings(raw['set'], `${path}.set`)
  if (raw['give'] !== undefined) out.give = strings(raw['give'], `${path}.give`)
  if (raw['take'] !== undefined) out.take = strings(raw['take'], `${path}.take`)
  if (raw['journal'] !== undefined) out.journal = str(raw['journal'], `${path}.journal`)
  if (raw['goto'] !== undefined) out.goto = str(raw['goto'], `${path}.goto`)
  if (raw['addObject'] !== undefined) {
    out.addObject = objectDelta(raw['addObject'], `${path}.addObject`)
  }
  if (raw['removeObject'] !== undefined) {
    out.removeObject = objectDelta(raw['removeObject'], `${path}.removeObject`)
  }
  if (raw['end'] !== undefined) {
    const end = raw['end']
    if (!isRecord(end)) fail(`${path}.end`, 'expected {line, note?}')
    const parsed: { -readonly [K in keyof EndDelta]: EndDelta[K] } = {
      line: str(end['line'], `${path}.end.line`),
    }
    if (end['note'] !== undefined) parsed.note = str(end['note'], `${path}.end.note`)
    out.end = parsed
  }

  if (raw['refuse'] !== undefined) {
    if (raw['refuse'] !== true) fail(`${path}.refuse`, 'expected true')
    // VOCAB.md: refuse implies no other delta fired. `say` carries the line.
    const also = OTHER_DELTAS.filter((w) => raw[w] !== undefined)
    if (also.length > 0) {
      fail(`${path}.refuse`, `a refusal changes nothing — drop ${also.join(', ')}`)
    }
    out.refuse = true
  }

  return out
}

const parseObject = (id: string, raw: unknown, path: string): ObjectCard => {
  if (!isRecord(raw)) return fail(path, 'expected a mapping')
  for (const key of Object.keys(raw)) {
    if (!['tap', 'actions', 'hidden'].includes(key)) {
      fail(`${path}.${key}`, 'unknown key — expected tap, actions, hidden')
    }
  }

  const actionsRaw = raw['actions']
  if (!isRecord(actionsRaw)) return fail(`${path}.actions`, 'expected a mapping of action ids')

  const actions: Record<string, readonly Response[]> = {}
  for (const [action, list] of Object.entries(actionsRaw)) {
    const at = `${path}.${action}`
    if (!Array.isArray(list)) fail(at, 'expected a list of responses')
    if (list.length === 0) fail(at, 'expected at least one response')

    const responses = list.map((r, i) => parseResponse(r, `${at}[${i}]`))
    const last = responses[responses.length - 1]!
    if (last.if !== undefined && Object.keys(last.if).length > 0) {
      fail(`${at}[${responses.length - 1}]`, 'the last response must be a gateless fallback')
    }
    actions[action] = responses
  }

  const card: { -readonly [K in keyof ObjectCard]: ObjectCard[K] } = {
    id,
    tap: str(raw['tap'], `${path}.tap`),
    actions,
  }
  if (raw['hidden'] === true) card.hidden = true
  return card
}

/**
 * Validate an already-parsed value into a Scene. Pure — the caller does the
 * reading (.llm/rules/purity.mdc).
 */
export function parseScene(raw: unknown): Scene {
  if (!isRecord(raw)) return fail('scene', 'expected a mapping')
  for (const key of Object.keys(raw)) {
    if (!['scene', 'enter', 'tier', 'objects'].includes(key)) {
      fail(key, 'unknown key — expected scene, enter, tier, objects')
    }
  }

  // Authored as a mapping keyed by object id; normalised to a list. Both are
  // accepted, because a compiled bundle is validated by this same function and
  // a validator that rejects its own output makes the artefact unloadable
  // (.llm/rules/vocabulary.mdc — one gate, for the compiler and the loader).
  const objectsRaw = raw['objects']
  let objects: readonly ObjectCard[]
  if (Array.isArray(objectsRaw)) {
    objects = objectsRaw.map((o, i) => {
      if (!isRecord(o)) return fail(`objects[${i}]`, 'expected a mapping')
      const oid = str(o['id'], `objects[${i}].id`)
      const rest = Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'id'))
      return parseObject(oid, rest, `objects.${oid}`)
    })
  } else if (isRecord(objectsRaw)) {
    objects = Object.entries(objectsRaw).map(([oid, o]) => parseObject(oid, o, `objects.${oid}`))
  } else {
    return fail('objects', 'expected a mapping of object ids')
  }

  const scene: { -readonly [K in keyof Scene]: Scene[K] } = {
    scene: str(raw['scene'], 'scene'),
    enter: str(raw['enter'], 'enter'),
    objects,
  }
  if (raw['tier'] !== undefined) scene.tier = str(raw['tier'], 'tier')
  return scene
}
