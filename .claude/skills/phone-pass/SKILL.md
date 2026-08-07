---
name: phone-pass
description: The hand pass. Use at the end of every wave, and whenever a task needs a number that only a real phone can settle — the dither threshold (art. 95), any beat duration (art. 119), anything about reach, size or legibility under a thumb. Carries the checklist, the pre-registered timing cuts, and how a finding is recorded.
---

# The phone pass

**Castlebrynth is a phone game, portrait, one thumb.** Three waves in a row
closed with the sentence *"the hand pass is still owed"*, and two laws
(arts 95 and 119) say in as many words that their numbers cannot be settled
anywhere else. That is a procedure whose absence was the recurring bug, so
it is written down: this is standing rule 4, *every wave ends in a hand*.

**What this is not.** A headless browser at 390×844 is not a phone pass. It
can prove that the beats fire, in order, with the right numbers, and it has
— repeatedly. It cannot answer the only question the timings turn on, which
is whether they *feel* right under a thumb, and it cannot show a dark-value
dither at real brightness because a desktop panel does not have the failure
mode being decided. **A number settled on the wrong panel is worse than a
number openly marked as a guess.**

## Before the phone

1. **Have a URL.** Every push to `main` publishes, and CI is green only when
   the site is serving that exact commit (standing rule 1). Take the hash
   from the run, open `https://<owner>.github.io/<repo>/version.txt` on the
   phone, and check it matches before you believe anything you see. On a
   branch, `npm run dev -- --host` and the **Network** URL it prints.
2. **Pre-register what you would change.** Write the prediction and the cut
   order down *before* the phone is in your hand, in the wave's chronicle
   entry. A tuning result decided after the fact is a preference wearing a
   measurement's coat. The standing pre-registration is below.
3. **Name the device.** Model and OS, in the finding. "It felt slow" on an
   unnamed phone is not a finding anybody can argue with.
4. **Dark room, real brightness, no night mode.** Art. 95's threshold is
   about banding in the darkest fifth of a ramp; a bright room hides it and
   a warm filter moves it.

## The walk

Every wave, whatever the wave was about. It is nine beats and takes about
ten minutes.

- [ ] **The front door.** Cold boot. Does the first screen say where you
      are and why you are going down (art. 121, `gate.cold`)? Are the verbs
      reachable with the thumb that is holding the phone?
- [ ] **The waking.** Tap through the Crossing's candles. Is a candle one
      comfortable read, or does the band want scrolling?
- [ ] **Looking.** Tap three things, one of them small and one of them at
      the far end of the room. Does every tap answer (art. 69)? Can you hit
      the far one without two tries (art. 105)?
- [ ] **A door.** Tap each door, read its sense, pick one, press the verb.
      Does tapping something else release the pick (art. 71)?
- [ ] **A whole fight.** Start it by tapping the horror. Roll, hold at least
      two, Reroll, select, Attack. Then a second turn that claims nothing,
      so End turn is exercised. **This is the beat pass** — see below.
- [ ] **A rider firing**, if the hand has one. Did its own beat teach you
      what it does, or did it go past?
- [ ] **Reduced motion.** Settings, on, then the same fight. Nothing may
      become unreadable or go silent; anything legible only while moving is
      a bug in that thing (art. 116).
- [ ] **The choosing.** With a spare in the pouch, from an ending: does the
      screen open on the hand you last took down, and is Descend one press
      when nothing changed (art. 124)?
- [ ] **The dark.** Find a room lit from below or from ahead and look at the
      darkest fifth of a wall. Banding, or dither? That is `blendAbove`.

## The beats, and the cuts — pre-registered

The fight wave measured, in a browser, at 390×844: press → settled is
**~1.8s** for a five-die ANY DICE claim and **~2.2s** with a climb; the roll
and the recast are ~630ms each; a full turn therefore carries **~3.1s of
animation** on top of the thumb's own time. It predicted the desktop demo
would run **20–30% slow in the hand**.

Every number below is in `CASCADE`, `src/content/render.ts`. **The order of
the beats is law and the durations are not** (art. 119), so this is a tuning
job and never a re-litigation.

If the hand agrees that the turn drags, cut in this order and no other:

| order | knob | now | why it is first, or last |
| --- | --- | --- | --- |
| 1 | `lift` | 180ms | ×5 dice is 900ms — the single largest block in the timeline |
| 2 | `blow` | 320ms | the longest single pause; *then, and only then* survives a shorter pause |
| 3 | `line` · `group` | 320 · 300ms | they separate a composite into its parts; cut together or not at all |
| 4 | `climb` | 350ms | the total is already legible before it finishes |
| never | `rider` | 460ms | **it is the beat that teaches the pouch.** A rider that goes by at the speed of a die teaches nothing, and a power the player cannot see land is a power they cannot price (art. 54) |
| never | `tumbles` · `land` | 2 · 90ms | without them the first die lands having never been in the air |

Cut to the felt beat, then **record before and after in one table**. A cut
with no number beside it is a preference.

## Recording a finding

The wave's entry in `CHRONICLE.md` ends with a section headed **The phone
pass**, and it says, in this order:

1. The device and the OS. The URL and the commit hash that was served.
2. What read, in one line each.
3. What lied — anything the frame said that was not what happened.
4. What dragged, with the before/after table if anything was cut.
5. **What is still owed**, named. A pass that could not settle something
   says so; it does not invent a value in its place.

If the pass did not happen, the section still exists and says **not done**,
and why. That is what the fight, threshold and look waves each did, and it
is the honest form — three waves of "not done" in writing is what got this
procedure hired.
