export const CHAPTERS = [
  'Understanding',
  'Attention',
  'Timing',
  'Weight',
  'Rhythm',
  'Sound',
  'Contrast',
  'Emotion',
  'Anticipation',
  'Silence',
  'Material',
  'Story',
  'Transformation',
  'Process',
  'Possibilities',
];

/** Number of chapters that currently exist in the piece. */
export const BUILT = 5;

export function ChapterIndicator({ current }: { current: number }) {
  return (
    <nav className="chapter-indicator" aria-label="Chapters">
      <div className="ci-current">
        <span className="ci-num" key={`n${current}`}>
          {String(current).padStart(2, '0')}
        </span>
        <span className="ci-title" key={`t${current}`}>
          {CHAPTERS[current] ?? ''}
        </span>
      </div>
      <ol className="ci-ticks">
        {CHAPTERS.map((c, i) => (
          <li
            key={c}
            className={`${i === current ? 'is-on' : ''} ${i < BUILT ? '' : 'is-future'}`}
            title={`${String(i).padStart(2, '0')} ${c}`}
          />
        ))}
      </ol>
    </nav>
  );
}
