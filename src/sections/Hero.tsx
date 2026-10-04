import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { audio } from '../audio/engine';
import { useInView } from '../motion/hooks';
import { scrollToId } from '../motion/scroll';

/**
 * 01 — The pitch.
 * One fictional product (KORA headphones), one six-second launch film.
 * Flip between the static frame and the same frame designed with motion
 * and sound — the whole presentation in a single comparison.
 */
export const AGENDA = [
  { id: 'attention', n: '02', t: 'Attention', q: 'Where will people look?' },
  { id: 'timing', n: '03', t: 'Timing', q: 'How should it feel?' },
  { id: 'weight', n: '04', t: 'Weight', q: 'Is it believable?' },
  { id: 'rhythm', n: '05', t: 'Rhythm', q: 'Does the edit feel right?' },
  { id: 'contrast', n: '06', t: 'Contrast', q: 'What matters most?' },
  { id: 'sound', n: '07', t: 'Sound', q: 'Does it feel real?' },
  { id: 'emotion', n: '08', t: 'Emotion', q: 'What should people feel?' },
  { id: 'silence', n: '09', t: 'Silence', q: 'When should it be quiet?' },
  { id: 'story', n: '10', t: 'Story', q: 'Can it speak without words?' },
  { id: 'process', n: '11', t: 'Process', q: 'How do we work together?' },
  { id: 'possibilities', n: '12', t: 'Possibilities', q: 'Where can it go?' },
];

const BEATS = [
  { at: 0.2, label: 'Idea' },
  { at: 0.7, label: 'Shape' },
  { at: 1.5, label: 'Weight' },
  { at: 2.1, label: 'Sound' },
  { at: 2.6, label: 'Type' },
  { at: 3.3, label: 'Message' },
  { at: 3.9, label: 'Action' },
];
const LETTERS = ['K', 'O', 'R', 'A'];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const withSound = useRef(false);
  const [mode, setMode] = useState<'motion' | 'static'>('motion');
  const [beat, setBeat] = useState(-1);
  const shown = useInView(ref, { threshold: 0.1, once: true });
  const visible = useInView(ref, { threshold: 0.2 });

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(svgRef);
      const sfx = (fn: () => void) => () => {
        if (withSound.current) fn();
      };
      const t = gsap.timeline({
        paused: true,
        repeat: -1,
        repeatDelay: 1.8,
        onUpdate: () => {
          if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, t.time() / 4.4)})`;
        },
        // the film plays with sound once per click, then loops silently
        onRepeat: () => {
          withSound.current = false;
        },
      });
      t.set(q('.k-dot'), { scale: 0, transformOrigin: '50% 50%', x: 0, y: 0, opacity: 1 })
        .set(q('.k-band'), { strokeDashoffset: 1 })
        .set(q('.k-cup'), { y: -170, opacity: 0 })
        .set(q('.k-wave'), { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' })
        .set(q('.k-letter'), { y: 34, opacity: 0 })
        .set(q('.k-tag'), { opacity: 0, y: 8 })
        .set(q('.k-cta'), { scale: 0, transformOrigin: '320px 318px' })
        .set(q('.k-flash'), { opacity: 0 })
        .set(q('.k-scene'), { x: 0, y: 0 });

      // idea: a single point
      t.to(q('.k-dot'), { scale: 1, duration: 0.45, ease: 'back.out(3)' }, 0.2).call(sfx(() => audio.tick(0.18)), [], 0.2);
      // shape: the point travels and draws the headband
      t.to(q('.k-dot'), { x: -70, y: 22, duration: 0.45, ease: 'power3.inOut' }, 0.7)
        .call(sfx(() => audio.whoosh(0.7, 0.14)), [], 0.7)
        .to(q('.k-band'), { strokeDashoffset: 0, duration: 0.75, ease: 'power2.inOut' }, 0.95)
        .to(q('.k-dot'), { opacity: 0, duration: 0.2 }, 1.05);
      // weight: the ear cups drop and land
      t.to(q('.k-cup'), { y: 0, opacity: 1, duration: 0.55, ease: 'bounce.out', stagger: 0.09 }, 1.5)
        .call(sfx(() => audio.impact(0.62, 0.7, { pan: -0.4 })), [], 1.78)
        .call(sfx(() => audio.impact(0.62, 0.6, { pan: 0.4 })), [], 1.87)
        .to(q('.k-scene'), { keyframes: [{ y: 4 }, { y: -2 }, { y: 1 }, { y: 0 }], duration: 0.3, ease: 'none' }, 1.8)
        .to(q('.k-flash'), { keyframes: [{ opacity: 0.18 }, { opacity: 0 }], duration: 0.4 }, 1.8);
      // sound: waves pulse out on a beat
      [0, 1, 2].forEach((i) => {
        t.fromTo(q(`.k-wave-${i}`), { opacity: 0.9, scale: 0.7 }, { opacity: 0, scale: 1.5, duration: 0.9, ease: 'power2.out' }, 2.1 + i * 0.22).call(
          sfx(() => audio.wood(1500 + i * 300, 0.16)),
          [],
          2.1 + i * 0.22,
        );
      });
      // type: the name arrives letter by letter
      t.to(q('.k-letter'), { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07 }, 2.6);
      LETTERS.forEach((_, i) => t.call(sfx(() => audio.click(2400 + i * 200, 0.08)), [], 2.6 + i * 0.07));
      // message
      t.to(q('.k-tag'), { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 3.3).call(sfx(() => audio.tone(523, 1.8, 0.035)), [], 3.3);
      // action
      t.to(q('.k-cta'), { scale: 1, duration: 0.6, ease: 'back.out(2.2)' }, 3.9).call(
        sfx(() => [784, 1047].forEach((f, i) => audio.tone(f, 1.4, 0.035, { when: audio.ctx ? audio.ctx.currentTime + i * 0.08 : undefined }))),
        [],
        3.9,
      );
      t.to({}, { duration: 0.5 }, 4.4);
      BEATS.forEach((b, i) => t.call(() => setBeat(i), [], b.at));
      t.call(() => setBeat(-1), [], 0);
      tl.current = t;
    }, svgRef);
    return () => ctx.revert();
  }, []);

  // only animate while the hero is on screen
  useLayoutEffect(() => {
    const t = tl.current;
    if (!t) return;
    if (mode === 'static') {
      t.pause();
      t.seek(4.45, false);
      return;
    }
    if (visible) t.play();
    else t.pause();
  }, [visible, mode]);

  const playWithSound = async () => {
    await audio.enable();
    setMode('motion');
    withSound.current = true;
    tl.current?.restart();
  };

  return (
    <section ref={ref} id="understanding" data-theme="ivory" data-num="01" className={`panel panel--ivory hero ${shown ? 'is-in' : ''}`}>
      <div className="hero-copy">
        <p className="hero-eyebrow">Gaurav · Motion &amp; Sound Designer</p>
        <h1 className="hero-h">
          <span className="line">
            <span style={{ ['--i' as string]: 0 }}>What motion &amp; sound</span>
          </span>
          <span className="line">
            <span style={{ ['--i' as string]: 1 }}>
              can do for <em>your brand.</em>
            </span>
          </span>
        </h1>
        <p className="hero-body">
          An interactive presentation in eleven short chapters. Each one lets you play with a single idea, then shows where it lives in
          real work: ads, product launches, apps and brand films.
        </p>
        <div className="hero-actions">
          <button className="pill pill--solid" onClick={() => scrollToId('attention')}>
            Start the presentation <span className="pill-ico">↓</span>
          </button>
          <button className="pill" onClick={playWithSound}>
            <span className="pill-ico">▶</span> Play the film with sound
          </button>
        </div>
      </div>

      <figure className="hero-stage">
        <div className="hero-stage-head">
          <span>KORA · Launch film · 0:04</span>
          <div className="hero-switch" role="radiogroup" aria-label="Version">
            <button role="radio" aria-checked={mode === 'static'} className={mode === 'static' ? 'is-on' : ''} onClick={() => setMode('static')}>
              Static
            </button>
            <button
              role="radio"
              aria-checked={mode === 'motion'}
              className={mode === 'motion' ? 'is-on' : ''}
              onClick={() => {
                setMode('motion');
                tl.current?.restart();
              }}
            >
              Motion + sound
            </button>
          </div>
        </div>
        <div className={`hero-screen ${mode === 'static' ? 'is-static' : ''}`}>
          <svg ref={svgRef} viewBox="0 0 640 360" role="img" aria-label="KORA headphones launch film">
            <defs>
              <radialGradient id="kbg" cx="50%" cy="42%" r="70%">
                <stop offset="0" stopColor="#262422" />
                <stop offset="1" stopColor="#0d0c0b" />
              </radialGradient>
              <linearGradient id="kcup" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ff7a45" />
                <stop offset="1" stopColor="#d9400f" />
              </linearGradient>
            </defs>
            <rect width="640" height="360" fill="url(#kbg)" />
            <g className="k-scene">
              {[0, 1, 2].map((i) => (
                <g key={i} className={`k-wave k-wave-${i}`}>
                  <path d="M 214 184 A 40 40 0 0 0 214 244" fill="none" stroke="#ff6a2c" strokeWidth="2" />
                  <path d="M 426 184 A 40 40 0 0 1 426 244" fill="none" stroke="#ff6a2c" strokeWidth="2" />
                </g>
              ))}
              <path className="k-band" d="M 250 206 A 70 70 0 0 1 390 206" fill="none" stroke="#efe9df" strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray="1" />
              <rect className="k-cup" x="230" y="186" width="38" height="62" rx="15" fill="url(#kcup)" />
              <rect className="k-cup" x="372" y="186" width="38" height="62" rx="15" fill="url(#kcup)" />
              <circle className="k-dot" cx="320" cy="184" r="7" fill="#ff6a2c" />
              {LETTERS.map((l, i) => (
                <text key={l} className="k-letter" x={262 + i * 39} y="98" fill="#efe9df" fontFamily="Instrument Serif, Georgia, serif" fontSize="52" textAnchor="middle">
                  {l}
                </text>
              ))}
              <text className="k-tag" x="320" y="284" fill="#b8b2a8" fontFamily="IBM Plex Mono, monospace" fontSize="11" letterSpacing="3" textAnchor="middle">
                HEAR EVERYTHING.
              </text>
              <g className="k-cta">
                <rect x="276" y="304" width="88" height="28" rx="14" fill="#efe9df" />
                <text x="320" y="322" fill="#141414" fontFamily="IBM Plex Mono, monospace" fontSize="9.5" letterSpacing="2" textAnchor="middle">
                  PRE-ORDER
                </text>
              </g>
            </g>
            <rect className="k-flash" width="640" height="360" fill="#fff" pointerEvents="none" />
          </svg>
          <div className="hero-progress">
            <div className="hero-progress-bar" ref={barRef} />
          </div>
        </div>
        <div className="hero-beats">
          {BEATS.map((b, i) => (
            <span key={b.label} className={mode === 'static' || i <= beat ? 'is-on' : ''}>
              {b.label}
            </span>
          ))}
        </div>
        <figcaption className="hero-caption">
          {mode === 'static' ? (
            <>
              <b>Static.</b> The same design, standing still. It gives information.
            </>
          ) : (
            <>
              <b>Motion + sound.</b> The same design, given timing, weight and sound. It becomes a moment people remember.
            </>
          )}
        </figcaption>
        <p className="hero-note">KORA is a fictional product. You'll see it again in later chapters.</p>
      </figure>

      <nav className="hero-agenda" aria-label="Chapters">
        {AGENDA.map((a) => (
          <button key={a.id} onClick={() => scrollToId(a.id)}>
            <span className="ag-n">{a.n}</span>
            <span className="ag-t">{a.t}</span>
            <span className="ag-q">{a.q}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}
