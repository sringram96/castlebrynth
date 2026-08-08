/**
 * What SCORE does.
 *
 * The whole outcome is computed here, in order, before a single frame is
 * drawn. The animation in `render/` is handed the result and reveals it; it
 * never decides anything and never rolls. That is what keeps determinism a
 * property of the build rather than of anybody's care.
 */

import { intentAt } from '../content/enemies.js'
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
 *   5. if you are at zero, you are dead
 */
export function resolve(run: RunState, combat: CombatState): Resolution {
  const p = preview(selectionOf(combat), run.relics, combat.spentHands)
  const beats: string[] = []

  const enemyHp = Math.max(0, combat.enemyHp - p.damage)
  beats.push(`${p.hand.label} · ${p.sum} × ${p.multiplier} = ${p.damage}`)

  let hp = run.hp
  if (p.cost > 0) {
    hp -= p.cost
    beats.push(`The marked face takes ${p.cost}.`)
  }
  if (p.heal > 0) {
    hp = Math.min(run.maxHp, hp + p.heal)
    beats.push(`Back ${p.heal}.`)
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
      beats: [...beats, 'That was the last of me.'],
    }
  }

  if (enemyHp === 0) {
    return { preview: p, enemyHp, hp, won: true, died: false, beats: [...beats, 'It stops.'] }
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

  return {
    preview: p,
    enemyHp,
    hp,
    blow: { verb: intent.verb, raw: intent.damage, blocked, dealt },
    won: false,
    died: hp <= 0,
    beats: hp <= 0 ? [...beats, 'That was the last of me.'] : beats,
  }
}
