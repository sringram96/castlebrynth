# The room — the parallax law, scale, the look, the screen
Articles keep their ledger numbers; cite as "art. N". Statuses as in
the-world.md. Reference implementation:
`reference/castlebrynth-wake-v3.html` — it wins ties about intent.
Hero-density bar: `reference/crawling-one-authored-pixel-example.png`.
What the three bands *are* is here; how they are touched is the
interaction model, in the-thumb.md (arts 66–76, 90–92). The tray band is
a rail and panels under art. 67 as amended.

What a room is *made of* — parts, shape, thresholds, detail, things,
composition, motion — is the graphics amendment (arts 93–112), at the
foot of this file. It is the same law as arts 13–28 carried one level
down: those articles say the box cannot lie, these say what may stand
in it.

## The room (the parallax law)
13. SETTLED — The camera is a person: fixed eye height, fixed horizon, one
    vanishing point.
14. SETTLED (amended by the graphics amendment) — A room's proportions are
    exactly three authored numbers: lens (FOV), width, ceiling. Focal
    length is derived from lens, never set. A room also declares a *shape*
    (art. 96), and a shape that ends in a far wall authors that wall's
    depth — the only fourth number, and it says where the room stops, not
    how wide it is. Proportion and shape are different questions; nothing
    else about the box is authored.
15. SETTLED — The box is computed, not painted: per-pixel first-hit;
    surfaces textured in world space, so diminution is honest.
16. SETTLED (amended by the graphics amendment) — Where a room has no far
    wall, the far end is the mouth: past the cutoff, structural near-black
    with a dithered breath. A chamber ends in a wall standing inside the
    fog instead (art. 96), and that wall is a surface like any other.
17. SETTLED (amended by the look wave, 2026-08-05) — **No alpha
    compositing.** No translucent layer, no soft mask, nothing whose colour
    depends on what happens to be behind it: a pixel's colour is a pure
    function of where it is, so a room renders identical every visit and
    variation stays a deterministic hash.

    The blanket ban on *gradients* is lifted, and only within a surface's
    own ramp: a pixel may take an interpolated colour between two adjacent
    steps of the ramp it is already on (art. 94). The original ban was
    right about the thing it was aimed at — blending destroyed the material
    read at four device pixels to a game pixel — but it aimed too wide. The
    fix is not to forbid blending, it is to keep the **dither in the
    darks**, where banding is what actually shows (art. 95 as amended).
    Nothing here weakens determinism, and the golden plate is relocked at
    each such wave rather than loosened into a tolerance.
18. SETTLED — Outlines are derived: the contour pass inks exactly where
    surfaces meet. (Extended to sprites by art. 100 and to masses by
    art. 102 — derived there too, never drawn.)
19. SETTLED — Props are sprites projected at world coordinates, scaled 1/z,
    painted near over far; the z-buffer stands ready for true occlusion.
    (What a sprite is *made of* is art. 100; a substance lying in the room
    is not a prop at all but geometry, art. 102.)
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
    mouths, hands; masses dark and quiet. ("Deliberately basic" has a floor
    under it now: the three tiers of detail, arts 98–99. A room with only
    its grammar is the last room in a different colour.)
27. SETTLED (soft) — UI is diegetic where possible; the wake's signature
    choice is bones on the floor, not a menu.
28. STANDING — Stills live through small desynced idle patches; motions
    that matter never undo themselves. (The motion law is arts 106–110:
    what may loop, what may play once, what the desync is made of, and
    what a moving thing owes the thumb.)

## The screen
29. SETTLED — Three bands. The word: borderless at the top, fades after a
    beat, tap to recall — presentation fades, knowledge doesn't. The world:
    the frame. The tray: a box beneath, holding what the moment offers —
    acts, spells, dice.
30. SETTLED — There is no battle screen. A fight is the room with the thing
    come close: the horror advances to the near depth and fills the lens;
    the tray turns to combat; the word keeps narrating.

## The graphics amendment (ratified 2026-08-05)
Drafted from four demos, in order: ramp shading (shipped as PR #36 under
card 43, and kept in the repo as
`reference/castlebrynth-ramp-shading.html`), then shapes and thresholds,
sprites and wall features, and fields, masses and composition. The last
three demos are not in `reference/` — until they land, this file is the
only statement of what they proved, and it wins ties by default rather
than by precedence.

**Amended the same day by the look wave**, drafted from two further
demos — high-fidelity shading and the re-authored rooms — after a
playtest whose verdict was that every room was a hallway, the doors read
as chests, and nothing could be identified. The renderer was not broken;
it was under-specified. The look wave amends arts 17, 94, 95, 96 and 100
and adds arts 113–115, and its load-bearing change is art. 17: the ban
on gradients was aimed at the right failure and cut too wide.

Arts 13–28 say the box cannot lie. These say what may stand in it. Where
one of them names a number — step counts, percentages, a fraction of the
frame — the number is tuning and lives in the render configuration or in
content; the shape of the rule is law.

### What a room is made of
93. SETTLED — A room is six parts, in the order the renderer builds them:
    the **box** (lens, width, ceiling, and either the depth at which the
    mouth swallows everything or a far wall) — the room's silhouette; the
    **surfaces**, two walls, ceiling and floor, each carrying a grammar;
    the **light**, a station, a reach and a tint; the **air**, what
    distance dithers toward and how fast; the **things** — features on the
    walls, objects standing in the room, fields filling it, masses lying
    in it; and the **contour**, which is derived and never authored. The
    contour is not a knob. A **school** is a named set of choices across
    the middle three — surfaces, light, air — shared by the rooms of a
    region. A room is a box, a school, a shape, and its things.

### Shading — the ramp (shipped, PR #36)
94. SETTLED (amended by the look wave) — One ramp per surface, and
    everything is a step offset. A pixel resolves to a single scalar — a
    position on its own surface's ramp — before any colour is chosen. The
    stone's variation, the seam (a *groove*, so it stays a groove when the
    light moves across it), the defect drop, the inclusion lift, the
    gradient, the light's lift, the air's drop: all of them move that one
    number. That much is unamended and is the whole architecture.

    **The ramp is deep, and it turns.** It is generated through three
    stops in HSL — a cool desaturated dark, a warm mid, a hot saturated
    light — at sixty-four steps rather than ten. **Shadows go cool and
    lights go warm**, which is most of the visible gain in the demos and
    costs nothing anywhere else. The old nine-or-ten was a consequence of
    quantising hard at every step; once the upper ramp blends (art. 95),
    step count stops being a legibility bar and starts being headroom.
    Sixty-four and the three stops are tuning; that a ramp shifts hue
    across its length is not.
95. SETTLED (amended by the look wave) — **The hybrid dither.** One
    treatment, at the end, chosen by where on the ramp the scalar landed:
    across the upper four fifths a pixel **blends** between the two
    adjacent steps it falls between; in the darkest fifth it **dithers**
    between them instead, against interleaved gradient noise rather than
    Bayer — deterministic, so art. 17's identical re-render holds, and
    scattered, so a half-lit surface reads as a surface instead of a screen
    door.

    The split is the whole point. Banding is a fact about dark values on a
    real panel, not about images in general, so the game pays the dither's
    cost exactly where it buys something and takes the smooth read
    everywhere else. **The threshold is tuning and must be settled on a
    phone**, because a desktop panel cannot show the thing being decided.
    Tint sparingly, and after quantisation: the ramp does the work.

### Shape and the threshold
96. SETTLED (amended by the look wave: a fourth shape) — Shape sits above
    proportion. The three dials change a room's proportions; they do not
    change what kind of space it is, and a depth built from proportions
    alone is one room at different sizes. A room declares one of four
    shapes. The **tube** has no far wall: the mouth is the way on, and it
    is something you pass through rather than stand in. The **chamber**
    has a far wall inside the fog — the room *ends*, which is what makes
    it a place — and its exits are apertures in its walls. The
    **junction** is a chamber whose side apertures are wide and
    full-height: the labyrinth's lefts and rights, where a door is a
    direction you turn rather than an item you pick. The **open** has
    neither walls nor ceiling: a ray hits the ground or it hits the sky,
    and the sky is a ramp with a scattered field in it (art. 101). All
    four are the same first-hit cast with planes added or taken away
    (art. 15 unchanged). Shape multiplies against proportion: a grand
    chamber and a cramped chamber are different rooms, and so are a long
    tube and a stub.

    **A depth of one shape is a depth of one room.** The mix is content
    and belongs to the region: what makes the drowned not the burnt is
    partly which shapes it deals.
97. SETTLED — A door is a hole, not a thing. A filled dark rectangle
    standing on the floor *is* a chest, and the playtest was right to read
    it as one. Thresholds obey a grammar that never varies between rooms:
    **taller than wide, always**, because wider-than-tall reads as
    furniture and this rule alone prevents the confusion; **standing on
    the floor**, interrupting the floor line, because a thing that floats
    is a thing; **recessed, and honestly** — the ray enters the aperture
    and strikes a plane set back behind the wall, so the jambs shade by
    the same geometry as everything else and the darkness has depth;
    **framed**, an architrave standing proud of the wall around the
    aperture, and nothing that is not a way out may wear one; and **dark
    inside, in the room's own darkness**, at the bottom of the wall's ramp
    and tinted by the air. State may vary — open, sealed with bars or
    boards set *inside* the frame, locked with the lock *on* the frame.
    The grammar may not: players learn the frame once and read it for the
    rest of the game.

### The three tiers of detail
98. SETTLED — A room is textured, then built, then furnished, and a room
    with only the first tier reads as the last room in a different colour.
    Tier one is the **grammar**: the repeating material that is the wall's
    substance — unit (large reads ancient and load-bearing, small reads
    institutional), seam (thin and even reads precise, thick and dark
    reads old), variation, defect, gradient, and inclusion (a rare cell
    that is not the others: at 4% a detail, at 25% the material). **A
    grammar without a gradient is wallpaper** — soot climbing, a waterline
    sitting low, moss thickening near the floor. The gradient is the knob
    that matters most and it is not optional.
99. SETTLED — Tier two is **features**: architecture placed at world
    coordinates on the wall plane and flush with it, shading by the same
    cast as the stone around it — pilasters, string courses, niches,
    arches, wainscot, a crack, a collapse, a **bricked-up doorway**, which
    is a frame with the wrong masonry inside it and says something
    happened here without a word of prose. This is what makes walls differ
    by more than colour. Tier three is **things**: objects, fields and
    masses, arts 100–103.

### Things: objects, fields, masses
100. SETTLED (amended by the look wave: the alphabet) — An authored thing
     is a bitmap of ramp indices, never of colours. Procedural scatter has
     no silhouette, and silhouette is most of legibility at this scale:
     anything meant to be recognised is drawn once, by hand, as a small
     grid of indices into the room's ramp, and the school colours it at
     paint time. Three consequences, and each is load-bearing: a sprite
     cannot fall out of palette; one drawing appears in the drowned and the
     burnt as one object in two keys; and readable size is a property of
     the drawing, so content declares the distance past which a thing is
     not placed rather than letting the projection shrink it into noise.
     **A sprite carries its own contour** — a one-pixel outline derived
     from its silhouette, art. 18 applied to a thing instead of a surface.
     It is what stops two objects from melting into one another.

     Things are authored **as text**, on a small alphabet: a digit is a
     step on the room's ramp, `.` and space are nothing, `*` is **a light
     that carries** — a thing that emits rather than takes the room's
     light — and `+` is **metal**, which answers the light differently
     from stone. The alphabet is law because it is what lets one drawing
     mean the same thing in every school; which characters stand for what
     is tuning.
101. SETTLED — Fields are scattered, and scatter is for nothing else.
     Scatter was misused, not wrong: it is for what has no silhouette to
     get wrong — a field that fills a volume rather than an object that
     occupies a place. Night sky through a broken roof; motes of drifting
     light, magic or spores or embers on the air; dust hanging where the
     light falls; ash, rain, snow, sparks. A field has no outline, no
     footprint, and nothing to identify; it may drift and it may twinkle.
     **It may never be an object** — a vine, a flame, a skull and a chest
     are objects, and scatter fails all four.
102. SETTLED — A mass is one form, and the rays hit it. A substance lying
     in the room — sand, water, rubble, bone — is one continuous form and
     not a heap of copies: eight dune sprites read as eight small piles,
     because that is what they are. And it is geometry, not a painting: a
     mass is a **height on the floor**, so the floor stops being a flat
     plane and becomes a plane plus a height, and the cast marches each
     downward ray until it drops below that surface. Painting a crest in
     screen space and filling beneath it fails three ways at once — the
     crest runs flat across the frame instead of receding, its size agrees
     with nothing else in the room, and it cannot hide what stands behind
     it. Once it is geometry the rest is free: it obeys the box's
     perspective, occludes correctly, meets the walls where the walls are,
     takes the same light and the same air, and the derived contour
     separates it from what is behind it without being drawn.
103. SETTLED — A mass is shaded by its **slope**, and it banks against the
     walls. A face tilting away from the viewer catches the room's light,
     a face tilting toward them falls into its own shadow, and the crest
     takes a lit lip; that read is what makes a shape legible as a solid
     rather than as a stain. Shapes are the substance's real shape — sand
     is a long gentle windward slope and a short steep slip face, not a
     symmetrical hill — and banking against the walls is most of what
     makes a room look buried rather than decorated. Anything standing in
     a mass stands at the mass's height, not the floor's.

### Composition
104. SETTLED — One hero per room, at a size that reads. A room resolves in
     one order: **shape, then exits, then the one thing, then detail on
     tap** (art. 68). **If two things compete to be the one thing, the
     room has none.**
105. SETTLED — Things keep their distance. Every object claims a screen
     footprint, and no object may be placed where it would stand in front
     of another: overlap at this scale is not depth, it is mush. The root
     chapel was unreadable not because it held too much but because its
     things cut each other in half. Supporting things stand aside from the
     hero — beside it, behind it, or nearer the camera at the frame's
     edge — never across it. DEFAULT within this article: density falls
     with depth, because the deep should read as emptier and worse.

### Motion
106. SETTLED — Thresholds stir, and almost nothing else does. A doorway's
     darkness moves slowly, in the bottom two steps of its ramp, never
     enough to read as an event. It is the only *constant* motion in an
     ordinary room, so a glance finds the exits without a word being
     written.
107. SETTLED — Stillness is the capital that motion spends. Small
     animations have large effects only because the world is still, and
     every added motion devalues every other; so motion is a budget and
     not a feature, in three kinds. **Loops** — at most three authored
     frames on a slow clock, and only three things in a room may run one:
     the thresholds' stir, one hero element, and one field or mass
     drifting. Nothing else loops, ever. **One-shots** — anything may
     animate once when its state changes: the bars fall from an unlocked
     door, the taken key glints and is gone, the basin's water stills. A
     one-shot plays once, ends in the settled state (art. 1), and the
     settled state is the truth, so a player who missed the motion missed
     nothing (art. 70 is served, not weakened). **The blink** — the rarest
     motion reads the largest: a single-frame event on a very long clock,
     eyes opening in a doorway once a minute, outweighs any loop in the
     room. At most one per room, and only where it means something.
108. SETTLED — Motion means mattering, so the game spends it where the
     player must notice. A fleeting window (art. 4) announces itself by
     motion — it is the signal that a moment is open, and it closes when
     the window does. And **answers move**: a tapped thing may acknowledge
     in pixels, a one-frame twitch beside its line of prose. Art. 69
     extended — silence is a bug in pixels too. It follows that **a moving
     thing that cannot be tapped is a bug**: anything that moves is
     claiming to be important, and if it is not, it is lying.
109. SETTLED — One clock, phase-offset by hash. All loops tick on a single
     world clock (~150 ms today), and each instance offsets its phase
     deterministically from its own identity. No per-thing timers and no
     drift between visits: the same room breathes the same way every time
     you stand in it. This is what art. 28's "desynced" is made of.
110. SETTLED — The base frame is cast once. A room's box, surfaces,
     features and light are cast to a frame and cached; animation is
     **overlay repaint** on top of that frame, never a recast. Where the
     whole room must breathe — torchlight swelling — the room is cast
     *twice*, with the light lift a half-step apart, and the two frames
     alternate on the slow clock. Motion never changes what a pixel
     *means*, only which prepared frame shows, so art. 17 holds
     unamended.

### Legibility and the register
111. SETTLED — An answer names the thing. A tap's reply leads with the
     plain noun — *"A stone basin, dry."* — and only then says anything
     atmospheric. A player who cannot name what they are looking at cannot
     decide anything about it, so identification is a legibility
     requirement and not a matter of style. The register governs the
     sentence after the noun (rules/voice.md); this article governs the
     noun before it.
112. SETTLED — A third of the frame stays dark. A fully-lit room is out of
     register however well lit. The fraction is tuning; that a room hoards
     its light is not.

### The light, and the rim (the look wave, 2026-08-05)
113. SETTLED — A light is a **station**, a reach, and a **colour**. The
     station is a place in the room and not a direction: above, below,
     ahead, with you, or none — so the lift falls off from somewhere,
     which is the lever that inverts a room. Lit from below, the ceiling
     becomes the darkest surface in the frame and the room stops being the
     last room in a different colour. The colour is applied **after
     quantisation**, in proportion to how lit the pixel is, so light warms
     what it reaches and leaves the rest to the ramp (art. 21 unchanged:
     there is no global light rule and there should never be one).
114. SETTLED — **A region is known by its light.** At sixty-four steps a
     palette stops carrying identity on its own: strong light pulls
     distinct schools toward each other, so two regions with different
     stone and the same station read as the same place. Regional identity
     therefore rides the light's station and tint at least as much as the
     palette, and a region that cannot name its station has not been
     designed. The drowned is lit from below through water; the burnt from
     its embers; the ossuary close and with you; the neutral pool is
     quiet. Which station belongs to which region is content; that a
     region *has* one is not.
115. SETTLED — **The rim is derived, and nothing is hand-shaded.** A
     thing's authored indices say what it is made of; they never say which
     side of it the light found. Each shape's distance-to-outside is
     computed once, the edge normal is that field's gradient, and how hot
     an edge burns is that normal against the direction of the room's
     light (art. 113). So one drawing lights itself correctly in a room
     lit from below and in a room lit from ahead, and a hand-painted
     highlight — which can only ever be right in one room — is a bug.
     This is art. 18's derived-outline principle carried from a thing's
     silhouette to its surface.

### What this amendment does not touch
No alpha compositing — a pixel's colour never depends on what is behind
it, and the blending art. 17 now allows stays inside one ramp (art. 17 as
amended by the look wave). A
room renders identically every visit; motion runs on its own clock and
never changes what a pixel means (arts 17, 109–110). The box stays
honest: light changes what colour a surface takes, never where a surface
is (arts 15, 21). Contours stay derived, for surfaces and now for
sprites and masses (arts 18, 100, 102). Props and features live at world
coordinates and scale by 1/z (arts 19, 99). Palette and light are
authorial per scene; there is no global light rule and there should never
be one (art. 21). And nothing here assumes a device pixel: the units are
world units and ramp steps (arts 22–23).
