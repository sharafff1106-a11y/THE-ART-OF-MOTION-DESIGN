import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { PillButton, Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { TIMING, TimingPreset } from '../motion/easing';
import { useCanvasLoop } from '../motion/hooks';
import { clamp, lerp } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 03 — TIMING
 * Two windows, one clock. Same start, same end, same duration.
 * Left: linear. Right: whichever personality you choose.
 */
const WAIT = 0.5;
const MOVE = 1.15;
const HOLD = 0.95;
const CYCLE = WAIT + MOVE + HOLD;
const GHOSTS = 9;

const linear = TIMING[0];
const CHOICES = TIMING.slice(1);
const CAPTIONS: Record<string, string> = {
  linear: 'Mechanical. Robotic. Lifeless.',
  eased: 'Natural. Calm. Considered.',
  anticipation: 'Natural. Expressive. Alive.',
  overshoot: 'Energetic. Confident. Playful.',
  settle: 'Physical. Real. Believable.',
};

function useBox(ref: React.RefObject<HTMLCanvasElement>, getPreset: () => TimingPreset, clockRef: React.MutableRefObject<number>, arc: boolean) {
  const last = useRef({ arrived: false });
  useCanvasLoop(ref, (ctx, w, h) => {
    const preset = getPreset();
    const now = performance.now() / 1000 - clockRef.current;
    const phase = ((now % CYCLE) + CYCLE) % CYCLE;
    const at = (tt: number) => clamp((tt - WAIT) / MOVE);
    const x0 = w * 0.16;
    const x1 = w * 0.84;
    const cy = h * 0.5;
    const R = Math.min(w, h) * 0.075;
    const pos = (u: number) => {
      const p = preset.ease(u);
      return { x: lerp(x0, x1, p), y: cy - (arc ? Math.sin(Math.PI * clamp(p)) * h * 0.2 : 0), p };
    };

    ctx.clearRect(0, 0, w, h);
    // baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, cy + R * 1.6);
    ctx.lineTo(x1, cy + R * 1.6);
    ctx.stroke();

    // ghosts: equal time, unequal space
    for (let k = GHOSTS; k >= 1; k--) {
      const g = pos(at(phase - k * 0.045));
      ctx.globalAlpha = (1 - k / (GHOSTS + 1)) * 0.28;
      drawSphere(ctx, 'grey', g.x, g.y, R);
    }
    const c = pos(at(phase));
    ctx.globalAlpha = 1;
    drawSphere(ctx, 'white', c.x, c.y, R);
    if (arc) {
      const warm = clamp(c.p);
      ctx.globalAlpha = warm;
      drawSphere(ctx, 'glow', c.x, c.y, R * 3);
      drawSphere(ctx, 'orange', c.x, c.y, R);
      ctx.globalAlpha = 1;
    }

    // tiny curve readout
    const gw = Math.min(90, w * 0.22);
    const gh = gw * 0.62;
    const gx = w - gw - 18;
    const gy = h - gh - 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = arc ? '#ff6a2c' : 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const yy = gy + gh - (preset.ease(u) * 0.75 + 0.12) * gh;
      if (i) ctx.lineTo(gx + u * gw, yy);
      else ctx.moveTo(gx + u * gw, yy);
    }
    ctx.stroke();
    const u = at(phase);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(gx + u * gw, gy + gh - (preset.ease(u) * 0.75 + 0.12) * gh, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const arrived = phase > WAIT + MOVE * 0.98;
    if (arrived && !last.current.arrived) audio.click(arc ? 2600 : 900, arc ? 0.2 : 0.12, { pan: 0.6 });
    last.current.arrived = arrived;
  });
}

export function Timing() {
  const [choice, setChoice] = useState('anticipation');
  const choiceRef = useRef(CHOICES[1]);
  const clock = useRef(0);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);
  useBox(leftRef, () => linear, clock, false);
  useBox(rightRef, () => choiceRef.current, clock, true);
  const preset = CHOICES.find((c) => c.id === choice)!;

  return (
    <Panel
      id="timing"
      num="03"
      title="Timing"
      theme="dark"
      headline={['Same', 'movement.', 'Different', 'feeling.']}
      body={<p>Timing changes everything.</p>}
      actions={
        <PillButton
          onClick={() => {
            clock.current = performance.now() / 1000;
          }}
        >
          Play comparison
        </PillButton>
      }
    >
      <div className="tm-boxes">
        <figure className="tm-box">
          <figcaption className="tm-box-label">Linear</figcaption>
          <canvas ref={leftRef} />
          <p className="tm-box-caption">{CAPTIONS.linear}</p>
        </figure>
        <figure className="tm-box tm-box--hot">
          <figcaption className="tm-box-label">With {preset.label.toLowerCase()}</figcaption>
          <canvas ref={rightRef} />
          <p className="tm-box-caption">{CAPTIONS[choice]}</p>
        </figure>
        <div className="tm-choose">
          <Segment
            boxed
            options={CHOICES.map((c) => ({ id: c.id, label: c.label }))}
            value={choice}
            onChange={(id) => {
              setChoice(id);
              choiceRef.current = CHOICES.find((c) => c.id === id)!;
              clock.current = performance.now() / 1000;
            }}
          />
        </div>
      </div>
    </Panel>
  );
}
