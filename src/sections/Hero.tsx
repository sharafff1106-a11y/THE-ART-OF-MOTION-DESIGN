import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { BrandPicker } from '../brand/BrandPicker';
import { brandStore, useBrand } from '../brand/brands';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { useArmedSound, useCanvasLoop, useInView } from '../motion/hooks';
import { serif } from '../motion/kora';
import { clamp, crossed, easeOut, lerp } from '../motion/math';
import { scrollToId } from '../motion/scroll';

/**
 * 01 — The pitch. The visitor says what they sell; their kind of product is
 * revealed three ways: static, with motion, with motion and sound.
 */
type Mode = 'static' | 'motion' | 'sound';
const END = 3.4;
const RISE = 0.3;
const LAND = 1.3;
const NAME = 1.6;
const TAG = 2.4;
const CAPTION: Record<Mode, string> = {
  static: 'A picture.',
  motion: 'A moment.',
  sound: 'A moment you can feel.',
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shown = useInView(ref, { threshold: 0.1, once: true });
  const brand = useBrand();
  const { armed, arm, visible } = useArmedSound(wrapRef);
  const [mode, setMode] = useState<Mode>('motion');
  const modeRef = useRef<Mode>('motion');
  const st = useRef({ t0: performance.now() / 1000, prev: 0 });


  // plays once when it comes into view, then rests on the last frame
  const replay = () => {
    st.current.t0 = performance.now() / 1000;
    st.current.prev = 0;
  };
  useEffect(() => {
    if (visible) replay();
  }, [visible]);
  // restart the reveal whenever the product changes
  useEffect(() => brandStore.subscribe(replay), []);

  useCanvasLoop(canvasRef, (ctx, w, h, _dt, time) => {
    const s = st.current;
    const B = brandStore.get();
    const m = modeRef.current;
    const t = m === 'static' ? END : Math.min(performance.now() / 1000 - s.t0, END);
    if (m === 'sound' && armed.current) {
      if (crossed(s.prev, t, RISE)) audio.whoosh(LAND - RISE, 0.12);
      if (crossed(s.prev, t, LAND)) B.place(0.8, 0.6);
      if (crossed(s.prev, t, NAME)) B.moment[2].play();
      if (crossed(s.prev, t, TAG)) audio.tone(392, 2, 0.03, { send: 0.6 });
    }
    s.prev = t;

    // backdrop with a slow light sweep
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, B.dark[0]);
    g.addColorStop(1, B.dark[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const lightX = m === 'static' ? w * 0.5 : lerp(-w * 0.3, w * 0.5, easeOut(clamp(t / 1.6)));
    const glow = ctx.createRadialGradient(lightX, h * 0.42, 0, lightX, h * 0.42, h * 0.7);
    glow.addColorStop(0, 'rgba(255,240,220,0.16)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    const floor = h * 0.74;
    const size = h * 0.46;
    const k = easeOut(clamp((t - RISE) / (LAND - RISE)));
    const settle = t > LAND ? Math.exp(-(t - LAND) * 6) * Math.sin((t - LAND) * 14) * h * 0.012 : 0;
    const py = lerp(h + size, floor - size / 2, k) + settle + (t > LAND ? Math.sin(time * 1.2) * h * 0.006 : 0);
    // reflection and shadow
    ctx.globalAlpha = 0.18 * k;
    ctx.save();
    ctx.translate(0, floor * 2);
    ctx.scale(1, -1);
    B.draw(ctx, w / 2, py, size);
    ctx.restore();
    ctx.globalAlpha = 1;
    const fade = ctx.createLinearGradient(0, floor, 0, h);
    fade.addColorStop(0, 'rgba(0,0,0,0.2)');
    fade.addColorStop(1, B.dark[1]);
    ctx.fillStyle = fade;
    ctx.fillRect(0, floor, w, h - floor);
    B.draw(ctx, w / 2, py, size, time);

    // the name, letter by letter
    const letters = [...B.name];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = serif(h * 0.11);
    const total = ctx.measureText(B.name).width;
    let x = w / 2 - total / 2;
    letters.forEach((c, i) => {
      const lw = ctx.measureText(c).width;
      const lk = easeOut(clamp((t - NAME - i * 0.06) / 0.5));
      ctx.globalAlpha = lk;
      ctx.fillStyle = '#f3ece2';
      ctx.fillText(c, x + lw / 2, h * 0.16 + (1 - lk) * h * 0.04);
      x += lw;
    });
    ctx.globalAlpha = easeOut(clamp((t - TAG) / 0.6));
    ctx.font = serif(h * 0.05, true);
    ctx.fillStyle = B.accent;
    ctx.fillText(B.tagline, w / 2, h * 0.88);
    ctx.globalAlpha = 1;
  });

  return (
    <section ref={ref} id="understanding" data-theme="ivory" data-num="01" className={`panel panel--ivory hero hero--pitch ${shown ? 'is-in' : ''}`}>
      <div className="hp-copy">
        <p className="hero-eyebrow">Gaurav · Motion &amp; Sound Designer</p>
        <h1 className="hp-h">
          <span className="line">
            <span style={{ ['--i' as string]: 0 }}>What can motion</span>
          </span>
          <span className="line">
            <span style={{ ['--i' as string]: 1 }}>and sound do for</span>
          </span>
          <span className="line">
            <span style={{ ['--i' as string]: 2 }}>
              <em>your brand?</em>
            </span>
          </span>
        </h1>
        <div className="hp-pick">
          <p>What do you sell?</p>
          <BrandPicker />
        </div>
        <button className="hk-start" onClick={() => scrollToId('attention')}>
          <span>See it on your product</span>
          <span className="hk-start-ico">↓</span>
        </button>
      </div>
      <div className="hp-stage">
        <Monitor
          canvasRef={canvasRef}
          wrapRef={wrapRef}
          onReplay={mode === 'static' ? undefined : replay}
          caption={<span className="mon-word" key={mode + brand.id}>{CAPTION[mode]}</span>}
          controls={
            <Segment
              boxed
              options={[
                { id: 'static', label: 'Static' },
                { id: 'motion', label: 'Motion' },
                { id: 'sound', label: 'Motion + sound' },
              ]}
              value={mode}
              onChange={(v) => {
                if (v === 'sound') void arm();
                setMode(v);
                modeRef.current = v;
                replay();
              }}
            />
          }
        />
      </div>
    </section>
  );
}
