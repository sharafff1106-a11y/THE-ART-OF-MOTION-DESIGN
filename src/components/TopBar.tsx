import { audio } from '../audio/engine';
import { useSoundEnabled } from '../motion/hooks';
import { scrollToId } from '../motion/scroll';
import { BrandPicker } from '../brand/BrandPicker';

export const CHAPTER_IDS = [
  'understanding',
  'attention',
  'timing',
  'weight',
  'rhythm',
  'contrast',
  'sound',
  'emotion',
  'silence',
  'story',
  'process',
  'possibilities',
  'final',
];

const NAV = [
  { n: '01', label: 'Understanding', to: 'understanding' },
  { n: '02', label: 'Principles', to: 'attention' },
  { n: '03', label: 'Explorations', to: 'contrast' },
  { n: '04', label: 'Process', to: 'process' },
];

export function TopBar({ current, dark }: { current: number; dark: boolean }) {
  const on = useSoundEnabled();
  const section = current <= 0 ? 0 : current <= 4 ? 1 : current <= 9 ? 2 : 3;
  return (
    <div className={`topbar ${dark ? 'is-dark' : ''}`}>
      <button className="brand" onClick={() => scrollToId('understanding')} aria-label="Back to start">
        G.
      </button>
      <nav className="topnav">
        {NAV.map((n, i) => (
          <button key={n.to} className={i === section ? 'is-on' : ''} onClick={() => scrollToId(n.to)}>
            <span className="topnav-n">{n.n}</span> {n.label}
          </button>
        ))}
      </nav>
      <div className="topbar-right">
        <BrandPicker compact />
        <div className="dots" aria-label="Chapters">
          {CHAPTER_IDS.map((id, i) => (
            <button
              key={id}
              className={i === current ? 'is-on' : i < current ? 'is-past' : ''}
              onClick={() => scrollToId(id)}
              aria-label={`Go to ${id}`}
            />
          ))}
        </div>
        <button className={`sound-switch ${on ? 'is-on' : ''}`} onClick={() => audio.toggle()} aria-pressed={on}>
          <span>Sound</span>
          <span className="sw">
            <span />
          </span>
        </button>
      </div>
    </div>
  );
}
