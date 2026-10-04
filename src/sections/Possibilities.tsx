import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useInView, useLocalPointer } from '../motion/hooks';
import { damp, lerp, smoothstep } from '../motion/math';
import { scrollToId } from '../motion/scroll';
import { drawSphere } from '../motion/sprites';

/**
 * 12 — THE POSSIBILITIES
 * Stop teaching. One object multiplies into a system. Each application
 * is not a service — just another behaviour the same system can have.
 */
const APPS = [
  { id: 'Brand films', rings: 18, spread: 1, speed: 0.25, tilt: -0.5 },
  { id: 'Title sequences', rings: 30, spread: 0.55, speed: 0.6, tilt: -1.1 },
  { id: 'Product visuals', rings: 12, spread: 1.15, speed: 0.12, tilt: -0.2 },
  { id: 'Documentaries', rings: 8, spread: 1.3, speed: 0.06, tilt: -0.35 },
  { id: 'Interactive media', rings: 22, spread: 0.9, speed: 0.4, tilt: 0 },
  { id: 'Music visuals', rings: 26, spread: 1.05, speed: 0.9, tilt: -0.7 },
  { id: 'Spatial experiences', rings: 16, spread: 1.4, speed: 0.2, tilt: -1.4 },
  { id: 'Experimental work', rings: 34, spread: 0.75, speed: 1.3, tilt: -0.9 },
];

export function Possibilities() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ptr = useLocalPointer(wrapRef);
  const visible = useInView(wrapRef, { threshold: 0.3 });
  const [hover, setHover] = useState(0);
  const target = useRef(APPS[0]);
  const st = useRef({ grow: 0, rings: 18, spread: 1, speed: 0.25, tilt: -0.5, rot: 0, orbit: 0, trail: [] as { x: number; y: number }[] });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = st.current;
    const T = target.current;
    if (visible) s.grow = Math.min(1, s.grow + dt / 3.5);
    s.rings = damp(s.rings, T.rings, 3, dt);
    s.spread = damp(s.spread, T.spread, 3, dt);
    s.speed = damp(s.speed, T.speed, 3, dt);
    const tiltTarget = T.tilt + (ptr.current.inside ? ptr.current.x * 0.4 : 0);
    s.tilt = damp(s.tilt, tiltTarget, 3, dt);
    s.rot += dt * s.speed;
    s.orbit += dt * (0.35 + s.speed * 0.6);

    const cx = w * 0.5;
    const cy = h * 0.52;
    const R = Math.min(w, h) * 0.3 * lerp(0.05, 1, smoothstep(0, 0.5, s.grow));
    ctx.clearRect(0, 0, w, h);

    // the shell: rings multiplying
    const count = Math.max(1, Math.round(s.rings * smoothstep(0.1, 1, s.grow)));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(s.tilt);
    ctx.lineWidth = 1;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI + s.rot;
      ctx.strokeStyle = `rgba(240,238,232,${0.08 + 0.12 * Math.abs(Math.cos(a))})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, R * Math.abs(Math.cos(a)) * s.spread + 0.5, R, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // axis
    ctx.strokeStyle = 'rgba(240,238,232,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.45);
    ctx.lineTo(0, R * 1.45);
    ctx.stroke();
    ctx.restore();

    // inner light
    ctx.globalAlpha = 0.18 * s.grow;
    drawSphere(ctx, 'white', cx, cy, R * 0.55);
    ctx.globalAlpha = 1;

    // the original tiny object, now orbiting the system it created
    const oa = s.orbit;
    const ox = cx + Math.cos(oa) * R * 1.25;
    const oy = cy + Math.sin(oa) * R * 0.45 - Math.cos(oa) * R * 0.35;
    s.trail.unshift({ x: ox, y: oy });
    if (s.trail.length > 60) s.trail.pop();
    ctx.strokeStyle = 'rgba(255,110,60,0.5)';
    ctx.beginPath();
    s.trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    const or = lerp(4, 13, s.grow) * (0.8 + 0.2 * Math.sin(oa));
    ctx.globalAlpha = 0.8;
    drawSphere(ctx, 'glow', ox, oy, or * 3.5);
    ctx.globalAlpha = 1;
    drawSphere(ctx, 'orange', ox, oy, or);

    // satellites
    ctx.fillStyle = '#f0eee8';
    for (let i = 0; i < 40 * s.grow; i++) {
      const a = i * 2.399 + time * 0.05 * (i % 3);
      const rr = R * (1.6 + (i % 7) * 0.12);
      ctx.globalAlpha = 0.25;
      ctx.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  });

  return (
    <Panel
      id="possibilities"
      num="12"
      title="The possibilities"
      theme="night"
      headline={['This is just', 'the beginning.']}
      body={<p>What matters is not how much you can make move. It is what you make people feel.</p>}
      actions={
        <button className="next-link" onClick={() => scrollToId('final')}>
          Next <span>→</span>
        </button>
      }
      aside={
        <ul className="apps">
          {APPS.map((a, i) => (
            <li
              key={a.id}
              className={i === hover ? 'is-on' : ''}
              onPointerEnter={() => {
                setHover(i);
                target.current = a;
                audio.tone(330 * Math.pow(2, i / 8), 1.2, 0.03);
              }}
            >
              {a.id}
            </li>
          ))}
          <li className="apps-more">And more…</li>
        </ul>
      }
    >
      <div className="fill" ref={wrapRef}>
        <canvas className="fill" ref={canvasRef} />
      </div>
    </Panel>
  );
}
