import { CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { clamp } from '../motion/math';

/**
 * A choice row. The underline travels between options with an eased
 * overshoot — even the interface obeys the timing principles.
 */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ x: 0, y: 0, w: 0 });
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const el = row.querySelector<HTMLElement>(`[data-id="${value}"]`);
      if (el) setBar({ x: el.offsetLeft, y: el.offsetTop + el.offsetHeight, w: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [value]);
  return (
    <div className={`choice ${className}`} ref={rowRef} role="radiogroup">
      {options.map((o, i) => (
        <button
          key={o.id}
          data-id={o.id}
          role="radio"
          aria-checked={o.id === value}
          className={`choice-opt ${o.id === value ? 'is-on' : ''}`}
          onClick={() => {
            if (o.id !== value) audio.click(1800 + i * 260, 0.16);
            onChange(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
      <span className="choice-bar" style={{ '--x': `${bar.x}px`, '--y': `${bar.y}px`, '--w': `${bar.w}px` } as CSSProperties} />
    </div>
  );
}

/** A hairline slider with mono labels. Emits soft ticks as it crosses detents. */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  labels,
  name,
  format,
  detents = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  labels?: string[];
  name: string;
  format?: (v: number) => string;
  detents?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastDetent = useRef(-1);
  const t = (value - min) / (max - min);

  const setFrom = (clientX: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    const u = clamp((clientX - r.left) / r.width);
    const d = Math.round(u * detents);
    if (d !== lastDetent.current) {
      lastDetent.current = d;
      audio.tick(0.05 + u * 0.08, { pan: u * 1.2 - 0.6 });
    }
    onChange(min + u * (max - min));
  };

  return (
    <div className="slider">
      <div className="slider-head">
        <span>{name}</span>
        <span>{format ? format(value) : value.toFixed(2)}</span>
      </div>
      <div
        className="slider-track"
        ref={trackRef}
        data-cursor="drag"
        role="slider"
        tabIndex={0}
        aria-label={name}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setFrom(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons) setFrom(e.clientX);
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
      {labels && (
        <div className="slider-labels">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
