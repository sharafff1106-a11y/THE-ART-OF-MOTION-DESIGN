import { CSSProperties, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { clamp } from '../motion/math';

/** Segmented choice with a travelling highlight. */
export function Segment<T extends string>({
  options,
  value,
  onChange,
  boxed = false,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  boxed?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ x: 0, y: 0, w: 0, h: 0 });
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const el = row.querySelector<HTMLElement>(`[data-id="${value}"]`);
      if (el) setBar({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [value]);
  return (
    <div className={`segment ${boxed ? 'segment--boxed' : ''}`} ref={rowRef} role="radiogroup">
      <span
        className="segment-bar"
        style={{ '--x': `${bar.x}px`, '--y': `${bar.y}px`, '--w': `${bar.w}px`, '--h': `${bar.h}px` } as CSSProperties}
      />
      {options.map((o, i) => (
        <button
          key={o.id}
          data-id={o.id}
          role="radio"
          aria-checked={o.id === value}
          className={o.id === value ? 'is-on' : ''}
          onClick={() => {
            if (o.id !== value) audio.click(1700 + i * 240, 0.14);
            onChange(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Vertical radio list (Weight, Emotion). */
export function RadioList<T extends string>({
  options,
  value,
  onChange,
  rail = false,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  rail?: boolean;
}) {
  return (
    <div className={`radio-list ${rail ? 'radio-list--rail' : ''}`} role="radiogroup">
      {options.map((o, i) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={o.id === value}
          className={o.id === value ? 'is-on' : ''}
          onClick={() => {
            if (o.id !== value) audio.click(1500 + i * 200, 0.14);
            onChange(o.id);
          }}
        >
          <i />
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label, labels }: { on: boolean; onChange: (v: boolean) => void; label?: string; labels?: [string, string] }) {
  return (
    <button
      className={`toggle ${on ? 'is-on' : ''} ${labels ? 'toggle--labelled' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => {
        audio.click(on ? 1400 : 2200, 0.12);
        onChange(!on);
      }}
    >
      {label && <span className="toggle-label">{label}</span>}
      <span className="toggle-track">
        {labels && <span className="toggle-txt">{labels[0]}</span>}
        {labels && <span className="toggle-txt">{labels[1]}</span>}
        <span className="toggle-knob" />
      </span>
    </button>
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  label,
  format,
  ends,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
  format?: (v: number) => string;
  ends?: [string, string];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastDetent = useRef(-1);
  const t = (value - min) / (max - min);
  const setFrom = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const u = clamp((clientX - r.left) / r.width);
    const d = Math.round(u * 12);
    if (d !== lastDetent.current) {
      lastDetent.current = d;
      audio.tick(0.04 + u * 0.06, { pan: u * 1.2 - 0.6 });
    }
    onChange(min + u * (max - min));
  };
  return (
    <div className="slider">
      {(label || format) && (
        <div className="slider-head">
          <span>{label}</span>
          {format && <span className="slider-val">{format(value)}</span>}
        </div>
      )}
      <div className="slider-row">
        {ends && <span className="slider-end">{ends[0]}</span>}
        <div
          className="slider-track"
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={label ?? ends?.join(' to ')}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Number(value.toFixed(2))}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setFrom(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) setFrom(e.clientX);
          }}
          onKeyDown={(e) => {
            const step = (max - min) / 20;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(clamp(value + step, min, max));
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(clamp(value - step, min, max));
          }}
        >
          <div className="slider-line" />
          <div className="slider-fill" style={{ width: `${t * 100}%` }} />
          <div className="slider-knob" style={{ left: `${t * 100}%` }} />
        </div>
        {ends && <span className="slider-end">{ends[1]}</span>}
      </div>
    </div>
  );
}

export function PillButton({ children, onClick, icon = 'arrow' }: { children: ReactNode; onClick: () => void; icon?: 'arrow' | 'play' | 'none' }) {
  return (
    <button
      className="pill"
      onClick={() => {
        audio.click(2400, 0.12);
        onClick();
      }}
    >
      <span>{children}</span>
      {icon === 'arrow' && <span className="pill-ico">→</span>}
      {icon === 'play' && <span className="pill-ico">▸</span>}
    </button>
  );
}

/** The "Try it yourself" panel. */
export function TryPanel({ children, title = 'Try it yourself' }: { children: ReactNode; title?: string }) {
  return (
    <div className="try">
      <div className="try-title">{title}</div>
      {children}
    </div>
  );
}

export function TryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="try-row">
      <span>{label}</span>
      <div className="try-ctl">{children}</div>
    </div>
  );
}
