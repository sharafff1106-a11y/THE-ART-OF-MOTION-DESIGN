import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Chapter } from '../components/Chapter';
import { Choice } from '../components/Controls';
import { Reveal, Split } from '../components/Typography';
import { ENV } from '../motion/environments';
import { useCanvasLoop } from '../motion/hooks';
import { clamp, damp, lerp, rand } from '../motion/math';
import { MASS, MassPreset } from '../motion/physics';

/**
 * 03 — WEIGHT
 *
 * The object never changes size, shape or colour. Only acceleration,
 * inertia, collision and sound change. Heavy things barely deform —
 * instead, the world reacts to them.
 */
const C = ENV.charcoal;
const RADIUS = 46;

export function Weight() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const [massId, setMassId] = useState('weightless');
  const [touched, setTouched] = useState(0);
  const preset = useRef<MassPreset>(MASS[0]);
  const touchedRef = useRef(0);
  touchedRef.current = touched;

  const sim = useRef({
    init: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    drag: false,
    tx: 0,
    ty: 0,
    squash: 0,
    squashV: 0,
    shake: 0,
    shakeT: 0,
    lastImpact: 0,
    ripples: [] as { x: number; a: number; t: number }[],
    dust: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    w: 0,
    h: 0,
  });

  const floorY = (h: number) => h * 0.74;

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = sim.current;
    const m = preset.current;
    s.w = w;
    s.h = h;
    const floor = floorY(h);
    if (!s.init) {
      s.x = w * 0.5;
      s.y = h * 0.42;
      s.init = true;
    }

    // ── physics, two substeps for stable collisions
    const steps = 2;
    const h2 = dt / steps;
    for (let k = 0; k < steps; k++) {
      if (s.drag) {
        // the hand pulls through a spring — mass decides how eagerly it follows
        s.vx += ((s.tx - s.x) * m.stiffness - s.vx * m.damping) * h2;
        s.vy += ((s.ty - s.y) * m.stiffness - s.vy * m.damping) * h2;
      } else {
        s.vy += m.gravity * h2;
        if (m.gravity === 0) {
          // weightless: a faint drift, never quite still
          s.vx += Math.cos(time * 0.7) * 6 * h2;
          s.vy += Math.sin(time * 0.9) * 6 * h2;
        }
        const air = Math.exp(-m.drag * h2);
        s.vx *= air;
        s.vy *= air;
      }
      s.x += s.vx * h2;
      s.y += s.vy * h2;

      // floor
      if (s.y + RADIUS > floor) {
        s.y = floor - RADIUS;
        if (s.vy > 0) {
          const impact = s.vy;
          const strength = clamp(impact / 2600);
          if (impact > 90) {
            audio.impact(m.mass, strength, { pan: (s.x / w) * 1.6 - 0.8 });
            s.squashV -= strength * m.squash * 22;
            s.shake = Math.max(s.shake, strength * m.shake);
            s.lastImpact = strength;
            if (m.mass > 0.3) s.ripples.push({ x: s.x, a: strength * m.mass * 18, t: 0 });
            if (m.mass > 0.6) {
              const n = Math.round(strength * 40 * m.mass);
              for (let i = 0; i < n; i++) {
                const dir = Math.random() < 0.5 ? -1 : 1;
                s.dust.push({ x: s.x + dir * rand(10, RADIUS), y: floor, vx: dir * rand(60, 420) * strength, vy: -rand(40, 320) * strength, life: 1 });
              }
            }
          }
          s.vy = -impact * m.restitution;
          if (Math.abs(s.vy) < 40) s.vy = 0;
        }
        s.vx *= Math.exp(-m.friction * h2);
      }
      // ceiling and walls
      if (s.y - RADIUS < 0) {
        s.y = RADIUS;
        s.vy = Math.abs(s.vy) * m.restitution;
      }
      for (const side of [-1, 1]) {
        const edge = side < 0 ? RADIUS : w - RADIUS;
        if ((side < 0 && s.x < edge) || (side > 0 && s.x > edge)) {
          s.x = edge;
          const impact = Math.abs(s.vx);
          if (impact > 140) {
            audio.impact(m.mass, clamp(impact / 3000) * 0.8, { pan: side * 0.9 });
            s.shake = Math.max(s.shake, clamp(impact / 3000) * m.shake * 0.6);
          }
          s.vx = -s.vx * m.restitution;
        }
      }
    }
    s.rot += (s.vx * dt) / RADIUS;

    // squash spring (the object's own deformation)
    s.squashV += (-s.squash * 520 - s.squashV * 18) * dt;
    s.squash += s.squashV * dt;
    s.shake = damp(s.shake, 0, 7, dt);
    s.shakeT += dt * 60;

    // ── draw
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (s.shake > 0.1) ctx.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake * 0.7);

    // floor with ripple displacement
    ctx.strokeStyle = C.fg;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -20; x <= w + 20; x += 6) {
      let y = floor;
      for (const r of s.ripples) {
        const d = Math.abs(x - r.x);
        const wave = d - r.t * 900;
        if (wave < 0) y += Math.sin(wave * 0.04) * r.a * Math.exp(-d / 420) * Math.exp(-r.t * 3);
      }
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let i = s.ripples.length - 1; i >= 0; i--) {
      s.ripples[i].t += dt;
      if (s.ripples[i].t > 1.6) s.ripples.splice(i, 1);
    }

    // ruler ticks
    ctx.globalAlpha = 0.25;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, floor + 8);
      ctx.lineTo(x, floor + (x % 120 === 0 ? 18 : 12));
      ctx.stroke();
    }

    // dust
    ctx.fillStyle = C.fg;
    for (let i = s.dust.length - 1; i >= 0; i--) {
      const d = s.dust[i];
      d.vy += 900 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.exp(-2 * dt);
      if (d.y > floor) {
        d.y = floor;
        d.vy *= -0.2;
      }
      d.life -= dt * 0.9;
      if (d.life <= 0) {
        s.dust.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = d.life * 0.6;
      ctx.fillRect(d.x, d.y - 1, 1.6, 1.6);
    }

    // shadow — distance from the floor
    const height = clamp((floor - RADIUS - s.y) / (h * 0.6));
    ctx.globalAlpha = lerp(0.42, 0.06, height);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(s.x, floor + 2, RADIUS * lerp(1.05, 0.5, height), RADIUS * lerp(0.16, 0.08, height), 0, 0, Math.PI * 2);
    ctx.fill();

    // the object
    const sq = clamp(s.squash, -0.5, 0.5);
    ctx.save();
    ctx.translate(s.x, s.y + RADIUS * -sq * 0.5);
    ctx.scale(1 - sq, 1 + sq);
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(-RADIUS * 0.35, -RADIUS * 0.4, RADIUS * 0.1, 0, 0, RADIUS * 1.1);
    g.addColorStop(0, '#f4efe6');
    g.addColorStop(0.55, '#b9b3a8');
    g.addColorStop(1, '#4c4a45');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, RADIUS, 0, Math.PI * 2);
    ctx.fill();
    // a meridian so rotation is readable
    ctx.rotate(s.rot);
    ctx.strokeStyle = 'rgba(28,28,26,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, RADIUS * 0.32, RADIUS, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.restore();

    // a quiet invitation
    if (!s.drag && touchedRef.current === 0) {
      ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.2;
      ctx.fillStyle = C.fg;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DRAG IT', s.x, s.y - RADIUS - 18);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    if (readoutRef.current) {
      readoutRef.current.textContent = `MASS ${m.kg} KG   ·   VELOCITY ${Math.round(Math.hypot(s.vx, s.vy))
        .toString()
        .padStart(4, '0')} PX/S   ·   LAST IMPACT ${s.lastImpact.toFixed(2)}`;
    }
  });

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (Math.hypot(x - s.x, y - s.y) < RADIUS * 1.8) {
      e.currentTarget.setPointerCapture(e.pointerId);
      s.drag = true;
      s.tx = x;
      s.ty = Math.min(y, floorY(s.h) - RADIUS);
      setTouched((t) => t + 1);
      audio.click(lerp(3200, 500, preset.current.mass), 0.08);
    }
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = sim.current;
    if (!s.drag) return;
    const r = e.currentTarget.getBoundingClientRect();
    s.tx = e.clientX - r.left;
    s.ty = Math.min(e.clientY - r.top, floorY(s.h) - RADIUS);
  };
  const onUp = () => {
    sim.current.drag = false;
  };

  return (
    <Chapter id="weight" env="charcoal" number="03" title="Weight" length={4} thresholds={[0.12, 0.36, 0.6]}>
      {({ stage }) => {
        const showControls = stage >= 2 || touched >= 2;
        const showPrinciple = stage >= 3 && touched >= 1;
        return (
          <div className="weight">
            <canvas
              className="fill-canvas"
              ref={canvasRef}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              data-cursor="grab"
              style={{ touchAction: 'pan-y' }}
            />
            <div className="chapter-mark mono">
              <span>03</span>
              <span>Weight</span>
            </div>
            <div className="wt-intro">
              <Reveal show={stage >= 1}>
                <em>Same size. Same shape.</em>
              </Reveal>
              <Reveal show={stage >= 1} delay={160}>
                <em>Throw it.</em>
              </Reveal>
            </div>
            <div className={`wt-controls ${showControls ? 'is-in' : ''}`}>
              <Choice
                options={MASS.map((p) => ({ id: p.id, label: p.label }))}
                value={massId}
                onChange={(id) => {
                  setMassId(id);
                  preset.current = MASS.find((p) => p.id === id)!;
                }}
              />
              <div className="wt-readout mono" ref={readoutRef} />
            </div>
            <div className={`wt-principle ${showPrinciple ? 'is-in' : ''}`}>
              <h2 className="display">
                <Split text="WEIGHT IS NOT VISIBLE." show={showPrinciple} stagger={20} />
              </h2>
              <h2 className="display display--italic">
                <Split text="Weight is felt." show={showPrinciple} stagger={40} delay={900} />
              </h2>
            </div>
          </div>
        );
      }}
    </Chapter>
  );
}
