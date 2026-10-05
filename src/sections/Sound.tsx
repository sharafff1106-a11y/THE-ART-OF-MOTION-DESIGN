import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useArmedSound, useCanvasLoop } from '../motion/hooks';
import { drawBackdrop, drawHeadphones, drawSub, serif } from '../motion/kora';
import { clamp, crossed, easeOut, lerp } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 07 — SOUND
 * The KORA case closes: headphones drop in, the lid snaps, the light comes on.
 * The pictures never change. Switch the sound on and it becomes real.
 */
const CYCLE = 3.6;
const LAND = 0.85;
const SNAP = 1.6;
const LED = 2.1;
const EVENTS = [
  { at: LAND, label: '[ soft thud ]' },
  { at: SNAP, label: '[ metal snap ]' },
  { at: LED, label: '[ bright chime ]' },
];

export function Sound() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { armed, arm } = useArmedSound(wrapRef);
  const [on, setOn] = useState<'off' | 'on'>('off');
  const onRef = useRef(false);
  const st = useRef({ t0: performance.now() / 1000, prev: 0 });

  useCanvasLoop(canvasRef, (ctx, w, h) => {
    const s = st.current;
    const t = (performance.now() / 1000 - s.t0) % CYCLE;
    const live = onRef.current && armed.current;
    if (live) {
      if (crossed(s.prev, t, 0.35)) audio.whoosh(0.45, 0.08);
      if (crossed(s.prev, t, LAND)) audio.impact(0.45, 0.6);
      if (crossed(s.prev, t, SNAP)) {
        audio.burst(3200, 6, 0.03, 0.4);
        audio.impact(0.25, 0.45);
      }
      if (crossed(s.prev, t, LED)) [880, 1318.5].forEach((f, i) => audio.tone(f, 1.4, 0.04, { when: audio.ctx!.currentTime + i * 0.07, send: 0.5 }));
    }
    s.prev = t;

    drawBackdrop(ctx, w, h, '#1a1918', '#0b0b0a', 'rgba(255,255,255,0.05)');
    const floor = h * 0.74;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, floor, w, 1);
    const fade = t > CYCLE - 0.35 ? 1 - (t - (CYCLE - 0.35)) / 0.35 : Math.min(1, t / 0.2);
    ctx.globalAlpha = fade;

    const cw = h * 0.62;
    const ch = h * 0.24;
    const cx = w / 2;
    const baseY = floor - ch;
    // headphones drop into the case
    const drop = clamp((t - 0.3) / (LAND - 0.3));
    const hy = lerp(h * 0.05, baseY + ch * 0.32, drop * drop);
    const settle = t > LAND ? Math.exp(-(t - LAND) * 10) * Math.sin((t - LAND) * 40) * h * 0.006 : 0;
    drawHeadphones(ctx, cx, hy + settle, h * 0.27, '#d9d4cb', '#ff5a1f');
    // case base (front plate)
    ctx.fillStyle = '#2a2826';
    ctx.beginPath();
    ctx.roundRect(cx - cw / 2, baseY, cw, ch, ch * 0.3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(cx - cw / 2 + 6, baseY + 4, cw - 12, 2);
    // the lid, hinged at the back
    const close = easeOut(clamp((t - (SNAP - 0.4)) / 0.4));
    const ang = lerp(-1.95, 0, close * close);
    ctx.save();
    ctx.translate(cx - cw / 2, baseY);
    ctx.rotate(ang);
    ctx.fillStyle = '#34312e';
    ctx.beginPath();
    ctx.roundRect(0, -ch * 0.38, cw, ch * 0.38, ch * 0.16);
    ctx.fill();
    ctx.restore();
    // the light
    const led = t > LED ? 1 : 0;
    if (led) {
      ctx.globalAlpha = fade * 0.8;
      drawSphere(ctx, 'glow', cx + cw * 0.36, baseY + ch * 0.5, h * 0.09);
      ctx.globalAlpha = fade;
    }
    ctx.fillStyle = led ? '#ffb48a' : '#4a4643';
    ctx.beginPath();
    ctx.arc(cx + cw * 0.36, baseY + ch * 0.5, h * 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(239,233,223,0.55)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = serif(ch * 0.4);
    ctx.fillText('KORA', cx - cw * 0.1, baseY + ch * 0.55);
    ctx.globalAlpha = 1;

    // what you would hear, written on screen
    if (onRef.current) {
      for (const e of EVENTS) {
        const age = t - e.at;
        if (age >= 0 && age < 0.9) drawSub(ctx, w, h, e.label, age < 0.7 ? 1 : 1 - (age - 0.7) / 0.2);
      }
    }
  });

  return (
    <Panel id="sound" num="07" title="Sound" theme="dark" headline={['Now', 'listen.']} body={<p>Same pictures. Turn the sound on.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        caption={<span className="mon-word" key={on}>{on === 'on' ? 'Feels real.' : 'Looks fine.'}</span>}
        controls={
          <Segment
            boxed
            options={[
              { id: 'off', label: 'Sound off' },
              { id: 'on', label: 'Sound on' },
            ]}
            value={on}
            onChange={(v) => {
              setOn(v);
              onRef.current = v === 'on';
              if (v === 'on') {
                void arm();
                st.current.t0 = performance.now() / 1000;
              }
            }}
          />
        }
      />
    </Panel>
  );
}
