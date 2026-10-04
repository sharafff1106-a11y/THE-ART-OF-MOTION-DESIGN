import { audio } from '../audio/engine';
import { useSoundEnabled } from '../motion/hooks';

export function SoundToggle() {
  const on = useSoundEnabled();
  return (
    <button
      className={`sound-toggle ${on ? 'is-on' : ''}`}
      onClick={() => audio.toggle()}
      aria-pressed={on}
      data-cursor={on ? 'silence' : 'listen'}
    >
      <span className="sound-bars" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sound-label">Sound {on ? 'on' : 'off'}</span>
      <span className="sound-hint">{on ? 'headphones recommended' : 'click to listen'}</span>
    </button>
  );
}
