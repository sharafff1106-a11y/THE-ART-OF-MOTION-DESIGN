import { useRef, useState } from 'react';
import gsap from 'gsap';
import { audio } from '../audio/engine';
import { PillButton, Slider, Toggle, TryPanel, TryRow } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useLocalPointer } from '../motion/hooks';
import { damp, lerp } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 02 — ATTENTION
 * A flock of spheres travels a loop in depth. One orange sphere leads with
 * intent. Focus quiets everything else; attraction lets the visitor steal
 * the attention with their own cursor.
 */
const FLOW = 64;
const DUST = 46;

export function Attention() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptr = useLocalPointer(wrapRef);
  const [noise, setNoise] = useState(false);
  const [speed, setSpeed] = useState(0.45);
  const [focus, setFocus] = useState(0.55);
  const [attract, setAttract] = useState(0.25);
  const params = useRef({ noise: 0, speed: 0.45, focus: 0.55, attract: 0.25 });
  params.current.speed = speed;
  params.current.focus = focus;
  params.current.attract = attract;

  const sim = useRef({
    t: 0,
    lead: 0,
    leadV: 0,
    noiseAmt: 0,
    f: 0.55,
    lastFront: 0,
    dust: Array.from({ length: DUST }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.4, a: Math.random() * 6.28 })),
    flow: Array.from({ length: FLOW }, (_, i) => ({ o: i / FLOW + Math.random() * 0.01, s: 0.5 + Math.random() * 0.9, jx: 0, jy: 0, px: 0, py: 0, init: false })),
    trail: [] as { x: number; y: number }[],
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = sim.current;
    const P = params.current;
    s.noiseAmt = damp(s.noiseAmt, noise ? 1 : 0, 4, dt);
    s.f = damp(s.f, P.focus, 5, dt);
    s.t += dt * lerp(0.02, 0.16, P.speed);

    // the leader moves with intent: it surges and rests
    const surge = 0.5 + 0.5 * Math.sin(time * 1.3);
    s.leadV = lerp(0.04, 0.3, P.speed) * (0.35 + surge * 1.1);
    s.lead += dt * s.leadV;

    const cx = w * 0.56;
    const cy = h * 0.5;
    const rx = Math.min(w * 0.34, h * 0.62);
    const ry = Math.min(h * 0.36, w * 0.3);
    const tilt = -0.32;
    const loop = (u: number) => {
      const a = u * Math.PI * 2;
      const x0 = Math.cos(a) * rx;
      const y0 = Math.sin(a) * ry * 0.62;
      const z = Math.sin(a); // depth: -1 back, +1 front
      return {
        x: cx + x0 * Math.cos(tilt) - y0 * Math.sin(tilt),
        y: cy + x0 * Math.sin(tilt) + y0 * Math.cos(tilt) + Math.cos(a * 2 + time * 0.3) * 18,
        z,
      };
    };

    ctx.clearRect(0, 0, w, h);

    // dust
    ctx.fillStyle = '#141414';
    for (const d of s.dust) {
      d.a += dt * (0.2 + s.noiseAmt * 2);
      const nx = Math.cos(d.a) * 6 * (1 + s.noiseAmt * 4);
      const ny = Math.sin(d.a * 1.3) * 6 * (1 + s.noiseAmt * 4);
      ctx.globalAlpha = lerp(0.55, 0.12, s.f);
      ctx.beginPath();
      ctx.arc(d.x * w + nx, d.y * h + ny, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // flow
    const items: { x: number; y: number; r: number; z: number }[] = [];
    for (const p of s.flow) {
      const u = p.o + s.t * p.s * 0.6;
      const q = loop(u % 1);
      let x = q.x;
      let y = q.y;
      if (s.noiseAmt > 0.01) {
        p.jx = damp(p.jx, (Math.random() - 0.5) * 60, 8, dt);
        p.jy = damp(p.jy, (Math.random() - 0.5) * 60, 8, dt);
        x += p.jx * s.noiseAmt;
        y += p.jy * s.noiseAmt;
      }
      if (ptr.current.inside && P.attract > 0.01) {
        const dx = ptr.current.px - x;
        const dy = ptr.current.py - y;
        const d = Math.hypot(dx, dy);
        const pull = P.attract * Math.exp(-d / 260) * 0.65;
        x += dx * pull;
        y += dy * pull;
      }
      if (!p.init) {
        p.px = x;
        p.py = y;
        p.init = true;
      }
      p.px = damp(p.px, x, 10, dt);
      p.py = damp(p.py, y, 10, dt);
      const r = lerp(3, 15, (q.z + 1) / 2) * lerp(1, 0.75, s.f);
      items.push({ x: p.px, y: p.py, r, z: q.z });
    }
    items.sort((a, b) => a.z - b.z);

    const lu = s.lead % 1;
    const L = loop(lu);
    const lr = lerp(14, 30, (L.z + 1) / 2) * lerp(0.9, 1.25, s.f);

    // leader trail
    s.trail.unshift({ x: L.x, y: L.y });
    if (s.trail.length > 70) s.trail.pop();
    ctx.strokeStyle = '#141414';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    s.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();

    let leaderDrawn = false;
    const drawLeader = () => {
      ctx.globalAlpha = 0.35 + s.f * 0.65;
      drawSphere(ctx, 'glow', L.x, L.y, lr * lerp(2.2, 4.2, s.f));
      ctx.globalAlpha = 1;
      drawSphere(ctx, 'orange', L.x, L.y, lr);
      leaderDrawn = true;
    };
    for (const it of items) {
      if (!leaderDrawn && it.z > L.z) drawLeader();
      ctx.globalAlpha = lerp(1, 0.28, s.f) * lerp(0.55, 1, (it.z + 1) / 2);
      drawSphere(ctx, 'black', it.x, it.y, it.r);
    }
    if (!leaderDrawn) drawLeader();
    ctx.globalAlpha = 1;

    // you hear the leader as it passes closest to you
    const front = L.z > 0.98 ? 1 : 0;
    if (front && !s.lastFront) audio.wood(1300, 0.12 + s.f * 0.2, { pan: (L.x / w) * 1.6 - 0.8 });
    s.lastFront = front;
  });

  const playDemo = () => {
    const o = { f: 0, a: 0 };
    gsap
      .timeline()
      .to(o, { f: 0, a: 0, duration: 0.01, onComplete: () => setNoise(true) })
      .to(o, { f: 1, duration: 2.6, ease: 'power2.inOut', onUpdate: () => setFocus(o.f), onStart: () => setNoise(false) }, '+=1.4')
      .to(o, { a: 1, duration: 1.4, ease: 'power2.out', onUpdate: () => setAttract(o.a) }, '+=0.8')
      .to(o, { f: 0.55, a: 0.25, duration: 1.6, ease: 'power2.inOut', onUpdate: () => (setFocus(o.f), setAttract(o.a)) }, '+=1.6');
  };

  return (
    <Panel
      id="attention"
      num="02"
      title="Attention"
      theme="paper"
      headline={['Motion', 'Directs', 'Attention.']}
      body={<p>It guides the eye, creates hierarchy and helps the important feel important.</p>}
      actions={<PillButton onClick={playDemo}>Play demo</PillButton>}
      aside={
        <TryPanel>
          <TryRow label="Add noise">
            <Toggle on={noise} onChange={setNoise} />
          </TryRow>
          <TryRow label="Speed">
            <Slider value={speed} onChange={setSpeed} />
          </TryRow>
          <TryRow label="Focus">
            <Slider value={focus} onChange={setFocus} />
          </TryRow>
          <TryRow label="Attraction">
            <Slider value={attract} onChange={setAttract} />
          </TryRow>
          <p className="try-note">Move your cursor over the field to pull the crowd.</p>
        </TryPanel>
      }
    >
      <div className="fill" ref={wrapRef}>
        <canvas className="fill" ref={canvasRef} />
      </div>
    </Panel>
  );
}

