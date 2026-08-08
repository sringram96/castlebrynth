# Castlebrynth

A portrait pixel-horror roguelike for the phone.

You go down. The rooms are hand-authored and hostile. When something is
standing in one of them, you fight it by throwing six dice, keeping the ones
you want, throwing the rest once more, and spending the best combination you
can make. What you take off the things you kill changes what you hope to roll
next time.

Then you die, and go down again.

## Play

```
npm install
npm run dev
```

Open the URL it prints. It is best on a phone, or in a browser window the shape
of one — 390×844 is what everything is laid out against.

## How a turn goes

1. The thing in front of you says what it will do next, before you touch
   anything.
2. **ROLL** — six dice.
3. Tap the dice you want. They rise.
4. **REROLL** — everything you did not choose is thrown again, once. Skippable.
5. Tap more dice, or fewer.
6. **SCORE** — the tray shows `sum × hand = damage` before you press it, and
   pressing it deals exactly that.

Seven hands: **Any** ×1, **Pair** ×2, **Triple** ×3, **Straight 3** ×3, **Full
House** ×5, **Quad** ×6, **Straight 5** ×6. INSPECT has the table, and every
die you carry, and what each one does.

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
