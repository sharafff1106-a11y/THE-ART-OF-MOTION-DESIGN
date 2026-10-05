import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Monitor } from '../components/Monitor';
import { Segment } from '../components/Controls';
import { Panel } from '../components/Panel';
import { brandStore } from '../brand/brands';
import { useArmedSound, useCanvasLoop } from '../motion/hooks';
import { drawSub, serif } from '../motion/kora';
import { clamp, crossed, easeOut, lerp } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 09 — SILENCE
 * The last seconds of the KORA ad: music builds, then the logo lands —
 * straight away, or after a beat of silence.
 */
const BEAT = 0.3;
const MUSIC = BEAT * 8;
const TAIL = 1.8;
type Mode = 'none' | 'pause';

export function Silence() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { armed, arm, visible } = useArmedSound(wrapRef);
  const [mode, setMode] = useState<Mode>('pause');
  const modeRef = useRef<Mode>('pause');
  const st = useRef({ t0: performance.now() / 1000, prev: 0 });


  // plays once when it comes into view, then rests on the last frame
  const replay = () => {
    st.current.t0 = performance.now() / 1000;
    st.current.prev = 0;
  };
  useEffect(() => {
    if (visible) replay();
  }, [visible]);

  useCanvasLoop(canvasRef, (ctx, w, h) => {
    const s = st.current;
    const pause = modeRef.current === 'pause' ? 1 : 0;
    const reveal = MUSIC + pause;
    const t = Math.min(performance.now() / 1000 - s.t0, reveal + TAIL);
    if (armed.current) {
      for (let i = 0; i < 8; i++) {
        if (crossed(s.prev, t, i * BEAT)) {
          audio.kick(i % 2 ? 0.3 : 0.5);
          audio.tone(i < 4 ? 110 : 130.8, BEAT * 0.9, 0.05, { send: 0.05 });
        }
        if (crossed(s.prev, t, i * BEAT + BEAT / 2)) audio.wood(2100, 0.1);
      }
      if (crossed(s.prev, t, MUSIC - 1.1)) audio.whoosh(1.1, 0.14);
      if (crossed(s.prev, t, reveal)) {
        audio.impact(1, 1);
        [261.6, 392, 523.3].forEach((f, i) => audio.tone(f, 2.2, 0.04, { when: audio.ctx!.currentTime + 0.02 + i * 0.03, send: 0.7 }));
      }
    }
    s.prev = t;

    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h * 0.45;
    if (t < MUSIC) {
      const kick = Math.exp(-((t % BEAT) / BEAT) * 6);
      const build = t / MUSIC;
      ctx.strokeStyle = '#ff5a1f';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.globalAlpha = (0.6 - i * 0.12) * (0.4 + build * 0.6);
        ctx.beginPath();
        ctx.arc(cx, cy, (h * 0.14 + i * h * 0.08) * (1 + kick * 0.1 * (1 + build)), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + kick * 0.05, 1 + kick * 0.05);
      brandStore.get().draw(ctx, 0, 0, h * 0.34);
      ctx.restore();
      drawSub(ctx, w, h, '[ music builds ]');
    } else if (t < reveal) {
      // nothing moves
      ctx.fillStyle = 'rgba(239,233,223,0.3)';
      ctx.fillRect(cx - w * 0.06, cy, w * 0.12, 1);
      drawSub(ctx, w, h, '[ silence ]', 0.8);
    } else {
      const e = t - reveal;
      const flash = Math.exp(-e * 5);
      ctx.globalAlpha = flash * 0.9;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.5 * (1 - e / (TAIL + 0.4));
      drawSphere(ctx, 'glow', cx, cy, h * 0.7);
      ctx.globalAlpha = 1;
      const k = easeOut(clamp(e * 3));
      ctx.fillStyle = '#efe9df';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = serif(h * 0.22 * lerp(1.14, 1, k));
      ctx.fillText(brandStore.get().name, cx, cy);
      if (e < 0.8) drawSub(ctx, w, h, '[ IMPACT ]', e < 0.6 ? 1 : 1 - (e - 0.6) / 0.2);
    }

    // the soundtrack as a strip along the bottom edge
    const y = h - 6;
    const X = (v: number) => (v / (reveal + TAIL)) * w;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, y, X(MUSIC), 2);
    ctx.fillStyle = 'rgba(140,165,255,0.6)';
    if (pause) ctx.fillRect(X(MUSIC), y, X(reveal) - X(MUSIC), 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(X(reveal), y - 4, 2, 10);
    ctx.fillStyle = '#ff5a1f';
    ctx.fillRect(0, y, X(Math.min(t, reveal + TAIL)), 2);
  });

  const choose = (m: Mode) => {
    void arm();
    setMode(m);
    modeRef.current = m;
    replay();
  };

  return (
    <Panel id="silence" num="09" title="Silence" theme="night" headline={['The pause', 'makes the hit.']} body={<p>Compare both endings. Headphones help.</p>}>
      <Monitor
        canvasRef={canvasRef}
        wrapRef={wrapRef}
        onReplay={replay}
        caption={<span className="mon-word" key={mode}>{mode === 'pause' ? 'One second of silence, and the logo hits harder.' : 'No pause. The logo just arrives.'}</span>}
        controls={
          <Segment
            boxed
            options={[
              { id: 'none', label: 'No pause' },
              { id: 'pause', label: 'With pause' },
            ]}
            value={mode}
            onChange={choose}
          />
        }
      />
    </Panel>
  );
}
