import { MutableRefObject, ReactNode, useRef } from 'react';
import { useChapterProgress } from '../motion/hooks';
import { Env } from '../motion/environments';

/**
 * A chapter is a tall scroll track with a sticky stage inside.
 * Scroll becomes a timeline: `progress` (0..1) is read per frame,
 * `stage` advances through the EXPERIENCE → REALIZATION → PRINCIPLE beats.
 */
export function Chapter({
  id,
  env,
  number,
  title,
  length,
  thresholds,
  children,
  className = '',
}: {
  id: string;
  env: Env;
  number: string;
  title: string;
  /** height in viewports */
  length: number;
  thresholds: number[];
  children: (s: { stage: number; progress: MutableRefObject<number> }) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { stage, progress } = useChapterProgress(ref, thresholds);
  return (
    <section
      ref={ref}
      id={id}
      data-env={env}
      data-chapter={number}
      data-title={title}
      className={`chapter chapter--${id} ${className}`}
      style={{ height: `${length * 100}vh` }}
    >
      <div className="stage">{children({ stage, progress })}</div>
    </section>
  );
}
