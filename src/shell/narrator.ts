// H103 · the writing at the top. One line, and the next turn takes it away.
//
// GAME.md #frame: "Top: the writing. One or two short lines — place, event,
// feeling." That is the whole of this module. It owns one element and every
// turn it **replaces** what stands in it. It never appends: a narrator that
// stacked would be a log, and the log is a pane (H105). The person reads what
// this tap did, and then it is gone — the record is the journal and the
// refused ledger, both of which are somewhere else on purpose.
//
// The mock is the specification (MVP.md), and `#narr` / `narrate()` / `.swap`
// in mock/slice-mvp.html are what it says about this line: a serif italic on
// a reserved height, one string at a time, faded across the change. The
// deviations from it are two, and both are stated where they happen —
// `swap()` below on the fade, and `linesFor` on the arrival.
//
// No rules here (.llm/rules/layering.mdc). Nothing is decided about the world:
// `act` already said what happened, in the order it happened, and `getView`
// already said where you now are. This only chooses which of that is writing.

import type { Effect, View } from '../core/api-types'
import { theme } from './theme'
import { narratorLines } from './viewmap'

/** The one line, and the way to change it. H107 puts `el` in the frame. */
export interface Narrator {
  /** The element. Owned by this module; nothing else writes into it. */
  readonly el: HTMLElement
  /**
   * Speak this turn: the effects `act` produced, over the View it produced
   * them into. Called with no effects for the opening draw, which has nothing
   * to report and so reports the place.
   *
   * Idempotent. The same turn rendered twice draws once — see `swap`.
   */
  readonly render: (view: View, effects?: readonly Effect[]) => void
}

// The mock's `transition:opacity .22s` on #narr. Not a theme token: theme.ts
// is colour, length and type (H102) and has no motion scale, and inventing one
// from inside this card would be a token nobody else asked for
// (.llm/rules/no-dead-scaffolding.mdc).
const FADE = '.22s'

/**
 * A narrator, detached. It is not in a document until something appends it,
 * which keeps this module importable by a test with nothing firing on it —
 * `main.ts` is the only module in src/shell allowed a side effect on import
 * (H101).
 */
export function createNarrator(): Narrator {
  const el = document.createElement('div')
  // The mock's own name for it. There is one narrator in the frame.
  el.id = 'narr'
  // And the name the acceptance suite knows it by. H103 and H100 were authored
  // in the same wave and did not agree on this one string: H105 wired its panes
  // to `data-testid`, this file wired to the mock's `#narr`, and neither was
  // wrong on its own. The suite is the definition of done and may not be edited
  // (AGENTS.md law 7), so the hook comes here. Both names are the same element,
  // and H115's art pass may rewrite the id but not this.
  el.dataset.testid = 'narrator'

  // Inline from the tokens rather than a stylesheet: theme.ts is data and its
  // consumers read values and set them (H102). What a test reads is then what
  // a thumb sees, with no third file able to disagree with either.
  el.style.padding = `${theme.space.lg} ${theme.space.xl}`
  el.style.fontFamily = theme.type.prose
  // Serif and italic is what makes the writing read as writing, apart from the
  // interface under it (GAME.md #frame).
  el.style.fontStyle = 'italic'
  el.style.fontSize = theme.type.size.prose
  el.style.lineHeight = theme.type.leading.prose
  el.style.color = theme.color.text
  // min-height, not height — the mock's own choice. It reserves the room so a
  // one-line turn does not jump the scene under the thumb, and still grows for
  // the rare turn that says something and then arrives somewhere.
  el.style.minHeight = theme.frame.narrator
  // Two lines are one element with a newline between them rather than two
  // elements, so "replaced, never appended" is a single assignment and
  // `el.textContent` is exactly what was spoken.
  el.style.whiteSpace = 'pre-line'
  el.style.opacity = '1'
  el.style.transition = `opacity ${FADE}`

  return {
    el,
    render: (view, effects = []) => {
      const next = linesFor(view, effects).join('\n')
      // "Swap on change" (H103) — and only on change. A re-render of the same
      // turn must not flash, or every idempotent redraw H107 makes would read
      // as something having happened.
      if (next !== el.textContent) swap(el, next)
    },
  }
}

/**
 * Replace the line, fading the new one in.
 *
 * The mock's `narrate()` fades the old line out over 210ms, swaps the text,
 * then fades in. This one swaps the text now and fades only the arrival. The
 * reason is not taste: a narrator whose text lands on a timer makes every
 * shell above it — H107's loop, H100's drive-it-with-taps acceptance — wait on
 * a clock to read a line, and a shell that has to be awaited is a shell whose
 * tests are about scheduling. The visible difference is one missing outgoing
 * fade; the invisible one is that `render` is done when it returns.
 */
function swap(el: HTMLElement, text: string): void {
  el.style.transition = 'none'
  el.style.opacity = '0'
  // Reading layout flushes the drop, so the browser sees dark-then-light
  // rather than coalescing both writes into no change at all. The mock plays
  // exactly this trick on the hurt flash (`void $("vig").offsetWidth`).
  el.getBoundingClientRect()
  el.textContent = text
  el.style.transition = `opacity ${FADE}`
  el.style.opacity = '1'
}

/**
 * What this turn says, in the order the world said it.
 *
 * Three rules, and they are the card:
 *
 *   **say effects in order.** `resolve` pushes prose before it applies deltas
 *   and applies deltas in VOCAB.md's order, so the effect list is already the
 *   order the world spoke in. It is walked, not sorted.
 *
 *   **the arrival on goto.** The `enter` effect carries a scene id and no
 *   prose (api-types.ts), so the arrival is read off the View that `act`
 *   landed in — `narratorLines`, which stands the enter line above the line it
 *   stands under (H102). It comes after what the tap said because that is when
 *   it happened: `say` leads and `goto` is late in the delta table.
 *
 *   **cleared by the next turn.** A turn that speaks nothing falls back to the
 *   place. That is the opening draw, and it is also a tap that resolved to
 *   nothing — a stale screen, which the engine answers with an empty effect
 *   list rather than an error (src/core/api.ts).
 *
 * The mock diverges here and is not followed: `go()` narrates the arrival and
 * a caller may then narrate over it, so exactly one string survives a turn.
 * That is an authoring convenience in a hand-written prototype. GAME.md #frame
 * says one *or two* lines, `theme.frame.narrator` reserves the room for two,
 * and dropping what the tap said on the way out of a room would lose authored
 * prose the person never gets another chance to read.
 */
function linesFor(view: View, effects: readonly Effect[]): readonly string[] {
  const spoken = effects.map(writingIn).filter(isWriting)
  // A goto happened. Where you now are is part of what this turn says.
  if (effects.some((effect) => effect.kind === 'enter')) {
    return [...spoken, ...narratorLines(view)]
  }
  return spoken.length > 0 ? spoken : narratorLines(view)
}

/**
 * The prose in one effect, or null where an effect is not writing.
 *
 * Exhaustive on purpose and with no `default`: the union is discriminated so
 * that a shell which has not handled a member fails to compile rather than
 * dropping it in silence (api-types.ts). A new kind makes the end of this
 * function reachable, and its declared return type refuses it.
 */
function writingIn(effect: Effect): string | null {
  switch (effect.kind) {
    case 'say':
      return effect.text
    // A refusal is spoken. Its line is the only prose the turn produced —
    // `refuse` implies no other delta fired (VOCAB.md), and the shore's two
    // refusals carry no `say` beside them, so a narrator that skipped this
    // would answer "read the book" with a blank screen. The ledger is the
    // second thing that happens to a refusal, not the first: GAME.md
    // #consequences calls it "the compass", a record of what turned you away,
    // and H105 draws it in the LOG pane.
    case 'refused':
      return effect.line
    // Not writing. A journal entry is a key ("procession"), not prose, and the
    // journal is the person's own record — a pane, not the line (H105).
    case 'journal':
      return null
    // Not writing either: `enter` is a scene id. Its prose is on the View, and
    // `linesFor` reads it from there.
    case 'enter':
      return null
  }
}

/**
 * Blank prose is dropped rather than printed, for the same reason
 * `narratorLines` drops it: a reserved height showing one empty line reads as
 * a bug, and silence reads as silence.
 */
function isWriting(line: string | null): line is string {
  return typeof line === 'string' && line.trim() !== ''
}
