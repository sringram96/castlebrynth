/**
 * The strip, drawn.
 *
 * A vertical run of frames, oldest at the top, the room you are standing in at
 * the bottom and bordered. Beside a frame the run has walked out of, the mouths
 * it did not take — dark marks carrying the label that was on the hotspot, and
 * nothing else. Below the last frame, **nothing**: no sockets, no count, no
 * shape of the plan.
 *
 * It decides nothing and it is not a control. `game/strip.ts` derives the
 * frames off settled state; this turns them into chips. Frames and mouths are
 * stylesheet chips this wave — painted strip furniture is owed art, recorded in
 * `POLISH_PROGRESS.md` § HUMAN ART REQUIRED.
 */

import { STRIP_AHEAD, STRIP_HEAD } from '../content/text.js'
import { stripOf } from '../game/strip.js'
import type { RunState } from '../game/state.js'
import { el } from './components.js'

export function stripView(run: RunState): HTMLElement {
  const strip = el('div', 'strip')
  strip.id = 'strip'
  strip.setAttribute('role', 'list')
  const frames = stripOf(run)
  strip.dataset['frames'] = String(frames.length)

  for (const frame of frames) {
    const row = el('div', 'strip-row')
    row.dataset['node'] = frame.nodeId
    row.dataset['territory'] = frame.territory
    row.dataset['current'] = frame.current ? 'yes' : 'no'
    row.setAttribute('role', 'listitem')

    const box = el('div', 'strip-frame')
    // A place you have stood in is not a hidden place, so it carries its name.
    box.append(el('b', 'strip-name', frame.name))
    row.append(box)

    // The roads out of here that this run did not take. Labelled only with the
    // word that was on the hotspot — a mouth says which way, never where to.
    if (frame.mouths.length > 0) {
      const mouths = el('div', 'strip-mouths')
      for (const mouth of frame.mouths) {
        const mark = el('span', 'strip-mouth', mouth.label)
        mark.dataset['mouth'] = mouth.to
        mouths.append(mark)
      }
      row.append(mouths)
    }
    strip.append(row)
  }
  return strip
}

/** The strip, with its heading and the one line about what is below it. */
export function stripPanel(run: RunState): HTMLElement {
  const box = el('div', 'strip-box')
  box.append(el('h2', 'screen-head', STRIP_HEAD))
  box.append(stripView(run))
  box.append(el('p', 'strip-ahead', STRIP_AHEAD))
  return box
}
