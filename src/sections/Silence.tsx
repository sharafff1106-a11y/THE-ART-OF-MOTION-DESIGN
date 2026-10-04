import { useMemo, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { PillButton, Slider } from '../components/Controls';
import { Panel } from '../components/Panel';
import { useCanvasLoop, useSoundEnabled } from '../motion/hooks';
import { drawHeadphones } from '../motion/kora';
import { clamp, easeOut, lerp } from '../motion/math';
import { drawSphere } from '../motion/sprites';

/**
 * 09 — SILENCE
 * The final seconds of the KORA ad: music builds, stops, then the logo lands.
 * The visitor sets the length of the silence and hears what it does.
 */
const BEAT = 0.3;
const BEATS = 8;
const MUSIC = BEAT * BEATS;
const TAIL = 2.2;

export function Silence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundOn = useSoundEnabled();
  const [pause, setPause] = useState(0.8);
  const [noticed, setNoticed] = useState(false);
  const pauseRef = useRef(0.8);
  const st = useRef({ t0: -1, pause: 0.8, played: false });
  const bars = useMemo(() => Array.from({ length: 96 }, (_, i) => (i % 12 === 0 ? 1 : 0.35 + Math.random() * 0.4) * (0.5 + (i / 96) * 0.5)), []);

  const play = async (p = pauseRef.current) => {
    await audio.enable();
    const s = st.current;
    s.pause = p;
    s.t0 = performance.now() / 1000 + 0.08;
    s.played = false;
    if (!audio.live) return;
    const t0 = audio.at(s.t0);
    for (let i = 0; i < BEATS; i++) {
      const when = t0 + i * BEAT;
      audio.kick(i % 2 ? 0.3 : 0.5, { when });
      audio.wood(2100, 0.12, { when: when + BEAT / 2 });
      audio.tone(i < 4 ? 110 : 130.8, BEAT * 0.9, 0.05, { when, send: 0.05 });
    }
    audio.whoosh(1.3, 0.16, { when: t0 + MUSIC - 1.3 });
    const reveal = t0 + MUSIC + p;
    audio.impact(1, 1, { when: reveal });
    [261.6, 392, 523.3].forEach((f, i) => audio.tone(f, 2.6, 0.04, { when: reveal + 0.02 + i * 0.03, send: 0.7 }));
  };

  useCanvasLoop(canvasRef, (ctx, w, h, _dt, time) => {
    const s = st.current;
    const now = performance.now() / 1000;
    const e = s.t0 < 0 ? -1 : now - s.t0;
    const p = s.t0 < 0 ? pauseRef.current : s.pause;
    const reveal = MUSIC + p;
    const total = reveal + TAIL;
    const phase = e < 0 ? 'idle' : e < MUSIC ? 'music' : e < reveal ? 'silence' : e < total ? 'reveal' : 'done';
    if (phase === 'done' && !s.played) {
      s.played = true;
      if (s.pause >= 0.4) setNoticed(true);
    }

    ctx.clearRect(0, 0, w, h);
    // ── the screen
    const sw = Math.min(w * 0.9, (h * 0.58 * 16) / 9);
    const sh = (sw * 9) / 16;
    const sx = (w - sw) / 2;
    const sy = h * 0.04;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    ctx.fillStyle = '#0b0b0d';
    ctx.fillRect(sx, sy, sw, sh);
    const cx = sx + sw / 2;
    const cy = sy + sh / 2;
    if (phase === 'music') {
      const b = (e % BEAT) / BEAT;
      const kick = Math.exp(-b * 6);
      const build = e / MUSIC;
      ctx.strokeStyle = '#ff5a1f';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const r = (sh * 0.15 + i * sh * 0.09) * (1 + kick * 0.08 * (1 + build));
        ctx.globalAlpha = (0.6 - i * 0.12) * (0.5 + build * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1 + kick * 0.05, 1 + kick * 0.05);
      drawHeadphones(ctx, 0, 0, sh * 0.32);
      ctx.restore();
    } else if (phase === 'silence') {
      // total stillness: one thin line, nothing moves
      ctx.fillStyle = 'rgba(239,233,223,0.35)';
      ctx.fillRect(cx - sw * 0.08, cy, sw * 0.16, 1);
    } else if (phase === 'reveal' || phase === 'done') {
      const r = phase === 'done' ? 1 : clamp((e - reveal) / TAIL);
      const flash = Math.exp(-(e - reveal) * 5);
      if (phase === 'reveal') {
        ctx.globalAlpha = flash * 0.9;
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.globalAlpha = 0.6;
        drawSphere(ctx, 'glow', cx, cy, sh * lerp(0.9, 0.6, r));
      }
      ctx.globalAlpha = 1;
      const k = easeOut(clamp(r * 3));
      ctx.fillStyle = '#efe9df';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${sh * 0.22 * lerp(1.12, 1, k)}px "Instrument Serif", Georgia, serif`;
      ctx.fillText('KORA', cx, cy - sh * 0.03);
      ctx.globalAlpha = clamp((r - 0.25) * 3);
      ctx.font = `600 ${Math.max(8, sh * 0.04)}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = '#b8b2a8';
      ctx.fillText('HEAR EVERYTHING.', cx, cy + sh * 0.16);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = 'rgba(239,233,223,0.4)';
      ctx.textAlign = 'center';
      ctx.font = '600 10px "IBM Plex Mono", monospace';
      ctx.fillText('PRESS PLAY', cx, cy + 4 + Math.sin(time * 1.5) * 1);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);

    // ── the soundtrack, drawn as a waveform
    const tx = sx;
    const tw = sw;
    const ty = sy + sh + 70;
    const X = (t: number) => tx + (t / total) * tw;
    ctx.textAlign = 'left';
    ctx.font = '600 9px "IBM Plex Mono", monospace';
    // music
    const bw = (X(MUSIC) - tx) / bars.length;
    bars.forEach((v, i) => {
      const t = (i / bars.length) * MUSIC;
      const played = e >= t;
      ctx.fillStyle = played ? '#ff7a3d' : 'rgba(255,255,255,0.35)';
      const bh = v * 36;
      ctx.fillRect(tx + i * bw, ty - bh / 2, Math.max(1, bw * 0.6), bh);
    });
    // silence
    if (p > 0.02) {
      ctx.fillStyle = 'rgba(120,150,255,0.08)';
      ctx.fillRect(X(MUSIC), ty - 30, X(reveal) - X(MUSIC), 60);
      ctx.fillStyle = 'rgba(160,180,255,0.9)';
      ctx.fillText(`SILENCE ${p.toFixed(1)}s`, X(MUSIC) + 4, ty - 36);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(X(MUSIC), ty, X(reveal) - X(MUSIC), 1);
    }
    // impact and tail
    for (let i = 0; i < 40; i++) {
      const t = reveal + (i / 40) * TAIL;
      const v = Math.exp(-i / 7);
      ctx.fillStyle = e >= t ? '#ffffff' : 'rgba(255,255,255,0.35)';
      const bh = 4 + v * 56;
      ctx.fillRect(X(t), ty - bh / 2, 2, bh);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('MUSIC', tx, ty + 46);
    ctx.fillText('LOGO', X(reveal), ty + 46);
    if (e >= 0 && e <= total) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(X(e), ty - 34, 1, 68);
    }
  });

  return (
    <Panel
      id="silence"
      num="09"
      title="Silence"
      theme="night"
      question="When should it be quiet?"
      headline={['Silence is also', 'a design tool.']}
      body={
        <>
          <p>The last seconds of the KORA ad. The music builds, then stops. Set how long the silence lasts before the logo lands, and listen.</p>
          <p className={`sl-noticed ${noticed ? 'is-on' : ''}`}>You noticed it.</p>
        </>
      }
      forYou={{
        text: 'A beat of silence before the reveal, the drop or the logo makes the moment hit harder. Knowing when to stop is part of the craft.',
        uses: ['Logo reveals', 'Trailers', 'Product drops', 'Keynotes'],
      }}
      actions={
        <div className="sl-actions">
          <div className="sl-slider">
            <Slider
              label="Silence before the logo"
              min={0}
              max={1.5}
              value={pause}
              format={(v) => `${v.toFixed(1)} s`}
              onChange={(v) => {
                setPause(v);
                pauseRef.current = v;
              }}
            />
          </div>
          <div className="sl-buttons">
            <PillButton icon="play" onClick={() => play()}>
              Play
            </PillButton>
            <button
              className="sl-quick"
              onClick={() => {
                setPause(0);
                pauseRef.current = 0;
                void play(0);
              }}
            >
              No pause
            </button>
            <button
              className="sl-quick"
              onClick={() => {
                setPause(0.9);
                pauseRef.current = 0.9;
                void play(0.9);
              }}
            >
              With pause
            </button>
          </div>
          {!soundOn && <p className="sl-hint-text">Best with sound on.</p>}
        </div>
      }
    >
      <canvas className="fill" ref={canvasRef} />
    </Panel>
  );
}
