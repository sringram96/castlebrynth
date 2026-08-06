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
  CASCADE,
  CATALOG,
  CROSSING,
  END_LINES,
  GATE,
  GRAMMAR,
  GRID,
  HAND_SIZE,
  LABELS,
  LADDER,
  MOTION,
  NOTICES,
  PLAIN_POUCH,
  READOUT,
  ROOM_BOOK,
  TABS,
  UNBIDDEN,
  VERBS,
  WARDEN_DOWN,
  advanceBodyOf,
  atGrid,
  keeperStanding,
  encounterOfHorror,
  endLineOf,
  horrorById,
  horrorIn,
  intentChip,
  itemLabel,
  roomContent,
  type RoomContent,
  endLineFor,
  saysAct,
  saysBound,
  saysClaim,
  saysDeath,
  saysDie,
  saysExchange,
  saysFiring,
  saysIntent,
  saysLine,
  saysItem,
} from './content/index.js'
import type { Act, Bands, Pick, Tappable } from './descent/index.js'
import {
  act,
  breathFor,
  canOpen,
  chooseDoor,
  doors,
  enterRoom,
  heldBack,
  isPicked,
  look,
  looking,
  nextBeat,
  onArrival,
  openDoor,
  opens,
  picking,
  pickedDoor,
  remember,
  sceneKey,
  sceneStateOf,
  stranded,
  turnedHere,
  withholding,
} from './descent/index.js'
import { wayOn } from './shell/strip.js'
import type { Held } from './shell/band.js'
import { HUSHED, answered, bandLine, holding, noticed } from './shell/band.js'
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
import type {
  Beat,
  Card,
  Die,
  DieId,
  Fight,
  Frame,
  Goods,
  Landed,
  Line,
  Resolution,
  Shown,
} from './lots/index.js'
import {
  LINES,
  advanceFight,
  assemble,
  atOnce,
  cascadeBeats,
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
  rollBeats,
  sealed,
  tumblingFace,
  unused,
  withTurn,
  woundedBy,
} from './lots/index.js'
import type { FightPhase, InstanceId, ItemId, Ledgers, Panel, Seed } from './state/index.js'
import {
  HOME,
  browserVault,
  descending,
  didHere,
  erase,
  inFlight,
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
import {
  exported,
  importSnapshot,
  preferring,
  quarantined,
} from './state/index.js'
import type { AtTheDoor } from './shell/screens/threshold.js'
import { doorActs, doorWord } from './shell/screens/threshold.js'
import type { SettingsActs, SettingsView } from './shell/screens/settings.js'
import { settingsPanel, settingsWord } from './shell/screens/settings.js'
import type { Framebuffer, Prop, RenderedRoom, Scene, WorldMark } from './room/index.js'
import {
  breathing,
  fillScale,
  markRect,
  overpaint,
  phaseOf,
  present,
  renderRoom,
  stirring,
  swelling,
  unbidding,
} from './room/index.js'

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
  /**
   * The front door (card 61). Boot lands here always — cold, or standing in
   * the middle of a fight — and Continue is one press back to exactly where
   * you were, focus and all. The cost is one press per reload; the gain is a
   * front door you never have to go and find, and somewhere for the Book and
   * the settings to live that is not inside a run.
   *
   * **Straw default, pending veto.** The alternative is booting into the run
   * with the threshold reachable from somewhere, and that needs its own
   * ruling about where.
   */
  | { readonly kind: 'threshold' }
  /**
   * art. 116 (card 62). A screen of its own for the reason the other two
   * are: there is nowhere else to be until you leave it. It stands on the
   * threshold's room, because it is a thing you do at the door.
   */
  | { readonly kind: 'settings' }
  | { readonly kind: 'room' }
  /**
   * art. 60: the hand is assembled from the pouch **for the descent**, so
   * when the pouch has outgrown the hand the descent opens by asking which
   * dice come down. It is a screen of its own because it is a decision of
   * its own — not a thing done in passing from a panel.
   */
  | { readonly kind: 'choosing' }
  | { readonly kind: 'fight'; readonly door: Door }
  /**
   * **The ending is the scrawling** (the mind wave). Death is forgetting, so
   * what the word band shows at the end of a run is not a summary of it — it
   * is him getting one line down before it all goes, and the cause is which
   * line. The next waking opens on that same line (`RoomBook.scrawl`).
   */
  | { readonly kind: 'dead'; readonly cause: string }
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
/**
 * Where Continue goes. Boot works out the screen the run was left on — a
 * room, or the fight it was standing in the middle of — and then lands on
 * the threshold instead, holding it. So the front door costs a press and
 * loses nothing (arts 75, 91).
 */
let resumed: Screen = { kind: 'room' }
/** Set while the door is asking whether the run should really be given up. */
let abandoning = false
/**
 * card 69: **the band's third state.** art. 29 gave the word band two jobs —
 * what you are looking at, and what is coming — and the shell had one slot
 * for both, with nowhere at all for what just happened. So an act's answer
 * and a tap's answer fought over one variable, and an act with no authored
 * line fell straight through to the candle underneath.
 *
 * `Held` is that slot split in three with a priority: **an act's answer,
 * then what you are looking at, then the ambient** (`src/shell/band.ts`).
 * The ambient is `wordOf()` and is never null — art. 69 says silence is a
 * bug, and the bottom of a priority order is where a silence would hide.
 */
let band: Held = HUSHED
/** Set when a door has already refused you here, so the room can say so. */
let refused = false
/** art. 74: the card and the Book live behind glyphs, never mid-screen. */
let sheet: 'card' | 'book' | null = null
/**
 * Which door the thumb has picked. Sensing and going are two acts (art. 71),
 * and under the ruling of 2026-08-06 the act strip serves the *last* look:
 * tapping anything else releases this, and no pick means no door verb.
 */
let pick: Pick = null
/**
 * art. 60: the dice picked out on the choosing screen, in the order they
 * were picked. Empty everywhere else — the pouch itself is informative and
 * commits nothing (art. 67).
 */
let picked: readonly DieId[] = []

/** A first casting holds nothing back: everything in the hand is in the air. */
const NOTHING_HELD: ReadonlySet<string> = new Set<string>()

/** art. 75: mirrored into the run on every mutation, never only here. */
let fight: Fight | null = null
let phase: FightPhase = 'pre'
let selected: readonly DieId[] = []
/** art. 28: the advance is a motion that matters, so it is remembered. */
let advanced = false
let closeness = 1
let advanceTimer: number | undefined
/**
 * art. 1: a pulse in presentation, skippable, with a settled end state.
 *
 * art. 119: and the two of them are one thing now. `resolving` is what the
 * engine answered at the press and `resolved` is the fight it advanced to —
 * both computed **before the first frame is drawn**, so every beat between
 * here and `settleTurn` reveals what is already true and decides nothing.
 */
let resolving: Resolution | null = null
let resolved: Fight | null = null

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
  pick = onArrival(doors(bands))
  greet()
  // art. 117: a reseed is a new labyrinth, so nothing in it has spoken yet.
  spoken.clear()
  unbidden = null
  // art. 75: a half-spent turn survives the lock screen. If one was in
  // flight rather than paused, boot lands back inside it, selection and all.
  // A fight you ran out on is saved the same way and stays where you left
  // it — in the room, behind its door (art. 63).
  const held = pausedAt(ledgers, ledgers.run!.at.instance)
  // card 31: the Warden's door carries no fight tag — its keeper stands in
  // no socket (art. 37 as amended) — so a boot mid-keeper looks for the door
  // that ends the depth as well.
  const gate =
    doors(bands).find((door) => door.fight !== undefined) ??
    doors(bands).find((door) => door.ends === true)
  if (held !== null && held.engaged && gate !== undefined) {
    resume(held.at)
    // art. 91: booting is not a transition. Focus is state, and the state
    // says where the thumb was — a player who locked the phone on the pouch
    // comes back to the pouch, fight or no fight. `panelNow` clamps the one
    // case that could go stale (a save on FIGHT with no fight left).
    if (fight !== null) screen = { kind: 'fight', door: gate }
  }
  // The front door. Everything above has already put the run back exactly as
  // it stood, so Continue is one press and restores nothing further — it
  // only stops holding it (art. 75).
  resumed = screen
  screen = { kind: 'threshold' }
  abandoning = false
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

/** Whether the thumb is at the front door rather than inside the labyrinth. */
function atTheDoor(): boolean {
  return screen.kind === 'threshold' || screen.kind === 'settings'
}

/**
 * art. 116: whether this player has asked for the world to hold still.
 *
 * It is read straight off the permanent every time rather than mirrored into
 * a local, so there is one statement of it and nothing that can go stale
 * across a wipe, an import or a death.
 */
function stillness(): boolean {
  return ledgers.permanent.prefs.reducedMotion
}

/**
 * The world band.
 *
 * `marks` is false on a clock tick: the tap regions are laid out at the
 * coordinates the props are painted at (art. 68), and none of those move — a
 * loop moves what a pixel *is*, never where a thing stands (art. 110) — so
 * rebuilding the DOM under a thumb ten times a second would be a cost with
 * nothing on the other side of it.
 */
function world(marks = true): void {
  // The threshold is a room, cast the way any room is cast (art. 21). What
  // it is not is a menu with a picture behind it, so it goes through the
  // same renderer and the same cache as everything else.
  if (atTheDoor()) {
    markLayer.replaceChildren()
    const stamp = `gate:${frameHeight()}`
    let plate = painted.get(stamp)
    if (plate === undefined) {
      plate = renderRoom(GATE, atGrid(GRID, frameHeight()))
      painted.set(stamp, plate)
    }
    show(plate.frame)
    return
  }
  const node = here()
  const content = roomContent(node.room)
  const state = sceneStateOf(ledgers, ROOM_BOOK, node)
  const scene = content.scene(state)
  const base = castOf(scene, sceneKey(state))
  // art. 30: no battle screen — the horror is a prop laid into this room's
  // own frame, so the box behind it is never cast twice for a motion.
  //
  // art. 100, card 31: a horror that has been drawn advances as its drawing.
  // Everything else keeps the mass the hinge draws, which is art. 26's first
  // tier and right for a shape at the end of a corridor.
  const close = screen.kind === 'fight' && fight !== null ? [advanceWith(fight, closeness)] : []
  // arts 106–110: and the stir, which is overlay repaint and never a recast.
  // art. 116: with the world held still there is no overlay at all, so what
  // shows is the cast frame — which is the settled state, and art. 107 says
  // the settled state is the whole truth.
  const moving = stillness()
    ? []
    : [
        ...stirring(scene.motion, base.view, tick),
        ...unbidding(scene.motion, base.view, unbidden?.at ?? -1),
      ]
  const over = [...close, ...moving]
  show(over.length === 0 ? base.frame : overpaint(base, over))
  if (marks) layMarks(base, content)
}

/**
 * art. 110: the frame the cast made, held. The cache is keyed on the scene
 * state (art. 70) and on the frame's height, and — where a room's light
 * swells — on which of the two frames this is.
 *
 * The two casts are the one case an overlay cannot do: the light reaches
 * every surface in the room, and what colour a surface takes is the cast's to
 * decide (art. 15). So the room is cast twice, a lift apart, and the clock
 * chooses between two prepared frames rather than changing what a pixel
 * means (art. 17, unamended).
 */
function castOf(scene: Scene, key: string): RenderedRoom {
  const lit = !stillness() && swelling(scene, tick)
  const stamp = `${key}:${frameHeight()}${lit ? ':lit' : ''}`
  let held = painted.get(stamp)
  if (held === undefined) {
    held = renderRoom(
      lit ? breathing(scene, scene.motion?.swell ?? 0) : scene,
      atGrid(GRID, frameHeight()),
    )
    painted.set(stamp, held)
  }
  return held
}

/** art. 30: the thing come close, in whichever body content gave it. */
function advanceWith(now: Fight, close: number): Prop {
  const drawn = advanceBodyOf(now.horror.id)
  return drawn === null
    ? advance(now, close).prop
    : advance(now, close, (_, settled) => drawn(settled)).prop
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
    // art. 68: the region that answers for a door is the door's own place, so
    // it comes from the same call the paint came from (art. 97's marks).
    const where = content.doorMarks(ahead.length)
    ahead.forEach((door, i) => place(where[i] ?? content.door, doorMark(door)))
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
    // art. 71 (strengthened 2026-08-06): the act strip serves the last look.
    // Attention has moved to this thing, so the door the thumb was holding is
    // released and its verb leaves the strip — nothing irreversible may be
    // one press away from a thumb that is looking somewhere else.
    pick = picking({ kind: 'thing', id: target.id })
    // art. 68: the tap is the inspection — the word band is the whole of it,
    // and there is no button behind it. And looking summons: the verb about
    // this thing appears in ACTS once it has been looked at.
    //
    // card 67: the pocket goes with the question. A lock names what it wants,
    // or — carrying the key — names what fits, and that second answer is
    // what makes the verb it summons legible before it is pressed.
    //
    // art. 118: and the third question, which is whether the act about this
    // thing is being withheld. A withheld verb is absent, so the look is the
    // only place its reason can be — a basin a whole body cannot drink says
    // so when you look at it, and says nothing anywhere else.
    band = noticed(
      look(
        ROOM_BOOK,
        bands,
        target,
        ledgers.run?.carried ?? [],
        withholding(ledgers, ROOM_BOOK, here(), target.id),
      ).text,
    )
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
  el.className = `door${isPicked(pick, door) ? ' chosen' : ''}`
  el.setAttribute('aria-label', LABELS['door.ahead'] ?? 'the door')
  el.onclick = () => {
    settle()
    // art. 71: a bare tap never walks you through a door. It picks it out,
    // and the going is a verb in the act strip.
    pick = picking({ kind: 'door', door })
    // art. 118: a door with something still owed to the room offers no verb,
    // so the door's own answer is where that has to be said. It still names
    // nothing and points at nothing (art. 3) — what changed is that the
    // player now hears it by looking rather than by pressing and failing.
    band = noticed(
      (heldBack(ledgers, ROOM_BOOK, here()).length > 0
        ? NOTICES['door.held']
        : NOTICES['door.blind']) ?? '',
    )
    paint()
  }
  return el
}

// ── The world clock (arts 109, 117) ────────────────────────────────────

/**
 * art. 109: **one clock, and everything that loops rides it.** No per-thing
 * timers and no drift between visits — a loop's phase is hashed off its own
 * identity, so the same room breathes the same way every time you stand in
 * it, and two loops in one room never pulse together.
 */
let tick = 0
/**
 * art. 117: how many ticks the thumb has been still. The unbidden beat is
 * scheduled off this rather than off the clock outright, so the room never
 * speaks over an answer the player just asked for.
 */
let stillFor = 0
/** art. 117: the beat playing now, and how far into it. */
let unbidden: { readonly at: number; readonly frames: number } | null = null
/**
 * art. 117: **said once.** Which instances have already done their one thing.
 * It is shell state and not the run's on purpose — an unbidden beat may never
 * gate anything and is never required reading, so a rung on the vault for it
 * would cost every player a migration for a line that means nothing if it is
 * missed.
 */
const spoken = new Set<string>()

setInterval(onTick, MOTION.tick)

function onTick(): void {
  // art. 116: with the world held still, no loop runs and the blink never
  // fires. The clock is what stops — a clock left running with its output
  // filtered is a thing somebody later forgets is running.
  if (stillness()) return
  // Nothing loops on a screen: the front door, the settings, the choosing and
  // the two endings are all held still by having nothing that moves in them.
  if (screen.kind !== 'room' && screen.kind !== 'fight') return
  if (sheet !== null) return
  tick += 1
  stillFor += 1
  if (unbidden !== null) {
    const at = unbidden.at + 1
    // art. 1: a one-shot ends in the settled state, and the settled state of
    // a room that did something of its own accord is the room.
    unbidden = at >= unbidden.frames ? null : { at, frames: unbidden.frames }
  } else {
    theUnbidden()
  }
  world(false)
}

/**
 * art. 117: **a room may do one small thing of its own accord.** Rarely,
 * deterministic per instance, at most one line, and never a thing the player
 * has to have seen.
 *
 * The delay is hashed off the instance, so a room does its thing at the same
 * moment every time you stand still in it and two rooms never do theirs
 * together. It waits on the *thumb* being still rather than on the clock
 * outright, which is what keeps it from ever landing on top of a tap.
 *
 * It does not wait on the word band being empty, and the first cut of this
 * did: an answer sits in the band until something clears it, so a room whose
 * last tap left a line would never speak at all. The soonest delay is twice
 * the fade (art. 29), so by the time the room says anything the answer has
 * been read and has gone dim — and the candle underneath is untouched either
 * way, which is the part art. 117 actually protects.
 */
function theUnbidden(): void {
  if (screen.kind !== 'room') return
  const node = here()
  const at = node.instance as string
  if (spoken.has(at)) return
  const one = roomContent(node.room).scene(sceneStateOf(ledgers, ROOM_BOOK, node)).motion?.unbidden
  if (one === undefined) return
  if (stillFor < MOTION.unbidden.soonest + phaseOf(at, MOTION.unbidden.spread)) return
  spoken.add(at)
  unbidden = { at: 0, frames: one.frames }
  // art. 117: the line rides the notice, which is the one thing in the shell
  // that sits *over* the word band without touching the candle underneath —
  // so the beat the player was on is exactly where they left it.
  const said = UNBIDDEN[node.room as string]
  if (said !== undefined) {
    band = answered(said)
    say()
  }
}

// ── Painting ───────────────────────────────────────────────────────────

function paint(): void {
  // art. 117: the thumb has just done something, so the room's own moment
  // starts counting again from here.
  stillFor = 0
  say()
  tray()
  world()
  crown()
  drawSheet()
}

let fadeTimer: number | undefined

function say(): void {
  // card 69: the priority, and the only place it is resolved.
  const ambient = wordOf()
  wordBand.replaceChildren(document.createTextNode(bandLine(band, ambient)))
  // card 69: a held line is the same promise a candle-still-to-come is —
  // there is something underneath this, and one tap gets to it — so it wears
  // the same mark. Without it the exchange would sit on the band looking
  // like the last word there is, and the intent behind it would never be
  // read by anybody who did not think to tap.
  const left = holding(band) ? (bandLine(band, ambient) === ambient ? 0 : 1) : candlesLeft()
  if (left > 0) {
    const more = document.createElement('span')
    more.className = 'more'
    // Not a word: a mark, so the candle that is still to come is visible
    // without the word band ever instructing (arts 29, 66).
    more.textContent = ` ${'·'.repeat(left)}`
    wordBand.append(more)
  }
  wordBand.classList.remove('faded')
  clearTimeout(fadeTimer)
  // art. 29: presentation fades and knowledge does not, so the fade stays
  // whatever the setting says — art. 116 governs how a thing is shown, and
  // the word band's settled state is faded either way. What reduced motion
  // takes off it is the transition, which is a class on the root and not a
  // branch here.
  document.documentElement.classList.toggle('still', stillness())
  fadeTimer = setTimeout(() => wordBand.classList.add('faded'), 4000) as unknown as number
}

/**
 * How many candles are still to come under whatever is showing.
 *
 * A room's are its beats (art. 29). An ending's are its own two — the death
 * and the scrawl — which are not in `bands` at all, because the room behind
 * the dead screen is the *next* run's Crossing and its candles are not what
 * is being read (card 69).
 */
function candlesLeft(): number {
  if (screen.kind === 'dead') return Math.max(0, ending.length - 1 - endingAt)
  if (screen.kind !== 'room') return 0
  return bands.beats.length - 1 - (bands.word?.index ?? 0)
}

wordBand.onclick = () => {
  settle()
  // art. 29: presentation fades, knowledge doesn't. One tap recalls the
  // word; the same tap turns the candle when there is another (art. 67 keeps
  // the beat advance out of the tray).
  if (holding(band)) {
    band = HUSHED
  } else if (screen.kind === 'dead') {
    // card 69: the ending turns its own candles — the death, then the scrawl.
    if (endingAt < ending.length - 1) endingAt += 1
  } else if (bands.word !== null && !bands.word.last) {
    bands = nextBeat(bands)
    persist()
  }
  paint()
}

function wordOf(): string {
  switch (screen.kind) {
    case 'threshold':
      return doorWord(atTheDoorNow())
    case 'settings':
      return settingsWord(theSettings())
    /**
     * **The ending, in two candles** (card 69): him having it, then the
     * scrawl he gets down before it all goes. The second one is the one that
     * survives — the next waking opens on it (`RoomBook.scrawl`) — and the
     * first is what makes it read as a thing he wrote rather than as a
     * caption on a corridor that is already the next run's.
     *
     * A dying man does not compose a sentence about his pouch, so art. 60's
     * clause — an ending with a choice behind it says so — is carried by the
     * verb instead of by the word: the strip says Choose, and the screen
     * behind it states the situation (`choose.which`).
     */
    case 'dead':
      return ending[Math.min(endingAt, ending.length - 1)] ?? END_LINES[screen.cause] ?? ''
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
    band = noticed(saysIntent(now.turn.intent))
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
  // art. 116, and the reason the Book's own `Forget` is gone: wiping is a
  // presentation-free act about everything the vault holds, and section 5
  // puts it beside export — a player about to lose their Book should be one
  // press from keeping a copy of it. Two doors to one destructive act is one
  // too many, so the sheet is a reader again and nothing else.
  sheetBand.append(
    row(
      ...(sheet === 'card' ? [verb('book', () => { sheet = 'book'; paint() })] : []),
      verb('close', () => { sheet = null; paint() }),
    ),
  )
}

/**
 * Start over. The vault is emptied and the shell boots exactly as it boots
 * on a machine that has never run the game — there is no separate "new game"
 * path to keep in step with the ordinary one, because a second path is a
 * second thing to get wrong.
 */
/**
 * Everything the shell is holding, put down.
 *
 * Whatever pulse was running has nothing left to settle *into* — the ledgers
 * it would have written are about to be replaced — so the timers are stopped
 * rather than settled, and art. 1's end state is whatever the boot after
 * this lands on.
 */
function settleEverything(): void {
  clearTimeout(advanceTimer)
  clearTimeout(fadeTimer)
  stopBeats()
  resolving = null
  resolved = null
  fight = null
  phase = 'pre'
  selected = []
  advanced = false
  closeness = 1
  wiping = false
  sheet = null
  pick = null
  picked = []
  spoken.clear()
  unbidden = null
  refused = false
  abandoning = false
  painted.clear()
}

function forgetEverything(): void {
  settleEverything()
  erase(vault)
  // No separate "new game" path: `boot` already knows how to start from a
  // vault with nothing in it, because that is what a new install is. A
  // second path would be a second thing to keep in step.
  boot()
  band = answered(NOTICES['forget.done'] ?? null)
  paint()
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

/**
 * art. 11: the Book of Ends, read.
 *
 * A line is the **ending's own sentence** and then its numbers. It used to be
 * the numbers alone, which is a receipt rather than a record — the sentences
 * were authored for this sheet and had never reached it.
 *
 * The scrawl at the head of it is drawn by exactly this code and no other. It
 * is not marked out by identity — nothing here asks which line it is — but by
 * what it has: **a line with no run behind it takes no ordinal and no
 * numbers**, because it is not an ending and there is nothing true to print
 * in those columns. The endings number themselves, from one, among
 * themselves.
 */
function bookLines(): void {
  const lines = ledgers.permanent.bookOfEnds
  if (lines.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'line open'
    empty.textContent = NOTICES['book.empty'] ?? ''
    sheetBand.append(empty)
    return
  }
  let ending = 0
  for (const line of lines) {
    const div = document.createElement('div')
    div.className = 'line open'
    const said = END_LINES[line.cause] ?? line.cause
    // A run behind it is what makes a line an ending. Without one there is
    // no number it could wear and no numbers it could carry.
    const ofARun = line.seed !== null || line.depth !== null
    const left = document.createElement('span')
    left.textContent = ofARun ? `${(ending += 1)} · ${said}` : said
    div.append(left)
    if (ofARun) {
      const unknown = READOUT.unknown ?? ''
      const right = document.createElement('span')
      right.className = 'tag'
      right.textContent = `${READOUT.depth} ${line.depth ?? unknown} · ${READOUT.seed} ${
        line.seed ?? unknown
      }`
      div.append(right)
    }
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
      band = HUSHED
      persist()
      paint()
    }
    tabBar.append(el)
  }
  // art. 60: while the choice is being made there is nowhere else to be —
  // and the same is true at the front door, which is a screen for the same
  // reason. Neither of them touches the tray.
  if (screen.kind === 'choosing' || atTheDoor()) return
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
  // A screen takes the whole panel area: there is nowhere else to be until
  // it is answered, so ACTS is the only thing under it and the other two are
  // shut (art. 67).
  if (atTheDoor()) {
    fightPanel.classList.remove('on')
    // art. 116's screen is a sheet of settings rather than a strip of verbs,
    // so it takes the panel area the pouch and the choosing screen take.
    const settling = screen.kind === 'settings'
    pouchRegion.classList.toggle('on', settling)
    actStrip.classList.toggle('on', !settling)
    if (settling) return settingsPanel(pouchRegion, theSettings(), SETTINGS_ACTS, verb)
    return acts()
  }
  // art. 60: the choosing screen takes the whole panel area. It is not a
  // panel you can tab to — it is what the tray is until the choice is made.
  if (screen.kind === 'choosing') {
    actStrip.classList.remove('on')
    // And emptied, not merely hidden: the strip it was showing belonged to
    // the room the run ended in, and a hidden verb is still a verb the
    // thumb can reach if anything ever unhides it.
    actStrip.replaceChildren()
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
  // The rail is the body's numbers, and at the front door there is no body
  // in the labyrinth to have any (art. 67: the tray holds what the moment
  // offers, and this moment offers a door).
  if (atTheDoor()) return
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
  // art. 119: while a cascade runs, the running total is the cascade's — it
  // is being *built* out of the dice, one lift at a time, and a readout that
  // showed the finished number would give away the whole beat before the
  // first die had lifted.
  totals.append(
    reading(
      READOUT.attack ?? '',
      `${shown?.attack ?? now.turn.claims.reduce((sum, made) => sum + harm(made), 0)}`,
    ),
    reading(READOUT.incoming ?? '', `${Math.max(0, now.turn.intent.amount - armorNow)}`),
    reading(READOUT.unused ?? '', `${unused(now.turn).length}`),
  )
  // art. 119: **the line names itself, with its multiplier** — and then
  // stands, because what it says is what the climb is about to do.
  if (named !== null) totals.append(reading('', named))
  const priced = pricedNow()
  if (priced > 0) totals.append(reading(READOUT.cost ?? '', `${priced}`))
  // art. 57: everything visible, and art. 65: a bleed is a number the plan
  // has to be made against. What it will take at the top of the next turn,
  // after armor — the fight's own armor, because corrosion is something an
  // *intent* does and a bleed is not this turn's intent.
  if (now.bleed !== null) {
    totals.append(reading(READOUT.bleeding ?? '', `${Math.max(0, now.bleed.amount - now.armor)}`))
  }
  const offer = claimOffer()
  if (offer !== null) totals.append(reading('', offer))
  totals.append(cardGlyph())
  fightPanel.append(totals)

  // The hand, as it lies. art. 72's four states are the die slot's business
  // and have not moved.
  //
  // art. 65 (`bind`): a bound die is not on the table — it never landed —
  // so it is drawn from the hand instead, shut, at the end of the row. The
  // hole in the hand is the whole of what the effect does, and a hole you
  // cannot see is a number in a log.
  const laid = casting(now.turn)
  const byId = new Map(ledgers.run!.hand.dice.map((die) => [die.id as string, die] as const))
  const heldFast = new Set<string>(now.turn.bound)
  if (laid.length > 0) {
    const spent = claimedDice(now.turn)
    for (const landed of laid) {
      const die = byId.get(landed.die)
      if (die === undefined) continue
      fightPanel.append(dieSlot(die, landed, spent.has(landed.die)))
    }
  } else {
    for (const die of ledgers.run!.hand.dice) {
      if (heldFast.has(die.id as string)) continue
      fightPanel.append(dieSlot(die, null, false))
    }
  }
  for (const id of now.turn.bound) {
    const die = byId.get(id as string)
    if (die !== undefined) fightPanel.append(boundSlot(die, now.horror.id))
  }
  fightActs()
}

/**
 * art. 65 (`bind`), arts 68–69: a die somebody else is holding. It answers
 * with its own truth and with who is holding it, and it commits nothing —
 * there is nothing to commit, which is the point of it.
 */
function boundSlot(die: Die, horror: string): HTMLButtonElement {
  const el = slot('die bound')
  el.append(pips(die.faces[0]?.value ?? 1))
  el.setAttribute('aria-label', saysBound(die, horror))
  el.onclick = () => {
    settle()
    band = noticed(saysBound(die, horror))
    paint()
  }
  return el
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
  //
  // card 71: and the reason is a *reason*, not a refusal. This used to print
  // the offer and "No combo uses exactly these dice" side by side, which
  // reads as the tray offering something and denying it in one breath.
  return fitsNothing(now.turn, selected, LADDER)
    ? `${offer} · ${NOTICES['claim.floor'] ?? ''}`
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
  // art. 119, card 75: **dice do not appear, they land.** Until this one's
  // own beat, it is still in the air — and the face it shows while it is
  // there is hashed off its identity, never rolled, because nothing is
  // decided during an animation.
  const air = landed !== null && shown !== null && !shown.landed.includes(landed.die)
  // art. 119 §2: **a claimed die lifts, alone**, brightening — and it stays
  // lifted, because the total it fed is still climbing off it.
  const lift = landed !== null && (shown?.lifted.includes(landed.die) ?? false)
  const el = slot(
    `die${landed === null ? ' rest' : ''}${air ? ' rolling' : ''}${lift ? ' lifted' : ''}${
      kept ? ' kept' : ''
    }${isSelected ? ' sel' : ''}${claimed ? ' claimed' : ''}${idle}`,
  )
  if (landed !== null) {
    const face = air ? die.faces[tumblingFace(landed.die, spun, die.body)] : landed.face
    el.append(pips(face?.value ?? landed.face.value))
  }
  // …with its own small `+n`, in the moment it lifts and in no other. A
  // number that stood on every lifted die would be a column of arithmetic;
  // this is one die saying what it was worth.
  if (landed !== null && beatNow?.kind === 'lift' && beatNow.die === landed.die) {
    const gain = document.createElement('span')
    gain.className = 'gain'
    gain.textContent = `+${beatNow.value}`
    el.append(gain)
  }
  el.setAttribute('aria-label', saysDie(die, landed?.face))
  // art. 69: silence is a bug. A die answers with its declared truth whether
  // or not the tap also does something to it.
  el.onclick = () => {
    settle()
    const spentIn = claimed ? claimIn(landed!.die) : undefined
    band = noticed(saysDie(die, landed?.face, spentIn ?? undefined))
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
    band = noticed(NOTICES['pouch.empty'] ?? '')
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
    band = noticed(saysDie(die))
    paint()
  }
  return el
}

function carriedSlot(item: ItemId): HTMLButtonElement {
  const el = slot('carried')
  el.textContent = itemLabel(item).replace(/^the /, '')
  el.onclick = () => {
    settle()
    band = noticed(saysItem(item))
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
    case 'threshold':
      return doorActs(actStrip, atTheDoorNow(), DOOR_ACTS, verb)
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
      // card 69: **Wake, not Descend.** art. 71 says no press may lie about
      // where it takes you, and after a death the two words mean different
      // things: death is forgetting (rules/voice.md), and what comes next is
      // waking up at the Crossing again with nothing but what is written
      // down. Descend was the front door's word standing on a death screen,
      // which was most of why dying read as arriving.
      return actStrip.append(
        verb(mustChoose(ledgers.permanent) ? 'choose' : 'wake', beginDescent),
        verb('read', () => { sheet = 'book'; paint() }),
      )
    case 'finished':
      // And the other way round: the Warden's door is walked through, not
      // died at. He is going down a floor, so the word is Descend.
      return actStrip.append(
        verb(mustChoose(ledgers.permanent) ? 'choose' : 'descend', beginDescent),
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
  // art. 71 as strengthened: a door verb may only ever commit the door
  // currently picked, and no pick means no door verb on the strip. There is
  // deliberately no fallback to the first door — the strip re-picking on its
  // own is exactly the defect, said in the shell instead of in a variable.
  //
  // card 67: **and only an unlocked door offers its way on.** A locked
  // door's verbs are absent, not disabled (art. 68) — what the player gets
  // instead is the lock, which answers, and the verb the answer summons.
  //
  // art. 118: **and only a door that would actually give.** The way on is
  // one question asked in one place (`wayOn`), and a null answer is the
  // article: a room still owed something offers no door verb at all, rather
  // than a press that fails and leaves the strip exactly as it was.
  //
  // card 31: the Warden's door is a fight-door for as long as its keeper is
  // standing, and Descend is what is left once it is not — art. 71, since
  // those two words mean different journeys and neither may lie.
  const door = pickedDoor(pick, ahead)
  const way = door === null ? null : wayOn(ledgers, ROOM_BOOK, here(), door, keeperUp(door))
  if (door !== null && way !== null) {
    actStrip.append(verb(way, () => commitDoor(door)))
  }

  // A run that walked past its key would reach a door it cannot open, and
  // the engine has no back (art. 9). art. 3 now makes that unreachable — the
  // door refuses to commit while the key is still on the floor — so this is
  // the valve for a chain that failed the guarantee, not the ordinary path.
  //
  // card 67 moved it off the press: with a locked door's verb absent there
  // is no press left to be refused by, so the valve reads the room instead.
  // A lock you are carrying the key to is not stranded — the press is one
  // tap away, and finding it is the ceremony.
  if (refused || stranded(ledgers, ROOM_BOOK, here())) {
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

// ── The Warden (card 31, art. 37 as amended 2026-08-06) ────────────────

/** card 31: the rule is content's; this is the shell asking it (arts 63, 71). */
function keeperUp(door: Door): boolean {
  const node = here()
  return keeperStanding(
    door,
    node,
    turnedHere(ledgers, ROOM_BOOK, node, door),
    sceneStateOf(ledgers, ROOM_BOOK, node).done,
  )
}

function doAct(one: Act): void {
  // art. 118: a mercy a whole body cannot drink is no longer on the strip at
  // all, so a mercy that is pressed is always a mercy that lands — which is
  // why there is no longer a branch here asking which of the two happened.
  ledgers = act(ledgers, one)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  // art. 70: prose confirms, pixels prove — the answer is the room without
  // the thing in it, which the scene state has already stopped drawing.
  //
  // card 69: **every act answers, and it answers with its own line.** The id
  // is the key, because that is already the key art. 66 looks the verb up
  // by — one lookup, one place to author, and `test/answers.test.ts` walks
  // the catalog so a new act cannot ship without one.
  //
  // There is no fallback left. The old one fell through to the candle the
  // player was standing on, which is the candle describing the thing they
  // had just picked up: *Take bone* answered *"There is a bone in it."*
  band = answered(saysAct(one.id))
  persist()
  // card 31: **turning the key is what wakes it.** The hall answers in one
  // line and the thing arrives at the near depth — art. 30, so the room is
  // the room and the tray is what turns to combat.
  const waking = here().doors.find((door) => keeperUp(door))
  if (one.unlocks !== undefined && waking !== undefined) {
    return openTheFight(waking, NOTICES['warden.wakes'] ?? saysAct(one.id))
  }
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
      band = noticed(saysDie(die))
      picked =
        at >= 0
          ? picked.filter((one) => one !== die.id)
          : picked.length >= size
            ? picked
            : [...picked, die.id]
      if (at < 0 && picked.length >= size && !picked.includes(die.id)) {
        // Full: the tap still answered, and the hand did not move (art. 5).
        band = noticed(NOTICES['choose.full'] ?? saysDie(die))
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
    band = answered(NOTICES['choose.short'] ?? '')
    return paint()
  }
  const permanent = chooseHand(ledgers.permanent, picked)
  ledgers = { permanent, run: tookIntoRun(ledgers.run!, permanent) }
  picked = []
  screen = { kind: 'room' }
  band = HUSHED
  persist()
  paint()
}

// ── The threshold (card 61) ────────────────────────────────────────────

/** What is true at the door, as the screen needs it. */
function atTheDoorNow(): AtTheDoor {
  return {
    inFlight: inFlight(ledgers),
    hasBook: ledgers.permanent.bookOfEnds.length > 0,
    abandoning,
  }
}

/**
 * The four presses. Every one of them is here rather than in the screen,
 * which knows what is true and nothing about what to do with it.
 */
const DOOR_ACTS = {
  /**
   * art. 75: the run and its panel focus, exactly as they stood — including
   * mid-fight. Boot already restored all of it, so this stops holding it
   * rather than rebuilding it, and there is nothing to get wrong.
   */
  resume(): void {
    screen = resumed
    band = HUSHED
    paint()
  },
  descend(): void {
    beginDescent()
  },
  arm(): void {
    abandoning = true
    band = HUSHED
    paint()
  },
  abandon(): void {
    abandonTheRun()
  },
  keep(): void {
    abandoning = false
    band = HUSHED
    paint()
  },
  read(): void {
    sheet = 'book'
    paint()
  },
  settings(): void {
    wiping = false
    imported = null
    screen = { kind: 'settings' }
    band = HUSHED
    paint()
  },
}

// ── Settings (card 62, art. 116) ───────────────────────────────────────

/** Set while the settings screen is asking whether everything should go. */
let wiping = false
/** What the last import said, so the screen can say it too (art. 69). */
let imported: 'took' | 'refused' | null = null

function theSettings(): SettingsView {
  return {
    prefs: ledgers.permanent.prefs,
    snapshot: exported(vault),
    quarantine: quarantined(vault),
    wiping,
    imported,
  }
}

const SETTINGS_ACTS: SettingsActs = {
  /**
   * art. 116: a presentation knob, and nothing else moves with it. It is
   * written to the permanent at once, because a preference that only lands
   * at the next save is a preference that can be lost to a lock screen.
   */
  prefer(change): void {
    ledgers = { ...ledgers, permanent: preferring(ledgers.permanent, change) }
    imported = null
    persist()
    paint()
  },
  arm(): void {
    wiping = true
    paint()
  },
  wipe(): void {
    wiping = false
    forgetEverything()
  },
  keep(): void {
    wiping = false
    paint()
  },
  /**
   * A snapshot brought back in. It is refused rather than half-applied — a
   * text this build cannot walk up the ladder never touches the shelf — and
   * a text that lands reboots the shell off it, because everything the shell
   * is holding came from the bytes that were just replaced.
   */
  bring(text): void {
    if (text.length === 0 || !importSnapshot(vault, text)) {
      imported = 'refused'
      return paint()
    }
    settleEverything()
    boot()
    screen = { kind: 'settings' }
    imported = 'took'
    paint()
  },
  leave(): void {
    screen = { kind: 'threshold' }
    imported = null
    band = HUSHED
    paint()
  },
}

/**
 * Giving up a run. It is an ending like any other — the run burns and the
 * permanent survives (art. 11) — so it writes its line in the Book and
 * reseeds (art. 32), and the door is left offering Descend rather than
 * quietly starting the next run for you.
 *
 * The Book takes the line on purpose. The Book of Ends is the record of
 * every ending, and an ending a player could take without it being written
 * down is a record they can scrub by walking away from the runs that went
 * badly.
 */
function abandonTheRun(): void {
  clearTimeout(advanceTimer)
  stopBeats()
  resolving = null
  resolved = null
  fight = null
  phase = 'pre'
  selected = []
  advanced = false
  ledgers = routeDeath(ledgers, 'end.abandoned')
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR, ledgers.run!.history)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  pick = onArrival(doors(bands))
  greet()
  // art. 117: a reseed is a new labyrinth, so nothing in it has spoken yet.
  spoken.clear()
  unbidden = null
  refused = false
  abandoning = false
  resumed = { kind: 'room' }
  screen = { kind: 'threshold' }
  band = answered(NOTICES['gate.abandoned'] ?? null)
  persist()
  paint()
}

/**
 * art. 60: a descent begins by asking which dice come down, when there is
 * anything to ask. A pouch that fits the hand asks nothing and the player
 * walks straight in.
 */
function beginDescent(): void {
  // The run is taken, and that is state rather than something inferred
  // later — Continue may only ever be offered for a run this press began.
  ledgers = { ...ledgers, run: descending(ledgers.run!) }
  if (mustChoose(ledgers.permanent)) {
    picked = ledgers.run!.hand.dice.map((die) => die.id)
    // art. 91: the choosing screen is a screen and not a panel, so it moves
    // no focus. The first cut focused POUCH to draw itself there and never
    // moved it back, which left the tray on the pouch when the run opened —
    // a focus moved by inference, which is exactly what the article bans.
    screen = { kind: 'choosing' }
  } else {
    screen = { kind: 'room' }
  }
  band = HUSHED
  persist()
  paint()
}

/**
 * arts 3, 5, 71: the one place a door is committed. It refuses three ways,
 * and every refusal is a line rather than a punishment — something required
 * still lies here, the lock holds, or there is nothing to open.
 */
function commitDoor(door: Door): void {
  if (heldBack(ledgers, ROOM_BOOK, here()).length > 0) {
    // A stop, not a hint: it names nothing and points at nothing (art. 3).
    band = answered(NOTICES['door.held'] ?? '')
    paint()
    return
  }
  if (door.fight !== undefined) return openTheFight(door)
  // card 67: both halves of the lock, and one line for both. The verb is
  // absent when either fails (`roomActs`), so this is the belt to that
  // suspender rather than the ordinary path.
  if (!opens(ledgers, ROOM_BOOK, here(), door)) {
    // art. 5: the world never punishes touch; it sometimes stops offering.
    band = answered(NOTICES['door.locked'] ?? '')
    refused = true
    paint()
    return
  }
  // card 31: while the keeper is standing, the last door is a fight-door
  // like any other — including after you have run out of it, which is what
  // makes coming back a resume and not a way past it (art. 63).
  if (keeperUp(door)) return openTheFight(door)
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
  pick = onArrival(doors(bands))
  greet()
  band = answered(said)
  persist()
  paint()
}

function finishTheDepth(): void {
  // The Warden's door: a terse ending, its own Book line, a fresh waking.
  const permanent = finish(ledgers, 'end.warden')
  ledgers = wake(permanent, reseed(ledgers.run!.seed))
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR, ledgers.run!.history)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  pick = onArrival(doors(bands))
  greet()
  // art. 117: a reseed is a new labyrinth, so nothing in it has spoken yet.
  spoken.clear()
  unbidden = null
  screen = { kind: 'finished' }
  focus(panelAfter('finished'))
  band = HUSHED
  persist()
  paint()
}

// ── The fight ──────────────────────────────────────────────────────────

/**
 * art. 63, as ruled: a door that has a paused fight behind it resumes it.
 * The card is as spent as you left it and the horror as wounded — running is
 * a retreat, never a way to launder a card.
 */
function openTheFight(door: Door, said: string | null = null): void {
  const at = ledgers.run!.at.instance
  // art. 83: which horror this is comes from what stands in the room's
  // socket — and, at the last room, from the room, because art. 37 as
  // amended gives that one a keeper that stands in no socket (card 31).
  const horror = horrorIn(here())
  if (horror === null) return
  const held = pausedAt(ledgers, at)
  if (held !== null) {
    resume(at)
    screen = { kind: 'fight', door }
    // art. 63: a paused fight resumed is a fight entered, and focuses the
    // same way it did the first time.
    focus(panelAfter('fight-resumed'))
    if (door.ends !== true) ledgers = openDoor(ledgers, door)
    band = answered(NOTICES['fight.resumed'] ?? '')
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
  //
  // Except the last one (card 31): its keeper came out of the hall, not
  // through the door, and the door does not open until you go through it.
  // Painting it open the moment the fight starts would be the world
  // remembering something that has not happened.
  if (door.ends !== true) ledgers = openDoor(ledgers, door)
  // art. 84: a meeting is knowledge, and standing in a room with something
  // is how most of them are written. The keeper is in no room until the key
  // turns, so the fight is the only place it can be met.
  const who = encounterOfHorror(horror.id)
  if (who !== null) ledgers = { ...ledgers, permanent: meet(ledgers.permanent, who) }
  band = answered(said)
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
  // art. 116: with the world held still, a one-shot resolves at once to its
  // settled state. art. 107 already says that settled state is the whole
  // truth and a player who missed the motion missed nothing — so this is the
  // test of whether art. 107 was honest, and the advance passes it: the
  // horror stands at the near depth either way.
  if (stillness()) {
    closeness = 1
    return settleAdvance()
  }
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

// ── art. 119: the beats, played ────────────────────────────────────────

/**
 * **A fight event resolves in beats, and each beat says one thing.**
 *
 * The script arrives whole from `src/lots/beats.ts`, computed off an event
 * that has already happened, and this is the only thing in the shell that
 * reads it. Two properties are worth stating because both are the article
 * rather than the implementation:
 *
 * - **Nothing is decided here.** No engine call happens inside a scheduled
 *   beat. Every frame already carries the numbers the screen should be
 *   reading once it has landed, so a beat is a repaint and never a
 *   question. `test/beats.guard.test.ts` is what stops that drifting.
 * - **There is one timeline.** art. 116 does not get a second path: the same
 *   frames are read with every delay zero, and a delay of nothing is not a
 *   short wait but no wait, so the whole script falls through in this one
 *   turn of the loop and what shows is the settled state (art. 107).
 */
interface Playing {
  readonly frames: readonly Frame[]
  at: number
  /** What happens once the last frame has landed. The turn's own settling. */
  readonly lands: () => void
  timer: number | undefined
}

let playing: Playing | null = null
/**
 * What the fight's numbers read while a timeline is running. `null` is the
 * fight itself, which is what they read the rest of the time.
 */
let shown: Shown | null = null
/**
 * How many frames of the current timeline have shown. A die still in the air
 * takes its face from this, so the tumble moves without anything rolling
 * (art. 119: nothing is decided during an animation).
 */
let spun = 0
/**
 * The beat showing right now. A `+n` belongs to the die that is lifting *in
 * this moment* and to no other, which is what art. 119 means by each beat
 * saying one thing.
 */
let beatNow: Beat | null = null
/**
 * art. 119: **the line names itself**, and then stands. The name is a
 * readout and lives in the tray with the rest of art. 57's numbers; the
 * band is for prose, which in a cascade is what the riders say.
 */
let named: string | null = null

function begin(frames: readonly Frame[], lands: () => void = paint): void {
  stopBeats()
  spun = 0
  beatNow = null
  named = null
  playing = {
    frames: stillness() ? atOnce(frames) : frames,
    at: 0,
    lands,
    timer: undefined,
  }
  // The first frame gets the whole screen, because it is the answer to a
  // press: the strip has to lose the verb that started this in the same
  // instant the first beat lands.
  stepBeat(paint)
}

function stepBeat(draw: () => void = showBeat): void {
  const now = playing
  if (now === null) return
  const frame = now.frames[now.at]
  if (frame === undefined) return landBeats()
  now.at += 1
  spun += 1
  shown = frame.shows
  beatNow = frame.beat
  speak(frame.beat)
  draw()
  const next = now.frames[now.at]
  if (next === undefined) return landBeats()
  if (next.after <= 0) return stepBeat()
  now.timer = setTimeout(() => stepBeat(), next.after) as unknown as number
}

/**
 * art. 119: **each beat says one thing**, and this is where it says it.
 *
 * The riders and the bond take the band, because they are the beat that
 * teaches the pouch to a player who never opens it and a mark alone cannot
 * do that. The line takes the tray, because a name and a multiplier are a
 * readout and the band is for prose (art. 66's seam, one level down). And
 * the settled beat gives the band back to what the turn did (card 69), so
 * the line standing at the end of a cascade is the exchange either way.
 */
function speak(beat: Beat): void {
  switch (beat.kind) {
    case 'rider':
    case 'bond': {
      const said = saysFiring(beat)
      if (said !== '') band = answered(said)
      return
    }
    case 'line':
      named = saysLine(beat.line, beat.tier.multiplier)
      return
    case 'settled':
      if (resolving !== null) band = answered(saysExchange(resolving))
      return
    default:
      return
  }
}

/** What a beat repaints: the numbers, and nothing that has not moved. */
function showBeat(): void {
  say()
  vitals()
  crown()
  theFightPanel()
}

/**
 * art. 1: the settled end state, arrived at. Every entry point comes through
 * here before it does anything else, so a timeline is never something the
 * player has to wait out — and because the settled state is the whole truth
 * (art. 119), skipping it costs nothing.
 */
function landBeats(): void {
  const now = playing
  if (now === null) return
  clearTimeout(now.timer)
  playing = null
  shown = null
  spun = 0
  beatNow = null
  named = null
  now.lands()
}

/**
 * art. 36: **close mid-anything and resume exactly.** A timeline is never
 * written down — it is presentation over a ledger that is already settled —
 * so dropping it cannot lose anything, and every scheduled beat goes with it.
 */
function stopBeats(): void {
  if (playing !== null) clearTimeout(playing.timer)
  playing = null
  shown = null
  spun = 0
  beatNow = null
  named = null
}

/** Every entry point settles whatever pulse is running first (art. 1). */
function settle(): void {
  if (screen.kind === 'fight' && !advanced) settleAdvance()
  if (playing !== null) landBeats()
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
  // art. 119: a timeline is a fight event resolving, and a fight event that
  // is still resolving has nothing to offer. The verbs come back with the
  // settled state; a tap anywhere lands the timeline first (art. 1).
  if (playing !== null) return
  // art. 36: each casting's lot is a pure function of where the run stands,
  // so the shell never has to hold a half-spent generator between paints.
  const lots = turnLots(ledgers.run!.seed, ledgers.run!.at.step, now.turnNumber)

  if (phase === 'pre') {
    fightPanel.append(
      verb('roll', () => {
        // art. 119: the throw is made, and written down, before the first
        // frame is drawn. What the beats do is land the dice one at a time.
        const rolled = withTurn(now, cast(now.turn, lots(1)))
        fight = rolled
        phase = 'keep'
        band = HUSHED
        persist()
        begin(rollBeats(rolled, NOTHING_HELD, CASCADE))
      }),
    )
    return
  }

  if (phase === 'keep') {
    fightPanel.append(
      verb(
        'recast',
        () => {
          // art. 41, card 75: **a reroll re-tumbles only the dice being
          // rerolled.** What the thumb kept sits perfectly still, and that
          // stillness is what makes holding feel like a decision that has
          // already happened. The kept set is read off the turn *before* the
          // recast, because the recast is what clears the keep-marks
          // (art. 72).
          const held = new Set<string>(
            casting(now.turn)
              .filter((landed) => landed.kept)
              .map((landed) => landed.die as string),
          )
          const thrown = withTurn(now, recast(now.turn, lots(2)))
          fight = thrown
          phase = 'claim'
          selected = []
          band = HUSHED
          persist()
          begin(rollBeats(thrown, held, CASCADE))
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
      band = HUSHED
      // The claim is on the ledger before the beat runs, so a phone locked
      // mid-resolve wakes with the attack made rather than unmade (art. 75).
      persist()
      endTurn()
    }),
  )
}

/**
 * art. 119: **the turn resolves in beats, and the outcome is computed before
 * the first one is drawn.**
 *
 * This is the seam the whole article is about. The engine is asked its two
 * questions *here* — what the turn did, and what the fight is now — and both
 * answers are written down before a single frame shows. Everything after
 * this line is a repaint: the claimed dice lifting one at a time, the line
 * naming its multiplier, each rider firing in its own moment, and the total
 * climbing to a number that was already decided.
 *
 * The old shape asked `advanceFight` at the *end* of a 700ms pause, which is
 * exactly what the article forbids — a decision inside a timeline — and it
 * also meant the whole exchange resolved in one frame with nothing between
 * the press and the answer. Both are the same fix.
 *
 * art. 57: unused dice dim at resolve, and they still do — `resolving` is
 * what that reads, and it now stands for the whole cascade.
 */
function endTurn(): void {
  const now = fight
  if (now === null) return
  const resolution = decide(now.turn, 'end-turn', now.armor, goods())
  resolving = resolution
  resolved = advanceFight(now, resolution)
  selected = []
  // card 69: **the turn says what it did**, both halves, and it holds the
  // band until the player turns it. Before this, pressing Attack moved two
  // numbers and then talked about the next intent: nothing on screen ever
  // said you hit it for twenty, or that it took seven out of you.
  //
  // art. 119: the riders borrow the band as they fire and the settled beat
  // gives it back, so the line standing at the end of the cascade is this
  // one either way.
  band = answered(saysExchange(resolution))
  // art. 116: the same timeline with every delay zero. Nothing branches.
  begin(cascadeBeats(now, resolved, resolution, goods(), CASCADE), settleTurn)
}

function settleTurn(): void {
  const now = fight
  const resolution = resolving
  const advancedFight = resolved
  resolving = null
  resolved = null
  if (now === null || resolution === null || advancedFight === null) return
  fight = advancedFight
  phase = 'pre'
  selected = []
  switch (routeTurn(advancedFight, resolution)) {
    case 'fight-continues':
      // card 69: **the band keeps what the turn did.** It used to be hushed
      // here, which is why the only thing the player ever read in a fight
      // was the next intent — the exchange had already been thrown away by
      // the time the turn settled.
      persist()
      paint()
      return
    case 'room-continues':
      return wonTheFight()
    case 'fled':
      return runFromTheFight()
    case 'death':
      // card 69: the scrawl keys on the blow that landed, not on the horror
      // that was carrying it. A run killed by CORRODE was being told to
      // count to the fifth intent, which is a note about something that did
      // not happen.
      return died(endLineFor(theBlow(now, advancedFight), now.horror.id))
  }
}

/**
 * card 69: what finished the run, as the stem its scrawl is keyed on.
 *
 * The turn's own intent is not always the answer, and the playtest's own
 * death was one of the exceptions: a bleed opened three turns earlier ticked
 * after the blow landed and finished a turn the blow had not. A cost face
 * (art. 86) does the same on the other side of the beat. So the events the
 * advance just wrote are read back, and the *last* thing that took health is
 * what the Book records — none of the three borrows another's lesson, and
 * empty falls back to the horror's own line.
 */
function theBlow(before: Fight, after: Fight): string {
  const fresh = after.events.slice(before.events.length)
  for (let at = fresh.length - 1; at >= 0; at--) {
    const event = fresh[at]
    if (event === undefined) continue
    if (event.kind === 'struck') return before.turn.intent.verb
    // Neither of these is an intent, and neither is the horror's doing.
    if (event.kind === 'bled') return 'bleed'
    if (event.kind === 'cost') return 'cost'
  }
  return ''
}

function wonTheFight(): void {
  const now = fight
  const at = screen
  if (now === null || at.kind !== 'fight') return
  // art. 63: winning is one of the two things that lets a card refill, and
  // it does it by letting the fight go.
  ledgers = carryOut(ledgers, now)
  fight = null
  screen = { kind: 'room' }
  focus(panelAfter('fight-won'))
  // card 31: the Warden's door commits no room (art. 37), so beating its
  // keeper does not walk you anywhere — it writes the deed that turns the
  // door back into a way down, and `Descend` is the press that takes it.
  if (at.door.ends === true) {
    ledgers = { ...ledgers, run: didHere(ledgers.run!, ledgers.run!.at.instance, WARDEN_DOWN) }
    bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
    // art. 71 as strengthened (card 63): a fight ending is an arrival in the
    // room it was fought at the door of, and an arrival picks the way on.
    pick = onArrival(doors(bands))
    // art. 37, card 69: the keeper the depth was built around gets its own
    // line. Unlocking the door is ceremonial and the fall was not — it said
    // the same six words a stray in a corridor says, which left the depth's
    // last beat flatter than its second-to-last.
    band = answered(NOTICES['warden.fell'] ?? NOTICES['fight.won'] ?? null)
    persist()
    paint()
    return
  }
  // Winning opens the door, and the door commits the next room (art. 35).
  walk(at.door, NOTICES['fight.won'] ?? null)
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
  resolving = null
  resolved = null
  // art. 119: a timeline is presentation over a settled ledger, so leaving
  // the fight drops it whole. Every beat it had scheduled goes with it.
  stopBeats()
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
  pick = onArrival(doors(bands))
  band = answered(NOTICES['fight.fled'] ?? '')
  persist()
  paint()
}

/**
 * card 69: **the ending's own candles.**
 *
 * Death was not an event. The turn resolved and the next thing on screen was
 * the following run's Crossing, fully lit, with the vitals back to full and
 * one lowercase line at the top — nothing said the run had ended, and the
 * verb underneath said Descend, which is what the front door says.
 *
 * The scrawl was being asked to carry both *the run is over* and *here is
 * what killed you*, and it was written to carry only the second. So the
 * ending is two candles: him having it, then the thing he gets down before
 * it goes. Turning between them is the word band's own tap (art. 29), which
 * is the vocabulary a room's candles already use.
 */
let ending: readonly string[] = []
let endingAt = 0

function died(cause: string = endLineOf(fight?.horror.id ?? '')): void {
  clearTimeout(advanceTimer)
  resolving = null
  resolved = null
  stopBeats()
  ledgers = routeDeath(ledgers, cause)
  chain = deal(ledgers.run!.seed, ledgers.run!.depth, CATALOG, GRAMMAR, ledgers.run!.history)
  bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  pick = onArrival(doors(bands))
  greet()
  // art. 117: a reseed is a new labyrinth, so nothing in it has spoken yet.
  spoken.clear()
  unbidden = null
  fight = null
  refused = false
  screen = { kind: 'dead', cause }
  focus(panelAfter('died'))
  // The run ends, and is seen to end. The scrawl is the second candle, so it
  // reads as a thing he wrote rather than as a caption on a fresh corridor.
  ending = [saysDeath(cause), ROOM_BOOK.scrawl(cause)].filter((said) => said !== '')
  endingAt = 0
  band = HUSHED
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
