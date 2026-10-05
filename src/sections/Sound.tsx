import { useRef, useState } from 'react';
import { brandStore, useBrand } from '../brand/brands';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useArmedSound, useCanvasLoop } from '../motion/hooks';
import { drawSub, serif } from '../motion/kora';
import { clamp, crossed, easeOut, lerp, rand } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 07 — SOUND
 * The client's product has its own sound: glass and mist, a can cracking
 * open, a clasp, a squeak. The pictures never change; the sound makes it real.
 */
const CYCLE = 3.8;
const BEATS = [0.8, 1.6, 2.4];

export function Sound() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brand = useBrand();
  const { armed, arm } = useArmedSound(wrapRef);
  const [on, setOn] = useState<'off' | 'on'>('off');
  const onRef = useRef(false);
  const st = useRef({
    t0: performance.now() / 1000,
    prev: 0,
    parts: [] as { x: number; y: number; vx: number; vy: number; life: number; r: number }[],
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = st.current;
    const B = brandStore.get();
    const t = (performance.now() / 1000 - s.t0) % CYCLE;
    const live = onRef.current && armed.current;
    const surface = h * 0.74;
    const size = h * 0.44;
    const cx = w / 2;

    BEATS.forEach((at, i) => {
      if (!crossed(s.prev, t, at)) return;
      if (live) B.moment[i].play();
      // the visual half of each beat, identical with sound on or off
      if (i === 1) {
        const n = B.id === 'drink' ? 30 : B.id === 'fragrance' ? 70 : 16;
        for (let k = 0; k < n; k++) {
          if (B.id === 'fragrance') s.parts.push({ x: cx + size * 0.12, y: surface - size * 0.92, vx: rand(40, 260), vy: rand(-90, 20), life: 1, r: rand(2, 7) });
          else if (B.id === 'drink') s.parts.push({ x: cx + rand(-size * 0.12, size * 0.12), y: surface - size * 0.95, vx: rand(-15, 15), vy: rand(-140, -60), life: 1, r: rand(1.5, 4) });
          else s.parts.push({ x: cx + rand(-size * 0.4, size * 0.4), y: surface, vx: rand(-120, 120), vy: rand(-90, -20), life: 0.8, r: rand(1.5, 3) });
        }
      }
    });
    s.prev = t;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, B.dark[0]);
    g.addColorStop(1, B.dark[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, surface, w, 1);

    const fade = t > CYCLE - 0.35 ? 1 - (t - (CYCLE - 0.35)) / 0.35 : 1;
    ctx.globalAlpha = fade;
    // the product arrives on the first beat
    const k = clamp((t - 0.25) / (BEATS[0] - 0.25));
    const y = lerp(-size, surface - size / 2, k * k);
    const settle = t > BEATS[0] ? Math.exp(-(t - BEATS[0]) * 9) * Math.sin((t - BEATS[0]) * 30) * h * 0.008 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, surface, size * 0.4 * k, size * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
    B.draw(ctx, cx, y + settle, size, time);

    // particles: mist, bubbles or dust
    for (let i = s.parts.length - 1; i >= 0; i--) {
      const p = s.parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.exp(-1.6 * dt);
      if (B.id !== 'fragrance' && B.id !== 'drink') p.vy += 300 * dt;
      p.life -= dt * (B.id === 'fragrance' ? 0.6 : 0.9);
      if (p.life <= 0) {
        s.parts.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = fade * p.life * (B.id === 'fragrance' ? 0.35 : 0.7);
      ctx.fillStyle = B.id === 'drink' ? 'rgba(255,240,200,1)' : '#e8e2d8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (B.id === 'fragrance' ? 1 + (1 - p.life) * 2 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = fade;
    // the shine on the third beat
    if (t > BEATS[2] && t < BEATS[2] + 0.9) {
      const e = (t - BEATS[2]) / 0.9;
      ctx.globalAlpha = fade * Math.sin(e * Math.PI) * 0.9;
      drawSphere(ctx, 'glow', cx + size * 0.18, surface - size * 0.75, size * 0.25);
      ctx.fillStyle = '#fff';
      const sx = cx + size * 0.18;
      const sy = surface - size * 0.75;
      const r = size * 0.12 * easeOut(Math.sin(e * Math.PI));
      ctx.fillRect(sx - r, sy - 0.75, r * 2, 1.5);
      ctx.fillRect(sx - 0.75, sy - r, 1.5, r * 2);
    }
    ctx.globalAlpha = fade * 0.9;
    ctx.fillStyle = '#f3ece2';
    ctx.textAlign = 'center';
    ctx.font = serif(h * 0.08);
    ctx.fillText(B.name, cx, h * 0.14);
    ctx.globalAlpha = 1;

    if (onRef.current) {
      BEATS.forEach((at, i) => {
        const age = t - at;
        if (age >= 0 && age < 0.8) drawSub(ctx, w, h, B.moment[i].label, age < 0.6 ? 1 : 1 - (age - 0.6) / 0.2);
      });
    }
  });

  return (
    <Panel id="sound" num="07" title="Sound" theme="dark" headline={['Now', 'listen.']} body={<p>Same pictures. Turn the sound on.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        caption={<span className="mon-word" key={on + brand.id}>{on === 'on' ? 'Feels real. You can almost touch it.' : 'Looks nice. Feels flat.'}</span>}
        controls={
          <Segment
            boxed
            options={[
              { id: 'off', label: 'Sound off' },
              { id: 'on', label: 'Sound on' },
            ]}
            value={on}
            onChange={(v) => {
              setOn(v);
              onRef.current = v === 'on';
              if (v === 'on') {
                void arm();
                st.current.t0 = performance.now() / 1000;
              }
            }}
          />
        }
      />
    </Panel>
  );
}
