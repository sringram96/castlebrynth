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
  /**
   * Every whole-scene plate the room is currently showing.
   *
   * One layer, many plates. A room with four objects in it needs four images
   * that can change independently — the brazier goes out while the bell is
   * mid-swing — and the wrong way to get that is a layer per object, which
   * would put the compositor's fixed order back up for negotiation every time
   * a room grew a thing in it. So the order inside the midground is the order
   * content lists them in, and the layer enum is untouched.
   *
   * Cover-fitted exactly as the backdrop is, so a plate needs no coordinate and
   * has none: the object is where it was painted, at every viewport, and a
   * frame swap moves it by nothing. That is the property the font's die
   * depends on and the one these rooms depend on four times over.
   */
  readonly midground: HTMLElement
  /**
   * The font's basin, which is simply the first plate.
   *
   * Kept as a named element because it is what `showProp` writes to and what
   * the sanctuary's tests look for. It is an ordinary member of the midground
   * and carries `data-prop="prop"`; `showProps` steps around it.
   */
  readonly prop: HTMLImageElement
  readonly enemy: HTMLImageElement
  readonly foreground: HTMLElement
  /**
   * The player's own arm, held on the foreground layer, as two plates.
   *
   * Whole scene frames, cover-fitted exactly as the backdrop is, so the arm
   * sits in the corridor at every viewport without a coordinate anywhere.
   *
   * Two elements rather than one source that gets swapped, because a paint
   * lands in the middle of the strike — the blow is revealed at 480 ms and the
   * arm is extended from 440 to 580 — and a paint that rewrites the source
   * would put the arm back at rest under the very frame it is meant to be
   * landing. So the resting arm is the one written from state, and the
   * extended one is a sibling the sequence uncovers for 140 ms.
   */
  readonly weapon: HTMLImageElement
  readonly strike: HTMLImageElement
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
  const prop = document.createElement('img')
  prop.id = 'prop'
  prop.className = 'prop'
  prop.alt = ''
  prop.hidden = true
  prop.dataset['prop'] = 'prop'
  midground.append(prop)

  const enemy = layer('img', 'enemy', Layer.Enemy)
  enemy.id = 'enemy'
  enemy.alt = ''
  const foreground = layer('div', 'foreground', Layer.Foreground)
  const weapon = document.createElement('img')
  weapon.id = 'weapon'
  weapon.className = 'weapon'
  weapon.alt = ''
  weapon.hidden = true
  const strike = document.createElement('img')
  strike.id = 'weapon-strike'
  strike.className = 'weapon weapon-strike'
  strike.alt = ''
  strike.hidden = true
  foreground.append(weapon, strike)

  const fx = layer('div', 'fx', Layer.Fx)
  fx.id = 'fx'

  // The hit layer sits with the HUD, above every piece of art, and is the only
  // world layer that is not pointer-events: none.
  const hits = layer('div', 'hits', Layer.Hud)
  hits.id = 'hits'
  const hud = layer('div', 'hud', Layer.Hud)
  hud.id = 'hud'

  root.append(backdrop, midground, enemy, foreground, fx, hits, hud)
  return { root, backdrop, midground, prop, enemy, foreground, weapon, strike, fx, hits, hud }
}

/**
 * Show one frame of the room's focal object, or take it away.
 *
 * No geometry, deliberately. The plate is the scene, so there is nothing to
 * place and nothing to drift — which is what lets a sequence swap eight frames
 * through here and be certain the object has not moved.
 */
export function showProp(world: World, src: string): void {
  if (world.prop.getAttribute('src') !== src) world.prop.src = src
  world.prop.hidden = false
}

export function hideProp(world: World): void {
  world.prop.hidden = true
  world.prop.removeAttribute('src')
}

/** One whole-scene plate on the midground, identified for reuse. */
export interface PropPlate {
  /** Stable across frames of the same object. It is what keeps one element. */
  readonly id: string
  readonly src: string
}

/**
 * Show a room's plates, in the order given.
 *
 * Two properties, and the room's whole look rests on them:
 *
 *   - **one element per object, reused.** A plate is found by `data-prop` and
 *     has its `src` rewritten, rather than being torn down and rebuilt. A new
 *     `<img>` per frame would decode before it painted, so the object would
 *     blink out of the room on every swap — which is exactly the flicker whole
 *     scene plates exist to prevent.
 *   - **absent means gone.** Anything on the layer that this call does not
 *     name is removed, in both directions and on every call, so no plate can
 *     outlive the state that put it up. That is the same rule `placeEnemy`
 *     follows for `contact` and `defeat`.
 *
 * Nothing is placed. The plates are the scene, cover-fitted like the backdrop,
 * so there is no geometry here to get wrong and none to drift.
 */
export function showProps(world: World, plates: readonly PropPlate[]): void {
  const wanted = new Set(plates.map((p) => p.id))
  for (const node of world.midground.querySelectorAll<HTMLImageElement>('img[data-prop]')) {
    // The font's basin is `showProp`'s to own. A room that draws plates through
    // here is not the room that draws one through there, so the two never
    // contend for it — but leaving it alone keeps that true by construction.
    if (node.dataset['prop'] === 'prop') continue
    if (!wanted.has(node.dataset['prop'] ?? '')) node.remove()
  }

  for (const plate of plates) {
    let node = world.midground.querySelector<HTMLImageElement>(`img[data-prop="${plate.id}"]`)
    if (!node) {
      node = document.createElement('img')
      node.className = 'prop'
      node.alt = ''
      node.dataset['prop'] = plate.id
      world.midground.append(node)
    }
    if (node.getAttribute('src') !== plate.src) node.src = plate.src
    node.hidden = false
    // Appending an existing node moves it, which is how the given order
    // becomes the paint order without any z-index arithmetic.
    world.midground.append(node)
  }
}


export interface Grip {
  readonly rest: string
  readonly thrust: string
}

/**
 * Put the knife in the player's hand, or take it away.
 *
 * Both plates are mounted; only the resting one is ever visible from a paint.
 * Which of them the player sees is a class the sequence owns and this function
 * does not touch, so the settled screen is the resting arm however a sequence
 * ended — including one settled halfway through.
 */
export function holdWeapon(world: World, grip: Grip | undefined): void {
  for (const [node, src] of [
    [world.weapon, grip?.rest],
    [world.strike, grip?.thrust],
  ] as const) {
    if (!src) {
      node.hidden = true
      node.removeAttribute('src')
      continue
    }
    if (node.getAttribute('src') !== src) node.src = src
    node.hidden = false
  }
}

export interface EnemyPose {
  /** Sprite width as a fraction of the world box. */
  readonly width: number
  /** Where its feet land, as a fraction of world height. */
  readonly foot: number
  /** Its horizontal centre, as a fraction of world width. Middle by default. */
  readonly at?: number
  /**
   * How far away it is standing, when that is a thing about this enemy.
   *
   * Written to the element as an attribute and read by nothing but the
   * stylesheet and the tests. It is a copy of authoritative state, never a
   * source of it: `renderWorld` writes it on every paint, so it cannot survive
   * a state that no longer says it.
   */
  readonly reach?: string
  /**
   * It arrived, and this is the settled picture of that.
   *
   * The terminal rung of the contact ladder, written from state rather than
   * left behind by the sequence that played it — so reloading onto the death
   * screen shows the thing on top of you rather than politely down the hall.
   */
  readonly contact?: boolean
  /**
   * One frame of its own death.
   *
   * `step` selects the stylesheet's treatment for that beat and `dim` is how
   * much light is left in it, as a custom property. The box itself is already
   * in `width` and `foot` — a death is staged the same way a reach is, by
   * placing the sprite, not by transforming it — so this carries only what
   * placement cannot say.
   *
   * Written in both directions on every call, as `contact` is, so no frame of
   * a death can outlive the sequence that painted it.
   */
  readonly defeat?: { readonly step: number; readonly dim: number }
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
  world.enemy.style.left = `${((pose.at ?? 0.5) - pose.width / 2) * 100}%`
  world.enemy.style.bottom = `${(1 - pose.foot) * 100}%`
  world.enemy.dataset['enemy'] = 'present'
  if (pose.reach) world.enemy.dataset['reach'] = pose.reach
  else delete world.enemy.dataset['reach']
  // Written on every paint, in both directions, so no rung of the contact
  // ladder can outlive the state that put it there.
  if (pose.contact) {
    world.enemy.dataset['contact'] = 'landed'
    world.root.dataset['contact'] = 'landed'
  } else {
    delete world.enemy.dataset['contact']
    delete world.root.dataset['contact']
  }
  if (pose.defeat) {
    world.enemy.dataset['defeat'] = String(pose.defeat.step)
    world.enemy.style.setProperty('--dim', String(pose.defeat.dim))
  } else {
    delete world.enemy.dataset['defeat']
    world.enemy.style.removeProperty('--dim')
  }
}

export function hideEnemy(world: World): void {
  world.enemy.hidden = true
  world.enemy.removeAttribute('src')
  delete world.enemy.dataset['enemy']
  delete world.enemy.dataset['reach']
  delete world.enemy.dataset['contact']
  delete world.enemy.dataset['defeat']
  world.enemy.style.removeProperty('--dim')
  delete world.root.dataset['contact']
}
