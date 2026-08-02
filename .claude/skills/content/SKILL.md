---
name: content
description: Use for any card whose scope touches content/ - authoring scene YAML through the linter, in canon voice.
---

# Writing content cards

A scene file lists objects; every object is always tappable while
present (LAWS.md #affordance). Shape:

```yaml
scene: shore
enter: "Cold shingle. Black water finding its level."
objects:
  book:
    tap: "It's a book. Swollen with river water."
    actions:
      read:
        - if: { flags: [knows_glyph] }
          say: "A procession, inked crude. Something small, held close."
          set: [read_book]
          journal: procession
        - refuse: true
          say: "The ink swims. A script you don't know."
```

- Gates and deltas come from VOCAB.md - nothing else parses.
- Every action's response list ends with a gateless fallback.
- Voice per CANON.md: short, concrete, present tense; banned words
  banned. Knowledge tier declared per scene; stay inside it.
- Telegraph law: anything that will ever harm has a free tap in the
  same scene that signals it (LAWS.md #telegraph).
- Run `npm run content-lint` before the PR. The linter is the review
  you cannot argue with.
