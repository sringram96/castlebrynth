/**
 * The threshold — the game's front door (card 61).
 *
 * **It is a screen, not a panel.** The choosing screen (PR #41) established
 * the shape: a decision of its own gets a screen, with no tabs, because
 * there is nowhere else to be until it is answered. The threshold does not
 * touch the tray.
 *
 * It offers **only what is true**. Continue exists when there is a run to
 * come back to and not otherwise; Descend exists when there is not. art. 71
 * says no press may lie about where it takes you, and a Continue that starts
 * a fresh run is exactly that lie. The Book is offered when the permanent
 * holds one, and it is the reader that already exists (art. 74's sheet)
 * rather than a second statement of one fact.
 *
 * Abandoning a run is possible and never quiet: its own verb, what it costs
 * said before the press, and never the same button as Descend — a run is not
 * a thing to lose by mis-tapping (arts 5, 71).
 */

import { NOTICES } from '../../content/index.js'

/** What is true at the door right now. The screen renders this and nothing else. */
export interface AtTheDoor {
  /** A run has been begun and has not ended. Continue means something. */
  readonly inFlight: boolean
  /** The permanent holds endings, so there is something to read. */
  readonly hasBook: boolean
  /** Armed: the word band has said what abandoning costs. */
  readonly abandoning: boolean
}

/** What the four presses do. The shell owns all of it; this owns none of it. */
export interface DoorActs {
  resume(): void
  descend(): void
  /** Arms the abandon, so the cost is stated before it is paid. */
  arm(): void
  abandon(): void
  /** Walks away from an armed abandon, changing nothing (art. 5). */
  keep(): void
  read(): void
  settings(): void
}

/**
 * art. 66: a control is a plain imperative verb and it comes from content.
 * The shell's factory is handed over rather than rebuilt, so there is one
 * statement of what a button is.
 */
export type VerbFactory = (key: string, onClick: () => void, off?: boolean) => HTMLButtonElement

/**
 * The word band's line. It states where you are standing and never
 * instructs — the verbs are the only thing that says what to press.
 */
export function doorWord(at: AtTheDoor): string {
  if (at.abandoning) return NOTICES['gate.abandon.asked'] ?? ''
  return (at.inFlight ? NOTICES['gate.held'] : NOTICES['gate.cold']) ?? ''
}

/** The strip at the door. Nothing here is offered that is not true. */
export function doorActs(strip: HTMLElement, at: AtTheDoor, acts: DoorActs, verb: VerbFactory): void {
  strip.replaceChildren()
  if (at.abandoning) {
    // Two presses with the loss stated between them, exactly as starting
    // over is (art. 71). Keep is first nowhere: the press that changes
    // nothing sits beside the one that does, and neither is under the thumb
    // by accident.
    strip.append(verb('abandon.all', acts.abandon), verb('keep', acts.keep))
    return
  }
  strip.append(
    at.inFlight ? verb('continue', acts.resume) : verb('descend', acts.descend),
  )
  if (at.inFlight) strip.append(verb('abandon', acts.arm))
  if (at.hasBook) strip.append(verb('read', acts.read))
  strip.append(verb('settings', acts.settings))
}
