import { lazy, useRef, useState } from 'react';
import { Lazy3D } from '../components/Lazy3D';
import { PillButton, RadioList, Slider } from '../components/Controls';
import { Panel } from '../components/Panel';

const Weight3D = lazy(() => import('./Weight3D'));

const LEVELS = [
  { id: 'feather', label: 'Feather', m: 0 },
  { id: 'light', label: 'Light', m: 0.25 },
  { id: 'medium', label: 'Medium', m: 0.5 },
  { id: 'heavy', label: 'Heavy', m: 0.75 },
  { id: 'massive', label: 'Massive', m: 1 },
];

/**
 * 04 — WEIGHT
 * One cube. Drag it, throw it, drop it. Weight lives in acceleration,
 * inertia, impact and sound — and here, a little, in material.
 */
export function Weight() {
  const [mass, setMass] = useState(0.5);
  const massRef = useRef(0.5);
  const dropRef = useRef(0);
  const set = (m: number) => {
    setMass(m);
    massRef.current = m;
  };
  const DESCRIBE: Record<string, string> = {
    feather: 'Floats and drifts. Almost no sound, no impact.',
    light: 'Moves fast, bounces high, lands with a small click.',
    medium: 'Feels like a real object in your hand.',
    heavy: 'Slow to start, hard to stop. A deep thud when it lands.',
    massive: 'Barely moves, then shakes the whole floor when it lands.',
  };
  const nearest = LEVELS.reduce((a, b) => (Math.abs(b.m - mass) < Math.abs(a.m - mass) ? b : a));

  return (
    <Panel
      id="weight"
      num="04"
      title="Weight"
      theme="paper"
      question="Is it believable?"
      headline={['Heavy or light?', 'You can feel it.']}
      forYou={{
        text: 'Heavy things move slowly and land hard; light things float and bounce. Getting weight right is what makes a product feel solid, premium and real on screen.',
        uses: ['Product launches', '3D packshots', 'Logo animation'],
      }}
      body={
        <>
        <p>The cube never changes size. Pick a weight and throw it: you read its weight from how it moves and sounds.</p>
        <RadioList
          rail
          options={LEVELS.map((l) => ({ id: l.id, label: l.label }))}
          value={nearest.id}
          onChange={(id) => {
            set(LEVELS.find((l) => l.id === id)!.m);
            dropRef.current++;
          }}
        />
        <p className="wt-desc" key={nearest.id}>
          <b>{nearest.label}.</b> {DESCRIBE[nearest.id]}
        </p>
        </>
      }
      actions={<PillButton onClick={() => dropRef.current++}>Drop it</PillButton>}
    >
      <div className="wt-stage">
        <Lazy3D scene={Weight3D} props={{ massRef, dropRef }} />
        <p className="wt-hint">Grab the cube. Throw it.</p>
        <div className="wt-dial">
          <Slider value={mass} onChange={set} ends={['Feather', 'Massive']} />
          <span className="wt-dial-label">Drag to change weight</span>
        </div>
      </div>
    </Panel>
  );
}
