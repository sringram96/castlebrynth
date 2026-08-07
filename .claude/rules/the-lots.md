# The Lots — the dice
Articles keep their numbers; cite as "art. N". Statuses as in
the-world.md. Amended by the demo ruling of 2026-08-04: dice attack,
armor defends, the card is the fuse. Amended again by the travelers
ruling of 2026-08-05: every die past the plain ones belonged to somebody
(arts 86–88). Amended by the ruling of 2026-08-06: the start is **six**
plain bones and a full hand — only a special die is discovered (art. 55).
Playable spec: `reference/castlebrynth-lots-demo.html` — where prose
and code disagree, the demo's behavior wins until the re-authored
fixture lands (tracked on the board). How a die is *drawn* is
`reference/castlebrynth-dice-v3.html`, signed off with card 94; it wins
ties about what a face looks like.

## The turn
41. SETTLED (amended) — Yahtzee turns survive at the core: a first
    casting, keep any dice, one second casting of the rest. Then the
    claim phase: assemble combos from the hand and end the turn.

    **Amended by the attack ruling of 2026-08-05: the turn is three
    presses.** Roll, then Reroll, then Attack. Holding is tapping the
    dice you want to keep; Reroll throws everything you did not hold,
    and holding all of them is how the second casting is declined —
    there is no separate Keep all. After the reroll the selection *is*
    the attack: one press claims what the selection makes and ends the
    turn behind it. A turn therefore claims once. There is no Take
    back, because nothing is committed until the press — a tap on a
    chosen die un-chooses it, and that is the whole of undo.

    When the selection claims nothing the press is End turn instead,
    because arts 46 and 63 both require a turn to be endable with
    nothing to hit with. FLEE is
    always offered — from the ACTS panel, which is where art. 67 (as
    amended 2026-08-05) puts it: leaving is a thing you do about the
    door, not a move in the duel. The THROW / BRACE / FLEE decision trio
    is repealed —
    attacking is claiming, and defense is armor (art. 47). Vocabulary:
    *keep* (or *freeze*) is mid-turn holding; "brace" leaves the game's
    vocabulary.
42. SETTLED — Intent first. The horror's next attack — number and
    effect — is visible from the top of the turn, before the first
    casting; keeping is planning.
43. DEFAULT — The third casting is merchandise. Extra castings beyond
    the second exist only as scarce goods — spells, items, merchant
    wares.
44. DEFAULT — The hand returns whole each turn: claiming spends
    nothing; only effects may take a die.

## The duel
45. SETTLED (amended twice) — The poker duel. Dice are numbered; a
    claimed combo scores sum × tier; each die is spent in at most one
    claim; dice that fit nothing go unused and do nothing. Dice are the
    offense and only the offense.

    **The several-combos clause is spent (ruled 2026-08-05).** A turn
    claims once, under art. 41 as amended. The engine still takes more
    than one claim per turn — a good that grants a second attack has
    its socket — but nothing ships that presses it. Measured against
    the Gnawing, claiming the leftovers as well moved the win rate by
    about a point in either direction, inside the noise: the second
    claim scrapes a pair off a hand whose turn is already decided. It
    was three presses buying nothing.
46. SETTLED (amended; the guarantee stated 2026-08-07) — Combos only: dice
    harm only through claimed combos. The whiff clause is repealed — a turn
    without combos is a turn of armor and patience, not a punishment. The
    ANY DICE line (art. 48) is the deliberate floor, spendable like any
    line.

    **And here is what that guarantees, said of the hand the game has.** It
    was unstated law for four waves and was last argued about a hand of five
    that art. 55 no longer deals. Of **six** dice, every possible hand leaves
    a **pair or a run of three** — pigeonhole, and it is tight at ×2 — so a
    turn always has something above the floor to spend, and `lots.floor` is
    the proof rather than the claim.

    Two consequences the article now says out loud rather than leaving to be
    rediscovered. **It is the card and not the values that can leave a turn
    with nothing**: a hand always makes something, and an empty card is what
    makes ANY DICE the only line left. And **a wound is what takes lines
    away** — three lines of the ladder (the straight, three pairs, two
    triples) leave a shortened hand's reach entirely, which is the cost of a
    wound being on the card and not only on the body. Both are art. 60's hand
    size doing its job, and neither is a defect.
47. SETTLED (amended, major) — BRACE is repealed. Defense is a body
    stat: **armor**, granted by items and mercies, automatically blocks
    its value from every attack. Intents may corrode or pierce it, and
    that is declared like any intent. Dodge is a named socket, parked.
    (GAME.md's "a held die eats one blow" is doubly superseded.)
48. SETTLED (amended) — The ladder, expanded. Sets: pair ×2, triple ×3,
    quad ×4, quint ×5. Runs: run of 3 ×2, run of 4 ×3, run of 5 ×4, the
    straight ×6. Composites: two pair ×3, full house ×4, three pairs
    ×4, two triples ×5. ANY DICE ×1. Shapes are law; multipliers are
    tuning and live in content.

## The card
63. SETTLED — The card. Every line of the ladder is claimable once per
    fight; the card refills between fights. An empty card leaves only
    armor and flight: the card is the fight's fuse, made of your own
    spending.
64. SETTLED (amended 2026-08-05) — A composite is a single claim: a
    full house spends one line, not a triple and a pair. Choosing
    between one composite line and two simple lines is the card's
    central decision — and under art. 41 as amended the two simple
    lines are two *turns*, not two presses of one. The decision
    survives and its price changed: a composite is tempo, two simples
    are card economy, and you pay for the second one with a turn of the
    horror's intent landing on you.
65. SETTLED — Intents may attack the plan, not just the body: sealing
    lines, cursing values, corroding armor — each declared on the
    intent like any number (extends art. 58).

## The collection
49. SETTLED (amended) — Dice and their company are collectible on five
    axes: shape, riders, bonds, talismans, and wearables (armor).
50. SETTLED — Shapes are free, values are law: any body, but every face
    shows a value 1–6. All value theorems survive any die ever forged;
    exotic distributions are declared on inspect.
51. SETTLED (amended) — The face schema: value + optional rider. A
    rider fires only when its face is spent in a claimed combo; kept or
    unused faces fire nothing; passive faces are banned. (The
    brace-rider socket is repealed with art. 47.)
52. SETTLED (amended) — Bonds trigger when both dice are spent in the
    same claim at equal value. The Sisters are canon: claimed as a
    matching pair, a ghost sister joins — the pair scores at triple
    tier on the PAIR line. Carrying both halves is the cost.
53. SETTLED (amended) — Talismans (never "jokers") upgrade scoring from
    outside the hand, in three species: value modifiers (the Ossuary —
    sixes count double in sums), ladder modifiers (a line scores a tier
    higher), and shape triggers that read the whole turn (the Zealot —
    all six dice claimed, attack doubled). They live as keepsakes on
    the permanent ledger.
54. SETTLED — Every power pays: everything declared on inspect; every
    die audited against the plain bone's power budget; every rare
    carries a cost face, a carry tax, or a price.
55. SETTLED (amended by ruling of 2026-08-06) — The start is bare:
    **six** plain bones, no riders, no bonds, no talismans, base armor
    only. Hand size is six (art. 60), so **the hand is full at the
    waking and nothing has to be picked up to make it so**. Everything
    else is discovered in the labyrinth or bought — new dice that act on
    the scoring the way jokers act on a deck, talismans, wearables. The
    sockets ship first; the goods ship as content.

    **Only a special die is ever discovered.** A plain bone is the body
    you wake in, not a find; what the labyrinth hands you is a die that
    *does* something, and it is always somebody's (art. 86 unchanged).

    (Superseded: five bones against a hand of six, with the empty slot
    named "the invitation". The playtest verdict is why: the room you
    wake in has a body lying in it and a hole in your hand, and a player
    who taps the body and gets nothing back reads a broken game rather
    than an invitation. An invitation nobody can accept where they are
    standing is not one — and the fix belongs at the start, because
    art. 118's remedy for a thing that withholds is a sentence, and the
    hole did not want a sentence, it wanted filling.)
56. DEFAULT (amended by ruling of 2026-08-06) — The signature is simply
    the first die you collect, and under art. 86 that is a dead
    traveler's. It no longer *fills* anything: art. 55 wakes you whole,
    so the first die you find is the first die that was ever worth
    finding, which is what a signature should have been all along. Where
    it goes is art. 60's question and not this one. (The
    curated-starting-hand clause dies with art. 12.)

## Display & the pouch
57. DEFAULT (amended) — Combat display: everything visible. The
    horror's health, next attack, and its effect at the top; your
    health, armor, dice, claims, and the card in the tray; running
    totals shown — attack so far, incoming after armor, unused dice.
58. DEFAULT — An intent is a declared verb + number + optional effect;
    the taxonomy of intents is content, authored per horror, not law.
60. SETTLED (amended) — The pouch and the hand. Your collection is the
    pouch, on the permanent ledger. The hand is assembled from it for
    the descent; hand size is a body stat — grown by mercies, shrunk by
    wounds and curses. Composition is the build: distributions and
    riders aim the hand. v1 ships a pouch of six plain bones against a
    hand size of six (art. 55): the hand is what the pouch can fill, and
    what it cannot fill shows as an empty slot — which at a first waking
    is nothing, and after a mercy grows the hand is one slot until the
    next find.

    **Amended by ruling of 2026-08-05 (the chosen hand).** The hand is a
    *chosen* set, not the first thing that fills it, and it is chosen
    **at the waking**. The pouch is ordered and the hand is its first
    `handSize`; everything past that is a **spare** — owned, kept
    between runs, not in play.

    A die found mid-descent goes into the pouch and stays there. Which
    dice come *down* is settled where a descent begins: after an ending,
    when the pouch has outgrown the hand, the run opens on a screen that
    asks. Nothing is destroyed and nothing is sold — the choice is a
    reordering, and because the order *is* the hand, the set you chose
    is the set you wake with; the run burns and the arrangement does not
    (art. 11).

    **The hand never moves inside a descent.** art. 75 replays a fight
    off the hand it was opened with, and re-arming between backing out
    of a door and going back in would launder a card (art. 63). Putting
    the choice at the waking is what makes that true by construction
    rather than by a guard, and it is why the pouch under the thumb is
    informative and commits nothing (art. 67).

## The travelers (ratified 2026-08-05)
86. SETTLED (ruled; the number corrected 2026-08-06) — The travelers. Every
    die beyond the bare **six** belonged to someone who came down here
    before you and did not come back. Each rare individual or event leaves
    exactly one unique die, and a die's shape is how its owner died: the distribution is how
    they played, the cost face is the mistake that killed them. You
    learn the labyrinth partly by reading what it did to the people
    ahead of you. With art. 12 repealed this is the whole of where a
    build comes from — your build is who you have found.
87. SETTLED (ruled) — The item law. An item's origin explains its
    rules, in one sentence, for every good that ships. A rider is a
    habit somebody carried into a fight; a bond is two people who went
    down together; a talisman is the luck someone brought; a wearable
    is what they wore. The sentence reaches the player on inspect,
    beside the declared numbers (art. 54), and it is bound by
    rules/voice.md like any other prose. If the sentence cannot be
    written, the item does not ship.
88. SETTLED (ruled) — Knowledge goods. A good may be pure knowledge — a
    name, a mark, no stat at all — earning its place by changing what a
    tap answers or what a horror does (arts 7, 10). It lives on the
    permanent ledger like any other good and owes art. 87 its sentence
    like any other good.

## The beat law (ratified 2026-08-06)
Drafted from the fight wave, whose playtest verdict was that the fight
is a spreadsheet. Card 69 found half of it — nothing *said* what
happened — and this is the other half: nothing *showed* it. A claim
resolved instantly and silently, so the most interesting decision in
the game, which line to spend and what spending it costs you, passed in
a single frame.

Reference implementation: `castlebrynth-animation.html`, signed off. It
is not in `reference/`; until it lands, this article and the wave's own
brief are the statement of what it proved, and they win ties by default
rather than by precedence.

119. SETTLED (ruled 2026-08-06) — **A fight event resolves in beats, and
     each beat says one thing.** The outcome is computed before the
     first frame is drawn; the beats only reveal what is already true.
     Every beat is a one-shot that ends settled (art. 1), so with motion
     reduced (art. 116) the whole sequence collapses to its settled
     state and nothing is lost — **the settled state is the whole truth
     or the beat is wrong.**

     **Nothing is decided during an animation.** No roll, no branch, no
     randomness inside the timeline: the engine is asked once, at the
     press, and what it answers is the script the beats read from.
     Determinism is therefore untouched by construction rather than by
     care (arts 17, 36), and a test stands guard over the seam.

     **A rider gets its own beat.** An effect that fires silently inside
     a total is an effect the player never learns, so every rider that
     fires says so in its own moment, alone. This is art. 54's
     declaration duty applied to the instant of firing rather than to
     the inspect that precedes it — a power the player cannot see land
     is a power they cannot price.

     **The room holds still.** Arts 106–110 govern ambient loops and are
     unchanged: these are one-shots on a state change, which art. 107
     already permits, and stillness is the capital they spend
     (art. 106). The fight is what it was saved for. The one gesture
     that moves the frame itself is the blow that lands on **you** —
     the frame is the player's body, and spending that anywhere else
     spends it for nothing.

     The order of the beats is law and their durations are not: which
     beat comes after which is what a player learns to read, and how
     long each stands is tuning that must be settled on a phone. Which
     intents telegraph a turn early is content, declared per intent,
     never a threshold the engine holds.
