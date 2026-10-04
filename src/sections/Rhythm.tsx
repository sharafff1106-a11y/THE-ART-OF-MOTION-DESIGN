import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Segment, Slider, Toggle } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useSoundEnabled } from '../motion/hooks';
import { clamp, lerp, rand } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 05 — RHYTHM
 * Hits are placed in space along one bar. Each one excites the spectrum
 * and the ribbon at its position — the eye and the ear read the same pattern.
 */
type Mode = 'regular' | 'syncopated' | 'triplet' | 'human' | 'chaotic';
interface Hit {
  t: number;
  v: number;
  accent: boolean;
  p: number;
}
const S16 = (steps: number[], acc: number[]): Hit[] => steps.map((s) => ({ t: s / 16, v: acc.includes(s) ? 1 : 0.7, accent: acc.includes(s), p: 1 }));
const GEN: Record<Mode, () => Hit[]> = {
  regular: () => Array.from({ length: 8 }, (_, i) => ({ t: i / 8, v: i % 2 ? 0.62 : 0.88, accent: i % 4 === 0, p: 1 })),
  syncopated: () => S16([0, 3, 6, 10, 12, 14], [0, 6, 12]),
  triplet: () => Array.from({ length: 12 }, (_, i) => ({ t: i / 12, v: i % 3 ? 0.55 : 0.95, accent: i % 6 === 0, p: i % 3 ? 1.2 : 1 })),
  human: () =>
    Array.from({ length: 8 }, (_, i) => ({
      t: clamp(i / 8 + (i ? rand(-0.012, 0.012) : rand(0, 0.006))),
      v: (i % 2 ? 0.55 : 0.8) + rand(-0.12, 0.12),
      accent: i % 4 === 0,
      p: 1 + rand(-0.03, 0.03),
    })),
  chaotic: () =>
    Array.from({ length: Math.round(rand(5, 11)) }, () => ({ t: Math.random(), v: rand(0.3, 1), accent: Math.random() < 0.25, p: rand(0.5, 1.8) })).sort(
      (a, b) => a.t - b.t,
    ),
};
const MODES: { id: Mode; label: string }[] = [
  { id: 'regular', label: 'Regular' },
  { id: 'syncopated', label: 'Syncopated' },
  { id: 'triplet', label: 'Triplet' },
  { id: 'human', label: 'Human' },
  { id: 'chaotic', label: 'Chaotic' },
];
const BARS = 96;

let barSprite: HTMLCanvasElement | null = null;
function getBarSprite() {
  if (barSprite) return barSprite;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,90,30,0)');
  grad.addColorStop(0.7, 'rgba(255,120,50,1)');
  grad.addColorStop(1, 'rgba(255,90,30,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  return (barSprite = c);
}
const LOOKAHEAD = 0.12;

export function Rhythm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundOn = useSoundEnabled();
  const [mode, setModeState] = useState<Mode>('syncopated');
  const [bpm, setBpm] = useState(100);
  const modeRef = useRef<Mode>('syncopated');
  const bpmRef = useRef(100);

  const seq = useRef({
    barStart: -1,
    bar: [] as Hit[],
    idx: 0,
    hitAt: [] as number[],
    pending: [] as { time: number; i: number }[],
    energy: new Float32Array(BARS),
    flicker: new Float32Array(BARS),
  });

  const regen = (reset: boolean) => {
    const s = seq.current;
    s.bar = GEN[modeRef.current]();
    s.hitAt = s.bar.map(() => -10);
    if (reset) {
      s.pending = [];
      const now = performance.now() / 1000;
      const bd = 240 / bpmRef.current;
      s.idx = s.bar.findIndex((h) => s.barStart + h.t * bd > now + LOOKAHEAD);
      if (s.idx < 0) s.idx = s.bar.length;
    }
  };

  const play = (h: Hit, time: number) => {
    if (!audio.live) return;
    const when = audio.at(time);
    const m = modeRef.current;
    if (h.accent && m !== 'chaotic') audio.kick(h.v * 0.5, { when });
    const f = (m === 'triplet' ? 2100 : 1800) * h.p;
    audio.wood(h.accent ? f * 0.75 : f, h.v * 0.3, { when, pan: h.t * 1.4 - 0.7 });
  };

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = seq.current;
    const now = performance.now() / 1000;
    const bd = 240 / bpmRef.current;
    if (s.barStart < 0 || now - s.barStart > bd * 2) {
      s.barStart = now + 0.05;
      regen(false);
      s.idx = 0;
    }
    for (let guard = 0; guard < 64; guard++) {
      if (s.idx < s.bar.length) {
        const hit = s.bar[s.idx];
        const at = s.barStart + hit.t * bd;
        if (at < now + LOOKAHEAD) {
          play(hit, at);
          s.pending.push({ time: at, i: s.idx });
          s.idx++;
          continue;
        }
        break;
      }
      if (now + LOOKAHEAD >= s.barStart + bd) {
        s.barStart += bd;
        regen(false);
        s.idx = 0;
        s.pending = s.pending.filter((p) => p.time >= s.barStart);
        continue;
      }
      break;
    }

    const x0 = w * 0.04;
    const x1 = w * 0.96;
    const L = x1 - x0;
    const cy = h * 0.52;

    // hits excite the spectrum around their position
    for (let i = s.pending.length - 1; i >= 0; i--) {
      const p = s.pending[i];
      if (p.time > now) continue;
      s.hitAt[p.i] = p.time;
      const hit = s.bar[p.i];
      if (hit) {
        const c = hit.t * (BARS - 1);
        for (let b = 0; b < BARS; b++) {
          const d = (b - c) / 4.5;
          s.energy[b] = Math.min(1.4, s.energy[b] + Math.exp(-d * d) * hit.v);
        }
      }
      s.pending.splice(i, 1);
    }
    const decay = Math.exp(-dt * 4.2);
    for (let b = 0; b < BARS; b++) {
      s.energy[b] *= decay;
      s.flicker[b] = lerp(s.flicker[b], Math.random(), 0.15);
    }
    const energyAt = (x: number) => {
      const f = clamp((x - x0) / L) * (BARS - 1);
      const i = Math.floor(f);
      return lerp(s.energy[i], s.energy[Math.min(BARS - 1, i + 1)], f - i);
    };

    ctx.clearRect(0, 0, w, h);

    // spectrum
    const sprite = getBarSprite();
    ctx.globalCompositeOperation = 'lighter';
    const bw = L / BARS;
    for (let b = 0; b < BARS; b++) {
      const e = s.energy[b];
      const hh = (10 + s.flicker[b] * 22 + e * h * 0.42) * (0.65 + 0.35 * Math.sin(b * 0.7));
      const x = x0 + b * bw;
      ctx.globalAlpha = Math.min(1, 0.35 + e * 0.65);
      ctx.drawImage(sprite, x, cy - hh, Math.max(1, bw * 0.45), hh * 1.4);
    }
    ctx.globalAlpha = 1;

    // ribbon strands
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + k * 0.035})`;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 6) {
        const e = energyAt(x);
        const env = Math.sin(((x - x0) / L) * Math.PI);
        const y = cy + Math.sin(x * 0.012 + time * 1.4 + k * 0.35) * (14 + e * 60) * env + Math.sin(x * 0.03 - time * 2 + k) * 4 * env;
        if (x === x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // baseline and beat dots
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x0, cy + h * 0.2, L, 1);
    s.bar.forEach((hit, i) => {
      const x = x0 + hit.t * L;
      const age = now - s.hitAt[i];
      const pulse = age >= 0 && age < 2 ? Math.exp(-age * 6) : 0;
      const r = lerp(2.5, 5.5, hit.v) * (1 + pulse * 1.4);
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      if (pulse > 0.05) {
        drawSphere(ctx, 'glow', x, cy, r * 6 * pulse + r);
      }
      ctx.fillStyle = pulse > 0.4 ? '#ff7a3d' : '#ffffff';
      ctx.beginPath();
      ctx.arc(x, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x, cy + h * 0.2 - 4, 1, 8);
    });

    // the rider
    const phase = clamp((now - s.barStart) / bd);
    const px = x0 + phase * L;
    const env = Math.sin(phase * Math.PI);
    const py = cy + Math.sin(px * 0.012 + time * 1.4 + 0.9) * (14 + energyAt(px) * 60) * env;
    ctx.globalAlpha = 1;
    drawSphere(ctx, 'white', px, py, 11);
  });

  return (
    <Panel
      id="rhythm"
      num="05"
      title="Rhythm"
      theme="dark"
      className="panel--wide-visual"
      headline={['Motion and sound', 'speak the same language.']}
      headerRight={<Toggle on={soundOn} onChange={(v) => (v ? void audio.enable() : audio.disable())} labels={['Visual', 'Sound']} />}
      actions={
        <div className="rh-actions">
          <Segment
            boxed
            options={MODES}
            value={mode}
            onChange={(m) => {
              modeRef.current = m;
              setModeState(m);
              regen(true);
            }}
          />
          <div className="rh-tempo">
            <Slider
              label="Tempo"
              min={60}
              max={160}
              value={bpm}
              format={(v) => `${Math.round(v)} BPM`}
              onChange={(v) => {
                setBpm(v);
                bpmRef.current = v;
              }}
            />
          </div>
        </div>
      }
    >
      <canvas className="fill" ref={canvasRef} />
    </Panel>
  );
}
