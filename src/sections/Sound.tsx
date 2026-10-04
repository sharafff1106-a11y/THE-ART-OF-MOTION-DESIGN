import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { PillButton } from '../components/Controls';
import { Panel } from '../components/Panel';
import { drawCube } from '../motion/cube';
import { useCanvasLoop, useSoundEnabled } from '../motion/hooks';
import { lerp, rand } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 07 — SOUND
 * Press Drop: the same cube falls in both windows at the same moment.
 * Only the right one is sound-designed, and each layer is named as it plays.
 */
const HOLD = 0.25;
const FALL = 0.6;
const DONE = 2.6;
const LAYERS = [
  { id: 'air', label: 'Air', at: HOLD },
  { id: 'impact', label: 'Impact', at: HOLD + FALL },
  { id: 'body', label: 'Low body', at: HOLD + FALL + 0.02 },
  { id: 'debris', label: 'Debris', at: HOLD + FALL + 0.08 },
  { id: 'tail', label: 'Room tail', at: HOLD + FALL + 0.3 },
];

/** height above the floor, 0..1 */
function heightAt(t: number) {
  if (t < HOLD) return 1;
  const f = t - HOLD;
  if (f < FALL) return 1 - Math.pow(f / FALL, 2);
  const b = f - FALL;
  return b < 0.3 ? Math.sin((b / 0.3) * Math.PI) * 0.06 : 0;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
}

function useDropBox(ref: React.RefObject<HTMLCanvasElement>, t0: React.MutableRefObject<number>, designed: boolean) {
  const st = useRef({ shards: [] as Shard[], flash: 0, shake: 0, impacted: false, lastT0: -2, idleDrawn: false, bg: null as HTMLCanvasElement | null, bw: 0, bh: 0 });
  useCanvasLoop(ref, (ctx, w, h, dt) => {
    const s = st.current;
    const t = t0.current < 0 ? -1 : performance.now() / 1000 - t0.current;
    const active = t >= 0 && t < DONE;
    // nothing is moving: the resting frame is already on screen, so do no work
    if (!active && s.idleDrawn && s.bw === w && s.bh === h) return;
    if (t0.current !== s.lastT0) {
      s.lastT0 = t0.current;
      s.impacted = false;
    }
    const floor = h * 0.74;
    const size = Math.min(w, h) * 0.22;
    const cx = w * 0.5;

    if (!s.bg || s.bw !== w || s.bh !== h) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, w);
      c.height = Math.max(1, h);
      const g = c.getContext('2d')!;
      const fg = g.createLinearGradient(0, floor, 0, h);
      fg.addColorStop(0, 'rgba(255,255,255,0.10)');
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = fg;
      g.fillRect(0, floor, w, h - floor);
      s.bg = c;
      s.bw = w;
      s.bh = h;
    }
    if (designed && active && t >= HOLD + FALL && !s.impacted) {
      s.impacted = true;
      s.flash = 1;
      s.shake = 1;
      for (let i = 0; i < 22; i++) {
        s.shards.push({ x: cx + rand(-size * 0.5, size * 0.5), y: floor - 4, vx: rand(-240, 240), vy: rand(-380, -80), r: rand(1.5, 4), life: 1 });
      }
    }

    // before the first drop the cube waits at the top
    const H = t < 0 ? 1 : t >= DONE ? 0 : heightAt(t);
    const y = floor - size * 0.62 - H * h * 0.48;
    const falling = active && t > HOLD && t < HOLD + FALL;
    const sy = falling ? 1.05 : active && t > HOLD + FALL && t < HOLD + FALL + 0.08 ? 0.9 : 1;

    s.flash *= Math.exp(-dt * 6);
    s.shake *= Math.exp(-dt * 9);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (s.shake > 0.02) ctx.translate(rand(-1, 1) * s.shake * 6, rand(-1, 1) * s.shake * 4);
    if (s.flash > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = s.flash * 0.8;
      drawSphere(ctx, 'glow', cx, floor, size * 2.6);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(s.bg, 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, floor + 2, size * lerp(0.75, 0.3, H), size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    drawCube(ctx, cx, y, size, 0.5, 0.75, 0.05, [96, 96, 100], falling ? 0.95 : 1, sy);
    for (let i = s.shards.length - 1; i >= 0; i--) {
      const p = s.shards[i];
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > floor) {
        p.y = floor;
        p.vy *= -0.3;
        p.vx *= 0.7;
      }
      p.life -= dt * 0.75;
      if (p.life <= 0) {
        s.shards.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = i % 3 ? '#9a9792' : '#ff8a4a';
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    s.idleDrawn = !active && s.shards.length === 0 && s.flash < 0.02 && s.shake < 0.02;
  });
}

export function Sound() {
  const on = useSoundEnabled();
  const t0 = useRef(-1);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);
  const [lit, setLit] = useState<string[]>([]);
  const timers = useRef<number[]>([]);
  useDropBox(leftRef, t0, false);
  useDropBox(rightRef, t0, true);

  const drop = async () => {
    await audio.enable();
    timers.current.forEach((id) => window.clearTimeout(id));
    setLit([]);
    const start = performance.now() / 1000 + 0.05;
    t0.current = start;
    if (audio.live) {
      const at = audio.at(start);
      audio.whoosh(FALL, 0.16, { when: at + HOLD, pan: 0.5 });
      audio.impact(0.8, 0.95, { when: at + HOLD + FALL, pan: 0.5 });
      audio.impact(0.55, 0.18, { when: at + HOLD + FALL + 0.3, pan: 0.5 });
    }
    timers.current = LAYERS.map((l) => window.setTimeout(() => setLit((x) => [...x, l.id]), (0.05 + l.at) * 1000));
  };

  return (
    <Panel
      id="sound"
      num="07"
      title="Sound"
      theme="dark"
      question="Does it feel real?"
      className="panel--small-h"
      headline={['The same visual.', 'With and without sound.', 'Feel the difference.']}
      body={<p>Press Drop. Both cubes fall at exactly the same moment, with exactly the same animation. Only the right one has sound design.</p>}
      forYou={{
        text: 'Sound design gives weight, material and impact to what people see. A product shot with designed sound feels expensive; without it, it feels like a render.',
        uses: ['Product films', 'App sounds', 'Sonic logos'],
      }}
      actions={
        <>
          <PillButton icon="play" onClick={drop}>
            Drop
          </PillButton>
          {!on && <span className="snd-warn">Sound turns on when you press Drop.</span>}
        </>
      }
    >
      <div className="snd-boxes">
        <figure className="snd-box">
          <canvas ref={leftRef} />
          <figcaption>
            <b>Without sound</b>
            Looks flat.
          </figcaption>
        </figure>
        <figure className="snd-box snd-box--hot">
          <canvas ref={rightRef} />
          <div className="snd-layers">
            {LAYERS.map((l) => (
              <span key={l.id} className={lit.includes(l.id) ? 'is-on' : ''}>
                {l.label}
              </span>
            ))}
          </div>
          <figcaption>
            <b>With sound</b>
            Feels real.
          </figcaption>
        </figure>
      </div>
    </Panel>
  );
}
