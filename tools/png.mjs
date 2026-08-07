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

import { deflateSync } from 'node:zlib'

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
export function encode(width, height, rgba) {
  if (rgba.length !== width * height * 4) throw new Error('rgba is the wrong size')
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] !== 0 && rgba[i] !== 255) {
      throw new Error(`art. 17: alpha is ${rgba[i]} at pixel ${(i - 3) / 4}; it must be 0 or 255`)
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
