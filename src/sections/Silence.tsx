import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useInView } from '../motion/hooks';
import { clamp, lerp } from '../motion/math';

/**
 * 09 — SILENCE
 * After the noise: nothing. Almost no motion, no sound. A doorway of light.
 * Holding moves you towards it. One soft tone when you arrive.
 */
export function Silence() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useInView(wrapRef, { threshold: 0.55 });
  const [noticed, setNoticed] = useState(false);
  const [arrived, setArrived] = useState(false);
  const hold = useRef(false);
  const st = useRef({
    p: 0,
    bg: null as HTMLCanvasElement | null,
    bw: 0,
    bh: 0,
    arrived: false,
    motes: Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() })),
  });

  // give the visitor space, then acknowledge it
  useEffect(() => {
    if (!visible) return;
    audio.air(0);
    const id = window.setTimeout(() => setNoticed(true), 4200);
    return () => window.clearTimeout(id);
  }, [visible]);

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = st.current;
    const doorX = w * 0.56;
    const doorW = Math.min(w, h) * 0.11;
    const doorH = h * 0.44;
    const floorY = h * 0.7;
    const doorTop = floorY - doorH;

    if (!s.bg || s.bw !== w || s.bh !== h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d')!;
      g.fillStyle = '#060709';
      g.fillRect(0, 0, w, h);
      // vertical light streaks around the door
      for (let i = 0; i < 70; i++) {
        const x = doorX + (Math.random() - 0.5) * w * 0.55;
        const d = Math.abs(x - doorX) / (w * 0.3);
        const hh = doorH * (0.6 + Math.random() * 0.9) * (1 - d * 0.5);
        g.fillStyle = `rgba(190,205,230,${0.03 + Math.random() * 0.07 * (1 - d)})`;
        g.fillRect(x, floorY - hh, 1 + Math.random() * 3, hh);
      }
      // floor reflection
      const fl = g.createRadialGradient(doorX, floorY, 0, doorX, floorY, w * 0.5);
      fl.addColorStop(0, 'rgba(70,120,255,0.45)');
      fl.addColorStop(0.4, 'rgba(40,80,200,0.12)');
      fl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = fl;
      g.fillRect(0, floorY, w, h - floorY);
      g.fillStyle = 'rgba(120,160,255,0.35)';
      g.fillRect(0, floorY, w, 1);
      s.bg = c;
      s.bw = w;
      s.bh = h;
    }

    if (hold.current) s.p = clamp(s.p + dt * 0.12);
    if (s.p >= 1 && !s.arrived) {
      s.arrived = true;
      setArrived(true);
      audio.tone(392, 4, 0.06, { send: 0.8 });
    }

    ctx.drawImage(s.bg, 0, 0, w, h);
    // the door breathes, very slowly
    const breath = 0.85 + Math.sin(time * 0.5) * 0.08 + s.p * 0.3;
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(doorX, floorY - doorH * 0.45, 0, doorX, floorY - doorH * 0.45, doorH * lerp(1.1, 2.2, s.p));
    glow.addColorStop(0, `rgba(220,230,255,${0.35 * breath})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(250,250,255,${Math.min(1, 0.9 * breath)})`;
    ctx.fillRect(doorX - doorW / 2, doorTop, doorW, doorH);

    // light spill on the floor
    ctx.fillStyle = `rgba(240,240,255,${0.18 * breath})`;
    ctx.beginPath();
    ctx.moveTo(doorX - doorW / 2, floorY);
    ctx.lineTo(doorX + doorW / 2, floorY);
    ctx.lineTo(doorX + doorW * 2.4, h);
    ctx.lineTo(doorX - doorW * 2.4, h);
    ctx.closePath();
    ctx.fill();

    // motes, barely moving
    ctx.fillStyle = '#cfd8ff';
    for (const m of s.motes) {
      m.y -= dt * 0.004 * m.s;
      if (m.y < 0) m.y = 1;
      ctx.globalAlpha = 0.15 + 0.15 * Math.sin(time * 0.4 + m.x * 10);
      ctx.fillRect(m.x * w + Math.sin(time * 0.2 + m.y * 6) * 6, m.y * h, 1.4, 1.4);
    }
    ctx.globalAlpha = 1;

    // the figure walks into the light
    const e = s.p * s.p * (3 - 2 * s.p);
    const fx = lerp(doorX - doorW * 0.1, doorX, e);
    const fy = lerp(h * 0.92, floorY - 2, e);
    const fs = lerp(1, 0.32, e) * h * 0.075;
    const fade = 1 - clamp((s.p - 0.9) / 0.1);
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.beginPath();
    ctx.arc(fx, fy - fs * 1.85, fs * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(fx - fs * 0.22, fy - fs * 1.6, fs * 0.44, fs * 1.6, fs * 0.15);
    ctx.fill();
  });

  return (
    <Panel
      id="silence"
      num="09"
      title="Silence"
      theme="night"
      headline={['Silence is also', 'a design tool.']}
      body={
        <>
          <p className={`sl-noticed ${noticed ? 'is-on' : ''}`}>You noticed it.</p>
          <p className="sl-small">
            Take a moment.
            <br />
            Let it breathe.
          </p>
        </>
      }
    >
      <div
        className="fill sl-stage"
        ref={wrapRef}
        onPointerDown={() => (hold.current = true)}
        onPointerUp={() => (hold.current = false)}
        onPointerLeave={() => (hold.current = false)}
        onPointerCancel={() => (hold.current = false)}
      >
        <canvas className="fill" ref={canvasRef} />
        <p className={`sl-hint ${arrived ? 'is-off' : ''}`}>Press and hold to step into the light</p>
      </div>
    </Panel>
  );
}
