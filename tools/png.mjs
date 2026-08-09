/**
 * A PNG encoder, for the plate pipeline. Not shipped and not imported by
 * anything under `src` — it exists so that a master authored as text can be
 * written out as the raster the runtime loads (art. 126).
 *
 * It writes 8-bit RGBA with **binary alpha only**: every pixel is 0 or 255
 * and `encode` throws on anything between. That is art. 17 enforced at the
 * one place it can be enforced cheaply — a pixel's colour never depends on
 * what is behind it, so a room still renders identical every visit.
 */

import { deflateSync, inflateSync } from 'node:zlib'

const CRC = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  out.writeUInt32BE(crc32(body), data.length + 8)
  return out
}

/**
 * `rgba` is width × height × 4 bytes. Deterministic: the same pixels give
 * the same file, so a master is diffable and a rebuild is a no-op.
 */
export function encode(width, height, rgba, { cutout = false } = {}) {
  if (rgba.length !== width * height * 4) throw new Error('rgba is the wrong size')
  // art. 17 as amended by the hero-art wave: a plate may carry an edge. What
  // the article was ever defending is determinism, and an authored alpha is as
  // deterministic as an authored colour — but a master that *means* to be a
  // cutout still says so, and is held to it here.
  if (cutout) {
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] !== 0 && rgba[i] !== 255) {
        throw new Error(`cutout: alpha is ${rgba[i]} at pixel ${(i - 3) / 4}; it must be 0 or 255`)
      }
    }
  }
  const raw = Buffer.alloc(height * (width * 4 + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0 // filter: none, so the bytes stay readable
    Buffer.from(rgba.buffer ?? rgba, y * width * 4, width * 4).copy(
      raw,
      y * (width * 4 + 1) + 1,
    )
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/**
 * Read an 8-bit PNG back into RGBA pixels.
 *
 * The screen art under `reference/visual/` is the source the runtime plates
 * are **cut from** (`tools/slice.mjs`), and cutting one means reading it.
 * 8-bit, greyscale / RGB / RGBA / palette, not interlaced — which is
 * everything the repository holds and everything this file writes.
 *
 * Palette is read because authored plates arrive that way: a hand-made
 * four-pose set is colour-reduced by whatever drew it, and a decoder that
 * cannot open the master is a pipeline that cannot use it.
 */
export function decode(buf) {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  let at = 8
  let width = 0
  let height = 0
  let channels = 4
  let palette = null
  let alphas = null
  const parts = []
  while (at < buf.length) {
    const len = view.getUint32(at)
    const type = String.fromCharCode(...buf.subarray(at + 4, at + 8))
    if (type === 'IHDR') {
      width = view.getUint32(at + 8)
      height = view.getUint32(at + 12)
      const colour = buf[at + 17]
      channels = colour === 6 ? 4 : colour === 2 ? 3 : colour === 4 ? 2 : colour === 0 || colour === 3 ? 1 : 0
      if (colour === 3) palette = new Uint8Array(0)
      if (buf[at + 16] !== 8 || channels === 0 || buf[at + 20] !== 0) {
        throw new Error('only 8-bit grey/RGB/RGBA/palette, non-interlaced PNG is read here')
      }
    }
    if (type === 'PLTE') palette = buf.subarray(at + 8, at + 8 + len)
    if (type === 'tRNS') alphas = buf.subarray(at + 8, at + 8 + len)
    if (type === 'IDAT') parts.push(buf.subarray(at + 8, at + 8 + len))
    at += len + 12
    if (type === 'IEND') break
  }
  const raw = inflateSync(Buffer.concat(parts))
  const stride = width * channels
  const flat = new Uint8Array(width * height * channels)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? flat[y * stride + i - channels] : 0
      const b = y > 0 ? flat[(y - 1) * stride + i] : 0
      const c = i >= channels && y > 0 ? flat[(y - 1) * stride + i - channels] : 0
      let value = line[i]
      if (filter === 1) value += a
      else if (filter === 2) value += b
      else if (filter === 3) value += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      flat[y * stride + i] = value & 0xff
    }
  }
  if (channels === 4) return { width, height, rgba: flat }
  const rgba = new Uint8Array(width * height * 4)
  if (palette && palette.length > 0) {
    for (let i = 0; i < width * height; i++) {
      const index = flat[i]
      rgba[i * 4] = palette[index * 3]
      rgba[i * 4 + 1] = palette[index * 3 + 1]
      rgba[i * 4 + 2] = palette[index * 3 + 2]
      rgba[i * 4 + 3] = alphas && index < alphas.length ? alphas[index] : 255
    }
    return { width, height, rgba }
  }
  for (let i = 0; i < width * height; i++) {
    const from = i * channels
    const grey = channels <= 2
    rgba[i * 4] = flat[from]
    rgba[i * 4 + 1] = grey ? flat[from] : flat[from + 1]
    rgba[i * 4 + 2] = grey ? flat[from] : flat[from + 2]
    rgba[i * 4 + 3] = channels === 2 ? flat[from + 1] : 255
  }
  return { width, height, rgba }
}

/**
 * A master authored as text: rows of single characters, a palette mapping
 * each character to `#rrggbb`, and `.`/space meaning *nothing is here*.
 *
 * This is the same shape art. 100's alphabet has, said about a plate: the
 * difference is that a plate's characters index its own palette rather than
 * the room's ramp, which is the whole of what art. 126 added.
 */
export function fromText(rows, palette) {
  const height = rows.length
  const width = rows.reduce((most, row) => Math.max(most, row.length), 0)
  const rgba = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x] ?? '.'
      if (ch === '.' || ch === ' ') continue
      const hex = palette[ch]
      if (hex === undefined) throw new Error(`no palette entry for "${ch}"`)
      const at = (y * width + x) * 4
      rgba[at] = parseInt(hex.slice(1, 3), 16)
      rgba[at + 1] = parseInt(hex.slice(3, 5), 16)
      rgba[at + 2] = parseInt(hex.slice(5, 7), 16)
      rgba[at + 3] = 255
    }
  }
  return { width, height, rgba }
}
