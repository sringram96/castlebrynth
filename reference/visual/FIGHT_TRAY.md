# Fight tray — art-direction authority

This file supersedes older tray-layout interpretations when they conflict with
the painted reliquary.

## Canonical composition

- Six dice are the shipped combat hand.
- Those six dice occupy the six authored crown positions.
- They are game pieces, not icons; fill the crown generously.
- The central dark well is the combat information stage.
- Live scoring (`sum × line`, including the line name) is the primary object in
  that well.
- `incoming` and `unused` do not get permanent readouts. The horror's intent
  already says what is coming; unused dice are visible as dice state.
- Health remains the left orb.
- The footer remains the three carved beds, with the fight action borrowing the
  middle bed while Pouch is unavailable.

## Screen relationship

The plated reliquary overlays the bottom of the room instead of consuming a
separate black band. Transparent pixels in the PNG reveal the room behind it.
Do not add a flat black matte behind the plate.

The tray scales uniformly from normalized tray coordinates. Internal combat
composition does not reflow with viewport width.

## Engineering boundary

The generic engine may continue to represent a hand as a collection. That does
not require the canonical fight UI to auto-layout arbitrary counts. The
unpainted fallback may remain generic; the painted combat plate is authored.

Do not reintroduce an absolute 40px rule that forces the plate to be redesigned
or the dice to wrap. Make targets as generous as the authored geometry allows,
keep them non-overlapping, and preserve the composition.
