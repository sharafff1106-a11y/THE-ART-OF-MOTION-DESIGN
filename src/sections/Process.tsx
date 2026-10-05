import { useEffect, useRef, useState } from 'react';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useInView } from '../motion/hooks';
import { drawHeadphones, drawSub, serif } from '../motion/kora';

/**
 * 11 — PROCESS
 * One KORA frame, six stages. The client sees exactly what they will get
 * at each step, and where they approve.
 */
const STEPS = [
  { id: 'brief', label: 'Brief', line: 'We agree on the goal and the feeling.' },
  { id: 'sketch', label: 'Sketch', line: 'Rough ideas, fast. Nothing is precious yet.' },
  { id: 'style', label: 'Styleframe', line: 'The final look, as a still. You approve it.' },
  { id: 'anim', label: 'Animation', line: 'Now it moves: timing, weight, rhythm.' },
  { id: 'sound', label: 'Sound', line: 'Sound designed together with the motion.' },
  { id: 'deliver', label: 'Delivery', line: 'Every format you need, ready to post.' },
];

function finalFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number, moving: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#1d1a17');
  g.addColorStop(1, '#0b0a09');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const cx = x + w / 2;
  const cy = y + h * 0.48;
  if (moving) {
    for (let i = 0; i < 3; i++) {
      const k = ((time * 0.5 + i / 3) % 1);
      ctx.strokeStyle = `rgba(255,90,31,${(1 - k) * 0.5})`;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * (0.18 + k * 0.4), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const fy = moving ? Math.sin(time * 1.6) * h * 0.02 : 0;
  drawHeadphones(ctx, cx, cy + fy, Math.min(w, h) * 0.34);
  ctx.fillStyle = '#efe9df';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = serif(Math.min(w, h) * 0.12);
  ctx.fillText('KORA', cx, y + h * 0.17);
  ctx.restore();
}

export function Process() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useInView(wrapRef, { threshold: 0.4 });
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const auto = useRef(true);
  stepRef.current = step;

  // walks itself through the steps until the visitor takes over
  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      if (auto.current) setStep((s) => (s + 1) % STEPS.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [visible]);

  useCanvasLoop(canvasRef, (ctx, w, h, _dt, time) => {
    const sId = STEPS[stepRef.current].id;
    if (sId === 'brief' || sId === 'sketch') {
      ctx.fillStyle = '#f3eee5';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(60,50,40,0.08)';
      for (let y = 24; y < h; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }
    if (sId === 'brief') {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-0.03);
      ctx.fillStyle = '#ffe58a';
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 20;
      ctx.fillRect(-h * 0.42, -h * 0.3, h * 0.84, h * 0.6);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#3a2f1c';
      ctx.textAlign = 'left';
      ctx.font = serif(h * 0.07, true);
      ['Launch KORA.', 'Feel: calm, premium.', 'For: city commuters.'].forEach((l, i) => ctx.fillText(l, -h * 0.34, -h * 0.13 + i * h * 0.12));
      ctx.restore();
    } else if (sId === 'sketch') {
      // pencil: the same composition drawn roughly, a few wobbly passes
      ctx.strokeStyle = 'rgba(40,36,32,0.55)';
      ctx.lineWidth = 1.4;
      const cx = w / 2;
      const cy = h * 0.48;
      const s = h * 0.34;
      for (let pass = 0; pass < 3; pass++) {
        const j = (k: number) => Math.sin(k * 12.9898 + pass * 78.233) * 3;
        ctx.beginPath();
        ctx.arc(cx + j(1), cy + j(2), s * 0.5 + j(3), Math.PI, 0);
        ctx.stroke();
        for (const side of [-1, 1]) {
          ctx.strokeRect(cx + side * s * 0.5 - s * 0.135 + j(side + 4), cy - s * 0.11 + j(side + 6), s * 0.27, s * 0.44);
        }
      }
      ctx.font = serif(h * 0.12);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(40,36,32,0.5)';
      ctx.fillText('KORA?', cx, h * 0.18);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(40,36,32,0.18)';
      [1, 2].forEach((k) => {
        ctx.beginPath();
        ctx.moveTo((w * k) / 3, 0);
        ctx.lineTo((w * k) / 3, h);
        ctx.moveTo(0, (h * k) / 3);
        ctx.lineTo(w, (h * k) / 3);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    } else if (sId === 'style') {
      finalFrame(ctx, 0, 0, w, h, time, false);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `600 ${Math.max(9, h * 0.028)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('STILL FRAME · FOR APPROVAL', 16, 24);
    } else if (sId === 'anim') {
      finalFrame(ctx, 0, 0, w, h, time, true);
    } else if (sId === 'sound') {
      finalFrame(ctx, 0, 0, w, h, time, true);
      ctx.fillStyle = '#ff7a3d';
      for (let i = 0; i < 80; i++) {
        const v = Math.abs(Math.sin(i * 0.7 + time * 6) * Math.sin(i * 0.13 + time));
        const bh = 2 + v * h * 0.08;
        ctx.fillRect(w * 0.1 + i * (w * 0.8) / 80, h * 0.78 - bh / 2, 2, bh);
      }
      drawSub(ctx, w, h, Math.sin(time * 1.6) > 0 ? '[ air ]' : '[ soft impact ]');
    } else {
      ctx.fillStyle = '#e9e4dc';
      ctx.fillRect(0, 0, w, h);
      const gap = w * 0.04;
      const H = h * 0.62;
      const sizes = [
        { lw: (H * 16) / 9, lh: H, label: '16:9' },
        { lw: (H * 9) / 16, lh: H, label: '9:16' },
        { lw: H, lh: H, label: '1:1' },
      ];
      const scale = Math.min(1, (w * 0.9 - gap * 2) / sizes.reduce((a, b) => a + b.lw, 0));
      let x = (w - (sizes.reduce((a, b) => a + b.lw, 0) * scale + gap * 2)) / 2;
      for (const f of sizes) {
        const fw = f.lw * scale;
        const fh = f.lh * scale;
        const fy = (h - fh) / 2 - 8;
        finalFrame(ctx, x, fy, fw, fh, time, true);
        ctx.fillStyle = '#3a342c';
        ctx.font = `600 ${Math.max(9, h * 0.03)}px "IBM Plex Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(f.label, x + fw / 2, fy + fh + 18);
        x += fw + gap;
      }
    }
  });

  return (
    <Panel id="process" num="11" title="Process" theme="paper" headline={['From idea', 'to film.']} body={<p>Six steps. You approve at every stage.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        tone="light"
        caption={<span className="mon-word" key={step}>{STEPS[step].line}</span>}
        controls={
          <Segment
            boxed
            options={STEPS.map((s) => ({ id: s.id, label: s.label }))}
            value={STEPS[step].id}
            onChange={(id) => {
              auto.current = false;
              setStep(STEPS.findIndex((s) => s.id === id));
            }}
          />
        }
      />
    </Panel>
  );
}
