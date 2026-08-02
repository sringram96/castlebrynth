// H003a · the content schema — the shape agents author in, forever.
//
// The vocabulary is closed (RULES.md §3). A scene may speak the words in
// VOCAB.md and no others, and a word this file does not know is a failure that
// names the path to it. parseScene is that gate, and it is the only one: the
// builder (H004a) and the loader (H004b) both come through here, so the
// compiler and the engine can never disagree about what a word is.
//
// It normalises as well as validates, so everything downstream sees one shape.
// An author writes `setFlag: lamp_lit`; resolve reads `['lamp_lit']` and never
// asks which of the two the file said. What comes out is JSON — no undefined
// members, no absent word made explicit (RULES.md §2).

/** The gate words, as VOCAB.md lists them. A gate is a conjunction of these. */
export const GATE_WORDS = ['flag', 'notFlag', 'item', 'notItem'] as const

/**
 * The delta words in application order — VOCAB.md's table, top to bottom.
 *
 * The order is the contract. Deltas apply in it, never in the order the keys
 * happen to appear in the file, which is what makes two authors who write the
 * same response produce the same run.
 */
export const DELTA_ORDER = [
  'refuse',
  'setFlag',
  'clearFlag',
  'addItem',
  'removeItem',
  'addObject',
  'removeObject',
  'journal',
  'goto',
] as const

type GateWord = (typeof GATE_WORDS)[number]

/** A conjunction: every condition present must hold. Empty or absent passes. */
export type Gate = { readonly [W in GateWord]?: readonly string[] }

/** One branch of an action, normalised. Every word is optional; order is the list's. */
export interface Response {
  readonly gate?: Gate
  /** The line the narrator speaks for taking this branch. Not a delta. */
  readonly say?: string
  /** The action does not happen. Carries no other delta (VOCAB.md refuse purity). */
  readonly refuse?: string
  readonly setFlag?: readonly string[]
  readonly clearFlag?: readonly string[]
  readonly addItem?: readonly string[]
  readonly removeItem?: readonly string[]
  readonly addObject?: readonly string[]
  readonly removeObject?: readonly string[]
  readonly journal?: readonly string[]
  readonly goto?: string
}

/** A thing in a scene and what it affords. Action names are the author's own. */
export interface ObjectCard {
  readonly id: string
  readonly name: string
  readonly actions: { readonly [action: string]: readonly Response[] }
  /** In the file but not in view until an addObject brings it in (LAWS.md §affordance). */
  readonly hidden?: boolean
}

/** A place: the line on arriving, and everything standing in it. */
export interface Scene {
  readonly id: string
  readonly line: string
  readonly objects: readonly ObjectCard[]
}

/** Every scene, compiled, and where a run opens. */
export interface Bundle {
  readonly v: 1
  readonly start: string
  readonly scenes: { readonly [id: string]: Scene }
}

const SCENE_KEYS: readonly string[] = ['id', 'line', 'objects']
const OBJECT_KEYS: readonly string[] = ['id', 'name', 'actions', 'hidden']
// `gate` selects the branch and `say` produces an Effect; neither is a delta.
const RESPONSE_WORDS: readonly string[] = ['gate', 'say', ...DELTA_ORDER]
const UNKNOWN = 'unknown vocabulary word'
const NAMES = 'must be a name or a list of names'

/**
 * Validates and normalises one already-parsed scene, or throws naming the path.
 *
 * The argument is a value, never a path — src/core does no I/O (RULES.md §1).
 * The caller that read the file prefixes its name:
 * `content/shore.yaml: objects.book.read[0].setFlagg — unknown vocabulary word`.
 */
export function parseScene(raw: unknown): Scene {
  if (!isRecord(raw)) throw new Error('the scene is not a mapping')

  for (const key of Object.keys(raw)) {
    if (!SCENE_KEYS.includes(key)) fail(key, UNKNOWN)
  }

  const objects = raw['objects']
  if (!Array.isArray(objects)) fail('objects', 'must be a list of objects')

  return {
    id: text(raw['id'], 'id', 'must be a scene id (string)'),
    line: text(raw['line'], 'line', 'must be a line (string)'),
    objects: objects.map(parseObject),
  }
}

function parseObject(raw: unknown, index: number): ObjectCard {
  // Until the id is read there is nothing to name the object by, so the path
  // falls back to where it sits in the file.
  const here = `objects[${index}]`
  if (!isRecord(raw)) fail(here, 'must be a mapping')

  const id = text(raw['id'], `${here}.id`, 'must be an object id (string)')
  const path = `objects.${id}`

  for (const key of Object.keys(raw)) {
    if (!OBJECT_KEYS.includes(key)) fail(`${path}.${key}`, UNKNOWN)
  }

  const name = text(raw['name'], `${path}.name`, 'must be a name (string)')

  const actions = raw['actions']
  if (!isRecord(actions)) fail(`${path}.actions`, 'must be a mapping of action to responses')

  const parsed: { [action: string]: readonly Response[] } = {}
  for (const action of Object.keys(actions)) {
    parsed[action] = parseResponses(actions[action], `${path}.${action}`)
  }

  const hidden = raw['hidden']
  if (hidden === undefined) return { id, name, actions: parsed }
  if (typeof hidden !== 'boolean') fail(`${path}.hidden`, 'must be true or false')
  return { id, name, actions: parsed, hidden }
}

// The path here is the action's — `objects.book.read` — because the vocabulary
// hides the `actions` key from content: an object affords `read`, it does not
// have an `actions` that contains `read`.
function parseResponses(raw: unknown, path: string): readonly Response[] {
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

function parseResponse(raw: unknown, path: string): Response {
  if (!isRecord(raw)) fail(path, 'must be a mapping')

  for (const word of Object.keys(raw)) {
    if (!RESPONSE_WORDS.includes(word)) fail(`${path}.${word}`, UNKNOWN)
  }

  // Assembled word by word rather than copied, so an absent word stays absent
  // instead of becoming an explicit undefined that JSON cannot carry.
  const response: {
    gate?: Gate
    say?: string
    refuse?: string
    setFlag?: string[]
    clearFlag?: string[]
    addItem?: string[]
    removeItem?: string[]
    addObject?: string[]
    removeObject?: string[]
    journal?: string[]
    goto?: string
  } = {}

  if (raw['gate'] !== undefined) response.gate = parseGate(raw['gate'], `${path}.gate`)
  if (raw['say'] !== undefined) response.say = text(raw['say'], `${path}.say`, 'must be a line (string)')

  for (const word of DELTA_ORDER) {
    const value = raw[word]
    if (value === undefined) continue
    const at = `${path}.${word}`
    if (word === 'refuse') response.refuse = text(value, at, 'must be a line (string)')
    else if (word === 'goto') response.goto = text(value, at, 'must be a scene id (string)')
    // VOCAB.md writes the rest "(s)": one name or many, and journal accumulates
    // into a list either way. The array is the shape resolve applies.
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

function parseGate(raw: unknown, path: string): Gate {
  if (!isRecord(raw)) fail(path, 'must be a mapping of conditions')

  const gate: { [W in GateWord]?: string[] } = {}
  for (const word of Object.keys(raw)) {
    if (!isGateWord(word)) fail(`${path}.${word}`, UNKNOWN)
    gate[word] = names(raw[word], `${path}.${word}`)
  }
  return gate
}

function isGateWord(word: string): word is GateWord {
  return GATE_WORDS.some((known) => known === word)
}

function names(value: unknown, path: string): string[] {
  if (typeof value === 'string') return [value]
  if (isStringList(value)) return [...value]
  fail(path, NAMES)
}

function text(value: unknown, path: string, what: string): string {
  if (typeof value !== 'string') fail(path, what)
  return value
}

function fail(path: string, what: string): never {
  throw new Error(`${path} — ${what}`)
}

// Arrays are not records: a scene written as a list has no `id` to read, and
// reading one off would find undefined rather than say what is wrong.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((name) => typeof name === 'string')
}
