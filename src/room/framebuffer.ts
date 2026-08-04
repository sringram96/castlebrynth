/**
 * A frame of game pixels. RGBA bytes, always opaque — art. 17 bans alpha,
 * so the fourth channel is a formality the DOM asks for.
 *
 * Headless by construction: nothing here touches a canvas, so a room can be
 * rendered and compared byte for byte in a test (art. 17).
 */

export interface Framebuffer {
  readonly width: number
  readonly height: number
  /** RGBA, row-major, width*height*4 bytes. */
  readonly pixels: Uint8ClampedArray
}

export function framebuffer(width: number, height: number): Framebuffer {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255
  return { width, height, pixels }
}

const parsed = new Map<string, number>()

/** `#rrggbb` to a packed 24-bit number, memoised. */
export function colorOf(hex: string): number {
  const hit = parsed.get(hex)
  if (hit !== undefined) return hit
  const n = parseInt(hex.slice(1), 16)
  parsed.set(hex, n)
  return n
}

/** Write one pixel by framebuffer index. */
export function poke(fb: Framebuffer, i: number, hex: string): void {
  const n = colorOf(hex)
  const d = fb.pixels
  d[i * 4] = (n >> 16) & 255
  d[i * 4 + 1] = (n >> 8) & 255
  d[i * 4 + 2] = n & 255
  d[i * 4 + 3] = 255
}

/**
 * One pixel at a floating-point position, truncated and clipped — the
 * canvas rule, kept so the port lands on the same pixels as the reference.
 */
export function plot(fb: Framebuffer, hex: string, x: number, y: number): void {
  const px = x | 0
  const py = y | 0
  if (px < 0 || py < 0 || px >= fb.width || py >= fb.height) return
  poke(fb, py * fb.width + px, hex)
}

/** A filled rectangle, truncated and clipped like `fillRect`. */
export function fill(
  fb: Framebuffer,
  hex: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const x0 = x | 0
  const y0 = y | 0
  const x1 = x0 + Math.max(1, w | 0)
  const y1 = y0 + Math.max(1, h | 0)
  for (let py = Math.max(0, y0); py < Math.min(fb.height, y1); py++) {
    for (let px = Math.max(0, x0); px < Math.min(fb.width, x1); px++) {
      poke(fb, py * fb.width + px, hex)
    }
  }
}
