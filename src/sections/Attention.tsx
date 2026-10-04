import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Chapter } from '../components/Chapter';
import { Slider } from '../components/Controls';
import { Reveal, Split } from '../components/Typography';
import { ENV } from '../motion/environments';
import { easeInOutCubic } from '../motion/easing';
import { useCanvasLoop } from '../motion/hooks';
import { clamp, damp, lerp, rand, smoothstep } from '../motion/math';
import { pointer } from '../motion/pointer';

/**
 * 01 — ATTENTION
 *
 * Hundreds of identical particles. One of them is not different in size or
 * colour — only in behaviour. It moves with intent. The eye finds it anyway.
 */
const C = ENV.paper;

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
}

const describe = (f: number) =>
  f < 0.2 ? 'Everything moves. Nothing leads.' : f < 0.7 ? 'One thing moves with intent.' : 'Everything else waits.';

export function Attention() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [focus, setFocus] = useState(0.45);
  const focusTarget = useRef(0.45);
  const stageRef = useRef(0);

  const sim = useRef({
    ps: [] as P[],
    w: 0,
    h: 0,
    f: 0.45,
    // the purposeful one
    from: { x: 0, y: 0 },
    to: { x: 0, y: 0 },
    t: 1,
    dur: 2,
    curve: 0,
    trail: [] as { x: number; y: number }[],
    sx: 0,
    sy: 0,
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = sim.current;
    if (s.w !== w || s.h !== h) {
      const n = Math.round(clamp((w * h) / 1900, 240, 720));
      s.ps = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), vx: 0, vy: 0, a: rand(0, Math.PI * 2) }));
      s.w = w;
      s.h = h;
      s.from = { x: w * 0.3, y: h * 0.5 };
      s.to = { ...s.from };
      s.sx = s.from.x;
      s.sy = s.from.y;
      s.t = 1;
    }
    s.f = damp(s.f, focusTarget.current, 5, dt);
    const f = s.f;

    const rect = canvasRef.current!.getBoundingClientRect();
    const px = pointer.x - rect.left;
    const py = pointer.y - rect.top;
    const R = 150;

    // ── the field: slow, aimless wandering. Focus quiets it.
    const fieldSpeed = lerp(24, 2.5, smoothstep(0, 1, f));
    const turn = lerp(2.6, 0.6, f);
    for (const p of s.ps) {
      p.a += (Math.random() - 0.5) * turn * dt * 6;
      p.vx = damp(p.vx, Math.cos(p.a) * fieldSpeed, 2, dt);
      p.vy = damp(p.vy, Math.sin(p.a) * fieldSpeed, 2, dt);
      const dx = p.x - px;
      const dy = p.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < R * R && d2 > 1) {
        const d = Math.sqrt(d2);
        const push = Math.pow(1 - d / R, 2) * 1400 * dt;
        p.vx += (dx / d) * push - (dy / d) * push * 0.35;
        p.vy += (dy / d) * push + (dx / d) * push * 0.35;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.x < -4) p.x += w + 8;
      if (p.x > w + 4) p.x -= w + 8;
      if (p.y < -4) p.y += h + 8;
      if (p.y > h + 4) p.y -= h + 8;
    }

    // ── the one: travels between decisions, with eased intent
    s.t += dt / s.dur;
    if (s.t >= 1) {
      s.from = { x: s.sx, y: s.sy };
      const ang = rand(0, Math.PI * 2);
      const dist = rand(0.18, 0.4) * Math.min(w, h * 1.6);
      s.to = {
        x: clamp(s.from.x + Math.cos(ang) * dist, w * 0.12, w * 0.88),
        y: clamp(s.from.y + Math.sin(ang) * dist, h * 0.15, h * 0.85),
      };
      s.curve = rand(-0.35, 0.35);
      s.dur = lerp(3.2, 1.15, f);
      s.t = 0;
      audio.tick(0.04 + f * 0.16, { pan: (s.from.x / w) * 1.6 - 0.8 });
    }
    const e = easeInOutCubic(s.t);
    const dx = s.to.x - s.from.x;
    const dy = s.to.y - s.from.y;
    const arc = Math.sin(Math.PI * e) * s.curve;
    const purposeX = s.from.x + dx * e - dy * arc;
    const purposeY = s.from.y + dy * e + dx * arc;
    // at zero focus it dissolves back into the crowd's behaviour
    const crowd = s.ps[0];
    const mix = smoothstep(0, 0.45, f);
    s.sx = lerp(crowd.x, purposeX, mix);
    s.sy = lerp(crowd.y, purposeY, mix);
    s.trail.unshift({ x: s.sx, y: s.sy });
    if (s.trail.length > 90) s.trail.pop();

    // ── draw
    ctx.clearRect(0, 0, w, h);
    const r = 1.6;
    ctx.fillStyle = C.fg;
    ctx.globalAlpha = lerp(0.72, 0.16, smoothstep(0.3, 1, f));
    ctx.beginPath();
    for (let i = 1; i < s.ps.length; i++) {
      const p = s.ps[i];
      ctx.moveTo(p.x + r, p.y);
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    }
    ctx.fill();

    // trail only appears once its motion is allowed to dominate
    const trailA = smoothstep(0.55, 1, f);
    if (trailA > 0) {
      ctx.strokeStyle = C.accent;
      ctx.lineCap = 'round';
      for (let i = 1; i < s.trail.length; i++) {
        ctx.globalAlpha = trailA * (1 - i / s.trail.length) * 0.6;
        ctx.lineWidth = lerp(2.5, 0.3, i / s.trail.length);
        ctx.beginPath();
        ctx.moveTo(s.trail[i - 1].x, s.trail[i - 1].y);
        ctx.lineTo(s.trail[i].x, s.trail[i].y);
        ctx.stroke();
      }
    }

    const hot = smoothstep(0.72, 1, f);
    ctx.globalAlpha = lerp(0.72, 1, mix);
    ctx.fillStyle = hot > 0.5 ? C.accent : C.fg;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, r + hot * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // realization: we mark what the eye already found
    if (stageRef.current >= 2) {
      const ring = 18 + Math.sin(time * 2.4) * 2;
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = C.fg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.sx + ring * 0.7, s.sy - ring * 0.7);
      ctx.lineTo(s.sx + 46, s.sy - 40);
      ctx.lineTo(s.sx + 120, s.sy - 40);
      ctx.stroke();
      ctx.fillStyle = C.fg;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.fillText('SAME SIZE. SAME COLOUR.', s.sx + 50, s.sy - 46);
      ctx.fillText('DIFFERENT MOTION.', s.sx + 50, s.sy - 28);
    }
    ctx.globalAlpha = 1;
  });

  return (
    <Chapter id="attention" env="paper" number="01" title="Attention" length={4.2} thresholds={[0.14, 0.34, 0.52, 0.7]}>
      {({ stage }) => {
        stageRef.current = stage;
        return (
          <div className="attention">
            <canvas className="fill-canvas" ref={canvasRef} data-cursor="disturb" />
            <div className="chapter-mark mono">
              <span>01</span>
              <span>Attention</span>
            </div>
            <div className="att-whisper">
              <Reveal show={stage === 1}>
                <em>Don't look for anything.</em>
              </Reveal>
              <Reveal show={stage === 2} className="att-whisper-2">
                <em>And yet, your eye found one.</em>
              </Reveal>
            </div>
            <div className={`att-principle ${stage >= 4 ? 'is-docked' : ''}`}>
              <h2 className="display">
                <Split text="MOTION DIRECTS" show={stage >= 3} stagger={24} />
                <br />
                <Split text="ATTENTION." show={stage >= 3} stagger={24} delay={320} />
              </h2>
              <Reveal show={stage >= 3} delay={700} className="body-small">
                Before motion communicates information,
              </Reveal>
              <Reveal show={stage >= 3} delay={800} className="body-small">
                it communicates priority.
              </Reveal>
            </div>
            <div className={`att-control panel ${stage >= 4 ? 'is-in' : ''}`}>
              <Slider
                name="Focus"
                value={focus}
                onChange={(v) => {
                  setFocus(v);
                  focusTarget.current = v;
                }}
                labels={['Low', 'Medium', 'Strong']}
              />
              <p className="att-desc mono">{describe(focus)}</p>
            </div>
          </div>
        );
      }}
    </Chapter>
  );
}
