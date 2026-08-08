/**
 * Feedback for outcomes that have already been decided.
 *
 * Nothing here rolls, branches, or reads game rules. Each function is handed a
 * number that the reducer already computed and reveals it. That is what makes
 * determinism structural: an animation has no outcome to change.
 *
 * With `prefers-reduced-motion`, every effect resolves immediately to its
 * settled state — which for all of these is *nothing on screen* — and nothing
 * is lost, because the settled state is always the whole truth.
 */

import type { World } from './compositor.js'

const reduced = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** The blow you landed: the enemy brightens for a frame and the number rises. */
export function flash(world: World, damage: number): void {
  const number = document.createElement('b')
  number.className = 'hit-number'
  number.textContent = String(damage)
  number.dataset['damage'] = String(damage)
  world.fx.append(number)

  if (reduced()) {
    number.remove()
    return
  }

  world.enemy.classList.add('struck')
  number.addEventListener('animationend', () => number.remove(), { once: true })
  window.setTimeout(() => world.enemy.classList.remove('struck'), 180)
}

/**
 * The blow that landed on you.
 *
 * The frame is the player's body, so this is the one effect that moves the
 * whole world. Spending it anywhere else spends it for nothing.
 */
export function shake(world: World, damage: number): void {
  if (reduced()) return
  world.root.classList.remove('struck')
  // Reading offsetWidth restarts the animation when two blows land in a row.
  void world.root.offsetWidth
  world.root.dataset['blow'] = String(damage)
  world.root.classList.add('struck')
  window.setTimeout(() => world.root.classList.remove('struck'), 320)
}
