import { useEffect, useRef, useState } from 'react';
import { Segment, Toggle, TryPanel, TryRow } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop } from '../motion/hooks';
import { damp, rand } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 02 — ATTENTION
 * A shop page. The same layout in three motion strategies, with a simulated
 * viewer's eye and a heatmap of where it spends its time.
 */
type Mode = 'still' | 'all' | 'one';
const MODES: { id: Mode; label: string }[] = [
  { id: 'still', label: 'No motion' },
  { id: 'all', label: 'Everything moves' },
  { id: 'one', label: 'One thing moves' },
];
const NOTES: Record<Mode, string> = {
  still: 'Nothing leads. The eye wanders, and the offer is just one item among many.',
  all: 'Everything competes. The eye jumps around and nothing gets read.',
  one: 'One gentle movement. The eye goes straight to the offer and stays.',
};
const ITEMS = [
  { name: 'Speaker', price: '€129', ico: 'speaker' },
  { name: 'Earbuds', price: '€89', ico: 'buds' },
  { name: 'KORA', price: '€249', ico: 'kora', hero: true },
  { name: 'Cable', price: '€19', ico: 'cable' },
  { name: 'Case', price: '€29', ico: 'case' },
  { name: 'Stand', price: '€39', ico: 'stand' },
];

export function Attention() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('one');
  const [heat, setHeat] = useState(true);
  const [found, setFound] = useState<number | null>(null);
  const modeRef = useRef<Mode>('one');
  const heatRef = useRef(true);
  heatRef.current = heat;
  const sim = useRef({
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    next: 0,
    since: 0,
    found: false,
    heat: null as HTMLCanvasElement | null,
    hw: 0,
    hh: 0,
    lastFrame: 0,
  });

  useEffect(() => {
    modeRef.current = mode;
    const s = sim.current;
    s.since = performance.now() / 1000;
    s.found = false;
    s.next = 0;
    setFound(null);
    if (s.heat) s.heat.getContext('2d')!.clearRect(0, 0, s.hw, s.hh);
  }, [mode]);

  useCanvasLoop(canvasRef, (ctx, w, h) => {
    const s = sim.current;
    const frame = frameRef.current;
    if (!frame) return;
    if (!s.heat || s.hw !== w || s.hh !== h) {
      s.heat = document.createElement('canvas');
      s.heat.width = w;
      s.heat.height = h;
      s.hw = w;
      s.hh = h;
      s.x = w / 2;
      s.y = h / 2;
    }
    const fr = frame.getBoundingClientRect();
    const rectOf = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height };
    };
    const cards = [...frame.querySelectorAll('.at-card')].map(rectOf);
    const cta = rectOf(frame.querySelector('.at-cta')!);
    const heroCard = cards[2];
    const now = performance.now() / 1000;
    const m = modeRef.current;
    // the loop was paused off screen: start the measurement fresh
    if (now - s.lastFrame > 0.5) {
      s.since = now;
      s.found = false;
      s.next = 0;
      setFound(null);
      s.heat.getContext('2d')!.clearRect(0, 0, w, h);
    }
    s.lastFrame = now;

    // where the eye goes next
    if (now >= s.next) {
      let t = cards[Math.floor(Math.random() * cards.length)];
      let dwell = rand(0.9, 1.6);
      if (m === 'all') {
        dwell = rand(0.22, 0.45);
      } else if (m === 'one') {
        const away = Math.random() < 0.12;
        t = away ? t : Math.random() < 0.5 ? heroCard : cta;
        dwell = away ? 0.3 : rand(0.8, 1.4);
      } else if (Math.random() < 0.15) t = cta;
      s.tx = t.x + t.w * rand(0.3, 0.7);
      s.ty = t.y + t.h * rand(0.3, 0.7);
      s.next = now + dwell;
    }
    // saccades: the eye jumps, it does not glide
    s.x = damp(s.x, s.tx, 16, 1 / 60);
    s.y = damp(s.y, s.ty, 16, 1 / 60);
    const inside = (r: { x: number; y: number; w: number; h: number }) => s.x > r.x && s.x < r.x + r.w && s.y > r.y && s.y < r.y + r.h;
    if (!s.found && (inside(cta) || inside(heroCard))) {
      s.found = true;
      setFound(now - s.since);
    }

    // heat accumulates where the eye rests
    const hc = s.heat.getContext('2d')!;
    hc.globalCompositeOperation = 'destination-out';
    hc.fillStyle = 'rgba(0,0,0,0.006)';
    hc.fillRect(0, 0, w, h);
    hc.globalCompositeOperation = 'source-over';
    hc.globalAlpha = 0.07;
    drawSphere(hc, 'glow', s.x, s.y, 70);
    hc.globalAlpha = 1;

    ctx.clearRect(0, 0, w, h);
    if (heatRef.current) {
      ctx.globalAlpha = 0.95;
      ctx.drawImage(s.heat, 0, 0);
      ctx.globalAlpha = 1;
    }
    // the simulated eye
    ctx.strokeStyle = '#ff5a1f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff5a1f';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '600 9px "IBM Plex Mono", monospace';
    ctx.fillText('EYE', s.x + 17, s.y + 3);
  });

  return (
    <Panel
      id="attention"
      num="02"
      title="Attention"
      theme="paper"
      question="Where will people look?"
      headline={['Motion', 'directs', 'attention.']}
      body={<p>Same page. Same products. Only the motion changes. Watch where the eye goes.</p>}
      forYou={{
        text: 'Use motion to lead customers to what matters: the offer, the new feature, the next step. When everything moves, nothing stands out.',
        uses: ['Ads', 'Websites', 'App UI', 'Social posts'],
      }}
      aside={
        <TryPanel>
          <Segment options={MODES} value={mode} onChange={setMode} />
          <p className="at-note">{NOTES[mode]}</p>
          <TryRow label="Heatmap">
            <Toggle on={heat} onChange={setHeat} />
          </TryRow>
          <div className="at-result">
            <span>Time to find the offer</span>
            <b>{found === null ? (mode === 'one' ? '…' : 'searching…') : `${found.toFixed(1)} s`}</b>
          </div>
          <p className="try-note">The eye is a simple simulation based on how motion pulls attention.</p>
        </TryPanel>
      }
    >
      <div className={`at-frame is-${mode}`} ref={frameRef}>
        <div className="at-bar">
          <span className="at-logo">sound/shop</span>
          <span className="at-nav">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="at-grid">
          {ITEMS.map((it, i) => (
            <div key={it.name} className={`at-card ${it.hero ? 'at-card--hero' : ''}`} style={{ ['--k' as string]: i }}>
              {it.hero && <span className="at-badge">New</span>}
              <div className={`at-ico at-ico--${it.ico}`}>
                <span />
                <span />
              </div>
              <b>{it.name}</b>
              <span className="at-price">{it.price}</span>
            </div>
          ))}
        </div>
        <button className="at-cta" tabIndex={-1}>
          Pre-order KORA
        </button>
        <canvas className="fill at-canvas" ref={canvasRef} />
      </div>
    </Panel>
  );
}
