/**
 * What a horror looks like on a beat the fight has already resolved.
 *
 * The whole of this file is a lookup from *something the reducer decided* to
 * *which authored plate shows it*. It computes no outcome, holds no clock and
 * has no opinion about when anything happens: `app/app.ts` owns the when, and
 * the reducer owns the what. Between them there has to be one table saying
 * which drawing belongs to which fact, and this is it — so that neither the
 * controller nor the view carries a threshold or an asset name of its own.
 *
 * Two facts get a picture here, and they are different kinds of fact:
 *
 *   - **how hurt it is**, which is a settled property of the fight. It is
 *     recomputed from `enemyHp` on every paint and never stored, so a reload at
 *     150 of 300 shows the same plate as never having left.
 *   - **what it just did**, which is the intent that resolved this turn. It is
 *     transient by nature: it is up for a couple of hundred milliseconds in the
 *     middle of a score and the settled picture is the health band again.
 *
 * Neither is in `GameState`, and neither may be. A band is arithmetic on a
 * number the save already holds; a pose is a frame of a transition. Putting
 * either in the save would be rendering deciding something, and would give a
 * reload an animation clock to recover.
 *
 * It is content rather than `render/` for the reason `defeat.ts` is: this says
 * which art belongs to which beat, which is an authoring decision, and the
 * files it names are declared once in `render/assets.ts`.
 */

/**
 * How much of a horror is left, as the three pictures there are of it.
 *
 * Thirds, and no fourth. Two bands would make the change a single event a
 * player could miss; four would put two of them inside the same handful of
 * turns and none of them would read. `docs/COMBAT.md`'s numbers do the rest:
 * against 300 health and a hand that deals tens, each band is several turns
 * long, so each is on screen long enough to be a state rather than a flicker.
 */
export type HealthBand = 'full' | 'medium' | 'low'

/** The two plates of one band's idle, in order. */
export type IdlePair = readonly [string, string]

export interface IdleLoop {
  readonly full: IdlePair
  readonly medium: IdlePair
  readonly low: IdlePair
  /** How long each plate is up, in milliseconds. */
  readonly frameMs: number
}

export interface EnemyPresentation {
  /**
   * The plates it stands in when nothing is happening to it.
   *
   * Optional, and most enemies have none: an enemy with no idle family is
   * simply still, exactly as it was before this file existed.
   */
  readonly idle?: IdleLoop
  /**
   * The plate for an intent, keyed by its verb.
   *
   * Presentation only. The verb's damage, its telegraph and what follows it are
   * `content/enemies.ts`'s and the reducer's; this says which drawing reveals
   * the thing that already happened. A verb with no entry gets no pose and the
   * turn plays exactly as it did before.
   */
  readonly intents?: Readonly<Record<string, string>>
}

/**
 * The Warden, deteriorating.
 *
 * Ten plates and three ideas. It stands, growing visibly worse as its health
 * goes; it throws its arms wide for the two intents that land a blow; it draws
 * itself up for the one that does not. That last one is the important one:
 * RAISE is a **telegraph**, not armour. It deals nothing, blocks nothing and
 * reduces nothing — it announces JUDGE — and the defensive drawing is the
 * visual language for announcing it, not a rule.
 *
 * 700 ms a plate is the slowest an idle can be and still be an idle. The pair
 * is two drawings of a thing standing still, so anything quicker reads as a
 * flicker rather than as breathing, and the hard cut between them is wanted:
 * a crossfade would make it a UI element that happens to be shaped like a
 * corpse.
 */
const WARDEN: EnemyPresentation = {
  idle: {
    full: ['idle.full.1', 'idle.full.2'],
    medium: ['idle.mid.1', 'idle.mid.2'],
    low: ['idle.low.1', 'idle.low.2'],
    frameMs: 700,
  },
  intents: {
    STRIKE: 'attack',
    JUDGE: 'attack',
    RAISE: 'defense',
  },
}

/** Keyed by enemy id. An enemy with no entry is presented as it always was. */
export const PRESENTATION: Readonly<Record<string, EnemyPresentation>> = {
  warden: WARDEN,
}

export function presentationOf(enemyId: string): EnemyPresentation | undefined {
  return PRESENTATION[enemyId]
}

/**
 * How hurt a horror is, in thirds of its health.
 *
 * The boundaries are inclusive downwards — a band ends *at* its fraction, so
 * exactly two thirds is already `medium` and exactly one third is already
 * `low`. That is the honest reading of a bar: the moment it drops to the line
 * it has crossed it.
 *
 * Total: 300 max gives 300–201 full, 200–101 medium, 100–1 low.
 *
 * Pure, and takes numbers rather than state, because it has to be callable
 * from the settled paint and from the middle of a transition with the same
 * answer. Nothing here is stored; the band is arithmetic on the save.
 */
export function healthBand(hp: number, maxHp: number): HealthBand {
  if (maxHp <= 0) return 'full'
  if (hp > (maxHp * 2) / 3) return 'full'
  if (hp > maxHp / 3) return 'medium'
  return 'low'
}

/**
 * The plate a horror is standing in, or nothing because it has no idle family.
 *
 * `frame` is which of the band's two plates is up. It is an index the render
 * layer owns and cycles; it is taken modulo the pair, so a caller that has
 * never advanced it — a settled paint, a reload, reduced motion — gets the
 * first plate, which is the one every band is authored to rest on.
 */
export function idlePose(enemyId: string, hp: number, maxHp: number, frame = 0): string | undefined {
  const idle = presentationOf(enemyId)?.idle
  if (!idle) return undefined
  const pair = idle[healthBand(hp, maxHp)]
  return pair[((frame % pair.length) + pair.length) % pair.length]
}

/** The plate for what a horror just did, or nothing because it has none. */
export function intentPose(enemyId: string, verb: string): string | undefined {
  return presentationOf(enemyId)?.intents?.[verb]
}

/** How long one idle plate is up, or nothing because there is no loop to run. */
export function idleFrameMs(enemyId: string): number | undefined {
  return presentationOf(enemyId)?.idle?.frameMs
}
