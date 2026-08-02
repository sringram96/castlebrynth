// H105 · the bottom panel. Fixed height, always present (GAME.md #frame).
//
//   strip   permanent: where you are, and how much you are carrying
//   tabs    always visible: ACT · PACK · LOG · SET
//   ACT     the current selection and the taps it affords
//   PACK    what is in your hands
//   LOG     the journal, and the refused ledger under it
//   SET     the outline toggle
//
// **Nothing collapses.** The four panes are all mounted, all the time, and
// swapping between them hides one and shows another — the panel is one height
// whatever is showing, because a panel that resized would move the scene under
// the thumb mid-tap. That is why the height is set once from
// `theme.frame.panel` and never computed from content.
//
// It draws and it decides nothing (.llm/rules/layering.mdc). It reads a View,
// a GameState and the shell's own selection, and it hands taps back out
// through callbacks; it never calls `act`, never evaluates a gate, and never
// works out what an action would do. `render` is a total function of its
// model: hand it the same model twice and the panel reads the same twice.
//
// The tab row is deliberate and not a shortfall. GAME.md #frame v4.1 describes
// a left/right pager (◂ ACTIONS · SKILLS · ITEMS ▸) because that is the MVP
// end state; H120 is the amendment that gets there and it amends this card's
// tests rather than forking them. Four always-visible tabs is the rung this
// card stands on.
//
// The hooks are semantic on purpose. Every tab, pane and control carries a
// `data-testid` naming what the person sees — `tab-log`, `pane-log`,
// `action`, `toggle-outline` — because H100's slice acceptance drives this
// panel from outside, and H115's art pass will rewrite every colour and every
// class name underneath it. A test that addressed the skin would go red on a
// repaint that changed nothing about the game.

import type { ActionRef, View } from '../core/api-types'
import type { GameState } from '../core/types'
import { theme } from './theme'
import { label, selectedBlock } from './viewmap'

/** The panes, in tab order. */
export const PANES = ['act', 'pack', 'log', 'set'] as const

export type Pane = (typeof PANES)[number]

/**
 * Everything the panel draws from, and nothing it keeps.
 *
 * `selectedId` is the shell's memory handed in (same shape viewmap takes), and
 * `outline` is H104's wireframe switch: the scene owns the outlines, this pane
 * owns the control that asks for them to change. Which pane is showing is the
 * one thing the panel does remember — that is screen state, not world state,
 * and re-rendering must not throw the person out of the pane they opened.
 */
export interface PanelModel {
  readonly view: View
  readonly state: GameState
  readonly selectedId?: string | null
  readonly outline?: boolean
}

/** The taps the panel produces. It never acts on them itself. */
export interface PanelHandlers {
  /** An action button was pressed. H106 turns this into exactly one `act`. */
  readonly onAction?: (ref: ActionRef) => void
  /** The outline switch was flipped, to the value passed. */
  readonly onOutline?: (outline: boolean) => void
}

export interface Panel {
  /** The element to mount. Nothing is appended to the document from here. */
  readonly el: HTMLElement
  /** The pane currently showing. */
  readonly pane: Pane
  /** Show a pane. H106 calls `show('act')` when a selection is made. */
  show(pane: Pane): void
  /** Draw the model. Never mutates it, never remembers it. */
  render(model: PanelModel): void
}

/**
 * Build the panel. Constructing it touches nothing outside the element it
 * returns — no `document.body`, no listener on `window` — so importing this
 * module and calling this function is safe inside a test that has its own
 * screen to build (P1.md; the v3 shell learned that the expensive way).
 */
export function createPanel(handlers: PanelHandlers = {}): Panel {
  const root = element('section', 'panel')
  root.setAttribute('aria-label', 'panel')
  style(root, {
    height: theme.frame.panel,
    flex: '0 0 auto',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: theme.color.panel,
    borderTop: `${theme.frame.hairline} solid ${theme.color.edge}`,
    color: theme.color.text,
    fontFamily: theme.type.ui,
    lineHeight: theme.type.leading.ui,
  })

  // ── strip ────────────────────────────────────────────────────────────────
  // Permanent, above the tabs. Two facts in P1: where you are, and how much
  // you carry. HP · Might · Will · tithes · depth arrive with H204, which is
  // why this is a row of spans and not a single formatted line.
  const strip = element('div', 'panel-strip')
  style(strip, {
    display: 'flex',
    alignItems: 'center',
    gap: theme.space.lg,
    padding: `${theme.space.md} ${theme.space.lg}`,
    borderBottom: `${theme.frame.hairline} solid ${theme.color.rule}`,
    color: theme.color.dim,
    fontSize: theme.type.size.meta,
    flex: '0 0 auto',
  })

  const carried = element('span', 'panel-carried')
  const carriedCount = document.createElement('b')
  style(carriedCount, { color: theme.color.text, fontWeight: '600' })
  carried.append('carried ', carriedCount)

  const location = element('span', 'panel-location')
  style(location, {
    marginLeft: 'auto',
    textTransform: 'uppercase',
    letterSpacing: theme.type.track.label,
    fontSize: theme.type.size.label,
  })
  strip.append(carried, location)

  // ── tabs ─────────────────────────────────────────────────────────────────
  // Always visible, all four, whatever is showing. A tab that hid itself would
  // be a pane you could not get back to.
  const tabs = element('div', 'panel-tabs')
  tabs.setAttribute('role', 'tablist')
  style(tabs, {
    display: 'flex',
    gap: theme.space.sm,
    padding: `${theme.space.sm} ${theme.space.md} 0`,
    flex: '0 0 auto',
  })

  const tabFor = {} as Record<Pane, HTMLButtonElement>
  const paneFor = {} as Record<Pane, HTMLElement>

  for (const name of PANES) {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.dataset.testid = `tab-${name}`
    tab.dataset.pane = name
    tab.setAttribute('role', 'tab')
    // The accessible name is the word the person reads. Uppercase is the
    // skin's doing (`text-transform`), so a test asks for `log` and a thumb
    // still finds LOG.
    tab.textContent = name
    style(tab, {
      flex: '1 1 0',
      // LAWS.md #visible — no pixel hunts. The floor on a hit area is a number
      // in the theme, not a judgement made here.
      minHeight: theme.frame.minTap,
      cursor: 'pointer',
      textTransform: 'uppercase',
      letterSpacing: theme.type.track.label,
      fontSize: theme.type.size.label,
      fontFamily: 'inherit',
      background: theme.color.tap,
      border: `${theme.frame.hairline} solid ${theme.color.edge}`,
      borderRadius: theme.radius.sm,
    })
    tab.addEventListener('click', () => show(name))
    tabFor[name] = tab
    tabs.append(tab)
  }

  // ── body ─────────────────────────────────────────────────────────────────
  // One scroller holding all four panes. It takes the height the strip and the
  // tabs left over, so the panel's total is the theme's number and nothing
  // inside can change it.
  const body = element('div', 'panel-body')
  style(body, {
    flex: '1 1 auto',
    minHeight: '0',
    overflow: 'auto',
    padding: `${theme.space.md} ${theme.space.lg} ${theme.space.lg}`,
  })

  for (const name of PANES) {
    const pane = element('div', `pane-${name}`)
    pane.dataset.pane = name
    pane.setAttribute('role', 'tabpanel')
    pane.setAttribute('aria-label', name)
    paneFor[name] = pane
    body.append(pane)
  }

  // ACT · the selection, then its taps.
  const selectionName = element('div', 'act-selection')
  style(selectionName, {
    fontSize: theme.type.size.micro,
    letterSpacing: theme.type.track.label,
    textTransform: 'uppercase',
    color: theme.color.dim,
    marginBottom: theme.space.md,
  })
  const actions = element('div', 'act-actions')
  style(actions, { display: 'flex', flexWrap: 'wrap', gap: theme.space.md })
  paneFor.act.append(selectionName, actions)

  // PACK · what the hands hold. Slots, not a sentence.
  const pack = element('div', 'pack-items')
  style(pack, {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.space.md,
  })
  paneFor.pack.append(pack)

  // LOG · the journal, and the refused ledger *under* it. Order is the point:
  // what you did, then what turned you away — the refused ledger is the
  // compass (GAME.md #progress).
  const journal = element('ul', 'log-journal')
  const refused = element('ul', 'log-refused')
  paneFor.log.append(heading('journal'), list(journal), heading('refused'), list(refused))

  // SET · the outline toggle, and in P1 nothing else.
  const outlineToggle = document.createElement('button')
  outlineToggle.type = 'button'
  outlineToggle.dataset.testid = 'toggle-outline'
  outlineToggle.setAttribute('role', 'switch')
  style(outlineToggle, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space.md,
    width: '100%',
    minHeight: theme.frame.minTap,
    cursor: 'pointer',
    padding: `${theme.space.md} ${theme.space.lg}`,
    background: theme.color.tap,
    border: `${theme.frame.hairline} solid ${theme.color.edge}`,
    borderRadius: theme.radius.md,
    color: theme.color.text,
    fontFamily: 'inherit',
    fontSize: theme.type.size.action,
    letterSpacing: theme.type.track.block,
  })
  const outlineState = element('span', 'toggle-outline-state')
  style(outlineState, { color: theme.color.dim, fontSize: theme.type.size.micro })
  outlineToggle.append('wireframe outline', outlineState)
  paneFor.set.append(outlineToggle)

  root.append(strip, tabs, body)

  // ── behaviour ────────────────────────────────────────────────────────────

  let current: Pane = 'act'
  // The last model drawn, so a control that flips a value can hand the
  // opposite back out without the caller having to tell us what it was.
  let outlineOn = true

  function show(pane: Pane): void {
    current = pane
    for (const name of PANES) {
      const showing = name === pane
      paneFor[name].hidden = !showing
      paneFor[name].style.display = showing ? 'block' : 'none'
      tabFor[name].setAttribute('aria-selected', String(showing))
      tabFor[name].style.color = showing ? theme.color.text : theme.color.dim
      tabFor[name].style.borderColor = showing ? theme.color.sel : theme.color.edge
    }
  }

  outlineToggle.addEventListener('click', () => {
    handlers.onOutline?.(!outlineOn)
  })

  function render(model: PanelModel): void {
    const { view, state } = model
    outlineOn = model.outline ?? true

    // strip
    carriedCount.textContent = String(state.items.length)
    location.textContent = label(view.scene)

    // ACT — the selection, or the room when nothing is chosen (the mock's own
    // fallback). A selection that has left the scene shows the room again:
    // stale, not fatal (viewmap.selectedBlock says the same).
    const block = selectedBlock(view, model.selectedId)
    selectionName.textContent = block === null ? label(view.scene) : block.label
    actions.replaceChildren(
      ...(block === null
        ? []
        : block.actions.map((action) => actionButton(block.id, action, handlers))),
    )

    // PACK
    pack.replaceChildren(
      ...(state.items.length === 0
        ? [emptyNote('pack-empty', 'empty')]
        : state.items.map((item) => slot(item))),
    )

    // LOG — the journal verbatim, then the ledger. Both come off GameState and
    // nothing else on it is shown: `flags` is the engine's memory and not the
    // person's (the reserved `obj+:` / `obj-:` entries in particular are
    // bookkeeping), and `rng` and `seed` are the machine. The world remembers
    // being asked; the person need not see the works.
    journal.replaceChildren(
      ...(state.journal.length === 0
        ? [emptyEntry()]
        : state.journal.map((entry) => logEntry('log-journal-entry', entry))),
    )
    // The ledger keys are printed as the state holds them — `book.read`. They
    // are the world's own word for a door that turned you away, and softening
    // them here would make a screen that cannot be predicted from a save.
    refused.replaceChildren(
      ...(state.refused.length === 0
        ? [emptyEntry()]
        : state.refused.map((key) => logEntry('log-refused-entry', key))),
    )

    // SET
    outlineState.textContent = outlineOn ? 'on' : 'off'
    outlineToggle.setAttribute('aria-checked', String(outlineOn))
  }

  show(current)

  return {
    el: root,
    get pane() {
      return current
    },
    show,
    render,
  }
}

// ── the small pieces ───────────────────────────────────────────────────────

/**
 * One action, as a button.
 *
 * `action` is passed through verbatim, because it is half of an `ActionRef`
 * and a prettified one is a tap that resolves to nothing (viewmap.ts). The
 * object and the action ride on data attributes as well as in the closure, so
 * H106 can find a pressed button in the DOM without a second source of truth.
 */
function actionButton(object: string, action: string, handlers: PanelHandlers): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.testid = 'action'
  button.dataset.object = object
  button.dataset.action = action
  button.textContent = action
  style(button, {
    minHeight: theme.frame.minTap,
    cursor: 'pointer',
    padding: `${theme.space.lg} ${theme.space.xl}`,
    background: theme.color.tap,
    border: `${theme.frame.hairline} solid ${theme.color.edge}`,
    borderRadius: theme.radius.md,
    color: theme.color.text,
    fontFamily: 'inherit',
    fontSize: theme.type.size.action,
    letterSpacing: theme.type.track.action,
    textTransform: 'uppercase',
  })
  button.addEventListener('click', () => {
    handlers.onAction?.({ object, action })
  })
  return button
}

function slot(item: string): HTMLElement {
  const cell = element('div', 'pack-item')
  cell.textContent = label(item)
  style(cell, {
    minHeight: theme.frame.minTap,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: theme.space.sm,
    background: theme.color.slot,
    border: `${theme.frame.hairline} solid ${theme.color.edge}`,
    borderRadius: theme.radius.md,
    fontSize: theme.type.size.micro,
  })
  return cell
}

function emptyNote(testid: string, text: string): HTMLElement {
  const note = element('div', testid)
  note.textContent = text
  style(note, { color: theme.color.slotEmpty, fontSize: theme.type.size.micro })
  return note
}

function heading(text: string): HTMLElement {
  const node = document.createElement('div')
  node.textContent = text
  style(node, {
    fontSize: theme.type.size.label,
    letterSpacing: theme.type.track.label,
    textTransform: 'uppercase',
    color: theme.color.dim,
    margin: `${theme.space.sm} 0 ${theme.space.xs}`,
  })
  return node
}

function list(ul: HTMLElement): HTMLElement {
  style(ul, {
    listStyle: 'none',
    margin: '0',
    padding: '0',
    fontSize: theme.type.size.caption,
  })
  return ul
}

function logEntry(testid: string, text: string): HTMLElement {
  const entry = element('li', testid)
  entry.textContent = text
  style(entry, { margin: `0 0 ${theme.space.xs}` })
  return entry
}

/** A ledger with nothing in it yet reads as silence, not as a bug. */
function emptyEntry(): HTMLElement {
  const entry = element('li', 'log-empty')
  entry.textContent = '—'
  style(entry, { color: theme.color.dim })
  return entry
}

function element(tag: string, testid: string): HTMLElement {
  const node = document.createElement(tag)
  node.dataset.testid = testid
  return node
}

/** Inline style from tokens. The theme is data; this is the only place it lands. */
function style(node: HTMLElement, declarations: Record<string, string>): void {
  Object.assign(node.style, declarations)
}
