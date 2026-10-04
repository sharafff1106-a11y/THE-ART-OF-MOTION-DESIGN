import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { PillButton, Segment, Slider } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useInView, useSoundEnabled } from '../motion/hooks';
import { drawHeadphones } from '../motion/kora';
import { clamp, easeOut, lerp, rand } from '../motion/math';

/**
 * 05 — RHYTHM
 * A five-shot KORA ad. Every hit in the music is a cut. Change the rhythm
 * and the same footage changes character — or cut off the beat and feel
 * the edit fall apart.
 */
type Mode = 'regular' | 'syncopated' | 'triplet' | 'human' | 'offbeat';
interface Hit {
  t: number;
  v: number;
  accent: boolean;
}
const S16 = (steps: number[], acc: number[]): Hit[] => steps.map((s) => ({ t: s / 16, v: acc.includes(s) ? 1 : 0.7, accent: acc.includes(s) }));
const regular = (): Hit[] => Array.from({ length: 4 }, (_, i) => ({ t: i / 4, v: i % 2 ? 0.7 : 0.95, accent: i % 2 === 0 }));
const GEN: Record<Mode, () => Hit[]> = {
  regular,
  syncopated: () => S16([0, 3, 6, 10, 12], [0, 6, 12]),
  triplet: () => Array.from({ length: 6 }, (_, i) => ({ t: i / 6, v: i % 3 ? 0.6 : 0.95, accent: i % 3 === 0 })),
  human: () => regular().map((h, i) => ({ ...h, t: clamp(h.t + (i ? rand(-0.018, 0.018) : 0)), v: h.v + rand(-0.15, 0.1) })),
  offbeat: regular,
};
const MODES: { id: Mode; label: string }[] = [
  { id: 'regular', label: 'Regular' },
  { id: 'syncopated', label: 'Syncopated' },
  { id: 'triplet', label: 'Triplet' },
  { id: 'human', label: 'Human' },
  { id: 'offbeat', label: 'Off the beat' },
];
const NOTES: Record<Mode, string> = {
  regular: 'Steady and confident. Good for product demos and explainers.',
  syncopated: 'Cuts that skip the expected beat feel modern and energetic. Fashion, sport, social.',
  triplet: 'A rolling, swinging feel. Playful brands and music content.',
  human: 'Small imperfections feel organic and handmade. Lifestyle and documentary.',
  offbeat: 'Same shots, same music, cuts slightly late. It feels wrong straight away.',
};
const LOOKAHEAD = 0.12;
const SHOTS = 5;

function drawShot(ctx: CanvasRenderingContext2D, shot: number, x: number, y: number, w: number, h: number, age: number, time: number) {
  const push = 1 + 0.07 * (1 - easeOut(clamp(age / 0.5)));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.translate(cx, cy);
  ctx.scale(push, push);
  ctx.translate(-cx, -cy);
  const serif = (size: number) => `${size}px "Instrument Serif", Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (shot === 0) {
    ctx.fillStyle = '#ff5a1f';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff5ec';
    ctx.font = serif(h * 0.5);
    ctx.fillText('New.', cx, cy);
  } else if (shot === 1) {
    ctx.fillStyle = '#141312';
    ctx.fillRect(x, y, w, h);
    drawHeadphones(ctx, cx, cy - h * 0.02, h * 0.5);
  } else if (shot === 2) {
    ctx.fillStyle = '#efe9df';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#141312';
    ctx.font = serif(h * 0.36);
    ctx.fillText('Hear', cx, cy - h * 0.13);
    ctx.font = `italic ${serif(h * 0.36)}`;
    ctx.fillStyle = '#ff5a1f';
    ctx.fillText('everything.', cx, cy + h * 0.2);
  } else if (shot === 3) {
    ctx.fillStyle = '#141312';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#ff5a1f';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const r = ((i / 6 + time * 0.3) % 1) * h * 0.7;
      ctx.globalAlpha = 1 - r / (h * 0.7);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#0d0c0b';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#efe9df';
    ctx.font = serif(h * 0.3);
    ctx.fillText('KORA', cx, cy - h * 0.04);
    ctx.font = `600 ${Math.max(8, h * 0.045)}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = '#ff7a45';
    ctx.fillText('PRE-ORDER NOW', cx, cy + h * 0.22);
  }
  ctx.restore();
}

export function Rhythm() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useInView(wrapRef, { threshold: 0.35 });
  const soundOn = useSoundEnabled();
  const [mode, setModeState] = useState<Mode>('regular');
  const [bpm, setBpm] = useState(104);
  const [playing, setPlaying] = useState(false);
  const modeRef = useRef<Mode>('regular');
  const bpmRef = useRef(104);
  const playingRef = useRef(false);
  playingRef.current = playing && soundOn && visible;

  // leaving the chapter stops the music
  useEffect(() => {
    if (!visible) setPlaying(false);
  }, [visible]);

  const seq = useRef({
    barStart: -1,
    bar: [] as Hit[],
    idx: 0,
    hitAt: [] as number[],
    pending: [] as { time: number; i: number }[],
    cuts: [] as number[],
    shot: 0,
    cutAt: 0,
    energy: 0,
  });

  const regen = (reset: boolean) => {
    const s = seq.current;
    s.bar = GEN[modeRef.current]();
    s.hitAt = s.bar.map(() => -10);
    if (reset) {
      s.pending = [];
      s.cuts = [];
      const now = performance.now() / 1000;
      const bd = 240 / bpmRef.current;
      s.idx = s.bar.findIndex((h) => s.barStart + h.t * bd > now + LOOKAHEAD);
      if (s.idx < 0) s.idx = s.bar.length;
    }
  };

  const play = (h: Hit, time: number) => {
    if (!playingRef.current || !audio.live) return;
    const when = audio.at(time);
    if (h.accent) audio.kick(h.v * 0.55, { when });
    audio.wood(h.accent ? 1300 : 1900, h.v * 0.24, { when, pan: h.t * 1.2 - 0.6 });
    // a soft bass note under each bar
    if (h.t === 0) audio.tone(55, (240 / bpmRef.current) * 0.9, 0.08, { when, send: 0.1 });
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
          // off the beat: the picture cuts late
          s.cuts.push(at + (modeRef.current === 'offbeat' ? bd * rand(0.07, 0.12) : 0));
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
    for (let i = s.pending.length - 1; i >= 0; i--) {
      const p = s.pending[i];
      if (p.time > now) continue;
      s.hitAt[p.i] = p.time;
      s.energy = 1;
      s.pending.splice(i, 1);
    }
    for (let i = s.cuts.length - 1; i >= 0; i--) {
      if (s.cuts[i] > now) continue;
      s.shot = (s.shot + 1) % SHOTS;
      s.cutAt = s.cuts[i];
      s.cuts.splice(i, 1);
    }
    s.energy *= Math.exp(-dt * 6);

    ctx.clearRect(0, 0, w, h);
    // monitor
    const mw = Math.min(w * 0.86, (h * 0.6 * 16) / 9);
    const mh = (mw * 9) / 16;
    const mx = (w - mw) / 2;
    const my = h * 0.06;
    drawShot(ctx, s.shot, mx, my, mw, mh, now - s.cutAt, time);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(mx + 0.5, my + 0.5, mw - 1, mh - 1);
    ctx.font = '600 9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(`SHOT ${s.shot + 1}/${SHOTS}`, mx, my + mh + 16);
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(bpmRef.current)} BPM`, mx + mw, my + mh + 16);

    // the music timeline: beats below, cuts above
    const tx = mx;
    const tw = mw;
    const ty = my + mh + 64;
    const phase = clamp((now - s.barStart) / bd);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(tx, ty, tw, 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('MUSIC', tx, ty + 26);
    ctx.fillText('CUTS', tx, ty - 18);
    s.bar.forEach((hit, i) => {
      const x = tx + hit.t * tw;
      const age = now - s.hitAt[i];
      const pulse = age >= 0 && age < 2 ? Math.exp(-age * 7) : 0;
      ctx.fillStyle = pulse > 0.3 ? '#ff7a3d' : 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(x, ty, lerp(3, 6, hit.v) * (1 + pulse), 0, Math.PI * 2);
      ctx.fill();
      // where the picture cuts relative to this beat
      const off = modeRef.current === 'offbeat' ? 0.095 : 0;
      ctx.fillStyle = modeRef.current === 'offbeat' ? '#ff5a1f' : 'rgba(255,255,255,0.75)';
      const cx = tx + (hit.t + off) * tw;
      ctx.beginPath();
      ctx.moveTo(cx - 4, ty - 12);
      ctx.lineTo(cx + 4, ty - 12);
      ctx.lineTo(cx, ty - 5);
      ctx.fill();
    });
    ctx.fillStyle = '#fff';
    ctx.fillRect(tx + phase * tw, ty - 20, 1, 40);
    // level meter
    ctx.fillStyle = '#ff5a1f';
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 24; i++) {
      const lv = s.energy * Math.exp(-i / 9) * (0.6 + 0.4 * Math.sin(i * 1.3 + time * 20));
      const bh = 2 + lv * 26;
      ctx.fillRect(tx + tw - 4 - i * 5, ty + 40 - bh, 3, bh);
    }
    ctx.globalAlpha = 1;
  });

  return (
    <Panel
      id="rhythm"
      num="05"
      title="Rhythm"
      theme="dark"
      question="Does the edit feel right?"
      headline={['Cut to', 'the beat.']}
      body={<p>A short KORA ad: five shots, cut on every beat of the music. Change the rhythm and watch the same footage change character.</p>}
      forYou={{
        text: 'Edits, transitions and kinetic type that land on the music feel intentional and premium. Off the beat, the same footage feels amateur.',
        uses: ['Social ads', 'Launch films', 'Music videos'],
      }}
      actions={
        <div className="rh-actions">
          <PillButton
            icon="none"
            onClick={async () => {
              await audio.enable();
              setPlaying((p) => !p);
            }}
          >
            {playing && soundOn ? '❚❚  Pause music' : '▶  Play with music'}
          </PillButton>
          <div className="rh-tempo">
            <Slider
              label="Tempo"
              min={70}
              max={150}
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
      <div className="fill" ref={wrapRef}>
        <canvas className="fill" ref={canvasRef} />
        <div className="rh-modes">
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
          <p className={mode === 'offbeat' ? 'is-warn' : ''}>{NOTES[mode]}</p>
        </div>
      </div>
    </Panel>
  );
}
