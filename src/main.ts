/**
 * The shell — boot and route. The whole install is a URL.
 *
 * A state machine over the three bands (art. 29): boot into a first waking
 * or a resume, play a room, open a door, fight what is behind it, die, read
 * the Book, and go down again.
 *
 * **Bare on purpose.** The look is the design agent's territory under arts
 * 26–30, and this tranche is explicitly authorised to skip that consult:
 * the animatronic walks before the cover goes on. Nothing here invests in
 * style, and none of it is the real combat UI.
 */

import {
  ALL_RIDERS,
  BARE_BODY,
  CATALOG,
  CROSSING,
  GRAMMAR,
  GRID,
  HAND_SIZE,
  INTENT_SAYS,
  LABELS,
  LADDER,
  NOTICES,
  PLAIN_POUCH,
  ROOM_BOOK,
  atGrid,
  horrorAt,
  roomContent,
} from './content/index.js'
import type { Act, Bands } from './descent/index.js'
import { act, canOpen, chooseDoor, doors, enterRoom, look, nextBeat, remember } from './descent/index.js'
import type { Chain, Door } from './gen/index.js'
import { deal, lotFrom, reseed } from './gen/index.js'
import { advance, carryOut, openFightDoor, routeDeath, routeTurn } from './hinge/index.js'
import type { Card, DieId, Fight, Goods, Line, Lot, Tier } from './lots/index.js'
import {
  LINES,
  advanceFight,
  assemble,
  cast,
  casting,
  castingsLeft,
  claim,
  claimable,
  cursedValue,
  decide,
  disband,
  harm,
  keep,
  recast,
  sealed,
  unused,
  withTurn,
} from './lots/index.js'
import type { Ledgers, Seed } from './state/index.js'
import { browserVault, collect, finish, firstPermanent, load, save, wake } from './state/index.js'
import type { Framebuffer, Prop, Scene } from './room/index.js'
import { integerScale, present, renderRoom } from './room/index.js'

// ── The bands ──────────────────────────────────────────────────────────

const wordBand = must<HTMLDivElement>('word')
const worldBand = must<HTMLElement>('world')
const trayBand = must<HTMLDivElement>('tray')
const canvas = must<HTMLCanvasElement>('view')

function must<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id)
  if (found === null) throw new Error(`no #${id}`)
  return found as T
}

// ── Where we are ───────────────────────────────────────────────────────

type Screen =
  | { readonly kind: 'waking' }
  | { readonly kind: 'room' }
  | { readonly kind: 'fight'; readonly door: Door }
  | { readonly kind: 'dead' }
  | { readonly kind: 'finished' }
  | { readonly kind: 'book' }

type Phase = 'pre' | 'keep' | 'claim'

const vault = browserVault(localStorage)

let ledgers: Ledgers
let chain: Chain
let bands: Bands
let screen: Screen
let notice: string | null = null
/** Set when a door has already refused you here, so the room can say so. */
let refused = false

/** Live only while a fight is on: mid-fight resume is a later tranche. */
let fight: Fight | null = null
let phase: Phase = 'pre'
let selected: readonly DieId[] = []
let fightLot: Lot | null = null

function goods(): Goods {
  return { talismans: ledgers.permanent.keepsakes, riders: ALL_RIDERS }
}

// ── Boot ───────────────────────────────────────────────────────────────

function boot(): void {
  const found = load(vault)
  if (found === null || found.run === null) {
    ledgers = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), freshSeed())
    screen = { kind: 'waking' }
  } else {
    ledgers = found
    // art. 56: a waking that never named a signature is still a first one.
    screen = ledgers.permanent.signature === null ? { kind: 'waking' } : { kind: 'room' }
  }
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.room)
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
  save(ledgers, vault)
}

// ── The world band ─────────────────────────────────────────────────────

/**
 * art. 17: a room renders identical every visit, so a room rendered once is
 * a room rendered forever. The cache is the whole of the shell's
 * performance story — the box is computed per pixel, and it is not cheap.
 */
const painted = new Map<string, Framebuffer>()

function paintRoom(scene: Scene, extra: readonly Prop[], key: string): void {
  const height = Math.max(120, Math.round((GRID * worldBand.clientHeight) / worldBand.clientWidth))
  const stamp = `${key}:${height}`
  let frame = painted.get(stamp)
  if (frame === undefined) {
    const dressed: Scene =
      extra.length === 0
        ? scene
        : { ...scene, props: (view) => [...scene.props(view), ...extra] }
    frame = renderRoom(dressed, atGrid(GRID, height)).frame
    painted.set(stamp, frame)
  }
  present(frame, canvas)
  const scale = integerScale(frame, worldBand.clientWidth, worldBand.clientHeight)
  canvas.style.width = `${frame.width * scale}px`
  canvas.style.height = `${frame.height * scale}px`
}

// ── Painting ───────────────────────────────────────────────────────────

function paint(): void {
  say()
  tray()
  world()
}

function world(): void {
  if (screen.kind === 'fight' && fight !== null) {
    const scene = roomContent(ledgers.run!.at.room).scene
    paintRoom(scene, [advance(fight).prop], `fight:${scene.id}:${fight.horrorHealth}`)
    return
  }
  const room = screen.kind === 'waking' ? CROSSING : ledgers.run!.at.room
  const scene = roomContent(room).scene
  paintRoom(scene, [], scene.id)
}

let fadeTimer: number | undefined

function say(text?: string): void {
  const said = text ?? wordOf()
  wordBand.textContent = said
  wordBand.classList.remove('faded')
  wordBand.onclick = () => {
    // art. 29: tap to recall. Presentation fades; knowledge does not.
    wordBand.classList.remove('faded')
  }
  clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => wordBand.classList.add('faded'), 4000) as unknown as number
}

function wordOf(): string {
  if (notice !== null) return notice
  switch (screen.kind) {
    case 'dead':
      return NOTICES['run.dead'] ?? ''
    case 'finished':
      return NOTICES['run.finished'] ?? ''
    case 'book':
      return NOTICES['book.title'] ?? ''
    case 'fight':
      return fight === null ? '' : (INTENT_SAYS[fight.turn.intent.verb] ?? '')
    default:
      return bands.word?.text ?? ''
  }
}

function tray(): void {
  trayBand.replaceChildren()
  switch (screen.kind) {
    case 'waking':
      return wakingTray()
    case 'room':
      return roomTray()
    case 'fight':
      return fightTray()
    case 'dead':
      return endTray('down again')
    case 'finished':
      return endTray('wake')
    case 'book':
      return bookTray()
  }
}

function row(...kids: readonly Node[]): HTMLDivElement {
  const div = document.createElement('div')
  div.className = 'row'
  div.append(...kids)
  return div
}

function note(text: string): HTMLDivElement {
  const div = document.createElement('div')
  div.className = 'note'
  div.textContent = text
  return div
}

function button(label: string, onClick: () => void, options: { on?: boolean; off?: boolean; cls?: string } = {}): HTMLButtonElement {
  const el = document.createElement('button')
  el.textContent = label
  el.className = [options.cls ?? '', options.on === true ? 'on' : ''].join(' ').trim()
  el.disabled = options.off === true
  el.onclick = onClick
  return el
}

// ── The first waking ───────────────────────────────────────────────────

function wakingTray(): void {
  const pale = PLAIN_POUCH.dice.at(-1)
  const more = bands.word !== null && !bands.word.last
  trayBand.append(
    row(
      ...(more
        ? [button('go on', () => { bands = nextBeat(bands); notice = null; persist(); paint() })]
        : []),
      button('take the pale bone', () => {
        if (pale === undefined) return
        // art. 56: the signature is simply the first die you collect, and
        // art. 11: it crosses to the permanent only by the named ritual.
        ledgers = { ...ledgers, permanent: collect(ledgers.permanent, pale) }
        screen = { kind: 'room' }
        notice = null
        persist()
        paint()
      }),
    ),
    note('six plain bones, and one of them is yours'),
  )
}

// ── The room ───────────────────────────────────────────────────────────

function roomTray(): void {
  const run = ledgers.run!
  const more = bands.word !== null && !bands.word.last
  const acts = bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act] : []))

  if (more) {
    trayBand.append(
      row(button('go on', () => { bands = nextBeat(bands); notice = null; persist(); paint() })),
    )
  }

  trayBand.append(
    row(
      ...bands.tappables.map((target) =>
        // art. 5: tapping never harms. art. 6: looking always answers.
        button(target.noun, () => {
          notice = look(ROOM_BOOK, bands, target).text
          paint()
        }),
      ),
    ),
  )

  if (acts.length > 0) {
    trayBand.append(row(...acts.map((one) => button(one.verb, () => doAct(one)))))
  }

  trayBand.append(row(...doors(bands).map((door) => button(doorLabel(door), () => takeDoor(door)))))

  // A run that walked past its key reaches a door it cannot open, and the
  // engine has no back (art. 9). Being kept is an end like any other: it
  // burns the run, writes its own line, and reseeds (arts 11, 32). The real
  // ruling on a stranded run is a question for the human — see DESIGN.md.
  if (refused && doors(bands).every((door) => !canOpen(ledgers, door))) {
    trayBand.append(row(button('the labyrinth keeps you', () => died('end.kept'))))
  }

  if (run.at.room === CROSSING) {
    trayBand.append(
      row(button('the book of ends', () => { screen = { kind: 'book' }; notice = null; paint() })),
    )
  }

  trayBand.append(
    note(
      `you ${run.health}/${run.healthMax} · armor ${run.armor}` +
        (run.carried.length > 0 ? ` · carrying ${run.carried.length}` : ''),
    ),
  )
}

function doorLabel(door: Door): string {
  const locked = door.demands.length > 0 && !canOpen(ledgers, door)
  return `${door.sense}${locked ? ' (locked)' : ''}`
}

function doAct(one: Act): void {
  ledgers = act(ledgers, one)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.room)
  notice = null
  persist()
  paint()
}

function takeDoor(door: Door): void {
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
  ledgers = chooseDoor(ledgers, chain, door)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.room)
  notice = said
  persist()
  paint()
}

function finishTheDepth(): void {
  // The Warden's door: a terse ending, its own Book line, a fresh waking.
  const permanent = finish(ledgers, 'end.warden')
  ledgers = wake(permanent, reseed(ledgers.run!.seed))
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.room)
  screen = { kind: 'finished' }
  notice = null
  persist()
  paint()
}

// ── The Book ───────────────────────────────────────────────────────────

function bookTray(): void {
  const lines = ledgers.permanent.bookOfEnds
  if (lines.length === 0) trayBand.append(note(NOTICES['book.empty'] ?? ''))
  for (const [n, line] of lines.entries()) {
    trayBand.append(note(`${n + 1} · depth ${line.depth} · ${line.cause} · seed ${line.seed}`))
  }
  trayBand.append(row(button('back', () => { screen = { kind: 'room' }; notice = null; paint() })))
}

// ── The fight ──────────────────────────────────────────────────────────

function openTheFight(door: Door): void {
  const horror = horrorAt(ledgers.run!.at.room)
  if (horror === null) return
  fight = openFightDoor(ledgers, { door, horror }, goods())
  // art. 36: the fight is seeded off the run, so the same door rolls the
  // same way — until a flight discards it, which reseeds by construction.
  fightLot = lotFrom(reseed((ledgers.run!.seed + ledgers.run!.at.step) as unknown as Seed))
  phase = 'pre'
  selected = []
  screen = { kind: 'fight', door }
  notice = null
  paint()
}

function fightTray(): void {
  const now = fight
  const lot = fightLot
  if (now === null || lot === null) return
  const intent = now.turn.intent
  const armorNow = intent.effect?.kind === 'corrode' ? 0 : now.armor
  const laid = casting(now.turn)
  const claimedIds = new Set(now.turn.claims.flatMap((made) => made.dice.map((d) => d.die)))

  // art. 57: everything visible. The horror, its next attack, and its effect.
  trayBand.append(
    note(
      `${LABELS[now.horror.id] ?? now.horror.id} ${now.horrorHealth}/${now.horror.health}` +
        ` · next: ${intent.verb} ${intent.amount}`,
    ),
    note(
      `you ${now.yourHealth}/${now.yourHealthMax} · armor ${armorNow}` +
        // art. 65: a corroding intent is declared, so it says so even over a
        // bare body that had nothing to corrode.
        (intent.effect?.kind === 'corrode' ? ' (corroded)' : ''),
    ),
  )

  // The dice, as they lie.
  if (laid.length > 0) {
    trayBand.append(
      row(
        ...laid.map((landed) =>
          button(
            String(landed.face.value),
            () => tapDie(landed.die),
            {
              cls: `die${landed.kept ? ' kept' : ''}${selected.includes(landed.die) ? ' sel' : ''}${
                claimedIds.has(landed.die) ? ' spent' : ''
              }`,
              off: claimedIds.has(landed.die),
            },
          ),
        ),
      ),
    )
  }

  // The claims made, each one disbandable while the turn is still open.
  if (now.turn.claims.length > 0) {
    trayBand.append(
      row(
        ...now.turn.claims.map((made) =>
          button(`${nameOf(made.tier)} ${harm(made)} ✕`, () => {
            fight = withTurn(now, disband(now.turn, made.line))
            selected = []
            paint()
          }),
        ),
      ),
    )
  }

  // What the selection could take, with the score it would take it for.
  if (phase === 'claim' && selected.length > 0) {
    const lines = claimable(now.turn, selected, LADDER)
    trayBand.append(
      row(
        ...lines.map((line) =>
          button(`${LADDER[line].name} ${scoreOf(line)}`, () => {
            fight = withTurn(now, claim(now.turn, selected, line, LADDER, goods()))
            selected = []
            paint()
          }),
        ),
      ),
    )
    if (lines.length === 0) trayBand.append(note('nothing that selection can take'))
  }

  trayBand.append(row(...fightButtons()))

  if (phase === 'claim') {
    const attackSoFar = now.turn.claims.reduce((total, made) => total + harm(made), 0)
    trayBand.append(
      note(
        `attack ${attackSoFar} · incoming ${Math.max(0, intent.amount - armorNow)} · unused ${
          unused(now.turn).length
        }`,
      ),
    )
  }

  trayBand.append(cardStrip(now.turn.card, sealed(intent)))
}

function nameOf(tier: Tier): string {
  return tier.name
}

function scoreOf(line: Line): number {
  const now = fight
  if (now === null) return 0
  const chosen = casting(now.turn).filter((landed) => selected.includes(landed.die))
  return harm(assemble(line, chosen, LADDER, cursedValue(now.turn.intent), goods()))
}

function fightButtons(): readonly HTMLButtonElement[] {
  const now = fight
  const lot = fightLot
  if (now === null || lot === null) return []
  if (phase === 'pre') {
    return [
      button('roll dice', () => {
        fight = withTurn(now, cast(now.turn, lot))
        phase = 'keep'
        paint()
      }),
    ]
  }
  if (phase === 'keep') {
    return [
      button('re-roll the rest', () => {
        fight = withTurn(now, recast(now.turn, lot))
        phase = 'claim'
        selected = []
        paint()
      }, { off: castingsLeft(now.turn) === 0 }),
      button('keep all', () => { phase = 'claim'; selected = []; paint() }),
      button('run', endTurn('flee')),
    ]
  }
  return [button('end turn', endTurn('end-turn')), button('run', endTurn('flee'))]
}

function endTurn(decision: 'end-turn' | 'flee'): () => void {
  return () => {
    const now = fight
    if (now === null) return
    const resolution = decide(now.turn, decision, now.armor, goods())
    const advanced = advanceFight(now, resolution)
    fight = advanced
    phase = 'pre'
    selected = []
    switch (routeTurn(advanced, resolution)) {
      case 'fight-continues':
        notice = null
        paint()
        return
      case 'room-continues':
        return wonTheFight()
      case 'fled':
        return fledTheFight()
      case 'death':
        return died()
    }
  }
}

function wonTheFight(): void {
  const now = fight
  const here = screen
  if (now === null || here.kind !== 'fight') return
  ledgers = carryOut(ledgers, now)
  fight = null
  fightLot = null
  screen = { kind: 'room' }
  // Winning opens the door, and the door commits the next room (art. 35).
  walk(here.door, NOTICES['fight.won'] ?? null)
}

function fledTheFight(): void {
  // The ruling of 2026-08-04: a fled fight is discarded, and re-entering
  // the door starts it fresh. The pause-not-refill ruling is deferred.
  fight = null
  fightLot = null
  screen = { kind: 'room' }
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.room)
  notice = NOTICES['fight.fled'] ?? ''
  persist()
  paint()
}

function died(cause = 'end.gnawing'): void {
  ledgers = routeDeath(ledgers, cause)
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.room)
  fight = null
  fightLot = null
  refused = false
  screen = { kind: 'dead' }
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
      ? selected.filter((held) => held !== die)
      : [...selected, die]
  }
  paint()
}

function cardStrip(card: Card, shut: readonly Line[]): HTMLDivElement {
  const div = document.createElement('div')
  div.className = 'card'
  for (const line of LINES) {
    const span = document.createElement('span')
    span.className = card[line] ? 'spent' : shut.includes(line) ? 'sealed' : ''
    span.textContent = `${LADDER[line].name}×${LADDER[line].multiplier}  `
    div.append(span)
  }
  return div
}

// ── The endings ────────────────────────────────────────────────────────

function endTray(label: string): void {
  const lines = ledgers.permanent.bookOfEnds
  if (lines.length > 0) trayBand.append(note(`the book of ends: ${lines.length}`))
  trayBand.append(
    row(
      button(label, () => { screen = { kind: 'room' }; notice = null; persist(); paint() }),
      button('the book of ends', () => { screen = { kind: 'book' }; notice = null; paint() }),
    ),
  )
}

// ── Go ─────────────────────────────────────────────────────────────────

addEventListener('resize', () => {
  painted.clear()
  world()
})

boot()
