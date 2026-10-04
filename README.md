# The Art of Motion & Sound Design — Gaurav's Understanding

An interactive visual essay for clients: twelve chapters you can *play with* to understand what motion and sound do.

```
npm install
npm run dev            # http://localhost:5173
npm run build          # production build → dist/
npm run build:single   # one self-contained, shareable file → motion-and-sound.html
```

## Chapters

| # | Chapter | Medium | Try it |
|---|---------|--------|--------|
| 01 | Understanding | 3D (R3F) | particle stream → sphere → glass frames; reacts to the cursor |
| 02 | Attention | 2D canvas | noise, speed, focus, attraction (cursor pulls the crowd) · Play demo |
| 03 | Timing | 2D canvas | linear vs eased / anticipation / overshoot / settle, side by side |
| 04 | Weight | 3D (R3F) | grab and throw the cube; weight dial from feather to massive |
| 05 | Rhythm | 2D canvas | regular / syncopated / triplet / human / chaotic, tempo |
| 06 | Contrast | 2D canvas | chaos ↔ clarity slider · Play sequence (noise → CUT → "hello.") |
| 07 | Sound | 2D (pseudo-3D) | the same drop, with and without sound |
| 08 | Emotion | 3D shader | one form, seven feelings — behaviour, colour and sound change |
| 09 | Silence | 2D canvas | silence; press and hold to walk into the light |
| 10 | Storytelling | 2D canvas | dot → line → shape → object → weight → contact → rhythm → world |
| 11 | Process | 2D canvas | concept → exploration → refinement → motion → sound → final |
| 12 | Possibilities | 2D canvas | one system, many applications (hover the list) |
| — | Final | type | Motion is meaning in time. Sound is feeling in space. |

## Performance

- **Lenis** smooth scrolling; every chapter is one screen tall, and its text reveals as soon as 15% of it is visible.
- **Canvas loops pause off screen.** DPR is capped at 1.5.
- **3D is lazy:** three.js loads only when a 3D chapter is one screen away, and each WebGL canvas renders only while visible.
- Spheres are pre-rendered sprites; spectrum bars use a cached gradient; the Silence corridor is drawn once.
- All sound is synthesised live with the Web Audio API (no audio files). It stays off until the visitor turns it on.

## Structure

```
src/
  audio/engine.ts        synthesis: impact(mass), whoosh, wood, kick, tone, air…
  motion/                easing, physics presets, hooks, smooth scroll, sprite + cube renderers
  components/            Panel, TopBar, Controls (Segment, RadioList, Toggle, Slider, PillButton, TryPanel), Lazy3D
  sections/              one file per chapter (+ *3D.tsx scenes)
scripts/inline.mjs       single-file export
```

The **View selected work** and **Start a project** buttons on the final page link to `#work` and `#contact`. Replace these with real links.
