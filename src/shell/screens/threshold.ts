/**
 * The threshold — the game's front door.
 *
 * It is a screen, not a panel. It offers only what is true: Continue when a
 * run is in flight, Descend when there is not, Abandon only for a run that
 * exists, and Settings.
 *
 * The Book is NOT an action in this strip any more. Read owns the reliquary's
 * third footer bed everywhere the reliquary is present.
 */

import { NOTICES } from '../../content/index.js'

export interface AtTheDoor {
  readonly inFlight: boolean
  readonly abandoning: boolean
}

export interface DoorActs {
  resume(): void
  descend(): void
  arm(): void
  abandon(): void
  keep(): void
  settings(): void
}

export type VerbFactory = (key: string, onClick: () => void, off?: boolean) => HTMLButtonElement

export function doorWord(at: AtTheDoor): string {
  if (at.abandoning) return NOTICES['gate.abandon.asked'] ?? ''
  return (at.inFlight ? NOTICES['gate.held'] : NOTICES['gate.cold']) ?? ''
}

export function doorActs(strip: HTMLElement, at: AtTheDoor, acts: DoorActs, verb: VerbFactory): void {
  strip.replaceChildren()
  if (at.abandoning) {
    strip.append(verb('abandon.all', acts.abandon), verb('keep', acts.keep))
    return
  }
  strip.append(at.inFlight ? verb('continue', acts.resume) : verb('descend', acts.descend))
  if (at.inFlight) strip.append(verb('abandon', acts.arm))
  strip.append(verb('settings', acts.settings))
}
