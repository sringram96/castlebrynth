/**
 * **Tray-space** — the reliquary's own coordinate system.
 *
 * This is art. 22 applied to the interface, and it is the abstraction the
 * shell was missing. `src/room` has had a spatial contract since the
 * beginning: authored coordinates go in, a projection happens, screen pixels
 * come out, and nothing about a room's composition depends on how wide the
 * phone is. The tray had no such contract — it had a background image and a
 * responsive layout guessing at it — so every attempt to make the two agree
 * was a CSS tuning pass, and each one was more correct and no better.
 *
 * A reliquary is an authored object. Its parts stand where they were drawn to
 * stand, **in fractions of the panel** — 0 to 1 across and 0 to 1 down — and
 * the whole apparatus is scaled to whatever the device gives it:
 *
 *     screenX = relativeX × panelWidth
 *     screenY = relativeY × panelHeight
 *
 * Fractions rather than the artwork's own pixels because that is the space the
 * art direction arrives in (`reference/visual/reliquary-zones.png`), and a
 * coordinate an art director can read back off their own diagram is a
 * coordinate nobody has to convert.
 *
 * **Device width scales the apparatus. It never rearranges it.** That single
 * sentence is what makes three dice and eight dice the same picture with a
 * different hand in it, rather than two layouts that happen to share a
 * background.
 *
 * The symmetry with the room is exact and worth naming:
 *
 *     WorldMark  → perspective projector → screen   (3D, src/room)
 *     TrayMark   → uniform tray transform → screen  (2D, here)
 *
 * Neither is laid out by generic responsive CSS. CSS renders and takes taps;
 * it decides nothing about where anything is.
 */

/** A point in the panel's own space: 0 to 1, left to right and top to bottom. */
export interface TrayPoint {
  readonly x: number
  readonly y: number
}

/** A rectangle in panel space, from its top-left corner. All four are 0 to 1. */
export interface TrayRect extends TrayPoint {
  readonly width: number
  readonly height: number
}

/**
 * A rectangle that may also be turned. Rotation is degrees, positive
 * clockwise, about the rectangle's own centre — it is what stops a hand of
 * dice reading as a row of icons.
 */
export interface TrayPose extends TrayRect {
  readonly rotation?: number
}

/** What every placement in the tray is measured against. */
export interface TrayFrame {
  readonly authoredWidth: number
  readonly authoredHeight: number
}

/** What the tray was rendered at, in CSS pixels. Everything projects into this. */
export interface TraySize {
  readonly width: number
  readonly height: number
}

/**
 * The panel's size from its width. The aspect is the artwork's and is never
 * varied — a tray that scaled x and y independently would be a tray whose orb
 * is an egg.
 */
export function traySizeFor(frame: TrayFrame, renderedWidth: number): TraySize {
  return { width: renderedWidth, height: trayHeightFor(frame, renderedWidth) }
}

/** What the tray comes to on this device, in CSS pixels. */
export function trayHeightFor(frame: TrayFrame, renderedWidth: number): number {
  return renderedWidth * (frame.authoredHeight / Math.max(1, frame.authoredWidth))
}

/** One placement, as the inline style that puts it there. */
export interface Placed {
  readonly left: string
  readonly top: string
  readonly width: string
  readonly height: string
  readonly transform?: string
}

/**
 * Project a pose into CSS pixels.
 *
 * Absolute positioning is normally the wrong tool for a web interface and is
 * exactly the right one here, because this is not a page: it is a painted
 * apparatus with a fixed internal geometry. Responsiveness happens *outside*
 * the apparatus, when the finished thing is scaled to fit.
 */
export function placed(pose: TrayPose, at: TraySize): Placed {
  const style: Placed = {
    left: `${pose.x * at.width}px`,
    top: `${pose.y * at.height}px`,
    width: `${pose.width * at.width}px`,
    height: `${pose.height * at.height}px`,
  }
  if (pose.rotation === undefined || pose.rotation === 0) return style
  return { ...style, transform: `rotate(${pose.rotation}deg)` }
}

/** Put a placement onto an element. The only thing here that touches the DOM. */
export function place(el: HTMLElement, pose: TrayPose, size: TraySize): void {
  const at = placed(pose, size)
  el.style.position = 'absolute'
  el.style.left = at.left
  el.style.top = at.top
  el.style.width = at.width
  el.style.height = at.height
  el.style.transform = at.transform ?? ''
}

/**
 * A rectangle grown about its own centre.
 *
 * This is how a die gets a target without getting a box: the visible art is
 * one rectangle, the thing a thumb presses is a larger one centred on it, and
 * art. 128's floor is a fact about the second. The first cut of this wave
 * measured the *sprite* against the floor, concluded the frame and the article
 * could not both be obeyed, and repealed the article. The padding was the
 * answer and it was here all along.
 */
export function grown(rect: TrayRect, to: number, toHeight = to): TrayRect {
  const width = Math.max(rect.width, to)
  const height = Math.max(rect.height, toHeight)
  // Panel space, so `to` is a fraction of the panel like everything else.
  return {
    x: rect.x - (width - rect.width) / 2,
    y: rect.y - (height - rect.height) / 2,
    width,
    height,
  }
}

/** The centre of a rectangle, for anchoring text and for the debug overlay. */
export function centre(rect: TrayRect): TrayPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}
