import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Chapter } from '../components/Chapter';
import { Choice, Slider } from '../components/Controls';
import { Reveal } from '../components/Typography';
import { ENV } from '../motion/environments';
import { useCanvasLoop } from '../motion/hooks';
import { clamp, lerp, rand } from '../motion/math';

/**
 * 04 — RHYTHM
 *
 * One bar, drawn as space. Where a circle sits in the line is when it
 * sounds. The spacing *is* the rhythm — seen and heard at once.
 */
const C = ENV.orange;
const LOOKAHEAD = 0.12;
const STEPS = 16;

type Mode = 'regular' | 'syncopated' | 'triplet' | 'chaotic' | 'human' | 'yours';
interface Hit {
  t: number;
  v: number;
  accent: boolean;
  /** pitch multiplier */
  p: number;
}

const grid = (steps: number[], accents: number[]): Hit[] =>
  steps.map((s) => ({ t: s / STEPS, v: accents.includes(s) ? 1 : 0.7, accent: accents.includes(s), p: 1 }));

const GEN: Record<Mode, (yours: Set<number>) => Hit[]> = {
  regular: () => Array.from({ length: 8 }, (_, i) => ({ t: i / 8, v: i % 2 ? 0.62 : 0.85, accent: i % 4 === 0, p: 1 })),
  syncopated: () => grid([0, 3, 6, 10, 12, 14], [0, 6, 12]),
  triplet: () => Array.from({ length: 12 }, (_, i) => ({ t: i / 12, v: i % 3 ? 0.55 : 0.95, accent: i % 6 === 0, p: i % 3 ? 1.2 : 1 })),
  chaotic: () => {
    const n = Math.round(rand(4, 11));
    return Array.from({ length: n }, () => ({ t: Math.random(), v: rand(0.3, 1), accent: Math.random() < 0.25, p: rand(0.5, 1.8) })).sort(
      (a, b) => a.t - b.t,
    );
  },
  human: () =>
    Array.from({ length: 8 }, (_, i) => ({
      t: clamp(i / 8 + (i ? rand(-0.011, 0.011) : rand(0, 0.006))),
      v: (i % 2 ? 0.55 : 0.78) + rand(-0.12, 0.14),
      accent: i % 4 === 0,
      p: 1 + rand(-0.03, 0.03),
    })),
  yours: (yours) => grid([...yours].sort((a, b) => a - b), [0, 4, 8, 12]),
};

const MODES: { id: Mode; label: string }[] = [
  { id: 'regular', label: 'Regular' },
  { id: 'syncopated', label: 'Syncopated' },
  { id: 'triplet', label: 'Triplet' },
  { id: 'chaotic', label: 'Chaotic' },
  { id: 'human', label: 'Human' },
  { id: 'yours', label: 'Yours' },
];

const WORDS = ['MOTION', 'AND', 'SOUND', 'SPEAK', 'THE', 'SAME', 'LANGUAGE.'];

export function Rhythm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setModeState] = useState<Mode>('regular');
  const [bpm, setBpm] = useState(96);
  const [words, setWords] = useState(0);
  const modeRef = useRef<Mode>('regular');
  const bpmRef = useRef(96);
  const stageRef = useRef(0);
  const yours = useRef(new Set([0, 4, 8, 10, 12]));

  const seq = useRef({
    barStart: -1,
    bar: [] as Hit[],
    idx: 0,
    hitAt: [] as number[],
    history: [] as Hit[][],
    rings: [] as { x: number; t0: number; v: number }[],
    pending: [] as { time: number; i: number }[],
    words: 0,
  });

  const regenerate = (resetIdx: boolean) => {
    const s = seq.current;
    s.bar = GEN[modeRef.current](yours.current);
    s.hitAt = s.bar.map(() => -10);
    if (resetIdx) {
      s.pending = [];
      const now = performance.now() / 1000;
      const barDur = 240 / bpmRef.current;
      s.idx = s.bar.findIndex((h) => s.barStart + h.t * barDur > now + LOOKAHEAD);
      if (s.idx < 0) s.idx = s.bar.length;
    }
  };

  const setMode = (m: Mode) => {
    modeRef.current = m;
    setModeState(m);
    regenerate(true);
  };

  const play = (h: Hit, time: number) => {
    if (!audio.live) return;
    const when = audio.at(time);
    const pan = h.t * 1.4 - 0.7;
    const m = modeRef.current;
    if (h.accent && m !== 'chaotic') audio.kick(h.v * 0.55, { when });
    const f = (m === 'triplet' ? 2100 : m === 'chaotic' ? 1700 : 1800) * h.p;
    audio.wood(h.accent ? f * 0.75 : f, h.v * 0.32, { when, pan });
  };

  useCanvasLoop(canvasRef, (ctx, w, h) => {
    const s = seq.current;
    const now = performance.now() / 1000;
    const barDur = 240 / bpmRef.current;
    if (s.barStart < 0 || now - s.barStart > barDur * 2) {
      s.barStart = now + 0.05;
      regenerate(false);
      s.idx = 0;
    }

    // ── scheduler: look ahead, schedule audio precisely, queue visuals
    for (let guard = 0; guard < 64; guard++) {
      if (s.idx < s.bar.length) {
        const hit = s.bar[s.idx];
        const at = s.barStart + hit.t * barDur;
        if (at < now + LOOKAHEAD) {
          play(hit, at);
          s.pending.push({ time: at, i: s.idx });
          s.idx++;
          continue;
        }
        break;
      }
      if (now + LOOKAHEAD >= s.barStart + barDur) {
        s.history.unshift(s.bar.map((b) => ({ ...b })));
        if (s.history.length > 6) s.history.pop();
        s.barStart += barDur;
        regenerate(false);
        s.idx = 0;
        s.pending = s.pending.filter((p) => p.time >= s.barStart);
        continue;
      }
      break;
    }

    // ── layout
    const x0 = w * 0.1;
    const x1 = w * 0.9;
    const L = x1 - x0;
    const cy = h * 0.5;
    const phase = clamp((now - s.barStart) / barDur);

    // fire visuals whose time has come
    for (let i = s.pending.length - 1; i >= 0; i--) {
      const p = s.pending[i];
      if (p.time <= now) {
        s.hitAt[p.i] = p.time;
        const hit = s.bar[p.i];
        if (hit) s.rings.push({ x: x0 + hit.t * L, t0: p.time, v: hit.v });
        s.pending.splice(i, 1);
        // the principle is spoken in the rhythm itself: one word per hit
        if (stageRef.current >= 3 && s.words < WORDS.length) {
          s.words++;
          setWords(s.words);
        }
      }
    }

    if (stageRef.current < 3 && s.words) {
      s.words = 0;
      setWords(0);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.fg;
    ctx.fillStyle = C.fg;

    // the step grid — the quantised world the human and the triplet escape from
    ctx.globalAlpha = 0.28;
    for (let i = 0; i <= STEPS; i++) {
      const x = x0 + (i / STEPS) * L;
      ctx.beginPath();
      ctx.moveTo(x, cy + (i % 4 === 0 ? 34 : 40));
      ctx.lineTo(x, cy + 48);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x0, cy);
    ctx.lineTo(x1, cy);
    ctx.stroke();

    // history: previous bars rise like a score
    s.history.forEach((bar, bi) => {
      const y = cy - 70 - bi * 30;
      ctx.globalAlpha = 0.5 * (1 - bi / 6);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
      ctx.beginPath();
      bar.forEach((hit) => {
        const x = x0 + hit.t * L;
        const r = 2 + hit.v * 3;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      });
      ctx.fill();
    });

    // rings
    for (let i = s.rings.length - 1; i >= 0; i--) {
      const r = s.rings[i];
      const age = now - r.t0;
      if (age > 1.2) {
        s.rings.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = (1 - age / 1.2) * 0.5 * r.v;
      ctx.beginPath();
      ctx.arc(r.x, cy, 14 + age * 140 * r.v, 0, Math.PI * 2);
      ctx.stroke();
    }

    // the circles of this bar
    s.bar.forEach((hit, i) => {
      const x = x0 + hit.t * L;
      const age = now - s.hitAt[i];
      const pulse = age >= 0 ? Math.exp(-age * 7) : 0;
      const r = lerp(7, 16, hit.v) * (1 + pulse * 0.9);
      ctx.globalAlpha = lerp(0.5, 1, Math.max(pulse, hit.accent ? 0.6 : 0));
      ctx.fillStyle = pulse > 0.5 ? C.accent : C.fg;
      ctx.beginPath();
      ctx.arc(x, cy - pulse * 10, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // playhead
    const px = x0 + phase * L;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = C.fg;
    ctx.fillRect(px, cy - 60, 1, 120);
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText(`${(phase * 4 + 1).toFixed(2)}`, px + 6, cy - 50);

    // breathing beat counter
    ctx.globalAlpha = 0.6;
    ctx.fillText(`${bpmRef.current.toFixed(0)} BPM · 4/4 · ${modeRef.current.toUpperCase()}`, x0, cy + 72);
    ctx.globalAlpha = 1;
  });

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    if (x < 0.08 || x > 0.92 || Math.abs(y - 0.5) > 0.12) return;
    const step = Math.round(((x - 0.1) / 0.8) * STEPS) % STEPS;
    if (modeRef.current !== 'yours') {
      // start from what you were hearing, quantised
      yours.current = new Set(seq.current.bar.map((h) => Math.round(h.t * STEPS) % STEPS));
    }
    const set = yours.current;
    if (set.has(step)) set.delete(step);
    else set.add(step);
    audio.wood(1800, 0.3);
    setMode('yours');
  };

  return (
    <Chapter id="rhythm" env="orange" number="04" title="Rhythm" length={4} thresholds={[0.12, 0.32, 0.6]}>
      {({ stage }) => {
        stageRef.current = stage;
        return (
          <div className="rhythm">
            <canvas className="fill-canvas" ref={canvasRef} onClick={onCanvasClick} data-cursor="tap" />
            <div className="chapter-mark mono">
              <span>04</span>
              <span>Rhythm</span>
            </div>
            <div className="rh-intro">
              <Reveal show={stage >= 1}>
                <em>Space becomes time.</em>
              </Reveal>
              <Reveal show={stage >= 1} delay={150}>
                <em>Time becomes sound.</em>
              </Reveal>
            </div>
            <div className={`rh-controls ${stage >= 2 ? 'is-in' : ''}`}>
              <Choice options={MODES} value={mode} onChange={setMode} />
              <div className="rh-tempo">
                <Slider
                  name="Tempo"
                  min={60}
                  max={168}
                  value={bpm}
                  format={(v) => `${Math.round(v)} BPM`}
                  onChange={(v) => {
                    setBpm(v);
                    bpmRef.current = v;
                  }}
                />
              </div>
              <p className="rh-hint mono">Tap the line to write your own.</p>
            </div>
            <h2 className="rh-principle display" aria-label={WORDS.join(' ')}>
              {WORDS.map((wd, i) => (
                <span key={wd} className={`rh-word ${stage >= 3 && i < words ? 'is-in' : ''}`} aria-hidden>
                  {wd}
                </span>
              ))}
            </h2>
          </div>
        );
      }}
    </Chapter>
  );
}
