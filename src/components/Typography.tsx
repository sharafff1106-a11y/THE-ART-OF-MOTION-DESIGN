import { CSSProperties, ElementType, ReactNode } from 'react';

/** A masked line that slides up into view. */
export function Reveal({
  show,
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
}: {
  show: boolean;
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  return (
    <Tag className={`reveal ${show ? 'is-in' : ''} ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      <span className="reveal-inner">{children}</span>
    </Tag>
  );
}

/**
 * Splits text into per-character spans. Words stay unbroken.
 * Animation is driven by CSS (`.split.is-in .ch`) or by GSAP targeting `.ch`.
 */
export function Split({
  text,
  show = true,
  stagger = 22,
  delay = 0,
  className = '',
}: {
  text: string;
  show?: boolean;
  stagger?: number;
  delay?: number;
  className?: string;
}) {
  let i = 0;
  return (
    <span className={`split ${show ? 'is-in' : ''} ${className}`} aria-label={text}>
      {text.split(' ').map((word, wi, arr) => (
        <span className="word" key={wi} aria-hidden>
          {[...word].map((c) => {
            const idx = i++;
            return (
              <span className="ch" key={idx} style={{ '--d': `${delay + idx * stagger}ms` } as CSSProperties}>
                {c}
              </span>
            );
          })}
          {wi < arr.length - 1 ? <span className="ch space">&nbsp;</span> : null}
        </span>
      ))}
    </span>
  );
}
