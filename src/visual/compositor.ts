/**
 * The compositor — art. 127.
 *
 * It answers one question and paints nothing: *given a scene's art, the
 * view, and the clock, what stands where, in what order?* The answer is a
 * list of rectangles in frame pixels, sorted by band and then by
 * declaration. That is deliberately the whole of it — composition is the
 * part of a frame that can be wrong in ways a person will not notice for
 * weeks, so it is the part that is a pure function and has tests.
 *
 * `canvas.ts` takes the list and draws it. Nothing here touches a context,
 * an image, or a device pixel.
 */

import type { View } from '../room/index.js'
import { markRect } from '../room/index.js'
import type { AssetCache } from './assets.js'
import type { VisualLayer } from './layers.js'
import { inTheWorld } from './layers.js'
import type { PatchMoment } from './patches.js'
import { patchAsset } from './patches.js'
import type { Anchor, PlacedPlate, SceneArt } from './scene.js'

/** One thing to draw, in frame (game) pixels. */
export interface Draw {
  readonly asset: string
  readonly layer: VisualLayer
  /** Where in the band it sits. Ties go to declaration order. */
  readonly order: number
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** What the compositor needs to know about the moment it is composing. */
export interface Composition {
  readonly view: View
  /** The frame in game pixels. Height derives from the device (art. 24). */
  readonly frame: { readonly width: number; readonly height: number }
  readonly assets: AssetCache
  readonly moment: PatchMoment
}

/**
 * The draw list for a scene's art.
 *
 * Three rules, and each of them is a defect this wave found:
 *
 * **Missing art is dropped, never faked.** An id with no asset behind it
 * contributes nothing and the band stays empty (art. 126). A room whose hero
 * has not been drawn renders as the computed room it always was — art. 26's
 * first tier is a floor, so a hole in the art is a plainer room and never a
 * broken one.
 *
 * **Only plates are composed.** A drawing takes its colours off the *room's*
 * ramp (art. 100), and which ramp that is belongs to the scene rather than to
 * the compositor — so drawings keep the path they have always had, as props
 * painted by `standing()` inside the cast (art. 19). They are in the manifest
 * so that there is one registry of authored things and one validator for the
 * alphabet, not so that they can be laid over the box. A drawing named here is
 * dropped exactly as missing art is, and the composition test says so.
 *
 * **Nothing off the frame is placed.** A thing whose rectangle misses the
 * frame entirely is not in the list, so the painter never asks a canvas to
 * clip something it could have skipped.
 *
 * **The order is the article's** (art. 127), not the order somebody happened
 * to write the overlays in. Declaration order breaks ties *within* a band and
 * nothing else.
 */
export function composite(art: SceneArt, ctx: Composition): readonly Draw[] {
  const draws: Draw[] = []
  let declared = 0

  const place = (plate: PlacedPlate): void => {
    const seq = declared++
    if (!inTheWorld(plate.layer)) return
    const ready = ctx.assets.get(plate.asset)
    if (ready === null || ready.asset.kind !== 'plate') return
    const box = rectOf(plate.anchor, ready.width, ready.height, plate.scale ?? 1, ctx)
    if (box === null) return
    draws.push({ asset: plate.asset, layer: plate.layer, order: plate.order ?? seq, ...box })
  }

  for (const one of art.overlays ?? []) place(one)
  if (art.hero !== undefined) place(art.hero)
  if (art.foreground !== undefined) place(art.foreground)

  for (const patch of art.patches ?? []) {
    const seq = declared++
    if (!inTheWorld(patch.layer)) continue
    const asset = patchAsset(patch, ctx.moment)
    if (asset === null) continue
    const ready = ctx.assets.get(asset)
    if (ready === null || ready.asset.kind !== 'plate') continue
    const box = rectOf(patch.anchor, ready.width, ready.height, 1, ctx)
    if (box === null) continue
    draws.push({ asset, layer: patch.layer, order: seq, ...box })
  }

  // A stable sort by band, then by the order each thing declared. `sort` is
  // required to be stable, so equal keys keep the order they were pushed in
  // and the list is a pure function of the input (art. 17's determinism).
  return [...draws].sort((a, b) => a.layer - b.layer || a.order - b.order)
}

/** A thing's rectangle in frame pixels, or null where it misses the frame. */
function rectOf(
  anchor: Anchor,
  nativeWidth: number,
  nativeHeight: number,
  scale: number,
  ctx: Composition,
): { x: number; y: number; width: number; height: number } | null {
  const box =
    anchor.space === 'world'
      ? worldRect(anchor.at, scale, ctx)
      : frameRect(anchor, nativeWidth, nativeHeight, scale, ctx)
  if (box.width < 1 || box.height < 1) return null
  // Off the frame entirely: nothing to draw and nothing to clip.
  if (box.x >= ctx.frame.width || box.y >= ctx.frame.height) return null
  if (box.x + box.width <= 0 || box.y + box.height <= 0) return null
  return box
}

/**
 * art. 19: a thing in the room is placed at world coordinates and scales by
 * 1/z, so its rectangle is the same one `markRect` gives the thumb. The paint
 * and the tap region cannot drift apart, because they are one calculation.
 *
 * A thing stands on the point it is placed at, so `scale` grows it about the
 * bottom centre rather than about the middle — a hero scaled up sinks its
 * feet through the floor otherwise.
 */
function worldRect(
  at: Parameters<typeof markRect>[1],
  scale: number,
  ctx: Composition,
): { x: number; y: number; width: number; height: number } {
  const rect = markRect(ctx.view, at)
  const width = rect.width * scale
  const height = rect.height * scale
  return {
    x: Math.round(rect.x - (width - rect.width) / 2),
    y: Math.round(rect.y - (height - rect.height)),
    width: Math.round(width),
    height: Math.round(height),
  }
}

/**
 * art. 22: a frame anchor is in fractions of the frame and never in pixels,
 * so what is pinned to the bottom edge is pinned to it on any device. The
 * height follows the master's own aspect: a plate is never stretched, because
 * a stretched authored pixel is the one thing nearest-neighbour cannot save.
 */
function frameRect(
  anchor: Extract<Anchor, { space: 'frame' }>,
  nativeWidth: number,
  nativeHeight: number,
  scale: number,
  ctx: Composition,
): { x: number; y: number; width: number; height: number } {
  const width = Math.round(anchor.width * scale * ctx.frame.width)
  const height = Math.round((width * nativeHeight) / Math.max(1, nativeWidth))
  const x = anchor.x * ctx.frame.width
  const y = anchor.y * ctx.frame.height
  const [ox, oy] = originOffset(anchor.origin, width, height)
  return { x: Math.round(x + ox), y: Math.round(y + oy), width, height }
}

function originOffset(
  origin: Extract<Anchor, { space: 'frame' }>['origin'],
  width: number,
  height: number,
): readonly [number, number] {
  const left = 0
  const centre = -width / 2
  const right = -width
  const top = 0
  const middle = -height / 2
  const bottom = -height
  switch (origin) {
    case 'top-left':
      return [left, top]
    case 'top-center':
      return [centre, top]
    case 'top-right':
      return [right, top]
    case 'center':
      return [centre, middle]
    case 'bottom-left':
      return [left, bottom]
    case 'bottom-right':
      return [right, bottom]
    case 'bottom-center':
    default:
      return [centre, bottom]
  }
}
