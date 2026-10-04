import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { PillButton } from '../components/Controls';
import { Panel } from '../components/Panel';
import { drawCube } from '../motion/cube';
import { useCanvasLoop, useInView } from '../motion/hooks';
import { clamp, lerp } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 11 — PROCESS
 * Not "make the object move". Idea → behaviour → perception.
 * Drag along the line and watch the same piece mature.
 */
const STEPS = [
  { id: 'Concept', note: 'What should people understand — and feel?' },
  { id: 'Exploration', note: 'Many possible forms. Most will be wrong.' },
  { id: 'Refinement', note: 'Remove everything that does not serve the idea.' },
  { id: 'Motion', note: 'Timing, weight and rhythm give it behaviour.' },
  { id: 'Sound', note: 'Sound gives the behaviour a body.' },
  { id: 'Final', note: 'An experience people remember.' },
];

export function Process() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const visible = useInView(wrapRef, { threshold: 0.4 });
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const auto = useRef<number | null>(null);
  const reveal = useRef(new Float32Array(STEPS.length));

  const go = (i: number) => {
    const n = clamp(Math.round(i), 0, STEPS.length - 1);
    if (n !== stepRef.current) audio.wood(1000 + n * 220, 0.18);
    stepRef.current = n;
    setStep(n);
  };
  const play = () => {
    if (auto.current) window.clearInterval(auto.current);
    go(0);
    let i = 0;
    auto.current = window.setInterval(() => {
      i++;
      if (i >= STEPS.length) {
        window.clearInterval(auto.current!);
        auto.current = null;
        return;
      }
      go(i);
    }, 1300);
  };
  useEffect(() => {
    if (visible && stepRef.current === 0) play();
    return () => {
      if (auto.current) window.clearInterval(auto.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    ctx.clearRect(0, 0, w, h);
    const n = STEPS.length;
    const gap = 10;
    const tw = (w - gap * (n - 1)) / n;
    const th = h;
    for (let i = 0; i < n; i++) {
      const target = i <= stepRef.current ? 1 : 0;
      reveal.current[i] = lerp(reveal.current[i], target, 1 - Math.exp(-6 * dt));
      const r = reveal.current[i];
      const x = i * (tw + gap);
      const cx = x + tw / 2;
      const cy = th / 2;
      const s = Math.min(tw, th) * 0.3;
      // tile
      ctx.fillStyle = i === n - 1 ? `rgba(255,120,70,${0.08 + r * 0.14})` : `rgba(20,20,20,${0.03 + r * 0.03})`;
      ctx.fillRect(x, 0, tw, th);
      if (i === stepRef.current) {
        ctx.strokeStyle = 'rgba(20,20,20,0.5)';
        ctx.strokeRect(x + 0.5, 0.5, tw - 1, th - 1);
      }
      ctx.globalAlpha = 0.2 + r * 0.8;
      const t = time * r;
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 1;
      if (i === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, s, 0, Math.PI * 2);
        ctx.stroke();
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI + t * 0.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.abs(Math.cos(a)) * s, s, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const ly of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.ellipse(cx, cy + ly * s, Math.sqrt(1 - ly * ly) * s, s * 0.12, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (i === 1) {
        const wob = Math.sin(t * 2) * 0.08;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1 + wob, 1 - wob);
        drawSphere(ctx, 'grey', 0, 0, s);
        ctx.restore();
      } else if (i === 2) {
        ctx.lineWidth = 2;
        for (let k = 0; k < 7; k++) {
          ctx.strokeStyle = `rgba(20,20,20,${0.2 + k * 0.1})`;
          ctx.beginPath();
          for (let u = 0; u <= 30; u++) {
            const px = cx - s + (u / 30) * s * 2;
            const py = cy + Math.sin(u * 0.32 + t * 1.5 + k * 0.25) * s * 0.4 + (k - 3) * 3;
            if (u) ctx.lineTo(px, py);
            else ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
      } else if (i === 3) {
        drawCube(ctx, cx, cy, s * 1.2, 0.5 + t * 0.4, t * 0.9, 0.2, [120, 120, 122]);
      } else if (i === 4) {
        ctx.fillStyle = '#141414';
        for (let k = -14; k <= 14; k++) {
          const a = Math.abs(Math.sin(k * 0.9 + t * 6)) * Math.exp(-Math.abs(k) / 8);
          const hh = 2 + a * s * 1.3;
          ctx.fillRect(cx + k * (s / 9), cy - hh / 2, 1.5, hh);
        }
      } else {
        ctx.globalAlpha = r;
        drawSphere(ctx, 'glow', cx, cy, s * 2.2);
        drawSphere(ctx, 'orange', cx, cy + Math.sin(t * 1.5) * 4, s);
      }
      ctx.globalAlpha = 1;
    }
  });

  const scrub = (clientX: number) => {
    if (auto.current) {
      window.clearInterval(auto.current);
      auto.current = null;
    }
    const r = trackRef.current!.getBoundingClientRect();
    go(clamp((clientX - r.left) / r.width) * (STEPS.length - 1));
  };

  return (
    <Panel
      id="process"
      num="11"
      title="Process"
      theme="paper"
      headline={['From a simple idea', 'to a full experience.']}
      body={
        <p className="pr-note" key={step}>
          <b>{STEPS[step].id}.</b> {STEPS[step].note}
        </p>
      }
      actions={<PillButton onClick={play}>Play process</PillButton>}
    >
      <div className="pr-stage" ref={wrapRef}>
        <div
          className="pr-track"
          ref={trackRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrub(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientX);
          }}
        >
          <div className="pr-line" />
          <div className="pr-fill" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
          {STEPS.map((s, i) => (
            <button key={s.id} className={`pr-step ${i <= step ? 'is-on' : ''}`} style={{ left: `${(i / (STEPS.length - 1)) * 100}%` }} onClick={() => go(i)}>
              <span>{s.id}</span>
              <i />
            </button>
          ))}
        </div>
        <canvas className="pr-canvas" ref={canvasRef} />
        <p className="pr-formula">
          Idea <span>→</span> Behaviour <span>→</span> Perception
        </p>
      </div>
    </Panel>
  );
}
