# Castlebrynth

A portrait pixel-horror roguelike for the phone.

You go down with thirty bones.

When something blocks the room, it throws its bones first. You see the line,
choose how many of your own bones to risk, throw once, and smash the two lines
together from highest to lowest. High kills low. Ties kill both. Anything that
dies stays dead.

Then you decide how much of yourself to risk on the next round.

Then you die, and go down again.

## Play

```
npm install
npm run dev
```

Open the URL it prints. It is best on a phone, or in a browser window the shape
of one — 390×844 is what everything is laid out against.

## How a round goes

1. **The enemy throws first.** Its line is face-up and sorted before you touch
   anything.
2. Choose **1–6** bones and **FIELD** them. Fewer bones risked is fewer bones
   lost, and fewer of its broken.
3. **THROW** once. There is no reroll.
4. Optionally spend a **CHARM** to throw one bone again — once in a fight.
5. **SMASH.** The two lines meet lane by lane, highest against highest.
6. **ROUND**, if both sides still have bones.

High kills low. Ties kill both — except the Warden, who keeps his. Bones with
nothing opposite them are safe. Whatever breaks is gone for the rest of the run.

MENU has your army, your satchel, and those four lines.

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
