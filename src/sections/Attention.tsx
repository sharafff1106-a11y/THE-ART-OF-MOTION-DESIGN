import { CSSProperties, useCallback, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { PillButton } from '../components/Controls';
import { Panel } from '../components/Panel';

/**
 * 02 — ATTENTION
 * A test with the visitor's own eyes: find one word among many, three times.
 * Every tile looks identical; only the motion changes between rounds.
 */
type RoundMode = 'still' | 'one' | 'all';
const ROUNDS: { mode: RoundMode; label: string; note: string }[] = [
  { mode: 'still', label: 'No motion', note: 'Everything is still.' },
  { mode: 'one', label: 'One thing moves', note: 'One tile moves gently.' },
  { mode: 'all', label: 'Everything moves', note: 'Every tile moves.' },
];
const POOL = ['ORBIT', 'PULSE', 'NOVA', 'ECHO', 'WAVE', 'AURA', 'FLUX', 'LUMA', 'SONO', 'VIBE', 'TONE', 'HALO', 'DRIFT', 'BEAM', 'CORE', 'MIRA', 'ONYX', 'RIFT', 'SOLA', 'TERA', 'ZENO', 'KIRA', 'KOBE', 'ORA'];
const TARGET = 'KORA';
const COUNT = 40;

function makeBoard() {
  const words = Array.from({ length: COUNT }, () => POOL[Math.floor(Math.random() * POOL.length)]);
  const target = Math.floor(Math.random() * COUNT);
  words[target] = TARGET;
  return { words, target, delays: words.map(() => Math.random()) };
}

export function Attention() {
  const [phase, setPhase] = useState<'intro' | 'play' | 'found' | 'results'>('intro');
  const [round, setRound] = useState(0);
  const [board, setBoard] = useState(makeBoard);
  const [times, setTimes] = useState<number[]>([]);
  const [miss, setMiss] = useState(-1);
  const start = useRef(0);

  const begin = useCallback((r: number) => {
    setBoard(makeBoard());
    setRound(r);
    setPhase('play');
    start.current = performance.now();
  }, []);

  const pick = (i: number) => {
    if (phase !== 'play') return;
    if (i !== board.target) {
      setMiss(i);
      audio.click(500, 0.08);
      window.setTimeout(() => setMiss(-1), 400);
      return;
    }
    const t = (performance.now() - start.current) / 1000;
    const next = [...times.slice(0, round), t];
    setTimes(next);
    setPhase('found');
    audio.click(2600, 0.14);
    window.setTimeout(() => {
      if (round < ROUNDS.length - 1) begin(round + 1);
      else setPhase('results');
    }, 900);
  };

  const mode = ROUNDS[round].mode;
  const max = Math.max(...times, 1);
  const verdict =
    times.length === 3
      ? times[1] < times[0] && times[1] < times[2]
        ? `With one moving tile you found it ${(times[0] - times[1]).toFixed(1)} s faster than with no motion. Your eye went where the motion told it to.`
        : 'Your times are close this round. Try again, and notice what your eye does first when something moves.'
      : '';

  return (
    <Panel
      id="attention"
      num="02"
      title="Attention"
      theme="paper"
      question="Where will people look?"
      headline={['Motion', 'directs', 'attention.']}
      body={<p>A quick test with your own eyes. Find the word KORA, three times. Every tile looks the same; only the motion changes.</p>}
      forYou={{
        text: "Your customers scan, they don't read. One small, well-placed movement takes them straight to the offer, the new feature or the button. Too much movement, and they get lost.",
        uses: ['Ads', 'Websites', 'App UI', 'Social posts'],
      }}
    >
      <div className="ag-wrap">
        <div className="ag-head">
          {ROUNDS.map((r, i) => (
            <span key={r.mode} className={`${phase !== 'intro' && i === round && phase !== 'results' ? 'is-on' : ''} ${times[i] !== undefined ? 'is-done' : ''}`}>
              <b>Round {i + 1}</b> {r.label}
              {times[i] !== undefined && <em>{times[i].toFixed(1)} s</em>}
            </span>
          ))}
        </div>
        <div className={`ag-board is-${mode} ${phase === 'play' || phase === 'found' ? 'is-live' : ''}`}>
          {board.words.map((w, i) => (
            <button
              key={i}
              className={`ag-tile ${i === board.target ? 'is-target' : ''} ${phase === 'found' && i === board.target ? 'is-found' : ''} ${miss === i ? 'is-miss' : ''}`}
              style={{ '--k': board.delays[i] } as CSSProperties}
              onClick={() => pick(i)}
              tabIndex={phase === 'play' ? 0 : -1}
            >
              {w}
            </button>
          ))}

          {phase === 'intro' && (
            <div className="ag-overlay">
              <p className="ag-big">
                Find <b>KORA</b>
              </p>
              <p>Three short rounds. Click the word as fast as you can.</p>
              <PillButton icon="play" onClick={() => begin(0)}>
                Start the test
              </PillButton>
            </div>
          )}
          {phase === 'results' && (
            <div className="ag-overlay ag-results">
              <p className="ag-big">Your results</p>
              <div className="ag-bars">
                {ROUNDS.map((r, i) => (
                  <div key={r.mode} className={`ag-bar ag-bar--${r.mode}`}>
                    <span>{r.label}</span>
                    <i style={{ width: `${(times[i] / max) * 100}%` }} />
                    <b>{times[i]?.toFixed(1)} s</b>
                  </div>
                ))}
              </div>
              <p>{verdict}</p>
              <PillButton
                onClick={() => {
                  setTimes([]);
                  begin(0);
                }}
              >
                Try again
              </PillButton>
            </div>
          )}
        </div>
        <p className="ag-foot">{phase === 'play' ? `${ROUNDS[round].note} Find KORA.` : phase === 'found' ? 'Found it.' : ' '}</p>
      </div>
    </Panel>
  );
}
