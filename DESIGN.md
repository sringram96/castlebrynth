# DESIGN.md — castlebrynth (the whole game, one document)

A mobile pixel-horror dungeon crawl: point-and-click rooms you read,
dice combat you throw, forward-only descent, permadeath that keeps
your bones. Contains SPOILERS below the marked line.

## the two engines, one doorway

THE DESCENT (navigation) and THE LOTS (combat). Merchant and dialogue
encounters resolve inside the Descent; FIGHT is the only door into
the Lots. The Descent finds what the Lots spend.

## frame

Full-bleed pixel still; 1–2 lines of writing on top; fixed bottom
panel paged ◂ ACTIONS · SKILLS · ITEMS ▸ over a permanent strip (HP ·
Might · Will · ◎ tithes · depth). Sanity is the vignette closing in —
no sanity bar exists anywhere.

## the descent

- Tap is free, always — describes, selects, surfaces actions; never
  advances, costs, or harms. Named investigation actions (PEER,
  LISTEN, REACH IN) carry the risk and may open situations.
- FORWARD-ONLY. No backtracking within a push; knowledge ratchets
  cross-push (refusals + clues pay off on later meetings). A
  clue-locked gate draws its clue earlier in the push or is marked
  cross_push.
- Doors are the map: the next 2–3 doors appear as sensed descriptions
  (light, sound, smell). No map screen, ever.
- Rooms draw fresh per push from an authored pool; landmarks fixed
  per depth; exactly one notable-die event per depth (guarded,
  priced, or bargained — win, pay, or walk).
- Every event carries dialogue; QTEs are their own category.

## the lots

- Hand = 5 plain bones + 1 signature die CHOSEN at the Crossing
  ("one of these was yours" — never confirmed). The choice is the
  class. First class, THE WIZARD: the Hollow Die — blank faces + one
  power face; spells socket onto blanks. Weakest start, hardest
  scale.
- Loaded bones: all six faces always possible; weighting is a
  declared probability lean, stated on inspect and legible in the
  art. At most one gilded trigger face per die. No verb-faces, no
  self-cost faces.
- Turn: enemy intent shows (enemies never roll) → roll your hand →
  THROW a combo / brace / [gather — economy still open] / FLEE →
  each held die blocks 1 → intent lands.
- FLEE is always offered: every enemy's inspect declares its PURSUIT
  chance alongside its intent; fleeing ends the fight, pursuit may
  land one parting harm, and the room's door draw stands — forward
  is still the only way.
- Scoring: base = sum of thrown faces × combo tier (pair ×2, trips
  ×3, straight ×3, full house ×4, quads+ ×5). Items are ADDITIVE
  jokers ("rusted knife: +2 to any scored combo"). Elites may bend
  grammar as content ("seals your sixes").
- Spells are instants: consumables for everyone; socketed faces for
  the wizard (the roll is the cost). Mana does not exist.
- Heavy dice may be stat-gated ("this die wants Might 3") — stats
  shape the arsenal without ever touching the throw math. Stats are
  the body (health, soak, skill and dice access); dice are the hands.
- Combat content architecture: engine knows only pipeline hooks
  (intent_shown → roll → skill_window → action → combo_validate →
  base_sum → tier_mult → on_score faces-then-jokers → apply →
  enemy_resolve on_hold/armor/on_block → on_turn_end) and closed
  effect verbs (add, mult, promote, block, burn, hp, seal, curse;
  retrigger BANNED). Everything else is manifest data
  (grammar.yaml + experiments/ overlays). A new verb or hook is a
  loud amendment, never a quiet edit.

## fairness laws (CI, not guidance)

F1 mult discipline: tier × at most ONE item mult, hard cap. F2 bone
standard: plain die EV 3.5 anchors all; TTK chaff 2–3 / elite 4–6 /
boss 8–12; brace-only survival 4–5 turns. F3 EV bands by rarity
(±15% / +25% / +40%); rare power = RELIABILITY via lean, not raw EV.
F4 risk symmetry: upside carries ≥25% of its EV as cost. F5
termination: nothing re-enters scoring. F6 no dominance: everything
must lose somewhere (sim tournament). F7 one-shot guard: max single
throw ≤60% of that depth's boss HP. Promotion to the base manifest =
sim green + human feel pass, both.

## ledgers, death, growth

- RUN ledger (tithes, consumables, non-kept gear: 4 equipment + 2
  small slots) — death takes it, except ✦ key and • kept items + one
  random survivor. CAMPAIGN ledger (dice, knowledge, landmarks,
  grants) — death cannot touch it. DICE SURVIVE DEATH — law.
- Pouch packed at the Crossing from the stash; mid-push finds are
  swap-or-leave; no stash access below.
- EITHER bar at zero — health or sanity — is death, by the same
  rule. Death wakes you at the Crossing, bars and uses restored;
  doors redraw; every death unlocks ≥1 new line somewhere (death
  pays).
- No XP, no levels. Growth = dice (campaign), gear + grants (helpful
  rooms give; dark tradeoffs charge), skills (found, uses-per-rest,
  spent AFTER the dice land), and item combination as joker crafting
  (knife + whetstone → honed knife: the joker upgrades, not a stat).

## qtes

Relaxed tap rhythm broken by sudden reaction: timed choices,
swipe-parries, frame-grabs, room-entry ambushes (once, flag-guarded),
threshold sequences. Ambushes may HURT unannounced; only telegraphed
things may KILL. Every QTE declares a Will-check fallback; a setting
converts all of them.

## content laws (lintable)

Affordance permanence (tappability never toggles; adds/removes carry
a cause) · gates satisfiable (keys reachable; graph acyclic) ·
telegraphed harm · no softlocks (always a path to exit, death, or
the Crossing) · no pixel hunts (visible objects, min hit size) ·
spoiler containment by tier · revelations need ≥3 breadcrumbs ·
journal records acts, never morals · NO REROLLS EVER · QTE fallback
mandatory · death pays per depth.

## art direction

NES-CUTSCENE fidelity, not NES-gameplay: pixels as illustration.
Two shot grammars — ROOMS (locked wide tableaux, 90% of play) and
CINEMA (letterboxed close-ups, ~2× detail, reserved for glimpses of
the child, first openings, boss intros, deaths entering the Book of
Ends; the camera coming close IS the alarm). One motivated light source per scene; 30–40%
true black; hand dither only; selective outlines + 1px rim light;
IF IT'S TAPPABLE, IT CATCHES THE LIGHT; CONTOUR LAW — every gameplay
mass keeps a continuous silhouette (dark cut vs light ground, light
edge vs dark) + a contact shadow; black withholds CONTENT, never
SHAPE. Stillness: ≤2 ambient touches per room; motion is the jump
scare. Canvas 240-wide portrait, integer upscale, true-black
letterbox, UI text native-res over the art, dithered on-grid
vignette, dice ≥24px with leans drawn physically. PROJECTIVE LAW
(.llm/rules/art.md): one camera, frontal one-point only, eye height
constant (the body is the unit), two lenses by register, scenes
solved as planes + boxes with world-space texturing — hand art is
painted over the solver's guides. ~40-color master;
per-depth 12–16 colors = desaturated base + ONE accent (Crossing
teal · d1 lantern amber · d2 cult crimson · d3 pale gold). THE ART
NEVER LIES: the Fraying corrupts words only; pixels stay truthful.

## world & voice (spoiler-free)

You wake at the Crossing — a dead portal chamber — with no memory;
a labyrinth leads down; something in you pulls that way. Corridors
move, landmarks hold; residents treat it as weather. The cult keeps
the deep places — robed, patient, many would rather talk; their lord
is named only THE MORNING KING below tier T3. Tithes are the coin.
The labyrinth remembers everything; you alone forget. Voice: quiet,
concrete, unsentimental; dread through specificity; short lines,
present tense. Banned: "suddenly", "you feel", "mysterious", "evil",
"creepy", satan/devil/lucifer below T3, any meta reference. The
child is never shown harmed — only changed. Knowledge tiers: T0
residue only · T1 you came on purpose; crossing takes memory · T2 an
infant prepared; they knew you OR you knew them (both readings must
survive) · T3 below.

## ═══ SPOILERS BELOW — tier T3 only ═══

The protagonist's baby brother was taken to be made the vessel of
the Morning King — Satan, plainly, here and nowhere else. The rite
replaces the child stage by stage. The protagonist pursued them and
crossed KNOWING the toll: memory. The amnesia was chosen; what
remains is compulsion — the arms remember the weight. Whether the
protagonist was once OF the cult is indeterminate and is COLLAPSED
BY PLAY: a hidden complicity ledger (rites performed, robes worn,
others spent) plus key choices determines which history is true; the
ending names it; no content may resolve it earlier. Endings read
ledger + choices, severance through inheritance. Invariants: the
child never speaks, never shown harmed, one glimpse per depth, a
second voice under any cry; recognition lines never explain
themselves.

## open (by choice, parked in Asana H199)

Spend economy (knucklebones gather vs refresh-per-fight — ruled by
thumb at the fight screen) · signature-die roster beyond the wizard ·
the semantic naming layer (retry from play outward) · ART TASTE:
Muted vs Noir palette school and CRT on/off (judge on the gallery) ·
journal + refused-ledger SURFACING in the frame (decide at D006) ·
the Fraying (sanity word-rot: narrator lies at low sanity, art never
does — system parked, name reserved).
