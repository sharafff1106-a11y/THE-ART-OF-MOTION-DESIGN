import { useRef } from 'react';
import { audio } from '../audio/engine';
import { PillButton, Toggle } from '../components/Controls';
import { Panel } from '../components/Panel';
import { drawCube } from '../motion/cube';
import { useCanvasLoop, useSoundEnabled } from '../motion/hooks';
import { clamp, lerp, rand } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 07 — SOUND
 * The same fall, twice, on the same clock. The right window is heard:
 * a whoosh of air, a transient, a low body, debris, a tail.
 */
const HOLD = 0.6;
const FALL = 0.62;
const CYCLE = 3.4;

/** height above floor 0..1 for a given time in the cycle */
function heightAt(t: number) {
  if (t < HOLD) return 1;
  const f = t - HOLD;
  if (f < FALL) return 1 - Math.pow(f / FALL, 2);
  const b = f - FALL;
  const bounce = 0.32;
  if (b < bounce) return Math.sin((b / bounce) * Math.PI) * 0.06;
  return 0;
}

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
}

function useDrop(ref: React.RefObject<HTMLCanvasElement>, clock: React.MutableRefObject<number>, withSound: boolean, arm: React.MutableRefObject<number>) {
  const st = useRef({ lastT: 0, shards: [] as Shard[], flash: 0, shake: 0, wave: new Float32Array(120), wi: 0 });
  useCanvasLoop(ref, (ctx, w, h, dt) => {
    const s = st.current;
    const t = (((performance.now() / 1000 - clock.current) % CYCLE) + CYCLE) % CYCLE;
    const impactAt = HOLD + FALL;
    const crossed = (a: number) => (s.lastT < a && t >= a) || (s.lastT > t && t >= a);
    const floor = h * 0.74;
    const size = Math.min(w, h) * 0.2;
    const cx = w * 0.5;

    // the loop keeps playing visually; it is only heard after the visitor presses Drop
    const armed = performance.now() / 1000 < arm.current;
    if (withSound) {
      if (crossed(HOLD) && armed) audio.whoosh(FALL, 0.16);
      if (crossed(impactAt)) {
        if (armed) audio.impact(0.8, 0.95);
        s.flash = 1;
        s.shake = 1;
        for (let i = 0; i < 26; i++) {
          s.shards.push({ x: cx + rand(-size * 0.5, size * 0.5), y: floor - 4, vx: rand(-260, 260), vy: rand(-420, -80), r: rand(1.5, 4.5), life: 1 });
        }
      }
      if (crossed(impactAt + 0.32) && armed) audio.impact(0.6, 0.18);
    }
    s.lastT = t;

    const H = heightAt(t);
    const y = floor - size * 0.62 - H * h * 0.5;
    const falling = t > HOLD && t < impactAt;
    const sx = falling ? 0.94 : 1;
    const sy = falling ? 1.06 : t > impactAt && t < impactAt + 0.08 ? 0.9 : 1;

    s.flash *= Math.exp(-dt * 6);
    s.shake *= Math.exp(-dt * 9);
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (s.shake > 0.02) ctx.translate(rand(-1, 1) * s.shake * 6, rand(-1, 1) * s.shake * 4);

    // floor light
    if (withSound && s.flash > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = s.flash * 0.9;
      drawSphere(ctx, 'glow', cx, floor, size * 2.8);
      ctx.globalAlpha = s.flash * 0.35;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
    // floor
    const fg = ctx.createLinearGradient(0, floor, 0, h);
    fg.addColorStop(0, 'rgba(255,255,255,0.10)');
    fg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(0, floor, w, h - floor);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, floor + 2, size * lerp(0.75, 0.3, H), size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    drawCube(ctx, cx, y, size, 0.5, 0.75 + (1 - H) * 0.2, 0.05, [96, 96, 100], sx, sy);

    // debris
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
      p.life -= dt * 0.7;
      if (p.life <= 0) {
        s.shards.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = i % 3 ? '#9a9792' : '#ff8a4a';
      ctx.fillRect(p.x, p.y, p.r, p.r);
    }
    ctx.restore();

    // a strip showing what the ear receives
    s.wave[s.wi] = withSound ? clamp(s.flash * 1.2 + (falling ? (t - HOLD) / FALL * 0.25 : 0)) : 0;
    s.wi = (s.wi + 1) % s.wave.length;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = withSound ? '#ff7a3d' : 'rgba(255,255,255,0.25)';
    const n = s.wave.length;
    const bw = (w * 0.6) / n;
    for (let i = 0; i < n; i++) {
      const v = s.wave[(s.wi + i) % n];
      const hh = 1 + v * 26 * (0.5 + Math.random() * 0.5);
      ctx.fillRect(w * 0.2 + i * bw, h - 24 - hh / 2, Math.max(1, bw * 0.6), hh);
    }
    ctx.globalAlpha = 1;
  });
}

export function Sound() {
  const on = useSoundEnabled();
  const clock = useRef(0);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);
  const arm = useRef(0);
  useDrop(leftRef, clock, false, arm);
  useDrop(rightRef, clock, true, arm);
  return (
    <Panel
      id="sound"
      num="07"
      title="Sound"
      theme="dark"
      question="Does it feel real?"
      headline={['The same visual.', 'With and without sound.', 'Feel the difference.']}
      forYou={{
        text: 'Sound design gives weight, material and impact to what people see. A product shot with designed sound feels expensive; without it, it feels like a render.',
        uses: ['Product films', 'App sounds', 'Brand sonic logos'],
      }}
      className="panel--small-h"
      headerRight={<Toggle on={on} onChange={(v) => (v ? void audio.enable() : audio.disable())} labels={['Off', 'On']} />}
      body={!on ? <p className="snd-warn">Turn sound on, then press Drop.</p> : <p>Press Drop and listen to the right-hand side.</p>}
      actions={
        <PillButton
          onClick={() => {
            void audio.enable();
            clock.current = performance.now() / 1000;
            arm.current = clock.current + CYCLE - 0.2;
          }}
          icon="play"
        >
          Drop
        </PillButton>
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
          <figcaption>
            <b>With sound</b>
            Feels real.
          </figcaption>
        </figure>
      </div>
      <p className="snd-principle">Sound gives motion a body.</p>
    </Panel>
  );
}
