import { useRef, useState } from 'react';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { brandStore } from '../brand/brands';
import { useCanvasLoop } from '../motion/hooks';
import { serif } from '../motion/kora';
import { rand } from '../motion/math';
import { EMOTIONS, EmotionId } from './emotions';

/**
 * 08 — EMOTION
 * The same KORA product shot, seven moods. Light, colour, movement, type
 * and sound change; the product does not.
 */
type Particles = 'bokeh' | 'flicker' | 'rings' | 'confetti' | 'sparkle' | 'rain' | 'motes';
const LOOK: Record<EmotionId, { top: string; bottom: string; glow: string; band: string; cup: string; tag: string; font: string; ink: string; p: Particles; float: number; speed: number; sway: number; jitter: number; bounce: number; pulse: number; scale: number }> = {
  calm: { top: '#cfdcf2', bottom: '#eef1f6', glow: 'rgba(255,255,255,0.7)', band: '#f6f4ef', cup: '#8fb4ff', tag: 'Find your quiet.', font: 'italic', ink: '#3b4a66', p: 'bokeh', float: 0.025, speed: 0.6, sway: 0.03, jitter: 0, bounce: 0, pulse: 0, scale: 1 },
  nervous: { top: '#2b3236', bottom: '#151a1c', glow: 'rgba(160,190,200,0.18)', band: '#c9d1d4', cup: '#6f8a93', tag: 'SOMETHING IS COMING', font: 'mono', ink: '#c9d1d4', p: 'flicker', float: 0.006, speed: 9, sway: 0.01, jitter: 0.012, bounce: 0, pulse: 0, scale: 0.9 },
  powerful: { top: '#1a0f0b', bottom: '#050404', glow: 'rgba(255,80,30,0.35)', band: '#ffffff', cup: '#ff4d12', tag: 'UNLEASH IT.', font: 'heavy', ink: '#ffffff', p: 'rings', float: 0.01, speed: 1, sway: 0, jitter: 0, bounce: 0, pulse: 0.08, scale: 1.15 },
  playful: { top: '#ffd9ef', bottom: '#fff4c8', glow: 'rgba(255,255,255,0.6)', band: '#ffffff', cup: '#ff4fa3', tag: 'Play it loud!', font: 'round', ink: '#7a2a8c', p: 'confetti', float: 0, speed: 3.2, sway: 0.08, jitter: 0, bounce: 0.09, pulse: 0, scale: 0.95 },
  luxury: { top: '#0d0c0b', bottom: '#1c1915', glow: 'rgba(201,164,107,0.22)', band: '#c9a46b', cup: '#16130f', tag: 'C R A F T E D   T O   L A S T', font: 'spaced', ink: '#c9a46b', p: 'sparkle', float: 0.008, speed: 0.4, sway: 0.01, jitter: 0, bounce: 0, pulse: 0, scale: 1 },
  sad: { top: '#59636e', bottom: '#8a929b', glow: 'rgba(255,255,255,0.08)', band: '#b8bec5', cup: '#5f6b78', tag: 'Some songs stay.', font: 'light', ink: '#e6e9ec', p: 'rain', float: 0.004, speed: 0.4, sway: 0, jitter: 0, bounce: 0, pulse: 0, scale: 0.86 },
  hopeful: { top: '#ffb98c', bottom: '#fff0c9', glow: 'rgba(255,255,230,0.8)', band: '#fffaf0', cup: '#ff8a4c', tag: 'Hear a new day.', font: 'italic', ink: '#7a3b14', p: 'motes', float: 0.02, speed: 0.8, sway: 0.02, jitter: 0, bounce: 0, pulse: 0, scale: 1.03 },
};

const hex = (h: string) => (h.startsWith('#') ? [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) : [0, 0, 0]);
const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
const rgb = (c: number[]) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

export function Emotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emotion, setEmotion] = useState<EmotionId>('calm');
  const emotionRef = useRef<EmotionId>('calm');
  const st = useRef({
    top: hex(LOOK.calm.top),
    bottom: hex(LOOK.calm.bottom),
    since: 0,
    beat: 0,
    parts: Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random(), v: Math.random() })),
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = st.current;
    const L = LOOK[emotionRef.current];
    s.since += dt;
    // the grade crossfades so the change itself feels designed
    s.top = mix(s.top, hex(L.top), 1 - Math.exp(-4 * dt));
    s.bottom = mix(s.bottom, hex(L.bottom), 1 - Math.exp(-4 * dt));
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgb(s.top));
    g.addColorStop(1, rgb(s.bottom));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, h * 0.65);
    glow.addColorStop(0, L.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // atmosphere
    const cx = w / 2;
    const cy = h * 0.45;
    for (const p of s.parts) {
      if (L.p === 'bokeh') {
        p.y -= dt * 0.01 * (0.5 + p.v);
        if (p.y < -0.1) p.y = 1.1;
        if (p.s > 0.45) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.12 + p.s * 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 3 + p.s * 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (L.p === 'flicker') {
        if (Math.random() < 0.08) {
          ctx.fillStyle = 'rgba(200,220,225,0.35)';
          ctx.fillRect(p.x * w, rand(0, h), rand(10, 80), 1);
        }
      } else if (L.p === 'confetti') {
        p.y += dt * (0.08 + p.v * 0.12);
        if (p.y > 1.05) p.y = -0.05;
        ctx.save();
        ctx.translate(p.x * w + Math.sin(time * 2 + p.s * 9) * 10, p.y * h);
        ctx.rotate(time * 3 + p.s * 6);
        ctx.fillStyle = ['#ff4fa3', '#ffd23f', '#40d8ff', '#7cff8a'][Math.floor(p.s * 4)];
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      } else if (L.p === 'sparkle') {
        const a = Math.max(0, Math.sin(time * 0.8 + p.s * 20)) * 0.9;
        ctx.fillStyle = `rgba(230,200,140,${a * 0.7})`;
        ctx.fillRect(p.x * w, p.y * h, 1.5, 1.5);
      } else if (L.p === 'rain') {
        p.y += dt * (0.5 + p.v * 0.4);
        if (p.y > 1.05) p.y = -0.05;
        ctx.strokeStyle = 'rgba(230,235,240,0.25)';
        ctx.beginPath();
        ctx.moveTo(p.x * w, p.y * h);
        ctx.lineTo(p.x * w - 3, p.y * h + 14);
        ctx.stroke();
      } else if (L.p === 'motes') {
        p.y -= dt * 0.03 * (0.5 + p.v);
        if (p.y < -0.05) p.y = 1.05;
        ctx.fillStyle = `rgba(255,250,220,${0.3 + p.s * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x * w + Math.sin(time + p.s * 9) * 8, p.y * h, 1.5 + p.s * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (L.p === 'rings') {
      const period = 1.1;
      const ph = (time % period) / period;
      for (let i = 0; i < 3; i++) {
        const k = (ph + i / 3) % 1;
        ctx.strokeStyle = `rgba(255,90,30,${(1 - k) * 0.45})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, h * (0.2 + k * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.lineWidth = 1;
    }

    // the product — same object, different behaviour
    let y = cy + Math.sin(time * L.speed) * h * L.float;
    let x = cx + Math.sin(time * L.speed * 0.7) * w * L.sway * 0.3;
    if (L.jitter) {
      x += rand(-1, 1) * h * L.jitter;
      y += rand(-1, 1) * h * L.jitter;
    }
    if (L.bounce) y -= Math.abs(Math.sin(time * L.speed)) * h * L.bounce;
    let sc = L.scale;
    if (L.pulse) sc *= 1 + Math.pow(Math.max(0, Math.sin((time / 1.1) * Math.PI * 2)), 10) * L.pulse;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * L.speed * 0.8) * L.sway);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.27 - (y - cy), h * 0.18, h * 0.02, 0, 0, Math.PI * 2);
    ctx.fill();
    brandStore.get().draw(ctx, 0, 0, h * 0.42, time);
    ctx.restore();

    // the line, set in the voice of the feeling
    const k = Math.min(1, s.since / 0.6);
    ctx.globalAlpha = k;
    ctx.fillStyle = L.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ty = h * 0.84 + (1 - k) * 10;
    if (L.font === 'mono') ctx.font = `500 ${h * 0.05}px "IBM Plex Mono", monospace`;
    else if (L.font === 'heavy') ctx.font = `900 ${h * 0.09}px Inter, sans-serif`;
    else if (L.font === 'round') ctx.font = `800 ${h * 0.075}px Inter, sans-serif`;
    else if (L.font === 'spaced') ctx.font = serif(h * 0.045);
    else if (L.font === 'light') ctx.font = serif(h * 0.07);
    else ctx.font = serif(h * 0.075, true);
    const jx = L.font === 'mono' ? rand(-1.5, 1.5) : 0;
    ctx.fillText(L.tag, cx + jx, ty);
    ctx.globalAlpha = 1;
  });

  const ids = Object.keys(EMOTIONS) as EmotionId[];
  return (
    <Panel id="emotion" num="08" title="Emotion" theme="paper" headline={['Same product.', 'Different feeling.']} body={<p>Pick a feeling. The product stays the same.</p>}>
      <Monitor
        canvasRef={canvasRef}
        caption={
          <span className="mon-word" key={emotion}>
            {EMOTIONS[emotion].uses.slice(0, 3).join(' · ')}
          </span>
        }
        controls={
          <Segment
            boxed
            options={ids.map((id) => ({ id, label: EMOTIONS[id].label }))}
            value={emotion}
            onChange={(id) => {
              setEmotion(id);
              emotionRef.current = id;
              st.current.since = 0;
              EMOTIONS[id].sound();
            }}
          />
        }
      />
    </Panel>
  );
}
