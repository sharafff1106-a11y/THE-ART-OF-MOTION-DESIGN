import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { audio } from '../audio/engine';
import { useInView, useSoundEnabled } from '../motion/hooks';
import { scrollToId } from '../motion/scroll';

/**
 * 01 — The pitch, demonstrated on one sentence.
 * The visitor switches Motion and Sound on and off and experiences what
 * each one adds to exactly the same words.
 */
const LINES = [['Your', 'message'], ['deserves', 'to', 'be'], ['felt.']];
const CAPTIONS = {
  none: 'Words alone. You read them, and you move on.',
  motion: 'Motion gives the same words timing, order and personality. Your eye follows them.',
  sound: 'Sound alone sets a mood, but there is nothing to watch.',
  both: 'Together, the same words become a moment people feel. That is what I design for brands.',
};

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLHeadingElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const idle = useRef<gsap.core.Tween | null>(null);
  const shown = useInView(ref, { threshold: 0.1, once: true });
  const soundOn = useSoundEnabled();
  const [motion, setMotion] = useState(false);
  const [sound, setSound] = useState(false);
  const [hint, setHint] = useState(false);
  const state = motion && sound ? 'both' : motion ? 'motion' : sound ? 'sound' : 'none';

  // if sound is switched off globally, the hero follows
  useEffect(() => {
    if (!soundOn) setSound(false);
  }, [soundOn]);

  // invite the first click after a moment of stillness
  useEffect(() => {
    if (motion || sound) return setHint(false);
    const id = window.setTimeout(() => setHint(true), 2200);
    return () => window.clearTimeout(id);
  }, [motion, sound]);

  const reset = () => {
    tl.current?.kill();
    idle.current?.kill();
    const q = gsap.utils.selector(stageRef);
    gsap.set(q('.hk-ch'), { clearProps: 'all' });
    gsap.set(q('.hk-felt'), { clearProps: 'all' });
    gsap.set(q('.hk-line-draw'), { strokeDashoffset: 1 });
  };

  const run = (withMotion: boolean, withSound: boolean) => {
    reset();
    const q = gsap.utils.selector(stageRef);
    const t = gsap.timeline();
    const sfx = (fn: () => void) => () => {
      if (withSound) fn();
    };
    const l1 = q('.hk-l0 .hk-ch');
    const l2 = q('.hk-l1 .hk-ch');
    if (withMotion) {
      t.from(l1, { yPercent: 115, rotate: 8, opacity: 0, duration: 0.9, ease: 'back.out(1.7)', stagger: 0.04 }, 0)
        .from(l2, { yPercent: -110, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.025 }, 0.75)
        // anticipation: the last word gathers itself before it lands
        .fromTo(q('.hk-felt'), { scale: 0.6, opacity: 0, yPercent: 20 }, { scale: 0.86, opacity: 1, yPercent: 0, duration: 0.45, ease: 'power2.out' }, 1.45)
        .to(q('.hk-felt'), { scale: 1, color: '#ff5a1f', duration: 1.1, ease: 'elastic.out(1, 0.45)' }, 2.05)
        .to(q('.hk-line-draw'), { strokeDashoffset: 0, duration: 0.7, ease: 'power3.inOut' }, 2.3);
    } else {
      t.to({}, { duration: 2.6 });
    }
    // the same score plays whether or not there is anything to watch
    l1.forEach((_, i) => t.call(sfx(() => audio.click(1700 + i * 140, 0.1)), [], i * 0.04 + 0.12));
    t.call(sfx(() => audio.whoosh(0.6, 0.14)), [], 0.7)
      .call(sfx(() => audio.tone(220, 0.9, 0.04)), [], 1.45)
      .call(sfx(() => audio.impact(0.7, 0.8)), [], 2.05)
      .call(sfx(() => [523.3, 659.3, 784].forEach((f, i) => audio.tone(f, 2.2, 0.035, { when: audio.ctx ? audio.ctx.currentTime + i * 0.06 : undefined }))), [], 2.1);
    if (withMotion) {
      t.call(() => {
        idle.current = gsap.to(q('.hk-felt'), { yPercent: -4, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
    }
    tl.current = t;
  };

  useLayoutEffect(() => () => reset(), []);

  const toggleMotion = () => {
    const m = !motion;
    setMotion(m);
    audio.click(m ? 2200 : 1400, 0.1);
    run(m, sound);
  };
  const toggleSound = async () => {
    const s = !sound;
    if (s) await audio.enable();
    setSound(s);
    run(motion, s);
  };

  return (
    <section ref={ref} id="understanding" data-theme="ivory" data-num="01" className={`panel panel--ivory hero hero--type ${shown ? 'is-in' : ''} is-${state}`}>
      <div className="hk-top">
        <p className="hero-eyebrow">Gaurav · Motion &amp; Sound Designer</p>
        <p className="hk-intro">
          A short, interactive presentation of what motion and sound can do for your brand. Start with this one sentence.
        </p>
      </div>

      <h1 className="hk-stage" ref={stageRef} aria-label="Your message deserves to be felt.">
        {LINES.map((line, li) => (
          <span key={li} className={`hk-line hk-l${li}`} aria-hidden>
            {line.map((word, wi) =>
              li === 2 ? (
                <span key={wi} className="hk-w hk-felt">
                  {word}
                  <svg className="hk-under" viewBox="0 0 200 20" preserveAspectRatio="none">
                    <path className="hk-line-draw" d="M2 14 C 60 4, 140 4, 198 12" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
                  </svg>
                </span>
              ) : (
                <span key={wi} className="hk-w">
                  {[...word].map((c, ci) => (
                    <span key={ci} className="hk-ch">
                      {c}
                    </span>
                  ))}
                </span>
              ),
            )}
          </span>
        ))}
      </h1>

      <div className="hk-controls">
        <div className="hk-switches">
          <button className={`hk-switch ${motion ? 'is-on' : ''} ${hint && !motion ? 'is-hint' : ''}`} onClick={toggleMotion} aria-pressed={motion}>
            <span className="hk-sw">
              <i />
            </span>
            Motion
          </button>
          <button className={`hk-switch ${sound ? 'is-on' : ''}`} onClick={toggleSound} aria-pressed={sound}>
            <span className="hk-sw">
              <i />
            </span>
            Sound
          </button>
          <button className="hk-replay" onClick={() => run(motion, sound)} disabled={!motion && !sound}>
            ↻ Replay
          </button>
        </div>
        <p className="hk-caption" key={state}>
          {CAPTIONS[state]}
        </p>
      </div>

      <button className="hk-start" onClick={() => scrollToId('attention')}>
        <span>Start the presentation</span>
        <span className="hk-start-ico">↓</span>
      </button>
    </section>
  );
}
