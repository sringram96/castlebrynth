// H102 · the wireframe skin, as data.
//
// Every colour, length and typeface the shell draws with lives here and only
// here, so H115 can re-skin the game by editing values in one file without
// touching a single layout decision. That is the whole contract: **the names
// are stable, the values are not.**
//
// The palette is lifted from the `:root` custom properties of
// `mock/slice-mvp.html` — the slice the human drew, which MVP.md ratifies as
// the specification. The names are the mock's own (`bg`, `panel`, `edge`,
// `text`, `dim`, `sel`, `bad`, `key`) rather than a parallel vocabulary
// invented here, so a change made on the mock has one obvious home.
//
// Data, not behaviour. No functions, no injection, no stylesheet: this module
// is a frozen record of strings that survives `JSON.stringify` unchanged, and
// the modules that draw (H104's scene, H105's panel) read values off it and
// set them. A shell that had to boot before its colours existed would make the
// theme a lifecycle instead of a lookup.
//
// Two things in the mock's `:root` deliberately did not come across:
//
//   --open   the vignette's aperture. `paintAll()` rewrites it every time
//            sanity moves, so it is state the shell computes, not a token the
//            skin sets (GAME.md #frame — "sanity is the vignette").
//   --bad    came across, because the wound colour is a fixed part of the
//            palette even though nothing in P1 draws a wound yet.

/** The palette. Any CSS colour string; the shell never parses one. */
const color = Object.freeze({
  /** The scene behind everything. */
  bg: '#191d20',
  /** The bottom panel, which sits darker than the scene it is under. */
  panel: '#101417',
  /** Every hairline border: object blocks, panel top, buttons, slots. */
  edge: '#2e363b',
  /** The quieter rule inside the panel, under the strip. */
  rule: '#1a2024',
  /** Prose and labels. */
  text: '#e6e1d6',
  /** Secondary text: captions, empty things, exits. */
  dim: '#96917f',
  /** Selection. The one thing on screen the thumb last chose. */
  sel: '#9db8a2',
  /** Harm — wounds, failed rolls, the hurt flash. */
  bad: '#c07a63',
  /** Key items (✦) and the things that open doors. */
  key: '#c8b06a',
  /** A tappable face in the panel: action buttons. */
  tap: '#1b2226',
  /** The same face, held down. */
  tapActive: '#252e34',
  /** An inventory slot. */
  slot: '#141a1e',
  /** An inventory slot with nothing in it. */
  slotEmpty: '#4a5257',
  /** The dashed wireframe tell on placeholder art, which H104 can toggle off
   *  and H115/H121 delete along with the blocks. */
  wire: 'rgba(230,225,214,.28)',
})

/** The spacing scale. Five steps; the mock's paddings all round to one. */
const space = Object.freeze({
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
})

/** Corner radii. */
const radius = Object.freeze({
  sm: '6px',
  md: '8px',
  lg: '10px',
})

/**
 * Type. The narrator is set in a serif italic and the interface is not — that
 * separation is the mock's, and it is what makes the writing read as writing
 * (GAME.md #frame, "top: the writing").
 */
const type = Object.freeze({
  /** The narrator line. */
  prose: 'Georgia, serif',
  /** Everything else. */
  ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  size: Object.freeze({
    /** Uppercase micro-labels: pane titles, section headings. */
    label: '10.5px',
    /** Selection name, slot contents. */
    micro: '11.5px',
    /** The strip, and the labels on scene blocks. */
    meta: '12px',
    /** The caption under a selection. */
    caption: '12.5px',
    /** Action buttons. */
    action: '13.5px',
    /** The narrator. */
    prose: '15.5px',
  }),
  /** Letter-spacing. The interface is tracked out; the prose is not. */
  track: Object.freeze({
    block: '.03em',
    action: '.07em',
    label: '.16em',
    title: '.2em',
  }),
  /** Line height, unitless. */
  leading: Object.freeze({
    prose: '1.45',
    ui: '1.3',
  }),
})

/**
 * Fixed layout. These are not skin: the panel is one height whatever pane is
 * showing, because a panel that resized would move the scene under the thumb
 * (H105), and `minTap` is LAWS.md #visible made into a number.
 */
const frame = Object.freeze({
  /** The bottom panel's height. Fixed, always present (GAME.md #frame). */
  panel: '230px',
  /** The narrator's reserved height, so a one-line turn does not jump. */
  narrator: '3.2em',
  /** The floor on any hit area (LAWS.md #visible — no pixel hunts). */
  minTap: '50px',
  /** Every border in the game is one of these. */
  hairline: '1px',
})

/** The whole skin. Frozen through: a token read twice reads the same. */
export const theme = Object.freeze({ color, space, radius, type, frame })

/** The shape of a skin, so H115 replaces values and not the contract. */
export type Theme = typeof theme
