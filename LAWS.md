# LAWS.md - fairness and coherence, as checkable statements

Every law is written to be enforced by a content linter over the event
graph, not by taste. Cards that violate these do not merge.

1. **#affordance - permanence.** An object's tappability is constant for
   its entire lifetime in a scene. Objects may be added or removed only
   by world-state deltas with a diegetic cause recorded on the delta.
   Lint: no object toggles interactive across states in which it is
   visibly present.

2. **#gates - satisfiability.** Every response that blocks *required*
   progress declares its key (item, flag, knowledge). Lint: the key is
   producible by some reachable earlier content; the dependency graph of
   keys is acyclic.

3. **#telegraph - fair harm.** Every source of death or major loss in a
   scene has at least one free tap in that scene whose description
   signals it. Lint: harm nodes reference their telegraph node; the
   telegraph is unconditioned or its gate is satisfiable earlier.
   Situation clause: a risky investigation action's free-tap description
   must carry the scent of risk, and inside a situation at least one
   readable cue node precedes any kill node on every path.

11. **#death-pays - dying advances the story.** Each depth's content
    must include at least one response gated on death or hollowing
    counters, so every fall or break unlocks a new line somewhere.
    Lint: per depth, >=1 gate referencing the death/hollow counters.

4. **#softlock - always a way.** From every reachable state there exists
   a path to an exit, a death, or the shore. Lint: graph reachability.

5. **#visible - no pixel hunts.** All interactables are visible objects
   with hit areas at or above the minimum size. Hidden regions are a
   build error. Depth of response is unrestricted.

6. **#spoiler - containment.** Content at tier N may not reference
   entities, events, or vocabulary reserved to tiers above N (TRUTH.md).
   Lint: banned-term and entity-reference scan per tier.

7. **#breadcrumbs - earned revelation.** A tier-N revelation node
   requires at least three distinct lower-tier breadcrumb nodes planted
   on reachable paths. Lint: count and reachability.

8. **#consequences - shown, not told.** Journal entries record acts and
   scenes only. Lint: entry templates contain no cost, amends, or
   permanence language.

9. **#dice - no takebacks.** No content or item may grant a reroll or
   cancel a landed die. Lint: effect vocabulary scan.

10. **#qte - convertible.** Every QTE node declares its Will-check
    equivalent. Lint: presence of the fallback and its DC.
