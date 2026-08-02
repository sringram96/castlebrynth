// H104 · the stage. Everything `getView` put in the room, as blocks you can hit.
//
// This is the middle third of GAME.md #frame: the narrator above (H103), the
// panel below (H105), and between them a full-bleed still. There is no still
// yet — H115 paints one and H121 lays authored hotspots over it — so what
// stands in for it is the wireframe the mock draws: a bordered block per
// object, dashed on the outside so nobody mistakes a placeholder for art.
// `mock/slice-mvp.html` is the specification (MVP.md), and `.obj` / `.obj.sel`
// are its class names, kept verbatim so the art pass has something to grip.
//
// **The first tap is free** (GAME.md #input). A tap here calls `onSelect` and
// stops. It does not call `act`, it does not decide the block is now the
// selected one, it does not even repaint. Selection is state the run owns; the
// scene learns of it the same way it learns everything else — handed back on
// the next `render`. That is why this module imports no engine function and
// keeps no memory of what was tapped: a shell that selected on its own would
// be the second place a tap means something (.llm/rules/layering.mdc).
//
// **Affordance permanence** (LAWS.md #affordance): every object in view gets a
// button, actions or none. `viewmap.blocks` already refuses to filter and this
// refuses to skip, because a block that stopped being tappable while it was
// still visibly there is exactly the thing the law forbids. "It's a door." is
// a complete answer, and the answer arrives in the panel.
//
// Renders state, computes nothing, never mutates: `render` is a total function
// of (view, selectedId) onto the DOM — same arguments, same stage, however
// many times it is called.

import { theme } from './theme'
import { blocks } from './viewmap'
import type { View } from '../core/api-types'

/** What the stage needs from whoever owns the run. */
export interface SceneOptions {
  /**
   * A bare tap on an object, by id — the free tap, and the whole of what a
   * tap does here. H106 wires this to selection and the ACT pane; nothing
   * wires it to `act`.
   */
  readonly onSelect: (id: string) => void
}

/** The stage, and the two things that may be said to it. */
export interface SceneRenderer {
  /**
   * The stage element, created and owned here. The caller places it; H107
   * puts it between the narrator and the panel.
   */
  readonly el: HTMLElement
  /**
   * Draw a view. One block per object in view order, the block whose id is
   * `selectedId` highlighted, everything else replaced.
   */
  render(view: View, selectedId?: string | null): void
  /**
   * The wireframe tell, on or off — H105's SET pane owns the switch. It is a
   * placeholder's apology, not a layout decision, so it can be turned off to
   * see the shape of the screen without it, and H115/H121 delete it along
   * with the blocks.
   */
  setOutlines(on: boolean): void
}

/**
 * Where a block sits, as CSS, derived from nothing but its place in the view.
 *
 * The mock has a hand-authored `POS` table — a rectangle per object id — and
 * that table is *content*: it knows where the font stands in the crossing. A
 * shell may not (.llm/rules/layering.mdc), and the View carries no geometry to
 * read instead, so until H121 lets authors place hotspots the blocks are laid
 * on a derived grid: as square as the count allows, in view order, gutter from
 * the spacing scale.
 *
 * Absolute over a relative stage, like the mock, so H121 changes where the
 * numbers come from and not how a block is placed.
 */
function cell(index: number, count: number): Record<'left' | 'top' | 'width' | 'height', string> {
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
  const rows = Math.max(1, Math.ceil(count / columns))
  const column = index % columns
  const row = Math.floor(index / columns)
  const wide = 100 / columns
  const tall = 100 / rows
  const gap = theme.space.md
  // Rounded so the stylesheet a browser sees is short and the same every time.
  const pct = (n: number): string => `${Math.round(n * 1e4) / 1e4}%`
  // `calc` keeps the token an opaque string: the shell never does arithmetic
  // on a theme value, it hands both to CSS and lets CSS add them.
  return {
    left: `calc(${pct(column * wide)} + ${gap})`,
    top: `calc(${pct(row * tall)} + ${gap})`,
    width: `calc(${pct(wide)} - ${gap} - ${gap})`,
    height: `calc(${pct(tall)} - ${gap} - ${gap})`,
  }
}

/** The wireframe dashes, applied or cleared. Nothing else changes with it. */
function outline(block: HTMLElement, on: boolean): void {
  block.style.outlineStyle = on ? 'dashed' : 'none'
  block.style.outlineWidth = theme.frame.hairline
  block.style.outlineColor = theme.color.wire
  // The mock offsets by 2px; xs is the nearest thing on the scale, and a
  // magic number in a drawing module is the one thing H102 exists to prevent.
  block.style.outlineOffset = theme.space.xs
}

/**
 * A stage, and the callback that is the only way anything leaves it.
 *
 * Nothing fires on import — the document is touched here and in `render`, and
 * only when someone asks (H101 keeps that boundary: `main.ts` is the one
 * module in src/shell allowed a side effect on import).
 */
export function createScene(options: SceneOptions): SceneRenderer {
  const el = document.createElement('div')
  el.id = 'stage'
  el.style.position = 'relative'
  el.style.flex = '1'
  // Without this a flex child refuses to shrink and the panel is pushed off
  // the bottom of the phone. The mock carries the same line for the same reason.
  el.style.minHeight = '0'
  el.style.overflow = 'hidden'
  el.style.background = theme.color.bg

  // The one piece of state in the module, and it is about the placeholder
  // rather than about the run: which way the dashes are set. Held so a redraw
  // does not silently switch them back on under the person who turned them off.
  let outlines = true

  function draw(view: View, selectedId?: string | null): HTMLElement[] {
    const drawn = blocks(view, selectedId)
    return drawn.map((block, index) => {
      // A real button: the phone gives it a tap target, the keyboard gives it
      // focus and Enter, and H106's fallback needs neither invented.
      const node = document.createElement('button')
      node.type = 'button'
      node.className = block.selected ? 'obj sel' : 'obj'
      // The id on the element, because the tap that matters is read off the
      // DOM by H106 (and by a test), and `label` is cosmetic — `act` is called
      // with this and never with what is printed (src/shell/viewmap.ts).
      node.dataset.object = block.id
      node.textContent = block.label

      const box = cell(index, drawn.length)
      node.style.position = 'absolute'
      node.style.left = box.left
      node.style.top = box.top
      node.style.width = box.width
      node.style.height = box.height
      node.style.boxSizing = 'border-box'
      node.style.minWidth = theme.frame.minTap
      node.style.minHeight = theme.frame.minTap
      node.style.display = 'flex'
      node.style.alignItems = 'flex-end'
      node.style.justifyContent = 'center'
      node.style.padding = theme.space.sm
      node.style.background = 'transparent'
      node.style.border = `${theme.frame.hairline} solid ${theme.color.edge}`
      node.style.borderRadius = theme.radius.md
      node.style.color = theme.color.text
      node.style.fontFamily = theme.type.ui
      node.style.fontSize = theme.type.size.meta
      node.style.letterSpacing = theme.type.track.block
      node.style.lineHeight = theme.type.leading.ui
      node.style.cursor = 'pointer'
      if (block.selected) {
        // The one thing on screen the thumb last chose (theme.color.sel). The
        // ring is the mock's: a border colour alone is invisible at arm's length.
        node.style.borderColor = theme.color.sel
        node.style.boxShadow = `0 0 0 ${theme.frame.hairline} ${theme.color.sel}`
      }
      outline(node, outlines)

      // The free tap, entire. One callback, no dispatch, no repaint, no cost.
      node.addEventListener('click', () => options.onSelect(block.id))
      return node
    })
  }

  return {
    el,
    render(view, selectedId) {
      // Replace rather than append: the stage is a screen, and a screen that
      // accumulated would be a log. Every tap is a full redraw (P1.md).
      el.replaceChildren(...draw(view, selectedId))
    },
    setOutlines(on) {
      outlines = on
      for (const node of Array.from(el.children)) {
        if (node instanceof HTMLElement) outline(node, on)
      }
    },
  }
}
