import { useMemo, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Chapter } from '../components/Chapter';
import { Choice } from '../components/Controls';
import { Reveal, Split } from '../components/Typography';
import { TIMING, TimingPreset } from '../motion/easing';
import { useVisibleRaf } from '../motion/hooks';
import { clamp } from '../motion/math';

/**
 * 02 — TIMING
 *
 * Same object. Same distance. Same duration.
 * Only the distribution of movement over time changes.
 */
const MOVE = 1.0; // seconds
const HOLD_B = 0.85;
const HOLD_A = 0.45;
const FRAMES = 24;

type Mode = TimingPreset['id'] | 'compare';

// graph geometry (SVG units)
const GW = 300;
const GH = 220;
const PAD = 26;
const Y0 = -0.32;
const Y1 = 1.34;
const gx = (t: number) => PAD + t * (GW - PAD * 2);
const gy = (v: number) => GH - PAD - ((v - Y0) / (Y1 - Y0)) * (GH - PAD * 2);
const curvePath = (p: TimingPreset) =>
  Array.from({ length: 121 }, (_, i) => {
    const t = i / 120;
    return `${i ? 'L' : 'M'}${gx(t).toFixed(2)},${gy(p.ease(t)).toFixed(2)}`;
  }).join(' ');

export function Timing() {
  const [mode, setMode] = useState<Mode>('linear');
  const lanes = mode === 'compare' ? TIMING : TIMING.filter((t) => t.id === mode);
  const active = mode === 'compare' ? null : lanes[0];

  const rootRef = useRef<HTMLDivElement>(null);
  const objRefs = useRef<(HTMLDivElement | null)[]>([]);
  const laneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headRefs = useRef<(SVGCircleElement | null)[]>([]);
  const vlineRef = useRef<SVGLineElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);
  const scrubHeadRef = useRef<HTMLDivElement>(null);
  const frameLabelRef = useRef<HTMLSpanElement>(null);

  const clock = useRef({ phase: 'fwd' as 'fwd' | 'holdB' | 'holdA', t: 0, scrubbing: false, resumeAt: 0 });
  const motion = useRef<{ prev: number[]; crossings: number[] }>({ prev: [], crossings: [] });

  const paths = useMemo(() => TIMING.map(curvePath), []);

  useVisibleRaf(rootRef, (dt) => {
    const c = clock.current;
    const now = performance.now() / 1000;
    if (!c.scrubbing && now >= c.resumeAt) {
      c.t += dt;
      if (c.phase === 'fwd' && c.t >= MOVE) {
        c.phase = 'holdB';
        c.t = 0;
      } else if (c.phase === 'holdB' && c.t >= HOLD_B) {
        c.phase = 'holdA';
        c.t = 0;
        motion.current.crossings = [];
      } else if (c.phase === 'holdA' && c.t >= HOLD_A) {
        c.phase = 'fwd';
        c.t = 0;
      }
    }
    const u = c.phase === 'fwd' ? clamp(c.t / MOVE) : c.phase === 'holdB' ? 1 : 0;
    const visible = c.phase !== 'holdA' || c.scrubbing;

    lanes.forEach((preset, i) => {
      const obj = objRefs.current[i];
      const lane = laneRefs.current[i];
      if (!obj || !lane) return;
      const L = lane.clientWidth;
      const pos = preset.ease(u);
      const prev = motion.current.prev[i] ?? pos;
      const v = dt > 0 ? (pos - prev) / dt : 0;
      motion.current.prev[i] = pos;
      const st = clamp(Math.abs(v) * 0.06, 0, 0.42);
      obj.style.transform = `translate3d(${pos * L}px,0,0) scale(${1 + st}, ${1 / (1 + st)})`;
      obj.style.opacity = visible ? '1' : '0';

      // every time it crosses B, you hear it — the settle literally rings
      if (!c.scrubbing && c.phase === 'fwd' && (prev - 1) * (pos - 1) <= 0 && prev !== pos) {
        const n = (motion.current.crossings[i] = (motion.current.crossings[i] ?? 0) + 1);
        audio.click(2200 + i * 180, (0.22 / n) * (mode === 'compare' ? 0.5 : 1), { pan: 0.5 });
      }

      const head = headRefs.current[i];
      if (head) {
        head.setAttribute('cx', String(gx(u)));
        head.setAttribute('cy', String(gy(pos)));
      }
    });
    vlineRef.current?.setAttribute('x1', String(gx(u)));
    vlineRef.current?.setAttribute('x2', String(gx(u)));
    if (scrubHeadRef.current) scrubHeadRef.current.style.left = `${u * 100}%`;
    if (frameLabelRef.current)
      frameLabelRef.current.textContent = `F ${String(Math.round(u * FRAMES)).padStart(2, '0')} / ${FRAMES}  ·  ${Math.round(u * MOVE * 1000)
        .toString()
        .padStart(4, '0')} MS`;
  });

  const scrubTo = (clientX: number) => {
    const r = scrubRef.current!.getBoundingClientRect();
    const u = clamp((clientX - r.left) / r.width);
    const c = clock.current;
    c.phase = 'fwd';
    c.t = u * MOVE;
  };

  return (
    <Chapter id="timing" env="bluegrey" number="02" title="Timing" length={4.4} thresholds={[0.12, 0.3, 0.46, 0.7]}>
      {({ stage }) => (
        <div className={`timing ${mode === 'compare' ? 'is-compare' : ''}`} ref={rootRef}>
          <div className="chapter-mark mono">
            <span>02</span>
            <span>Timing</span>
          </div>

          <div className="tm-lanes">
            {lanes.map((p, i) => (
              <div className="tm-lane" key={p.id}>
                <span className="tm-lane-label mono">{mode === 'compare' ? p.label : ''}</span>
                <span className="tm-ab serif">A</span>
                <div className="tm-track" ref={(el) => (laneRefs.current[i] = el)}>
                  <div className="tm-line" />
                  {/* onion skin: equal time, unequal space */}
                  {Array.from({ length: FRAMES + 1 }, (_, f) => (
                    <span key={f} className="tm-ghost" style={{ left: `${p.ease(f / FRAMES) * 100}%` }} />
                  ))}
                  <div className="tm-obj" ref={(el) => (objRefs.current[i] = el)} />
                </div>
                <span className="tm-ab serif">B</span>
              </div>
            ))}
          </div>

          <div className="tm-copy">
            <Reveal show={stage >= 1} className="tm-line-1">
              Same movement.
            </Reveal>
            <Reveal show={stage >= 2} className="tm-line-1">
              Different timing.
            </Reveal>
            <Reveal show={stage >= 3} className="tm-line-1">
              Different personality.
            </Reveal>
            <div className={`tm-personality ${stage >= 1 ? 'is-in' : ''}`}>
              <em key={mode}>{active ? active.personality : 'five characters.'}</em>
              <p className="mono">{active ? active.note : 'One distance. One duration. Five ways to spend it.'}</p>
            </div>
          </div>

          <figure className={`tm-graph ${stage >= 1 ? 'is-in' : ''}`}>
            <svg viewBox={`0 0 ${GW} ${GH}`} aria-label="Motion curve">
              <line className="g-axis" x1={gx(0)} x2={gx(1)} y1={gy(0)} y2={gy(0)} />
              <line className="g-axis dashed" x1={gx(0)} x2={gx(1)} y1={gy(1)} y2={gy(1)} />
              <line className="g-axis" x1={gx(0)} x2={gx(0)} y1={gy(Y0)} y2={gy(Y1)} />
              <text className="g-label" x={gx(0) - 8} y={gy(0) + 3} textAnchor="end">
                A
              </text>
              <text className="g-label" x={gx(0) - 8} y={gy(1) + 3} textAnchor="end">
                B
              </text>
              <text className="g-label" x={gx(1)} y={GH - 8} textAnchor="end">
                TIME →
              </text>
              <line className="g-vline" ref={vlineRef} y1={gy(Y0)} y2={gy(Y1)} />
              {TIMING.map((p, i) => {
                const li = lanes.indexOf(p);
                const on = li >= 0;
                return (
                  <g key={p.id} className={`g-curve ${on ? 'is-on' : ''}`}>
                    <path d={paths[i]} />
                    {on && <circle r={4} ref={(el) => (headRefs.current[li] = el)} />}
                  </g>
                );
              })}
            </svg>
            <figcaption className="mono">Position over time</figcaption>
          </figure>

          <div className={`tm-controls ${stage >= 2 ? 'is-in' : ''}`}>
            <Choice<Mode>
              options={[...TIMING.map((t) => ({ id: t.id as Mode, label: t.label })), { id: 'compare', label: 'All five' }]}
              value={mode}
              onChange={(m) => {
                setMode(m);
                motion.current = { prev: [], crossings: [] };
                clock.current.phase = 'holdA';
                clock.current.t = 0;
              }}
            />
            <div
              className="tm-scrub"
              ref={scrubRef}
              data-cursor="scrub"
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture(e.pointerId);
                clock.current.scrubbing = true;
                scrubTo(e.clientX);
              }}
              onPointerMove={(e) => {
                if (clock.current.scrubbing) scrubTo(e.clientX);
              }}
              onPointerUp={() => {
                clock.current.scrubbing = false;
                clock.current.resumeAt = performance.now() / 1000 + 1.2;
              }}
            >
              {Array.from({ length: FRAMES + 1 }, (_, f) => (
                <span key={f} className={`tm-tick ${f % 6 === 0 ? 'major' : ''}`} style={{ left: `${(f / FRAMES) * 100}%` }}>
                  {f % 6 === 0 && <i>{String(f).padStart(2, '0')}</i>}
                </span>
              ))}
              <div className="tm-scrub-head" ref={scrubHeadRef} />
            </div>
            <span className="tm-frame mono" ref={frameLabelRef} />
          </div>

          <div className={`tm-principle ${stage >= 4 ? 'is-in' : ''}`}>
            <h2 className="display">
              <Split text="TIMING CREATES" show={stage >= 4} />
              <br />
              <Split text="CHARACTER." show={stage >= 4} delay={300} />
            </h2>
          </div>
        </div>
      )}
    </Chapter>
  );
}
