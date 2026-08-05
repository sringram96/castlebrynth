/**
 * The shell — boot and route. The whole install is a URL.
 *
 * A state machine over the three bands (art. 29): boot into a first waking
 * or a resume, play a room, sense a door, fight what is behind it, die, read
 * the Book, and go down again.
 *
 * **The thumb is law here** (arts 66–76). The tray is anatomy and not a
 * menu: three regions in fixed places, plus the card's glyph, and nothing
 * else ever in it. Controls are plain imperative verbs; prose lives in the
 * word band and in what a tap answers. Things in the world are tapped where
 * they stand. Every commitment is a verb you pressed.
 *
 * The look proper is still the design agent's, under arts 26–30. What is
 * here is legibility, which is law, rather than style, which is not.
 */

import {
  ALL_RIDERS,
  BARE_BODY,
  CATALOG,
  CROSSING,
  GRAMMAR,
  GRID,
  HAND_SIZE,
  LABELS,
  LADDER,
  NOTICES,
  PLAIN_POUCH,
  READOUT,
  ROOM_BOOK,
  TABS,
  VERBS,
  atGrid,
  endLineOf,
  horrorById,
  horrorOf,
  intentChip,
  itemLabel,
  roomContent,
  type RoomContent,
  saysClaim,
  saysDie,
  saysIntent,
  saysItem,
} from './content/index.js'
import type { Act, Bands, Tappable } from './descent/index.js'
import {
  act,
  breathFor,
  canOpen,
  chooseDoor,
  doors,
  enterRoom,
  look,
  looking,
  mayLeave,
  nextBeat,
  openDoor,
  remember,
  sceneKey,
  sceneStateOf,
} from './descent/index.js'
import type { Chain, ChainNode, Door } from './gen/index.js'
import { deal, dealerOf, meetings, nodeAt, reseed } from './gen/index.js'
import type { Standing } from './hinge/index.js'
import {
  advance,
  carryOut,
  keepFight,
  openFightDoor,
  pausedAt,
  restoreFight,
  routeDeath,
  routeFlight,
  routeTurn,
  saveFight,
  turnLots,
} from './hinge/index.js'
import type { Card, Die, DieId, Fight, Goods, Landed, Line, Resolution } from './lots/index.js'
import {
  LINES,
  advanceFight,
  assemble,
  cast,
  casting,
  castingsLeft,
  claim,
  claimable,
  claimedDice,
  cursedValue,
  decide,
  fitsNothing,
  freshCard,
  harm,
  keep,
  recast,
  ridersFired,
  sealed,
  unused,
  withTurn,
  woundedBy,
} from './lots/index.js'
import type { FightPhase, InstanceId, ItemId, Ledgers, Panel, Seed } from './state/index.js'
import {
  HOME,
  browserVault,
  panelAfter,
  finish,
  focused,
  firstPermanent,
  load,
  meet,
  save,
  sparesOf,
  chooseHand,
  mustChoose,
  tookIntoRun,
  wake,
} from './state/index.js'
import type { Framebuffer, RenderedRoom, WorldMark } from './room/index.js'
import { fillScale, markRect, overpaint, present, renderRoom } from './room/index.js'

// ── The bands ──────────────────────────────────────────────────────────

const wordBand = must<HTMLDivElement>('word')
const worldBand = must<HTMLElement>('world')
const canvas = must<HTMLCanvasElement>('view')
const markLayer = must<HTMLDivElement>('marks')
const crownBand = must<HTMLDivElement>('crown')
const sheetBand = must<HTMLDivElement>('sheet')
const vitalsRegion = must<HTMLDivElement>('vitals')
const tabBar = must<HTMLDivElement>('tabs')
const pouchRegion = must<HTMLDivElement>('pouch')
const actStrip = must<HTMLDivElement>('acts')
const fightPanel = must<HTMLDivElement>('fight')

function must<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id)
  if (found === null) throw new Error(`no #${id}`)
  return found as T
}

// ── Where we are ───────────────────────────────────────────────────────

type Screen =
  | { readonly kind: 'room' }
  /**
   * art. 60: the hand is assembled from the pouch **for the descent**, so
   * when the pouch has outgrown the hand the descent opens by asking which
   * dice come down. It is a screen of its own because it is a decision of
   * its own — not a thing done in passing from a panel.
   */
  | { readonly kind: 'choosing' }
  | { readonly kind: 'fight'; readonly door: Door }
  | { readonly kind: 'dead' }
  | { readonly kind: 'finished' }

const vault = browserVault(localStorage)

/**
 * art. 79: a door commits a room, and committing a room means dealing one.
 * Whatever walks the player through a door has to be holding the catalog and
 * the grammar, so the shell holds them once and hands them over.
 */
const DEALER = dealerOf(CATALOG, GRAMMAR)

let ledgers: Ledgers
let chain: Chain
let bands: Bands
let screen: Screen
let notice: string | null = null
/** Set when a door has already refused you here, so the room can say so. */
let refused = false
/** art. 74: the card and the Book live behind glyphs, never mid-screen. */
let sheet: 'card' | 'book' | null = null
/** Which door the thumb has sensed. Sensing and going are two acts (art. 71). */
let chosen: Door | null = null
/**
 * art. 60: the dice picked out on the choosing screen, in the order they
 * were picked. Empty everywhere else — the pouch itself is informative and
 * commits nothing (art. 67).
 */
let picked: readonly DieId[] = []

/** art. 75: mirrored into the run on every mutation, never only here. */
let fight: Fight | null = null
let phase: FightPhase = 'pre'
let selected: readonly DieId[] = []
/** art. 28: the advance is a motion that matters, so it is remembered. */
let advanced = false
let closeness = 1
let advanceTimer: number | undefined
/** art. 1: a pulse in presentation, skippable, with a settled end state. */
let resolving: Resolution | null = null
let resolveTimer: number | undefined

function goods(): Goods {
  return { talismans: ledgers.permanent.keepsakes, riders: ALL_RIDERS }
}

// ── Boot ───────────────────────────────────────────────────────────────

/** art. 82: the room the run is standing in, as dealt. */
function here(): ChainNode {
  const node = nodeAt(chain, ledgers.run!.at.instance)
  if (node === null) throw new Error(`no room dealt at ${ledgers.run!.at.instance}`)
  return node
}

/**
 * art. 84: a meeting is knowledge. Standing in a room with something in it
 * is meeting it, and that crosses to the permanent at once — the encounter
 * burns with the run, the fact of it does not.
 */
function greet(): void {
  let permanent = ledgers.permanent
  for (const one of meetings(nodeAt(chain, ledgers.run!.at.instance))) {
    permanent = meet(permanent, one)
  }
  if (permanent !== ledgers.permanent) ledgers = { ...ledgers, permanent }
}

function boot(): void {
  const found = load(vault)
  if (found === null || found.run === null) {
    // arts 55–56: a first waking is five bones and a hole. There is no ritual
    // left at the Crossing — the signature is the first traveler's die, and
    // the labyrinth is where that is found (art. 86). Waking *is* the room.
    ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), freshSeed())
  } else {
    ledgers = found
  }
  screen = { kind: 'room' }
  // art. 60: the hand is the first `handSize` of the pouch, and that has to
  // be true on the way *in* as well as after every act — a boot is the one
  // moment the two could have drifted apart (a bone collected while a fight
  // was paused, and the app closed before the fight ended).
  ledgers = { ...ledgers, run: tookIntoRun(ledgers.run!, ledgers.permanent) }
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR, ledgers.run!.history)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  chosen = doors(bands)[0] ?? null
  greet()
  // art. 75: a half-spent turn survives the lock screen. If one was in
  // flight rather than paused, boot lands back inside it, selection and all.
  // A fight you ran out on is saved the same way and stays where you left
  // it — in the room, behind its door (art. 63).
  const held = pausedAt(ledgers, ledgers.run!.at.instance)
  const gate = doors(bands).find((door) => door.fight !== undefined)
  if (held !== null && held.engaged && gate !== undefined) {
    resume(held.at)
    // art. 91: booting is not a transition. Focus is state, and the state
    // says where the thumb was — a player who locked the phone on the pouch
    // comes back to the pouch, fight or no fight. `panelNow` clamps the one
    // case that could go stale (a save on FIGHT with no fight left).
    if (fight !== null) screen = { kind: 'fight', door: gate }
  }
  persist()
  paint()
}

/** A seed for a waking that has never happened before. */
function freshSeed(): Seed {
  return reseed((Date.now() % 0x7fffffff) as unknown as Seed)
}

/** art. 36: every mutation persists. This is the only place that writes. */
function persist(): void {
  ledgers = remember(ledgers, bands)
  if (fight !== null && screen.kind === 'fight') {
    ledgers = keepFight(
      ledgers,
      saveFight(fight, ledgers.run!.at.instance, phase, selected, advanced, true),
    )
  }
  save(ledgers, vault)
}

// ── The world band ─────────────────────────────────────────────────────

/**
 * art. 17: a room renders identical every visit, so a room rendered once is
 * a room rendered forever. The cache is the whole of the shell's
 * performance story — the box is computed per pixel, and it is not cheap.
 *
 * art. 70 is why the key is the *scene state* and not the room id. A frame
 * cached by room alone is a room that cannot show what you did in it: the
 * taken key would still be lying on the floor of a repaint.
 */
const painted = new Map<string, RenderedRoom>()

function frameHeight(): number {
  return Math.max(120, Math.round((GRID * worldBand.clientHeight) / worldBand.clientWidth))
}

function world(): void {
  const node = here()
  const content = roomContent(node.room)
  const state = sceneStateOf(ledgers, ROOM_BOOK, node)
  const stamp = `${sceneKey(state)}:${frameHeight()}`
  let base = painted.get(stamp)
  if (base === undefined) {
    base = renderRoom(content.scene(state), atGrid(GRID, frameHeight()))
    painted.set(stamp, base)
  }
  // art. 30: no battle screen — the horror is a prop laid into this room's
  // own frame, so the box behind it is never cast twice for a motion.
  const close = screen.kind === 'fight' && fight !== null ? [advance(fight, closeness).prop] : []
  show(close.length === 0 ? base.frame : overpaint(base, close))
  layMarks(base, content)
}

function show(frame: Framebuffer): void {
  present(frame, canvas)
  // art. 25 (amended): exact fill via sharp upscale. The frame's height came
  // from this band's aspect, so filling one dimension all but fills both.
  const scale = fillScale(frame, worldBand.clientWidth, worldBand.clientHeight)
  canvas.style.width = `${frame.width * scale}px`
  canvas.style.height = `${frame.height * scale}px`
}

/** The smallest a mark may be drawn, in device pixels. A thumb is a thumb. */
const THUMB = 40

/**
 * art. 68: a tap investigates, and it investigates the *thing* — so the
 * regions that answer sit exactly over what they answer for, derived from
 * the same world coordinates the props are painted at (art. 19).
 */
function layMarks(base: RenderedRoom, content: RoomContent): void {
  markLayer.replaceChildren()
  if (sheet !== null) return
  const scale = fillScale(base.frame, worldBand.clientWidth, worldBand.clientHeight)
  const offsetX = canvas.offsetLeft
  const offsetY = canvas.offsetTop

  const laid: { area: number; el: HTMLButtonElement }[] = []
  const place = (mark: WorldMark, el: HTMLButtonElement): void => {
    const rect = markRect(base.view, mark)
    const w = Math.max(THUMB, rect.width * scale)
    const h = Math.max(THUMB, rect.height * scale)
    const cx = offsetX + (rect.x + rect.width / 2) * scale
    const cy = offsetY + (rect.y + rect.height / 2) * scale
    el.style.left = `${Math.round(cx - w / 2)}px`
    el.style.top = `${Math.round(cy - h / 2)}px`
    el.style.width = `${Math.round(w)}px`
    el.style.height = `${Math.round(h)}px`
    laid.push({ area: w * h, el })
  }

  // art. 6: everything ever clickable is always clickable, and art. 69: it
  // always answers. A fight does not take the room's things away.
  for (const target of bands.tappables) place(target.at, markFor(target))

  if (screen.kind !== 'fight') {
    const ahead = doors(bands)
    ahead.forEach((door, i) => {
      // art. 31 will one day put two or three doors in a room; when it does,
      // they stand apart rather than on top of each other.
      const spread = (i - (ahead.length - 1) / 2) * content.door.width * 1.4
      place({ ...content.door, X: content.door.X + spread }, doorMark(door))
    })
  }

  // arts 6 and 69: the small thing sits on the large thing it is part of, or
  // the lock is a pixel of the door and can never be tapped.
  laid.sort((one, other) => other.area - one.area)
  markLayer.append(...laid.map((one) => one.el))
}

function markFor(target: Tappable): HTMLButtonElement {
  const el = document.createElement('button')
  el.className = 'lit'
  el.setAttribute('aria-label', target.noun)
  el.onclick = () => {
    settle()
    // art. 68: the tap is the inspection — the word band is the whole of it,
    // and there is no button behind it. And looking summons: the verb about
    // this thing appears in ACTS once it has been looked at.
    notice = look(ROOM_BOOK, bands, target).text
    ledgers = looking(ledgers, target)
    bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
    persist()
    paint()
  }
  return el
}

/**
 * arts 31, 69, 77: a door answers, and what it answers with is itself. Its
 * region tag is hidden — a sense would be exactly that tag leaking, and the
 * hint system is parked — so the line the tap gives back says what a shut
 * door says and no more.
 */
function doorMark(door: Door): HTMLButtonElement {
  const el = document.createElement('button')
  el.className = `door${chosen?.at === door.at ? ' chosen' : ''}`
  el.setAttribute('aria-label', LABELS['door.ahead'] ?? 'the door')
  el.onclick = () => {
    settle()
    // art. 71: a bare tap never walks you through a door. It picks it out,
    // and the going is a verb in the act strip.
    chosen = door
    notice = NOTICES['door.blind'] ?? ''
    paint()
  }
  return el
}

// ── Painting ───────────────────────────────────────────────────────────

function paint(): void {
  say()
  tray()
  world()
  crown()
  drawSheet()
}

let fadeTimer: number | undefined

function say(): void {
  const said = notice ?? wordOf()
  wordBand.replaceChildren(document.createTextNode(said))
  const browsing = screen.kind === 'room'
  const left = bands.beats.length - 1 - (bands.word?.index ?? 0)
  if (notice === null && browsing && left > 0) {
    const more = document.createElement('span')
    more.className = 'more'
    // Not a word: a mark, so the candle that is still to come is visible
    // without the word band ever instructing (arts 29, 66).
    more.textContent = ` ${'·'.repeat(left)}`
    wordBand.append(more)
  }
  wordBand.classList.remove('faded')
  clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => wordBand.classList.add('faded'), 4000) as unknown as number
}

wordBand.onclick = () => {
  settle()
  // art. 29: presentation fades, knowledge doesn't. One tap recalls the
  // word; the same tap turns the candle when there is another (art. 67 keeps
  // the beat advance out of the tray).
  if (notice !== null) {
    notice = null
  } else if (bands.word !== null && !bands.word.last) {
    bands = nextBeat(bands)
    persist()
  }
  paint()
}

function wordOf(): string {
  switch (screen.kind) {
    // art. 60: an ending that has a question behind it says so. The line is
    // the same ending plus what is true of the pouch — never an instruction
    // (art. 66); the verb on the strip is the thing that tells you to press.
    case 'dead':
      return (mustChoose(ledgers.permanent) ? NOTICES['run.dead.choose'] : NOTICES['run.dead']) ?? ''
    case 'finished':
      return (
        (mustChoose(ledgers.permanent) ? NOTICES['run.finished.choose'] : NOTICES['run.finished']) ??
        ''
      )
    case 'choosing':
      return NOTICES['choose.which'] ?? ''
    case 'fight':
      return fight === null ? '' : saysIntent(fight.turn.intent)
    default:
      return bands.word?.text ?? ''
  }
}

// ── The crown: the horror, at the top of the frame (arts 30, 57, 73) ────

function crown(): void {
  crownBand.replaceChildren()
  crownBand.classList.toggle('on', screen.kind === 'fight' && fight !== null && sheet === null)
  const now = fight
  if (now === null || screen.kind !== 'fight') return

  const name = document.createElement('span')
  name.className = 'name'
  name.textContent = `${LABELS[now.horror.id] ?? now.horror.id} ${now.horrorHealth}/${now.horror.health}`

  const bar = document.createElement('span')
  bar.className = 'bar'
  const fill = document.createElement('i')
  fill.style.width = `${Math.max(0, (100 * now.horrorHealth) / now.horror.health)}%`
  bar.append(fill)

  // art. 73: the intent is tappable, and explains itself in plain words.
  const intent = document.createElement('button')
  intent.className = 'intent'
  intent.textContent = intentChip(now.turn.intent)
  intent.onclick = () => {
    settle()
    notice = saysIntent(now.turn.intent)
    paint()
  }

  crownBand.append(name, bar, intent)
}

// ── The sheet: the card, the Book (art. 74) ────────────────────────────

function drawSheet(): void {
  sheetBand.replaceChildren()
  sheetBand.classList.toggle('on', sheet !== null)
  if (sheet === null) return
  const title = document.createElement('h1')
  title.textContent = NOTICES[sheet === 'card' ? 'card.title' : 'book.title'] ?? ''
  sheetBand.append(title)
  if (sheet === 'card') cardLines()
  else bookLines()
  sheetBand.append(row(verb('close', () => { sheet = null; paint() })))
}

function cardLines(): void {
  const card: Card = fight?.turn.card ?? freshCard()
  const shut = fight === null ? [] : sealed(fight.turn.intent)
  for (const line of LINES) {
    const div = document.createElement('div')
    div.className = `line ${card[line] ? 'spent' : shut.includes(line) ? 'sealed' : 'open'}`
    const name = document.createElement('span')
    name.textContent = LADDER[line].name
    const tier = document.createElement('span')
    tier.textContent = `×${LADDER[line].multiplier}`
    div.append(name, tier)
    sheetBand.append(div)
  }
}

function bookLines(): void {
  const lines = ledgers.permanent.bookOfEnds
  if (lines.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'line open'
    empty.textContent = NOTICES['book.empty'] ?? ''
    sheetBand.append(empty)
    return
  }
  for (const [n, line] of lines.entries()) {
    const div = document.createElement('div')
    div.className = 'line open'
    const left = document.createElement('span')
    left.textContent = `${n + 1} · ${READOUT.depth} ${line.depth}`
    const right = document.createElement('span')
    right.textContent = `${READOUT.seed} ${line.seed}`
    div.append(left, right)
    sheetBand.append(div)
  }
}

// ── The tray: anatomy, not a menu (art. 67) ────────────────────────────

/**
 * art. 67 (amended): the tray is a **persistent rail** and a **panel area**.
 *
 * The rail never changes — your body's numbers, and the tabs. The panels
 * swap under it: ACTS is where the game is played from, POUCH is the swap
 * surface, FIGHT exists only while a fight does. Nothing else is ever in the
 * tray, which is the part of art. 67 that did not move.
 */
function tray(): void {
  vitals()
  tabs()
  panels()
}

/**
 * Which panel the thumb is on, clamped to one that exists right now.
 *
 * art. 67: FIGHT is not a tab. It is what the panel area *becomes* while a
 * fight is on — the ground the tray sits on rather than one of the places
 * you can go — so it is never in the tab bar, and a fight puts you there
 * without your having to find it.
 *
 * A save left on FIGHT by a fight that ended in another session lands home
 * instead, because a panel with nothing in it is not a place either.
 */
function panelNow(): Panel {
  const held = ledgers.run?.panel ?? HOME
  if (held === 'fight' && !inAFight()) return HOME
  // art. 67: the pouch is shut during a fight, so a save left on it lands on
  // the fight rather than on a panel the fight has closed.
  if (held === 'pouch' && inAFight()) return 'fight'
  return held
}

function inAFight(): boolean {
  return screen.kind === 'fight' && fight !== null
}

/**
 * arts 67, 75: focus moves by a declared transition and by nothing else, and
 * every move is written down. There is no branch anywhere that guesses.
 */
function focus(panel: Panel): void {
  const run = ledgers.run
  if (run === null) return
  ledgers = { ...ledgers, run: focused(run, panel) }
}

/**
 * art. 76: a tab bar is taps. No new interaction type enters the game — the
 * budget is unspent, and the slide stays a named option (art. 90).
 */
function tabs(): void {
  tabBar.replaceChildren()
  const on = panelNow()
  const tab = (panel: Panel, key: string): void => {
    const el = document.createElement('button')
    el.textContent = TABS[key] ?? key
    el.className = panel === on ? 'on' : ''
    el.setAttribute('aria-pressed', String(panel === on))
    el.onclick = () => {
      settle()
      // art. 67: during a fight the duel is the ground the tray sits on, so
      // a tab is somewhere you *step aside to*. Pressing the one you are
      // already on steps back — which is how you return to a fight that has
      // no tab of its own.
      focus(panel === on && inAFight() ? 'fight' : panel)
      notice = null
      persist()
      paint()
    }
    tabBar.append(el)
  }
  // art. 60: while the choice is being made there is nowhere else to be.
  if (screen.kind === 'choosing') return
  tab('acts', 'acts')
  // art. 67: the pouch is shut during a fight. The hand a fight was opened
  // with is the hand it is replayed with (arts 63, 75), so there is nothing
  // to do in there — and a tab that only ever tells you "not now" is worse
  // than a tab that is not offered.
  if (!inAFight()) tab('pouch', 'pouch')
  // arts 31, 85: the map is a socket and stays one. A disabled tab is legal;
  // pixels behind it are not, so there is no panel to focus and no handler to
  // press. It is here to say that the road ahead is a thing the game has
  // decided not to show you, rather than a thing nobody thought of.
  const map = document.createElement('button')
  map.textContent = TABS.map ?? 'map'
  map.disabled = true
  map.setAttribute('aria-disabled', 'true')
  tabBar.append(map)
}

function panels(): void {
  // art. 60: the choosing screen takes the whole panel area. It is not a
  // panel you can tab to — it is what the tray is until the choice is made.
  if (screen.kind === 'choosing') {
    actStrip.classList.remove('on')
    fightPanel.classList.remove('on')
    pouchRegion.classList.add('on')
    pouchRegion.replaceChildren()
    return choosingPanel()
  }
  const on = panelNow()
  actStrip.classList.toggle('on', on === 'acts')
  pouchRegion.classList.toggle('on', on === 'pouch')
  fightPanel.classList.toggle('on', on === 'fight')
  if (on === 'acts') acts()
  else if (on === 'pouch') pouch()
  else theFightPanel()
}

function row(...kids: readonly Node[]): HTMLDivElement {
  const div = document.createElement('div')
  div.style.display = 'flex'
  div.style.gap = '6px'
  div.style.marginTop = '8px'
  div.append(...kids)
  return div
}

/** art. 66: a control is a plain imperative verb, and it comes from content. */
function verb(key: string, onClick: () => void, off = false): HTMLButtonElement {
  const el = document.createElement('button')
  el.textContent = VERBS[key] ?? key
  el.disabled = off
  el.onclick = onClick
  return el
}

function reading(label: string, value: string): HTMLSpanElement {
  const span = document.createElement('span')
  if (label !== '') span.textContent = `${label} `
  const strong = document.createElement('b')
  strong.textContent = value
  span.append(strong)
  return span
}

/**
 * Region one: the body's numbers, and the turn's. art. 57 wants the running
 * totals visible and art. 67 wants them in a fixed place; this is that
 * place, and it never moves.
 */
function vitals(): void {
  vitalsRegion.replaceChildren()
  const run = ledgers.run!
  const now = fight
  // art. 67 (amended): the rail is the body and nothing else. The turn's
  // running totals belong to the fight, so art. 57 keeps them pinned in the
  // FIGHT panel's header rather than in a rail that is always on screen.
  const corroded = now !== null && inAFight() && now.turn.intent.effect?.kind === 'corrode'
  vitalsRegion.append(
    reading(READOUT.health ?? '', now !== null && inAFight()
      ? `${now.yourHealth}/${now.yourHealthMax}`
      : `${run.health}/${run.healthMax}`),
    reading(
      READOUT.armor ?? '',
      corroded ? `0 ${READOUT.corroded}` : `${now !== null && inAFight() ? now.armor : run.armor}`,
    ),
  )
  // art. 74: the card lives behind a small, persistent glyph — and while a
  // fight is on it lives in the fight's own header, where the rest of that
  // fight's numbers are. One glyph, never two.
  if (!inAFight()) vitalsRegion.append(cardGlyph())
}

/** art. 74: one tap opens the card, and it is never parked mid-screen. */
function cardGlyph(): HTMLButtonElement {
  const glyph = document.createElement('button')
  glyph.className = 'glyph'
  glyph.textContent = '▤'
  glyph.setAttribute('aria-label', VERBS.card ?? 'Card')
  glyph.onclick = () => {
    settle()
    sheet = sheet === 'card' ? null : 'card'
    paint()
  }
  return glyph
}

/**
 * art. 30: there is no battle screen — the world band is still the room with
 * the thing come close. What changes mode is the tray, and this is the panel
 * that does it: its own ground, art. 57's running totals pinned in its
 * header, the hand under them, and the card's glyph where the numbers are.
 */
function theFightPanel(): void {
  fightPanel.replaceChildren()
  const now = fight
  if (now === null) return

  const corroded = now.turn.intent.effect?.kind === 'corrode'
  const armorNow = corroded ? 0 : now.armor
  const totals = document.createElement('div')
  totals.className = 'totals'
  totals.append(
    reading(READOUT.attack ?? '', `${now.turn.claims.reduce((sum, made) => sum + harm(made), 0)}`),
    reading(READOUT.incoming ?? '', `${Math.max(0, now.turn.intent.amount - armorNow)}`),
    reading(READOUT.unused ?? '', `${unused(now.turn).length}`),
  )
  const priced = pricedNow()
  if (priced > 0) totals.append(reading(READOUT.cost ?? '', `${priced}`))
  const offer = claimOffer()
  if (offer !== null) totals.append(reading('', offer))
  totals.append(cardGlyph())
  fightPanel.append(totals)

  // The hand, as it lies. art. 72's four states are the die slot's business
  // and have not moved.
  const laid = casting(now.turn)
  const byId = new Map(ledgers.run!.hand.dice.map((die) => [die.id as string, die] as const))
  if (laid.length > 0) {
    const spent = claimedDice(now.turn)
    for (const landed of laid) {
      const die = byId.get(landed.die)
      if (die === undefined) continue
      fightPanel.append(dieSlot(die, landed, spent.has(landed.die)))
    }
  } else {
    for (const die of ledgers.run!.hand.dice) fightPanel.append(dieSlot(die, null, false))
  }
  fightActs()
}

/**
 * arts 54, 86: what the claims already made will charge in cost faces. It is
 * read off the same riders the resolve will fire, so the number in the tray
 * and the number that lands are one number.
 */
function pricedNow(): number {
  const now = fight
  if (now === null) return 0
  if (resolving !== null) return resolving.hurt
  return woundedBy(ridersFired(now.turn.claims, goods().riders))
}

/** What the current selection would take, and for how much (arts 57, 72). */
function claimOffer(): string | null {
  const now = fight
  if (now === null || phase !== 'claim') return null
  if (selected.length === 0) return null
  const line = bestLine()
  if (line === null) return NOTICES['claim.exact'] ?? null
  const offer = saysClaim(line, scoreOf(line))
  // The floor is always on offer (art. 46), so "the offer is the floor" is
  // exactly the case art. 72 says owes the thumb a reason as well as a price.
  return fitsNothing(now.turn, selected, LADDER)
    ? `${offer} · ${NOTICES['claim.exact'] ?? ''}`
    : offer
}

/**
 * art. 72's DEFAULT: offers match the exact selection. A selection makes at
 * most one combo (plus the ANY DICE floor, which is never better), so the
 * offer is the highest tier on the table and `Claim` is one verb rather than
 * a row of names and numbers wearing the coat of controls (art. 66).
 */
function bestLine(): Line | null {
  const now = fight
  if (now === null) return null
  const lines = claimable(now.turn, selected, LADDER)
  if (lines.length === 0) return null
  return lines.reduce((best, line) =>
    LADDER[line].multiplier > LADDER[best].multiplier ? line : best,
  )
}

function scoreOf(line: Line): number {
  const now = fight
  if (now === null) return 0
  const chosenDice = casting(now.turn).filter((landed) => selected.includes(landed.die))
  return harm(assemble(line, chosenDice, LADDER, cursedValue(now.turn.intent), goods()))
}

/**
 * Region two: the pouch, as visible slots — empty ones included, because
 * hand size is a stat the player should be able to see (art. 67). In a fight
 * the same slots hold the same dice, cast: the hand is assembled from the
 * pouch, so the region is the pouch either way.
 */
/**
 * art. 67 (amended): the POUCH panel — the swap surface, not a display case.
 *
 * art. 60 as amended by PR #38: the pouch is ordered, the hand is its first
 * `handSize`, and everything past that is a spare. So the panel draws the
 * hand, then a rule, then the spares — set apart, dimmer, unlit — because
 * which side of that rule a die is on is the only thing the panel is about.
 *
 * The dice have left the descent screen entirely: outside a fight this is
 * the one place in the game a die is drawn.
 */
/**
 * art. 67 (amended): the POUCH panel — what you own, and nothing you press.
 *
 * It is **informative**. The hand, then a rule, then the spares set apart,
 * dimmer and unlit; every die answers with its declared truth on a tap
 * (art. 68) and commits nothing. Choosing which of them descend is a
 * decision made at the waking, on a screen of its own (art. 60), because a
 * hand changed mid-descent is a hand a fight could be re-armed from.
 *
 * The dice of a *turn* are never here — those are the duel's, and they are
 * drawn in FIGHT and nowhere else.
 */
function pouch(): void {
  pouchRegion.replaceChildren()
  const run = ledgers.run!
  for (const die of run.hand.dice) pouchRegion.append(dieSlot(die, null, false))
  // arts 55–56: the invitation, until the first find fills it.
  for (let n = run.hand.dice.length; n < ledgers.permanent.handSize; n++) {
    pouchRegion.append(emptySlot())
  }

  const spares = sparesOf(ledgers.permanent)
  if (spares.length > 0) {
    const rule = document.createElement('div')
    rule.className = 'rule'
    pouchRegion.append(rule)
    for (const die of spares) pouchRegion.append(spareSlot(die))
  }

  // art. 68: what you carry is a possession and answers the same way.
  for (const item of run.carried) pouchRegion.append(carriedSlot(item))

  // art. 69: the panel says what it is rather than leaving the spares
  // unexplained. It never instructs — it states what is true of them.
  const aside = document.createElement('div')
  aside.className = 'aside'
  aside.textContent = NOTICES[spares.length > 0 ? 'pouch.spares' : 'pouch.whole'] ?? ''
  pouchRegion.append(aside)
}

function slot(className: string): HTMLButtonElement {
  const el = document.createElement('button')
  el.className = `slot ${className}`
  return el
}

/** The pips, so a die reads as a die rather than as a number (art. 72). */
const PIP_AT: Readonly<Record<number, readonly number[]>> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function pips(value: number): HTMLSpanElement {
  const grid = document.createElement('span')
  grid.className = 'pips'
  const at = new Set(PIP_AT[value] ?? [])
  for (let cell = 0; cell < 9; cell++) {
    const box = document.createElement('span')
    if (at.has(cell)) box.append(document.createElement('i'))
    grid.append(box)
  }
  return grid
}

/**
 * art. 72: four states, unmistakably distinct. Idle is a plain face; kept
 * wears a tab along its top and only ever in the keep phase; selected
 * inverts entirely; claimed is sunk and ringed. Unused dims at resolve.
 */
function dieSlot(die: Die, landed: Landed | null, claimed: boolean): HTMLButtonElement {
  // art. 67: in the pouch a die is a thing you read, so `selected` is only
  // ever the duel's selection. The choosing screen marks its own picks.
  const isSelected = landed !== null && selected.includes(landed.die)
  const kept = landed !== null && landed.kept && phase === 'keep'
  const idle =
    resolving !== null && landed !== null && !claimed
      ? ' unused'
      : ''
  const el = slot(
    `die${landed === null ? ' rest' : ''}${kept ? ' kept' : ''}${isSelected ? ' sel' : ''}${
      claimed ? ' claimed' : ''
    }${idle}`,
  )
  if (landed !== null) el.append(pips(landed.face.value))
  el.setAttribute('aria-label', saysDie(die, landed?.face))
  // art. 69: silence is a bug. A die answers with its declared truth whether
  // or not the tap also does something to it.
  el.onclick = () => {
    settle()
    const spentIn = claimed ? claimIn(landed!.die) : undefined
    notice = saysDie(die, landed?.face, spentIn ?? undefined)
    if (landed !== null) tapDie(landed.die)
    paint()
  }
  return el
}

function claimIn(die: DieId): Line | null {
  const now = fight
  if (now === null) return null
  return now.turn.claims.find((made) => made.dice.some((one) => one.die === die))?.line ?? null
}

function emptySlot(): HTMLButtonElement {
  const el = slot('empty')
  el.onclick = () => {
    settle()
    notice = NOTICES['pouch.empty'] ?? ''
    paint()
  }
  return el
}

/**
 * art. 60: a die you own and are not carrying. Tapping it answers with its
 * declared truth like any possession (art. 68) and commits nothing — which
 * dice descend is settled at the waking, not here.
 */
function spareSlot(die: Die): HTMLButtonElement {
  const el = slot('spare')
  el.append(pips(die.faces[0]?.value ?? 1))
  el.setAttribute('aria-label', saysDie(die))
  el.onclick = () => {
    settle()
    notice = saysDie(die)
    paint()
  }
  return el
}

function carriedSlot(item: ItemId): HTMLButtonElement {
  const el = slot('carried')
  el.textContent = itemLabel(item).replace(/^the /, '')
  el.onclick = () => {
    settle()
    notice = saysItem(item)
    paint()
  }
  return el
}

/**
 * Region three: the act strip. Every commitment in the game is a plain verb
 * pressed here (arts 66, 71) — nothing else commits, and nothing here
 * narrates.
 */
function acts(): void {
  actStrip.replaceChildren()
  switch (screen.kind) {
    case 'room':
      return roomActs()
    case 'fight':
      // art. 67: the fight's own verbs belong to the fight's own panel, and
      // they are rendered there (`theFightPanel`). What ACTS holds during a
      // fight is what ACTS is for — the things you do that are not the duel.
      return actsInAFight()
    // art. 60: the verb names what the press actually does. With a choice
    // waiting it opens the question rather than the labyrinth, so it says
    // Choose — art. 71's rule that no press lies about where it takes you.
    case 'dead':
      return actStrip.append(
        verb(mustChoose(ledgers.permanent) ? 'choose' : 'descend', beginDescent),
        verb('read', () => { sheet = 'book'; paint() }),
      )
    case 'finished':
      return actStrip.append(
        verb(mustChoose(ledgers.permanent) ? 'choose' : 'wake', beginDescent),
        verb('read', () => { sheet = 'book'; paint() }),
      )
    case 'choosing':
      return
  }
}

// ── The room ───────────────────────────────────────────────────────────

function roomActs(): void {
  const run = ledgers.run!
  for (const one of bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))) {
    actStrip.append(verb(one.id, () => doAct(one)))
  }

  const ahead = doors(bands)
  if (chosen === null || !ahead.some((door) => door.at === chosen!.at)) chosen = ahead[0] ?? null
  const door = chosen
  if (door !== null) {
    actStrip.append(
      verb(door.fight !== undefined ? 'fight' : door.ends === true ? 'descend' : 'open', () =>
        commitDoor(door),
      ),
    )
  }

  // A run that walked past its key would reach a door it cannot open, and
  // the engine has no back (art. 9). art. 3 now makes that unreachable — the
  // door refuses to commit while the key is still on the floor — so this is
  // the valve for a chain that failed the guarantee, not the ordinary path.
  if (refused && ahead.every((one) => !canOpen(ledgers, one))) {
    actStrip.append(verb('end', () => died('end.kept')))
  }

  if (bands.room === CROSSING) {
    actStrip.append(verb('read', () => { sheet = 'book'; paint() }))
  }
}

/**
 * art. 67: what ACTS is for during a fight — the things that are not the
 * duel. The room is still there (art. 30: no battle screen), so a verb
 * looking summoned is still yours to press; the doors are not, because the
 * door you are standing at *is* the fight.
 *
 * It is nearly always empty today. The spells and consumables that will fill
 * it are later waves; what matters now is that the panel exists, says so,
 * and is not where the dice live.
 */
function actsInAFight(): void {
  const offers = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))
  for (const one of offers) actStrip.append(verb(one.id, () => doAct(one)))
  // art. 41 (amended 2026-08-05): FLEE is always offered, and it is offered
  // here. Running is not a move in the duel — it is the one thing you can do
  // about the door you are standing at, so it belongs with the room's verbs
  // and not with the dice. It sits in one place all fight, which is what
  // FIGHT's own strip could not give it: that strip is three different sets
  // of verbs across a turn, and a verb that leaves the fight has no business
  // moving under the thumb each time the phase turns (art. 67).
  //
  // Unconditional, including through the resolve beat — `runFromTheFight`
  // clears the timers itself, so "always" can mean always (arts 1, 41).
  actStrip.append(verb('run', runFromTheFight))
}

function doAct(one: Act): void {
  // art. 40: a mercy pressed by a whole body restores nothing and is not
  // spent. The act strip does not go quiet about it (art. 69) — the word
  // band says which of the two happened.
  const mercy = one.heals === undefined ? null : breathFor(ledgers, one)
  ledgers = act(ledgers, one)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  // art. 70: prose confirms, pixels prove — the answer is the room without
  // the thing in it, which the scene state has already stopped drawing.
  notice =
    mercy === null ? null : (NOTICES[mercy > 0 ? 'mercy.breath' : 'mercy.whole'] ?? null)
  persist()
  paint()
}

/**
 * art. 60: the choosing screen — which dice come down.
 *
 * It opens where a descent opens: after an ending, when the pouch has
 * outgrown the hand. Nothing about it is new vocabulary — the dice are
 * tapped the way every die in the game is tapped, the picks are staged the
 * way a claim is (art. 72), and one plain verb commits (art. 66).
 */
function choosingPanel(): void {
  const permanent = ledgers.permanent
  const size = permanent.handSize
  for (const die of permanent.pouch.dice) {
    const at = picked.indexOf(die.id)
    const el = slot(`die${at < 0 ? ' rest' : ' sel'}`)
    el.append(pips(die.faces[0]?.value ?? 1))
    el.setAttribute('aria-label', saysDie(die))
    el.onclick = () => {
      settle()
      // art. 68: a tap answers first, always — the pick is what it leaves.
      notice = saysDie(die)
      picked =
        at >= 0
          ? picked.filter((one) => one !== die.id)
          : picked.length >= size
            ? picked
            : [...picked, die.id]
      if (at < 0 && picked.length >= size && !picked.includes(die.id)) {
        // Full: the tap still answered, and the hand did not move (art. 5).
        notice = NOTICES['choose.full'] ?? notice
      }
      paint()
    }
    pouchRegion.append(el)
  }

  const aside = document.createElement('div')
  aside.className = 'aside'
  aside.textContent = `${picked.length}/${size}`
  pouchRegion.append(aside)
  pouchRegion.append(verb('descend', commitChoice, picked.length !== size))
}

/**
 * art. 60: the choice, committed. The pouch is reordered so the chosen dice
 * are its first `handSize` — the order *is* the hand — and the run is then
 * re-read off it. Nothing is destroyed; the rest are spares.
 */
function commitChoice(): void {
  if (picked.length !== ledgers.permanent.handSize) {
    notice = NOTICES['choose.short'] ?? ''
    return paint()
  }
  const permanent = chooseHand(ledgers.permanent, picked)
  ledgers = { permanent, run: tookIntoRun(ledgers.run!, permanent) }
  picked = []
  screen = { kind: 'room' }
  notice = null
  persist()
  paint()
}

/**
 * art. 60: a descent begins by asking which dice come down, when there is
 * anything to ask. A pouch that fits the hand asks nothing and the player
 * walks straight in.
 */
function beginDescent(): void {
  if (mustChoose(ledgers.permanent)) {
    picked = ledgers.run!.hand.dice.map((die) => die.id)
    screen = { kind: 'choosing' }
    focus('pouch')
  } else {
    screen = { kind: 'room' }
  }
  notice = null
  persist()
  paint()
}

/**
 * arts 3, 5, 71: the one place a door is committed. It refuses three ways,
 * and every refusal is a line rather than a punishment — something required
 * still lies here, the lock holds, or there is nothing to open.
 */
function commitDoor(door: Door): void {
  if (!mayLeave(ledgers, ROOM_BOOK, here())) {
    // A stop, not a hint: it names nothing and points at nothing (art. 3).
    notice = NOTICES['door.held'] ?? ''
    paint()
    return
  }
  if (door.fight !== undefined) return openTheFight(door)
  if (!canOpen(ledgers, door)) {
    // art. 5: the world never punishes touch; it sometimes stops offering.
    notice = NOTICES['door.locked'] ?? ''
    refused = true
    paint()
    return
  }
  if (door.ends === true) return finishTheDepth()
  walk(door)
}

function walk(door: Door, said: string | null = null): void {
  refused = false
  // art. 79: the room behind this door does not exist until now. Walking
  // deals it, which is why the walk hands back both the run and the chain.
  const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
  ledgers = walked.ledgers
  chain = walked.chain
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  chosen = doors(bands)[0] ?? null
  greet()
  notice = said
  persist()
  paint()
}

function finishTheDepth(): void {
  // The Warden's door: a terse ending, its own Book line, a fresh waking.
  const permanent = finish(ledgers, 'end.warden')
  ledgers = wake(permanent, reseed(ledgers.run!.seed))
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR, ledgers.run!.history)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  chosen = doors(bands)[0] ?? null
  greet()
  screen = { kind: 'finished' }
  focus(panelAfter('finished'))
  notice = null
  persist()
  paint()
}

// ── The fight ──────────────────────────────────────────────────────────

/**
 * art. 63, as ruled: a door that has a paused fight behind it resumes it.
 * The card is as spent as you left it and the horror as wounded — running is
 * a retreat, never a way to launder a card.
 */
function openTheFight(door: Door): void {
  const at = ledgers.run!.at.instance
  // art. 83: which horror this is comes from what stands in the room's
  // socket, never from the room.
  const horror = horrorOf(here().fills)
  if (horror === null) return
  const held = pausedAt(ledgers, at)
  if (held !== null) {
    resume(at)
    screen = { kind: 'fight', door }
    // art. 63: a paused fight resumed is a fight entered, and focuses the
    // same way it did the first time.
    focus(panelAfter('fight-resumed'))
    ledgers = openDoor(ledgers, door)
    notice = NOTICES['fight.resumed'] ?? ''
    persist()
    paint()
    return
  }
  fight = openFightDoor(ledgers, { door, horror }, goods())
  phase = 'pre'
  selected = []
  screen = { kind: 'fight', door }
  // art. 91: a declared transition, read off the table rather than decided
  // here — the shell states what happened and the law says where that puts
  // the thumb.
  focus(panelAfter('fight-opened'))
  // art. 70: opening a door is an act, and the room it stands in shows it.
  ledgers = openDoor(ledgers, door)
  notice = null
  persist()
  beginAdvance()
  paint()
}

/** art. 75: the fight as it stood, read back out of the run. */
function resume(at: InstanceId): void {
  const held = pausedAt(ledgers, at)
  if (held === null) return
  const horror = horrorById(held.horror)
  if (horror === null) return
  const standing: Standing = restoreFight(
    held,
    ledgers,
    horror,
    LADDER,
    goods(),
    turnLots(ledgers.run!.seed, ledgers.run!.at.step, held.turnNumber),
  )
  fight = standing.fight
  phase = standing.phase
  selected = standing.selected
  advanced = standing.advanced
  closeness = standing.advanced ? 1 : 0
  if (!standing.advanced) beginAdvance()
}

/**
 * art. 30: the horror advances to the near depth and fills the lens. art. 28
 * says a motion that matters never undoes itself, and art. 1 says any pulse
 * is skippable with a settled end state — so every tap settles it, and the
 * tray is live throughout.
 */
function beginAdvance(): void {
  clearTimeout(advanceTimer)
  advanced = false
  closeness = 0
  const step = (): void => {
    closeness = Math.min(1, closeness + 0.1)
    world()
    if (closeness >= 1) return settleAdvance()
    advanceTimer = setTimeout(step, 34) as unknown as number
  }
  advanceTimer = setTimeout(step, 34) as unknown as number
}

function settleAdvance(): void {
  clearTimeout(advanceTimer)
  if (advanced) return
  closeness = 1
  advanced = true
  persist()
}

/** Every entry point settles whatever pulse is running first (art. 1). */
function settle(): void {
  if (screen.kind === 'fight' && !advanced) settleAdvance()
  if (resolving !== null) settleTurn()
}

/**
 * art. 67: everything the duel needs, in the duel's own panel — roll, keep,
 * recast, claim, end the turn, run. The bug this replaces put them in ACTS,
 * so a fight force-focused a panel you then had to leave in order to play.
 */
function fightActs(): void {
  const now = fight
  if (now === null) return
  if (resolving !== null) return
  // art. 36: each casting's lot is a pure function of where the run stands,
  // so the shell never has to hold a half-spent generator between paints.
  const lots = turnLots(ledgers.run!.seed, ledgers.run!.at.step, now.turnNumber)

  if (phase === 'pre') {
    fightPanel.append(
      verb('roll', () => {
        fight = withTurn(now, cast(now.turn, lots(1)))
        phase = 'keep'
        notice = null
        persist()
        paint()
      }),
    )
    return
  }

  if (phase === 'keep') {
    fightPanel.append(
      verb(
        'recast',
        () => {
          fight = withTurn(now, recast(now.turn, lots(2)))
          phase = 'claim'
          selected = []
          notice = null
          persist()
          paint()
        },
        castingsLeft(now.turn) === 0,
      ),
    )
    return
  }

  // art. 41 (amended by the attack ruling of 2026-08-05): the claim phase is
  // one press. The selection *is* the attack, so there is nothing to lock in
  // before ending the turn and nothing to take back — a tap on a chosen die
  // un-chooses it, which is the whole of undo (art. 72's staged selection).
  //
  // A turn therefore claims once. Measured against the Gnawing, claiming the
  // leftovers as well moves the win rate by about a point in either
  // direction — inside the noise — because the second claim scrapes a pair
  // off a hand whose turn is already decided. It cost three presses to buy
  // nothing.
  const line = bestLine()
  if (line === null) {
    // arts 46, 63: a turn without a combo is a turn of armor and patience,
    // and an empty card leaves only armor and flight. The way out of a turn
    // is never conditional on having something to hit with.
    fightPanel.append(verb('end-turn', endTurn))
    return
  }
  fightPanel.append(
    verb('attack', () => {
      fight = withTurn(now, claim(now.turn, selected, line, LADDER, goods()))
      notice = null
      // The claim is on the ledger before the beat runs, so a phone locked
      // mid-resolve wakes with the attack made rather than unmade (art. 75).
      persist()
      endTurn()
    }),
  )
}

/**
 * art. 57: unused dice dim at resolve. The resolve is a beat of presentation
 * and nothing else — it is skippable, its end state is settled, and no
 * decision waits on it (art. 1).
 */
function endTurn(): void {
  const now = fight
  if (now === null) return
  resolving = decide(now.turn, 'end-turn', now.armor, goods())
  selected = []
  paint()
  resolveTimer = setTimeout(settleTurn, 700) as unknown as number
}

function settleTurn(): void {
  clearTimeout(resolveTimer)
  const now = fight
  const resolution = resolving
  resolving = null
  if (now === null || resolution === null) return
  const advancedFight = advanceFight(now, resolution)
  fight = advancedFight
  phase = 'pre'
  selected = []
  switch (routeTurn(advancedFight, resolution)) {
    case 'fight-continues':
      notice = null
      persist()
      paint()
      return
    case 'room-continues':
      return wonTheFight()
    case 'fled':
      return runFromTheFight()
    case 'death':
      return died()
  }
}

function wonTheFight(): void {
  const now = fight
  const here = screen
  if (now === null || here.kind !== 'fight') return
  // art. 63: winning is one of the two things that lets a card refill, and
  // it does it by letting the fight go.
  ledgers = carryOut(ledgers, now)
  fight = null
  screen = { kind: 'room' }
  focus(panelAfter('fight-won'))
  // Winning opens the door, and the door commits the next room (art. 35).
  walk(here.door, NOTICES['fight.won'] ?? null)
}

/**
 * art. 63, as ruled: running **pauses** the fight. The spent card and the
 * horror's wounds go into the run, and the door you back out of is the door
 * you come back to.
 */
function runFromTheFight(): void {
  const now = fight
  if (now === null || screen.kind !== 'fight') return
  clearTimeout(advanceTimer)
  clearTimeout(resolveTimer)
  resolving = null
  ledgers = routeFlight(
    ledgers,
    saveFight(now, ledgers.run!.at.instance, phase, selected, advanced, false),
  )
  fight = null
  screen = { kind: 'room' }
  // art. 63: running leaves the fight where it is and leaves its panel with
  // it. Re-entering the door force-focuses FIGHT again (`openTheFight`).
  focus(panelAfter('fight-fled'))
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  chosen = doors(bands)[0] ?? null
  notice = NOTICES['fight.fled'] ?? ''
  persist()
  paint()
}

function died(cause: string = endLineOf(fight?.horror.id ?? '')): void {
  clearTimeout(advanceTimer)
  clearTimeout(resolveTimer)
  resolving = null
  ledgers = routeDeath(ledgers, cause)
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR, ledgers.run!.history)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  chosen = doors(bands)[0] ?? null
  greet()
  fight = null
  refused = false
  screen = { kind: 'dead' }
  focus(panelAfter('died'))
  notice = null
  persist()
  paint()
}

function tapDie(die: DieId): void {
  const now = fight
  if (now === null) return
  if (phase === 'keep') {
    const held = casting(now.turn)
      .filter((landed) => (landed.die === die ? !landed.kept : landed.kept))
      .map((landed) => landed.die)
    fight = withTurn(now, keep(now.turn, held))
  } else if (phase === 'claim') {
    selected = selected.includes(die)
      ? selected.filter((one) => one !== die)
      : [...selected, die]
  }
  persist()
}

// ── Go ─────────────────────────────────────────────────────────────────

addEventListener('resize', () => {
  painted.clear()
  paint()
})

boot()
