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
  const nearest = LEVELS.reduce((a, b) => (Math.abs(b.m - mass) < Math.abs(a.m - mass) ? b : a));

  return (
    <Panel
      id="weight"
      num="04"
      title="Weight"
      theme="paper"
      className="panel--small-h"
      headline={['Motion has weight.', 'Weight creates believability.', 'Believability creates emotion.']}
      body={
        <RadioList
          rail
          options={LEVELS.map((l) => ({ id: l.id, label: l.label }))}
          value={nearest.id}
          onChange={(id) => {
            set(LEVELS.find((l) => l.id === id)!.m);
            dropRef.current++;
          }}
        />
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
