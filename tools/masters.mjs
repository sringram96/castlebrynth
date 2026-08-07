/**
 * The authored plate masters (art. 121).
 *
 * These are **the first slice, not the art**. They exist to prove the
 * pipeline end to end — authored pixels here, a deterministic PNG in
 * `public/assets/visual`, a typed entry in `src/content/visual`, a placement
 * in a scene, a composited frame on a phone — and they are deliberately few.
 * `DESIGN.md` lists what still has to be drawn to reach the density of
 * `reference/visual/canonical-screen.png`; a clean socket is worth more than
 * thirty temporary assets, and thirty temporary assets are what a wave like
 * this usually leaves behind.
 *
 * Every master is authored on a **palette of the school it belongs to**, and
 * the characters index that palette. `.` and space are nothing — they become
 * a fully transparent pixel, which is the only kind of transparency there is
 * (art. 17: binary alpha, enforced by the encoder).
 */

/**
 * The ossuary's key: cold bone against cold stone, lit close (art. 114 — the
 * ossuary's station is `with`, so the light goes no further than you do).
 * The nine stone steps are `src/content/palettes.ts`'s CHALK, extended down
 * into the darks a plate needs and up into the bone it is made of.
 */
export const OSSUARY = {
  0: '#070605',
  1: '#131108',
  2: '#221f18',
  3: '#332f26',
  4: '#464133',
  5: '#5d5744',
  6: '#7b7359',
  7: '#9c9478',
  8: '#c0b9a4',
  9: '#ded7c2',
  // Metal: the chains, the pins, the rings (art. 100's `+`, in a plate's key).
  i: '#15150f',
  j: '#2b2a21',
  k: '#454235',
  // What a light that carries burns as (art. 100's `*`).
  a: '#3d1f0c',
  b: '#7d4212',
  c: '#c9871f',
  d: '#f2d485',
  e: '#fff8dc',
  // The one red the ossuary owns, and it is old.
  r: '#3d1310',
}

export const MASTERS = [
  /**
   * The bone stack — the ossuary's material, standing in the room rather
   * than painted on its wall. It is a billboard on the floor at a depth
   * (art. 19), because a raster laid flat against a perspective wall would
   * not shear with it and would be the flat crest art. 102 refused, one
   * level up. Wall-flush architecture stays the cast's business (art. 99).
   */
  {
    path: 'regions/ossuary/bone-stack.png',
    palette: OSSUARY,
    rows: [
      '.........................3333...................',
      '......................33477774 33...............',
      '....................3477888887743...............',
      '..................347888888888873...............',
      '.......3333.......47881188118887 4..............',
      '....334777743.....47881080118887743.............',
      '...3478888874 3...4788118811888874 3............',
      '..347888888887433.3788888888888873433...........',
      '..47881188118887433378888888888873.433..........',
      '..478810801188874333.37881188887 3..43..........',
      '..478811881188874333..3778888873....33..........',
      '..3788888888888743.....33777773......3..........',
      '...37888888888873.......333333.......33.........',
      '....3778888887 3....3333..............3.........',
      '.....33777777 3..3347777433...........33........',
      '3333..3333333...34788888874333........3.........',
      '4777443......3334788811888743.......3333........',
      '3477777443333347881080118887433.334477743.......',
      '.3447777777777788811881188887433347788874.......',
      '..33344777788888888888888888874337881188743.....',
      '....333344777888888888888888887437881080874.....',
      '......33333444777788888888888874378811888743....',
      '.........333334444777788888887433788888887433...',
      '............33333444447777777433.3778888874333..',
      '..............333333344444443333..33777777433...',
      '.................33333333333333....333333333....',
    ],
  },

  /**
   * The Marrow (`src/content/horrors.ts`), as a hero plate. It is the thing
   * the ossuary's lair room is about, so it stands on the hero band and
   * nothing else in that room may (arts 104, 122).
   *
   * The reference's keeper hoards its detail at the skull, the ribs and the
   * hands and lets the rest go dark. This does the same at a twentieth of
   * the density — which is the honest statement of where this slice stands.
   */
  {
    path: 'horrors/marrow.png',
    palette: OSSUARY,
    rows: [
      '...........4..4..4..5..4..4..4',
      '...........35.35.35.56.53.53.53',
      '............235.355565.553.532',
      '.................2555552',
      '................255666552',
      '...............25666666652',
      '...............56611611665',
      '...............56610601665',
      '...............56610601665',
      '...............56611611665',
      '...............25666666652',
      '................2566666652',
      '.................25616652',
      '..................255552',
      '.................2566652',
      '..................25552',
      '.......556.25556...2j265552...655',
      '.......556.........2j2........655',
      '......5562555556...2j26555552..655',
      '......556..........2j2.........655',
      '.....55255555556...2j2655555552.655',
      '.....556...........2j2..........655',
      '.....52555555556...2j26555555552655',
      '.....556...........2j2..........655',
      '.....52555555556...2j26555555552655',
      '.....556...........2j2..........655',
      '......5255555556...2j2655555552655',
      '......556..........2j2.........655',
      '......5562555556...2j26555552..655',
      '......556..........2j2.........655',
      '.......556.25556...2j265552...655',
      '....2556652........2j2........2566552',
      '....25.5.52........2j2........25.5.52',
      '....4..4..4........2j2........4..4..4',
      '...............22555555522',
      '..............2566611666652',
      '..............2566610166652',
      '...............22566666522',
      '................2255555522',
      '..................255522552',
      '..................25552.2552',
      '..................25552..2552',
      '..................25552...2552',
      '..................25552....2552',
      '..................25552',
      '..................25552',
      '.................2556652',
      '................255666552',
    ],
  },

  /**
   * The candle, in two frames. art. 107: a loop is at most three authored
   * frames, and the flame is one of the three things an ossuary room may
   * spend a loop on. Only the top four rows differ between them — which is
   * the whole argument for patches (art. 122): the thing that moves is nine
   * pixels, so the repaint is nine pixels and not a room.
   */
  {
    path: 'patches/candle-a.png',
    palette: OSSUARY,
    rows: [
      '..d..',
      '..c..',
      '.cec.',
      '.bdb.',
      '..a..',
      '.999.',
      '.898.',
      '.898.',
      '.889.',
      '.788.',
      '.777.',
      '36663',
      '35553',
    ],
  },
  {
    path: 'patches/candle-b.png',
    palette: OSSUARY,
    rows: [
      '...d.',
      '..cc.',
      '.ced.',
      '.bcb.',
      '..a..',
      '.999.',
      '.898.',
      '.898.',
      '.889.',
      '.788.',
      '.777.',
      '36663',
      '35553',
    ],
  },

  /**
   * What you are carrying, at the bottom edge of the lens — the reference's
   * lantern, in the corner it holds it in.
   *
   * It is anchored to the *frame* and not to the room (art. 121): it is not
   * in the box, it is between you and the box, so it does not diminish and
   * it does not move when the room does. That is also why it is the one
   * plate with no school — it is yours, and it comes down every corridor
   * with you.
   */
  {
    path: 'ui/lantern.png',
    palette: OSSUARY,
    rows: [
      '.........jjj.........',
      '........j111j........',
      '.......j11111j.......',
      '......jj11111jj......',
      '.....j111jjj111j.....',
      '.....j11j...j11j.....',
      '....jj1j.....j1jj....',
      '....j1j.......j1j....',
      '...jjjjjjjjjjjjjjj...',
      '..jkkkkkkkkkkkkkkkj..',
      '..jk11111111111111kj.',
      '.jk1aaaaaaaaaaaaaa1kj',
      '.jk1abbbbbbbbbbbba1kj',
      '.jk1abbccccccccbba1kj',
      '.jk1abccddddddccba1kj',
      '.jk1abcddeeeeddcba1kj',
      '.jk1abcdde**eddcba1kj',
      '.jk1abcdde**eddcba1kj',
      '.jk1abcddeeeeddcba1kj',
      '.jk1abccddddddccba1kj',
      '.jk1abbccccccccbba1kj',
      '.jk1abbbbbbbbbbbba1kj',
      '.jk1aaaaaaaaaaaaaa1kj',
      '..jk11111111111111kj.',
      '..jkkkkkkkkkkkkkkkj..',
      '...jjjjjjjjjjjjjjj...',
      '....j111111111111j...',
      '.....jjjjjjjjjjjj....',
      '.......7887887.......',
      '......78888888.......',
      '.....7888888887......',
      '....78888888888......',
      '...788888888887......',
      '...78888888888.......',
      '...7888888887........',
      '...788888888.........',
      '...78888887..........',
      '...7888888...........',
    ],
  },
]

// `*` in a plate is what it is in a drawing: a light that carries. In a
// plate's palette it is simply the hottest step, because a plate is already
// in its own key and has nothing to look up.
OSSUARY['*'] = '#fffdf0'
