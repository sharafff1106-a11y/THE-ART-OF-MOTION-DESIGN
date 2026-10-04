import { lazy, useEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { Lazy3D } from '../components/Lazy3D';
import { useInView } from '../motion/hooks';
import { scrollToId } from '../motion/scroll';

const Hero3D = lazy(() => import('./Hero3D'));
const STAGES = ['Idea', 'Shape', 'Motion', 'Sound', 'Emotion', 'Impact'];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const shown = useInView(ref, { threshold: 0.1, once: true });
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section ref={ref} id="understanding" data-theme="ivory" data-num="01" className={`panel panel--ivory hero ${shown ? 'is-in' : ''}`}>
      <div className="hero-visual">
        <Lazy3D scene={Hero3D} props={{}} />
      </div>
      <div className="hero-copy">
        <h1 className="hero-h">
          <span className="line">
            <span style={{ ['--i' as string]: 0 }}>The Art of</span>
          </span>
          <span className="line">
            <span style={{ ['--i' as string]: 1 }}>Motion &amp;</span>
          </span>
          <span className="line">
            <span style={{ ['--i' as string]: 2 }}>Sound Design.</span>
          </span>
        </h1>
        <p className="hero-body">
          Gaurav's understanding of how motion and sound create emotion, clarity and impact.
        </p>
        <button
          className="begin"
          onClick={() => {
            void audio.enable();
            scrollToId('attention');
          }}
        >
          <span className="begin-ring">
            <i />
          </span>
          <span>
            Begin the experience
            <small>sound on · headphones recommended</small>
          </span>
        </button>
      </div>
      <div className="hero-count">
        <span>01</span>
        <span>12</span>
      </div>
      <div className="hero-stages">
        {STAGES.map((s, i) => (
          <span key={s} className={i === stage ? 'is-on' : ''}>
            {s}
          </span>
        ))}
      </div>
      <p className="hero-manifesto">
        Motion is not movement. Sound is not decoration. <em>Together, they create perception.</em>
      </p>
    </section>
  );
}
