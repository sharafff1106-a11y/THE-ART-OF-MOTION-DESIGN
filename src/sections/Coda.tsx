import { Chapter } from '../components/Chapter';
import { Reveal } from '../components/Typography';

/**
 * Interval. The piece pauses here — honestly, and quietly — until the
 * next movement (05 — Sound) is composed.
 */
export function Coda() {
  return (
    <Chapter id="interval" env="white" number="05" title="Sound" length={1.6} thresholds={[0.25, 0.55]}>
      {({ stage }) => (
        <div className="coda">
          <div className="coda-center">
            <Reveal show={stage >= 1} className="mono coda-label">
              05 / Sound
            </Reveal>
            <Reveal show={stage >= 1} delay={400} className="coda-word">
              <em>listen.</em>
            </Reveal>
            <Reveal show={stage >= 2} delay={200} className="mono coda-note">
              The next movement is still being composed.
            </Reveal>
          </div>
          <div className="coda-foot mono">Gaurav's understanding</div>
        </div>
      )}
    </Chapter>
  );
}
