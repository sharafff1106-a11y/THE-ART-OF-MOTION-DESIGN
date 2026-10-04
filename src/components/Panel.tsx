import { CSSProperties, ReactNode, useRef } from 'react';
import { useInView } from '../motion/hooks';

export type Theme = 'ivory' | 'paper' | 'dark' | 'blue' | 'night';
export const DARK_THEMES: Theme[] = ['dark', 'night'];

/**
 * One chapter = one full-screen panel.
 * Copy on the left, the experiment in the middle, the controls on the right.
 * Text reveals as soon as the panel is 15% on screen — no waiting.
 */
export function Panel({
  id,
  num,
  title,
  theme,
  headline,
  body,
  actions,
  aside,
  headerRight,
  forYou,
  question,
  children,
  className = '',
}: {
  id: string;
  num: string;
  title: string;
  theme: Theme;
  headline: string[];
  body?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  headerRight?: ReactNode;
  /** the client-facing takeaway: what this principle does in a real project */
  forYou?: { text: string; uses?: string[] };
  /** the plain-language question this chapter answers */
  question?: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const shown = useInView(ref, { threshold: 0.15, once: true });
  return (
    <section
      ref={ref}
      id={id}
      data-theme={theme}
      data-num={num}
      data-title={title}
      className={`panel panel--${theme} panel--${id} ${shown ? 'is-in' : ''} ${className}`}
    >
      <header className="panel-head">
        <span className="panel-num">{num}</span>
        <span className="panel-title">{title}</span>
        <span className="panel-head-right">{headerRight ?? <GridIcon />}</span>
      </header>
      <div className="panel-copy">
        {question && <p className="panel-q">{question}</p>}
        <h2 className="panel-h">
          {headline.map((l, i) => (
            <span className="line" key={i}>
              <span style={{ '--i': i } as CSSProperties}>{l}</span>
            </span>
          ))}
        </h2>
        {body && <div className="panel-body">{body}</div>}
        {forYou && (
          <div className="for-you">
            <span className="for-you-label">For your brand</span>
            <p>{forYou.text}</p>
            {forYou.uses && (
              <ul>
                {forYou.uses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      <div className="panel-visual">{children}</div>
      {aside && <aside className="panel-aside">{aside}</aside>}
    </section>
  );
}

export function GridIcon() {
  return (
    <svg className="grid-ico" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
      {[1.5, 6, 10.5].flatMap((x) => [1.5, 6, 10.5].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.1" />))}
    </svg>
  );
}
