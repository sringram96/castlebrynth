/**
 * The world compositor.
 *
 * Six layers, in one order, built once. The order is an enum and the elements
 * are created in it at mount, so there is no runtime path — no z-index
 * arithmetic, no conditional append, no "just this once" — by which a backdrop
 * can end up above an enemy. That was a real defect, not a hypothetical one.
 *
 * Only `hits` and `hud` take pointer events. Everything that is art is
 * `pointer-events: none`, which is the other half of the same bug: a container
 * that exists only to position something must never eat a press.
 */

export const enum Layer {
  Backdrop = 0,
  Midground = 1,
  Enemy = 2,
  Foreground = 3,
  Fx = 4,
  Hud = 5,
}

export const LAYER_NAMES: readonly string[] = [
  'backdrop',
  'midground',
  'enemy',
  'foreground',
  'fx',
  'hud',
]

export interface World {
  readonly root: HTMLElement
  readonly backdrop: HTMLImageElement
  readonly midground: HTMLElement
  readonly enemy: HTMLImageElement
  readonly foreground: HTMLElement
  readonly fx: HTMLElement
  /** Where the room's tappable details live. The only layer that takes taps. */
  readonly hits: HTMLElement
  readonly hud: HTMLElement
}

function layer<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  name: string,
  z: Layer,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  el.className = `layer layer-${name}`
  el.dataset['layer'] = name
  el.style.zIndex = String(z)
  return el
}

export function mountWorld(root: HTMLElement): World {
  root.replaceChildren()

  const backdrop = layer('img', 'backdrop', Layer.Backdrop)
  backdrop.id = 'backdrop'
  backdrop.alt = ''

  const midground = layer('div', 'midground', Layer.Midground)
  const enemy = layer('img', 'enemy', Layer.Enemy)
  enemy.id = 'enemy'
  enemy.alt = ''
  const foreground = layer('div', 'foreground', Layer.Foreground)
  const fx = layer('div', 'fx', Layer.Fx)
  fx.id = 'fx'

  // The hit layer sits with the HUD, above every piece of art, and is the only
  // world layer that is not pointer-events: none.
  const hits = layer('div', 'hits', Layer.Hud)
  hits.id = 'hits'
  const hud = layer('div', 'hud', Layer.Hud)
  hud.id = 'hud'

  root.append(backdrop, midground, enemy, foreground, fx, hits, hud)
  return { root, backdrop, midground, enemy, foreground, fx, hits, hud }
}

export interface EnemyPose {
  /** Sprite width as a fraction of the world box. */
  readonly width: number
  /** Where its feet land, as a fraction of world height. */
  readonly foot: number
}

/**
 * Place the enemy.
 *
 * Fractions of the world box, never pixels, so what is centred on one phone is
 * centred on every phone. The sprite's own aspect sets its height, so a hero
 * asset can be swapped without touching content.
 */
export function placeEnemy(world: World, src: string, pose: EnemyPose): void {
  if (world.enemy.getAttribute('src') !== src) world.enemy.src = src
  world.enemy.hidden = false
  // Anchored by the feet, so the sprite's own aspect sets its height and a
  // hero asset can be swapped without touching content. `height: auto` in the
  // stylesheet does the rest.
  world.enemy.style.width = `${pose.width * 100}%`
  world.enemy.style.left = `${(0.5 - pose.width / 2) * 100}%`
  world.enemy.style.bottom = `${(1 - pose.foot) * 100}%`
  world.enemy.dataset['enemy'] = 'present'
}

export function hideEnemy(world: World): void {
  world.enemy.hidden = true
  world.enemy.removeAttribute('src')
  delete world.enemy.dataset['enemy']
}
