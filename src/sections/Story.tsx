import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { PillButton } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useInView } from '../motion/hooks';
import { clamp, invLerp, lerp, smoothstep } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 10 — STORYTELLING
 * One continuous transformation: dot → line → shape → object → weight →
 * interaction → rhythm → world. No words. Drag the timeline or let it play.
 */
const BEATS = ['Dot', 'Line', 'Shape', 'Object', 'Weight', 'Contact', 'Rhythm', 'World'];
/** the story, told in plain words, one line per beat */
const CAPTIONS = [
  'Every film starts with one small idea.',
  'Movement gives it a direction.',
  'Direction becomes a shape.',
  'The shape becomes a character you recognise.',
  'Weight makes it believable. It falls, it lands.',
  'Someone else arrives. Something happens between them.',
  'Music gives the moment a heartbeat.',
  'And now there is a whole world. No words were needed.',
];
const AT = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.74, 0.86, 1];
const DURATION = 18;

const beatOf = (p: number) => {
  let b = 0;
  for (let i = 0; i < BEATS.length; i++) if (p >= AT[i]) b = i;
  return b;
};
const local = (p: number, i: number) => invLerp(AT[i], AT[i + 1], p);

const SOUNDS = [
  () => audio.tick(0.15),
  () => audio.tone(440, 1.4, 0.05),
  () => audio.wood(1400, 0.2),
  () => audio.click(2200, 0.18),
  () => audio.impact(0.55, 0.6),
  () => (audio.impact(0.35, 0.5), audio.wood(900, 0.2)),
  () => audio.kick(0.5),
  () => [261.6, 329.6, 392, 523.3].forEach((f, i) => audio.tone(f, 3.5, 0.045, { when: audio.ctx ? audio.ctx.currentTime + i * 0.12 : undefined })),
];

export function Story() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const visible = useInView(wrapRef, { threshold: 0.4 });
  const [beat, setBeat] = useState(0);
  const st = useRef({ p: 0, playing: false, beat: -1, lastBeatTime: 0, audible: false });

  useEffect(() => {
    if (visible && st.current.p === 0) st.current.playing = true;
  }, [visible]);

  useCanvasLoop(canvasRef, (ctx, w, h, dt, time) => {
    const s = st.current;
    if (s.playing) {
      s.p = Math.min(1, s.p + dt / DURATION);
      if (s.p >= 1) s.playing = false;
    }
    const p = s.p;
    const b = beatOf(p);
    if (b !== s.beat) {
      // heard only when the visitor started or scrubbed the story
      if (s.audible && s.beat !== -1 && b > s.beat) SOUNDS[b]();
      s.beat = b;
      setBeat(b);
    }
    if (handleRef.current) handleRef.current.style.left = `${p * 100}%`;

    const cx = w * 0.5;
    const cy = h * 0.42;
    const ground = h * 0.72;
    const R = Math.min(w, h) * 0.07;
    const L = Math.min(w * 0.6, 520);

    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);

    // ── world
    const wk = smoothstep(AT[7], AT[7] + 0.08, p);
    if (wk > 0) {
      const sky = ctx.createLinearGradient(0, 0, 0, ground);
      sky.addColorStop(0, `rgba(30,28,40,${wk})`);
      sky.addColorStop(0.6, `rgba(190,80,50,${wk})`);
      sky.addColorStop(1, `rgba(255,150,90,${wk})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, ground);
      ctx.fillStyle = `rgba(20,18,22,${wk})`;
      ctx.beginPath();
      ctx.moveTo(0, ground);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, ground - 30 - Math.sin(x * 0.006) * 40 - Math.sin(x * 0.017 + 1) * 18);
      ctx.lineTo(w, ground);
      ctx.fill();
      ctx.fillStyle = `rgba(16,14,18,${wk})`;
      ctx.fillRect(0, ground, w, h - ground);
      ctx.strokeStyle = `rgba(255,140,90,${0.35 * wk})`;
      ctx.lineWidth = 1;
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 6, ground);
        ctx.lineTo(cx + i * w * 0.12, h);
        ctx.stroke();
      }
      for (let j = 1; j < 6; j++) {
        const y = ground + Math.pow(j / 6, 2) * (h - ground);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // ── rhythm: the space starts to pulse
    const rk = smoothstep(AT[6], AT[6] + 0.05, p) * (1 - wk * 0.6);
    const beatPulse = Math.pow(Math.max(0, Math.sin(time * Math.PI * 2)), 8);
    if (rk > 0) {
      ctx.fillStyle = '#141414';
      for (let i = 0; i < 24; i++) {
        const x = (i / 23) * w;
        const hh = (20 + Math.abs(Math.sin(i * 1.7 + time * 3)) * 60 + beatPulse * 50) * rk;
        ctx.globalAlpha = 0.08 * rk;
        ctx.fillRect(x, ground - hh, 3, hh);
      }
      ctx.globalAlpha = 1;
    }

    const ink = wk > 0.5 ? '#f4f2ee' : '#141414';
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;

    // ── ground line appears with weight
    const gk = smoothstep(AT[4], AT[4] + 0.04, p) * (1 - wk);
    if (gk > 0) {
      ctx.globalAlpha = 0.4 * gk;
      ctx.fillRect(w * 0.1, ground, w * 0.8, 1);
      ctx.globalAlpha = 1;
    }

    if (p < AT[3]) {
      // dot → line → shape
      const k1 = local(p, 1);
      const k2 = local(p, 2);
      const breathe = 1 + Math.sin(time * 2) * 0.15;
      if (p < AT[1]) {
        ctx.globalAlpha = smoothstep(0, 0.04, p);
        ctx.beginPath();
        ctx.arc(cx, cy, 6 * breathe, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const half = (L / 2) * smoothstep(0, 1, k1);
        const N = 80;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const sg = (i / N) * 2 - 1;
          const lx = cx + sg * half;
          const ly = cy;
          const th = sg * Math.PI;
          const ox = cx + R * 1.6 * Math.sin(th);
          const oy = cy - R * 1.6 * (1 - Math.cos(th));
          const e = smoothstep(0, 1, k2);
          const x = lerp(lx, ox, e);
          const y = lerp(ly, oy, e);
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.stroke();
        if (k2 === 0) {
          ctx.beginPath();
          ctx.arc(cx + half, cy, 5, 0, Math.PI * 2);
          ctx.arc(cx - half, cy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else {
      // object onwards: two spheres
      const ok = local(p, 3);
      const objY = cy - R * 1.6;
      let ax = cx;
      let ay = objY;
      let ar = lerp(R * 1.6, R, smoothstep(0, 1, local(p, 4) * 3));
      if (p >= AT[4]) {
        const k = local(p, 4);
        // fall and bounce
        const fall = Math.min(1, k / 0.35);
        const bounceT = Math.max(0, k - 0.35) / 0.65;
        const bounce = Math.abs(Math.sin(bounceT * Math.PI * 3)) * Math.exp(-bounceT * 4) * 0.35;
        ay = lerp(objY, ground - R, fall * fall) - bounce * (ground - objY) * (k > 0.35 ? 1 : 0);
      }
      let bx = w + R * 2;
      let by = ground - R;
      let br = R;
      if (p >= AT[5]) {
        const k = local(p, 5);
        const arrive = smoothstep(0, 0.6, k);
        bx = lerp(w + R * 2, cx + R * 2.05, arrive);
        const push = smoothstep(0.55, 1, k);
        ax = cx - push * R * 1.8;
        bx -= push * R * 0.6;
      }
      if (p >= AT[6]) {
        const hop = (ph: number) => Math.abs(Math.sin(time * Math.PI * 2 + ph)) * h * 0.06 * rk;
        ay = ground - R - hop(0);
        by = ground - R - hop(Math.PI / 2);
      }
      if (p >= AT[7]) {
        const k = smoothstep(0, 0.9, local(p, 7));
        bx = lerp(bx, w * 0.72, k);
        by = lerp(by, h * 0.22, k);
        br = lerp(R, R * 2.4, k);
        ay = lerp(ay, ground - R, k);
      }
      // shadows
      if (p >= AT[4]) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        const hA = clamp((ground - R - ay) / (h * 0.3));
        ctx.beginPath();
        ctx.ellipse(ax, ground + 2, ar * lerp(1, 0.5, hA), ar * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p < AT[4]) {
        ctx.globalAlpha = 1 - ok;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, objY, R * 1.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = p < AT[4] ? ok : 1;
      drawSphere(ctx, wk > 0.5 ? 'white' : 'black', ax, ay, ar);
      ctx.globalAlpha = 1;
      if (p >= AT[5]) {
        if (wk > 0) {
          ctx.globalAlpha = wk;
          drawSphere(ctx, 'glow', bx, by, br * 4);
          ctx.globalAlpha = 1;
        }
        drawSphere(ctx, 'orange', bx, by, br);
      }
    }
  });

  const scrub = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    st.current.p = clamp((clientX - r.left) / r.width);
    st.current.playing = false;
    st.current.audible = true;
  };

  return (
    <Panel
      id="story"
      num="10"
      title="Storytelling"
      theme="paper"
      question="Can it speak without words?"
      headline={['Motion and sound', 'can build entire worlds.']}
      body={<p>Two simple shapes, eight steps, no words. Press play and follow the story, or drag the timeline yourself.</p>}
      forYou={{
        text: 'This is how a brand film is built: one idea, given shape, weight, contact, rhythm and a world. One decision at a time, until people feel a story without a single word.',
        uses: ['Brand films', 'Explainers', 'Title sequences'],
      }}
      actions={
        <PillButton
          onClick={() => {
            st.current.p = 0;
            st.current.beat = -1;
            st.current.playing = true;
            st.current.audible = true;
            void audio.enable();
          }}
        >
          Play story
        </PillButton>
      }
    >
      <div className="st-stage" ref={wrapRef}>
        <div className="st-cap" key={beat}>
          <span>
            {String(beat + 1).padStart(2, '0')} / 08 · {BEATS[beat]}
          </span>
          <p>{CAPTIONS[beat]}</p>
        </div>
        <div className="st-canvas">
          <canvas className="fill" ref={canvasRef} />
        </div>
        <div className="st-timeline">
          <span>From a simple idea</span>
          <div
            className="st-track"
            ref={trackRef}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              scrub(e.clientX);
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e.clientX);
            }}
          >
            {BEATS.map((b, i) => (
              <i key={b} className={i <= beat ? 'is-on' : ''} style={{ left: `${AT[i] * 100}%` }} title={b} />
            ))}
            <div className="st-handle" ref={handleRef} />
          </div>
          <span>To a full experience</span>
        </div>
      </div>
    </Panel>
  );
}
