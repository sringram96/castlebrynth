/**
 * The beats (art. 119).
 *
 * **A fight event resolves in beats, and each beat says one thing.** The
 * playtest called the fight a spreadsheet, and card 69 fixed half of that —
 * nothing *said* what happened. This is the other half: nothing *showed* it.
 * A claim resolved instantly and silently, so the most interesting decision
 * in the game — which line to spend, and what it costs you to spend it —
 * passed in a single frame.
 *
 * What this module is, and what it deliberately is not:
 *
 * - It is a **script**, computed once, from a fight event that has already
 *   happened. Every frame carries the numbers the screen should be showing
 *   once that frame has landed, so playing the script is reading it out. No
 *   caller ever has to ask the engine anything while a timeline is running,
 *   which is art. 119's first consequence made structural rather than
 *   remembered.
 * - It is **not a player**. Nothing here holds a timer, touches a DOM or
 *   knows what a millisecond feels like. `src/main.ts` walks the frames; the
 *   durations arrive from `src/content` like every other tuning number.
 * - It is **not prose**. A beat names an event, exactly as a `FightEvent`
 *   does; the words are content's and bound by rules/voice.md.
 *
 * **Reduced motion is not a second path** (art. 116). `atOnce` maps the same
 * script's delays to zero, so a still world plays every beat in the same
 * order and lands on the same frame — there is one timeline, and no way for
 * two of them to disagree about an outcome.
 */

import { cursedValue, worth } from './combos.js'
import { casting } from './turn.js'
import type {
  BondId,
  Casting,
  Claim,
  DieId,
  Face,
  Fight,
  Goods,
  Landed,
  Line,
  Outcome,
  Resolution,
  Rider,
  RiderEffect,
  RiderId,
  Tier,
} from './types.js'

/** Which body a beat is landing on, for the flash and the shake (art. 119). */
export type Hit = 'none' | 'them' | 'you'

/**
 * What the screen reads once a frame has landed.
 *
 * It is the whole of art. 119's promise written down: the numbers were
 * computed before the first frame, so showing a beat is reading a field off
 * it rather than asking the engine anything.
 */
export interface Shown {
  /** art. 57's running total, as the cascade builds it. */
  readonly attack: number
  readonly horrorHealth: number
  readonly yourHealth: number
  /** Section 1: which dice have settled. The rest are still in the air. */
  readonly landed: readonly DieId[]
  /** Section 2: which claimed dice have lifted, in the order they lifted. */
  readonly lifted: readonly DieId[]
  readonly hit: Hit
}

/**
 * One thing a beat says. The union is deliberately as flat as `FightEvent`'s:
 * a beat is an event at the grain a player can read, and the grain is finer
 * in exactly one place — a claim, which arrives as its dice, then its line,
 * then its riders, then its total (art. 119).
 */
export type Beat =
  /**
   * Section 1: the dice are in the air. `spin` is which turn of the tumble
   * this is, so a die that has not landed can show a face without anybody
   * rolling one — the real faces are already cast (art. 36) and the tumble
   * is a picture of a decision that has been made.
   */
  | { readonly kind: 'tumble'; readonly spin: number }
  /** Section 1: this die settles on its face. Dice do not appear; they land. */
  | { readonly kind: 'land'; readonly die: DieId; readonly face: Face }
  /**
   * Section 2: **a claimed die lifts, alone**, brightening, with its own
   * `+n`, and the running total climbs as it lands. `group` is which part of
   * a composite it belongs to — a full house resolves as its triple and then
   * its pair, so the *shape* of the combo is visible and not only its total.
   */
  | { readonly kind: 'lift'; readonly die: DieId; readonly value: number; readonly group: number }
  /**
   * art. 52: **the sisters pay only together.** The ghost joins the sum, so
   * it joins it in its own moment — a bond that arrived inside a total is a
   * bond the player never learns they are carrying (art. 54).
   */
  | { readonly kind: 'bond'; readonly bond: BondId; readonly value: number }
  /** Section 2: **the line names itself**, with its multiplier. */
  | { readonly kind: 'line'; readonly line: Line; readonly tier: Tier; readonly sum: number }
  /**
   * Section 2: **riders fire, one at a time**, each with its own line and its
   * own mark. art. 119's second consequence: an effect that fires silently
   * inside a total is an effect the player never learns.
   */
  | {
      readonly kind: 'rider'
      readonly die: DieId
      readonly rider: RiderId
      readonly effect: RiderEffect
    }
  /**
   * Section 2: **the total climbs** to the final number rather than appearing.
   * It is several frames because a climb is several frames; each carries the
   * number the readout should be showing, so the arithmetic is never the
   * screen's to invent.
   */
  | { readonly kind: 'climb' }
  /**
   * Section 3: **your blow lands.** The horror flashes to the top of its own
   * ramp, and the lunge sends it back and returns it, settling where it
   * stood (art. 28: a motion that matters never undoes itself, and this one
   * does not matter — the wound does, and the wound stays).
   */
  | { readonly kind: 'strike'; readonly amount: number }
  /** art. 65 (`hunger`): a turn that claimed nothing, and what it gave back. */
  | { readonly kind: 'fed'; readonly amount: number }
  /**
   * Section 3: **its blow lands on you.** The one beat in the game that
   * moves the frame itself — the frame is the player's body, and spending
   * that gesture anywhere else spends it for nothing. `blocked` rides with
   * it because armour eating a blow is the same beat wearing a different
   * face, and a player who cannot tell those apart cannot tell whether the
   * armour is doing anything (art. 57).
   */
  | { readonly kind: 'struck'; readonly amount: number; readonly blocked: number }
  /** art. 65 (`bleed`): a tick, after armour, at the top of the turn. */
  | { readonly kind: 'bled'; readonly amount: number }
  /** art. 65 (`bind`): the die dragged out of the tray, and who has it. */
  | { readonly kind: 'bound'; readonly dice: readonly DieId[] }
  /** The crown falls as the blow lands — not before it and not after. */
  | { readonly kind: 'ended'; readonly outcome: Outcome }
  /**
   * art. 119: the settled state, which is where every timeline ends. It is
   * a beat rather than an absence because art. 1 asks a one-shot to *end* in
   * its settled state — a mark that is cleared by the beat after it can
   * never be left standing, and this is the beat after the last one.
   */
  | { readonly kind: 'settled' }

/** How long each kind of beat waits, in ms. All of it is tuning (art. 119). */
export interface Timings {
  /**
   * Section 1: how many turns of the tumble play before the first die
   * settles. Without them the first die lands having never been in the air.
   */
  readonly tumbles: number
  /** Section 1: the stagger, so five dice read as five events. */
  readonly land: number
  /** Section 2: between one claimed die lifting and the next. */
  readonly lift: number
  /** Section 2: between the groups of a composite, so the shape reads. */
  readonly group: number
  /** Section 2: before the line names itself. */
  readonly line: number
  /** Section 2: between riders. They fire one at a time or they teach nothing. */
  readonly rider: number
  /** Section 2: how long the total takes to climb, and in how many frames. */
  readonly climb: number
  readonly climbs: number
  /** Section 3: before the blow, which is the beat everything else was for. */
  readonly blow: number
  /**
   * Section 3: how long the struck thing stands at the top of its ramp, and
   * how long the frame stays offset when the blow lands on you. Both are
   * counted in the article as "a couple of frames"; both are tuning.
   */
  readonly flash: number
  readonly shake: number
}

/**
 * One beat, when it shows, and what the screen reads once it has.
 *
 * `shows` is the whole of art. 119's promise: the numbers are not computed
 * by the player as it goes, they were computed before the first frame and
 * written down here. A frame is therefore also a *test* — the last one must
 * agree with the fight the engine already advanced to, and `test/beats` says
 * so out loud.
 */
export interface Frame {
  readonly beat: Beat
  /**
   * Milliseconds to wait after the previous frame. The first frame of any
   * timeline is zero: a press answers at once, and the stagger is between
   * the beats rather than in front of them.
   */
  readonly after: number
  readonly shows: Shown
}

/**
 * art. 116: **the same timeline, with every delay zero.** Not a second path
 * and not a filter over the first — the identical script, read at once, so
 * a player who never sees a frame of motion sees every beat's settled state
 * and misses nothing (art. 107, which this is the test of).
 */
export function atOnce(frames: readonly Frame[]): readonly Frame[] {
  return frames.map((frame) => (frame.after === 0 ? frame : { ...frame, after: 0 }))
}

/** The numbers as a fight stands, with nothing in the air (art. 119). */
export function restingAt(fight: Fight): Shown {
  return {
    attack: fight.turn.claims.reduce((sum, made) => sum + made.sum * made.tier.multiplier, 0),
    horrorHealth: fight.horrorHealth,
    yourHealth: fight.yourHealth,
    landed: casting(fight.turn).map((one) => one.die),
    lifted: [],
    hit: 'none',
  }
}

/**
 * Section 1: **dice do not appear, they land** (card 75).
 *
 * Each rolling die cycles faces and settles, staggered, so five dice read as
 * five events rather than as one table refreshing. And a **reroll re-tumbles
 * only the dice being rerolled**: the held dice sit perfectly still, which is
 * what makes holding feel like a decision that already happened, and it is
 * the cheapest legibility in the wave (art. 41 — keeping is planning).
 *
 * `still` is the dice that do not tumble. On a first casting it is empty; on
 * a recast it is what the thumb kept. A recast that keeps everything —
 * art. 41's way of declining the second casting — has nothing in the air at
 * all, and its timeline is one settled frame.
 */
export function rollBeats(
  fight: Fight,
  still: ReadonlySet<string>,
  timings: Timings,
): readonly Frame[] {
  const laid: Casting = casting(fight.turn)
  const rest = restingAt(fight)
  const tumbling = laid.filter((one) => !still.has(one.die as string))
  if (tumbling.length === 0) return [{ beat: { kind: 'settled' }, after: 0, shows: rest }]

  const frames: Frame[] = []
  // A held die never left the table, so it is settled from the first frame.
  let landed: DieId[] = laid.filter((one) => still.has(one.die as string)).map((one) => one.die)
  const at = (): Shown => ({ ...rest, landed: [...landed] })
  for (let spin = 0; spin < Math.max(0, timings.tumbles); spin++) {
    frames.push({
      beat: { kind: 'tumble', spin },
      after: frames.length === 0 ? 0 : timings.land,
      shows: at(),
    })
  }
  for (const one of tumbling) {
    landed = [...landed, one.die]
    frames.push({
      beat: { kind: 'land', die: one.die, face: one.face },
      after: frames.length === 0 ? 0 : timings.land,
      shows: at(),
    })
  }
  frames.push({ beat: { kind: 'settled' }, after: timings.land, shows: rest })
  return frames
}

// ── Section 2: the cascade (card 75) ───────────────────────────────────

/**
 * art. 64: a composite is a single claim, and its *shape* is the thing worth
 * seeing. Two pair, a full house, three pairs and two triples resolve group
 * by group, so a player can see **why** it was a full house rather than only
 * what it came to. Everything else — a set, a run, the floor — is one group,
 * because it has one shape and breaking it up would say something untrue
 * about it.
 *
 * Groups come out largest first, ties in the order the dice lie, which is
 * the order the line's own name reads in.
 */
const COMPOSITES: ReadonlySet<Line> = new Set<Line>([
  'two-pair',
  'full-house',
  'three-pairs',
  'two-triples',
])

export function groupsOf(claim: Claim): readonly (readonly Landed[])[] {
  if (!COMPOSITES.has(claim.line)) return [claim.dice]
  const byValue = new Map<number, Landed[]>()
  for (const landed of claim.dice) {
    const held = byValue.get(landed.face.value)
    if (held === undefined) byValue.set(landed.face.value, [landed])
    else held.push(landed)
  }
  return [...byValue.values()].sort((one, other) => other.length - one.length)
}

/** art. 51: which rider fired off which die, so each can have its own beat. */
export interface Fired {
  readonly die: DieId
  readonly rider: Rider
}

export function firedOn(
  claims: readonly Claim[],
  riders: readonly Rider[],
): readonly Fired[] {
  const book = new Map<string, Rider>(riders.map((rider) => [rider.id as string, rider]))
  const fired: Fired[] = []
  for (const claim of claims) {
    for (const landed of claim.dice) {
      const id = landed.face.rider
      if (id === undefined) continue
      const rider = book.get(id as string)
      if (rider !== undefined) fired.push({ die: landed.die, rider })
    }
  }
  return fired
}

/**
 * Section 2: **the cascade.** The order is settled and each beat says one
 * thing — the claimed dice lift one at a time, the line names itself with
 * its multiplier, the riders fire alone, and only then does the total climb
 * to the number that is about to land.
 *
 * Two things about it are the article rather than the arrangement.
 *
 * **The riders come before the total, and the total before the blow**,
 * because that is the order the engine already resolves them in (`src/lots/
 * fight.ts`): the claims land, the riders fire, then the intent. The beats
 * reveal an order that is already true rather than inventing a dramatic one.
 *
 * **The arithmetic is the engine's, not the cascade's.** Every heal is shown
 * against the ceiling the engine caps at and every cost against what the
 * heals left, so the last frame agrees with the fight the engine already
 * advanced to. `test/beats.cascade.test.ts` asserts exactly that, because a
 * beat whose settled state is not the whole truth is a wrong beat (art. 119).
 */
export function cascadeBeats(
  before: Fight,
  after: Fight,
  resolution: Resolution,
  goods: Goods,
  timings: Timings,
): readonly Frame[] {
  const frames: Frame[] = []
  const cursed = cursedValue(before.turn.intent)
  const landed = casting(before.turn).map((one) => one.die)
  const lifted: DieId[] = []
  // art. 57's running total, built rather than announced. It starts at
  // nothing: the claim was made by the press, and the cascade is that claim
  // being assembled where the player can watch it.
  let attack = 0
  let yourHealth = before.yourHealth
  let horrorHealth = before.horrorHealth
  const push = (beat: Beat, wait: number, hit: Hit = 'none'): void => {
    frames.push({
      beat,
      after: frames.length === 0 ? 0 : wait,
      shows: { attack, horrorHealth, yourHealth, landed, lifted: [...lifted], hit },
    })
  }

  for (const claim of before.turn.claims) {
    groupsOf(claim).forEach((group, at) => {
      group.forEach((one, i) => {
        const value = worth(one.face.value, cursed, goods.talismans)
        attack += value
        lifted.push(one.die)
        push(
          { kind: 'lift', die: one.die, value, group: at },
          i === 0 && at > 0 ? timings.group : timings.lift,
        )
      })
    })
    // art. 52: the ghost sister joins the sum, and joins it visibly. It is
    // spaced like a rider because that is what it is to the player — a thing
    // the pouch did that the hand alone does not explain.
    if (claim.bond !== undefined) {
      const ghost = worth(claim.dice[0]?.face.value ?? 1, cursed, goods.talismans)
      attack += ghost
      push({ kind: 'bond', bond: claim.bond, value: ghost }, timings.rider)
    }
    push({ kind: 'line', line: claim.line, tier: claim.tier, sum: claim.sum }, timings.line)
  }

  // art. 51, art. 86: the riders, one at a time. Heals then costs, which is
  // the order `advanceFight` charges them in — so what the beats show and
  // what the ledger holds cannot come apart at the ceiling.
  const fired = firedOn(before.turn.claims, goods.riders)
  let given = 0
  for (const one of fired) {
    if (one.rider.onUse.kind !== 'heal') continue
    given += one.rider.onUse.amount
    yourHealth = Math.min(before.yourHealthMax, before.yourHealth + given)
    push({ kind: 'rider', die: one.die, rider: one.rider.id, effect: one.rider.onUse }, timings.rider)
  }
  const healed = yourHealth
  let taken = 0
  for (const one of fired) {
    if (one.rider.onUse.kind !== 'wound') continue
    taken += one.rider.onUse.amount
    yourHealth = healed - taken
    push({ kind: 'rider', die: one.die, rider: one.rider.id, effect: one.rider.onUse }, timings.rider)
  }

  // **The total climbs.** From what the dice are worth to what the line
  // makes of them — which is the payoff of the whole cascade, and the reason
  // the line named its multiplier without spending it a moment ago.
  const climbTo = Math.max(0, resolution.harmDealt)
  if (climbTo !== attack) {
    const steps = Math.max(1, timings.climbs)
    const from = attack
    const each = Math.max(0, Math.round(timings.climb / steps))
    for (let step = 1; step <= steps; step++) {
      const along = step / steps
      // Decelerating into the number, so the last of it reads as arriving
      // rather than as stopping. Deterministic, like everything else here.
      attack =
        step === steps ? climbTo : Math.round(from + (climbTo - from) * (1 - (1 - along) ** 2))
      push({ kind: 'climb' }, each)
    }
  }

  // ── Section 3: the blow (card 76) ────────────────────────────────────
  //
  // **Then, and only then.** And it is read straight off the events the
  // advance already wrote: the beats do not re-derive what happened, they
  // narrate the engine's own transcript at the grain a player can follow.
  // The one thing this reorders is *when the horror's health is seen to
  // fall* — the engine takes it at the top of the exchange and the blow
  // shows it at the end, which changes nothing about the outcome and is the
  // whole of what "then, and only then" asks for.
  let blocked = 0
  let struck = false
  for (const event of after.events.slice(before.events.length)) {
    switch (event.kind) {
      case 'dealt':
        horrorHealth = Math.max(0, horrorHealth - event.amount)
        push({ kind: 'strike', amount: event.amount }, timings.blow, 'them')
        break
      case 'fed':
        horrorHealth = Math.min(before.horror.health, horrorHealth + event.amount)
        push({ kind: 'fed', amount: event.amount }, timings.blow, 'them')
        break
      case 'blocked':
        // Held for the blow it belongs to. Armour eating a blow is not an
        // event of its own — it is what happened to the one event there was.
        blocked = event.amount
        break
      case 'struck':
        yourHealth -= event.amount
        struck = true
        push({ kind: 'struck', amount: event.amount, blocked }, timings.blow, 'you')
        blocked = 0
        break
      case 'bled':
        yourHealth -= event.amount
        push({ kind: 'bled', amount: event.amount }, timings.blow, 'you')
        break
      case 'bound':
        push({ kind: 'bound', dice: event.dice }, timings.blow)
        break
      case 'ended':
        // **The crown falls as the blow lands** — the beat before this one
        // is the blow, and there is nothing between them.
        push({ kind: 'ended', outcome: event.outcome }, timings.flash)
        break
      default:
        // `claimed`, `healed`, `cost` are the cascade above, at a finer
        // grain; `turn-opened` is the next turn and not this event.
        break
    }
  }
  // art. 57: armour that ate the whole blow still happened. Without this the
  // one turn a player most needs to see their armour work is the one turn
  // nothing on screen moves.
  if (blocked > 0 && !struck) {
    push({ kind: 'struck', amount: 0, blocked }, timings.blow, 'you')
  }

  frames.push({
    beat: { kind: 'settled' },
    after: frames.length === 0 ? 0 : timings.flash,
    shows: {
      attack: climbTo,
      horrorHealth: after.horrorHealth,
      yourHealth: after.yourHealth,
      landed,
      lifted: [],
      hit: 'none',
    },
  })
  return frames
}

/** Which face a die that is still in the air shows on this turn of the tumble.
 *
 * art. 119: **nothing is decided during an animation.** This is not a roll —
 * the die's real face was cast from the run's own lot before the first frame
 * (art. 36) — it is a deterministic picture of a die in the air, hashed off
 * the die's identity and the spin so that the same throw tumbles the same way
 * every time it is replayed (art. 75).
 */
export function tumblingFace(die: DieId, spin: number, faces: number): number {
  let n = 0
  const id = `${die as string}:${spin}`
  for (let i = 0; i < id.length; i++) n = (n * 131 + id.charCodeAt(i) * (i + 7)) >>> 0
  return faces <= 0 ? 0 : n % faces
}
