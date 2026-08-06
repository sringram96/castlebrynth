/**
 * Settings (card 62), under art. 116.
 *
 * **A setting may change how the game is presented. It may never change what
 * is true.** No difficulty, no arithmetic, no drift weighting, no rarity —
 * anything that would make two players' Books incomparable is not a setting,
 * and nothing in this file can reach any of it: it is handed a preferences
 * record and three vault acts, and there is no path from here to a run.
 *
 * A screen and not a panel, for the same reason the threshold and the
 * choosing screen are: there is nowhere else to be until you leave it.
 *
 * The wipe is the most dangerous press in the game. It says plainly what it
 * ends, it is confirmed, and export is offered beside it — a player who is
 * about to lose their Book should be one press away from keeping a copy.
 *
 * What the screen *holds* is a pure function of what is true (`settingsSheet`)
 * and the DOM is built from it. So the law-bearing half — which knobs, which
 * verbs, what stands beside the wipe — is a value that can be read and tested
 * without a document anywhere near it.
 */

import { NOTICES } from '../../content/index.js'
import type { Preferences } from '../../state/index.js'

/** What the screen is looking at. */
export interface SettingsView {
  readonly prefs: Preferences
  /** The vault as text, or nothing on a machine that has never saved. */
  readonly snapshot: string | null
  /**
   * A snapshot this build could not read, set aside rather than destroyed
   * (art. 11). Card 32 left it with no reader; this is the reader.
   */
  readonly quarantine: string | null
  /** Armed: the screen has said what wiping ends. */
  readonly wiping: boolean
  /** What the last import said, if one has been tried. */
  readonly imported: 'took' | 'refused' | null
}

export interface SettingsActs {
  /** art. 116: a presentation knob moved. Nothing else may move with it. */
  prefer(change: Partial<Preferences>): void
  /** Arms the wipe, so what it ends is stated before it is ended. */
  arm(): void
  wipe(): void
  keep(): void
  bring(text: string): void
  leave(): void
}

export type VerbFactory = (key: string, onClick: () => void, off?: boolean) => HTMLButtonElement

/** One thing on the screen, before any of it is a node. */
export type SettingsRow =
  /** art. 90: a label with a state. A tap changes it; it commits nothing else. */
  | { readonly kind: 'setting'; readonly label: string; readonly on: boolean; readonly change: Partial<Preferences> }
  | { readonly kind: 'said'; readonly text: string }
  | { readonly kind: 'rule' }
  /** The vault as text. `carry` means the box is the one Bring in reads. */
  | { readonly kind: 'box'; readonly text: string; readonly carry: boolean }
  | { readonly kind: 'verbs'; readonly keys: readonly string[] }

/** The word band's line: what is true here, and never an instruction. */
export function settingsWord(view: SettingsView): string {
  if (view.wiping) return NOTICES['wipe.asked'] ?? ''
  if (view.imported === 'refused') return NOTICES['vault.refused'] ?? ''
  if (view.imported === 'took') return NOTICES['vault.took'] ?? ''
  return NOTICES['settings.here'] ?? ''
}

/** What the screen holds. The whole of art. 116, as a value. */
export function settingsSheet(view: SettingsView): readonly SettingsRow[] {
  if (view.wiping) {
    return [
      { kind: 'said', text: NOTICES['wipe.ends'] ?? '' },
      // Export stands on the screen the wipe is confirmed on: the press that
      // keeps a copy has to be reachable from the press that ends one.
      { kind: 'box', text: view.snapshot ?? '', carry: false },
      { kind: 'verbs', keys: ['wipe.all', 'keep'] },
    ]
  }
  return [
    // art. 107, tested: the one presentation knob the game has.
    {
      kind: 'setting',
      label: NOTICES['motion.label'] ?? '',
      on: view.prefs.reducedMotion,
      change: { reducedMotion: !view.prefs.reducedMotion },
    },
    { kind: 'said', text: NOTICES['motion.says'] ?? '' },
    { kind: 'rule' },
    { kind: 'said', text: NOTICES['vault.says'] ?? '' },
    // The bytes on the shelf, not a fresh serialisation of what the shell
    // happens to be holding — an export that differs from the save is an
    // export nobody can trust.
    { kind: 'box', text: view.snapshot ?? '', carry: true },
    { kind: 'verbs', keys: ['bring', 'wipe'] },
    // Card 32's debt: a snapshot this build could not read has been sitting
    // in the vault with nothing able to show it to anybody. It can be copied
    // out now, and a later build can bring it back in through the box above.
    ...(view.quarantine === null
      ? []
      : ([
          { kind: 'rule' },
          { kind: 'said', text: NOTICES['vault.set-aside'] ?? '' },
          { kind: 'box', text: view.quarantine, carry: false },
        ] as const)),
    { kind: 'verbs', keys: ['close'] },
  ]
}

export function settingsPanel(
  panel: HTMLElement,
  view: SettingsView,
  acts: SettingsActs,
  verb: VerbFactory,
): void {
  panel.replaceChildren()
  let carrier: HTMLTextAreaElement | null = null
  const press: Readonly<Record<string, () => void>> = {
    'wipe.all': () => acts.wipe(),
    keep: () => acts.keep(),
    // Never disabled: the box is typed into after this is drawn, so a button
    // that read it at paint time would be wrong by the time it was pressed.
    // An empty box refuses out loud instead, which art. 69 asks for anyway.
    bring: () => acts.bring(carrier?.value.trim() ?? ''),
    wipe: () => acts.arm(),
    close: () => acts.leave(),
  }

  for (const row of settingsSheet(view)) {
    switch (row.kind) {
      case 'setting':
        panel.append(toggle(row.label, row.on, () => acts.prefer(row.change)))
        break
      case 'said':
        panel.append(said(row.text))
        break
      case 'rule':
        panel.append(rule())
        break
      case 'box': {
        const area = box(row.text)
        if (row.carry) carrier = area
        panel.append(area)
        break
      }
      case 'verbs':
        panel.append(strip(...row.keys.map((key) => verb(key, press[key] ?? (() => {})))))
        break
    }
  }
}

function said(text: string): HTMLDivElement {
  const div = document.createElement('div')
  div.className = 'aside'
  div.textContent = text
  return div
}

function rule(): HTMLDivElement {
  const div = document.createElement('div')
  div.className = 'rule'
  return div
}

function box(text: string): HTMLTextAreaElement {
  const area = document.createElement('textarea')
  area.className = 'vault'
  area.value = text
  area.spellcheck = false
  area.rows = 4
  return area
}

function strip(...kids: readonly Node[]): HTMLDivElement {
  const div = document.createElement('div')
  div.className = 'strip'
  div.append(...kids)
  return div
}

/**
 * art. 90: a setting names a thing and shows its state; the tap is what
 * changes it. It is not a control under art. 66 — it is a label with a
 * state, which is why its words live in `NOTICES` and not in `VERBS`.
 */
function toggle(label: string, on: boolean, onClick: () => void): HTMLButtonElement {
  const el = document.createElement('button')
  el.className = `setting${on ? ' on' : ''}`
  el.setAttribute('aria-pressed', String(on))
  const name = document.createElement('span')
  name.textContent = label
  const state = document.createElement('b')
  state.textContent = (on ? NOTICES['setting.on'] : NOTICES['setting.off']) ?? ''
  el.append(name, state)
  el.onclick = onClick
  return el
}
