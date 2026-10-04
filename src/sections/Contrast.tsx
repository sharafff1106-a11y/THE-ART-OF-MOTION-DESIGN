import { useRef, useState } from 'react';
import gsap from 'gsap';
import { audio } from '../audio/engine';
import { PillButton, Slider } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop } from '../motion/hooks';
import { drawHeadphones } from '../motion/kora';
import { damp, lerp, rand, smoothstep } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 06 — CONTRAST
 * The end card of the KORA ad, two ways. In chaos every element shouts;
 * in clarity one product, one name, one offer, and space around them.
 */
const STICKERS = ['SALE!', '50% OFF', 'NEW!!', 'LIMITED', 'BUY NOW', 'HOT', 'WOW', 'FREE SHIP', '★★★', 'LAST DAY'];
const COLORS = ['#ffe23f', '#ff3fa4', '#2fd3ff', '#7cff4f', '#ff5a1f', '#ffffff'];

export function Contrast() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clarity, setClarity] = useState(0.15);
  const [cut, setCut] = useState<'none' | 'name' | 'principle'>('none');
  const target = useRef(0.15);
  target.current = clarity;
  const sim = useRef({
    c: 0.15,
    stickers: Array.from({ length: 16 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: rand(-0.5, 0.5),
      s: rand(0.7, 1.4),
      text: STICKERS[i % STICKERS.length],
      col: COLORS[i % COLORS.length],
      ph: Math.random() * 6,
    })),
    confetti: Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: rand(0.1, 0.4), r: Math.random() * 6, col: COLORS[Math.floor(Math.random() * COLORS.length)] })),
  });

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = sim.current;
    s.c = damp(s.c, target.current, 6, dt);
    const chaos = 1 - s.c;
    const calm = smoothstep(0.55, 1, s.c);
    ctx.clearRect(0, 0, w, h);

    // background: flashing blocks → one soft light
    ctx.fillStyle = '#141312';
    ctx.fillRect(0, 0, w, h);
    if (chaos > 0.02) {
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = chaos * (0.25 + 0.25 * Math.sin(time * 9 + i * 2));
        ctx.fillStyle = COLORS[(i + Math.floor(time * 4)) % COLORS.length];
        ctx.fillRect((i / 6) * w, 0, w / 6 + 1, h);
      }
    }
    ctx.globalAlpha = 0.5 + calm * 0.5;
    drawSphere(ctx, 'glow', w / 2, h * 0.44, h * lerp(0.4, 0.7, calm));
    ctx.globalAlpha = 1;

    // confetti
    if (chaos > 0.02) {
      for (const c of s.confetti) {
        c.y = (c.y + c.v * dt) % 1;
        c.r += dt * 6;
        ctx.save();
        ctx.globalAlpha = chaos;
        ctx.translate(c.x * w, c.y * h);
        ctx.rotate(c.r);
        ctx.fillStyle = c.col;
        ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
    }

    // the product
    const jit = chaos * 10;
    const px = w / 2 + Math.sin(time * 13) * jit;
    const py = h * 0.42 + Math.sin(time * 1.2) * 4 * calm + Math.cos(time * 11) * jit;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.sin(time * 7) * 0.25 * chaos);
    drawHeadphones(ctx, 0, 0, h * lerp(0.26, 0.34, calm));
    ctx.restore();

    // the name
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameY = h * 0.7;
    if (chaos > 0.05) {
      for (let k = 0; k < 3; k++) {
        ctx.save();
        ctx.globalAlpha = chaos * 0.8;
        ctx.translate(w / 2 + Math.sin(time * 15 + k) * 14 * chaos, nameY + Math.cos(time * 12 + k) * 8 * chaos);
        ctx.rotate(Math.sin(time * 5 + k) * 0.2 * chaos);
        ctx.fillStyle = COLORS[(k + Math.floor(time * 6)) % COLORS.length];
        ctx.font = `900 ${h * 0.12}px Inter, sans-serif`;
        ctx.fillText('KORA!!!', 0, 0);
        ctx.restore();
      }
    }
    ctx.globalAlpha = calm;
    ctx.fillStyle = '#efe9df';
    ctx.font = `${h * 0.11}px "Instrument Serif", Georgia, serif`;
    ctx.fillText('KORA', w / 2, nameY);
    ctx.font = `600 ${Math.max(8, h * 0.028)}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = '#b8b2a8';
    ctx.fillText('HEAR EVERYTHING.', w / 2, nameY + h * 0.08);
    // one clear call to action
    const bw = h * 0.26;
    const bh = h * 0.075;
    ctx.fillStyle = '#ff5a1f';
    ctx.beginPath();
    ctx.roundRect(w / 2 - bw / 2, h * 0.86 - bh / 2, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('PRE-ORDER', w / 2, h * 0.86 + 1);
    ctx.globalAlpha = 1;

    // stickers shouting over everything
    if (chaos > 0.02) {
      for (const st of s.stickers) {
        const pulse = 1 + Math.sin(time * 10 + st.ph) * 0.12;
        ctx.save();
        ctx.globalAlpha = chaos;
        ctx.translate(st.x * w, st.y * h);
        ctx.rotate(st.r + Math.sin(time * 4 + st.ph) * 0.15);
        ctx.scale(st.s * pulse, st.s * pulse);
        ctx.font = `900 ${h * 0.045}px Inter, sans-serif`;
        const tw = ctx.measureText(st.text).width;
        ctx.fillStyle = st.col;
        ctx.fillRect(-tw / 2 - 8, -h * 0.035, tw + 16, h * 0.07);
        ctx.fillStyle = '#141312';
        ctx.fillText(st.text, 0, 1);
        ctx.restore();
      }
      // ticker
      ctx.globalAlpha = chaos;
      ctx.fillStyle = '#ffe23f';
      ctx.fillRect(0, h - h * 0.07, w, h * 0.07);
      ctx.fillStyle = '#141312';
      ctx.font = `900 ${h * 0.035}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      const msg = 'BUY NOW • LIMITED OFFER • BUY NOW • DON’T MISS OUT • ';
      const mw = ctx.measureText(msg).width;
      const off = (time * 120) % mw;
      for (let x = -off; x < w; x += mw) ctx.fillText(msg, x, h - h * 0.035);
      ctx.globalAlpha = 1;
    }
  });

  const playSequence = async () => {
    await audio.enable();
    const o = { c: clarity };
    gsap
      .timeline()
      .call(() => audio.air(0.9, 0.85))
      .to(o, { c: 0, duration: 0.5, ease: 'power2.in', onUpdate: () => setClarity(o.c) })
      .call(() => {
        audio.air(0);
        audio.impact(0.3, 0.5);
        setCut('name');
      }, [], '+=2.4')
      .call(() => audio.tone(392, 3, 0.05), [], '+=1.2')
      .call(() => setCut('principle'), [], '+=1.8')
      .call(() => setClarity(1), [], '+=0.2')
      .call(() => setCut('none'), [], '+=2.4');
  };

  return (
    <Panel
      id="contrast"
      num="06"
      title="Contrast"
      theme="blue"
      question="What matters most?"
      headline={['Without contrast,', 'there is no focus.']}
      body={<p>The last frame of the KORA ad, two ways. Drag from chaos to clarity: the product, the name and the offer only land when everything else steps back.</p>}
      forYou={{
        text: 'When every element animates, shouts and flashes, viewers remember nothing. Space, restraint and one clear movement make your message the moment.',
        uses: ['End cards', 'Title sequences', 'Banners', 'Pitch decks'],
      }}
      actions={
        <>
          <div className="ct-slider">
            <Slider value={clarity} onChange={setClarity} ends={['Chaos', 'Clarity']} />
          </div>
          <PillButton icon="play" onClick={playSequence}>
            Play the hard cut
          </PillButton>
        </>
      }
    >
      <div className="ct-stage">
        <div className="ct-frame">
          <canvas className="fill" ref={canvasRef} />
        </div>
        <p className="ct-label">{clarity < 0.4 ? 'Everything shouts. What did you remember?' : clarity > 0.8 ? 'One product. One name. One action.' : 'Taking things away…'}</p>
      </div>
      <div className={`ct-cut ${cut !== 'none' ? 'is-on' : ''}`}>
        <span className={cut === 'name' ? 'is-on' : ''}>KORA</span>
        <span className={cut === 'principle' ? 'is-on' : ''}>Contrast creates meaning.</span>
      </div>
    </Panel>
  );
}
