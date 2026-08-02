// H106 · the gesture layer. Two taps, and only the second one costs.
//
// GAME.md #input, and it is bedrock: **the first tap is free, always.** Tapping
// a thing describes it, selects it, and surfaces what it affords. It never
// advances the world, never costs, never harms. The turn is the *second*
// gesture — a press on a named action — and that is the only gesture in this
// module that reaches `act`.
//
// So the whole card is one sentence: **exactly one dispatch per gesture.** Not
// zero — a press that did nothing would be a control that lies about being a
// control. And never two — a double-fired `act` spends a turn the person did
// not spend, and there are no takebacks (LAWS.md #dice).
//
// The way "never two" is kept here is structural rather than defensive: **this
// module adds no listener to any element.** The stage owns its blocks' clicks
// (H104) and the panel owns its buttons' (H105); each hands one callback out,
// and this is where those two callbacks land. There is exactly one path from a
// finger to `act`, so there is nothing to debounce and nothing to de-duplicate.
// The one listener this module does attach is the keyboard's, on a target the
// caller names, and it can be taken back off again.
//
// It decides nothing about the world (.llm/rules/layering.mdc). A press is
// passed to `dispatch` **verbatim and unconditionally** — this module does not
// check that the object is in view or that it affords the action, because
// that judgement is the engine's and a second copy of it here would be a rule
// living in the shell. `act` answers a stale tap with no effects and the same
// state (src/core/api.ts); a shell that pre-empted that would be the one
// deciding what is offered.
//
// The one thing it does remember is the selection — which is screen state and
// not world state, the same way the pane on show is (H105).

import type { ActionRef, View } from '../core/api-types'
import type { Pane } from './panel'
import { blocks, selectedBlock } from './viewmap'

/**
 * What the gesture layer needs from whoever owns the run — H107, and in a test
 * whatever stands in for it. Four, all required, all used.
 */
export interface InputPorts {
  /**
   * The moment as it stands, read fresh at the instant of every gesture and
   * never cached. A keyboard press has to know what is on offer *now*, and the
   * view after a turn is not the view before it.
   */
  readonly view: () => View
  /**
   * Spend the turn. Called exactly once per press, and from nowhere else in
   * this module — no bare tap, no selection, no key that resolved to nothing
   * ever reaches it.
   */
  readonly dispatch: (ref: ActionRef) => void
  /**
   * Flip the panel to a pane. Called with `'act'` the instant a selection is
   * made: "selecting anything in the scene snaps the pager to ACTIONS"
   * (GAME.md #frame), which is the mock's `select()` setting `S.pane=0`.
   */
  readonly show: (pane: Pane) => void
  /**
   * The selection moved and the world did not — redraw with this id. It is
   * handed out rather than read back off `selectedId` so that the caller
   * cannot redraw with a selection this module has already dropped.
   */
  readonly redraw: (selectedId: string | null) => void
}

/**
 * The gestures, as functions. `select` and `press` are shaped to be handed
 * straight to `createScene({ onSelect })` and `createPanel({ onAction })` —
 * no adapter, because an adapter is a second place a tap could be counted.
 */
export interface Input {
  /** The thing the thumb last chose, or null. Hand to `render`. */
  readonly selectedId: string | null
  /**
   * The free tap. Selects, snaps the panel to ACT, and dispatches **nothing**.
   */
  readonly select: (id: string) => void
  /** The press. One `dispatch`, always, whatever the ref. */
  readonly press: (ref: ActionRef) => void
  /**
   * Attach the keyboard fallback. Returns the detach — H107's `dispose` calls
   * it, and a shell that left a listener on the document would go on playing
   * a run that had been torn down.
   */
  readonly listen: (target: EventTarget) => () => void
}

/**
 * Build the gesture layer. Constructing it touches no document and attaches
 * nothing — `listen` is the one side effect and it is asked for by name
 * (H101: `main.ts` is the only module in src/shell allowed a side effect on
 * import).
 */
export function createInput(ports: InputPorts): Input {
  // The whole of this module's memory. Screen state, not world state: it is
  // not in `GameState`, it does not survive a save, and nothing in the world
  // can be reached by changing it.
  let chosen: string | null = null

  /** The free tap, entire (GAME.md #input). No dispatch, at any price. */
  function select(id: string): void {
    chosen = id
    ports.show('act')
    ports.redraw(id)
  }

  /**
   * The turn. One dispatch, unconditional, then the selection settles.
   *
   * `from` is read before the dispatch because settling needs to know whether
   * the world moved under the selection, and after the dispatch it is too late
   * to ask where it was.
   */
  function press(ref: ActionRef): void {
    const from = ports.view().scene
    ports.dispatch(ref)
    settle(from)
  }

  /**
   * Keep the highlight honest after a turn.
   *
   * The mock does this in two places and both are here: `go()` drops the
   * selection on a room change, and `resel()` drops it when the chosen thing
   * is no longer in the room. Without the first, arriving somewhere new whose
   * object happens to share an id with the last one would draw a ring around
   * something the person never touched; without the second, a `removeObject`
   * would leave the ACT pane offering taps on a thing that is gone.
   *
   * The caller has already redrawn by the time this runs — `dispatch` renders
   * the new state — so dropping the selection redraws a second time. Both
   * happen inside one synchronous gesture, so nothing is ever painted with the
   * stale ring on it.
   */
  function settle(from: string): void {
    if (chosen === null) return
    const view = ports.view()
    if (view.scene === from && view.objects.some((object) => object.id === chosen)) return
    chosen = null
    ports.redraw(null)
  }

  /** Back out to the room. The keyboard's way of tapping nothing. */
  function clear(): void {
    if (chosen === null) return
    chosen = null
    ports.redraw(null)
  }

  /**
   * The keyboard fallback — for the terminal-shaped among us, and for tests
   * that would rather not synthesise touch. It is the same two-step gesture
   * and never a shortcut past it:
   *
   *   **1-9 with nothing chosen** — choose the nth thing in the room. Free,
   *   like the tap it stands for.
   *   **1-9 with something chosen** — press its nth action. One turn.
   *   **Enter** — press the chosen thing's first action.
   *   **Escape** — let it go, and the digits address the room again. Without
   *   it the keyboard could choose one object per scene and never another,
   *   which is a fallback that does not fall back.
   *
   * A key that resolves to nothing on offer is left alone: not handled, not
   * prevented, no dispatch. That is not the "a press that does nothing is a
   * bug" case — nothing was pressed. The bug would be inventing a turn for a
   * number nobody is showing.
   */
  function onKeyDown(event: Event): void {
    const key = keyboard(event)
    if (key === null || key.defaultPrevented) return
    // A held key auto-repeats. One gesture is one turn, so the repeats are not
    // gestures — a leant-on Enter must not spend the room.
    if (key.repeat) return
    // Ctrl/Cmd/Alt belong to the browser and the operating system. Cmd-1 is a
    // tab, not the first object in the room.
    if (key.altKey || key.ctrlKey || key.metaKey) return

    if (key.key === 'Escape') {
      if (chosen === null) return
      key.preventDefault()
      clear()
      return
    }

    if (key.key === 'Enter') {
      // The controls in this shell are real `<button>`s (H104, H105), and a
      // focused button turns Enter into a click by itself — which arrives here
      // as `press` through the panel's own callback. Handling it a second time
      // from the bubbled keydown is exactly the double-fired `act` this card
      // exists to prevent, so when the key is already the control's, we stand
      // down. (The day a text field arrives — `act`'s `input` half — it will
      // need the digits to stand down too. That is that card's business, and
      // there is no field in the shell today to guess at.)
      if (activates(key.target)) return
      const block = selectedBlock(ports.view(), chosen)
      const action = block?.actions[0]
      if (block === null || action === undefined) return
      key.preventDefault()
      press({ object: block.id, action })
      return
    }

    const nth = digit(key.key)
    if (nth === null) return
    const view = ports.view()
    // `selectedBlock` is null when nothing is chosen *and* when the chosen
    // thing has left the view (H102), so a stale selection falls back to
    // addressing the room rather than to a dead numbering.
    const block = selectedBlock(view, chosen)

    if (block === null) {
      const target = blocks(view)[nth - 1]
      if (target === undefined) return
      key.preventDefault()
      select(target.id)
      return
    }

    const action = block.actions[nth - 1]
    if (action === undefined) return
    key.preventDefault()
    press({ object: block.id, action })
  }

  return {
    get selectedId() {
      return chosen
    },
    select,
    press,
    listen(target) {
      target.addEventListener('keydown', onKeyDown)
      return () => target.removeEventListener('keydown', onKeyDown)
    },
  }
}

// ── the small pieces ───────────────────────────────────────────────────────

/**
 * The event as a key press, or null.
 *
 * Structural rather than `instanceof KeyboardEvent`: the shell's tests run
 * under happy-dom, whose constructors are its own and not node's, and a check
 * against the wrong realm's global is a check that silently never passes.
 */
function keyboard(event: Event): KeyboardEvent | null {
  return 'key' in event ? (event as KeyboardEvent) : null
}

/** `'3'` → 3. Anything else, including `'0'` and `'e'`, is not ours. */
function digit(key: string): number | null {
  return /^[1-9]$/.test(key) ? Number(key) : null
}

/** Does this element turn Enter into a click on its own? */
function activates(target: EventTarget | null): boolean {
  return (
    target !== null &&
    typeof (target as Partial<Element>).tagName === 'string' &&
    (target as Element).tagName.toUpperCase() === 'BUTTON'
  )
}
