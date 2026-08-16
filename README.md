# Castlebrynth

A portrait pixel-horror roguelike for the phone.

You go down with thirty bones.

When something blocks the room, you throw up to six of them, hold what you
want, and throw the rest again — twice, at most. The numbers add up; the
pattern they make multiplies the total; that is the damage. Every named hand
can be spent once per fight, and when nothing fits there is always CRAP, which
is weak and never runs out.

If the thing survives, it breaks a fixed number of your bones, and it told you
which number before you threw. As the pile gets thin, so does your hand.

Then you die, and go down again.

## Play

```
npm install
npm run dev
```

Open the URL it prints. It is best on a phone, or in a browser window the shape
of one — 390×844 is what everything is laid out against.

## How an attack goes

1. **ROLL.** You throw `min(6, bones)` ordinary d6s. Thirty bones or six, you
   throw six; four bones, you throw four.
2. **Hold** any of them by tapping. Held bones keep their face and their place.
3. **REROLL** the rest. Twice, at most — three throws in all.
4. **Score**, at any point after a throw. The scorecard shows every hand and
   its multiplier, and only the ones you can actually make right now are
   buttons.

```
damage = max(1, floor(sum of all the dice × the hand's multiplier))
```

Each named hand — pair, two pair, triple, straight, full house, four, five,
six — can be spent **once per fight**, and a bad roll never burns one. If
nothing unspent fits, **CRAP** is there at ×0.5, as often as you like.

If the thing survives your attack it breaks a fixed number of your bones. If
your attack kills it, it breaks none.

MENU has your pile, your satchel, the rules and the whole scorecard.

## Build and test

```
npm run build          # typecheck and bundle
npm test               # unit tests
npm run test:browser   # the real journey, in a real browser
npm run balance        # simulate the fights and print the numbers
npm run art            # rebuild the runtime art from the masters
```

## For contributors

Start at `docs/PRODUCT.md`, then `docs/COMBAT.md`, `docs/ART_DIRECTION.md` and
`docs/CONTRIBUTING.md`. Twenty minutes, and they are the whole contract.

`archive/` holds the pre-reset design stack. It is history and binds nothing.
`RESET_PROGRESS.md` records what was cut, what was kept, and why.
