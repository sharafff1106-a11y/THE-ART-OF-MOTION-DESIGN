import { useRef, useState } from 'react';
import gsap from 'gsap';
import { audio } from '../audio/engine';
import { PillButton, Slider } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useInView } from '../motion/hooks';
import { damp, lerp, rand } from '../motion/math';

/**
 * 06 — CONTRAST
 * Everything shouting at once means nothing is heard.
 * Drag from chaos to clarity — or play the sequence: noise, CUT, "hello."
 */
const NOISE_WORDS = ['LOOK', 'NEW', 'NOW', 'SALE', 'HERE', 'WOW', '!!!', 'CLICK', 'MORE', '50%'];
const N = 160;

export function Contrast() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visible = useInView(wrapRef, { threshold: 0.4 });
  const [clarity, setClarity] = useState(1);
  const [cut, setCut] = useState<'none' | 'hello' | 'principle'>('none');
  const target = useRef(1);
  target.current = clarity;
  const visibleRef = useRef(false);
  visibleRef.current = visible;
  const cutRef = useRef(cut);
  cutRef.current = cut;
  const sim = useRef({
    c: 1,
    ps: Array.from({ length: N }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: rand(-1, 1),
      vy: rand(-1, 1),
      k: Math.floor(rand(0, 4)),
      s: rand(4, 26),
      r: rand(0, 6.28),
      word: NOISE_WORDS[Math.floor(rand(0, NOISE_WORDS.length))],
    })),
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = sim.current;
    s.c = damp(s.c, target.current, 6, dt);
    const chaos = 1 - s.c;
    audio.air(visibleRef.current && cutRef.current === 'none' ? chaos * chaos * 0.9 : 0, 0.3 + chaos * 0.6);

    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const R = Math.min(w, h) * 0.34;
    const wob = chaos * 40;

    // two warm/cool halves of one soft disc
    const halves: [number, string, string][] = [
      [-1, 'rgba(255,120,80,0.95)', 'rgba(255,170,150,0)'],
      [1, 'rgba(70,140,240,0.9)', 'rgba(150,190,240,0)'],
    ];
    for (const [side, a, b] of halves) {
      ctx.save();
      ctx.beginPath();
      if (side < 0) ctx.rect(0, 0, cx, h);
      else ctx.rect(cx, 0, w - cx, h);
      ctx.clip();
      const ox = cx + side * (R * 0.25 + Math.sin(time * 3) * wob);
      const oy = cy + Math.cos(time * 2.3 + side) * wob;
      const g = ctx.createRadialGradient(ox, oy, R * 0.05, cx, cy, R * 1.25);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // noise layer
    if (chaos > 0.02) {
      ctx.font = '600 14px Inter, sans-serif';
      for (const p of s.ps) {
        const sp = 60 + chaos * 380;
        p.x += (p.vx * sp * dt) / w;
        p.y += (p.vy * sp * dt) / h;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        p.r += dt * (1 + chaos * 6);
        const x = p.x * w;
        const y = p.y * h;
        ctx.globalAlpha = chaos * (0.35 + 0.65 * Math.abs(Math.sin(time * 7 + p.s)));
        ctx.strokeStyle = ctx.fillStyle = p.k === 1 ? '#ff4d12' : p.k === 2 ? '#2f5bd3' : '#141414';
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.r);
        if (p.k === 0) ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        else if (p.k === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.k === 2) {
          ctx.beginPath();
          ctx.moveTo(-p.s, 0);
          ctx.lineTo(p.s, 0);
          ctx.stroke();
        } else ctx.fillText(p.word, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // the one thing that matters
    ctx.strokeStyle = '#141414';
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - R * 1.35);
    ctx.lineTo(cx, cy + R * 1.35);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(cx, cy, lerp(9, 13, s.c), 0, Math.PI * 2);
    ctx.fill();
  });

  const playSequence = () => {
    const o = { c: clarity };
    gsap
      .timeline()
      .to(o, { c: 0, duration: 0.6, ease: 'power2.in', onUpdate: () => setClarity(o.c) })
      .call(() => {
        audio.impact(0.2, 0.6);
      }, [], '+=2.2')
      .call(() => {
        setCut('hello');
        audio.air(0);
      })
      .call(() => setCut('principle'), [], '+=3')
      .call(() => {
        setClarity(1);
        audio.tone(660, 2.2, 0.05);
      }, [], '+=0.2')
      .call(() => setCut('none'), [], '+=2.4');
  };

  return (
    <Panel
      id="contrast"
      num="06"
      title="Contrast"
      theme="blue"
      headline={['Without contrast,', 'there is no focus.']}
      body={<p className="panel-sub">Contrast creates meaning.</p>}
      actions={
        <>
          <PillButton onClick={playSequence}>Play sequence</PillButton>
          <div className="ct-slider">
            <Slider value={clarity} onChange={setClarity} ends={['Chaos', 'Clarity']} />
          </div>
        </>
      }
    >
      <div className="fill" ref={wrapRef}>
        <canvas className="fill" ref={canvasRef} />
        <p className="ct-note">
          Same scene.
          <br />
          Different emphasis.
        </p>
        <div className={`ct-cut ${cut !== 'none' ? 'is-on' : ''}`}>
          <span className={cut === 'hello' ? 'is-on' : ''}>hello.</span>
          <span className={cut === 'principle' ? 'is-on' : ''}>Contrast creates meaning.</span>
        </div>
      </div>
    </Panel>
  );
}
