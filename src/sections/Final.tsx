import { CSSProperties, useRef } from 'react';
import { useInView } from '../motion/hooks';

const BLOCKS = [
  ['Motion', 'is', 'meaning', 'in time.'],
  ['Sound', 'is', 'feeling', 'in space.'],
];

export function Final() {
  const ref = useRef<HTMLElement>(null);
  const shown = useInView(ref, { threshold: 0.25, once: true });
  let i = 0;
  return (
    <section ref={ref} id="final" data-theme="ivory" data-num="13" className={`panel panel--ivory final ${shown ? 'is-in' : ''}`}>
      <p className="final-label">Gaurav's understanding</p>
      <div className="final-blocks">
        {BLOCKS.map((b, bi) => (
          <h2 key={bi} className="final-h">
            {b.map((wd) => (
              <span className="line" key={wd}>
                <span style={{ '--i': i++ } as CSSProperties}>{wd}</span>
              </span>
            ))}
          </h2>
        ))}
      </div>
      <p className="final-together" style={{ '--i': i + 1 } as CSSProperties}>
        Together, they create <em>experience.</em>
      </p>
      <div className="final-cta" style={{ '--i': i + 3 } as CSSProperties}>
        <p>If you have something worth communicating, let's give it movement.</p>
        <div className="final-buttons">
          <a className="pill pill--ghost" href="#work">
            View selected work
          </a>
          <a className="pill pill--solid" href="#contact">
            Start a project <span className="pill-ico">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
