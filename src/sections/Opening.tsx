import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { audio } from '../audio/engine';
import { Chapter } from '../components/Chapter';
import { Reveal, Split } from '../components/Typography';
import { ENV } from '../motion/environments';
import { useCanvasLoop, useSoundEnabled } from '../motion/hooks';
import { clamp, damp, lerp, smoothstep } from '../motion/math';
import { pointer, pointerSpeed } from '../motion/pointer';

/**
 * 00 — UNDERSTANDING
 *
 * One dot. The visitor's own movement is the energy that builds the piece:
 * dot → motion → sound → typography → composition.
 */
const LAYERS = ['dot', 'motion', 'sound', 'type', 'composition'];
const LAYER_AT = [0, 0.14, 0.34, 0.55, 0.8];
const WORD = 'MOTION';
const C = ENV.ivory;

export function Opening() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const [layer, setLayer] = useState(0);
  const [complete, setComplete] = useState(false);
  const soundOn = useSoundEnabled();

  const sim = useRef({
    appear: 0,
    energy: 0,
    lastDistance: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    init: false,
    trail: [] as { x: number; y: number }[],
    rings: [] as { x: number; y: number; r: number; life: number }[],
    ringClock: 0,
    letters: [...WORD].map(() => ({ x: 0, y: 0 })),
    layer: 0,
    progressRef: { current: 0 },
  });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.5 });
      tl.from('.op-label', { opacity: 0, y: 6, duration: 1.4, ease: 'power3.out' })
        .from('.op-title .ch', { yPercent: 115, duration: 1.6, ease: 'expo.out', stagger: 0.028 }, '+=0.3')
        .to(sim.current, { appear: 1, duration: 2.4, ease: 'power2.inOut' }, '-=1.1')
        .from('.op-sub > *', { opacity: 0, y: 10, duration: 1.4, ease: 'power3.out', stagger: 0.18 }, '-=1.6')
        .from('.op-instruction > *', { opacity: 0, duration: 1, stagger: 0.25 }, '-=0.4')
        .from('.op-manifesto > *', { opacity: 0, x: -8, duration: 1.2, ease: 'power3.out', stagger: 0.2 }, '-=0.8')
        .from('.op-layers', { opacity: 0, duration: 1.2 }, '<');
    }, rootRef);
    return () => ctx.revert();
  }, []);

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = sim.current;
    const p = s.progressRef.current;
    if (!s.init) {
      s.x = w * 0.68;
      s.y = h * 0.52;
      s.letters.forEach((l) => {
        l.x = s.x;
        l.y = s.y;
      });
      s.init = true;
      s.lastDistance = pointer.distance;
    }

    // ── energy: the visitor's movement (and scroll) builds the composition
    const travelled = pointer.distance - s.lastDistance;
    s.lastDistance = pointer.distance;
    if (s.appear > 0.6) s.energy = clamp(s.energy + travelled / 11000);
    const E = Math.max(s.energy, clamp(p * 1.25));

    let L = 0;
    LAYER_AT.forEach((t, i) => {
      if (E >= t) L = i;
    });
    if (L !== s.layer) {
      if (L > s.layer) audio.tone(220 * Math.pow(1.5, L), 1.6, 0.05, { send: 0.6 });
      s.layer = L;
      setLayer(L);
    }
    if (E >= 1 && !complete) setComplete(true);
    if (meterRef.current) meterRef.current.style.transform = `scaleX(${E})`;

    // title drifts away as scroll begins
    if (titleRef.current) {
      const k = smoothstep(0.05, 0.5, p);
      titleRef.current.style.transform = `translate3d(0, ${-k * 60}px, 0)`;
      titleRef.current.style.opacity = String(1 - k);
    }

    // ── the dot: a spring towards the pointer
    const hasPointer = pointer.moved && pointer.x > -999;
    const rect = canvasRef.current!.getBoundingClientRect();
    const tx = hasPointer ? pointer.x - rect.left : w * 0.68 + Math.cos(time * 0.4) * 6;
    const ty = hasPointer ? pointer.y - rect.top : h * 0.52 + Math.sin(time * 0.53) * 6;
    const k = lerp(18, 60, E);
    const c = lerp(9, 11, E);
    s.vx += ((tx - s.x) * k - s.vx * c) * dt;
    s.vy += ((ty - s.y) * k - s.vy * c) * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const speed = Math.hypot(s.vx, s.vy);

    s.trail.unshift({ x: s.x, y: s.y });
    if (s.trail.length > 70) s.trail.pop();

    // letters follow each other — overlapping action
    s.letters.forEach((l, i) => {
      const lead = i === 0 ? s.trail[Math.min(6, s.trail.length - 1)] : s.letters[i - 1];
      l.x = damp(l.x, lead.x, 9, dt);
      l.y = damp(l.y, lead.y, 9, dt);
    });

    // ── sound layer: air responds to speed
    const sp = clamp(pointerSpeed() / 2200);
    audio.air(E >= LAYER_AT[2] ? sp * 0.8 : 0, 0.2 + sp * 0.7);

    // ── draw
    ctx.clearRect(0, 0, w, h);
    const a = s.appear;
    ctx.lineCap = 'round';

    // composition: architectural construction lines
    const comp = smoothstep(LAYER_AT[4], 1, E);
    if (comp > 0) {
      ctx.save();
      ctx.strokeStyle = C.fg;
      ctx.globalAlpha = 0.18 * comp;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, s.y);
      ctx.lineTo(w, s.y);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, h);
      ctx.stroke();
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 90 + Math.sin(time) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s.x, s.y, 220, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // connections between letters
      ctx.globalAlpha = 0.32 * comp;
      ctx.beginPath();
      s.letters.forEach((l, i) => (i ? ctx.lineTo(l.x, l.y) : ctx.moveTo(l.x, l.y)));
      ctx.stroke();
      ctx.globalAlpha = 0.55 * comp;
      ctx.fillStyle = C.fg;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText(`x ${s.x.toFixed(0)}  y ${s.y.toFixed(0)}  v ${speed.toFixed(0)}`, s.x + 14, s.y - 14);
      ctx.restore();
    }

    // motion: a trail
    const trailA = smoothstep(LAYER_AT[1], LAYER_AT[1] + 0.12, E);
    if (trailA > 0 && s.trail.length > 2) {
      for (let i = 1; i < s.trail.length; i++) {
        const t0 = s.trail[i - 1];
        const t1 = s.trail[i];
        ctx.strokeStyle = C.fg;
        ctx.globalAlpha = trailA * (1 - i / s.trail.length) * 0.7;
        ctx.lineWidth = lerp(3, 0.4, i / s.trail.length);
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.stroke();
      }
    }

    // sound: rings radiate with speed
    const ringA = smoothstep(LAYER_AT[2], LAYER_AT[2] + 0.1, E);
    s.ringClock += dt;
    if (ringA > 0 && speed > 260 && s.ringClock > lerp(0.3, 0.08, clamp(speed / 2500))) {
      s.ringClock = 0;
      s.rings.push({ x: s.x, y: s.y, r: 6, life: 1 });
    }
    ctx.lineWidth = 1;
    for (let i = s.rings.length - 1; i >= 0; i--) {
      const r = s.rings[i];
      r.r += dt * 140;
      r.life -= dt * 0.8;
      if (r.life <= 0) {
        s.rings.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = C.fg;
      ctx.globalAlpha = r.life * 0.35 * ringA;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // typography: the trail becomes a word
    const typeA = smoothstep(LAYER_AT[3], LAYER_AT[3] + 0.1, E);
    if (typeA > 0) {
      ctx.fillStyle = C.fg;
      ctx.font = `${Math.round(lerp(18, 30, comp))}px "Instrument Serif", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      s.letters.forEach((l, i) => {
        // letters only exist while they are spread out by motion
        const spread = clamp(Math.hypot(l.x - s.x, l.y - s.y) / 40);
        ctx.globalAlpha = typeA * spread * (1 - i * 0.08);
        ctx.fillText(WORD[i], l.x, l.y);
      });
    }

    // the dot itself
    const breath = 1 + Math.sin(time * 1.6) * 0.12 * (1 - E);
    const stretch = clamp(speed / 2400, 0, 0.6);
    const ang = Math.atan2(s.vy, s.vx);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    ctx.scale(1 + stretch, 1 / (1 + stretch));
    ctx.globalAlpha = a;
    ctx.fillStyle = E >= 1 ? C.accent : C.fg;
    ctx.beginPath();
    ctx.arc(0, 0, 5.5 * a * breath, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  });

  return (
    <Chapter id="understanding" env="ivory" number="00" title="Understanding" length={2.4} thresholds={[0.62]}>
      {({ stage, progress }) => {
        sim.current.progressRef = progress;
        return (
          <div className={`opening ${complete ? 'is-complete' : ''}`} ref={rootRef}>
            <canvas className="fill-canvas" ref={canvasRef} />
            <div className="op-text" ref={titleRef}>
              <div className="op-label mono">01 / Understanding</div>
              <h1 className="op-title">
                <span className="line">
                  <Split text="THE ART OF" stagger={0} />
                </span>
                <span className="line">
                  <Split text="MOTION" stagger={0} /> <em className="amp">&amp;</em> <Split text="SOUND DESIGN." stagger={0} />
                </span>
              </h1>
              <div className="op-sub">
                <span className="mono">Gaurav's understanding</span>
                <p>
                  A visual exploration of how motion and sound
                  <br />
                  shape perception, emotion and meaning.
                </p>
              </div>
              <div className="op-instruction mono">
                <span>Scroll</span>
                <span className="slash">/</span>
                <span>Move</span>
                <span className="slash">/</span>
                <button className={`listen ${soundOn ? 'is-on' : ''}`} onClick={() => audio.toggle()} data-cursor="listen">
                  Listen
                </button>
              </div>
            </div>
            <div className="op-manifesto">
              <span>Motion is not movement.</span>
              <span>Sound is not decoration.</span>
              <span>Together, they create perception.</span>
            </div>
            <div className="op-layers mono" aria-hidden>
              <div className="op-meter">
                <span ref={meterRef} />
              </div>
              {LAYERS.map((l, i) => (
                <span key={l} className={i <= layer ? 'is-on' : ''}>
                  {l}
                </span>
              ))}
            </div>
            <div className="op-statement">
              <Reveal show={complete || stage >= 1}>
                <em>Everything begins</em>
              </Reveal>
              <Reveal show={complete || stage >= 1} delay={140}>
                <em>with a decision to move.</em>
              </Reveal>
            </div>
          </div>
        );
      }}
    </Chapter>
  );
}
