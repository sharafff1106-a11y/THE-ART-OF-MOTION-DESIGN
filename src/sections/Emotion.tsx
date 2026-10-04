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
      headline={['The same shape.', 'Different feeling.']}
      body={
        <>
          <p className="em-q">How should this feel?</p>
          <p className="em-line" key={emotion}>
            {e.line}
          </p>
        </>
      }
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
        <Lazy3D scene={Emotion3D} props={{ emotionRef }} />
      </div>
    </Panel>
  );
}
