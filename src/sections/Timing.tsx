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
/** plain-language explanations for clients */
const EXPLAIN: Record<string, { what: string; seen: string }> = {
  eased: { what: 'It speeds up gently, then slows down before it stops. Nothing in the real world starts or stops instantly.', seen: 'Premium UI, product shots, most logo animations.' },
  anticipation: { what: 'It pulls back a little before the main move, like bending your knees before a jump. The small move prepares you for the big one.', seen: 'Logo reveals, buttons, character animation.' },
  overshoot: { what: 'It moves past the target and comes back. It feels energetic and confident.', seen: 'App icons, notifications, playful brands.' },
  settle: { what: 'It arrives, then wobbles to rest like a real object losing its energy.', seen: 'Product drops, cards landing, 3D packshots.' },
};
const CAPTIONS: Record<string, string> = {
  linear: 'Mechanical. Robotic. Lifeless.',
  eased: 'Natural. Calm. Considered.',
  anticipation: 'Natural. Expressive. Alive.',
  overshoot: 'Energetic. Confident. Playful.',
  settle: 'Physical. Real. Believable.',
};

function useBox(
  ref: React.RefObject<HTMLCanvasElement>,
  getPreset: () => TimingPreset,
  clockRef: React.MutableRefObject<number>,
  arc: boolean,
  armRef: React.MutableRefObject<number>,
) {
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
    // sound only for a run the visitor started
    if (arrived && !last.current.arrived && performance.now() / 1000 < armRef.current) audio.click(arc ? 2600 : 900, arc ? 0.2 : 0.12, { pan: 0.6 });
    last.current.arrived = arrived;
  });
}

export function Timing() {
  const [choice, setChoice] = useState('anticipation');
  const choiceRef = useRef(CHOICES[1]);
  const clock = useRef(0);
  const leftRef = useRef<HTMLCanvasElement>(null);
  const rightRef = useRef<HTMLCanvasElement>(null);
  const arm = useRef(0);
  useBox(leftRef, () => linear, clock, false, arm);
  useBox(rightRef, () => choiceRef.current, clock, true, arm);
  const preset = CHOICES.find((c) => c.id === choice)!;

  return (
    <Panel
      id="timing"
      num="03"
      title="Timing"
      theme="dark"
      question="How should it feel?"
      headline={['Same', 'movement.', 'Different', 'feeling.']}
      body={
        <p>
          Watch both balls. They start together and arrive together. The only difference is how they use that time, and it completely changes how they feel.
        </p>
      }
      forYou={{
        text: 'Timing is where personality comes from. The same logo or product shot can feel cheap, calm, premium or energetic depending on how it accelerates and stops.',
        uses: ['Logo reveals', 'UI transitions', 'Product shots'],
      }}
      actions={
        <PillButton
          onClick={() => {
            clock.current = performance.now() / 1000;
            arm.current = clock.current + CYCLE;
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
        <p className="tm-legend">
          <i /> Each faded ball is one frame. Close together means slow, far apart means fast. The small graph shows speed over time.
        </p>
        <div className="tm-choose">
          <Segment
            boxed
            options={CHOICES.map((c) => ({ id: c.id, label: c.label }))}
            value={choice}
            onChange={(id) => {
              setChoice(id);
              choiceRef.current = CHOICES.find((c) => c.id === id)!;
              clock.current = performance.now() / 1000;
              arm.current = clock.current + CYCLE;
            }}
          />
          <div className="tm-explain" key={choice}>
            <p>
              <b>What it is.</b> {EXPLAIN[choice].what}
            </p>
            <p>
              <b>Where you've seen it.</b> {EXPLAIN[choice].seen}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
