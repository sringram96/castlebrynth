# GRAMMAR.md — pluggable combat grammar + fairness math (v0)

STATUS: engineering design under VISION.md v1 (pre-ratification). Dice model v2.1: loaded bones (declared probability leans, all faces kept, inspectable) + gilded triggers; wizard Hollow Die socketable; verb-faces scrapped; mana removed (spells = consumable instants or socketed faces). When the
vision is ratified, H202 is re-cut to implement exactly this. Board
frozen meanwhile.

## the pluggability principle

Engine code knows HOOKS and EFFECT VERBS — nothing else. Every die,
face, joker, spell, skill, and boss rule is a data element that
attaches effects to hooks. Adding or removing an element is a data
edit, never an engine edit. Adding a new effect VERB is an engine
amendment (vocabulary closure, RULES.md 3). This is the same law the
room engine already lives under, applied to combat.

## the turn pipeline (the fixed hooks)

intent_shown -> roll [on_roll] -> skill_window (post-roll, human) ->
action {THROW | GATHER | BRACE} -> combo_validate -> base = sum(pips)
-> tier_mult -> [on_score: faces first, then jokers, manifest order]
-> apply_damage -> enemy_resolve [on_hold shields -> armor -> on_block]
-> [on_turn_end]

## closed effect verbs (v0 — the whole language)

add N · mult N (capped, F1) · mana N · burn N · hp N (self-cost) ·
block N · wild · promote COMBO->COMBO · seal FACE · curse DIE
BANNED v0: retrigger, extra-throw, anything re-entering scoring (F5).

## the manifest — all combat content in one file

grammar.yaml
  tiers:  { lone:1, pair:2, trips:3, straight:3, full_house:4, quads:5 }
  faces:  gilded_3 {pip:3, on_score:{add:3}}   # trigger faces: max 1/die
  dice:   bone     {faces:[1..6]}
          triad    {faces:[1..6], lean:{3: 2.0}}   # loaded: declared lean,
          evenkeel {faces:[1..6], lean:{2:1.5,4:1.5,6:1.5}} # no face removed
          hollow   {faces:[blank,blank,blank,blank,blank,POWER],
                    class:wizard, socketable:true}  # spells socket onto blanks
  jokers: rusted_knife   {on_score:{add:2}}
          honed_knife    {on_score:{add:4}}
          loaded_knuckle {promote:{pair:trips}}
  spells: ember_die {die:..., throw_cost:{mana:1}}
  skills: ward {gate:{will:2}, uses:2, window:skill_window, ...}
  enemy_rules: warden_seal {seal:6}
  enabled: [ ...the live set... ]

experiments/exp-NNN.yaml = base overrides: enable/disable lists +
numeric tweaks. Nothing else changes anywhere.
Run: npm run sim:fight -- --manifest experiments/exp-012.yaml
     --fights 10000 --seed 7

## fairness laws (each lint- or sim-enforced)

F1 MULTIPLIER DISCIPLINE - flat adds are common; total multiplier =
   tier x at most ONE item mult, hard cap x6. Static lint over every
   enabled combination.
F2 THE BONE STANDARD - plain die EV 3.5 anchors everything. Targets:
   chaff dies in 2-3 throws, elites 4-6, bosses 8-12; brace-only
   player survives 4-5 turns. Sim asserts these under the base
   manifest on every PR.
F3 EV BANDS BY RARITY - common within +-15% of bone EV, uncommon
   <= +25%, rare <= +40%. Each element's card declares its band; the
   sim confirms it empirically.
F4 RISK SYMMETRY - any upside face or joker carries a cost whose EV
   is >= 25% of the upside it grants (the skull rule, generalized).
F5 TERMINATION - no effect re-enters scoring; per-turn mana and burn
   generation statically bounded; retrigger banned until a future
   amendment argues otherwise.
F6 NO DOMINANCE - sim tournament vs baseline loadouts: any element
   that is strictly better in all contexts, or never chosen by the
   greedy policy, FAILS. Everything must lose somewhere.
F7 ONE-SHOT GUARD - max reachable single throw from a depth's
   available pool <= 60% of that depth's boss HP (static interval
   bound). Bosses are fights, not math errors.

## experiment workflow

1. Copy base -> experiments/exp-NNN.yaml; edit enabled sets/numbers.
2. Seeded sim -> report: damage/turn distribution, TTK/TTD, mana
   economy, gather cadence, dominance table, F1-F7 verdicts.
3. Promote to base only on sim green + a human feel pass. The sim is
   the fairness proof; the human is the fun proof. Both required.
