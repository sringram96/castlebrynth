/**
 * The whole install is a URL. This mounts the world band and paints one
 * room into it — the renderer port, and nothing else. Everything the game
 * does beyond this is still a stub.
 */

import { atGrid, GRID, WAKE } from './content/index.js'
import { integerScale, present, renderRoom } from './room/index.js'

const found = document.getElementById('view')
if (!(found instanceof HTMLCanvasElement)) throw new Error('no canvas')
const canvas: HTMLCanvasElement = found

function paint(): void {
  const stage = canvas.parentElement
  if (stage === null) return
  // art. 24: frame height derives from the device; the box extends itself.
  const height = Math.round((GRID * stage.clientHeight) / stage.clientWidth)
  const room = renderRoom(WAKE, atGrid(GRID, height))
  present(room.frame, canvas)
  const scale = integerScale(room.frame, stage.clientWidth, stage.clientHeight)
  canvas.style.width = `${room.frame.width * scale}px`
  canvas.style.height = `${room.frame.height * scale}px`
}

addEventListener('resize', paint)
paint()
