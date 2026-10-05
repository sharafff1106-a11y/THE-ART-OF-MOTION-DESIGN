import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { brandStore, useBrand } from '../brand/brands';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useArmedSound, useCanvasLoop, useInView } from '../motion/hooks';
import { clamp, damp, lerp } from '../motion/math';

/**
 * 02 — STOP THE SCROLL
 * A social feed. Every post is still — except, if you let it, yours.
 * The feed slows and stops on the one thing that moves.
 */
type Mode = 'static' | 'moving';
const GREYS = [
  ['#d9d4cc', '#c4bdb2'],
  ['#cfd6dc', '#b6c0c9'],
  ['#e0d8cf', '#cbbfb2'],
  ['#d5d9cf', '#bfc5b7'],
  ['#ddd3d6', '#c8bbbf'],
];
const EVERY = 4;

export function Attention() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brand = useBrand();
  const visible = useInView(wrapRef, { threshold: 0.4 });
  const { armed, arm } = useArmedSound(wrapRef);
  const [mode, setMode] = useState<Mode>('static');
  const modeRef = useRef<Mode>('static');
  const auto = useRef(true);
  const st = useRef({ y: 0, v: 1, hold: 0, stopped: false, heart: -9, cue: true, ph: 0 });

  // demonstrates itself: static, then moving, until the visitor chooses
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      if (!auto.current) return;
      const next = modeRef.current === 'static' ? 'moving' : 'static';
      modeRef.current = next;
      st.current.cue = true;
      setMode(next);
    }, 5200);
    return () => window.clearInterval(id);
  }, [visible]);

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = st.current;
    const B = brandStore.get();
    const moving = modeRef.current === 'moving';

    ctx.fillStyle = '#e9e5df';
    ctx.fillRect(0, 0, w, h);
    // phone
    const ph = h * 0.9;
    const pw = ph * 0.5;
    const px = w / 2 - pw / 2;
    const py = (h - ph) / 2;
    ctx.fillStyle = '#121212';
    ctx.beginPath();
    ctx.roundRect(px - ph * 0.02, py - ph * 0.02, pw + ph * 0.04, ph + ph * 0.04, ph * 0.075);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, ph * 0.06);
    ctx.clip();
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(px, py, pw, ph);

    const cardH = pw * 1.18;
    const speed = ph * 0.42;
    // where is our post relative to the screen centre?
    const period = cardH * EVERY;
    const ours = (k: number) => k * period + cardH * 2;
    if (s.cue) {
      // every choice replays at once: the brand post enters from just below
      s.cue = false;
      const k = Math.ceil((s.y + ph * 1.1) / period);
      s.y = ours(k) + cardH / 2 - ph / 2 - ph * 0.55;
      s.hold = 0;
      s.v = 1;
      s.stopped = false;
    }
    const nearest = Math.round((s.y + ph / 2 - cardH * 2 - cardH / 2) / period);
    const ourTop = py + ours(nearest) - s.y;
    const centred = Math.abs(ourTop + cardH / 2 - (py + ph / 2)) < cardH * 0.18;

    if (moving && centred && !s.stopped) {
      s.stopped = true;
      s.hold = 1.8;
      s.heart = time;
      if (armed.current) audio.click(2600, 0.12);
    }
    if (!centred) s.stopped = false;
    if (s.hold > 0) s.hold -= dt;
    s.v = damp(s.v, s.hold > 0 ? 0 : 1, s.hold > 0 ? 7 : 3, dt);
    s.y += speed * s.v * dt;

    const first = Math.floor(s.y / cardH) - 1;
    for (let i = first; i < first + Math.ceil(ph / cardH) + 3; i++) {
      const top = py + i * cardH - s.y;
      const isOurs = ((i - 2) % EVERY + EVERY) % EVERY === 0;
      const pad = pw * 0.05;
      const u = pw / 170; // header and icons scale with the phone
      // header
      ctx.fillStyle = isOurs ? B.accent : '#d6d2cc';
      ctx.beginPath();
      ctx.arc(px + pad + 10 * u, top + 18 * u, 10 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isOurs ? '#1a1a1a' : '#cfcac3';
      if (isOurs) {
        ctx.font = `600 ${Math.max(8, pw * 0.065)}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(B.name.toLowerCase(), px + pad + 26 * u, top + 18 * u);
      } else ctx.fillRect(px + pad + 26 * u, top + 14 * u, pw * 0.3, 8 * u);
      // image
      const iy = top + 36 * u;
      const ih = cardH - 74 * u;
      if (isOurs) {
        const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
        g.addColorStop(0, B.dark[0]);
        g.addColorStop(1, B.dark[1]);
        ctx.fillStyle = g;
        ctx.fillRect(px, iy, pw, ih);
        const bob = moving ? Math.sin(time * 2) * ih * 0.03 : 0;
        const sc = moving ? 1 + Math.sin(time * 2) * 0.03 : 1;
        ctx.save();
        ctx.translate(px + pw / 2, iy + ih * 0.52 + bob);
        ctx.scale(sc, sc);
        B.draw(ctx, 0, 0, ih * 0.5, time);
        ctx.restore();
        if (moving) {
          // a light sweep across the post
          const sx = px + ((time * 0.6) % 1.6) * pw * 1.4 - pw * 0.4;
          const sg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
          sg.addColorStop(0, 'rgba(255,255,255,0)');
          sg.addColorStop(0.5, 'rgba(255,255,255,0.18)');
          sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg;
          ctx.fillRect(px, iy, pw, ih);
        }
        ctx.fillStyle = '#f3ece2';
        ctx.textAlign = 'center';
        ctx.font = `${ih * 0.1}px "Instrument Serif", Georgia, serif`;
        ctx.fillText(B.name, px + pw / 2, iy + ih * 0.13);
      } else {
        const [a, b] = GREYS[((i % GREYS.length) + GREYS.length) % GREYS.length];
        const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
        g.addColorStop(0, a);
        g.addColorStop(1, b);
        ctx.fillStyle = g;
        ctx.fillRect(px, iy, pw, ih);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(px + pw * (0.3 + (i % 3) * 0.2), iy + ih * 0.55, ih * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      // actions
      ctx.fillStyle = '#d6d2cc';
      [0, 1, 2].forEach((k) => ctx.fillRect(px + pad + k * 26 * u, top + cardH - 28 * u, 16 * u, 12 * u));
    }
    // a like, when the thumb stops
    const age = time - s.heart;
    if (age > 0 && age < 1.2) {
      const k = clamp(age / 0.3);
      ctx.globalAlpha = 1 - clamp((age - 0.8) / 0.4);
      ctx.fillStyle = '#ff3b5c';
      ctx.font = `${lerp(10, pw * 0.22, k)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('♥', px + pw / 2, py + ph / 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  });

  return (
    <Panel id="attention" num="02" title="Attention" theme="paper" headline={['Stop', 'the scroll.']} body={<p>Same feed. Same post. One small movement.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        tone="light"
        caption={<span className="mon-word" key={mode + brand.id}>{mode === 'moving' ? 'The thumb stops.' : 'Scrolled past.'}</span>}
        controls={
          <Segment
            boxed
            options={[
              { id: 'static', label: 'Static post' },
              { id: 'moving', label: 'Moving post' },
            ]}
            value={mode}
            onChange={(v) => {
              auto.current = false;
              void arm();
              setMode(v);
              modeRef.current = v;
              st.current.cue = true;
            }}
          />
        }
      />
    </Panel>
  );
}
