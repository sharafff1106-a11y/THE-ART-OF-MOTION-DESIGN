import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useArmedSound, useCanvasLoop } from '../motion/hooks';
import { drawBackdrop, serif } from '../motion/kora';
import { clamp, damp, lerp, rand } from '../motion/math';

/**
 * 04 — WEIGHT
 * The same KORA box, dropped again and again. Only gravity, bounce and the
 * world's reaction change — and with them, how heavy it feels.
 */
type Mass = 'feather' | 'light' | 'medium' | 'heavy' | 'massive';
const MASS: Record<Mass, { label: string; word: string; g: number; rest: number; squash: number; shake: number; dust: number; m: number; cycle: number }> = {
  feather: { label: 'Feather', word: 'Weightless. It drifts.', g: 0, rest: 0, squash: 0, shake: 0, dust: 0, m: 0, cycle: 4.6 },
  light: { label: 'Light', word: 'Light. It bounces.', g: 4.2, rest: 0.62, squash: 0.32, shake: 0, dust: 0, m: 0.1, cycle: 3 },
  medium: { label: 'Medium', word: 'Solid. It lands.', g: 5.2, rest: 0.3, squash: 0.14, shake: 0.006, dust: 6, m: 0.42, cycle: 3 },
  heavy: { label: 'Heavy', word: 'Heavy. It hits hard.', g: 6.4, rest: 0.1, squash: 0.06, shake: 0.018, dust: 18, m: 0.72, cycle: 3 },
  massive: { label: 'Massive', word: 'Massive. The world shakes.', g: 7.6, rest: 0.02, squash: 0.02, shake: 0.04, dust: 40, m: 1, cycle: 3.2 },
};

export function Weight() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { armed, arm } = useArmedSound(wrapRef);
  const [mass, setMass] = useState<Mass>('medium');
  const massRef = useRef<Mass>('medium');
  const st = useRef({
    t: 99,
    y: 0,
    vy: 0,
    sq: 0,
    sv: 0,
    shake: 0,
    dust: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = st.current;
    const M = MASS[massRef.current];
    const floor = h * 0.8;
    const bw = h * 0.3;
    const bh = h * 0.32;
    const top = -bh * 0.2;
    // units: heights per second, so physics is the same at every screen size
    s.t += dt;
    if (s.t > M.cycle) {
      s.t = 0;
      s.y = top;
      s.vy = 0;
    }
    if (M.g === 0) {
      // a feather: slow fall, swaying
      s.y = lerp(top, floor - bh, clamp(s.t / (M.cycle * 0.85)));
    } else {
      s.vy += M.g * h * dt;
      s.y += s.vy * dt;
      if (s.y > floor - bh) {
        s.y = floor - bh;
        const strength = clamp(s.vy / (h * 3.2));
        if (s.vy > h * 0.25) {
          if (armed.current) audio.impact(M.m, strength);
          s.sv -= strength * M.squash * 14;
          s.shake = Math.max(s.shake, strength * M.shake * h);
          for (let i = 0; i < M.dust * strength; i++) {
            const dir = Math.random() < 0.5 ? -1 : 1;
            s.dust.push({ x: w / 2 + dir * rand(bw * 0.3, bw * 0.6), y: floor, vx: dir * rand(0.1, 0.7) * h, vy: -rand(0.05, 0.5) * h, life: 1 });
          }
        }
        s.vy = -s.vy * M.rest;
        if (Math.abs(s.vy) < h * 0.08) s.vy = 0;
      }
    }
    s.sv += (-s.sq * 300 - s.sv * 16) * dt;
    s.sq += s.sv * dt;
    s.shake = damp(s.shake, 0, 7, dt);

    ctx.save();
    if (s.shake > 0.3) ctx.translate(rand(-1, 1) * s.shake, rand(-1, 1) * s.shake * 0.6);
    drawBackdrop(ctx, w, h, '#ece8e1', '#d9d3c9');
    ctx.fillStyle = 'rgba(20,18,16,0.12)';
    ctx.fillRect(-20, floor, w + 40, 1);

    // shadow tells the height
    const height = clamp((floor - bh - s.y) / (floor - bh - top));
    ctx.fillStyle = `rgba(20,18,16,${lerp(0.3, 0.06, height)})`;
    ctx.beginPath();
    ctx.ellipse(w / 2, floor + 2, bw * lerp(0.62, 0.3, height), bh * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // the box
    const sway = M.g === 0 ? Math.sin(time * 2.2) * w * 0.06 : 0;
    const rot = M.g === 0 ? Math.sin(time * 2.2 + 0.6) * 0.18 : 0;
    const sq = clamp(s.sq, -0.35, 0.35);
    ctx.save();
    ctx.translate(w / 2 + sway, s.y + bh);
    ctx.rotate(rot);
    ctx.scale(1 - sq * 0.6, 1 + sq);
    ctx.translate(-bw / 2, -bh);
    ctx.fillStyle = '#1d1c1a';
    ctx.beginPath();
    ctx.roundRect(0, 0, bw, bh, bw * 0.06);
    ctx.fill();
    ctx.fillStyle = '#ff5a1f';
    ctx.fillRect(0, bh * 0.68, bw, bh * 0.07);
    ctx.fillStyle = '#efe9df';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = serif(bh * 0.22);
    ctx.fillText('KORA', bw / 2, bh * 0.4);
    ctx.restore();

    // dust
    ctx.fillStyle = '#8a8378';
    for (let i = s.dust.length - 1; i >= 0; i--) {
      const d = s.dust[i];
      d.vy += h * 1.4 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.exp(-3 * dt);
      if (d.y > floor) {
        d.y = floor;
        d.vy *= -0.2;
      }
      d.life -= dt * 0.9;
      if (d.life <= 0) {
        s.dust.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = d.life * 0.7;
      ctx.fillRect(d.x, d.y - 2, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  return (
    <Panel id="weight" num="04" title="Weight" theme="paper" headline={['Heavy', 'or light?']} body={<p>Same box. Only the motion changes.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        tone="light"
        caption={<span className="mon-word" key={mass}>{MASS[mass].word}</span>}
        controls={
          <Segment
            boxed
            options={(Object.keys(MASS) as Mass[]).map((id) => ({ id, label: MASS[id].label }))}
            value={mass}
            onChange={(m) => {
              void arm();
              setMass(m);
              massRef.current = m;
              st.current.t = 99;
            }}
          />
        }
      />
    </Panel>
  );
}
