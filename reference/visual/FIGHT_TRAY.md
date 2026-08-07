# Reliquary — canonical runtime contract

The authored reliquary is the bottom interface. There is no second CSS-drawn
tray underneath it.

## The four fixed visual jobs

1. left health instrument;
2. six-die crown;
3. central content/scoring well;
4. three footer beds.

The right vertical cavities remain secondary/future carried-item space.

## Health

The red health level is a persistent direct child of the tray. It is never
destroyed/recreated during fight animation. Only its fill percentage changes.
Its bounds sit inside the dark glass of the painted orb.

## Fight

The six dice stay in the crown.

The central well replaces the old score widget with one compact live reading:

`sum × multiplier`

There is no separate result box. The line name may sit beneath it. Exceptional
decision-relevant arithmetic such as cost, bleed, or a withheld line can wrap
quietly beneath the reading inside the same well.

`incoming` and `unused` do not get permanent duplicate readouts.

## Footer

The beds are, for now:

- Actions
- Pouch / current fight action
- Read

Read opens the Book. It is a persistent footer action, not a room action and
not a row in the main well.

Map is parked until a real map exists.

## No legacy tray

The old gradient/CSS reliquary is retired. Before the plate is decoded, the
tray is hidden rather than replaced with a second visual system. The choosing
screen is the explicit exception: it owns its own black stage and never uses
the reliquary.


## Crown sockets

The six bones themselves are unchanged. The panel supplies a tight square
recess behind each one, only a hair larger than the bone, so the die looks
seated into the reliquary like a fitted puzzle piece rather than floating in a
large generic button.

The touch target may remain slightly larger than that visible recess.

Selection changes the socket, not the die: a selected recess gets a strong
cyan rim/glow. Do not recolor or redraw the bone to indicate selection.
