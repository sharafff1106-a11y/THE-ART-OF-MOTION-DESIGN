import { CSSProperties, useRef, useState } from 'react';
import { RadioList } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop } from '../motion/hooks';
import { damp } from '../motion/math';
import { EMOTIONS, EmotionId } from './emotions';

/**
 * 08 — EMOTION
 * One soft form. Only its behaviour changes: speed, amplitude, rhythm,
 * colour, height and sound. Drawn in 2D so it runs on every device.
 */
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgba = (c: number[], a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const N = 120;

export function Emotion() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emotion, setEmotion] = useState<EmotionId>('powerful');
  const emotionRef = useRef<EmotionId>('powerful');
  const e = EMOTIONS[emotion];
  const st = useRef({
    t: 0,
    clock: 0,
    speed: 0.7,
    amp: 0.26,
    freq: 1.4,
    scale: 1,
    y: 0,
    rot: 0.2,
    angle: 0,
    gloss: 0.6,
    cols: EMOTIONS.powerful.colors.map(hex),
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt) => {
    const s = st.current;
    const E = EMOTIONS[emotionRef.current];
    s.clock += dt;
    s.speed = damp(s.speed, E.speed, 3, dt);
    s.amp = damp(s.amp, E.amp, 3, dt);
    s.freq = damp(s.freq, E.freq, 3, dt);
    s.scale = damp(s.scale, E.scale, 3, dt);
    s.y = damp(s.y, E.y, 2, dt);
    s.rot = damp(s.rot, E.rot, 3, dt);
    s.gloss = damp(s.gloss, E.gloss, 3, dt);
    E.colors.forEach((c, i) => {
      const t = hex(c);
      s.cols[i] = s.cols[i].map((v, k) => damp(v, t[k], 3, dt));
    });
    s.t += dt * s.speed;
    s.angle += dt * s.rot;

    let R = Math.min(w, h) * 0.3 * s.scale;
    if (E.pulse) R *= 1 + Math.pow(Math.max(0, Math.sin(s.clock * Math.PI * E.pulse)), 12) * 0.07;
    let cx = w / 2;
    let cy = h * 0.47 - s.y * R * 0.9;
    if (E.jitter) {
      cx += (Math.random() - 0.5) * E.jitter * R;
      cy += (Math.random() - 0.5) * E.jitter * R;
    }
    if (E.bounce) cy -= Math.abs(Math.sin(s.clock * 3)) * E.bounce * R * 0.6;
    cy += Math.sin(s.clock * 0.8) * R * 0.02;

    // the outline: a circle disturbed by layered waves
    const lobes = 2 + s.freq * 1.6;
    const pts: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const n =
        Math.sin(a * Math.round(lobes) + s.t * 1.7 + s.angle) * 0.5 +
        Math.sin(a * Math.round(lobes * 1.7 + 1) - s.t * 1.3) * 0.3 +
        Math.sin(a * 2 + s.t * 0.9) * 0.4;
      const r = R * (1 + s.amp * 0.55 * n);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    const path = new Path2D();
    pts.forEach(([x, y], i) => {
      const [nx, ny] = pts[(i + 1) % N];
      const mx = (x + nx) / 2;
      const my = (y + ny) / 2;
      if (i === 0) path.moveTo(mx, my);
      else path.quadraticCurveTo(x, y, mx, my);
    });
    path.closePath();

    ctx.clearRect(0, 0, w, h);
    // soft light behind the form
    const halo = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 1.9);
    halo.addColorStop(0, rgba(s.cols[0], 0.22));
    halo.addColorStop(1, rgba(s.cols[0], 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);
    // ground shadow
    ctx.fillStyle = 'rgba(20,18,16,0.10)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.47 + R * 1.25, R * 0.8, R * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.clip(path);
    ctx.fillStyle = rgba(s.cols[1]);
    ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    // colour fields drift inside the form
    const fields: [number[], number, number][] = [
      [s.cols[0], s.angle, 0.85],
      [s.cols[2], s.angle + 2.4, 0.7],
      [s.cols[0], -s.angle * 0.7 + 4, 0.55],
    ];
    for (const [c, a, k] of fields) {
      const fx = cx + Math.cos(a + s.t * 0.4) * R * 0.55;
      const fy = cy + Math.sin(a * 1.2 + s.t * 0.3) * R * 0.5;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 1.1 * k + R * 0.3);
      g.addColorStop(0, rgba(c, 0.95));
      g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    }
    // rim and gloss
    const rim = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.3);
    rim.addColorStop(0, 'rgba(0,0,0,0)');
    rim.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = rim;
    ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    const gl = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, 0, cx - R * 0.35, cy - R * 0.4, R * 0.55);
    gl.addColorStop(0, `rgba(255,255,255,${Math.min(0.85, 0.25 + s.gloss * 0.4)})`);
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    ctx.restore();
  });

  return (
    <Panel
      id="emotion"
      num="08"
      title="Emotion"
      theme="paper"
      question="What should people feel?"
      headline={['The same shape.', 'Different feeling.']}
      body={<p>Pick a feeling. The shape never changes. Only its speed, movement, colour and sound do. That is exactly what happens to a product in a film.</p>}
      forYou={{
        text: 'Before anyone reads a word, motion and sound tell your customer how to feel about your product: calm, premium, exciting or trustworthy. I design that feeling on purpose.',
      }}
      aside={
        <RadioList
          options={(Object.keys(EMOTIONS) as EmotionId[]).map((id) => ({ id, label: EMOTIONS[id].label }))}
          value={emotion}
          onChange={(id) => {
            setEmotion(id);
            emotionRef.current = id;
            EMOTIONS[id].sound();
          }}
        />
      }
    >
      <div className="em-stage" style={{ '--em-light': e.light } as CSSProperties}>
        <canvas className="em-canvas" ref={canvasRef} />
        <div className="em-card" key={emotion}>
          <p className="em-feel">{e.label}</p>
          <p className="em-line">{e.line}</p>
          <div className="em-row">
            <span>Use it for</span>
            <ul>
              {e.uses.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
          <div className="em-row">
            <span>How it's made</span>
            <p>{e.recipe}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
