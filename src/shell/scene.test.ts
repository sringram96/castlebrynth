// H104 acceptance · the stage draws the room, and a tap costs nothing.
//
// Two laws are on trial in this file and everything else is bookkeeping:
//
//   the first tap is free (GAME.md #input) — a tap calls back and does nothing
//   else. No dispatch, no repaint, no self-selection, no change to the View.
//   affordance permanence (LAWS.md #affordance) — every object in view is a
//   block, actions or none, for as long as it is in view.
//
// The View handed in is deep-frozen the way the engine's acceptance freezes
// engine inputs: a renderer that wrote through its argument fails here rather
// than as a stale screen three cards later.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { View } from '../core/api-types'
import { createScene } from './scene'
import { theme } from './theme'

// Not `new URL(...)`: these tests run under happy-dom (H101's
// environmentMatchGlobs), whose global URL is its own, and node's fs rejects
// it. fileURLToPath is the one spelling that survives both environments.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'scene.ts'), 'utf8')

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const crossing: View = deepFreeze({
  enter: 'You wake at the dead glass.',
  line: 'A dead portal. Stone so close you can hear it.',
  scene: 'crossing',
  objects: [
    { id: 'dead-portal', actions: ['press your eye'] },
    { id: 'still-traveler', actions: ['search'] },
    // Nothing to do with it, and it is on the wall anyway. Still a block.
    { id: 'the_far_wall', actions: [] },
    { id: 'stair-down', actions: ['go'] },
  ],
})

/** The same room after a delta took a thing out of it. */
const searched: View = deepFreeze({
  line: 'A dead portal. Stone so close you can hear it.',
  scene: 'crossing',
  objects: [
    { id: 'dead-portal', actions: ['press your eye'] },
    { id: 'stair-down', actions: ['go'] },
  ],
})

/** What `getView` hands back for a scene the bundle has not got. */
const nowhere: View = deepFreeze({ line: '', scene: 'elsewhere', objects: [] })

function stage(onSelect: (id: string) => void = () => {}) {
  const scene = createScene({ onSelect })
  document.body.replaceChildren(scene.el)
  return scene
}

const drawn = (scene: { el: HTMLElement }): HTMLElement[] =>
  Array.from(scene.el.querySelectorAll<HTMLElement>('[data-object]'))

const ids = (scene: { el: HTMLElement }): (string | undefined)[] =>
  drawn(scene).map((node) => node.dataset.object)

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('the module is inert until asked', () => {
  it('draws nothing on import — only main.ts may have a side effect', async () => {
    // H101's boundary, restated where it can break: importing this file must
    // leave the page exactly as it found it. Reset the registry first, because
    // an ES module already evaluated draws nothing on a second import whether
    // it is inert or not.
    document.body.innerHTML = '<div id="elsewhere">untouched</div>'
    vi.resetModules()

    await import('./scene')

    expect(document.body.innerHTML).toBe('<div id="elsewhere">untouched</div>')
  })

  it('makes a stage, and the stage starts empty', () => {
    const scene = createScene({ onSelect: () => {} })
    expect(scene.el.children.length).toBe(0)
    expect(document.body.contains(scene.el)).toBe(false)
  })
})

describe('objects render 1:1 with the View', () => {
  it('is one block per object, in view order', () => {
    const scene = stage()
    scene.render(crossing)

    expect(ids(scene)).toEqual(['dead-portal', 'still-traveler', 'the_far_wall', 'stair-down'])
    expect(drawn(scene).map((node) => node.textContent)).toEqual([
      'dead portal',
      'still traveler',
      'the far wall',
      'stair down',
    ])
  })

  it('gives a block to an object with no actions (affordance permanence)', () => {
    // LAWS.md #affordance — tappability is constant for a thing's lifetime on
    // screen, so a shell may not quietly drop the ones with nothing to do.
    const scene = stage()
    scene.render(crossing)

    const wall = drawn(scene).find((node) => node.dataset.object === 'the_far_wall')
    expect(wall).toBeDefined()
    expect(wall?.tagName).toBe('BUTTON')
    expect(wall?.hasAttribute('disabled')).toBe(false)
  })

  it('is every block a real button, so a thumb and a keyboard both reach it', () => {
    const scene = stage()
    scene.render(crossing)

    for (const node of drawn(scene)) {
      expect(node.tagName).toBe('BUTTON')
      expect(node.getAttribute('type')).toBe('button')
      expect(node.hasAttribute('disabled')).toBe(false)
    }
  })

  it('follows the View when the world adds and removes', () => {
    const scene = stage()
    scene.render(crossing)
    scene.render(searched)
    expect(ids(scene)).toEqual(['dead-portal', 'stair-down'])

    scene.render(crossing)
    expect(ids(scene)).toEqual(['dead-portal', 'still-traveler', 'the_far_wall', 'stair-down'])
  })

  it('has nothing to draw in an empty scene, and says nothing about it', () => {
    const scene = stage()
    scene.render(crossing)
    scene.render(nowhere)

    expect(scene.el.children.length).toBe(0)
    expect(scene.el.textContent).toBe('')
  })

  it('replaces rather than stacks — the stage is a screen, not a log', () => {
    const scene = stage()
    scene.render(crossing)
    scene.render(crossing)
    scene.render(crossing)

    expect(drawn(scene).length).toBe(crossing.objects.length)
  })

  it('draws the same twice: same view, same selection, same stage', () => {
    const a = stage()
    const b = stage()
    a.render(crossing, 'still-traveler')
    b.render(crossing, 'still-traveler')
    expect(a.el.innerHTML).toBe(b.el.innerHTML)

    const once = a.el.innerHTML
    a.render(crossing, 'still-traveler')
    expect(a.el.innerHTML).toBe(once)
  })

  it('never writes through the View', () => {
    const before = JSON.stringify(crossing)
    const scene = stage()
    scene.render(crossing, 'dead-portal')
    scene.setOutlines(false)
    scene.render(crossing)
    expect(JSON.stringify(crossing)).toBe(before)
  })
})

describe('the first tap is free', () => {
  it('fires the selection callback once, with the id and nothing else', () => {
    const onSelect = vi.fn()
    const scene = stage(onSelect)
    scene.render(crossing)

    drawn(scene)[1]?.click()

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('still-traveler')
  })

  it('fires with the id, never with the printed label', () => {
    // `act` is called with the id (src/core/api-types.ts). A prettified one is
    // a tap that resolves to nothing.
    const onSelect = vi.fn()
    const scene = stage(onSelect)
    scene.render(crossing)

    drawn(scene)[2]?.click()

    expect(onSelect).toHaveBeenCalledWith('the_far_wall')
    expect(onSelect).not.toHaveBeenCalledWith('the far wall')
  })

  it('changes nothing on screen by itself — selection is not the stage’s to decide', () => {
    // GAME.md #input: the tap describes and selects, and the run owns what is
    // selected. The highlight arrives on the next render, handed back in.
    const scene = stage()
    scene.render(crossing)
    const before = scene.el.innerHTML

    drawn(scene)[0]?.click()

    expect(scene.el.innerHTML).toBe(before)
    expect(drawn(scene).filter((node) => node.className.includes('sel')).length).toBe(0)
  })

  it('taps an actionless object as freely as any other', () => {
    const onSelect = vi.fn()
    const scene = stage(onSelect)
    scene.render(crossing)

    drawn(scene)
      .find((node) => node.dataset.object === 'the_far_wall')
      ?.click()

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('the_far_wall')
  })

  it('fires once per tap, however many redraws stand behind it', () => {
    // A listener left on a replaced node would double a later gesture, and a
    // doubled gesture is a turn the person did not spend (H106).
    const onSelect = vi.fn()
    const scene = stage(onSelect)
    scene.render(crossing)
    scene.render(crossing, 'dead-portal')
    scene.render(crossing)

    drawn(scene)[0]?.click()

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('dispatches no act: the stage cannot reach the engine to try', () => {
    // .llm/rules/layering.mdc — the shell draws and hands taps back. Types
    // only from src/core, and no `act` in sight.
    expect(SOURCE).not.toMatch(/from '\.\.\/core\/(?!api-types')/)
    expect(SOURCE).not.toMatch(/^\s*import\s+(?!type\s|\{\s*theme|\{\s*blocks)/m)
    expect(SOURCE).not.toMatch(/\bact\s*\(/)
    expect(SOURCE).not.toMatch(/\bnewRun\b|\bgetView\s*\(/)
  })
})

describe('the selection highlight', () => {
  it('marks exactly the selected block', () => {
    const scene = stage()
    scene.render(crossing, 'still-traveler')

    const selected = drawn(scene).filter((node) => node.className.includes('sel'))
    expect(selected.map((node) => node.dataset.object)).toEqual(['still-traveler'])
    expect(selected[0]?.style.borderColor).toBe(theme.color.sel)
    expect(selected[0]?.style.boxShadow).toContain(theme.color.sel)
  })

  it('marks nothing when nothing is selected, or when the selection has left', () => {
    const scene = stage()
    scene.render(crossing)
    expect(drawn(scene).some((node) => node.className.includes('sel'))).toBe(false)

    scene.render(crossing, null)
    expect(drawn(scene).some((node) => node.className.includes('sel'))).toBe(false)

    // A thing a delta removed leaves a stale selection, not an error.
    scene.render(searched, 'still-traveler')
    expect(drawn(scene).some((node) => node.className.includes('sel'))).toBe(false)
  })

  it('moves with the selection it is handed, and leaves the block otherwise alone', () => {
    const scene = stage()
    scene.render(crossing, 'dead-portal')
    scene.render(crossing, 'stair-down')

    expect(
      drawn(scene)
        .filter((node) => node.className.includes('sel'))
        .map((node) => node.dataset.object),
    ).toEqual(['stair-down'])
    // Unselected blocks keep the plain edge, not the leftover ring.
    const portal = drawn(scene)[0]
    expect(portal?.style.borderColor).not.toBe(theme.color.sel)
    expect(portal?.style.boxShadow).toBe('')
  })
})

describe('the wireframe, and its switch', () => {
  it('draws the placeholder dashes by default', () => {
    const scene = stage()
    scene.render(crossing)
    for (const node of drawn(scene)) expect(node.style.outlineStyle).toBe('dashed')
  })

  it('turns them off on the blocks already drawn, and keeps them off after', () => {
    const scene = stage()
    scene.render(crossing)
    scene.setOutlines(false)
    for (const node of drawn(scene)) expect(node.style.outlineStyle).toBe('none')

    // A redraw must not switch them back on under the person who turned them off.
    scene.render(crossing, 'dead-portal')
    for (const node of drawn(scene)) expect(node.style.outlineStyle).toBe('none')

    scene.setOutlines(true)
    for (const node of drawn(scene)) expect(node.style.outlineStyle).toBe('dashed')
  })

  it('changes nothing else about a block', () => {
    const scene = stage()
    scene.render(crossing, 'stair-down')
    const before = drawn(scene).map((node) => node.className + '|' + node.dataset.object)

    scene.setOutlines(false)

    expect(drawn(scene).map((node) => node.className + '|' + node.dataset.object)).toEqual(before)
    expect(ids(scene)).toEqual(['dead-portal', 'still-traveler', 'the_far_wall', 'stair-down'])
  })

  it('is a switch and not a state the tap can flip', () => {
    const onSelect = vi.fn()
    const scene = stage(onSelect)
    scene.render(crossing)
    scene.setOutlines(false)

    drawn(scene)[0]?.click()

    for (const node of drawn(scene)) expect(node.style.outlineStyle).toBe('none')
  })
})

describe('it draws with H102’s tokens and no others', () => {
  it('sizes every block at the hit-area floor (LAWS.md #visible)', () => {
    const scene = stage()
    scene.render(crossing)
    for (const node of drawn(scene)) {
      expect(node.style.minHeight).toBe(theme.frame.minTap)
      expect(node.style.minWidth).toBe(theme.frame.minTap)
    }
  })

  it('spells no colour and no length of its own', () => {
    // H115 re-skins by editing theme.ts. A hex or a stray px here is a value
    // that card's scope cannot reach.
    expect(SOURCE).not.toMatch(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/)
    expect(SOURCE).not.toMatch(/rgba?\(/)
    expect(SOURCE.replace(/^.*\/\/.*$/gm, '')).not.toMatch(/\d+(px|em|rem)\b/)
  })

  it('lays the blocks absolutely on a relative stage, ready for H121’s hotspots', () => {
    const scene = stage()
    scene.render(crossing)

    expect(scene.el.style.position).toBe('relative')
    for (const node of drawn(scene)) {
      expect(node.style.position).toBe('absolute')
      expect(node.style.left).not.toBe('')
      expect(node.style.top).not.toBe('')
      expect(node.style.boxSizing).toBe('border-box')
    }
  })

  it('places a block per object without two landing in the same place', () => {
    const scene = stage()
    scene.render(crossing)
    const places = drawn(scene).map((node) => `${node.style.left} ${node.style.top}`)
    expect(new Set(places).size).toBe(places.length)
  })

  it('lays one object out as happily as seven', () => {
    const scene = stage()
    for (const count of [1, 2, 5, 7]) {
      const many: View = deepFreeze({
        line: 'many',
        scene: 'gate',
        objects: Array.from({ length: count }, (_, i) => ({ id: `sigil-${i}`, actions: [] })),
      })
      scene.render(many)
      expect(drawn(scene).length).toBe(count)
      const places = drawn(scene).map((node) => `${node.style.left} ${node.style.top}`)
      expect(new Set(places).size).toBe(count)
    }
  })
})
