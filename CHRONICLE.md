# Castlebrynth — the chronicle

Every wave, as it was written when it landed. This is history, and history
stays whole: nothing here is edited after the fact, and nothing here binds.
What binds is `.claude/rules/` — the articles. What the game *is* right now
is `DESIGN.md`, which is one screen and stays one screen.

**Newest first. A wave is added at the top the day it ships**, and the day a
line in DESIGN.md becomes history it moves down here rather than sitting
where the spec should be (standing rule 2).

The split happened on 2026-08-07, in the mend's first wave. Everything below
was moved out of DESIGN.md verbatim; the only edits are heading levels, where
a section that had been nested under another wave is now an entry of its own.

---

## The headlines

The running summary DESIGN.md's Status section carried until the split. Each
paragraph is the wave under it, in one breath.

**The labyrinth leans, the collection has people in it, and the rooms are
awake.** `npm run dev` is a playable loop in a portrait browser: wake → open
one of one to three blind doors → the room behind it is dealt on the spot →
keep choosing → a region locks and the depth announces where you have arrived
→ the rest of the depth deals from that region and its encounters wake → the
Warden's door, and the keeper behind it once the key turns. Every doorway
breathes while you stand there, and seven rooms will do one thing of their own
accord if you stand there long enough. `npm test` is green: 58 files, 671
tests.

**And the tray is legible now.** The six are warm rounded pipped **bone** and a
carried thing is cold bevelled glyphed **iron**, so the two rows tell apart at
a glance rather than by a border colour; a die or a trinket that is not in play
draws its whole face set with the cost face marked where it sits; and a fight
has one running readout — `sum × line` — that is live before the press, with
every number popping off the thing that made it. **And a fight is begun by
tapping the horror**, not by bumping into the door it guards. Two sections
down: **The legible wave**.

**And two things you carry now have faces of their own.** The rolling goods
(card 93) are a new species beside the dice: carried outside the hand, taking
no slot of it, entering no combo, and rolling once inside Attack to amend what
the line came to. Two of them ship, at the rarest band there is, and **carrying
none is the normal state of the game** — which is an engineering requirement
and not a disclaimer. One section down: **The rolling goods**.

**And the depth ramps, and the build is how you keep up.** The levels wave
(cards 89–90) is the arithmetic pass the six-bone amendment left owing, plus
the growth path it left the game without: five new **levels** — talismans
that raise one line of the ladder and lower another — placed through the
ordinary drops beside found dice, armor and bonds. The principle it installs
is one section down: **The levels wave**, with the table every survival
number in this file now comes from.

**And the doors say something, and curiosity costs something.** The descent
wave (cards 49, 86–88) built the missing half of the exploration engine: the
Lots have the whole loop — perceive an intent, predict, commit, get an answer,
know more — and the Descent had commit, answer and change and was missing
*perceive* and *predict*. Two articles close it: **art. 31 as amended**, which
unparks the senses so a door leaks its region tag, and **art. 120**, the
Descent's art. 42, which lets an act carry a declared price and puts that price
in front of the press. Art. 84 gains a sentence with them: the labyrinth now
remembers some of what you refuse. One section down: **The descent wave**.

**And the frame says who you are, in his voice.** The reason wave shipped the
premise that had been sitting in `reference/GAME.md` since the beginning: a
brother, a name he keeps saying, and down as the only direction there is. The
mind wave then repealed the narrator who was saying it.

**And the game now says what it did.** The answer wave (cards 69–71, 74) took
the eleven findings of the 2026-08-06 playtest that had one root cause — *the
game does things and never says it did them* — and installed art. 118 behind
them. What that wave did, what it did not touch, and what the suite still
cannot see is one section down: **The answer wave**.

**And now it shows what it did.** The fight wave (cards 75–76) is the other
half of the same diagnosis: a claim resolved instantly and silently, so the
most interesting decision in the game passed in a single frame. Art. 119 says
a fight event resolves in **beats**, and the beats now run — the dice land one
at a time, the claimed dice lift with their own `+n`, the line names its
multiplier, each rider fires alone, the total climbs, and then the blow.
**Timings are still owed a phone.** The section at the foot of this file —
**The fight wave** — records what was settled, what was measured in a browser
at 390×844, and what a hand still has to decide.

**And you wake whole, and the tray stops lying about the card.** The fixes
wave answered a player report with three findings, one of them an amendment:
art. 55 now wakes you with **six** plain bones and a full hand, the tray names
the line a seal or the card is holding shut instead of calling the floor *the
best these make*, and a boot no longer throws the permanent ledger away when
the migration ladder hands it a snapshot with no run. One section down: **The
fixes wave**.

---

## The mend, wave 5 — road (the phase order settled · the cadence · the cleanup)

**Phase 1 goes before phase 2, and the argument is closed.** It had been
"a live argument" for six waves, which is not a position — it is an open
question, and an open question is where scope leaks in.

The reason is the repo's own finding rather than a preference: riders, bonds,
talismans, levels and wearables are all *in play*, and what is absent is
anything to spend on them. Goods without an economy is a collection without
stakes, and the thesis — *die knowing more, win because you know* — feeds on
runs that differ from each other, which the economy and more horrors buy.
Meanwhile arts 93–115 landed enough that rooms read, and a look pass over a
skeleton is phase 2's own named risk. **The honest counterweight is written
down rather than buried**: the look is what a stranger judges in the first
sixty seconds, so if the next ten players are strangers rather than
returners, this order is wrong — and flipping it is then a ruling, not a
drift.

**Depth two waits for the curve.** The instruments already exist; depth two
unlocks when depth one's numbers say growth is carrying players further, not
before.

**The cadence is six gates**, and all six already existed except the last
two: origin sentence, voice lint, thousand-run model, acceptance walk, the
`journey.md` row (art. 122), and the phone pass. The mend extended the gate
rather than inventing one, which is the reason the skeleton is trustworthy.

### The cleanup

Old garbage, named and removed rather than left to be rediscovered.

- **Three dead exports deleted**: `isOpened` (nothing read it —
  `sceneStateOf` computes `opened` inline), `roomOf` and `FightLot`.
- **Art. 67 was citing the repealed turn.** It listed FIGHT's verbs as
  *Roll, Recast, Keep all, Claim, Take back, End turn* — the vocabulary
  art. 41 replaced on the same day the article was amended. It says Roll,
  Reroll, Attack now.
- **Art. 86 still said "the bare five."** Art. 55 has dealt six since
  2026-08-06.
- **The arithmetic agent was reading the repealed start.** Its context said
  five bones against a hand of six, and said nothing about band semantics or
  the fork's declared frequency. Fixed, and it now carries art. 46's stated
  guarantee.
- **`castlebrynth-dice-v3.html` was an orphan.** It is a signed-off
  reference from card 94 that no law and no agent pointed at; the-lots.md and
  the design agent point at it now.
- **README described the repealed duel** — *"a turn may claim several"* —
  and the four notices the choosing screen can no longer reach are gone
  rather than left unreachable.

`npm test`: 58 files, 698 tests, green. `npm run build` clean.

### The phone pass
**Not done.** No device. Five waves, five sections saying so — which is the
instrument working: it is the only debt in this repo that cannot be paid by
writing.

---

## The mend, wave 4 — voice (voice.md amended · the fantasy table)

**The screens had no voice because nobody had asked who was speaking.**
Twenty-nine notices — the lock, the fought room, the fled fight, the pouch,
the card, the settings screen and the vault — were declared placeholders and
had shipped in the repealed register for three waves. A declared placeholder
is an honest debt; twenty-nine of them on screens nobody had designed a voice
for is an unasked question.

**The answer, and it is a ruling in `rules/voice.md`.** On the settings
screen and the vault there is nobody in the room: the player is holding a
phone. He has no thought about reduced motion, and a man who narrated one
would be exactly the flourish the mind wave repealed. So those two screens
answer to the universals — no narrator, no feelings, no shouting, one
candle — and to **neither mouth**. That is a new category, `plain`, and it is
kept separate from `placeholder` on purpose: one is a decision and the other
is a debt, and collapsing them would make the debt uncountable.

**Everything else on a screen turned out to want to be his already.** A
fight you ran out of, a pouch you are carrying, a card you are spending and
a lock that will not give are as much his as a corridor is; they were second
person only because nobody had looked at them since the narrator was
repealed. *"You back out of the door"* became *"I back out of the door."*
And a **readout is a label** — *sealed this turn*, *already spent*, *on*,
*off* — because it names a state, and art. 90's reasoning about a tab is the
same reasoning one level down.

**The count, which is the point.** Placeholder notices: **29 → 0**. Total
placeholders: 184 → 155, and every one of the 155 is a room beat, a look or
an origin — cards 27–29's debt, untouched and now the only thing in the
category.

**The fantasy table is standing law now** (standing rule 5). DESIGN.md ends
with every beat of `reference/GAME.md`'s opening, one row each, naming the
string or the pixel that carries it. Nineteen rows; **three say
undelivered**, and naming them is the whole point of the instrument:

- *every lie the walls told* — nothing in the depth is false and later
  corrected. The premise has a mechanic-shaped hole where it should be.
- *jokers add, spells interrupt, skills bend a roll after it lands* —
  talismans and levels add; spells and skills do not exist. Phase 1.
- *a phone game, portrait, one thumb* — the shell is built for it and
  nobody has held it.

The frame wave's finding was that "the premise existed and did not ship",
and that is a *class* of bug with no standing instrument. This is the
instrument: cheap to keep, and it turns a feeling into a checklist.

`npm test`: 58 files, 698 tests, green.

### The phone pass
**Not done.** No device. Every string this wave wrote is one a phone would
read differently from a desktop — line length under a thumb is the whole
question for a word band — so this is the wave that most wants the walk and
did not get it.

---

## The mend, wave 3 — ledger (arts 46, 89 amended · art. 125)

Four balance debts closed, and one measurement culture kept: no tuning
claim without its table.

**Art. 125 — a weight names a band, and a band is a share of finds.** The
debt was arithmetic nobody had written down. `weight` was a share of the
whole pool, so every good added made every existing good rarer, and the band
that got the most new rows got the heaviest — the catalog's effective mix had
drifted to **40 / 47 / 13** against bands declared 6 / 3 / 1. The two words
had swapped places: an `uncommon` find was more likely than a `common` one.
Fine at eight goods, wrong at thirty.

A band's share is fixed now. Adding a good to a band dilutes **that band and
nothing else**; inside a band the draw is uniform; a band with nothing left
in it deals nothing and its share goes to the bands that still have
something, which is what bounds the depletion bias to inside one band rather
than across the catalog. `pickBanded` takes **one** draw, not two — the roll
picks the band and its remainder picks inside it — so no seeded sequence
changes length under the ruling.

**The shares are 6 / 6 / 2, and that is deliberate.** A semantics ruling may
not smuggle in a rebalance, so the first shares are the effective mix the
levels wave actually tuned against, now on purpose and stable against the
next twenty goods. Per-good rarity still means what the words say: three
goods share `common` and seven share `uncommon`, so an individual common
find is better than twice as likely as an individual uncommon one.

**Art. 89 amended — the fork's frequency is declared.** It used to be a
residue of three other numbers. It is two declared numbers multiplied now:
the chance an initiator is dealt, which art. 125 makes a band, times
`GRAMMAR.forkChance`.

The load-bearing detail is **where** the chance is asked. A first cut aimed
the *draw* at the goods that can fork, which measured beautifully — 0.50 of
runs at forkChance 0.4 — and was wrong: it promoted the fork's own
initiators, so the fork was paying for itself out of art. 125's rarity bands
and one rule was quietly financing the other. Asked **after** the ordinary
draw the two compose. The roll is taken whenever a fork could form, whatever
the chance is set to, so turning the knob decides forks instead of
reshuffling the deal.

**It ships at one, and 0.17 of runs is the chosen rate.** A fork is what its
two goods *are* — sustain against consistency, build against body — so a pair
dealt and then not offered as a fork would be the game declining to ask its
own question. The lever for meeting more of them is **pairs**, and the
article says so: two `orElse` rows carry every fork in the game.

**The Zealot is audited**, and the finding is that it is not an outlier. It
was the one shipped good with no number beside it — 3000 fights a cell, bare
six-bone hand, greedy thumb:

| | bare | + the Zealot | + the Ossuary |
| --- | --- | --- | --- |
| the Gnawing | 0.576 | 0.848 (**+0.272**) | 0.799 (+0.223) |
| the Warden | 0.138 | 0.421 (**+0.283**) | 0.454 (+0.316) |

It sits inside the band the Ossuary already set — under it against the
keeper, a little over it against the ordinary teeth. Art. 54 is answered the
way the comment always claimed: the condition prices it, and the table is
the proof rather than the claim.

**Art. 46 says what it guarantees**, of the hand the game actually has. Of
six dice, every possible hand leaves a pair or a run of three, tight at ×2.
Two consequences the article now states rather than leaving to be
rediscovered: it is the **card** and not the values that can leave a turn
with nothing, and a **wound** is what takes lines away — three lines of the
ladder leave a shortened hand's reach entirely.

**PAIRISH keeps the full house**, deferred twice and ruled now. Art. 65 says
an intent attacks the plan; a SEAL that leaves the best pair-shaped line
open is one the player routes around without changing anything, which is not
attacking a plan at all.

**Two tests were wrong rather than the code.** `dead-press` pressed a
*snapshot* of the tray instead of re-reading it between presses, which the
shell does — art. 89's fork is exactly the case that makes it load-bearing,
since taking one half withdraws the other half's verb. And the pre-rolling
transcript's **fights** half still matches byte for byte, all 240 of them,
which is the half the seam owns; its **depths** half is a record of a *deal*,
and the deal changed on purpose, so it is kept as it stands with a note
saying why rather than regenerated into agreement with whatever the code
now does.

`npm test`: 58 files, 698 tests, green.

### The phone pass
**Not done.** No device. Nothing in this wave is a number a phone settles —
every claim here is distributional and CI can hold it — but the rule is that
the section exists and says so.

---

## The mend, wave 2 — thumb (arts 37 amended, 123, 124)

**Green means served.** `pages.yml` documented its own defect honestly and
kept shipping it: `deploy-pages` polls for ten minutes — a hard ceiling in
that action, not a default — then gives up and *cancels* a deployment that
lands anyway. Three runs went red on 2026-08-06 while the site published
correctly each time, and a signal that cries wolf gets ignored, and then a
real failure walks past it.

The fix is three lines of policy and one of them is the whole thing.
`npm run build` stamps the commit into the artifact as `dist/version.txt` —
a rollup asset rather than a file written to disk, so it goes wherever the
bundle goes; `dev` when there is no commit to stamp. `deploy-pages` gets
`continue-on-error: true`, so its poller stops being the verdict while
staying the thing that does the work. And a **verify** step polls the known
Pages URL for `/version.txt` until it equals `$GITHUB_SHA`, forty attempts
at fifteen seconds. It polls the *known* URL rather than the deployment
step's output, because a cancelled step may not emit one — which is the
entire reason the step exists.

No `@types/node` was added for `process.env`: the one shape used is declared
in `vite.config.ts`, because a build-time environment variable does not
justify a dependency (CLAUDE.md).

**The phone pass is a ritual now, and it is still not performed.**
`.claude/skills/phone-pass/SKILL.md` is the first skill this repo has hired,
and it was hired on its own terms — the same procedure re-explained until
its absence was the recurring bug, which is three waves closing with *the
hand pass is still owed*. It carries the nine-beat walk, the pre-registered
cut order for the beat timings (`lift` first, `blow` second, `rider` never,
because a rider that goes by at the speed of a die teaches nothing), and the
shape a finding takes. **This wave did not perform it. There was no phone.**
Recording that is the honest form and is what got the skill hired.

**Art. 123 — the threshold stands.** Flagged as a straw default when it
shipped and never vetoed, which is an argument nobody closed rather than a
ruling. Boot lands at the front door, always; Continue is one press back to
exactly where you were. The alternative — booting into the run with the
threshold reachable *from somewhere* — is not adopted because nobody has
ever proposed the somewhere, and finding one would mean amending art. 67 as
well. The cost is one press per reload, and it is accepted.

**Art. 124 — the order is the interface.** The choosing screen was a form:
it asked the player to pick six dice out of the whole pouch before Descend
would light, charging six presses for the case where nothing has changed
since the last descent. Art. 60 already said the pouch is ordered and the
hand is its first `handSize`, so the screen draws *that* — hand above a
rule, spares below — and the only move is a swap, staged tap-tap-Swap in the
vocabulary a claim already uses (art. 72). Four consequences:

- **Descend is one press when nothing changed.** The order carries last
  run's hand for free, so there is nothing to seed and nothing pre-marked.
- **Identical spares stack** (`bone ×4`) and individuals never do. The test
  is `originOf`, not a flag, because that is already what makes a good an
  individual (arts 86–87) — so a good given an origin tomorrow stops
  stacking without anybody remembering to come back.
- **The word band never restates a standing truth.** A tap on a die whose
  line is already up answers with the mark moving. Draw it, do not name it.
- **Nothing can be half-made**, so `choose.full`, `choose.short`,
  `swap.none` and `swap.locked` are deleted rather than left unreachable.

The two decisions live in `src/shell/screens/choosing.ts` rather than in
`main.ts`, for the reason `strip.ts` exists: a question the harness cannot
ask is a question CI cannot answer. `stacked` and `swapped` are pure and
have eleven tests.

**The fled keeper has a body** (art. 37, amended). Card 95 made every fight
begin by tapping the horror and left one exception: the keeper stands in no
socket, so a player who ran out of its fight came back to a hall with
nothing in it, and the only way back in was the door's own Fight verb — the
last door-fight in a game that had abolished them, reachable exactly one way.

Art. 37's two clauses are untouched. What is added is what follows from them
once the player is standing in the hall with the keeper up: it is drawn at
the far end, it answers a tap, it shuts every door in the room while it is
up, and the verb is summoned by looking at *it*. **Standing in no socket was
never a claim about having no pixels.**

The proof is a type. `WayOn` lost its `fight` member, so a door-fight is now
inexpressible rather than merely unused, and `wayOn` lost the parameter that
carried it. `RoomBook.tappables` gained `done` for the same reason `socket`
already had it — one room's own tappables depend on what has happened in it.

Two things the harness taught, both kept: `things()` was reading a room's
tappables without `done` and so could not see the keeper at all; and
`walkDepth` now **looks again after pressing**, because a press can put
something in the room. A thumb does that without being told.

`npm test`: 58 files, 687 tests, green.

### The phone pass
**Not done.** No device. The walk in `.claude/skills/phone-pass/SKILL.md` is
written and the beat timings' cut order is pre-registered against it;
`blendAbove` is still a guess at a fifth and the numbers in `CASCADE` are
still the desktop demo's. Nothing was changed in their place, because a
value settled on the wrong panel is worse than a value openly marked as a
guess.

---

## The legible wave (cards 94–95)

Two playtest complaints from 2026-08-06, and neither of them moves a number.
Card 94: *"I have no idea how to tell core die apart from item die. The
descriptions of special die are not clear. I can't tell what item die are
doing."* Card 95: *"I don't like that you have to click on the door and try to
go through it to initiate the fight."*

Signed-off reference for card 94: `reference/castlebrynth-dice-v3.html`, landed
with this wave. It wins ties about intent.

### The two materials, and the glyph set

The six and the carried things were the same 42px box in two border colours,
and a border colour is not a material. They are two **objects** now.

**Bone.** A warm ramp — six steps from `hsl(26 22% 17%)` to `hsl(44 46% 90%)`,
with the scar at `hsl(8 52% 42%)` past the end of it — a rounded body that
fills its square, pips, and the near corner lit. **Iron.** A cold ramp from
`hsl(220 18% 13%)` to `hsl(200 34% 84%)`, a bevelled octagon that cuts its
corners away, and a **glyph per face kind** rather than pips.

| kind    | glyph              | word              | ink                  |
| ------- | ------------------ | ----------------- | -------------------- |
| `block` | a shield           | `turns {n} aside` | cold `hsl(202 44% 66%)` |
| `add`   | a plus             | `+{n}`            | gold `hsl(40 62% 64%)`  |
| `per`   | a plus, framed by four corner dots | `+{n} per die` | gold |
| `cost`  | teeth              | `bites {n}`       | red `hsl(8 56% 58%)`    |
| `null`  | a bar through dull metal | `nothing`   | — nothing is claimed |

Everything above is **data**, in `src/content/faces.ts`: 16×16 grids of indices
into a ramp, never colours (art. 100). `src/shell/faces.ts` paints them. Three
consequences and each is the article — a drawing cannot fall out of palette,
one drawing lights two ways by swapping the ramp under it (art. 115: a claimed
bone lifting, a trinket landing, a null gone dull), and readable size is a
property of the drawing rather than of whatever is drawing it.

**The bar was that the two rows read apart with the screen upside down**, which
a colour swap alone does not pass — so the silhouette moves as well as the hue,
and `test/faces.test.ts` asserts the silhouettes differ rather than asserting a
hue. Once they do, a **dashed hairline** is the whole separator the tray needs.
No heading, no label.

**Two departures from the reference, and both are corrections rather than
disagreements.** The pips are one pixel right and one down of the demo's: at
three device pixels to an authored one the demo's block sits a pixel and a half
left of the body's centre, and a die with its pips shoved into a corner reads
as a broken die. And a `block` pops a bare number rather than the demo's `⛊`,
because U+26CA is not in the default serif on either mobile platform and would
render as a fallback box on the phone the tuning has to be settled on — the
shield is still there, drawn rather than typed, on the face the number pops off.

### A thing shows its faces

art. 54 asks for declaration on inspect, and **a sentence is not a
declaration**. A die at rest was a hollow box: the pouch held seven identical
boxes, and the choosing screen — whose entire job is telling dice apart — drew
every die as its first face, so a plain bone, the pusher and the careful all
rendered as a 1 and the best die in the game advertised itself as the worst.

A thing that is not on the table now draws its **name and its whole face set**,
in the order a roll indexes them, with the cost face **marked where it sits**
(the scar, plus `costs {n}` under it) and every trinket face wearing its
plain-word label coloured by kind. It is not an inspect button and not a
tooltip — art. 68 abolished both — it is what the thing looks like when it is
not in play, and the tap still answers in the word band like every other tap.

Carried trinkets are readable in the **pouch** now, not only in a fight, which
was the one place nobody has time to read six faces.

### One vocabulary, three places

The tray caption, the inspect's face labels and the word band all come out of
`faceSays`, and `test/faces.test.ts` asserts the other two *contain* what it
says rather than that they happen to agree. The number goes inside the words
(`turns {n} aside`, filled from the good's own face) so a retuned face cannot
drift off its own description.

`READOUT.nothing` moved from `—` to `nothing`, which amends card 93's
"draw it, do not name it". That card was right and its argument is now carried
by a pixel: the null is *drawn*, as a bar through dull metal. What is left is a
caption, and there an em dash is not the absence of a word, it is an unreadable
one.

### Where the number came from

**Before the press:** each carried thing's loaded face is captioned in the tray
at all times. The face was never rolled at the moment of pressing — a turn's
amend lot is a pure function of seed, step and turn number — so `loadedFaces`
*reads* it, and `rollAmends` is written on top of that call so there is one
statement of which face and no second one to drift. It is art. 42's promise
said about a carried thing: the number is on the frame from the top of the
turn, and choosing is planning. **It moves no number and changes no odds; it
changes what a player can know while deciding, which is the point of the card.**

**One readout, two boxes: `sum × line`**, live before Attack. `attack` left the
totals row and the claim line kept only the half the boxes cannot carry — a
selection that fits nothing, and a line that is on the table and shut. There is
exactly one running number in the fight.

**The beat order is art. 119's own, unchanged**, and the score row reads it:

| beat | what moves | timing (`CASCADE`) |
| --- | --- | --- |
| `lift`, per claimed bone | the die pops `+n` gold on itself; the sum box ticks | 180ms apart |
| `bond` | the ghost joins the sum, in its own moment | 460ms |
| `line` | the multiplier box lights, the line's name beneath it | 320ms |
| `rider` | one at a time, in the band | 460ms |
| `climb` | the two boxes **collapse into the blow** — one number, caption `the blow`, multiplier dark | 350ms over 7 frames |
| `amend`, per fired trinket | it pops **its** number on itself, coloured by kind | 460ms |
| `strike` / `struck` | the blow, and the frame's one gesture | 320ms |

Nothing is decided inside an animation, the outcome is computed at the press,
and with reduced motion the whole sequence collapses to its settled state — all
three by construction, because the beats are art. 119's and this wave only
reads them. `test/beats.cascade.test.ts` asserts the readout lands on
`resolution.harmDealt` for every line, with and without carried goods, in
motion and still.

**Why the caption and the pop split the work:** the caption is the standing
explanation, the pop is only ever the amount. That split is why a trinket never
needs a log line, and it is what makes the mechanic learnable by a player who
was never told.

### The two rejected scoring shapes

Recorded so neither is rediscovered. **v1** threw fly-away numbers that left
their source and vanished — the number moved and the reason evaporated. **v2**
wrote a persistent line-by-line receipt — correct information, wrong shape:
too slow, and it read as a spreadsheet. **v3 is the structure**: attribution is
**spatial**, and there is exactly one running readout.

### The block readout: what was found

The wave asked which of two it turned out to be. **A block pops cold on the
thing that rolled it and does not move the readout**, because it does not add
to the blow — and that is what shipped, without the second readout the card
held in reserve.

The honest report: this was settled in Chromium at 390×860 and **not in a
hand**, so it is the same class of finding as the fight wave's timings. What a
browser can show is that the beat is not silent — the iron lights, the number
rises off it in cold, the caption under it already says `turns 6 aside`, and
the band says the sentence — four marks for one event, three of which stand
still. What it cannot answer is whether *the readout not moving* reads as
"nothing happened" to a thumb. If the phone pass says it does, the fix on file
is a second small readout for what is turned aside, and **not** folding it into
the blow: a block is not damage and a readout that pretended otherwise would be
lying to make itself busier.

### A fight is begun by tapping the horror (card 95)

Tap the horror → **FIGHT** on the strip (art. 68's own law, art. 66's plain
verb). Press it and the fight opens exactly as before: art. 30 untouched, no
battle screen, still the room with the thing come close. Every door of a room
with something standing in it offers **no way through**, and its look says
why — *Something is in the way* — which names nothing and points at nothing
(art. 3) and does not have to, because there is only ever one thing it could be
about and that thing is on the frame (art. 118's third clause).

Two consequences fell out, and both are the article rather than the scope:

- **A fight has no door in hand.** The tap that summons its verb is the tap
  that releases a picked door (art. 71 as strengthened), so a fight is won
  standing in the room and the way on is chosen afterwards like any other
  room's. A crossroads with teeth used to push the player through whichever
  door they had bumped into; both halves of art. 31 survive now instead of one.
- **No door opens when a fight starts.** That was the world remembering
  something that had not happened — a defect card 31 had already noticed and
  made a Warden-shaped exception of. A door opens when it is walked through, in
  every room including the hall.

So a beaten horror **leaves the room**: no prop, no tappable, one candle saying
what happened (art. 70). That state was unreachable before, because winning
walked you out before you could stand in it. Its deed is `HORROR_DOWN`, the
keeper's `WARDEN_DOWN` said one floor down, written against the *instance* so
two copies of one Lair keep their own (art. 82).

**The keeper keeps its door.** art. 37 makes it the door's own, it stands in no
socket, it is not in the hall until the key turns, and the ceremony that wakes
it is already a verb pressed about a thing — the lock. Recorded as a known
edge: a player who flees the Warden and returns re-enters through the hall
door's Fight verb, because the keeper has no body standing in the hall to tap.
Giving it one is a body card, not this one.

**Unchanged:** fleeing pauses the fight in the room and it is there when you
come back (arts 41, 63); the horror gates the way on until it falls; the
fight's own loop does not move. **No ambushes** — a fight that begins on entry
with no verb pressed is not a QTE and art. 2 does not forbid it, but it is a
separate card and is not in this wave.

### One defect found mid-build, by the harness

`fightSummoned` first asked only whether the horror had been looked at. The
summons is knowledge and lives on the ledger, so it survives everything —
including the thing it was about — and FIGHT stayed on the strip after the
horror fell. A press that cannot change anything is art. 118 exactly, and
card 74's screen harness caught it before a human could. The verb goes with the
thing now.

### Manual, at 390×860 — and what it is not

Driven in Chromium at 390×860 at device-scale 2, through the real front door.
Confirmed: the two rows tell apart at a glance and the pips read at 32px; a
guarded door answers *"The draught off it is wet. Something is dripping a long
way in. Something is in the way."* and offers no verb; tapping the horror puts
Fight on the strip; the fight opens; a turn lands and the horror goes to
270/290; **Run** backs out and **Fight** resumes at 270/290 with the card as
spent as it was left; the score row reads `19 × 1` live before Attack and
collapses to `21 · the blow` with the multiplier dark; no console errors; no
horizontal overflow anywhere.

**This is not the hand pass, and the hand pass is still owed** — the same
sentence the fight wave wrote, for the same reason. A headless browser at phone
dimensions can prove the marks are there and the numbers are right. It cannot
answer whether a cold pop that moves nothing reads as an event, or whether the
face labels are readable at 24px on glass. Both are on file above rather than
quietly adjusted.

The win-and-stay-in-the-room path was verified through the screen harness
across sixty seeds rather than by hand: the bot's greedy policy dies to a
290-health Gnawing long before it wins one. `test/hinge.summon.test.ts` asserts
the deed is written, every door in the room gives, the socket stops offering
anything to tap, the room says one line about the fall, and FIGHT is gone.

### What this wave did not touch

No law changed — arts 30, 54, 66, 68, 70, 113 and 119 carry all of it. No new
screens. No change to the ladder, the card, the three presses, the rolling
goods' faces or values, or any card 89 tuning number. No new horrors. Cards
80/81 stay deferred.

`npm test`: 58 files, 671 tests, green.

---

## The rolling goods (card 93)

**A species of good that has faces.** It is carried outside the hand, takes no
slot of it, enters no combo, and when you attack it lands and **amends what the
line came to**. You cannot score a seven-run — but you can score a pair and
have the thing throw a +2.

**No law changed and none was needed.** Art. 53 already lets a talisman act at
score time, so a rolling good is a talisman with a face; art. 49's five axes are
untouched, and the noun is the reference demo's own (**trinket**) rather than a
sixth axis. Arts 41, 54, 87 and 119 all apply as written.

**There is no new press.** Art. 41's three presses stand exactly as they are and
a rolling good resolves inside Attack, as a beat in art. 119's cascade. That was
measured, not assumed: an optional *throw* press was tested at bite costs from 6
to 30 and always-throwing dominated every time, because the upside compounds —
ending a fight sooner removes *every* future incoming turn — while a health cost
is a flat subtraction. A press you always press is what art. 41's amendment
repealed multi-claim for. **The decision is which goods to carry**, and the turn
stays simple.

### It is an add-on, and that is an engineering requirement

- **Zero rolling goods is the normal state.** The waking hand carries none, most
  runs carry none for most of their length, and the two that ship are dealt at
  the rarest band the boon pool has.
- **No fight, band, test or tuning number assumes one.** Card 89's bands stand
  exactly as measured, and the *without* column of every row below is the number
  card 89 published.
- **Deleting the content deletes the mechanic.** `src/content/trinkets.ts` is
  the species; the engine's socket (`src/lots/rolling.ts`) is a no-op when
  empty. No dead branch in the fight, no empty row on screen, no orphan test.

**The flexibility test, asserted rather than eyeballed.** Carrying none draws no
randomness — not *draws and discards*, which would silently change every fight
for every player carrying nothing. It is checked twice over:

- a lot that **throws when it is drawn from**, handed to `decide` with an empty
  company, and a draw-counter proving the stream is left where it was found;
- `test/fixtures/pre-rolling.json`, a **transcript of the build before this
  wave**, taken on the commit before it and never regenerated: every turn's
  four numbers across two horrors, three hands and forty seeds, plus a hundred
  and fifty whole depths walked end to end. The fight half is held to the stream
  byte for byte. The depth half is dealt from a catalog with the two new
  encounters taken back out, and matches room for room, good for good, death for
  death — which is *deleting the content deletes the mechanic*, checked.

The roll comes off a **third** turn lot. Art. 41 allows two castings, so casting
number three is a stream nothing else in the game draws from: the hand is thrown
from exactly the stream it always was, by construction rather than by care.

### The faces

Four kinds and a cost face, authored as data so a fifth is content.

| kind | what it does |
| --- | --- |
| `block N` | turns N aside from the incoming hit |
| `add N` | N more damage |
| `per N` | N **for each die in the claim** — pays a pair twice, a full house five times |
| `cost N` | it bites you (arts 54, 86) |
| `null` | it did not fire |

**The nulls are the feature, not filler.** They are what keeps a rolling good
from being flat power, and a thing that fires every turn is a number on the
body — which is a wearable (art. 47), not a thing that rolls. Every rolling good
carries **at least two nulls and one cost face**, and the audit
(`auditTrinket`) bites on one that does not.

Two things about the kinds are worth stating because they are decisions rather
than arithmetic. A `block` stands **beside** armor rather than inside it, so a
corroding intent (art. 47) eats the body stat and not a face that came up at
score time — it is what makes a rolling good a different answer from a wearable
rather than a worse one, and it is declared on inspect. And a `cost` joins
art. 86's cost faces in `hurt`, which is what makes the death it causes read
like any other: the transcript says `cost`, and the Book keys on `cost`.

### The two that ship

| good | faces | origin |
| --- | --- | --- |
| **the tin saint** | block 6, block 6, block 10, —, —, cost 4 | somebody who lived by not being hit |
| **the sliver** | 2 per die, 3 per die, hit 6, —, —, cost 5 | somebody who sharpened one trick until it cut |

Art. 87 holds: each explains its rules in one sentence, in the amended register,
and neither would ship without it. Both wear a plain noun before they are
anything (art. 111), one two-word verb, a candle where they lie, and a line when
picked up. Both write the refusal flag a piece of luck left lying already writes
(art. 84).

**No third.** A third whose sentence was *another one of those* would be a
fourth face on one of these rather than a good.

### The rows, beside the unchanged bands

`test/report.ts`, 2000 fights a cell, the greedy thumb. These are **rows, not
bands**: nothing is tuned around them, and the *without* column is card 89's own
published number in every one.

| hand | horror | carried | without | with | marginal |
| --- | --- | --- | --- | --- | --- |
| the waking hand | the Gnawing | the tin saint | 0.591 | 0.674 | **+0.084** |
| the waking hand | the Gnawing | the sliver | 0.591 | 0.671 | **+0.081** |
| the waking hand | the Gnawing | both, at the cap | 0.591 | 0.727 | +0.136 |
| the waking hand | the Warden | the tin saint | 0.141 | 0.170 | +0.028 |
| the waking hand | the Warden | the sliver | 0.141 | 0.164 | +0.022 |
| the waking hand | the Warden | both, at the cap | 0.141 | 0.231 | +0.090 |
| the returning hand | the Gnawing | the tin saint | 0.815 | 0.833 | +0.018 |
| the returning hand | the Gnawing | the sliver | 0.815 | 0.861 | +0.046 |
| the returning hand | the Gnawing | both, at the cap | 0.815 | 0.897 | +0.083 |
| the returning hand | the Warden | the tin saint | 0.321 | 0.351 | +0.030 |
| the returning hand | the Warden | the sliver | 0.321 | 0.380 | +0.059 |
| the returning hand | the Warden | both, at the cap | 0.321 | 0.448 | +0.127 |

That is the **armour band** — the Rusted Plate measured +0.094/+0.044 and a good
traveler's bone +0.141/+0.000 — and each of them is a third of what an unwhiffed
multiplier face measured. Two at the cap sit about where a good bone sits, which
is what a pair of rare finds should be worth. The tin saint is worth most to a
body with no armour on it and least to one already plated; the sliver is the
opposite, because `per` rises with the hand.

**The cap is two, and it is the number most likely to break things.** Three took
a weak hand from 0.412 to **0.825** — a different game, not a tuned one. It is a
guard rather than a wall (exactly two ship, so the catalog cannot reach past it)
and it lives on the company handed to the engine, so a caller cannot lose it.

### Reading them, and the beat

**Inspect declares every face and its number**, from birth — card 72's
declaration duty applied to a brand-new species, so the rider defect (a power
that fired without ever having said it could) is not repeated. A tap answers:

> the sliver · rolls 2 per die 3 per die hit 6 — — cost 5 · One cut, worked
> until it was the only thing he had, and it cut deeper the more he threw at
> it. It cut him too, in the end.

A null is **drawn** rather than named, because *nothing* is what it says and a
word for it would read as a fifth kind.

**They render only if carried.** No empty row, no placeholder — a run carrying
none has nothing there, and nothing on screen hints that something is missing.

**The cascade gains a beat** (art. 119). The claimed dice lift, the line names
its multiplier, the riders fire, the total climbs **to what the line came to** —
and *then* each rolling good that fired says so and moves the number, one at a
time, before the blow. Watching them land after you have committed is the whole
feel of the species. A face that did not fire gets no beat: a null is the absence
of an event, and each beat says one thing. Reduced motion collapses it to the
settled total like every other beat, and the settled frame is asserted against
the fight the engine advanced to at **every face of every good**, singly and at
the cap.

### Rejected, one line each

- **Guard faces inside the six** (−0.153): a face that guards cannot combo, and
  the ladder is superlinear, so spending a die's face on defence costs more than
  the defence is worth.
- **Unclaimed dice guarding** (−0.001): no decision — the dice that fit nothing
  were never going to do anything, so guarding with them is a rebate rather than
  a choice.
- **The optional throw press**: always-throwing dominated at every bite cost
  from 6 to 30, so the press was a button you always press.
- **A multiplier face**: measured +0.254 at a weak hand, near double a good bone
  and about what the unaudited Zealot is worth. It is legal here *only* because
  it whiffs, and it is not authored — so the union holds no branch for one.

### Two harness bugs this wave surfaced rather than wrote

Both fell out of the boon pool gaining two rows, and neither is about the game.

**The reference hand was decided alphabetically.** `medianCarry` ranked whole
hauls by how many runs held exactly that composition. There are hundreds of
possible two-good hauls, so at four hundred seeds the winner was a two-vote lead
and the tie behind it broke on the id string — and two compositions in that tie,
`bone.leech + bone.pusher` and `bone.pusher + the plate`, measure **0.205 and
0.353** on the road. The published ratchet row hung on which id sorted first.
A haul is still taken *whole*, from a run that had one; which whole haul is now
chosen by how **representative** it is — the summed frequency of its own goods
across every haul of that size — so a composition made of what runs commonly
find beats two rarities that landed together twice, and the answer stops moving
when the catalog grows. With it fixed the returning hand is a bone and the plate
again, and the ratchet measures 0.163 → 0.373 at 400 seeds.

**Both halves of the Sisters in one run was a coin toss.** One run in about two
thousand holds the pair, so the *existence* count passed on luck and two extra
boon rows were enough to tip it from seen to unseen. The structural claim — the
two bands are disjoint and in order, so finding one half means walking for the
other — is now checked structurally instead of sampled for.

### What this wave did not touch

The ladder, the card (art. 63), the three presses (art. 41), any card 89 tuning
number, and card 90's six goods, which stay exactly as they shipped — this is a
new species beside them, not a migration. No new screens, no new interaction
type, no new collection axis. Cards 80/81 stay deferred.

---

## The levels wave (cards 89–90)

**The depth ramps, and the build is how you keep up.** The first rooms are
winnable with the bones you wake holding. The deep rooms are not. Nothing
specific is ever the key — no fight, door or number requires a particular
good — but the gradient assumes *growth in general*, and growth is
structural rather than mandated: drops happen because rooms happen, and the
pouch survives death (arts 11, 60), so even a losing run deposits the
material the next one descends with. **You fail, you start over, you go
further.**

Three reference hands govern every band, and two of the three are
**derived** rather than asserted — `test/report.ts` walks a thousand seeds
of the real drop machinery and reads them off it:

- **The waking hand** — six plain bones (art. 55). Governs the first rooms.
- **The found hand** — the median accumulation at mid-depth. Governs the
  region uniques.
- **The returning hand** — the median haul a *whole failed run* deposits.
  The ratchet. Governs the Warden. (**The taught hand** is the same thing
  twice: what two whole failed runs leave, which is what DESIGN.md has meant
  by *taught* since the company wave.)

**The shape is law; the numbers are tuning.** A monotone gradient down the
depth, a real wall at its end, a ratchet across runs. For the record, so
nobody relitigates it: the five-bone game *had* this gradient, measured
(0.134 bare → 0.936 taught against the Warden); six bones at the waking
flattened it (bare 0.784 against the Gnawing). This wave restores the
gradient at the six-bone baseline — restoration, not invention.

**Two framings tried and retired on the way here.** Tuning that *expected*
levels, with guaranteed offers — retired, because it forces pickups and
art. 4 makes every good optional treasure. And tuning whole at the bare
hand — retired, because it makes the build decorative, which is the exact
defect the six-bone amendment introduced.

### The levers moved, and their final values

No law changed. Only the levers card 89 named were pulled.

| lever | was | is | why |
| --- | --- | --- | --- |
| the body (`YOUR_HEALTH_AT_WAKING`) | 26 | **64** | a body of 26 is dead on the Gnawing's fourth intent whatever it does, so no fight could reach a fifth turn |
| the Gnawing's health | 150 | **290** | a six-to-seven-turn fight won three times in five |
| the Marrow | 120 | **310** | at or above the ordinary teeth (arts 78, 83) |
| the Silt Mother | 112 | **290** | the same, and her `bleed` 4 → 5 |
| the Kindled | 128 | **310** | the same; `bleed` 4 → 6, `hunger` 12/14 → 30/34 |
| the Warden's health | 168 | **380** | the wall. Script unchanged but `FLENSE` 4 → 5 and `WAIT` 16 → 38 |
| the plate's armor | 3 | **3** | not moved: the fork un-inverted from the other side, and armour 2 and 3 measure identically against this script |
| the Pusher's faces | 1,5,5,6,6,6 | **unchanged** | every *higher* variant measured worse; it is the wave's control |
| the Careful's faces | 2,3,3,4,4,5 | **3,3,3,4,4,4** | the same 21, squeezed onto two faces |
| the Runner's faces | 2,3,4,5,6,6, **both** biting | **3,4,5,5,6,6, one** biting | it measured *below a plain bone*; two prices on the only two faces worth reaching for is not a decision |
| the cost faces (`THE_PUSH` / `THE_BLEED`) | 3 / 2 | **7 / 5** | 11% and 8% of a body of 26; the body is 64 |

Two numbers that were **not** on the list and are now a smaller share of a
body than they were: the priced acts (art. 120, 1 and 2 health) and the
Leech's heal (2). Both are noted for Status rather than moved here.

### The table

One row per reference hand, at full health, `test/report.ts` over 2000
seeds per cell, the greedy thumb (`test/policy.ts`). Every number in this
section comes from that one model.

| hand | Gnawing | Marrow | Silt Mother | Kindled | **Warden** |
| --- | --- | --- | --- | --- | --- |
| the waking hand — 6 plain bones | **0.591** | 0.475 | 0.408 | 0.409 | **0.141** |
| the found hand — + the Careful | 0.653 | 0.526 | 0.412 | 0.423 | 0.124 |
| the returning hand — + the Pusher, + the plate | 0.770 | 0.700 | 0.720 | 0.711 | **0.314** |
| the taught hand — + the Careful, + the chain | 0.807 | 0.728 | 0.727 | 0.733 | 0.291 |
| *the gate hand* — 2 bones, the plate, 2 levels | — | — | — | — | **0.485** |

**The ratchet**, whole-depth, 1000 seeds a row, coin-flip doors, each run
carrying what the last one's median whole failed run deposited:

| run | reaches the last door | finishes the depth |
| --- | --- | --- |
| 1 (a first waking) | 0.173 | 0.008 |
| 2 (on run one's haul) | **0.335** | **0.047** |
| 3 (on two runs' haul) | 0.352 | 0.045 |

**The fight, as a shape** — the thing card 89 was called for. Waking hand
against the ordinary Gnawing: **6.81 turns** mean; the script comes round in
**79%** of fights; BELLOW is reached in 95% of them and **lands in 83%** of
those. Turns per fight across a whole depth: **5.73**.

**The ladder's top is no longer decorative.** Top five lines by share of
claims made: any dice 14.2%, triple 13.0%, full house 12.0%, pair 11.8%, two
pair 11.6% — flat, where before the fight ended before the card could be
spent broadly.

**Median finds**, reported and never mandated: **1** at mid-depth, **2**
standing at the last door.

**Wall-clock**, at the shipped `CASCADE` timings: an ordinary Gnawing fight
is **21.5s of beats**, and **~46s** with a thumb allowance of 1.2s a press
and three presses a turn. The Warden is 22.8s / **~48s** at the waking hand
and 25.7s / **~55s** at the taught one. Budgets were 75s and 120s. **The
device is a model, not a phone** — this is the beat script summed, and the
fight wave's note stands: the timings are still owed a hand.

### The levels, and what each one bends

A level raises one line's multiplier by one and lowers another's by one.
Both halves are art. 54: the lift is the power and the dull is what it pays,
and it is the only version of a level that changes a *decision* — a
whetstone that lifts the quad and dulls the pair makes you want a different
die. Cap: **+2 tiers of lift per line**, declared on inspect.

| level | sharpens | dulls | L1, waking hand vs the Gnawing |
| --- | --- | --- | --- |
| the counting cord (amended) | run of 3, 4, 5 | quad | **+0.041** |
| the beggar's bowl | any dice | quint | +0.034 |
| the surveyor's chain | run of 3, run of 4 | two pair | +0.033 |
| the whetstone | quad | pair | +0.028 |
| the notched stick | two pair, three pairs | run of 4 | +0.022 |
| the widow's ring | full house | triple | +0.021 |

**L2** — two levels together: cord + bowl **+0.080**, cord + chain (which
lands exactly on the cap for the run of 3 and the run of 4) **+0.064**. A
level is worth about a third of a traveler's bone, and two are worth about
one. Nothing here bends nothing, which is card 82's test.

**And the Zealot, placed at last, is worth +0.260** — three times any level
and twice any die. Its price is its condition (every die of the hand spent
in a claim) and its rarity, and that is the whole of it. It is reported here
because it is by a wide margin the strongest good in the game and nothing
audits it; the honest next move is a declared cost or a fork, and neither
was this wave's to make.

### The bands: hit, and missed

| band | asked | measured | |
| --- | --- | --- | --- |
| waking vs the ordinary Gnawing | 0.55–0.65 at 5–7 turns | **0.591 at 6.81** | hit |
| found vs the uniques | 0.40–0.55 | **0.412–0.526** | hit |
| uniques at or above the Gnawing | ≥ 290 | 310 / 290 / 310 | hit |
| the wall: waking vs the Warden | ≤ 0.15 | **0.141** | hit |
| escalation fires | majority | **0.79** | hit |
| the fork un-inverted | within a few points | plate **+0.124**, the Runner **+0.084** — four points apart, from ten | hit |
| wall-clock | ≤75s / ≤120s | ~46s / ~55s | hit |
| BELLOW lands | ≥85% of full fights | **0.83** | **missed by two points** |
| the gate: returning, taught, vs the Warden | ≈0.5 | **0.31 / 0.29** (0.485 at the gate hand) | **missed** |
| the ratchet: a first run finishes | 0.03–0.10 | **0.008** (run two: 0.047) | **missed** |

**Why BELLOW misses, and what it would cost to hit.** The denominator is
honest: *fights that reach the turn the telegraph is scheduled for*, not
*fights that outlive the whole script* — the second is true by construction
of any fight that has had a seventh turn. The 17% that reach turn five and
never see it are fights where a strong roll kills the Gnawing on that turn.
The rate is a function of the Gnawing's health alone, and it crosses 0.85 at
about 300 — which takes the win rate to 0.53 and out of the band above it.
Two points of tell against six points of the wave's headline band is a trade
that was made deliberately.

**Why the gate misses, and it is the wave's most useful finding.** The gate
*is* reachable: two bones, the plate and two levels beat the keeper 0.485 of
the time. What does not reach it is the **median** haul of a whole failed
run, which is **two goods**. And the two halves of a build are not worth the
same thing at that door: measured against the Warden, a traveler's bone is
worth about +0.01 and the plate about +0.17. The reason is art. 63 — the
card is the ceiling, so a better hand raises what a fight can deal by about
a sixth, while armor buys *turns*, and turns are what let the card be spent
at all. So the gate is a question about **what the drops deal**, not about
the keeper's numbers, and the lever is content density rather than any lever
card 89 named.

**Why a first run finishes 0.008, and why the two bands cannot both hold.**
This is arithmetic and not tuning. A run meets one to three fights on the
road and the wave's own band puts each at about three in five; a won fight
leaves the winner on **a third of their body** (median 21 of 64), because at
a 0.6 win rate the winner is by construction nearly dead; and the wall is
≤0.15 at *full* health, which is about 0.02 at a third of it. Multiply those
and 0.008 is what comes out. **The per-fight band and the 0.03–0.10
first-run band are incompatible at the current mercy budget** — the missing
lever is health handed back between fights (art. 40's two tiers, or a second
mercy band), and neither is a lever this wave was given. Run two lands *in*
the band at 0.047, which is the ratchet doing its job: what the wave
actually asks for — *materially above a first run's* — is a factor of six.

### The acceptance test, performed

`test/acceptance.test.ts` walks it rather than asserting it. From a fresh
vault, seed 2: the run reaches the last door at step 8, having fought the
Gnawing (six turns) and picked up **the surveyor's chain and the counting
cord** off two floors, arrives in the drowned, turns the key, and dies to
the Warden in five turns. **The death deposited**: both levels are on the
permanent ledger, the pouch has outgrown the hand, and the next waking owes
a choice (`mustChoose`). The choosing screen is a reordering and destroys
nothing.

The return, over the forty seeds after it, carrying those two levels:
**8/40 to the last door against 6/40 bare**, mean depth 4.45 rooms against
4.20. Over a thousand seeds the same comparison is 0.335 against 0.173. So:
further, and the further is small when the haul is two levels and large when
it is a bone and the plate — which is the gate finding again, from the other
end.

**Where a six-turn fight felt long rather than substantial: turn seven.**
Walked turn by turn (waking hand, Gnawing, seed 7): turns one to six each
land a claim and take 3.0–4.0s of beats — 61, 32, 18, 46, 75, 42 — and then
the card has five lines left and all five are shapes a hand of six almost
never makes. **Turns seven and eight claim nothing at all**, deal nothing,
and cost 1.4s each of watching a blow land. That is art. 63 working as
written — *an empty card leaves only armor and flight* — but the last two
turns of a lost fight are the only turns in the game with no decision in
them. The specific pinch is that **ANY DICE is spent once, and it is spent
on turn one**, so the floor art. 46 keeps for exactly this is gone by the
time it is needed. That is the strongest argument this wave found for
cards 80/81 coming off the shelf.

### Rejected, one line each

- **A global multiplier.** A flat ×1.30 measured 0.51 and climbing — art. 54's
  uncapped-multiplication failure — and, worse, it changes *no decision*: it
  makes you want the same dice slightly harder. Per-line changes what dice
  you want.
- **A desperation curve.** Not built and not proposed: a horror that hits
  harder as you weaken is a difficulty dial wearing a mechanic's coat, and
  art. 116 already says what may not be one.
- **Guaranteed level offers.** They would force pickups, and art. 4 makes
  every good optional treasure.
- **Tuning the depth whole at the bare hand.** It makes the build decorative,
  which is the defect this wave exists to undo.

### Findings for Status

1. **The mercy budget is the next number.** The road+wall bands and the
   first-run band cannot both hold until a run gets more of its body back
   between fights. Art. 40's two tiers and their rarity are where it lives.
2. **The drops deal three bones to one piece of armor.** At the Warden that
   is the difference between 0.31 and 0.485. Either the density or the
   rarity bands want a content pass; neither is a test.
3. **The Zealot is unpriced and enormous** (+0.260). Rarity is doing all the
   work.
4. **Two numbers stayed still while the body grew by two and a half:** the
   priced acts (1 and 2 health, art. 120) and the Leech's heal (2). Both are
   a smaller share of a body than they were authored to be.
5. **The last turns of a lost fight are empty.** See turn seven, above.
6. **The stale pre-six numbers in this file are superseded**, not corrected
   in place: every survival number in the sections above was measured
   against a body of 26 and a Gnawing of 150 and is a record of the wave
   that measured it. This section's table is the current one.

---

## The fixes wave (art. 55 amended · arts 11, 63, 65, 72, 118)

Three findings, from one player report: *I can't pick up the 6th die in the
first screen, and the scoring is broken — it's not scoring full houses.*

**The sixth die: art. 55 is amended, and the hole is closed.** The five-bone
start called its empty slot "the invitation", and the room you wake in has a
dead traveler lying against the wall. A player taps the body, gets one line of
description and no verb, and concludes the game is broken — which is what
happened. The Crossing's traveler was authored as scenery on purpose (the
first room may not be the room that hands you your sixth bone), and that is
exactly the reading no player can be expected to arrive at. **Ruled: the start
is six plain bones and a full hand, and only a *special* die is ever
discovered.** A plain bone is the body you wake in, not a find.

Two consequences, and both are the amendment rather than a bug:

- **Every find is a swap now, including the first.** `tookIntoRun`'s
  fill-the-hand clause fires only where a mercy has grown the hand past the
  pouch; a die found mid-descent is a spare and comes down at the next waking,
  through the choosing screen (art. 60, untouched).
- **The whole ladder is spendable from the waking.** The straight, three pairs
  and two triples want six dice and were out of a bare hand's reach under the
  five-bone start. `lots.floor` is restated around that: the guarantee is still
  *a pair or a run of 3*, still tight at ×2, and now nothing on the card is
  unreachable.

**And it moves the arithmetic. This is the debt the wave leaves.** Measured
against the Gnawing over 2000 runs with the policy in `test/policy.ts`:

| hand | armor | win rate |
|---|---|---|
| six plain bones | none | 0.784 |
| six plain bones | Rusted Plate | 0.931 |
| a traveler's die swapped for a bone | none | 0.81–0.83 |

> **Superseded by the levels wave (card 89).** These three are the debt
> being described, not the game: the arithmetic pass named in the paragraph
> below was done, and against the body of 64 and the Gnawing of 290 the same
> three rows read 0.591, 0.715 and 0.627–0.675. The fork is no longer
> inverted. The current table is in **The levels wave**, above.

The first fight is comfortable again — it was ~0.28 under five bones — and
**art. 89's first fork is inverted**: *a bone or the plate* now has a right
answer, because a die is no longer a whole extra shape but a better face on a
shape you already had. `lots.fairness` asserts the inversion rather than the
intent, so the gap is in the suite instead of in somebody's head. The levers
are the plate's armor, the Gnawing's health, and the travelers' distributions,
and none of them was pulled here: that is an arithmetic pass and a decision
nobody has made yet.

**The scoring: the tray was telling the truth about the wrong thing.** The
combo engine was never wrong — `shapesOf` names FULL HOUSE for every 3-2
selection there is, and the suite proves it exhaustively. What was wrong was
the sentence beside it. The Gnawing's SEAL intent shuts art. 65's pair-shaped
lines, and **full house is one of them**; a line already claimed is shut too
(art. 63). In both cases `claimable` comes back with the floor alone, and the
tray printed *any dice 19 · the best these make* over a full house on the
table. True of dice that make nothing; a lie about a full house.

`withheld(turn, dice)` (`src/lots/card.ts`) is the question that can tell them
apart: the line these dice actually make, and which of the two things is
holding it. The tray now says **full house · sealed this turn** or **pair ·
already spent**, and *the best these make* is left for selections that really
do make nothing. It is art. 118's second clause — when something is withheld,
say what withholds it — applied to a line instead of a verb, and art. 72's
"says why" finally saying which why.

**The permanent ledger: a boot could wipe it.** Found while reproducing the
first report. The migration ladder's `keepingOnlyThePermanent` drops a run it
cannot replay and keeps the pouch, the knowledge and the Book — its docstring
says "the boot then wakes a fresh run from the permanent it kept". The boot did
not: it read `run === null` as *nothing here* and woke from `PLAIN_POUCH`,
which is every die, every meeting and the whole Book of Ends gone, one schema
change after the ladder was written to prevent exactly that. The decision is
`woken(found, bare, seed)` in `src/state` now, with `vault` standing over it.

**What this wave did not touch.** The Crossing's traveler is still scenery and
still says only what it says — with a full hand there is nothing it is
withholding. `PAIRISH` still includes `full-house`, because which lines a seal
shuts is content and tuning (art. 65) and the report was about legibility, not
about the seal being wrong. And nothing was rebalanced: see the debt above.

---

## The bodies (card 78, art. 100)

The fight wave gave the blow a flash and a lunge and then showed what the
default body was costing: **the flash was the first frame in which the horror
was legible at all.** A hit reaction that is also the introduction is a hit
reaction landing on nothing, and the playtest verdict was the plainest
possible version of it — *the bad guy is just a black mist.*

### What was actually wrong

Not the renderer, and not the beats. Four of the five horrors had **no
drawing**, and art. 100 says exactly why that fails: *procedural scatter has
no silhouette, and silhouette is most of legibility at this scale.* The
Warden had a body and read perfectly; the Gnawing — the horror a run meets
most — was a `lurker` mass at the far end and the hinge's default mass in the
fight, which is to say a dark smear in both places.

There was a second, quieter defect. The Silt Mother and the Kindled were
*already* drawn where they stand in a room, and the Gnawing and the Marrow
were masses there on the stated argument that a shape at the far end is what
a horror looks like *before it is anything*. That argument was only ever
describing two rooms out of four, so it was an inconsistency wearing a
reason.

### What shipped

**Two new drawings and one table.** The Gnawing and the Marrow are drawn for
the first time; all five are wired into `advanceBodyOf`, and the two that
were masses at distance now stand at the far end as themselves. The thing you
see down the corridor is the thing that comes at you, which is most of what
makes an advance read as an arrival rather than as a shape resolving.

The silhouettes are deliberately un-confusable, because that is the entire
purchase art. 100 is making:

| | |
| --- | --- |
| **the Gnawing** | wide, low, and mostly jaw — two sockets and a band of interlocking teeth |
| **the Marrow** | a skull on a barred ribcage on two long legs |
| **the Silt Mother** | tall and narrow, and given away by two cold lights |
| **the Kindled** | char, cracked open, and the cracks are its own light |
| **the Warden** | a hood wider than the aperture it steps out of |

**The lesson that made them readable** came from measuring the first attempt
against the Warden, which already worked. A feature at this scale needs to be
a **dark socket with a light inside it**, two cells or more across — the first
Gnawing had single-cell `*` eyes and one-cell teeth, and rendered as a solid
brown blob with no face at all. The eyes went to 4×2 sockets of the ramp's
bottom step with `*` inside, and the teeth to two-cell blocks alternating top
and bottom across a dark mouth. That is a fact about authoring drawings for
this projection and it belongs in this file rather than in anybody's memory.

**Each carries its own school** rather than the room's — the Warden's
precedent, and deliberate: a region is known by its light (art. 114) and a
horror is not a region, so the thing that walks out of the dark should be in
its own key wherever the drift put it. The Kindled is the exception that
proves art. 100's `*`: its cracks burn as an authored ember in every school,
because whatever is burning in there is not the room's light.

**Sizes are the fiction's**, in world units, and one of them is a balance
call rather than a drawing call: the Gnawing was first authored at 18×15 and
filled the frame edge to edge, which took *too big for the room* away from
the Warden — the one horror whose whole point is that it was always too big
for its door. It sits at 15×12 now, a beast in the corridor with the room
still visible around it.

### What this did not touch

No engine change, no new article, no beat added or removed, and no timing
moved. `advanceBodyOf` still answers `null` for a horror content has not
drawn, so the hinge's mass stays reachable rather than becoming unreachable
code, and the test says so.

One test changed, and it changed because it was asserting the thing this card
repeals: `test/warden.test.ts` used to say *every other horror keeps the
hinge's own mass*, which was true and was the defect. It now asserts that
every horror in `HORRORS` has a body, and that an undrawn one still honestly
has none.

`npm test`: 50 files, 557 tests, green.

---

## The descent wave (arts 31, 84, 120 · cards 49, 86–88)

The Lots have the whole loop: you **perceive** an intent, **predict**,
**commit**, get a clear **answer**, and **know** more than you did. The Descent
had commit, answer and change — and was missing perceive and predict, for two
reasons that were both in the law rather than in the code. **Art. 31 parked the
senses on doors**, so every choice was between identical unknowns and the
drift's twenty questions were being asked in a language the player could not
read. And **no article anywhere gave an act a price** — art. 5 says tapping
never harms, art. 7 gates outcomes, and GAME.md's promise of acts *"with gates
and consequences"* was never ratified. So curiosity was not dangerous; it was
merely slow.

This wave adds **no new interaction type** (art. 76 untouched) and **no new
verb grammar** (art. 66 untouched). Everything below is a tap, and every
control is a plain imperative of two words or fewer.

### The two articles, as installed

**art. 31, amended (`the-world.md`) — the senses are unparked.** Art. 77 had
specified the mechanism since the day it was ratified — *a door's sense is its
region tag, leaking* — so this is unparking rather than inventing. One line per
door, given free on a tap (arts 5–6), and two rules keep it honest:

- **A sense is true and partial.** It never lies and it never completes. It
  says what the region smells like, not what the room contains — and it cannot,
  because under art. 79 the room behind the door does not exist until the door
  is opened.
- **A sense is not a label.** It never names the region, never ranks the doors
  and never says *danger*. The player learns the vocabulary by descending,
  which is art. 10's knowledge doing its job on the one thing in the game
  nobody had ever been able to learn.

The tally is shown in **no form whatever**. The lean is felt, and a door at a
time is the whole of what it is felt through.

**art. 120, new (`the-world.md`, beside arts 5–7) — the price of an act.** *An
act may carry a declared price, and the price is visible before the press.*
**This is the Descent's art. 42**, and the article says so: the Lots promise
the intent before you commit, the Descent promises the cost. Looking at the
thing tells you what the act about it costs, and **looking stays free**
(art. 5). Pressing pays.

The price reaches the player through the **look**, because art. 68 abolished
the inspect button and art. 66 gives a verb two words — a verb cannot carry a
number. And it is the *number*, filled into the sentence by `saysLook` the same
way `saysIntent` fills an intent's, so a price and the words quoting it cannot
drift apart. The tap that summons the verb is the tap that says what it costs,
so **there is no order of presses in which the verb arrives before its price.**

**A price is never the run.** It comes out of the body and stops one point
short of the last of it. A press made out of curiosity may cost a player
something and may not cost them everything: a run ends to a horror, to the
Warden or to a door, never to a question. The clamp is in `priceOf`, so no
content can author past it.

**art. 84, extended by one sentence** — *and some of what you refuse is
remembered.* It fitted inside the existing article: art. 84 already says the
labyrinth remembers you, and it remembered only meetings.

### The sense vocabulary, per region

Four lines a pool, chosen deterministically off the door's own identity, so a
door says the same thing every visit and a crossroads offering three doors of
one region still gives three different sentences.

| pool | what leaks |
| --- | --- |
| **drowned** | cold air and no echo · a wet draught and dripping a long way in · stone dark all the way down · a bucket left standing a month |
| **burnt** | wax and singed hair · a frame warm to the back of the hand · dry air with grit in it · a chimney, gone over twice |
| **ossuary** | someone coughing, carefully · chalk that will not come off the hand · something set down and set down again · dry air, and a little sweet |
| **neutral** | nothing comes under it · still air, moving neither way · a frame worn like every other · quiet, and not doing anything about you |
| **the last door** | its own line: nothing comes under it at all, and whatever is behind it is not breathing (art. 37 — it carries no tag, because there is nothing left to lean toward) |

`test/senses.test.ts` holds every line to both of art. 31's rules: no sense may
contain a word of its own region's name, none may rank or warn, none may name a
room or a horror (art. 79 — there is nothing back there yet), and **none may
carry a number or a quantity**, because a sense that counted would be the tally
leaking in a form art. 77 forbids.

**Both the sense and the stop.** The first cut let art. 118's held-back line
*replace* the sense, and the playtest walk caught it in the second room: a room
holding you back turned every door in it blind, at exactly the moment a player
most wants to know which way they are about to commit. The door now answers
with its sense first — that is what the door *is* — and the stop after it,
which is what he is doing about it. Art. 3 keeps its silence about *which*
thing.

### The priced acts, and what they pay

Three verbs, and GAME.md named all three long before anything gave an act a
price. Each is summoned by looking (art. 68), none is required, and none holds
a door.

| act | where | costs | pays | and it changes |
| --- | --- | --- | --- | --- |
| **PEER** | the sump's grate | 1 | knowledge — `clue.the-drop` | the sump's grate, the buried hall's sand, the Crossing's own grate |
| **REACH IN** | the kiln's mouth | 2 | knowledge — `clue.the-flue` | the kiln's mouth, the pyre's timber |
| **LISTEN** | the covered font's cloth | 2 | knowledge — `clue.the-seventh` | the cloth, the cistern's water, the wet passage's water |

**All three pay in knowledge**, which is art. 88's payload and the cheapest
legal one on art. 120's return bar — and the article says it should be the most
common, because an act that sharpens a question is worth more than one that
answers it. The bar is enforced rather than quoted: `test/price.test.ts` walks
every priced act in the catalog and fails a `knowledge` claim with no clue
behind it, an `object` claim with no good, a `change` claim that heals nothing.
*Lose four health and receive ordinary loot* does not ship.

**Art. 118 composes, and it bites harder than expected.** `collect` and `learn`
are both idempotent by id, so a second press of a priced act spends a deed,
charges a price and changes nothing — the dead press art. 118 exists to end.
`moves()` now refuses any act whose *whole* payload is already on the permanent
ledger. It reaches **across runs**, and that is arts 10 and 11 rather than an
oversight: knowledge survives death, so a man who has already put his ear to
one of these knows what he would learn and does not pay for it twice. The
thing's look says so (`<thing>.kept`).

That has a consequence worth stating plainly: **the exemplar decays over a
career.** A player who has listened at one covered font and taken its stone
meets a later one with nothing under the cloth to press for, and reads two
sentences instead of making a decision. The alternative is making the fork's
goods run-scoped rather than permanent, which is an art. 11 question and not an
art. 120 one — it is not a thing this wave could decide quietly.

**A look is now under test, for the first time.** Art. 5 says the world never
punishes touch, and nothing had ever asserted it. `test/price.test.ts` looks at
every tappable of every room of forty whole depths, twice each, and asserts
that health, what is carried, what has been done, what has been opened and the
**whole permanent ledger** are untouched. The one thing that does move is
`looked`, and that is art. 68 rather than a cost: the summons is knowledge, and
it is what makes the verb exist.

### The refusal flags, and where each lands

Nine flags, and the cap **is** the design: a flag lands in two or three later
moments, and the failure mode card 87 exists to avoid is hundreds of one-off
branches authored for a line each. Flags are *kinds* of refusal and never
particular acts — three travelers share one flag, because walking past a body
is the same thing whichever body it is, and what the second one says is that
you have done this before.

| flag | written by leaving | and it lands on |
| --- | --- | --- |
| `refused.bone` | any traveler's bone left in the hand it was in | the three bodies, the Crossing's own traveler, and the origin sentence of whichever bone you *do* pick up (art. 87) |
| `refused.pair` | half of the Sisters left behind (art. 52) | both halves, and the bonefield's drifts |
| `refused.luck` | the counting cord left coiled | the cord, and the tally's scratches |
| `refused.iron` | the rusted plate left on him | the plate, and the Warden's door |
| `refused.stain` | the leech bone left where it lay | the bone, and the crawl's legs |
| `refused.breath` | a basin not drunk from (art. 40) | the basin, and the font's steps |
| `refused.hands` | the Mender not knelt to | the Mender |
| `refused.question` | a priced act walked past (art. 120) | the sump's grate, the kiln's mouth, the covered font's cloth |
| `refused.cloth` | the half of the fork left under the cloth (art. 89) | the covered font's basin, and the cistern's cage |

**A refusal is turning down an offer**, and three filters make that true rather
than approximately true. `afforded` (art. 7 — you cannot decline what you were
never able to take) and `moves` (art. 118 — a mercy a whole body cannot drink
is not offered at all) are both filtered out; **`summoned` deliberately is
not**, because a thing the player never looked at is a thing they walked past,
which is the strongest refusal there is. The first cut left `moves` out and
recorded every healthy run walking past a Mender as having turned down a mercy
it was never shown.

Written when the run walks out of the room (`chooseDoor`), because forward is
forever (art. 9) and the door closing behind you is what makes leaving a
decision rather than a delay — and, for a fork, in the same breath as the take.
They ride the permanent, so a death is not an amnesty and neither is a reload:
`VAULT_VERSION` is **11**, and the rung is the `fillingThePermanent` kind, so
no descent is lost to it.

**What a flag may change is what a tap answers and what an origin sentence
says**, and nothing else. Never a weight, never a rarity, never what is dealt —
a refusal that changed the arrangement would be a difficulty dial the player
never asked for, which is art. 116's reasoning applied to memory.

### The covered font — the bar, quoted

One room, authored whole, using all three capabilities. **This is the exemplar,
and the rest of the depth is held to it.** A later author reads this room to
learn what a priced act is supposed to feel like:

> **A room gives a question before it gives a reward; free looks make the
> question askable; the priced act sharpens the question rather than answering
> it; and the take costs something that is not health.**

All four are in the one room.

**The question, before the reward.** A stone basin, waist-high, with a wet
cloth stretched tight across the top and tied off under the rim. Two candles
and neither says anything is wrong.

**Free looks make it askable.** Three, and they cost nothing: the cloth is wet
**from below**; the lip is worn on the **inside**, and only on the inside; the
floor round the foot is dry, and a thing that full leaves a ring. Nothing says
danger and everything implies it.

**The priced act sharpens it.** LISTEN costs 2 and returns six small sounds,
and then a seventh. The player now **knows something is wrong and does not know
what** — and that distinction is the whole design. Not knowing *why*
six-then-seven matters is mystery; not knowing what LISTEN *costs* would be
confusion. Horror wants the first and is ruined by the second, which is exactly
why art. 120 puts the number in the look.

**And the take costs something that is not health.** Lifting the cloth is a
fork (art. 89) and its two halves are deliberately not two treasures: one is a
**thing in the hand** (art. 53's counting stone, placed for the first time and
given the origin sentence art. 87 requires of every shipped good) and one is a
**thing known** (art. 88's knowledge good — no stat at all, earning its place
by changing two later taps). A partition, not a purchase. The forfeiture is
physical and shows in pixels: taking the stone closes the water over the lip;
leaning the basin to read the lip puts what was in it on the floor. Three
authored states of one drawing, one silhouette down the stem.

### Two bugs this wave surfaced rather than wrote

- **`openFight` clamped the body's ceiling.** It set `yourHealthMax` to the
  health you walked in with, while a *resumed* fight restored `run.healthMax` —
  so a wounded player's leech rider could not heal them back to whole, and the
  same body disagreed with itself across a lock screen. Invisible until
  something could wound a run outside a fight, which is what a priced act is.
  `openFightDoor` passes the run's own ceiling now.
- **`act()` re-armed the run for a clue.** The old code called `tookIntoRun`
  whenever the permanent moved at all, and a clue moves the permanent — which
  would have rebuilt a hand mid-descent, and art. 60 says the hand never moves
  inside one. It asks about the *collection* changing now, which is the
  question it always meant.

### What the walk found, beat by beat

Walked at 390×844 in Chromium, and walked again through the harness with every
line printed. Where a beat did not land, it is here.

**Lands.** The waking still opens on the scrawl. The doors each say one true
thing, and three doors give three sentences. The covered font reads exactly as
designed — the three free looks build the question, `2 out of me` is legible
before the press, the seventh sound arrives, the strip goes from three verbs to
two to none as the fork resolves, and the basin afterwards says *"There was
something in one of these I did not take, and it is still in there."* The
region locks, its unique arrives, death writes the scrawl the blow earned, and
the next waking opens on it.

**Does not land: the lean is felt at the arrival, not several rooms before
it.** The brief asked that a player taking only warm doors feel the labyrinth
leaning several rooms before art. 78 says *arrival*, and they do not — they
feel it about one room before. The cause is not the senses, which work: it is
that `lockAt` is 4 against a `length` of 9, so there are only four doors in
which to notice a pattern, and the drift's pull needs two or three tallies
before it visibly biases what is offered. Taking only warm doors, the third and
fourth rooms offer warm doors and little else, which is one room of anticipation
rather than several. **This is a tuning question about `lockAt` and `length`,
not about card 49**, and it belongs to the drift rather than to this wave — so
it is reported rather than fixed. Mixed doors behave as designed: the senses
stay varied to the last door and no lean is felt at all.

**Does not land: the seam is louder than it was.** The senses, the priced
looks, the covered font and every `.knows` and `.again` answer are in the
amended voice; the rooms they stand beside are still the placeholder tranche
cards 27–29 are clearing. Tapping the Crossing's grate answers *"Light comes
down through iron you cannot reach"* — a narrator — and then tapping a door
answers in his own head. The wave could not fix that without doing cards 27–29,
and it made it more audible by adding good prose next to the debt.

**Left out of scope, as the brief set it.** Cards 80 and 81 (the closing, the
break) are deferred: no distance states, no intent breaks. No economy, no
merchants, no QTEs, no second depth. The drift tally is shown in no form.

---

## The fight wave (art. 119, cards 75–76)

The playtest called the fight a spreadsheet. Card 69 found half of why —
*nothing said what happened* — and shipped the word band's third state. This
is the other half: **nothing showed it.** A claim resolved instantly and
silently, so the most interesting decision in the game — which line to spend,
and what it costs you to spend it — passed in a single frame.

### The article, as installed

**art. 119 (the-lots.md).** *A fight event resolves in beats, and each beat
says one thing. The outcome is computed before the first frame is drawn; the
beats only reveal what is already true. Every beat is a one-shot that ends
settled (art. 1), so with motion reduced (art. 116) the whole sequence
collapses to its settled state and nothing is lost — the settled state is the
whole truth or the beat is wrong.* Plus the three consequences the wave asked
to be stated because each is a rule somebody would otherwise break: **nothing
is decided during an animation**, **a rider gets its own beat**, and **the
room holds still** except for the blow that lands on you.

Two clauses were added past the brief, both because leaving them unsaid would
have left an argument open. **The order of the beats is law and their
durations are not** — which is what makes the phone pass below a tuning job
rather than a re-litigation. And **which intents telegraph is content**, never
a threshold the engine holds, so a script says for itself which of its beats
the room can feel coming.

### The seam that makes it true

`src/lots/beats.ts` computes a **script**: a list of frames, each carrying the
beat it is and the numbers the screen should be reading once it has landed.
`src/shell/beats.ts` reads the script out. Look at what `playBeats` takes —
frames, a clock, and two callbacks. There is no fight in it, no resolution, no
lot and no engine, so a beat **cannot** decide anything. art. 119's first
consequence is a fact about a type rather than a thing anybody has to
remember.

Three things fall out of that, and all three are why the wave is testable at
all. The script is a **value**, so the beat order is asserted rather than
watched. The clock is **injected**, so "timers do not leak" is a number the
player reports rather than an audit by hand. And reduced motion is `atOnce`
over the same frames — **one timeline, read at two speeds** — so there is no
second path that could disagree with the first about an outcome.

`endTurn` now asks the engine both its questions before the first frame. The
old shape called `advanceFight` at the *end* of a 700ms pause, which is
precisely the decision-inside-a-timeline the article forbids.

### The beat order (settled)

**§1, the roll.** Two turns of the tumble, then each die lands on its own
beat, staggered. A **reroll re-tumbles only the dice being rerolled**; what
the thumb kept sits perfectly still. A recast that keeps everything —
art. 41's way of declining the second casting — has nothing in the air at all,
and its timeline is a single settled frame. The tumbling face is hashed off
the die's identity and the spin, never thrown, so art. 75 replays a throw as
the throw it was.

**§2, the cascade.** Each claimed die lifts alone with its own `+n` and the
running total climbs off it → composites resolve **group by group**, so a full
house reads as a triple and a pair → the bond gets its own beat inside the sum
it joins (art. 52: the sisters pay only together) → the line names itself with
its multiplier → **the riders fire, one at a time**, each taking the band →
the total climbs to the number the line just promised.

The running total starts at **nothing** and is built. Before this the tray
showed the finished number the instant the claim was made, which gave away the
whole beat before the first die had lifted.

**§3, the blow.** *Then, and only then.* Strike (flash + lunge, the crown
falls) → hunger's swell → the intent landing on you (flash + **shake**) →
bleed's tick → bind's drag → the ending. It is read straight off the events
`advanceFight` already wrote — the beats narrate the engine's own transcript
rather than re-deriving it. The one thing reordered is *when the horror's
health is seen to fall*: the engine takes it at the top of the exchange and
the blow shows it at the end, which changes no outcome and is the whole of
what *then, and only then* asks for.

### What each effect got

The flash is `lifted(ramp, steps)` — the same drawing read further up the same
ramp, so a body drawn as indices lights itself and the hinge's default mass
takes the light end of the two tones it is made of. **No new colours**, and
art. 17 is unamended because every pixel is still a step on the ramp it was
already on. The lunge moves the horror in **world coordinates**, so the
growing and shrinking are the projector's (art. 15). The shake is stated in
**game pixels** — art. 22 says nothing is fixed in device ones — and the shell
hands the stylesheet whatever two of them come to on this device.

Each of art. 65's attacks on the plan got a signature, because the plan is on
screen: **seal** marks the glyph the lines live behind (art. 74), **curse**
greys the cursed value *for the whole turn it is cursed for* rather than for a
frame, **corrode** flakes the armour off the vitals as the blow eats it,
**bind** drags the die out, **bleed** ticks the readout the plan was made
against, **hunger** swells it.

### The telegraph

An intent may declare `telegraph: true`, and a turn before it lands the horror
swells, the light dims a step, and the chip marks itself. It says *something*,
never *what*, so art. 42's promise — this turn's intent and only this turn's —
is untouched. The dim is a second cached cast, which is the two-prepared-frames
trick art. 110 already uses for a room that breathes; the swell reaches the
body past the settled closeness, so `advance` still reports that the thing
stands at the lens (art. 28).

Declared on five intents, all of them a script's biggest hit: **BELLOW 16**
(the Gnawing — the one the death scrawl tells the player to count for), REND
13 (the Marrow), UNDERTOW 12 (the Silt Mother), GUTTER 13 (the Kindled), KEEP
18 (the Warden). Nothing smaller tells: a room that feels every turn coming
feels none of them, which is art. 107's argument carried one step out.

### The guard

Five tests, all of them the ones the wave asked for by name
(`test/beats.guard.test.ts`, on the fight loop in `test/beats.ts`):

- **same outcome either way** — a scripted fight at four seeds, played with
  motion and without, ends on the same body, the same Book line, the same
  vault bytes, and the same beats in the same order;
- **nothing decided mid-timeline** — reading a script cannot move the fight it
  was built from, and the same event resolved twice gives the same script;
- **every rider that fires gets a beat** — walked over every rider on every
  die in `CATALOG_GOODS`, each claimed on its own face, each asserted to have
  a beat *and* a word;
- **every beat ends settled** — nothing lifted, nothing struck, and the
  numbers are the fight the engine advanced to;
- **timers do not leak** — an interrupted cascade cancels its scheduled beat,
  never lands, and leaves nothing that can still fire.

`npm test`: 48 files, 525 tests, green. The golden plate is untouched — the
telegraph's dim is a *new* cached stamp and the default cast is unchanged.

### Manual, at 390×844 — and what it is not

Driven in Chromium at 390×844 at device-scale 2, through the real front door,
the real doors, and the real settings screen. What was confirmed: five dice in
the air mid-roll and none after; **three** re-tumbling after a keep of two;
the running total climbing `1 → 5 → 8 → 14 → 15` with `+1 +4 +3 +6 +1` on the
dice as they lift; the line naming `any dice ×1`; the crown falling on the
strike and the horror's mass flashing warm against the cold room; the frame
offsetting on the blow that lands on you and settling back; `--shake` resolving
to 3.25px on that device, which is two game pixels; no console errors. With
reduced motion on, the same fight showed **one** state — the settled one —
and the band still said what the turn did.

**This is not the hand pass, and the hand pass is still owed.** A headless
browser at phone dimensions can prove the beats fire, in the right order, with
the right numbers. It cannot answer the only question the timings actually
turn on, which is whether they *feel* right under a thumb. So the demo's
numbers ship unchanged and are recorded here rather than quietly adjusted —
inventing a tuning result from a machine that cannot perceive it would be
worse than shipping the number the demo settled.

**What was measured**, so the phone pass starts from data rather than from
zero. Press → settled is **~1.8s** for a five-die ANY DICE claim (no climb,
because a ×1 multiplier has nothing to climb) and would be **~2.2s** with one.
The roll is ~630ms and the recast the same, so a full turn now carries **~3.1s
of animation** on top of the thumb's own time. The wave predicted the desktop
demo would run 20–30% slow in the hand; if that holds, the numbers to cut
first are `lift` (180ms × five dice is 900ms and the single largest block) and
`blow` (320ms, the longest pause in the timeline). `rider` at 460ms should be
cut last or not at all — it is the beat that teaches the pouch, and a rider
that goes by at the speed of a die teaches nothing.

### What felt worse than instant, and what is still owed

**The flash and the lunge were landing on something nearly invisible.** The
default horror body was art. 26's first tier — a dark mass that read as the
room's own darkness until it was struck. The flash actually *rescued* it: the
strike was the first frame in which the shape was legible at all, which is a
strange thing for a hit reaction to be doing. The beats were not wrong and
were not cut, and this wave's boundary said explicitly that it animates
whatever body exists.

**Closed by the bodies (card 78), one section down.** Every horror the depth
deals is now drawn, and both beats land on a silhouette.

**No beat was cut.** Every one in the brief earned its place under a browser,
and the two that were nearly cut for symmetry are worth naming as kept on
purpose: the **bond** beat, because a bond that arrives inside a total is a
bond the player never learns they carry (art. 54), and the **armour-only**
`struck` beat, because without it the one turn a player most needs to see
their armour work is the one turn nothing on screen moves (art. 57).

### What this wave did not touch

No new horrors, no new effect kinds, no sprite work, no room motion beyond the
shake, nothing in the drift or the schools. The ambient stir is arts 106–110
and is unchanged: these are one-shots on a state change, which art. 107
already permits, and **stillness is the capital they spend** (art. 106) — the
fight is what it was saved for.

**The signed-off reference is missing.** `castlebrynth-animation.html` is not
in `reference/` and is not in the repo's history. The article says so and
stands as the statement of what it proved, on the same footing the graphics
amendment stands on for its own three missing demos. Everything above was
built from the wave's brief, which carries the beat order and every timing;
if the file turns up and disagrees about intent, it wins and this section is
the record of what was assumed in its absence.

---

## The answer wave (art. 118, cards 69–71, 74)

The playtest of 2026-08-06 — twelve runs at 390×844, every line quoted from
the live word band — found twenty-eight things. Eleven of them had one root
cause: **the game does things and never says it did them.** The word band had
exactly two states, what you are looking at and what is coming, and had never
had a third.

### The ruling installed

**art. 118 — nothing may be a dead press** (`the-thumb.md`), extending art. 71
from *where a press takes you* to *whether a press does anything at all*.
Three clauses:

- **An act that cannot change anything is not offered.** The verb is absent,
  the way a locked door's already is. Card 67 set that precedent for locks
  only; the two cases it was hiding are art. 40's mercy a whole body cannot
  drink and art. 3's held-back door.
- **A withheld act's reason lives in the thing's look.** The verb it would
  have hung on is the thing that is gone, so the explanation goes where
  looking already answers (arts 5, 69). Content authors it under `<thing>.kept`.
- **A room may only hold you back for something already on the frame as a
  tappable.** Art. 3 keeps its silence about *which* thing; what it loses is
  the right to hold you for a thing no tap reaches. This is the clause that
  makes every stop solvable, and it is what the first two rest on.

The defect it closes is the only one in the report that could end a session: a
bot pressed Open twelve times in one room, was told *"Something here is still
yours to take"* every time, and never left.

### The band's priority

`src/shell/band.ts`. **An act's answer, then what you are looking at, then the
ambient.** The ambient — a room's candle, a fight's intent, the door's line at
the threshold — is not nullable, because art. 69 says silence is a bug and the
bottom of a priority order is where one would hide. `main.ts`'s single
`notice` variable is now that value, and every assignment says which of the
three it is.

### What now speaks that did not

- **Every act.** Eleven answers authored, one per act id, keyed on the id
  art. 66 already looks the verb up by. `answer.act.unlock` used to be the
  only one, so every other press fell through to the candle underneath — the
  candle describing the thing just picked up.
- **Every turn.** `saysExchange` carries both halves — what you dealt, what it
  took, and the cost face in the same breath — and it holds the band until the
  player turns it. Armour eating a blow is a distinct shape from nothing
  having been thrown, because a player who cannot tell those apart cannot tell
  whether the armour is doing anything.
- **The intents.** All twenty-one rewritten: impending rather than landed, and
  carrying both what the number does to the body and what the effect does to
  the plan. The numbers are read off the intent rather than written into the
  words, which fixed a lie nobody had noticed — COVET eats sixes in the
  Gnawing's script and fives in the Marrow's, and one sentence said "sixes"
  for both.
- **The ending.** Two candles: him having it, then the scrawl. The verb is
  **Wake**, not Descend — Descend was the front door's word standing on a
  death screen, which was most of why dying read as arriving. `finished` takes
  Descend, which is what it is.
- **The Warden's fall**, which had been saying the same six words a stray in a
  corridor says.
- **The scrawl**, keyed on the blow rather than on the horror. Twenty-one
  intent lessons, plus `end.bleed` and `end.cost`: a bleed lands after the
  blow and can finish a turn the blow did not — the playtest's own death was
  one — and a cost face is a price the player chose.

### Register

Card 68 has not landed, so `LOOKS`, `SOCKET_BEATS`, most `BEATS` and most
`NOTICES` are still declared placeholders. **Everything this wave wrote is in
the amended voice and is linted as a thought or a scrawl from the day it was
written**, not from the day that card does: the `answer.*` prefix, the new
`.kept` looks, `EXCHANGE`, `DEATHS`, the new `END_LINES`, the whole of
`INTENT_SAYS`, and the notices it touched. Nothing new goes into the debt.

### The harness, and what it still cannot see

`test/screen.ts` is the shell's state machine with the painting taken out —
the same calls `main.ts` makes, through the same pure functions. Every
existing test asked the engine a question; every finding was about the screen,
and the screen's decisions lived beside the code that builds a `<button>`. So
`wayOn`, `offering` and `bandLine` moved somewhere a test can reach them, and
`test/screen.test.ts` walks sixty depths asserting that every offered verb
moves the ledgers, every press changes the band, every tap answers, and no
walk is ever left in a room with no way out. It runs in CI on every push and
pull request, in the `npm test` the build workflow already gates on.

**Test-guarded now**: the dead press, the held-back door, the withheld mercy
and its look, an answer for every act in the catalog, the band's priority
order, the exchange's shapes and numbers, every intent's two halves, the
per-blow scrawls, and art. 118's third clause asked of rooms as dealt.

**What the harness cannot see, stated plainly.** It holds the shell's
*decisions*, because those are shared code — delete art. 118's filter and the
sweep goes red. It only *mirrors* the shell's **sequencing**: the order
`main.ts` calls those functions in, and which result it assigns to the band.
Cut `band = answered(saysExchange(...))` out of `endTurn` and the harness
would not notice, because it makes that call itself. Closing that needs
`main.ts` under a DOM and is a card of its own. Until then, **sequencing is
what still needs a human with a phone.**

One duplication was found by deliberately regressing art. 118 and watching
only half the suite go red: the tray and the harness each filtered the strip
themselves. There is now one `offering`, and `src/shell/strip.ts` re-exports
it rather than restating it.

### What this wave did not touch

Seventeen of the twenty-eight findings, on purpose. Cards 72 (the dice
declare) and 73 (the frame composes) are separate waves:

- **The Crossing draws six bones and says five.** The plate is pre-amendment
  (art. 55 cut the start to five on 2026-08-05) and the first room of every
  run contradicts its own first candle.
- **Riders and bonds are never declared on inspect** (art. 54). The pusher's
  `1` wounds for 3 and `saysDie` never says so.
- **The carried key answers with a bare noun.** `saysItem` maps `key.warden`
  to a look called `alcove.key`, which does not exist.
- **`VERBS['act.take-key']` is a bare `Take`**, the only unqualified verb in
  the game.
- **Dice in the POUCH panel are drawn with no face**; on the choosing screen
  they are all drawn showing `faces[0].value`, so nine dice read as a wall of
  ones, and the default pre-selection is the worst hand available.
- **The threshold stir paints over the advanced horror** — `world()` composes
  the horror first and every loop overlay second, so the Warden fights with
  its own hall's door in its chest. One `z` sort, and it is card 73's.
- **The lock's tap mark covers the black door's** at 390px.
- **The Crossing has no hero**, and an undrawn horror is a black dithered mass
  out-competed by a brazier.
- **`boot()` treats a vault whose run is null as no vault** and rebuilds the
  permanent ledger from `PLAIN_POUCH`. Unreachable in normal play today; a
  latent footgun rather than a bug.

---

## The mind wave (card 68)

The playtest of the reason wave's prose, in one line: **the flourish is
wrong.** The facts had landed and the mouth they came out of had not. The
words on screen were a narrator describing Castlebrynth with care — *the dark
does the arguing* — when what they are is the inside of one plain,
frightened, determined man's head. Every fact the reason wave delivered
stands; every sentence carrying them was rewritten.

Three commits: the law, the loop, the frame.

### The law, amended (`.claude/rules/voice.md`)

**The voice is his mind.** Every player-facing line is the protagonist
thinking or the protagonist writing, and never a narrator. Two voices, both
his:

- **The thought** — live play. First person, present tense, plain words,
  short lines; fragments and questions legal; ellipses and dashes are
  thought-speed and not decoration.
- **The scrawl** — anything written down. Second person imperative, because a
  note to yourself is an order. Lowercase legal, and short, because he is out
  of time when he writes one.

And the rules that make it a device rather than a style: **plain man's
words** (if a line sounds written, cut it); **not-knowing** — he names only
what he knows, so an unmet horror is *"What— what IS that."* and a met one is
its name, which makes art. 34's met-flags literally what he still knows;
**fear is had, never narrated**; **the amnesia is canon**, so the fiction now
*explains* the two ledgers (art. 11) instead of decorating them. Kept whole:
one candle, art. 111's naming, nothing explains itself twice, spoiler
discipline.

**The lint stopped asking "is this in register" and started asking "whose
mouth is this".** A thought that says *you* is a narrator addressing the
player; a scrawl that says *I* is a diary. Two rules pointing opposite ways,
so neither voice can be written into the other's category by accident. Two
old rules died with the flourish: the blanket **past-tense ban** (he may
remember — *"He came down here"* is the man, not a narrator) and the
**exclamation ban** (one when earned, never two). The *"you feel"* ban stayed
and gained *"I feel"* with it, now for the true reason.

**The fourth category is the debt.** Everything still in the repealed
register is declared a `placeholder` in `everyString()` — it answers to the
rules that survived and to nothing else. It is a number the test can print
rather than an impression, and nothing new may be written in it.

### The scrawl loop

The frame of a run, closed into a circle: **every ending is him scrawling one
line in a last moment of clarity, and every waking opens on the last thing he
wrote — which he does not remember writing.**

- **The waking.** The Crossing's first candle is the most recent line of the
  Book of Ends. `RoomBook` gained `scrawl(cause)`, `beatsIn` takes it, and
  `enterRoom` reads it off the permanent — the engine asks by cause and never
  learns what it says, exactly as it never learns what a room says. Keyed on
  the Crossing because art. 37 makes the Crossing the room that opens every
  run: the waking is a place, not a moment the shell has to remember it is
  in.
- **The ending.** The death line shown *is* the scrawl he leaves. `run.dead`
  and its `.choose` variant are gone: a narrator's summary standing where his
  last sentence should be was the flourish at its worst, and a dying man does
  not compose a sentence about his pouch. The Warden's door keeps a thought,
  because it is not a death — a man walking through it has time to think.
- **The lessons are true.** Dying to the Gnawing writes *"the fifth one is
  the big one. count them"*, and its script really is six intents with
  BELLOW 16 fifth; the Marrow's says armor is nothing on the fourth, which is
  where CORRODE sits, one turn before REND 13. A note that lies to the next
  man is worse than no note at all. This is where the engagement file's law —
  *a death that taught nothing is a bug* — finally has a sentence to live in.
- **The first words of the game** are the oldest scrawl: **"you must find
  him."** No schema change; the v8 rung stands as shipped.

### Every frame string, before and after

**The threshold**

| | |
|---|---|
| before | *The way down into Castlebrynth. Stone stops at a shut door, and what comes up under it is colder than the room. You say the name to it again.* |
| after | *Castlebrynth. Cold coming up under the door. He came down here, so I go down.* |
| before | *The way down. The door stands as you left it, and the run behind it is still yours. Your brother is further down than that.* |
| after | *I stopped partway down. It is all still there. He is further down than that.* |
| before | *The run ends here, unfinished. The depth behind it goes with it, the Book takes the line, and the way down starts again at the Crossing.* |
| after | *If I stop now the whole floor goes. Everything I got past, gone. And the Book takes a line for it.* |
| before | *The door shuts on it. What you carried down stays down there, and the name comes back up with you.* |
| after | *Shut. Everything I carried is still down there. So is he.* |

**The waking** — the candle in front of these is the scrawl, and it is not in
`BEATS` at all: the Book lays it down.

| | |
|---|---|
| before | *The Crossing. You wake with the ceiling close enough to touch and your brother's name already in your mouth.* |
| after | *My writing. When did I write that.* |
| before | *Five bones lie in your open hand. Your hand holds six.* |
| after | *The Crossing. Low ceiling, cold floor. Six bones in my hand and nothing else on me.* |
| before | *The traveler against the wall is not the one you are looking for. You check anyway. You check every one.* |
| after | *The traveler by the wall is not him. I check anyway. I check every one.* |
| before | *The corridor goes down. Behind you the stone is unbroken, and down is where the name goes.* |
| after | *Down, then. Behind me the stone is solid, and his name is the only thing I still have.* |

**The three arrivals** — the second candle is the same discovery in all
three, because it is the same discovery.

| | |
|---|---|
| before | *Every door you take leans down toward water… / The floor slopes, and stays sloped. What Castlebrynth is given down here, it keeps under water.* |
| after | *Water on the walls. The floor tips down and stays tipped.* / *Every door I picked came out lower and wetter than the last. It has been listening.* |
| before | *Every door you take opens on something already burnt… / The air dries out. What Castlebrynth is given down here, it keeps as ash…* |
| after | *Everything down here has burned. The stone is still black with it.* / *Every door I picked opened on something already burnt. It has been listening.* |
| before | *Every door you take goes further in among the dead… / The walls go pale. What Castlebrynth is given down here, it keeps in the courses…* |
| after | *The walls are bone. Set in courses, like brick, all the way up.* / *Every door I picked went further in among the dead. It has been listening.* |

**The endings**

| | |
|---|---|
| before | *The floor comes up. The run ends here, and everything you know of it keeps. So does the name.* |
| after | retired — the word band shows the scrawl he leaves (`END_LINES`, per cause) |
| before | *You go through, and the stair keeps going down. Your brother is not on this depth.* |
| after | *The black door gives. He is not on this floor. So it is the next one.* |
| before (scrawls) | *The Gnawing opens you and goes back to its corner.* / *The Marrow closes over you…* / *The Warden stands aside…* / *The door does not open…* / *You stop at the door and go no further…* |
| after | *the fifth one is the big one. count them* / *armor is nothing on the fourth. the fifth one opens you* / *the black door opens. keep going down* / *take everything before you open anything* / *you turned back. he is still down there* |

**The choosing screen, and the Book**

| | |
|---|---|
| before | *More bones than your hand holds. Each one belongs to somebody who does not come back up. The rest stay here.* |
| after | *More bones than my hand holds. Every one of them came off somebody who did not come back up. The rest stay here.* |
| before | *The Book of Ends. Every ending is written here, under the first line.* |
| after | *The Book of Ends. All of it is my handwriting. I do not remember any of it.* |
| before | *Find your brother. Whatever else goes, keep this.* |
| after | *you must find him* |

### What resisted the register — and what cards 27/28 must not imitate

Three kinds of line fought back, and each one is worth naming because the
next wave will meet all three.

**The lines that exist to state a rule.** `gate.abandon.asked` has to say
what a press costs before it is pressed (arts 5, 71), and a frightened man
does not enumerate consequences. *"If I stop now the whole floor goes.
Everything I got past, gone. And the Book takes a line for it."* is the best
of about a dozen, and the last clause is still the game talking rather than
him — he would not think the word *Book* about his own notebook. It is the
one line in the frame I would call a compromise. **The lesson for 27/28: a
line that has to carry a rule should carry it as a consequence he can see,
not as a term.**

**Room naming versus thought.** art. 34 wants the room to say its own name as
it opens, and *"The Crossing. Low ceiling, cold floor."* is a man labelling a
room he is standing in, which is not how anybody thinks. It survives because
legibility outranks naturalism and because the fragment style makes a bare
noun read as noticing rather than as announcing. `room.scene.test.ts` had to
be amended for the waking, since his first candle now answers the scrawl
rather than the room, and the naming lands one candle later. **For 27/28:
thirteen rooms have to do this thirteen more times, and the trap is thirteen
sentences that all start with a name and a colon.**

**Second person is load-bearing in more places than it looks.** Nearly every
unrewritten notice — `door.locked`, `fight.won`, `pouch.empty`, the settings
and vault lines — is addressed to *you*, and the lint now calls that a
narrator. They are declared placeholders rather than quietly rewritten,
because they belong to screens nobody has designed a voice for yet: **a
settings screen is the one place in the game where there may be no character
at all**, and deciding that is a ruling, not a rewrite. It is the largest
unowned tranche in the file and no card names it. It should get one.

The debt is otherwise exactly the size the last wave said: thirteen rooms of
beats, every tap answer, every intent line, art. 87's origins. All of it is
still true, flat, unhaunted prose in a register that has now been repealed —
which is worse than it was a week ago, because the frame around it is no
longer in the same voice. **The seam is now audible**, and that is a feature
of this wave rather than a defect of it: the arrivals are frame prose
standing in a room, and a player who reads one and then taps the wall hears
the game change person mid-breath. Cards 27–29 close it.

**What the life and company waves added while this one was being written**
lands on the same two piles, and both were sorted rather than left to be
found later. Their **endings are scrawls**, written like the rest and true
like the rest: the Silt Mother's says *"she takes whatever you hold highest.
do not wait"* because `bind: highest` is two of her five intents; the
Kindled's says *"claim something every turn. it feeds on the empty ones"*
because hunger is the one intent in the depth that charges for a turn spent
doing nothing; the Warden's two lines are the two ways that fight can end,
and the one it writes when it wins names the seventh intent because `KEEP 18`
is what the seventh is. Their **room prose** — art. 117's unbidden lines and
the hall's line when the key turns — is placeholder, with the rooms it
belongs to. Nothing new was written in the repealed register by this wave;
what arrived in it was declared.

---

## The life wave (arts 71, 106–110, 117)

The playtest verdict, verbatim: *"it's not much if anything but a clicker
simulator."* The skeleton was legibility-first on purpose, and this is the
turn toward feel. **Nothing here adds a mechanic.** Every part of it makes
what already exists behave like a place instead of a form.

### The pick follows the thumb (card 63, art. 71 strengthened)

A picked door stayed picked. Tap an urn, press the door verb still sitting in
the strip, and you are through a door you were not looking at — attention
moved and the commit did not.

**The act strip serves the last look.** Tapping any thing releases a picked
door; a door verb may only ever commit the door currently picked; **no pick
means no door verb on the strip.** The defect actually lived in one line of
the shell — a fallback that re-picked `ahead[0]` whenever the pick was
empty — so the pick is a small pure module now rather than a variable the
shell remembers to clear, and "a tap on a thing releases" is a fact of the
model instead of a habit of the caller.

Arriving still picks the first door, because the ruling is about attention
*moving* and nothing has moved yet: a room you walk into and walk out of costs
what it always did. The declared cost is one extra tap when you interleave
looking with leaving, and it is the right trade — commitment is only drama
when the commit is the thing you meant.

The summons (art. 68) is untouched and tested for it: a Take that looking
summoned survives the release, because the summons is knowledge and the pick
is attention. The two arrive in the *same press*, which is the case worth
having a test for.

### The stir (card 64, arts 106–110 built)

Three articles had been ratified for two waves with nothing behind them. All
of it is built:

- **One world clock** (art. 109), ticking at 150 ms, with every loop's phase
  hashed off its own identity. No per-thing timers: a phase is a function of a
  name and a length, so there is nothing to hold between paints and nothing to
  drift. The ash passage runs three loops and no two of them pulse together.
- **Overlay repaint** (art. 110) on the cached cast. The frame cache is keyed
  on the scene state exactly as before; the stir is `overpaint` on top of it,
  which is the job `overpaint` was written for two waves ago.
- **Cast twice where the room must breathe.** A room lit by fire gets its
  light lifted a step in a second cast, and the clock alternates the two
  prepared frames. It is the one case an overlay cannot do — the light reaches
  every surface and what colour a surface takes is the cast's to decide — and
  it is why `swell` is a scene-level number rather than a prop.
- **The budget as a function.** `overspent()` is art. 107 in code: three
  loops, three frames, one of each kind. A test reads it for every room, so
  the article binds rather than being quoted.

**Which rooms spend what.** Every room with a way out spends the doorways'
stir, and it is the one loop nobody authors — `motionOf` adds it, so it is not
written down twenty-two times.

| room | beyond the doorways |
| --- | --- |
| the wet passage · the sewer | **water** — the runnel's sheet |
| the cistern | **water** — the one line the black water gives back |
| the font | **water** — the skin on a hand's depth of it |
| the ash passage | **fire** (the bearer's lantern) · **motes** · the light swells |
| the kiln · the hoard | **fire** (the brazier, the lantern) · the light swells |
| the barrow | **stars**, twinkling |
| the choir · the watcher | **the blink** — the lit points out for one frame |
| the other thirteen | the doorways, and nothing else |

Fourteen of twenty-two rooms spend only their doorways. That ratio *is*
art. 107: every added motion devalues every other, and a depth where
everything moves is a depth where none of it reads.

**A junction's turns stir too**, and they had to be done differently: a turn
is a hole the cast put in a wall, not a threshold standing on the floor, so
there is no prop to repaint at a phase. The `Brush` gained `surfaceAt`, which
hands a prop the cast's own answer to which pixels are the dark a turn goes on
into — art. 16's mouth, and in a chamber with turns the only mouth there is.
Guessing at that region in screen space would have been the flat crest
art. 102 refused, one level down.

**A loop's frames share one silhouette**, and that is a real constraint rather
than a style note. An overlay repaints on the frame under it, so a flame that
shrank between frames would leave the larger flame showing through it. What an
authored frame varies is what its cells are *made of* — the fire runs through
the flame, the blink is the same face with the light out of it — and a test
asserts it cell by cell for all five drawings that move.

**Determinism held, and the golden plate did not move.** `WAKE` spends
nothing, so the plate is untouched at `bbf46771`. The stronger clause is
tested directly: a room whose only loop is its doorways moves **inside its
doorways and nowhere else**, measured against the framed footprint art. 105
already defines. Standing in the Crossing and sampling the canvas gives a
clean three-state cycle and nothing else, forever.

### The unbidden beat (card 65, art. 117)

**A room may do one small thing of its own accord.** Rarely, scheduled off the
world clock, deterministic per instance, pixels first, at most one line, said
once, never gating anything and never moving the candle the player is on.

Seven of twenty-two rooms have one, each keyed to that room's own furniture:
dust off the Crossing's grate, dust out of the alcove's far niche, a tread
letting go in the stair, a ring crossing the font's water, the kiln's brazier
spitting, ash sifting through the pyre, and a line of stars going out and
coming back over the barrow. Four painters do all seven — `sifting`,
`ripple`, `sparks`, `passing` — because what makes a beat that room's own is
the mark it is given and the tone it falls in, not the arithmetic of falling.

**It waits on the thumb, not on the clock.** The delay is hashed off the
instance (56–151 ticks, so 8–23 seconds) and counts from the last press, which
is what keeps a room from ever speaking on top of a tap. The first cut also
refused to speak while the word band held a notice, and that was wrong: an
answer sits in the band until something clears it, so a room whose last tap
left a line would never have spoken at all. The soonest delay is twice the
fade, so by the time a room says anything the answer has been read and gone
dim — and the *candle* underneath is untouched either way, which is the part
art. 117 actually protects.

**Said once is shell state, deliberately.** A rung on the vault for a line
that means nothing if it is missed would cost every player a migration; the
schedule is deterministic and the once-ness is not persisted, so a reload can
let one room speak twice. That is the honest cost and it is the right one.

### Reduced motion, and what it proves (art. 116)

With it on, **the clock does not run** — not the paint being filtered, because
a clock left running with its output discarded is a thing somebody later
forgets is running. No loop, no blink, no swell, no unbidden beat. Walked a
depth with it on: every frame is byte-identical to the last, and nothing
became unreadable, because a loop only ever repaints something the cast had
already put there.

The unbidden beat does not fire at all with the setting on, rather than firing
silently. Art. 117 says it may never be required reading, so nothing is lost —
and "total stillness" stays a claim that can be checked rather than a claim
with an exception in it.

### What read worse in motion than still

Art. 106's bet is that stillness is capital, and the wave is where the bet
gets tested. Two findings, both honest:

- **A shut door at depth barely stirs.** The darkness in a shut threshold is
  the reveal — the recess between the aperture and the plane behind it — and
  at 40 world units that ring is under a pixel wide. The **throne hall** is
  the one room in the depth whose shut doorway moves *nothing at all*: its far
  wall stands at 58. Opened, the hole is full of the room's own darkness and
  churns like any other, which is the state the room is in for the half of the
  visit that matters. The test names the throne hall explicitly rather than
  quietly excluding it.
- **The throne hall's braziers do not burn**, and that is a boundary rather
  than an oversight. Art. 108 says a moving thing that cannot be tapped is a
  bug, and the throne hall's braziers are not tappable — making them so is a
  noun and a line of prose, which this wave's boundary excludes. It is a
  one-line follow-up for the next content pass, and the room it would help
  most.

Nothing read *worse* moving than still. The nearest thing to a regret is the
motes: with three authored frames a field cannot truly drift, so the drift is
a twinkle — a second population beside the cast's own, turning over — which is
what art. 101 licenses anyway ("it may drift and it may twinkle") but is not
what the word "drift" promises.

### Still open after this wave

- **The phone pass** (below) is untouched, and the stir makes it slightly more
  urgent: the doorway's churn lives in the bottom two steps of the ramp, which
  is exactly the register `blendAbove` is unverified in.
- **The throne hall's fire**, above.
- **A shut threshold's recess** is authored at 2.2 world units and that is
  what makes a far door's stir sub-pixel. Deepening it would change the door
  grammar in every room, which is an art. 97 question and not a motion one.

---

## The reason wave (card 66)

The playtest's verdict was *"the story doesn't give me a reason to care about
the protagonist, or want to get out, or even know where I am."* The finding
behind it was not that the premise was missing. **The premise existed and did
not ship.** GAME.md's fantasy opens with it — you wake beneath Castlebrynth
with a pouch of bones and a name you keep saying, your brother's, and down is
where your brother is — and not one string in `prose.ts` carried any of it.
This wave was delivery, not invention.

Scope was **the frame**: the moments that hold a run, not the rooms inside
it. Room prose is still placeholder and cards 27–28 are still the register
passes. Four facts, delivered obliquely and never as exposition: **the name**
(he is your brother, he is never named — depth 3 owns the naming), **the
want** (down is where your brother is, which is why art. 9's forward-only
ratchet is the premise and not only the rule), **the place** (Castlebrynth
keeps what it is given), and **the dice** (art. 86 was already law; the frame
makes the implication land — *you check every one*).

### Every frame string, before and after

**The threshold** (`gate.*`, `src/content/prose.ts`)

| | |
|---|---|
| before | *The way down. Stone stops at a shut door, and what comes up under it is colder than the room.* |
| after | *The way down into Castlebrynth. Stone stops at a shut door, and what comes up under it is colder than the room. You say the name to it again.* |
| before | *The way down. The door stands as you left it, and the run behind it is still yours.* |
| after | *The way down. The door stands as you left it, and the run behind it is still yours. Your brother is further down than that.* |
| before | *The run ends here, unfinished. The depth behind it goes with it, and the Book takes the line.* |
| after | *The run ends here, unfinished. The depth behind it goes with it, the Book takes the line, and the way down starts again at the Crossing.* |
| before | *The door shuts on it. What you carried down is down there.* |
| after | *The door shuts on it. What you carried down stays down there, and the name comes back up with you.* |

The cold line is the first pixels a new player ever sees, so it carries the
place and the ritual and nothing else. It says *the name* without saying
whose: the waking is where you learn that, one screen later, which is the
whole of the sequencing.

**The waking** (`BEATS['room.crossing']`) — three candles became four.

| | |
|---|---|
| before | *The Crossing. You wake, and the ceiling is close enough to touch.* |
| after | *The Crossing. You wake with the ceiling close enough to touch and your brother's name already in your mouth.* |
| before | *Five bones lie in your open hand. Your hand holds six.* |
| after | unchanged (arts 55–56: the hole in the hand is still the invitation) |
| after (new) | *The traveler against the wall is not the one you are looking for. You check anyway. You check every one.* |
| before | *The corridor goes down. Behind you the stone is unbroken.* |
| after | *The corridor goes down. Behind you the stone is unbroken, and down is where the name goes.* |

The third candle is the load-bearing one. It is art. 86 becoming the search:
every die down here belonged to somebody who did not come back, so you check
every body you pass — and the player works out why without a word of it being
explained. The traveler it names is the Crossing's own authored scenery and
not a socket, so art. 83 is untouched.

**The three arrivals** (`ARRIVALS`) — one flat sentence each became two.

| | |
|---|---|
| before | *The floor slopes, and stays sloped. Everything under this runs to water.* |
| after | *Every door you take leans down toward water, and the labyrinth stops offering the others.* / *The floor slopes, and stays sloped. What Castlebrynth is given down here, it keeps under water.* |
| before | *The air dries out. Everything under this has burned once already.* |
| after | *Every door you take opens on something already burnt, and the labyrinth stops offering the others.* / *The air dries out. What Castlebrynth is given down here, it keeps as ash, and the ash is deep.* |
| before | *The walls go pale. Everything under this is bone, and set in courses.* |
| after | *Every door you take goes further in among the dead, and the labyrinth stops offering the others.* / *The walls go pale. What Castlebrynth is given down here, it keeps in the courses, and the courses are bone.* |

The first candle is the one the placeholder was missing: it says what the
*choosing* did. art. 77's twenty questions, answered — the region reads as
the labyrinth leaning where you leaned rather than as a biome loading, which
is what art. 78 means by arrival being the payoff of commitment. A run sees
exactly one of these, so the shared shape is a refrain and not a repetition:
what a player learns across runs is that Castlebrynth keeps everything, and
only the keeping changes.

**The endings** (`run.dead`, `run.finished`, and the two `.choose` variants)

| | |
|---|---|
| before | *The floor comes up. The run ends here.* |
| after | *The floor comes up. The run ends here, and everything you know of it keeps. So does the name.* |
| before | *You go through, and the stair keeps going down.* |
| after | *You go through, and the stair keeps going down. Your brother is not on this depth.* |

The Warden's door is the line the wave is proudest of. Finishing a depth was
a terse shrug; now it is the thing you came down for, not found — which is
what a depth-one ending actually is, and it costs one sentence to say.

**The choosing screen** (`choose.which`)

| | |
|---|---|
| before | *More bones than your hand holds. The rest stay up here.* |
| after | *More bones than your hand holds. Each one belongs to somebody who does not come back up. The rest stay here.* |

**The Book** (`book.title`, and how a line reads)

| | |
|---|---|
| before | *The Book of Ends.* |
| after | *The Book of Ends. Every ending is written here, under the first line.* |

A line of the Book used to be a depth and a seed — a receipt rather than a
record. The `END_LINES` sentences were authored for this sheet and had never
reached it, so a line is now **the ending's own sentence**, with the numbers
dim beside it. Two of those sentences are new: `end.abandoned` never had one
at all (giving a run up writes a Book line and the Book had nothing to write
for it), and `scrawl` is the ruling below — which is in the same map and is
the one thing in it that is not an ending.

### The ruling, as it stands — the scrawl (ratified 2026-08-06)

**The Book of Ends is not empty at the first waking.** One line already
stands in it, and it is not an ending:

> *Find your brother. Whatever else goes, keep this.*

Every ending is written underneath it, numbered from one. It is the cheapest
sentence in the game that makes the Book mean something before the player has
died once: the first thing you read, every time you open it after a death, is
your own order to yourself.

**It changed shape after the merge, and the change is the whole point.** The
straw ruling shipped it as somebody else's ending — *Gone down, and not back
up* — a death that happened before yours, at the head of the record you were
adding yourself to. The direction taken instead is that the line is **your own
hand**: an order scrawled in a hurry, at the top of the Book, for whoever
opens it next, which is you. What it costs is one dead stranger's line; what
it buys is that death stops being the only thing the Book is about. The scrawl
is the reason, and the endings are what the reason costs.

Consequences worth naming:

- **A line with no run behind it is not an ending**, and the reader says so by
  giving it no ordinal and no numbers. That is not an is-it-this-one check —
  nothing anywhere asks which line the scrawl is. It is `seed === null &&
  depth === null`, which is the same fact stated in the data, and the endings
  number themselves among themselves.
- **The Book's framing changed with it.** *"Every ending is written here,
  under the first line"* — which says the thing at the top is not one of them
  without saying what it is instead. The line says that itself.
- **It is the one place in the game where prose carries an imperative**, and
  it is not the breach of art. 66 it looks like: the labyrinth is not telling
  the player what to do, the player is. It commits nothing, it is not on the
  strip, and there is no press behind it.

Built:

- `THE_SCRAWL` is seeded on `firstPermanent`, so there is no "new game" path
  where it could be forgotten — `erase` boots through the same function.
- `EndLine.seed` and `EndLine.depth` are `Seed | null` / `number | null`.
  The honest field rather than a flag: no run behind it, so nothing to print.
- `VAULT_VERSION` is 9. Rung 7 → 8 puts the line at the head of an existing
  Book (idempotent by the cause, nothing else moves); rung 8 → 9 rewrites the
  line the merged v8 build wrote, because an id whose words have been retired
  would otherwise print itself at the player.
- **A law was edited, once.** art. 11 in `.claude/rules/the-world.md` gains a
  single clarifying sentence and nothing else: *the Book does not open empty:
  one line stands in it from the first waking — the player's own scrawl, not
  an ending — and every ending is written beneath it.*

**What it changes elsewhere, and this is on purpose:** the door's Read verb
is offered from the very first boot, because `hasBook` is now always true.
The Book was previously unreachable until you had died, which meant the one
screen that explains what death is *for* was gated behind dying.

### What the frame still cannot carry

The frame is four moments and a Book, and it is now doing all four moments
can do: you know who you are at the threshold, why you are going down by the
second candle of the waking, where you are the first time a region locks, and
what death is for the first time you read the Book. What it cannot do is hold
any of that up **while you are in a room**, and a run is mostly rooms. Every
room beat in the game is still the placeholder tranche — a true, flat,
unhaunted sentence about a floor — and none of them knows there is a brother,
a search, or a labyrinth that keeps what it is given. The lines that mattered
most in this wave work because the frame is where the player is *not*
distracted; the rooms are where they spend their attention, and there the
prose still says nothing to them. Cards 27–28 are the register passes and
this wave deliberately did not touch them. Until they land, the honest
statement is that the game now has a premise and a placeholder middle: a
player who reads the frame carefully knows the story, and a player who reads
only the rooms still does not. The arrivals are the seam to watch — they are
frame prose standing in a room, and they show exactly how much a room's own
words could be carrying and are not.

---

## The threshold wave (arts 96, 99, 104–105, 116)

Two jobs. The look wave's named debts — the junction, and re-authoring the
first fourteen rooms against the bestiary — and then the **front door**,
which the game had never had: it booted straight into wherever you were, so
there was no way to begin again on purpose, no home for settings, and
nowhere the Book of Ends could be read outside an ending.

### The junction is geometry (art. 96)

A chamber whose side apertures are wide and full-height, where **a door is a
direction you turn rather than an item you pick**. The labyrinth has lefts
and rights now, which is the other half of the playtest's "everything is a
hallway".

The hole is **cast, not painted**, for the reason art. 102 gives about
masses: an opening painted on a side wall would run flat across the frame
instead of receding, would agree in size with nothing else in the room, and
could not hide what stands behind it. Cast, all three stop being true. It is
one plane taken away and two put in behind it — a ray whose wall hit falls
in the aperture meets the wall across the turn's far end, or, where the
sight line runs out of the turn first, the dark it goes on into, which is
art. 16's mouth and needed no second vocabulary. The floor and the ceiling
run on into the turn by themselves and art. 18's contour inks the hole
without anybody drawing it.

The far wall is **excluded** for a ray that went through a turn. A plane is
infinite and a wall is not, and letting one through a hole would stand it
outside the room — the one place where taking a plane away is not enough on
its own.

**A junction opens the ways it actually has.** One door is a corner, two are
a left and a right, three put the way straight on between them. Casting a
second aperture for a door the chain never dealt would be pixels promising
something the thumb cannot press, which is art. 97's defect from the other
side. The architrave is a **wall feature** (art. 99), so a turn is framed
the way art. 97 requires without anything being painted in screen space;
a junction's lefts and rights get no threshold prop at all, and the middle
of three gets one because that one is a hole in a wall you are looking at.

**A junction's hero is its turns** (art. 104). The choice is the one thing
in it, so nothing else is placed to compete: its sockets and its props all
stand this side of the openings.

`masonry` states its coursing once now and asks it along three axes — the
side walls, the far wall, and a turn's jamb, which deliberately does not
take the far wall's features. The refactor is byte-identical.

### The shapes, by region

| region | shapes it deals |
| --- | --- |
| drowned | **junction** (the wet passage), chamber, low, vault |
| burnt | **junction** (the pyre), corridor, chamber, low |
| ossuary | **junction** (the den), low, low, chamber |
| neutral | **junction** (the stair), low, low, great, open, chamber, hall, hall |

Four junctions, one per region and one neutral, and no two regions deal the
same mix — art. 77 as extended by the look wave, which makes the mix of
shapes part of what a region *is*. The bonefield moved from a corridor to a
low room to keep the ossuary's mix its own.

### The fourteen, re-authored (arts 99, 104)

Every room in the depth has architecture on its walls now, and every one of
the first fourteen that lacked a hero has one: **coins** in the alcove, a
**skull** in the sump, the **lantern-bearer** in the ash, an **urn** in the
bonefield (the one new drawing), a **bell** in the tally, a **cage** in the
cistern, a **brazier** in the kiln. The rooms that already had a hero keep
it — the Crossing's shaft, the font's bound basin, the Warden's black door,
and a lair's own horror.

The alcove's alcove is a **niche** now, which is what art. 99 says an alcove
is: architecture on the wall plane, receding with the wall, rather than a
rectangle painted on it.

### The wake plate's composition debt (PR #44)

The shaft was composed against a mouth, and once the Crossing ended in a
wall its doors stood behind it and read *through* it. **The fix belongs to
the room and not to the plate**: `WAKE` rendered as itself is a tube with no
doors in it, where a shaft down the middle is the right composition and
always was, so the defect appeared when the shape changed under it and the
shape is where it is answered. `wakeProps` takes an offset and the Crossing
passes one.

Stated honestly: the shaft's **dense core** is clear of all three doors at
every door count, and its outer skirt still reaches the leftmost of three.
That skirt is a scattered field of motes (art. 101) rather than an object,
and art. 105 governs objects — a door reads through a sprinkle of motes and
did not read through the column.

### The thumb can reach everything (arts 68, 69, 105)

A new test asks art. 105 of the *thumb* rather than of the eye, and it found
three real defects — one of them mine.

The shell lays a tap region over every thing at the coordinates it is
painted at, so two things that overlap are two things where one cannot be
pressed. **A thing nobody can tap is a thing that does not answer**, which
is art. 69 as well as art. 105. The kiln's new brazier sat straight under
the floor socket and was unreachable; the sewer's mercy socket stood exactly
where the caps stand; the watcher's mercy socket lay across the middle of
the watcher. The last two predate this wave and had never been noticed
because the Savior is rare enough that nothing had ever been dealt into
either socket.

Art. 6's exception is real and is named in the test rather than derived: the
small thing sits on the large thing *it is part of*, which is the Warden's
lock on the Warden's door and nothing else in the game.

### The threshold (card 61)

The front door. **A screen, not a panel** — the choosing screen established
the shape: a decision of its own gets a screen, with no tabs, because there
is nowhere else to be until it is answered. It does not touch the tray, and
it is a **room, cast the way any room is cast** (`GATE`), with the verbs
where verbs go and the word band carrying its line. Not a main menu with a
logo over it.

It offers **only what is true**, which is art. 71 applied to a front door —
no press may lie about where it takes you:

- **Continue**, only when a run is in flight. It restores the run and its
  panel focus exactly, mid-fight included, and it does that by *stopping
  holding* what boot already restored rather than rebuilding anything.
- **Descend**, only when there is none. It calls the routing that already
  exists, so a pouch that has outgrown the hand goes to the choosing screen
  and there is one statement of that rule.
- **The Book**, when the permanent holds one, through the reader that
  already exists behind art. 74's glyph.
- **Settings.**

**A waking is not a descent**, and that distinction is state rather than an
inference. `wake` deals a labyrinth on a first install, after a death, after
the Warden's door and after an abandonment — every one of those is a run
nobody has chosen to take. `descending` is set by the one press that chooses
to, because a fact the shell has to work out from four other fields is a
fact it can work out wrongly (art. 91's reasoning, applied to a second kind
of state).

**Abandoning is possible and never quiet.** Its own verb, never the same
button as Descend, and what it costs is stated before the press that pays
it. It writes its line in the Book on purpose: an ending a player could take
without it being written down is a record they could scrub by walking away
from the runs that went badly.

**Straw default, flagged for veto.** Boot lands on the threshold *always* —
cold, or standing in the middle of a fight — and Continue is one press back
to exactly where you were. The cost is one press per reload; the gain is a
front door you never have to go and find. If this is vetoed, the
alternative is booting into the run with the threshold reachable from
somewhere, and that needs its own ruling about where.

Two shell defects fell out of building it, both in the choosing screen's
path and both fixed. Focus moved to POUCH to draw the choosing screen and
never moved back, so a run opened with the tray on the pouch — a focus moved
by inference, which is exactly what art. 91 bans; the choosing screen is a
screen and moves no focus now. And the act strip kept the dead run's verbs
behind it, hidden rather than emptied.

### Settings, and art. 116 (card 62)

**A setting may change how the game is presented. It may never change what
is true.** No difficulty, no arithmetic, no drift weighting, no rarity, no
palette override that defeats art. 114 — anything that would make two
players' Books incomparable is not a setting. Where a setting would fix
something, the fix belongs in the thing: a ramp without enough contrast is
corrected in the ramp, where it helps everybody.

**Preferences are permanent state**, because a player who dies has not
changed their mind about motion. `VAULT_VERSION` goes 5 → 6 → 7 and both
rungs are the `fillingTheRun`/`fillingThePermanent` kind: nothing about the
arrangement moves, so **no descent is lost to a settings screen or to a
front door**. The v5 rung answers the one question it can answer without
guessing — a run that has taken a door was begun, and a run standing at the
Crossing with an empty history was not.

**Reduced motion is the test of whether art. 107 was honest, and art. 107
passes.** The game has exactly two motions today: the horror's advance and
the resolve beat, both one-shots. With the setting on they resolve at once
to their settled states, and those states are the whole truth — the horror
stands at the near depth, the turn lands. Nothing turned out to be legible
only while moving. Walked a full depth with it on, fight included: nothing
became unreadable and nothing went silent. Art. 106's stir is still unbuilt,
so there is no loop yet to stop; when there is, this is the setting it
answers to.

Determinism holds by construction rather than by care: **a preference is not
an input to the renderer**, which takes a scene and a configuration and
nothing else. There is a test standing guard over that.

**The vault is the player's.** Export is the bytes on the shelf, not a fresh
serialisation of what the shell happens to be holding — an export that
differs from the save is an export nobody can trust. Import is **refused
rather than half-applied**: the text is walked up the ladder in a scratch
vault first, and one this build cannot read never touches the shelf.

The wipe moved here from the foot of the Book, because section 5 puts it
beside export and two doors to one destructive act is one too many. It is
still two presses with the loss stated between them, and the last copy of
what is about to go is in a box on the same screen.

**Card 32's quarantine debt is closed.** A snapshot this build could not
read has been sitting in the vault with nothing able to show it to anybody;
the settings screen shows it, so it can be copied out and brought back into
a later build through the same box. Bringing a snapshot in clears the
quarantine, because the set-aside bytes belonged to what was just replaced
and keeping them would quarantine the *next* failure behind another
install's.

### The phone pass — **not done** (card 60)

`blendAbove` is **still a guess at a fifth**, verified on nothing but a
desktop panel, exactly as the look wave left it. This wave could not settle
it: art. 95 says the threshold must be settled on a phone, at real
brightness, in a dark room, because a desktop panel cannot show the thing
being decided — and there was no phone. Nothing was changed in its place and
no number was invented, because a value settled on the wrong panel is worse
than a value openly marked as a guess. **The card is still open and the
number in `render.ts` should still be treated as unverified.**

### Still open after this wave

- **The phone pass** (above).
- **Art. 106's stir**, and the motion budget generally. Thresholds are meant
  to move in the bottom two steps of their ramp; nothing loops yet, which
  is why reduced motion had only two one-shots to answer for. **Built by the
  life wave, the next one along** — see above, including what reduced motion
  now has to answer for.
- **A junction's turns have no state.** They are directions and never
  leaves, so there is nothing to open, lock or board — and today no lock
  ever falls on one, because the only lock in the game is the Warden's and
  the Warden's hall is not a junction. The day a junction needs a sealed
  exit is a Blocked question, not a guess.
- **Settings are reachable from the threshold and nowhere else.** A player
  who wants reduced motion mid-descent reloads, sets it, and presses
  Continue — which costs nothing and loses nothing, but is worth saying out
  loud.
- ~~**`CLAUDE.md` still says 115 articles.**~~ Closed by the life wave, whose
  permission covered the index lines carrying its two rulings: all three
  indexes say 117 now.

**And the tray became a rail and panels.** The playtest found two
immersion breaks, and the tray stand-up of 2026-08-05 ruled on both. The
dice sat on screen during exploration as if a fight were always
happening; and you could take a thing you had never looked at, so a
room's contents were a list before they were a place.

- **Art. 67 amended.** The tray is a **persistent rail** — vitals and the
  tabs — and a **panel area** beneath it. ACTS is home, where the room is
  played from; POUCH is art. 60's swap surface; FIGHT exists only while a
  fight does. The fixed regions are not repealed, only relocated: what
  changed is that the tray stopped showing all of them at once. **Outside
  a fight, no die is drawn anywhere but in POUCH.**
- **Art. 68 strengthened — the summons.** An act about a thing does not
  exist until the thing has been tapped. Tap the alcove, the word band
  answers — that answer *is* the inspection — and only then does Take
  appear. The summons persists for the instance (arts 70, 82) and two
  copies of one room summon independently. No inspect buttons and no
  tooltips: a tooltip with an inspect button is what art. 68 abolished.
  Doors were already this shape (art. 71) and are untouched.
- **Art. 90 — tabs are taps.** A tab bar spends nothing from art. 76's
  budget. A tab is a *label*, not a control, so art. 66 does not govern
  it and art. 90 does; the tab words live in their own `TABS` record
  rather than in `VERBS`, because putting nouns under art. 66's lint
  would have meant quietly widening that article. **The slide is a named
  option** — weighed at the same stand-up, not admitted, still eligible,
  and nothing here forecloses it.
- **Art. 91 — panel focus is state.** It rides the run ledger and the
  vault. Transitions are a *table* (`panelAfter`) rather than a branch at
  each call site, because "declared events, never inferences" is only
  checkable if you can read every transition in one go. Booting is
  deliberately not a transition: a player who locked the phone on the
  pouch comes back to the pouch, fight or no fight.
- **Art. 92 — the map is a socket.** A disabled tab is legal; pixels
  behind it are not (arts 31, 85). `Panel` has no `map` member, so
  nothing can focus it even by accident.

The FIGHT panel is its own animal without breaking art. 30 — the world
band is still the room with the horror advanced. What changes mode is the
tray: darker ground, ruled off, lit along its top edge, with art. 57's
running totals and the card's glyph pinned in its header and the hand
under them.

**The pouch is informative, and the hand is chosen at the waking.** The
first cut let you swap dice from the POUCH panel at any time, which put a
hand-change inside a descent and made the panel a working surface with a
guard on it. Art. 60 already said the hand is assembled *for the
descent*, so the choosing moved to where a descent begins: after an
ending, when the pouch has outgrown the hand, the run opens on a screen
that asks which dice come down. A die found mid-descent goes into the
pouch and stays there.

That makes three things true by construction rather than by a guard. The
hand never moves inside a descent, so a fight can never be re-armed
(arts 63, 75). POUCH is a thing you *read* — every die answers with its
declared truth and commits nothing — so it needs no verb. And **the
pouch is shut during a fight**: there is nothing to do in there, and a
tab that only ever says "not now" is worse than a tab that is not
offered.

The ending announces it. A death with a choice waiting behind it says so
in the word band — *"What is on you now is more than your hand holds"* —
and the verb on the strip is **Choose** rather than Descend, because the
press opens a question rather than the labyrinth and no press should lie
about where it takes you (art. 71). An ending with nothing to decide is
untouched: the plain line, and Descend. The prose still never instructs
(art. 66) — it states what is true of the pouch, and the verb is the
only thing that says what to press.

The choosing screen is a screen and not a panel, because it is a
decision of its own. It has no tabs — there is nowhere else to be until
it is answered — and it spends no new vocabulary: the dice are tapped
the way every die is tapped, the picks are staged the way a claim is
(art. 72), and one plain verb commits. It also gives the spare row the
room the POUCH panel could not: **the "spare row has no ceiling" debt is
closed**, because the place that has to show everything you own is now a
screen rather than a strip in the tray.

**And FIGHT is not a tab.** The first cut of this shipped with a real
bug: the duel's verbs were rendered into ACTS, so a fight force-focused a
panel you then had to *leave* in order to roll. Fixing that made the
shape obvious — the fight is not one of the places you can go, it is what
the panel area becomes while a fight is on. It carries everything the
duel needs, takes no room on the rail, and you return to it by pressing
the tab you are already on: a tab is somewhere you step aside to. The
dice of a turn are drawn in FIGHT and nowhere else; ACTS keeps the room's
summoned verbs, which is where spells and consumables will sit.

**FIGHT holds only the duel, so Run moved out of it.** The fight's strip
is a different verb at each step of a turn, and Run was riding along at
the end of each, shifting position every time the phase turned.
Running is not a move in the duel anyway: it is the one thing you can
still do about the door you are standing at, which is a room act. So it
sits in ACTS, in one place, for the whole fight, and it is the first
thing that panel has ever had a reason to hold. It is offered
unconditionally now, through the resolve beat as well — `runFromTheFight`
clears its own timers, so art. 41's "always" can mean always.

The cost is honest and worth stating: **fleeing is two taps now** — the
acts tab, then Run — where it used to be one. Art. 41 says FLEE is always
*offered*, not that it is always one press, and no fight in this game is
timed (art. 1), so the tap buys a strip that holds still. If flight ever
wants to be instant again, the fix is a fixed slot on the rail rather
than a verb back in the shifting strip.

---

## Starting over (art. 11, the one exception)

Resume is the whole point of the vault, and it left the game with no way
back to the beginning short of a player clearing their browser storage —
which is not a thing to ask of anybody, and not a thing most people know how
to do.

**`erase(vault)` empties it.** The run, the permanent ledger, the Book of
Ends, and the quarantine beside them. The `Vault` port grows a `forget`,
because writing an empty string would not do the job: `load` has to be able
to tell "nothing was ever here" from "here is something I cannot read", and
it quarantines the second while waking fresh on the first.

This is the only thing in the game that destroys anything, and it is
deliberately *not* a ritual in the sense arts 11 and 32 mean. Death burns the
run and the permanent survives. This is the player saying they do not want
the permanent either. Art. 11 promises the Book survives death, the reseed,
and a schema change — every one of which is something that happens **to** a
player. None of them is a player asking to be forgotten, and a promise the
game keeps against its own player's wishes is not a promise, it is a lock.

**The quarantine goes too**, and that is the considered part. Its whole
reason to exist is that a snapshot nobody can read yet might be readable by a
later build, so nothing is thrown away by accident. A player pressing this is
not an accident, and a "start over" that quietly keeps a copy is only ever
discovered by somebody who trusted it.

**Where it lives.** Behind the persistent glyph (art. 74), at the foot of the
Book — the Book is the record of everything the labyrinth remembers about you
(art. 84), so it is where the act that ends that record belongs. It is not in
the tray, which is anatomy and holds only what the moment offers (art. 67).
The card's foot gained a `Book` verb so the one glyph reaches both sheets.

**Two presses, with the loss stated between them.** `Forget` arms it and the
sheet says plainly what goes; `Forget all` commits and `Keep` walks away.
Art. 5 says tapping never harms and art. 71 wants a plain verb you pressed —
this is the one act in the game that wanted two of them.

There is no separate new-game path: `boot` already knows how to start from a
vault with nothing in it, because that is exactly what a new install is. A
second path would be a second thing to keep in step.

Driven end to end in a real browser rather than only in tests: three doors
walked, a quarantine planted, `Keep` changes nothing, `Forget all` leaves a
new seed, no steps, an empty Book and no quarantine — and it is still a new
game after a reload.

---

## Masses and features, built (arts 99, 102–103)

The two tiers the look wave named and did not build.

**A mass is a heightfield the rays hit.** The floor is a plane plus a
height, and every downward ray marches against that surface until it drops
below it. So the sand occludes the doors, meets the walls where the walls
are, takes the same light and the same air, and gets the derived contour for
free — none of which is available to a crest painted in screen space, which
would have run flat across the frame, agreed in size with nothing, and been
unable to hide what stands behind it.

art. 103 in full: the surface normal is measured off the *same* height
function the rays are marched against, so the light can never disagree with
the silhouette. The dune's shape is sand's real shape — a long windward
haul, a short slip face, banked hard against both walls — and it carries the
wind's ripples as **geometry** rather than as texture, because a flat mass
shades flat and a mass that shades flat is a stain. Sand takes its own ramp
and sits low on it, so the slope has room to lift a windward face and room
to drop a slip face into shadow.

The **buried hall** is the room that has one. It starts eleven units out, so
the floor underfoot is still floor and the room reads as being taken rather
than as already gone.

**Features are architecture on the wall plane**, flush with it, answering
the same question the masonry answers — where on this surface's ramp does
this point sit. So they take the room's light and the room's air without
being told to, and they recede because the wall does. Seven ship:
`stringCourse`, `pilasters`, `blindArcade`, `niche`, `crack`, `brickedUp`,
and `layered` to put several on one wall.

Four rooms are built now. The **throne hall** has a blind arcade down both
walls under a string course — and the reason its arches cannot be mistaken
for ways out is art. 97: an arcade wears no architrave, and nothing that is
not a way out may. The **watcher** has a bricked-up doorway, which is the
argument for the whole tier in one feature: a frame with the wrong masonry
inside it, saying something happened here without a word of prose. The
**choir** has three empty niches and a run of pilasters; the **sewer** has a
crack and a course.

`brickedUp` is the one feature that *replaces* the grammar rather than
offsetting it — smaller stones on their own courses, out of step with
everything around them. A fill that shares the wall's courses is a patch
nobody notices.

### Still open

- **The junction** (art. 96) — wide, full-height side apertures. Law, not
  built; every room with doors is a chamber or the open.
- **The original fourteen** still use hand-written prop painters rather than
  authored index grids, so only the newer rooms get the derived rim.
- **The phone pass.** `blendAbove` is still a guess at a fifth, verified on
  nothing but a desktop panel.

---

## The look wave (arts 17, 94–96, 100, 113–115)

The playtest verdict was that every room is a hallway, the doors read as
chests, and you cannot tell what anything is. The renderer was not broken —
it was under-specified — so this wave changed the law it obeys and then
built against it.

**The load-bearing amendment is art. 17.** The ban on gradients is lifted
*inside a surface's own ramp*; what stays banned, and is now named properly,
is **alpha compositing** — no translucent layer, no soft mask, nothing whose
colour depends on what is behind it. The original ban was right about the
failure it was aimed at (blending destroyed the material read at four device
pixels to a game pixel) and cut too wide. The answer is to keep the dither
in the darks, where banding actually shows.

- **The ramp is deep and it turns** (art. 94). Sixty-four steps through
  three HSL stops — cool desaturated dark, the school's own mid, warm
  saturated light. `mixHSL` rounds the short way so a ramp never takes the
  long road through green. Every grammar offset in the game was authored
  against ten steps, so `deepen()` carries the masonry, the light's lift and
  the air's gain up by the ramp's new depth in **one place** rather than
  re-authoring fourteen rooms' worth of numbers.
- **The hybrid dither** (art. 95). Blend across the upper ramp, dither below
  `blendAbove` — a fifth today. It is the one number in the render
  configuration a desktop panel cannot settle, and the config says so where
  it is declared. **This is unverified on a phone** (see below).
- **A light is a station, a reach and a colour** (arts 113–114). The station
  resolves to a world point and the lift is Euclidean distance from it, so a
  room lit from below has its ceiling as the darkest surface in the frame.
  Every school declares one, because at sixty-four steps a palette stops
  carrying identity on its own.
- **The open** (art. 96, fourth shape). No walls and no ceiling: the ray
  hits the ground or it hits the sky, and the stars are a scattered field —
  art. 101 doing the one thing scatter is actually for.
- **Things are authored as text** (arts 100, 115). `0`–`9` walk the room's
  ramp, `.` is nothing, `*` is a light that carries, `+` is metal. The rim
  is **derived**: each shape's distance-to-outside is computed once, the
  edge normal is that field's gradient, and how hot an edge burns is that
  normal against where the room's light stands. Nothing is hand-shaded, so
  one drawing lights itself correctly in a room lit from below and in a room
  lit from ahead.

**Which rooms got which light.** Drowned (`WET`, `BRINE`, `SILT`) from
below, through the water. Burnt: `EMBER` from the embers on the floor, `ASH`
from ahead, `SOOT` from nothing at all. Ossuary (`CHALK`, `NOIR`,
`GRANITE`) close and with you. Neutral: `OCHRE` and `VERDIGRIS` from above,
`SLATE` from ahead. The Warden's hall takes no light. `THRONE_STONE` is a
new school and the clearest case for art. 114 — it is the ossuary's palette
almost exactly, and it is unmistakably another place because two braziers
stand on its floor.

**Seven new rooms, and the depth went from fourteen to twenty-one.** The
throne hall (`great`: wide, tall, stops a long way off), the sewer
(`vault`: narrow, low), the barrow (`open`: ground and stars), the choir,
the hoard, the watcher and the crawl. Five shapes are now in play where
there were four boxes at different sizes.

**A bestiary and a hoard**, drawn once each: the hanged, the lantern-bearer,
the many, the choir, the watcher; a skull, a lantern, a ring, a knife, a
bottle, spilled coins; a brazier, a throne, a headless statue, lit caps, an
open cage, a cracked bell. Fire is the one thing a school does not colour —
a green flame in the drowned would be a lie about what is burning — so
`thing()` takes a glow override and the braziers and the lantern use it.

**The golden plate is relocked**, c344dfd9 → bbf46771, with the reason in
the test: art. 17 amended, the ramp deepened and turned, the light given a
station. Every pixel moved and none of them moved by accident. Relocked,
never loosened into a tolerance — a tolerance would let the next wave change
the box without anybody noticing.

### What this wave did not build

Named plainly rather than quietly skipped, because the wave document asked
for them:

- **Masses** (art. 102) and **features** (art. 99) — not started in that
  wave; **both built in the one after it**, see above.
- **The junction** (art. 96) — wide, full-height side apertures. The shape
  is law and is not built; every room with doors is a chamber or the open.
- **Re-authoring the original fourteen.** They took the new shading, the new
  stations and the new thresholds, but their props are the old hand-written
  painters rather than authored index grids, and only the seven new rooms
  use the bestiary.
- **The phone pass.** `blendAbove` is set at a fifth from the demos and has
  been verified on nothing but a desktop panel. The banding threshold the
  definition of done asks for is **not settled**, and the number in
  `render.ts` should be treated as a guess until somebody walks a depth on a
  real device.

---

## A door is a hole now, and the room ends (arts 96–97, built)

The playtest screenshot showed three small outlined boxes hovering at the
end of a corridor. Art. 97 was written about exactly that, and the article
turned out to be describing three separate defects:

- **Two of the three doors had no pixels at all.** The room painted one
  doorway at its single authored mark while the shell laid out up to three
  tap regions beside it, so a crossroads was one drawn door and two empty
  outlines. Doors now come from `SceneState.doors` — one threshold drawn
  per door offered, each in its own state — and `doorMarks(count)` is the
  single place both the paint and the thumb ask where they stand (art. 68).
- **They were half-height.** Doors were authored eight world units tall
  against an eye standing at fourteen. Nothing that size is a way through a
  wall, so the eye read the nearest thing it could: a chest. A threshold is
  now seventeen units in a corridor — a head's clearance over the eye — and
  art. 97's taller-than-wide falls out of the height instead of being asked
  for. `THINNEST` enforces it whatever a mark requests.
- **The box was the UI.** The gold rectangle was the tap region's CSS
  border, drawn identically over doors and over anything else tappable. A
  door that is drawn as a door needs no box to say so, so the border is
  gone; only the door the thumb has *picked* wears one, and that outline is
  a pick rather than a doorway.

What replaced them is the grammar, in one function no room may override:
architrave standing proud of the wall, aperture recessed to a plane set
back behind it, jambs and soffit and sill shaded by their own faces, the
inside at the bottom of the room's own wall ramp tinted by its air, and the
lock — when a door wants a key — on the frame rather than in the hole.
The frame's stone comes off the light end of the wall's ramp rather than a
named tone, so it reads proud in the drowned and the burnt alike (art. 100:
one drawing, two keys).

Two doors and three doors share the far end by slicing it, and art. 105 is
enforced on the **framed** footprint rather than the aperture: the first cut
spaced the holes correctly and let the architraves touch, which read as one
wide barrier — the same failure as one thing cut in half. Doors give up
width rather than overlap.

**And the room ends, so the hole has something to be a hole in (art. 96).**
The first cut of this shipped thresholds standing in a tube: correct
grammar, correct height, and still a frame hanging in fog, because what lay
between two doorways was the mouth's darkness rather than stone. A door is
a hole and a hole needs a wall.

The chamber is built. `RoomShape` gains one optional fourth number — `back`,
the depth its far wall stands at — and the cast gains one more plane, which
is all art. 96 ever claimed it would take: every ray reaches the back at the
same depth, so it wins wherever it is nearer than the four. Everything else
came free, exactly as the article says. The contour pass inks the new
corners without being told. The fog dims the wall because it stands inside
it. The light lifts it. The masonry answers for it — the same grammar,
coursed across `x` where a side wall courses along `z`, so the courses line
up where the two meet and the corner reads as a corner rather than a change
of material.

A threshold's depth is now the wall's depth and is never authored beside
it, so a door cannot drift off the wall it is a hole in.

**One room stays a tube: the Crossing.** Its plate is the reference and it
wins ties about the box, so `WAKE` is untouched and still renders as itself
byte for byte. The room takes the chamber's shape while keeping the plate's
props and light — because the alternative was doors that float, and no room
gets an exemption from art. 97. The cost is honest and worth writing down:
the wake plate's shaft of light was composed against a mouth, and it now
stands between the camera and the far wall's doors. The doors read *through*
it rather than beside it. Art. 105 says supporting things stand aside from
the hero and the hero here is the shaft, so the Crossing wants a composition
pass — the doors moved off the shaft's axis, or the shaft narrowed. It is
the one room in the depth whose picture was authored before there was a wall
in it.

Making the Crossing a tube and staging its way on as the mouth was tried and
reverted. It reads beautifully and it costs a choice: a tube can show one
dark end, not three, so the Crossing would have to deal one door — and
`gen.drift.test.ts` measured what that does, dropping a committed policy's
lock rate from over 0.7 to 0.667. The room that opens every run is where
the drift's tally starts, and taking a choice out of it weakens art. 77
measurably. The wall is cheaper than the choice.

**A prop that marched past the wall now stops at it.** `reach()` answers
with the nearer of the mouth's cutoff and the far wall, because anything
laid beyond `zBack` paints floor onto stone — the runnel, the ash banks, the
standing water, the bone drifts, the seep's third leak, the stair's flights
and the tally's last groups all ran four to nine world units past where the
room now ends.

Art. 106's stir is not built either: a doorway's darkness should move in
the bottom two steps of its ramp, and doing that needs art. 109's one
clock and art. 110's overlay repaint. A per-thing timer would have been the
wrong shape, so the thresholds are still.

---

## The look is law now (arts 93–112)

The graphics amendment is ratified. Arts 13–28 have always said the box
cannot lie; they never said what may stand in it, and the vacuum was
filled the way vacuums are — a door that was a dark rectangle standing on
the floor, which is a chest; sand drawn as eight sprites, which is eight
small piles; scatter used for things that have silhouettes to get wrong.
Twenty articles close that gap, drafted from four demos and numbered at
merge. **No pixels changed in this tranche** — the shading half (94–95)
already shipped under card 43, and everything from 96 down is law waiting
for its build cards.

What the amendment settles, in the order a renderer would need it:

- **A room is six parts, and a school is three of them** (art. 93). Box,
  surfaces, light, air, things, contour. The school — surfaces, light,
  air — is what a region shares, which is the unit card 48 was already
  reaching for without a word for it.
- **Shape sits above proportion** (art. 96). Tube, chamber, junction. The
  three dials were never enough: a depth built from proportions alone is
  one room at different sizes. This amends art. 14 — a chamber authors
  its far wall's depth, the only fourth number — and art. 16, whose mouth
  is now what a room has *instead of* a far wall rather than always.
  **Built**, chamber only: the junction's wide side apertures are not.
- **A door is a hole, not a thing** (art. 97). Taller than wide, standing
  on the floor, recessed honestly, framed, dark in the room's own
  darkness. A fixed grammar learned once and read forever, and the reason
  the playtest's chest-reading was a law failure rather than an art one.
- **Three tiers, and the middle one does not exist yet** (arts 98–99).
  Grammar, features, things. Features — pilasters, niches, a crack, a
  bricked-up doorway — are what make walls differ by more than colour,
  and the game has none. *A grammar without a gradient is wallpaper.*
- **Objects are drawn, fields are scattered, masses are geometry** (arts
  100–103). A sprite is a bitmap of ramp indices, so it cannot fall out
  of palette and one drawing serves the drowned and the burnt; it carries
  a derived contour of its own. A mass is a height on the floor that the
  cast marches against, shaded by slope, banked against the walls.
- **One hero, and things keep their distance** (arts 104–105).
- **Stillness is capital** (arts 106–110). Thresholds stir and almost
  nothing else does. At most three loops per room of at most three
  authored frames; one-shots that end in the settled state (art. 1); one
  blink, rarely. A moving thing that cannot be tapped is a bug, and a
  fleeting window (art. 4) announces itself by moving. Mechanically: one
  world clock phase-offset by hash, and animation as overlay repaint on a
  cached base frame — cast twice and alternate where the whole room must
  breathe — so art. 17's identical re-render survives motion intact.
- **An answer names the thing** (art. 111), and **a third of the frame
  stays dark** (art. 112). The first is now in voice.md's list; the
  second was in the design agent's file as taste and is law now.

Two debts are opened by ratifying rather than closed:

**Three of the four demos are not in the repo.** Ramp shading is kept as
`reference/castlebrynth-ramp-shading.html`; shapes, sprites and
composition are not. Every other rule file names a reference that wins
ties about intent, and arts 96–110 name three that cannot. Until they
land the articles are the only statement of what the demos proved, and
the file says so rather than implying a precedence it does not have.

**Nothing is enforced by a test.** No test parses the rules, so the
amendment binds reviewers and agents and nothing else. The candidates
worth a lint when the builds land: a threshold whose authored width
exceeds its height (art. 97); a room declaring more than three loops
(art. 107); a room whose props' screen footprints overlap (art. 105); a
tap answer whose first sentence names nothing (art. 111, which is the one
the voice lint could take today).

One open question in the ledger below shrinks. *"Art. 19's paint order —
the law does not say whether a light is a sprite or atmosphere"*: art. 101
answers half of it. A shaft of drifting motes is a field, so it is
atmosphere, and it may never be an object. What the law still does not say
is the paint order when a *drawn* thing and a field share a depth.

---

## The turn is three presses (art. 41, amended)

Roll, Reroll, Attack. That is the whole loop now, and the two verbs that
left are the point of it.

**Keep all is gone.** Holding every die and pressing Reroll throws
nothing, which is the same sentence said in the vocabulary the phase
already has. One button per step, and the dice are the other half of the
interface.

**Claim and Take back are gone, folded into Attack.** The selection *is*
the attack: one press claims what the selection makes and ends the turn
behind it. Nothing is committed until that press, so there is nothing to
take back — a tap on a chosen die un-chooses it, and that is the whole of
undo. When the selection claims nothing the button says End turn instead,
because arts 46 and 63 both require a turn to be endable with nothing to
hit with.

**A turn therefore claims once, and it was measured before it was
ruled.** Against the Gnawing, over 1200 fights per policy:

| hand | several claims | one claim |
|---|---|---|
| bare five | win 0.286 over 3.9 turns | win 0.299 over 3.9 turns |
| six (a bone found) | win 0.818 over 3.4 turns | win 0.804 over 3.5 turns |

Inside the noise both ways. The second claim scrapes a leftover pair off
a hand whose turn is already decided — it was three presses buying
nothing. Art. 45's several-combos clause is spent, though the engine keeps
taking more than one claim per turn, so a good that grants a second attack
still has its socket.

Art. 64's central decision survives with a new price. A composite against
two simple lines is still the card's live question; the two simple lines
are now two *turns*, and you pay for the second one with a turn of the
horror's intent landing on you. That is a better version of the decision
than the one where both fit in the same press.

**The vault carried all of it.** `VAULT_VERSION` went 3 → 4 → 5 in one
wave, and both rungs are the *good* kind: nothing about the arrangement
moved, so they fill the new field and leave the run standing where it
was. That is a second shape of migration (`fillingTheRun`) beside the
run-dropping one, and the difference between them is now explicit. A
tray change may not cost anybody a descent.

**And the dice belonged to somebody.** The collection has been a socket
with nothing in it for four waves. The **travelers wave** fills it, and
changes what loot *is* on the way past. An item that is a stat block with
a name on it is more mechanics, and players can tell; what makes a found
thing mean something is that it came from somewhere and tells you
something true about the place. So the ruling of 2026-08-05:

- **Art. 12 is repealed.** There are no classes, ever. Your build is who
  you have found, and nothing may be built that assumes otherwise.
- **The start is five bare dice** against a hand size of six (art. 55), so
  the tray shows one empty slot from the first waking. The hole in your
  hand is the invitation — and once it is filled, **six is the standard
  and every further find is a swap**, never an addition (art. 60, amended
  the same day).

  > **Superseded by the ruling of 2026-08-06.** The start is **six** plain
  > bones and a full hand: nothing has to be picked up to make the hand a
  > hand, and only a *special* die is ever discovered. The hole read as a
  > bug rather than as an invitation — the room you wake in has a body
  > lying in it, and a player who taps it and gets nothing concludes the
  > game is broken. Every find is now a swap, including the first.
- **Every die past those five belonged to someone who came down here and
  did not come back** (art. 86). Each rare individual leaves exactly one
  unique die, and a die's shape is how its owner died: the distribution is
  how they played, the cost face is the mistake that killed them.
- **An item's origin explains its rules, in one sentence** (art. 87), for
  every good that ships. A rider is a habit somebody carried into a fight;
  a bond is two people who went down together; a talisman is the luck
  someone brought; a wearable is what they wore. If the sentence cannot be
  written the item does not ship — and the sentence is prose, so it is
  linted as prose.
- **A good may be pure knowledge** — a name, a mark, no stat (art. 88).
  Nothing ships on that axis yet; the socket is named.
- **A floor socket may offer a fork** (art. 89): two goods, where taking
  one forfeits the other, stated plainly before the take and final after.

The Crossing's waking ritual went with the law that needed it. There is no
pale bone to pick out of your own hand any more — waking is the room, and
your first die is a dead traveler's, which is also your signature
(art. 56).

**And the vault stopped being one schema change from a disaster.** `load`
answered a snapshot from another version with `return null`, and the next
`save` wrote over it, so the next time the ledger's shape moved it would
have taken every Book of Ends with it — the one thing art. 11 promises
survives everything. There is a migration ladder now, and a quarantine for
anything it cannot walk. Nothing is destroyed. That debt is closed.

The dealer was dumb. It dealt a single path, so art. 31's two-to-three
doors did not exist and blind play had nothing to choose between; that
was the first debt on this list, and it is closed. The replacement is
**the drift** (arts 77–85): every dealt door carries a hidden region
tag, choosing tallies it, and the pools weight by the tally, so the
labyrinth leans as the player leans. At a content-set door count one
region locks and takes the rest of the depth. Twenty questions, not a
fork in a road — no single door means much, the pattern means
everything, and every run arrives somewhere.

Three things changed shape underneath that. Dealing is **lazy**: a room
is dealt when its door is opened, from seed plus choice history, so the
road not taken is never computed and cannot leak (art. 79). Winnability
stopped being a **search** and became a **construction**: required items
are unbound from rooms, and the dealer places the key in the path ahead
of the lock it opens (art. 80). And a room now has a **template** and an
**instance** (art. 82): rooms repeat within a run, knowledge keys on
what you recognise, and scene state keys on where you stand.

### The travelers, and every good that ships

Three travelers, each an encounter through art. 83's registry — floating,
rare, unique per run, met-flagged per art. 84 — each leaving exactly one
die through the `meet` and `collect` rituals. Their dice, and the rest of
the catalog, with the sentence each one ships under (art. 87):

| good | what it is | origin |
| --- | --- | --- |
| **the last push** | die {1,5,5,6,6,6}, cost 3 on the 1 | *The one who throws high, and again, and again, until the throw that lands low.* |
| **the careful bone** | die {2,3,3,4,4,5}, no cost | *The one who never throws high and never throws low, and dies here regardless.* |
| **the last room** | die {2,3,4,5,6,6}, cost 2 on each 6 | *The one who keeps the strong throw for the last room, and opens something reaching for it.* |
| **the sisters** (two halves) | plain faces, bonded (art. 52) | *Two who go down together, and are worth anything only when they land together.* |
| **the leech** | die with a healing rider on its 6 | *The habit of taking a little back off whatever you hit, which does not keep you alive.* |
| **the counting cord** | talisman, ladder species: runs score a tier higher | *The cord of one who counts the way down in order, and what you claim in order scores a tier higher.* |
| **the rusted plate** | wearable, armor 3 | *Iron somebody wears down here, rusted through in two places, and still good for three.* |

A **cost face** is a rider in the ordinary art. 51 sense: it fires only
when its face is *spent in a claim*, so carrying one is free and reaching
for it is not. Armor does not eat it — it did not come from the horror.
That is what makes a cost face a decision rather than a tax, and it is why
the pusher's price sits on the throw that fails and the runner's sits on
the throw that works.

**The Orphan does not ship.** It is over the plain bone's budget with no
cost face and nobody it came off, so art. 87 refuses it. It survives as
the die the audit is pointed at — `paid: false` — because an audit no die
ever fails is an audit nobody can trust.

**The Sisters' halves are banded apart**, the elder to the first half of
the depth and the younger to the second. Finding one half then means the
other is somewhere below you, which is a goal the labyrinth gave you
rather than a quest handed to you.

**Two forks ship** (art. 89): the elder Sister against the plate — build
against body — and the leech against the careful bone — sustain against
consistency. Taking one writes two deeds: the other's act, which closes
the offer, and its loss, which is what the floor remembers. The room says
the terms in one candle before either verb reaches the strip, and the good
you left leaves its shape in the dust.

**A found thing is worth something now.** A die fills an empty slot the
moment it is taken rather than at the next waking, a wearable arms you
from the next blow, and a talisman is in the next fight because the fight
reads the permanent at the door.

> **Narrowed by the ruling of 2026-08-06.** With the hand full at the
> waking (art. 55 as amended) there is no slot for a die to fill, so the
> clause now fires only where a mercy has grown the hand past the pouch. A
> die found mid-descent is a spare, and it comes down at the next waking
> by way of the choosing screen. The wearable and the talisman are
> untouched.

**And past a full hand, a find is a swap** (art. 60, amended by the
ruling of 2026-08-05). The first version of this wave let a find *fill*
the hole and then had every find after it pile up in a pouch no waking
ever looked at again — the collection grew and the build did not, which
is the opposite of what art. 86 claims. The fix: the pouch is ordered,
the hand is its first `handSize`, and everything past that is a
**spare** — owned, kept between runs, not in play. Taking a die with the
hand full asks which one it replaces, and the exchange is a straight swap
of positions. Nothing is destroyed and nothing is sold; the pouch is the
collection and a swap only moves things inside it. Because the order *is*
the hand, the six you chose are still the six you wake with, for free.

Under the thumb it is staged the way a claim already is (arts 68, 72):
tap the die that leaves, tap the spare that takes its place, press
**Swap**. No new interaction type enters the game (art. 76) — the tray's
dice were already tappable and selection was already a staged concept.
The hand does not move while a fight is in flight or paused behind a
door: art. 75 replays a fight off the hand it was opened with, and
re-arming between backing out and going back in would launder a card
(art. 63). A good found in that state lands the moment the fight ends.

**It does not move the survival curve, and that is the honest finding.**
Six runs, 1200 players, coin-flip doors, taking every good: without the
swap 0.226 / 0.390 / 0.493 / 0.570 / 0.617 / 0.652; with a crude
biggest-numbers chooser swapping, 0.221 / 0.393 / 0.493 / 0.558 / 0.621 /
0.647. Identical inside the noise — because the cost faces price the
bigger dice correctly, so a greedy "take the higher sum" swap buys
nothing. The swap is not a power increase; it is the difference between a
collection and a pile, and its value is a decision a simulator cannot
make.

**And the depth heals — half as lethal, not solved.** A bare player now
finishes depth one about a third of the time rather than a fifth; the
numbers and the model behind them are in Debt, below.
Art. 40 named a Sanctum and a Savior and left
what each restores to the economy; the economy is still parked, and healing
never needed it — only numbers. The ruling of 2026-08-05 sets them: **the
Sanctum restores half of missing health, the Savior all of it, and neither
charges anything.** Both are built. The Sanctum is a *place* — the font, a
room in the neutral pool with a basin bound to it, promised to every run at
step 2 or 3 whatever the drift does. The Savior is a *being* — the Mender,
which floats into any ordinary room's mercy socket, is unique per run, and
remembers you. That fills the last two rows of art. 83's straw table and
writes the first mark into art. 84's memory socket.

**And the rooms stopped wearing a screen door.** At GRID 240 on a phone —
about three device pixels to a game pixel — the box dithered four times
per pixel: light, light-accent, fog, fog-accent, each pass with the same
4×4 Bayer matrix, each between colours far enough apart that a dot read
as a dot. Layered lattices compound into a lattice, and a lattice over
every surface is a screen door rather than shading. The **ramp wave**
replaces the whole of that with one rule. Each surface gets **one ramp**
— a dark end, a light end, a step count, a bend — and a pixel resolves to
a single scalar, a position on that ramp, before any colour is chosen.
Everything that used to pick a colour now moves that scalar: the stone's
variation, the seam (a groove, so it stays a groove when the light moves
across it), the defect drop where a cell came up wrong, the pale cell's
inclusion lift, the light's lift falling off with distance, the air's
drop with z. Then **one** dither, between the two adjacent steps the
scalar falls between, thresholded against **interleaved gradient noise**
instead of Bayer — deterministic, so art. 17's identical-re-render law
holds unchanged, but scattered rather than gridded, so a half-lit surface
reads as a surface. Nothing moved: the same box (art. 15), the same
derived contours (art. 18), still no alpha and no gradient (art. 17),
still nothing in device pixels (arts 22–23). The visual bar is
`reference/castlebrynth-ramp-shading.html`.

**The knobs, named.** Per school, in `src/content/palettes.ts`: the three
**ramp ends** — the darkest and lightest tone the school already declared
for that surface, the light end carried 45% further along the same line so
the light has somewhere to lift into (along the line, not toward a pale
neutral, or the kiln stops being hot); the **step count**, 10 wall, 10
floor, 8 ceiling — under seven and the bands show, over about fourteen and
it stops reading as pixel art; the **bend**, 1.5 / 1.6 / 1.35, weighting
steps toward the dark end where this game lives; the **base**, where that
surface's commonest stone already sits on its own ramp, derived rather
than typed so every room starts exactly where it stood; and the **light**
(reach 22 world units, lift 1.9 steps, a 10% tint after quantisation) and
the **air** (the mouth's own darkness). Per depth, in
`src/content/plates/wake.ts`, the masonry's **offsets**, all in ramp
steps: seam −2.9, brick tones −1.25 / 0 / +1.1, the pale cell +2.4,
defect −2, damp −0.9, moss −1.5, and the flags' and slats' own. The
distance drop is `RENDER.fog`: nothing until 0.3 of the cutoff, nine
steps by it.

**What converted badly: nothing, and one thing.** Every school's mortar,
bricks and flagstones land within four bytes of their own ramp's line —
the fourteen palettes were in key with themselves, which is the good news
this measurement was asked for. The exceptions are **`moss`, `moss2` and
`damp`**, which were never value departures but hue ones: a green patch
on a warm wall, a blue one on a cold floor. One ramp can only spend them
as drops, so the waking corridor and the wet passage lose a little of
their green (MUTED off the line by 16 bytes, WET by 14, BRINE by 11,
SILT and VERDIGRIS by 8; every other tone in every school is under 5).
Giving those cells a short ramp of their own, or a tint after
quantisation like the light's, is a question for the wave that ratifies
the articles — not a licence to re-author a room.

One lattice survives, deliberately: **props still dither with Bayer**.
The grate's falling light in the waking corridor is the visible one. A
sprite covers tens of pixels rather than a wall, the reference plate was
authored against that matrix, and props were outside this wave.

What is still deliberately unfinished: the prose is functional
placeholder rather than the register — more of it than before — the
ordinary rooms are art. 26's first tier and not its second, and phase
0's non-goals all still hold.

---

## Where the shell broke the thumb, and where it no longer does
The list below is the audit taken when `.claude/rules/the-thumb.md` was
ratified. Every line of it is closed. What each article got is named, so
that a later playtest can argue with the reading rather than guess it.

- **art. 66 — controls narrated.** Closed. Controls come from `VERBS` in
  content and are plain imperative verbs of two words or fewer: Take,
  Open, Fight, Descend, Roll, Reroll, Attack, End turn, Run, Read,
  Close, Wake, Choose, End run. A door's sensed line is what
  tapping the door answers with, never what a button says.
  `test/content.voice.test.ts` holds every verb to the article — two
  words, a capital, no punctuation, no article and no second person —
  and checks that no act invents a verb of its own.
- **art. 67 — the tray was a menu.** Closed. Three regions in fixed
  places, rebuilt in place rather than appended to: vitals (the body's
  numbers, and in a fight the turn's running totals under art. 57), the
  pouch as slots with the empty ones drawn, and the act strip. The card's
  glyph sits at the end of vitals and never moves. What art. 67 says
  never appears there no longer does: world nouns and doors are tapped in
  the world, the beat advance is a tap on the word band, and the Book's
  lines are in the sheet.
  *Two readings are declared rather than assumed.* The turn's running
  totals live in vitals, because art. 57 requires them visible and vitals
  is the numbers region. What you carry sits in the pouch after the dice
  slots, because art. 68 requires a possession to be tappable and the
  pouch is the possessions region.
- **art. 68 — possessions could not be tapped.** Closed. Every die in the
  pouch, every die on the table, every empty slot and every carried thing
  answers with its declared truth (art. 54) — `src/content/says.ts`, made
  of names from `prose.ts` and numbers from the engine. The world band
  takes taps: `WorldMark` is a billboard in world units, `markRect`
  projects it with the same projector the props are painted through, and
  the shell lays the marks over the canvas, smallest last, at no less
  than a thumb's width. No `inspect` button exists.
- **art. 69 — dead tappables.** Closed. A die spent in a claim is not
  disabled; it is tappable and answers with the line it was spent in.
  Tapping to keep or select answers with the die. The card is a sheet
  behind a glyph rather than an inert strip.
- **art. 70 — acts changed no pixel.** Closed, and this was the section
  everything else waited on. `SceneState` — what has been done here, what
  has been opened, how the horror stands — is what content binds props to
  and what the frame cache is keyed on. Rooms have contents to subtract
  from: the key lies in the alcove and is gone when taken; the fight-door
  stands open once entered.
- **art. 71 — a bare tap walked you through a door.** Closed. Tapping a
  door senses it and chooses it; going through it is Open, Fight or
  Descend in the act strip. `chooseDoor` refuses outright if the room is
  still holding something back (art. 3).
- **art. 72 — keep-marks outlived the recast.** Closed at the engine and
  not at the tray: `recast` clears every mark as the second casting
  lands, so a tray that forgot the rule could not break it. The first
  casting keeps its marks because nothing player-facing reads them and a
  resume replays from them. The four states are a plain face, a cold tab
  along the top, a full inversion, and a sunk gold ring — not four border
  colours. Unused dice dim through the resolve beat.
- **art. 73 — the intent was a note.** Closed. It is a chip in the
  crown over the world band; tapping it says `INTENT_SAYS` in plain
  words.
- **art. 74 — the card was parked mid-screen.** Closed. A persistent
  glyph at the end of vitals opens it in one tap, as a sheet over the
  world, with a Close verb.
- **art. 75 — a half-spent turn did not survive the lock screen.**
  Closed. `FightSave` is written on every fight mutation. The dice are
  not stored: each casting's lot is a pure function of seed, step, turn
  number and casting number, so a resume replays the turn and gets the
  same faces. The phase and the half-made selection are state like any
  other. `test/fight.persist.test.ts` round-trips through the vault at
  five points in a turn across thirty seeds.
- **art. 76 — inside the budget.** Still inside it. The tap is the whole
  vocabulary; nothing here proposes leaving it.

Two rulings landed with the list, because the list could not be closed
around them:

**A fled fight pauses** (art. 63). The skeleton's discard was an
acceptable shortcut while nothing could be carried out of a fight; it
becomes an exploit the moment anything can, which is the next wave. Spent
lines and wounds now persist in the run, re-entering the door resumes,
and the card refills at exactly two moments — a fresh door and the death
that burns the run. It is the same `FightSave` machinery as art. 75:
running out and locking the screen differ only in where you are standing.

**A run can never be walked into unwinnable** (art. 3). Art. 33 binds the
generator and always held — the key is upstream of its lock — but nothing
made the player *carry* it, and the engine has no back (art. 9). Content
marks required items; while one lies unclaimed the room's door verbs
refuse with one line that names nothing and points at nothing. Taking
stays a deliberate act, and optional treasure may still be walked past
and lost, which is art. 4 working. The proof searches every legal path
over the carried-set as well as the room, for two hundred seeds, with a
control run that strands every one of them the moment the law is off.

---

## The full-house defect, still fixed
**It was interactive, and it was fixed at the interaction layer.** The
engine was never wrong: `shapesOf` names FULL HOUSE for every five-die
selection of signature 3-2, and `test/thumb.claim.test.ts` proves that
exhaustively — all 7776 five-die hands, and all 300 arrangements of
AAABB through the claim path the shell calls. What failed was the
sentence the shell never said. Claim offers match the *exact* selection
(art. 72's DEFAULT), so a hand of six holding a full house offers FULL
HOUSE on the exact five and nothing on all six — and the thumb that
selects the whole hand is shown the ANY DICE floor, which art. 46 always
keeps on offer.

`fitsNothing(turn, dice, ladder)` in `src/lots/card.ts` is art. 72's
other half, and the shell now says both halves at once: the offer's name
and number in vitals, and `NOTICES['claim.exact']` beside it when the
offer is only the floor. A selection makes at most one combo, so `Claim`
is a single verb that takes the highest tier on the table rather than a
row of names and numbers wearing the coat of controls.

---

## The thumb is law (arts 66–76)
The skeleton was played by a human, and the playtest found one bug and
seven interaction failures. The failures were not the skeleton's: the law
said what the screen *is* (arts 29–30) and what touching *means* (arts
5–8), and never said how the game is operated. The vacuum was filled with
guesses. `.claude/rules/the-thumb.md` is ratified and binds like any
other rule file — the two registers (66), the tray as anatomy (67), look-
then-take (68–71), the dice under the thumb (72–73), the card behind a
glyph and interaction as state (74–75), and the interaction budget (76).
The law index, the design agent, and the pointers in voice.md,
the-world.md and the-room.md are wired to it. No UI was built in that
tranche; the tranche after it is the one below.

---

## Appendix — the cumulative sections, as they stood at the split

Three sections of the old DESIGN.md were cumulative rather than
chronological: they were rewritten in place by each wave rather than added
to. They are kept here as the snapshot they were on 2026-08-07, because the
live versions of the first two now live in DESIGN.md and the third is a
record of work already done.

## What exists
- **src/state** — the two branded ledgers and the six rituals (`wake`,
  `learn`, `meet`, `collect`, `die`, `finish`). Persistence through the `Vault`
  port: one versioned key, a browser impl and an in-memory one, every
  mutation written. Health and base armor are body stats on the permanent
  beside hand size, because arts 47 and 60 make them stats and content
  owns the numbers. The run now carries its **history graph** — the doors
  taken, in order — which is the source of truth art. 36 names: every
  room the run has dealt is the replay of it, so there is one statement
  of where the player has been and nothing that can disagree with it. It
  also carries the deeds, keyed on the instance (art. 82). The permanent
  gained `met` and a typed, empty `memories`: unique encounters respawn
  with the reseed, but meetings are knowledge, and the labyrinth
  remembers you (art. 84). A sixth ritual, `meet`, is the only way a
  meeting crosses. A seventh, `remember`, writes a mark into `memories` —
  the socket is no longer empty, because art. 40's Savior is the first
  thing with something to remember about you. An eighth, `tookIntoRun`,
  is what a good just collected does to the run already in flight: the
  die fills the slot art. 55 left open, the wearable arms you from the
  next blow. And **`load` is a migration ladder** rather than a version
  check — `MIGRATIONS` walks a snapshot from whatever version it says it
  is up to `VAULT_VERSION`, keeping the permanent and dropping the run
  (which art. 36 makes unreplayable across schemas), and anything it
  cannot walk is copied to `castlebrynth.quarantine` and left alone.
  (arts 11, 36, 40, 47, 55–56, 60, 82, 84, 86)
- **src/gen** — the drift, behind the three signatures the shell always
  knew: `deal`, `isWinnable`, `explainWinnability`. `deal` now takes the
  run's choice history and returns the history graph replayed — every
  room dealt, in order, and the doors in front of the last one, and
  nothing further. `lot.ts` folds seed, depth, step and the choices
  upstream of a decision into that decision's lot, which is what makes
  the replay exact and the road not taken uncomputable. `drift.ts` is the
  tally, the pools, and the forced lock. Room choice is a weighted draw
  under pressures — depth tendencies, the fight band, the guarantees, the
  adjacency bans, the no-clump penalty — none of which solve anything.
  They lean, and whether they held is asked of a thousand runs.
  One thing in the dealer does not lean: a `MercyPlan` is a room type the
  depth *owes* inside a band of steps, dealt out of the neutral pool with
  the chance rising to certainty at the band's last step. It is art. 80's
  just-in-time key in the shape of a room, and it is why every run holds a
  Sanctum however the drift is steered (arts 31–40, 77–83).
- **src/lots** — the whole duel. The turn (intent first, cast, keep, one
  recast); the shapes and the ladder; the card at once-per-fight; armor as
  a stat with corrode, seal and curse as declared intent data; riders,
  bonds, talismans and wearables as sockets with the demo's goods as
  content; and a headless fight loop emitting structured events and no
  prose. (arts 41–65)
- **src/descent** — a room plays: candles one at a time, taps free and
  always answering, doors as sensed lines, forward only, one `take` act.
  Also `SceneState` — what has happened in this room, which is what the
  renderer reads and what the frame cache is keyed on (art. 70) — and
  `mayLeave`, which is art. 3: a required thing still lying here refuses
  every door in the room. The `RoomBook` port keeps prose out of the
  engine. Two of the drift's articles land here because both are about a
  room under the thumb: art. 82's template/instance split, so what you
  took *here* is gone from here and not from every copy; and art. 83's
  socket composition, where a room's own words are laid end to end with
  the words each socket brought with it. `chooseDoor` hands back the run
  *and* the chain, because under art. 79 committing a door is what deals
  the room behind it. Art. 40's mercies land here too, as `breathOf`: an
  act may declare a *share of what is missing* it gives back, and the
  engine spends it rounded the player's way and never past the maximum.
  Once-per-instance is now the engine's law rather than the tray's — a
  deed already written refuses a second pressing — and a mercy that would
  restore nothing is not spent at all, so pressing a verb on a whole body
  never costs you the verb. (arts 3, 5–9, 29, 40, 70, 79, 82–83)
- **src/hinge** — the fight-door, the staged advance as a prop painted
  into the same box, the four exits, death routing, and the two laws
  about a fight's place in a *run*: `saveFight`/`restoreFight` (art. 75)
  and `routeFlight` as a pause rather than a discard (art. 63).
  `turnLot` derives each casting's lot from seed, step, turn and casting
  number, which is what lets a turn be replayed instead of stored.
  (arts 28, 30, 32, 63, 75)
- **src/room** — the box of `reference/castlebrynth-wake-v3.html` with the
  shading of `reference/castlebrynth-ramp-shading.html`: the geometry, the
  contours and the mouth are v3's, and what colour a surface takes is the
  ramp's. `ramp.ts` builds a ramp and says where a tone already sits on
  one; `dither.ts` gained `ign`, the scattered noise the box thresholds
  against; a `Look` — palette, ramps, light, air — is what a scene now
  declares, and a `SurfaceShaders` answers a step rather than a colour.
  Also `WorldMark`/`markRect`, so the region that answers a tap on a thing
  is derived from the same world coordinates the thing is painted at
  (arts 19, 68), and `overpaint`, so a motion can be laid over a cast box
  without casting it again.
- **src/content** — fourteen hand-authored rooms, each with its own
  school and its own signature prop: two fixed anchors, three in the
  neutral pool, and three each in the drowned, the burnt and the
  ossuary. Every room declares the same three sockets — a far one that
  takes teeth, a floor one that takes what can be picked up, and a mercy
  one that takes what is offered rather than taken — and no room's prose
  or pixels assume what fills any of them. Five encounters ship
  against art. 83's two axes: the Gnawing floats and repeats freely; the
  Marrow floats, is unique per run, and wakes only when the ossuary
  locks; the iron key floats and is placed by the dealer alone; the basin
  is **bound** to the font, which is what makes the Sanctum a place; and
  the Mender floats, is rare, is unique per run, and **remembers**, which
  is what makes the Savior a being. The
  Gnawing at the demo's numbers, the demo's five goods, the ladder, the
  reference fight's kit, and every player-facing string. The voice lint runs in two categories — prose owes the whole
  rule, a name owes it minus second person and present tense — and the
  controls in `VERBS` are held to art. 66 instead, which is the same
  review by a different rule.
- **src/main.ts** — the shell: boot into a first waking, a resume, or a
  fight you were mid-turn in; the three bands; the world's tappable
  marks; the tray as anatomy; the crown and the card's sheet; death, the
  Book, and down again.

## Answered since the last cut
**Art. 25 is amended** (2026-08-04): exact fill via sharp upscale replaces
integer scaling with letterboxing. The article invited exactly this
revisit — *"revisit if the bars offend"* — and on a phone they offended:
a 390x675 world band held the box at 240x415, about 60% of each
dimension, with black around it. The frame's height already derives from
the device (art. 24), so a fractional scale fills the band and
nearest-coloured neighbours keep it sharp. Measured at 100% fill on four
phone sizes. The cost is declared in the article: at a fractional scale
neighbouring game pixels can land a device pixel apart at the seams.

The open questions the scaffolding raised are ruled on and applied: the
"arts 41–66" citation was an off-by-one and now reads 41–65; base armor is
0 and the demo's blocked 3 was the Rusted Plate; the Sisters' ghost is
taxed by a curse and fires only on the exact two-die pair claim; talismans
stack value-then-ladder-then-shape, with each shape trigger reading the
turn independently; and combo, item and room names are in `everyString()`
under a `label` category that skips second person.

## The debt that was closed

Every struck-through line of the old Debt list, kept because the reason a
thing was closed is worth more than the fact of it. The debt that is still
*open* is in DESIGN.md, where it can be read in one screen.

- **~~The dealer is dumb.~~** Closed by this wave. The drift replaced it:
  one to three doors per room, hidden region tags, lazy dealing, the
  forced lock, keys placed just in time, template and instance, sockets
  and encounters. `Grammar` and `DepthPlan` are honoured in full.
- **~~The boon socket is never filled of the dealer's own accord.~~**
  Closed by the travelers wave. The floor socket fills at `FLOOR_CHANCE`
  (0.34) with whichever good the weights draw, and eight goods are on
  offer against art. 80's key, which still fills it first because a lock
  is owed and a bone never is. What is still open on that socket is
  art. 4's *fleeting* treasure: a good on the floor waits as long as you
  do, and nothing yet opens a window and closes it. That wants the
  economy, or a ruling that a window is a socket's business.
- **~~A schema change eats every Book of Ends.~~** Closed. `load` used to
  answer an unknown version with `return null`, and the next `save` wrote
  over the bytes it had just refused — so the next time the ledger's
  shape moved, every Book in existence went with it. There is a ladder
  now (`MIGRATIONS`, 1→2→3), the run is dropped because art. 36 makes an
  old one unreplayable, the permanent is carried forward, and anything
  the ladder cannot walk — bad bytes, an unknown version, a snapshot from
  a *newer* build, a step that refuses — is copied to
  `castlebrynth.quarantine` and left alone. Only the first casualty is
  kept, so a later boot cannot overwrite the interesting bytes.
- **~~A full hand cannot be chosen, only grown.~~** Closed by the swap
  ruling. The hand is a chosen six: spares show in the tray, a tap stages
  each half of the exchange, and `Swap` commits it. What is *not* closed
  is the shape of the choice — there is one chooser (the tray) and it
  offers no help at all: no sorting, no comparison, no "this is what you
  would give up" beyond the two declared truths a tap answers with. At
  eight goods that is fine. At thirty it is a spreadsheet.
- **~~The spare row has no ceiling.~~** Closed by moving the choice to
  its own screen. The place that has to show everything you own is no
  longer a strip in the tray, and the POUCH panel is informative rather
  than a working surface. What is still true is that a pouch of thirty
  is thirty slots to read on the choosing screen — but a screen can
  scroll, sort and group, and a tray strip could not.
- ~~**At the Warden's door, the lock covers the door's tap region.**~~ Was
  a defect; card 67 made it the point. The lock is what the hall is for
  now — looking at it is the first half of the ceremony and the only thing
  that summons `Unlock` — so a thumb that lands on the lock rather than on
  the door has landed on the right thing. The door's edge still answers.
  What is worth watching instead is the opposite risk: a player who never
  taps the lock finds a hall with no verbs in it at all, and the only
  thing pointing at the lock is that it is one of two things in the room.

## The survival record, wave by wave

The measured survival tables as the mercy, travelers and company waves left
them, kept because a number without the wave that measured it is a number
nobody can argue with. **The live table is the levels wave's**, near the top
of this file; everything here is superseded by it and is the record of how
the game got there.

- **A whole depth is still hard to survive — but half as hard.** Reduced,
  not closed. Art. 40 is ruled and both its tiers are built, so a depth is
  no longer a one-way ratchet down: **every** run holds one Sanctum, at
  step 2 or 3, restoring half of what is missing for free; and about a
  fifth of runs also hold the Savior, restoring all of it. Against the
  drift's ~2.5 fights a run that is roughly one fight's worth of body
  handed back, guaranteed, plus a rarer full reset.

  **Measured, so the claim is not a feeling.** A bare-pouch player who
  keeps the biggest set, recasts, and then claims greedily — the same
  model `lots.fairness` uses for one fight, run over a whole depth for
  2000 seeds under three door policies — finishes depth one:

  | | before this wave | font dealt, breath refused | after |
  | --- | --- | --- | --- |
  | first door | 0.195 | 0.246 | 0.355 |
  | last door | 0.191 | 0.239 | 0.357 |
  | coin flip | 0.199 | 0.245 | 0.359 |

  **Then the travelers wave took a die away, and the numbers moved
  again.** The same model, the same 2000 seeds, the same three policies,
  now against a bare hand of five (arts 55, 60):

  | | before the mercies | after the mercies | five dice, walking past every good | five dice, taking every good |
  | --- | --- | --- | --- | --- |
  | first door | 0.195 | 0.355 | 0.090 | 0.247 |
  | last door | 0.191 | 0.357 | 0.086 | 0.243 |
  | coin flip | 0.199 | 0.359 | 0.085 | 0.236 |

  Say that plainly too: **removing one die cut survival by about three
  quarters**, and the goods put back about two thirds of what it cost. A
  single fight tells the same story — a bare player's win rate against
  the Gnawing falls from ~0.78 to ~0.28, and one found bone takes it back
  over 0.5, which is more than the Rusted Plate does. Three lines of the
  ladder (the straight, three pairs, two triples) leave a bare hand's
  reach entirely, and only a sixth die opens them again.

  **That is the progression, not a regression.** The point of a five-die
  start is that the sixth is somebody's, so the number to look at is not
  one run but the chain of them. The same model, 1500 players, six runs
  each, coin-flip doors, keeping whatever it finds:

  | run | mean hand | finished depth one |
  | --- | --- | --- |
  | 1 | 5.00 | 0.216 |
  | 2 | 5.47 | 0.371 |
  | 3 | 5.73 | 0.456 |
  | 4 | 5.87 | 0.547 |
  | 5 | 5.93 | 0.575 |
  | 6 | 5.96 | 0.605 |

  Before this wave that column was 0.357 on run one and 0.357 forever.
  Now the first waking is expected to die, the third run matches what
  every run used to be, and the sixth is comfortably ahead of it. Death
  became the progression system in the arithmetic and not only in the
  pitch — which is what the wave was for, and is also the thing to watch:
  if run one reads as unfair rather than as the beginning, the number to
  turn is the Gnawing's, not the hand's.

  **The company wave: five horrors, and one of them at the bottom.** The
  depth had one bad guy — technically two, but the Marrow woke only in the
  ossuary — and its last room was a door that opened itself. It now has a
  unique per region and a keeper behind the last door (cards 29, 31,
  art. 37 as amended). Every number below comes from one model,
  `test/policy.ts` playing turns and `test/depth.ts` playing runs, so two
  numbers beside each other always mean the same thing.

  **One fight, at full health**, 1000 seeds:

  > **Superseded by the levels wave (card 89).** Every number in the four
  > tables below was measured against a body of 26, a Gnawing of 150 and
  > uniques at 112–128, and each is kept as the record of the wave that
  > measured it. The current table is in **The levels wave**, near the top
  > of this file.

  | horror | health | bare five | found six | found six + plate |
  | --- | --- | --- | --- | --- |
  | the Gnawing | 150 | 0.283 | 0.813 | 0.938 |
  | the Marrow | 120 | 0.530 | 0.939 | 0.986 |
  | the Silt Mother | 112 | 0.354 | 0.872 | 1.000 |
  | the Kindled | 128 | 0.371 | 0.896 | 0.990 |
  | **the Warden** | 168 | **0.134** | **0.673** | **0.874** |

  The two new region uniques sit between the Marrow and the Gnawing, which
  is what the card asked for: *slightly under the Gnawing's numbers, rarer
  rather than merely bigger.* The Warden is the hardest thing in the depth
  at every hand it is measured with, and `test/warden.test.ts` asserts that
  rather than hoping it.

  **A whole depth**, 800 seeds, by what the player woke with — *reached the
  last door* / *finished*:

  | woke with | coin flip | first door | last door |
  | --- | --- | --- | --- |
  | five bones | 0.269 / 0.049 | 0.255 / 0.034 | 0.253 / 0.035 |
  | one traveler's bone | 0.425 / 0.076 | 0.407 / 0.063 | 0.424 / 0.070 |
  | two bones and the plate | 0.885 / 0.484 | 0.885 / 0.472 | 0.880 / 0.468 |

  **The sentence the engagement file asks for: a taught run wins about half
  the time.** A player carrying what two earlier runs found reaches the
  bottom nearly always and beats the keeper in a bit under half of those —
  0.48 end to end. A first waking reaches the door about a quarter of the
  time and takes the depth about one run in twenty. Before the keeper
  existed, reaching the door *was* finishing, so the left column of that
  table is the like-for-like number and it has not moved: what changed is
  that there is now something behind the door, and it is the thing the run
  behind you was for.

  Three findings, reported rather than smoothed over.

  - **The depth got much harder at the bottom and not on the road.** A bare
    run's end-to-end survival fell from about 0.24 to 0.049. That is the
    keeper and nothing else — the road costs what it always did. If one run
    in twenty reads as unfair rather than as the beginning, the number to
    turn is `WARDEN_HEALTH`, and nothing else has to move with it.
  - **Locking a region makes a depth slightly *safer*.** Reaching the last
    door by lean: drowned 0.320, ossuary 0.214, burnt 0.194, against 0.269
    for a coin flip. No region became a death sentence — the failure the
    card was watching for — but a region's unique is authored *under* the
    ordinary teeth, which is what the card asked for and the precedent the
    Marrow set, so arrival buys a different fight rather than a worse one.
    The knob is the uniques' health, at 112 and 128 against the Gnawing's
    150.
  - **`hunger` is worth exactly zero against the model.** The greedy player
    never once ends a turn without a claim, so the Kindled measures as
    softer than it plays for anybody who hesitates. That is the kind
    working, not the horror being soft — it is measured against a turtle
    instead, where it moves the number.

  So: **survival roughly doubles, and a depth is still lost more often
  than it is won.** Say it plainly — this did not make depth one
  survivable, it made it survivable *sometimes*. About a third of the
  gain is not the mercy at all but the font displacing a room that could
  have had teeth in it; the breath itself is the other two thirds.

  And that is the number for a player who claims *well*. Driving the real
  shell in a browser with a crude thumb — biggest set, then the first
  claim that is offered — finished one run in eighteen. The gap between
  0.36 and 0.06 is the duel's skill ceiling, not the depth's, and it is
  the strongest argument on this list that the fights are where the
  difficulty actually lives.

  What this wave is **not** is a solved economy. The breath lands early
  by construction (the band is fenced by art. 78 — see the knobs below),
  so a run that takes its fights late still spends the back half of the
  depth on whatever it has left, and there is nothing to carry, buy or
  drink between the font and the door. The Loot stream is the other half
  of that answer and this wave was not asked to be it. If one more knob
  had to move first, it is the Savior's rarity or a second mercy band —
  both content, neither ruled.
