import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { TIMING } from '../motion/easing';
import { useArmedSound, useCanvasLoop } from '../motion/hooks';
import { brandStore, useBrand } from '../brand/brands';
import { drawBackdrop, serif } from '../motion/kora';
import { clamp, crossed, lerp } from '../motion/math';

/**
 * 03 — TIMING
 * The KORA product reveal, five ways. Same start, same end, same duration.
 */
const WAIT = 0.45;
const MOVE = 1.0;
const HOLD = 1.3;
const CYCLE = WAIT + MOVE + HOLD;
const WORDS: Record<string, string> = {
  linear: 'Feels cheap.',
  eased: 'Feels premium.',
  anticipation: 'Feels confident.',
  overshoot: 'Feels playful.',
  settle: 'Feels real.',
};
const LABELS: Record<string, string> = { linear: 'Cheap', eased: 'Premium', anticipation: 'Confident', overshoot: 'Playful', settle: 'Real' };

export function Timing() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { armed, arm } = useArmedSound(wrapRef);
  const brand = useBrand();
  const [mode, setMode] = useState('linear');
  const modeRef = useRef('linear');
  const st = useRef({ t0: performance.now() / 1000, prev: 0, prevPos: 0 });

  useCanvasLoop(canvasRef, (ctx, w, h) => {
    const s = st.current;
    const preset = TIMING.find((p) => p.id === modeRef.current)!;
    const B = brandStore.get();
    const t = (performance.now() / 1000 - s.t0) % CYCLE;
    const u = clamp((t - WAIT) / MOVE);
    const p = preset.ease(u);

    drawBackdrop(ctx, w, h, B.dark[0], B.dark[1], 'rgba(255,235,210,0.12)');
    // floor line
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, h * 0.78, w, 1);

    const size = h * 0.42;
    const x0 = w * 0.18;
    const x1 = w * 0.5;
    const y = h * 0.5;
    // ghosts: where the product was a few frames ago — spacing shows speed
    for (let k = 5; k >= 1; k--) {
      const gu = clamp((t - k * 0.05 - WAIT) / MOVE);
      const gx = lerp(x0, x1, preset.ease(gu));
      ctx.globalAlpha = 0.07 * (6 - k);
      B.draw(ctx, gx, y, size);
    }
    ctx.globalAlpha = Math.min(1, t / 0.25);
    B.draw(ctx, lerp(x0, x1, p), y, size);
    // the name follows the product with the same timing
    const wu = clamp((t - WAIT - 0.18) / MOVE);
    const wp = preset.ease(wu);
    ctx.globalAlpha = clamp(wu * 3);
    ctx.fillStyle = '#efe9df';
    ctx.textAlign = 'center';
    ctx.font = serif(h * 0.11);
    ctx.fillText(B.name, w * 0.5, h * 0.17 + (1 - wp) * h * 0.06);
    ctx.globalAlpha = 1;

    // speed graph, bottom right
    const gw = w * 0.16;
    const gh = h * 0.16;
    const gx = w - gw - 18;
    const gy = h - gh - 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = B.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const q = i / 40;
      const yy = gy + gh - (preset.ease(q) * 0.7 + 0.15) * gh;
      if (i) ctx.lineTo(gx + q * gw, yy);
      else ctx.moveTo(gx + q * gw, yy);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(gx + u * gw, gy + gh - (p * 0.7 + 0.15) * gh, 3, 0, Math.PI * 2);
    ctx.fill();

    if (armed.current) {
      if (crossed(s.prev, t, WAIT)) audio.whoosh(MOVE * 0.8, 0.1);
      if (u > 0 && (s.prevPos - 1) * (p - 1) <= 0 && s.prevPos !== p) audio.click(2400, 0.12);
    }
    s.prev = t;
    s.prevPos = p;
  });

  return (
    <Panel id="timing" num="03" title="Timing" theme="dark" headline={['Premium', 'or cheap?']} body={<p>The same reveal. Only the timing changes.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        caption={<span className="mon-word" key={mode + brand.id}>{WORDS[mode]}</span>}
        controls={
          <Segment
            boxed
            options={TIMING.map((t) => ({ id: t.id, label: LABELS[t.id] }))}
            value={mode}
            onChange={(m) => {
              void arm();
              setMode(m);
              modeRef.current = m;
              st.current.t0 = performance.now() / 1000;
            }}
          />
        }
      />
    </Panel>
  );
}
