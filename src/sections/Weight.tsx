import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { brandStore, useBrand } from '../brand/brands';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useArmedSound, useCanvasLoop } from '../motion/hooks';
import { clamp, crossed, easeOut, lerp } from '../motion/math';

/**
 * 04 — MAKE IT FEEL EXPENSIVE
 * The client's product is set down three ways. How it lands — fast and
 * bouncy, or slow and controlled — is how much it seems to be worth.
 */
type Feel = 'cheap' | 'solid' | 'lux';
const CYCLE = 3.8;
const FEEL: Record<Feel, { label: string; word: string }> = {
  cheap: { label: 'Cheap', word: 'Feels cheap.' },
  solid: { label: 'Solid', word: 'Feels solid.' },
  lux: { label: 'Luxurious', word: 'Feels expensive.' },
};

/** height above the surface (0 = resting), rotation and squash at time t */
function pose(feel: Feel, t: number) {
  if (feel === 'cheap') {
    const fall = 0.42;
    if (t < fall) return { y: 1 - (t / fall) ** 2, rot: 0, sq: 0 };
    const b = t - fall;
    const y = Math.abs(Math.sin(b * 11)) * Math.exp(-b * 3.2) * 0.32;
    return { y, rot: Math.sin(b * 17) * Math.exp(-b * 2.5) * 0.16, sq: y < 0.02 ? Math.exp(-b * 4) * 0.12 : 0 };
  }
  if (feel === 'solid') {
    const fall = 0.55;
    if (t < fall) return { y: 0.7 * (1 - (t / fall) ** 2), rot: 0, sq: 0 };
    const b = t - fall;
    return { y: b < 0.25 ? Math.sin((b / 0.25) * Math.PI) * 0.05 : 0, rot: 0, sq: b < 0.1 ? 0.05 : 0 };
  }
  // luxurious: lowered by an invisible hand, no bounce at all
  return { y: 0.45 * (1 - easeOut(clamp(t / 1.5))), rot: 0, sq: 0 };
}
const LANDS: Record<Feel, number[]> = { cheap: [0.42, 0.7, 0.98], solid: [0.55], lux: [1.45] };

export function Weight() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brand = useBrand();
  const { armed, arm } = useArmedSound(wrapRef);
  const [feel, setFeel] = useState<Feel>('cheap');
  const feelRef = useRef<Feel>('cheap');
  const st = useRef({ t0: performance.now() / 1000, prev: 0, marble: null as HTMLCanvasElement | null, mw: 0, mh: 0, layer: null as HTMLCanvasElement | null });

  useCanvasLoop(canvasRef, (ctx, w, h) => {
    const s = st.current;
    const B = brandStore.get();
    const f = feelRef.current;
    const t = (performance.now() / 1000 - s.t0) % CYCLE;
    if (armed.current) {
      LANDS[f].forEach((at, i) => {
        if (crossed(s.prev, t, at)) {
          if (f === 'cheap') audio.click(2400 - i * 300, 0.18 / (i + 1));
          else B.place(f === 'lux' ? 1 : 0.5, f === 'lux' ? 0.45 : 0.7);
        }
      });
      if (f === 'lux' && crossed(s.prev, t, 1.8)) B.moment[2].play();
    }
    s.prev = t;

    // marble, drawn once per size
    if (!s.marble || s.mw !== w || s.mh !== h) {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const g = c.getContext('2d')!;
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#d8d2ca');
      bg.addColorStop(0.68, '#c9c2b8');
      bg.addColorStop(0.68, '#f1ede7');
      bg.addColorStop(1, '#dcd6cd');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,110,100,0.18)';
      for (let i = 0; i < 9; i++) {
        g.lineWidth = 0.6 + Math.random();
        g.beginPath();
        let x = Math.random() * w;
        let y = h * 0.68;
        g.moveTo(x, y);
        while (y < h) {
          x += (Math.random() - 0.4) * 40;
          y += 8 + Math.random() * 14;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      s.marble = c;
      s.mw = w;
      s.mh = h;
    }
    ctx.drawImage(s.marble, 0, 0, w, h);

    const surface = h * 0.72;
    const size = h * 0.42;
    const p = pose(f, t);
    const lift = p.y * h * 0.6;
    const cy = surface - size / 2 - lift;
    // soft shadow
    ctx.fillStyle = `rgba(40,30,20,${lerp(0.28, 0.05, clamp(p.y * 1.5))})`;
    ctx.beginPath();
    ctx.ellipse(w / 2, surface, size * lerp(0.42, 0.2, clamp(p.y * 1.5)), size * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    // reflection on polished marble, only when it is luxurious
    if (f === 'lux') {
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.translate(0, surface * 2);
      ctx.scale(1, -1);
      B.draw(ctx, w / 2, cy, size);
      ctx.restore();
    }
    // the product is drawn on its own layer so the light can sweep across it alone
    if (!s.layer || s.layer.width !== w || s.layer.height !== h) {
      s.layer = document.createElement('canvas');
      s.layer.width = w;
      s.layer.height = h;
    }
    const lc = s.layer.getContext('2d')!;
    lc.clearRect(0, 0, w, h);
    lc.save();
    lc.translate(w / 2, cy + size / 2);
    lc.rotate(p.rot);
    lc.scale(1 + p.sq, 1 - p.sq);
    B.draw(lc, 0, -size / 2, size);
    lc.restore();
    if (f === 'lux' && t > 1.6 && t < 2.8) {
      const k = (t - 1.6) / 1.2;
      const sx = lerp(w / 2 - size * 0.6, w / 2 + size * 0.6, easeOut(k));
      const g = lc.createLinearGradient(sx - size * 0.14, 0, sx + size * 0.14, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, `rgba(255,255,255,${0.55 * Math.sin(k * Math.PI)})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      lc.globalCompositeOperation = 'source-atop';
      lc.fillStyle = g;
      lc.fillRect(0, 0, w, h);
      lc.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(s.layer, 0, 0, w, h);
  });

  return (
    <Panel id="weight" num="04" title="Value" theme="paper" headline={['Make it feel', 'expensive.']} body={<p>How it lands is what it seems to be worth.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        tone="light"
        caption={<span className="mon-word" key={feel + brand.id}>{FEEL[feel].word}</span>}
        controls={
          <Segment
            boxed
            options={(Object.keys(FEEL) as Feel[]).map((id) => ({ id, label: FEEL[id].label }))}
            value={feel}
            onChange={(v) => {
              void arm();
              setFeel(v);
              feelRef.current = v;
              st.current.t0 = performance.now() / 1000;
            }}
          />
        }
      />
    </Panel>
  );
}
