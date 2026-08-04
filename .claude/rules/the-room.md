# The room — the parallax law, scale, the look, the screen
Articles keep their ledger numbers; cite as "art. N". Statuses as in
the-world.md. Reference implementation:
`reference/castlebrynth-wake-v3.html` — it wins ties about intent.
Hero-density bar: `reference/crawling-one-authored-pixel-example.png`.

## The room (the parallax law)
13. SETTLED — The camera is a person: fixed eye height, fixed horizon, one
    vanishing point.
14. SETTLED — A room's shape is exactly three authored numbers: lens (FOV),
    width, ceiling. Focal length is derived from lens, never set.
15. SETTLED — The box is computed, not painted: per-pixel first-hit;
    surfaces textured in world space, so diminution is honest.
16. SETTLED — The far end is the mouth: past the cutoff, structural
    near-black with a dithered breath.
17. SETTLED — No alpha, no gradients: atmosphere is ordered dither;
    variation is deterministic hash; a room renders identical every visit.
18. SETTLED — Outlines are derived: the contour pass inks exactly where
    surfaces meet.
19. SETTLED — Props are sprites projected at world coordinates, scaled 1/z,
    painted near over far; the z-buffer stands ready for true occlusion.
20. SETTLED — Guides (vanishing point, box edges, horizon, harmonic depth
    ruler) are the authoring layer. Authoring snaps to the ruler; the
    engine stays continuous.
21. SETTLED — Light and palette are authorial, chosen per scene. No global
    light rule.

## Scale & the frame
22. SETTLED — Nothing is fixed in device pixels. One game pixel = 1/GRID of
    the frame's width — a ratio, not a canvas size.
23. SETTLED — GRID is a dial (240 today); a 480 migration for rooms is a
    named option. Nothing outside the render configuration may assume the
    number. By construction the migration re-renders the box for free;
    only sprites redraw.
24. SETTLED — Frame height derives from the device; the box extends itself.
    Anything tappable or necessary lives inside a guaranteed safe frame;
    overflow is atmosphere only.
25. DEFAULT (amended by ruling of 2026-08-04) — Exact fill via sharp
    upscale. The frame's height already derives from the device (art. 24),
    so the box fills the world band and the scale is fractional;
    nearest-neighbour keeps it sharp. Game pixels may differ by a device
    pixel at the seams, which is the price of having no bars. (Superseded:
    integer scaling with letterboxing. The bars offended on a phone, where
    the box held about 60% of each dimension — the revisit the original
    article invited.)

## The look
26. SETTLED — Two tiers. Ordinary rooms: the computed box plus sprites,
    deliberately basic now, improved over time. Hero moments: authored
    plates at the density of the reference image — detail hoarded at eyes,
    mouths, hands; masses dark and quiet.
27. SETTLED (soft) — UI is diegetic where possible; the wake's signature
    choice is bones on the floor, not a menu.
28. STANDING — Stills live through small desynced idle patches; motions
    that matter never undo themselves.

## The screen
29. SETTLED — Three bands. The word: borderless at the top, fades after a
    beat, tap to recall — presentation fades, knowledge doesn't. The world:
    the frame. The tray: a box beneath, holding what the moment offers —
    acts, spells, dice.
30. SETTLED — There is no battle screen. A fight is the room with the thing
    come close: the horror advances to the near depth and fills the lens;
    the tray turns to combat; the word keeps narrating.
