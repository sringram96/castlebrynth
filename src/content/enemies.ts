/**
 * Every enemy in the slice.
 *
 * An enemy is **a number of hits it can take, a number of bones it breaks,
 * art, and a reward table**. It rolls nothing. It has no dice, no army and no
 * attack script: what it does when it survives your attack is take a fixed
 * number of bones out of your pile, and the player is told that number before
 * they commit to anything.
 *
 * That explicitness is the whole tactical contract of the new combat: *I know
 * exactly how many bones this thing will break if it survives.* Hiding it
 * behind an intent icon or a die of its own would buy uncertainty the dice
 * already supply.
 *
 * The rules budget is deliberate and it is small. Three enemies, three paces —
 * a short fight, a longer one, and an exam — so the hand mechanic can be
 * played against differently shaped health totals before any modifier exists.
 *
 * Art is a requirement, not a fallback: an enemy with no `art` file on disk
 * fails `test/unit/assets.test.ts`. An invisible opponent is not a plainer
 * fight, it is an absent one.
 */

import type { ScoreId } from '../combat/hands.js'
import type { ThreatBand } from './roomTypes.js'
import type { RewardId } from './rewards.js'

/**
 * Where the sprite sits in one authored composition.
 *
 * The same numbers as a still pose, plus `at` — because a thing crawling down
 * a corridor is not politely centred in it, and a pose painted six inches
 * left of the middle has to appear six inches left of the middle. All three
 * are read off the art by `npm run art`; none of them is set by hand.
 */
export interface Stance {
  /** Fraction of the world's width the sprite occupies. */
  readonly width: number
  /** Where its feet sit, as a fraction of world height. */
  readonly foot: number
  /** Its horizontal centre, as a fraction of world width. Middle by default. */
  readonly at?: number
}

/**
 * How near a thing is standing, as the three pictures there are of it.
 *
 * **This is staging, not a deadline.** Contact costs the player nothing and
 * grants the enemy nothing; what it does is escalate the encounter on screen
 * as the fight lasts. It is derived from `combat.round` and stored nowhere.
 */
export type Stage = 'far' | 'mid' | 'close'

export const STAGES: readonly Stage[] = ['far', 'mid', 'close']

/**
 * What a monster's one rule is a rule *about*.
 *
 * Three kinds, one per enemy, and the vocabulary is deliberately this small:
 *
 *   `stage`   how near it is standing. The Gnawing.
 *   `wounds`  how much of it is left. The Marrow.
 *   `line`    what you just scored. The Warden.
 *
 * Every one of them bends **the number it breaks** and nothing else. A rule that
 * wanted a threshold on the player's damage, a part to tear off, or a status to
 * apply is not this wave's rule — it would need a new noun, and a new gameplay
 * noun is a product decision. See `docs/PRODUCT.md`.
 */
export type BreakRuleKind = 'stage' | 'wounds' | 'line'

/**
 * One rung of a break ladder.
 *
 * The chips the card and the tray draw are **this**, mapped — see
 * `content/faces.ts` § `ladderChips`. A ladder written once as data and once as
 * prose is a ladder that will disagree with itself, which is the same rule
 * `HAND_DEFINITIONS` is held to.
 */
export interface BreakRung {
  /** The condition, as the chip's label. Empty for a rung with no condition. */
  readonly label: string
  /** What it breaks while that condition holds. */
  readonly breaks: number
  /** For a `wounds` ladder: the rung applies while `enemyHp` is above this. */
  readonly above?: number
}

export interface BreakRule {
  readonly kind: BreakRuleKind
  /**
   * The rungs, in the order they are read.
   *
   * A `stage` ladder has one per stage, in `STAGES` order. A `wounds` ladder is
   * read top down and the **first** rung whose `above` the health clears wins. A
   * `line` ladder is two rungs: the ordinary one, and the one the named line
   * triggers.
   */
  readonly rungs: readonly BreakRung[]
  /** For a `line` ladder: which line fires the second rung. */
  readonly line?: ScoreId
}

export interface Enemy {
  readonly id: string
  readonly name: string
  /**
   * How much damage it can take before it stops.
   *
   * An explicit number, and deliberately so. The player's life is still a pile
   * of physical objects; the *enemy's* is a total, because the thing the new
   * combat asks of a player is how hard they can hit and how many attacks that
   * will take. See `docs/COMBAT.md`.
   */
  readonly maxHp: number
  /**
   * Bones it breaks, every time it survives an attack. No RNG anywhere.
   *
   * The **nominal** figure, and what it breaks when it has no rule of its own.
   * Every authored enemy has one now, so what a turn actually costs comes from
   * `breakFor` — and `damage` is the first rung of that ladder, stated here so a
   * reader who wants one number has one.
   */
  readonly damage: number
  /**
   * Its one rule, and the only thing that distinguishes it from a health total.
   *
   * Three enemies used to be three difficulty settings for one puzzle: the same
   * attack, the same decision, at 70, 120 and 180 health. This is what makes each
   * of them a different question — *hurry*, *keep at it*, *do not run out of
   * lines* — without adding a single noun to the game.
   *
   * It is printed on the pre-fight card and it is live on the tray: the break
   * number the player reads is `breakFor` of the turn they are standing in, and it
   * moves the moment the rule does.
   */
  readonly breakRule?: BreakRule
  /**
   * What the picture it stands in has to be able to do.
   *
   * The art's veto over generation, from the other side: a room declares the
   * kinds of encounter its composition can hold, an enemy declares the kind it
   * is, and `canHost` in `content/roomResolver.ts` is the one place the two
   * meet. Three words for three encounters — this is a compatibility key, not
   * a taxonomy, and it should stay one.
   */
  readonly encounterTags: readonly string[]
  /**
   * How heavy a fight this is, as one of three words.
   *
   * What a plan asks for. An **ordinal weight**, and the director's business
   * is only *which weight of thing belongs at this point in the descent* — the
   * numbers behind it are `maxHp` and `damage` above.
   */
  readonly threat: ThreatBand
  /** The one sentence the player sees on first sight. */
  readonly tell: string
  /**
   * The encounter's own rule, when it has one worth printing.
   *
   * Shown in the fight's brief, before the first ROLL, because a rule the
   * player only learns by losing a bone to it is not a rule, it is a trick.
   */
  readonly rule?: string
  readonly art: string
  /** Fraction of the world's width the sprite occupies. */
  readonly width: number
  /** Where its feet sit, as a fraction of world height. */
  readonly foot: number
  /** One composition per stage, for a thing painted three ways. */
  readonly staging?: Readonly<Record<Stage, Stance>>
  /** How many rounds it holds each stage before the next drawing. */
  readonly stageEvery?: number
  /** What it can drop: ids drawn from the reward pool. */
  readonly rewards: readonly RewardId[]
  /**
   * The chance a win drops anything at all, and how many to offer when it
   * does.
   *
   * Not every fight pays. A run that is handed something after every beat
   * teaches the player that finds are routine, and a routine find is not a
   * reward — it is a step. These are content, not a hidden table, so the
   * cadence of the whole slice can be read in one place.
   */
  readonly rewardChance: number
  readonly rewardChoices: number
  /**
   * Granted on every win, outside the ordinary draw.
   *
   * Deterministic and once-only. A fight that rolls no offer still pays this,
   * which is what makes the Marrow worth the detour whatever the dice do.
   */
  readonly drop?: RewardId
}

/**
 * The stages of the maw, measured against the hall it is crawling down.
 *
 * Three authored compositions rather than a slide: at `far` it is a shape at
 * the end of the corridor, at `mid` it is unmistakably nearer, and at `close`
 * it is wider than the frame and its jaw is on the floor in front of you.
 * Nothing interpolates between them — see `docs/ART_DIRECTION.md`.
 */
const MAW: Readonly<Record<Stage, Stance>> = {
  // A shape at the end of the corridor: readable, and plainly not near you.
  far: { width: 0.3, foot: 0.6 },
  // Half the hall gone. Roughly four times the area, which is what makes the
  // second one land — the step has to be too big to be a trick of the light.
  mid: { width: 0.62, foot: 0.82 },
  // On top of you, and **inside the frame**.
  //
  // It was 1.24 wide with its feet at 1.02, which is wider than the world box
  // with the jaw below it: the last beat of the fight was a composition the
  // player could only see two thirds of, at exactly the moment the encounter is
  // supposed to be at its most legible. Pulled back to sit whole in the world
  // box — first-pass values, provisional and reported rather than tuned, and
  // the browser suite asserts the box rather than the numbers.
  //
  // This is the **authored** seat. Nothing in `tools/art.mjs` stages the
  // crawling family: its three plates arrive registered from the master and
  // this table is what places them, so there is no derived value to regenerate
  // and no pixel is touched. If the plate cannot read at this scale that is an
  // owed repaint — recorded under `## HUMAN ART REQUIRED`, not drawn here.
  close: { width: 0.98, foot: 0.99 },
}

/**
 * The Gnawing: the short fight, and the one the dice game is learned on.
 *
 * Seventy health, and **the staging stops being cosmetic**. The three painted
 * stances were a picture of a fight getting worse and cost the player nothing;
 * now the picture *is* the rule. FAR breaks two, MID four, CLOSE eight, on the
 * same round counter and the same three drawings, so the first monster in the
 * game is the one that makes you hurry — and it says so from the first frame.
 *
 * Nothing about the staging changed: `stageEvery` is still one, round one is
 * still far, and contact still grants the enemy nothing it was not already
 * going to do. What changed is that the number under the picture is now reading
 * the picture.
 */
const GNAWING: Enemy = {
  id: 'gnawing',
  name: 'The Gnawing',
  maxHp: 70,
  damage: 2,
  breakRule: {
    kind: 'stage',
    // One rung per stage, in `STAGES` order. The chips on the card are these.
    rungs: [
      { label: 'FAR', breaks: 2 },
      { label: 'MID', breaks: 4 },
      { label: 'CLOSE', breaks: 8 },
    ],
  },
  encounterTags: ['closing-horror'],
  threat: 'low',
  tell: 'Too many eyes. All of them found me. It is a long hall, and it has started down it.',
  rule: 'It is getting closer and it will say so.',
  art: 'gnawing',
  // Its still pose is where it stands before the fight opens: far away.
  width: MAW.far.width,
  foot: MAW.far.foot,
  staging: MAW,
  stageEvery: 1,
  // The Splinter Fetish is **pool-only**: it is the one carried thing in the
  // game that is not lying in a room somewhere, which is what keeps a fight's
  // offer worth having now that every chest holds an authored find. A run that
  // wants it has to win a fight and get lucky.
  rewards: ['vial', 'splinter-fetish'],
  rewardChance: 0.6,
  rewardChoices: 1,
}

/**
 * The Marrow: the long one, and **wound it and it breaks less**.
 *
 * A hundred and twenty, unchanged, and the ladder runs the other way from the
 * Gnawing's: above eighty it breaks five, from eighty down to forty-one it
 * breaks four, and at forty and under it breaks three. The attrition fight
 * rewards attrition.
 *
 * It is deliberately the **inverse** of the Gnawing's and deliberately the same
 * concept, because that is how a player comes to hold one word rather than two:
 * *a thing's number is a ladder, and the ladder is printed before the fight.*
 * One of them climbs as the fight lasts and one of them falls as the thing does.
 */
const MARROW: Enemy = {
  id: 'marrow',
  name: 'The Marrow',
  maxHp: 120,
  damage: 5,
  breakRule: {
    kind: 'wounds',
    // Read top down: the first rung whose `above` the health clears. The labels
    // are the chips, and the thresholds are the only place the numbers live.
    rungs: [
      { label: 'OVER 80', breaks: 5, above: 80 },
      { label: 'UNDER 80', breaks: 4, above: 40 },
      { label: 'UNDER 40', breaks: 3, above: 0 },
    ],
  },
  encounterTags: ['standing-horror'],
  threat: 'medium',
  tell: 'The bones of it are somebody. Several somebodies.',
  rule: 'It takes a long time to stop, and it hits softer the more of it I have taken off.',
  art: 'marrow',
  width: 0.62,
  foot: 0.94,
  // The optional route, so it pays better than the mandatory first fight.
  rewards: ['vial', 'splinter-fetish'],
  rewardChance: 0.7,
  rewardChoices: 1,
  drop: 'vial',
}

/**
 * The Warden: the exam, and **the door examines the build**.
 *
 * A hundred and eighty, unchanged, and eight bones a round — unless the line
 * just scored was CRAP, in which case twelve. That is the whole rule and it is
 * printed in capitals before the first ROLL.
 *
 * It is the one rule in the game that reads the *hand* rather than the fight. A
 * build that keeps making named lines walks through; a hand that has run out of
 * lines late is punished exactly where `docs/COMBAT.md` always said the story
 * lives — in what is left on the scorecard at the end of a long fight. CRAP's
 * infinite availability is untouched: it is still never spent and still always
 * there. What changed is what it costs to lean on it here.
 *
 * It pays nothing. It is standing at the way out, and the open door is the
 * reward.
 */
const WARDEN: Enemy = {
  id: 'warden',
  name: 'The Warden',
  maxHp: 180,
  damage: 8,
  breakRule: {
    kind: 'line',
    rungs: [
      { label: '', breaks: 8 },
      { label: 'CRAP', breaks: 12 },
    ],
    line: 'crap',
  },
  encounterTags: ['duel-stander'],
  threat: 'keeper',
  tell: 'It was waiting at this door. It has been waiting a long time.',
  rule: 'IT BREAKS EIGHT. CRAP IT AND IT BREAKS TWELVE.',
  art: 'warden',
  // The whole frame, because every one of its ten plates *is* the whole frame.
  // A scene-registered family carries its own position in the drawing — where
  // the skeleton stands inside its 480x720 canvas is the staging — so the only
  // honest stance for it is the one that says "all of it, where it was
  // painted". The compositor cover-fits it exactly as it cover-fits the
  // backdrop; see `isScenePlate`.
  width: 1,
  foot: 1,
  rewards: [],
  rewardChance: 0,
  rewardChoices: 0,
}

export const ENEMIES: Readonly<Record<string, Enemy>> = {
  gnawing: GNAWING,
  marrow: MARROW,
  warden: WARDEN,
}

/** Every authored encounter, in declaration order. The resolver's whole world. */
export const ENEMY_LIST: readonly Enemy[] = Object.values(ENEMIES)

export function enemy(id: string): Enemy {
  const found = ENEMIES[id]
  if (!found) throw new Error(`no such enemy: ${id}`)
  return found
}

/**
 * Which drawing of a thing that is painted three ways belongs to a round.
 *
 * Round 1 is `far`, round 2 is `mid`, round 3 and everything after is `close`.
 * It is derived from `combat.round` and stored nowhere, which is why a reload
 * on round three paints the near composition without a frame index in the
 * save. An enemy with no staging gets nothing and stands as it always did.
 */
export function stageForRound(id: string, round: number): Stage | undefined {
  const e = enemy(id)
  if (!e.staging) return undefined
  const every = e.stageEvery ?? 1
  const step = Math.floor(Math.max(0, round - 1) / every)
  return STAGES[Math.min(step, STAGES.length - 1)]
}

/** Where an enemy's sprite sits at a stage. Its still pose when it has none. */
export function stanceAt(id: string, stage: Stage | undefined): Stance {
  const e = enemy(id)
  if (!stage || !e.staging) return { width: e.width, foot: e.foot }
  return e.staging[stage]
}

/** Exactly as much of a fight as a break rule can see. Nothing else. */
export interface BreakContext {
  /** 1-based attack round, for a `stage` ladder. */
  readonly round: number
  /** What is left of it, for a `wounds` ladder. */
  readonly enemyHp: number
}

/**
 * What this thing breaks, on this turn, under its own rule.
 *
 * **One pure function, and it is the only authority.** The reducer commits the
 * answer through it, the tray's number derives from it every paint, the card's
 * chips are drawn off the same ladder, and the balance harness reads it — so the
 * number on the screen and the number that takes your bones cannot disagree.
 * There is nowhere else in the codebase that may compute what an enemy breaks.
 *
 * It takes the fight and the **line just committed**, and nothing else: no state,
 * no generator, no history. `line` is `undefined` wherever there is no line yet —
 * which is every paint before a SCORE — and a `line` ladder reads as its ordinary
 * rung there, which is exactly what the Warden's card promises.
 */
export function breakFor(e: Enemy, combat: BreakContext, line?: ScoreId): number {
  const rule = e.breakRule
  if (!rule || rule.rungs.length === 0) return e.damage

  switch (rule.kind) {
    case 'stage': {
      // How near it is standing, which is the same derivation the picture uses —
      // straight off the round, stored nowhere, so a reload on round three finds
      // the near drawing and the near number together.
      const stage = stageForRound(e.id, combat.round) ?? STAGES[0]!
      const step = Math.min(STAGES.indexOf(stage), rule.rungs.length - 1)
      return rule.rungs[Math.max(0, step)]?.breaks ?? e.damage
    }
    case 'wounds': {
      // Read top down: the first rung whose floor the health still clears.
      const rung = rule.rungs.find((r) => combat.enemyHp > (r.above ?? 0))
      return (rung ?? rule.rungs[rule.rungs.length - 1])?.breaks ?? e.damage
    }
    case 'line': {
      const fired = line !== undefined && line === rule.line
      return (fired ? rule.rungs[1] : rule.rungs[0])?.breaks ?? e.damage
    }
  }
}
