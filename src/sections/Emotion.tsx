import { CSSProperties, lazy, useRef, useState } from 'react';
import { Lazy3D } from '../components/Lazy3D';
import { RadioList } from '../components/Controls';
import { Panel } from '../components/Panel';
import { EMOTIONS, EmotionId } from './emotions';

const Emotion3D = lazy(() => import('./Emotion3D'));

/** 08 — EMOTION. The object didn't change. The feeling did. */
export function Emotion() {
  const [emotion, setEmotion] = useState<EmotionId>('powerful');
  const emotionRef = useRef<EmotionId>('powerful');
  const e = EMOTIONS[emotion];
  return (
    <Panel
      id="emotion"
      num="08"
      title="Emotion"
      theme="paper"
      question="What should people feel?"
      headline={['The same shape.', 'Different feeling.']}
      body={
        <p>
          Pick a feeling. The shape never changes. Only its speed, movement, colour and sound do. That is exactly what happens to a product in a
          film.
        </p>
      }
      forYou={{
        text: 'Before anyone reads a word, motion and sound tell your customer how to feel about your product: calm, premium, exciting or trustworthy. I design that feeling on purpose.',
      }}
      aside={
        <RadioList
          options={(Object.keys(EMOTIONS) as EmotionId[]).map((id) => ({ id, label: EMOTIONS[id].label }))}
          value={emotion}
          onChange={(id) => {
            setEmotion(id);
            emotionRef.current = id;
            EMOTIONS[id].sound();
          }}
        />
      }
    >
      <div className="em-stage" style={{ '--em-light': e.light } as CSSProperties}>
        <Lazy3D scene={Emotion3D} props={{ emotionRef }} className="em-canvas" />
        <div className="em-card" key={emotion}>
          <p className="em-feel">{e.label}</p>
          <p className="em-line">{e.line}</p>
          <div className="em-row">
            <span>Use it for</span>
            <ul>
              {e.uses.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
          <div className="em-row">
            <span>How it's made</span>
            <p>{e.recipe}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}
