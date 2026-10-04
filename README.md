# The Art of Motion & Sound Design — Gaurav's Understanding

An interactive visual essay. Not a portfolio site — a piece of motion design that happens to live on the web.

```
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + production build → dist/
```

## Built so far

| # | Chapter | Environment | Motion language | What the visitor does |
|---|---------|-------------|-----------------|-----------------------|
| 00 | Understanding | warm ivory | accumulation | cursor travel builds dot → motion → sound → type → composition |
| 01 | Attention | paper white | particle attraction | finds the one particle that moves with intent; FOCUS slider |
| 02 | Timing | pale blue-grey | motion curves | switches Linear / Eased / Anticipation / Overshoot / Settle / All five, scrubs 24 frames |
| 03 | Weight | deep charcoal | physics / inertia | drags and throws one sphere across Weightless → Massive |
| 04 | Rhythm | warm orange | sequenced repetition | Regular / Syncopated / Triplet / Chaotic / Human / Yours, tempo, tap to compose |

Chapters 05–14 come next, once these first ones have been reviewed.

## Architecture

```
src/
  audio/engine.ts        Web Audio synthesis — every sound built from noise + sine, driven by motion parameters
  motion/
    easing.ts            timing presets (each one has a personality)
    physics.ts           mass presets (gravity, stiffness, restitution, squash vs. world-shake)
    environments.ts      the colour environments
    hooks.ts             canvas loop (runs only while visible), scroll-progress stages, sound state
    pointer.ts           shared pointer model (position, velocity, distance travelled)
  components/            Chapter shell, Typography (Reveal/Split), Controls (Choice/Slider),
                         SoundToggle, ChapterIndicator, CursorSystem
  sections/              one file per chapter
```

Each chapter is a tall scroll track with a sticky stage. Scroll progress moves it through
**experience → realization → principle**. Canvas loops pause when off screen. Sound is off until the visitor turns it on.
