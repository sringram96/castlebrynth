/**
 * What SCORE does.
 *
 * The whole outcome is computed here, in order, before a single frame is
 * drawn. The animation in `render/` is handed the result and reveals it; it
 * never decides anything and never rolls. That is what keeps determinism a
 * property of the build rather than of anybody's care.
 */

import { enemy, intentAt, reachAfter } from '../content/enemies.js'
import type { Reach } from '../content/enemies.js'
import { armorOf, preview } from './scoring.js'
import type { Preview, Selected } from './scoring.js'
import { faceOf } from './dice.js'
import type { CombatState, RunState } from '../game/state.js'

export interface Resolution {
  readonly preview: Preview
  /** Enemy health after your hand lands. */
  readonly enemyHp: number
  /** Your health after face costs, heals, and the enemy's answer. */
  readonly hp: number
  /** What the enemy did. Absent when it died before it could act. */
  readonly blow?: { readonly verb: string; readonly raw: number; readonly blocked: number; readonly dealt: number }
  /**
   * Where an approaching enemy stands afterwards.
   *
   * Unchanged when it died — a dead thing does not take a step — and unchanged
   * at `close`, where the step it would have taken is onto you instead. Absent
   * for an enemy with no ladder.
   */
  readonly approach?: Reach
  /** It arrived. The run is over and this is why. */
  readonly reached: boolean
  readonly won: boolean
  readonly died: boolean
  /** One line per beat, in the order they happen. */
  readonly beats: readonly string[]
}

export function selectionOf(combat: CombatState): readonly Selected[] {
  return combat.selected.map((slot) => {
    const d = combat.roll.find((r) => r.slot === slot)
    if (!d) throw new Error(`selected slot ${slot} is not on the table`)
    const face = faceOf(d)
    return face.effect ? { value: d.value, effect: face.effect } : { value: d.value }
  })
}

/**
 * Resolve one SCORE.
 *
 * The order is fixed and each step is one beat:
 *   1. your damage lands
 *   2. marked faces resolve (hurt, then heal)
 *   3. if the enemy is dead, nothing else happens — a dead enemy never acts
 *   4. otherwise the enemy performs its declared intent, less armour
 *   5. an enemy that closes takes one step in, or arrives and that is the run
 *   6. if you are at zero, you are dead
 *
 * Step 5 is part of step 4 and not a phase of its own: it is what *this*
 * enemy's turn is. It is decided here, in full, before anything is drawn — how
 * far it moved, whether it arrived, and whether you are dead of it — so the
 * sequence in `app/app.ts` has a finished answer to reveal and no decision left
 * to make.
 */
export function resolve(run: RunState, combat: CombatState): Resolution {
  const p = preview(selectionOf(combat), run.relics, combat.spentHands)
  const beats: string[] = []

  const enemyHp = Math.max(0, combat.enemyHp - p.damage)
  beats.push(`${p.hand.label} · ${p.sum} × ${p.multiplier} = ${p.damage}`)

  // Named, not summarised. "The marked face takes 7" is a sentence a player
  // has to already understand the game to parse; each term says what did it.
  let hp = run.hp
  if (p.cost > 0) {
    hp -= p.cost
    for (const term of p.costs) beats.push(`${term.label}: lose ${term.amount} HP.`)
  }
  if (p.heal > 0) {
    hp = Math.min(run.maxHp, hp + p.heal)
    for (const term of p.heals) beats.push(`${term.label}: heal ${term.amount} HP.`)
  }

  // A face cost can kill. It is the one way the dice themselves end a run, and
  // it is declared on the die and previewed before the press.
  if (hp <= 0) {
    return {
      preview: p,
      enemyHp,
      hp: 0,
      won: false,
      died: true,
      reached: false,
      ...(combat.approach ? { approach: combat.approach } : {}),
      beats: [...beats, 'That was the last of me.'],
    }
  }

  // A dead enemy never acts, and taking a step in is acting. This is the only
  // reason killing it at `close` is survivable at all.
  if (enemyHp === 0) {
    return {
      preview: p,
      enemyHp,
      hp,
      won: true,
      died: false,
      reached: false,
      ...(combat.approach ? { approach: combat.approach } : {}),
      beats: [...beats, 'It stops.'],
    }
  }

  const intent = intentAt(combat.enemyId, combat.turn)
  const block = armorOf(run.relics)
  const blocked = Math.min(block, intent.damage)
  const dealt = Math.max(0, intent.damage - block)
  hp = Math.max(0, hp - dealt)
  if (intent.damage > 0) {
    beats.push(blocked > 0 ? `${intent.verb} — ${dealt} through, ${blocked} blocked.` : `${intent.verb} — ${dealt}.`)
  } else {
    beats.push(`${intent.verb}.`)
  }

  // It closes. A stretch of hall takes more than one score to cover, and the
  // last stretch ends on you: `reachAfter` returning nothing is the whole of
  // the contact rule, and the player has been told for two turns that this is
  // what `close` means.
  const ladder = enemy(combat.enemyId).approach
  let approach = combat.approach
  let reached = false
  if (ladder && approach) {
    const next = reachAfter(combat.enemyId, combat.turn + 1)
    if (next) {
      approach = next
    } else {
      reached = true
      hp = 0
      beats.push(ladder.says)
    }
  }

  const done = hp <= 0
  return {
    preview: p,
    enemyHp,
    hp,
    blow: { verb: intent.verb, raw: intent.damage, blocked, dealt },
    ...(approach ? { approach } : {}),
    reached,
    won: false,
    died: done,
    beats: done ? [...beats, 'That was the last of me.'] : beats,
  }
}
