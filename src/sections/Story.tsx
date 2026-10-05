import { useMemo, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Monitor } from '../components/Monitor';
import { Panel } from '../components/Panel';
import { useArmedSound, useCanvasLoop } from '../motion/hooks';
import { drawHeadphones, serif } from '../motion/kora';
import { clamp, crossed, easeOut, lerp, rand } from '../motion/math';

/**
 * 10 — STORY
 * A wordless nine-second ad: a noisy city (problem), KORA (product),
 * calm (feeling). Every client knows this story without being told it.
 */
const ACTS = [
  { id: 'problem', label: 'Problem', at: 0 },
  { id: 'product', label: 'Product', at: 3.2 },
  { id: 'feeling', label: 'Feeling', at: 4.6 },
];
const LAND = 3.8;
const CALM = 4.6;
const LOGO = 7.4;
const CYCLE = 9.6;
const mixc = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;

export function Story() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { armed, arm } = useArmedSound(wrapRef);
  const [act, setAct] = useState(0);
  const st = useRef({ t0: performance.now() / 1000, prev: 0, act: 0 });
  const city = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: i / 14, w: rand(0.05, 0.075), h: rand(0.18, 0.42) })), []);

  useCanvasLoop(canvasRef, (ctx, w, h, _dt, time) => {
    const s = st.current;
    const t = (performance.now() / 1000 - s.t0) % CYCLE;
    const a = t >= ACTS[2].at ? 2 : t >= ACTS[1].at ? 1 : 0;
    if (a !== s.act) {
      s.act = a;
      setAct(a);
    }
    if (armed.current) {
      audio.air(t < LAND ? 0.55 : 0, 0.75);
      if (crossed(s.prev, t, LAND)) audio.impact(0.5, 0.6);
      if (crossed(s.prev, t, CALM + 0.2)) [261.6, 329.6, 392].forEach((f, i) => audio.tone(f, 3, 0.04, { when: audio.ctx!.currentTime + i * 0.12, send: 0.6 }));
      if (crossed(s.prev, t, LOGO)) audio.tone(523.3, 2, 0.04, { send: 0.6 });
    }
    s.prev = t;

    const m = easeOut(clamp((t - CALM) / 1.4));
    // sky: grey stress to warm calm
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mixc([88, 92, 98], [255, 176, 128], m));
    g.addColorStop(1, mixc([40, 42, 46], [255, 233, 199], m));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const floor = h * 0.86;
    // city
    for (const b of city) {
      const jitter = (1 - m) * Math.sin(time * 30 + b.x * 50) * 1.2;
      ctx.fillStyle = mixc([26, 28, 31], [214, 120, 80], m);
      ctx.globalAlpha = lerp(1, 0.55, m);
      ctx.fillRect(b.x * w + jitter, floor - b.h * h, b.w * w, b.h * h);
      if (m < 0.9) {
        ctx.fillStyle = `rgba(255,230,150,${(1 - m) * 0.5})`;
        for (let k = 0; k < 4; k++) if (Math.sin(time * 7 + k + b.x * 40) > 0.4) ctx.fillRect(b.x * w + 6 + k * 7, floor - b.h * h + 10 + k * 12, 3, 4);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = mixc([20, 21, 23], [200, 120, 80], m);
    ctx.fillRect(0, floor, w, h - floor);

    // noise lines become sound waves
    const cx = w / 2;
    for (let k = 0; k < 6; k++) {
      const baseY = h * (0.22 + k * 0.08);
      ctx.strokeStyle = m < 0.5 ? `rgba(230,230,235,${0.35 * (1 - m)})` : `rgba(255,255,255,${0.5 * m})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const jag = (Math.random() - 0.5) * h * 0.06 * (1 - m);
        const wave = Math.sin(x * 0.012 + time * 1.2 + k * 0.6) * h * 0.02 * m;
        const y = baseY + jag + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    // the person
    const hunch = lerp(0.14, 0, m) + Math.sin(time * 1.4) * 0.03 * m;
    const shake = (1 - m) * (t < LAND ? 1 : 0) * 1.2;
    ctx.save();
    ctx.translate(cx + rand(-shake, shake), floor);
    ctx.rotate(hunch);
    ctx.fillStyle = '#121212';
    ctx.beginPath();
    ctx.roundRect(-h * 0.04, -h * 0.2, h * 0.08, h * 0.2, h * 0.03);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -h * 0.25, h * 0.042, 0, Math.PI * 2);
    ctx.fill();
    // the product arrives
    if (t >= ACTS[1].at) {
      const d = clamp((t - ACTS[1].at) / (LAND - ACTS[1].at));
      const fall = d < 1 ? -h * 0.6 * (1 - d * d) : Math.exp(-(t - LAND) * 9) * Math.sin((t - LAND) * 30) * h * 0.008;
      drawHeadphones(ctx, 0, -h * 0.255 + fall, h * 0.11, '#fff3e6', '#ff5a1f');
    }
    ctx.restore();
    if (t > LAND && t < LAND + 0.8) {
      const k = (t - LAND) / 0.8;
      ctx.strokeStyle = `rgba(255,90,31,${1 - k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, floor - h * 0.255, h * (0.06 + k * 0.4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    // the end card
    if (t > LOGO) {
      const k = clamp((t - LOGO) / 0.6) * clamp((CYCLE - t) / 0.4);
      ctx.globalAlpha = k;
      ctx.fillStyle = '#5a2a10';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = serif(h * 0.13);
      ctx.fillText('KORA', cx, h * 0.14);
      ctx.font = `600 ${Math.max(9, h * 0.03)}px "IBM Plex Mono", monospace`;
      ctx.fillText('HEAR EVERYTHING.', cx, h * 0.22);
      ctx.globalAlpha = 1;
    }
  });

  return (
    <Panel id="story" num="10" title="Story" theme="paper" headline={['A story', 'in nine seconds.']} body={<p>No words. You still understand it.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        caption={
          <div className="acts">
            {ACTS.map((x, i) => (
              <button
                key={x.id}
                className={i === act ? 'is-on' : i < act ? 'is-past' : ''}
                onClick={() => {
                  void arm();
                  st.current.t0 = performance.now() / 1000 - x.at;
                }}
              >
                <i />
                {x.label}
              </button>
            ))}
          </div>
        }
      />
    </Panel>
  );
}
