import { ReactNode, RefObject } from 'react';

/**
 * The shared stage: one 16:9 screen, one caption line, one row of controls.
 * Every chapter is a moment from the KORA ad shown this way.
 */
export function Monitor({
  canvasRef,
  wrapRef,
  caption,
  controls,
  overlay,
  tone = 'dark',
  onReplay,
}: {
  canvasRef: RefObject<HTMLCanvasElement>;
  wrapRef?: RefObject<HTMLDivElement>;
  caption?: ReactNode;
  controls?: ReactNode;
  overlay?: ReactNode;
  tone?: 'dark' | 'light';
  /** shows a small replay button on the screen */
  onReplay?: () => void;
}) {
  return (
    <div className="mon-stage" ref={wrapRef}>
      <div className={`mon mon--${tone}`}>
        <canvas ref={canvasRef} />
        {overlay}
        {onReplay && (
          <button className="mon-replay" onClick={onReplay} aria-label="Replay">
            ↻ <span>Replay</span>
          </button>
        )}
      </div>
      {caption !== undefined && <div className="mon-cap">{caption}</div>}
      {controls && <div className="mon-controls">{controls}</div>}
    </div>
  );
}
