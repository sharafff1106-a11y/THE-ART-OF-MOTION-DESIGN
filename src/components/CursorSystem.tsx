import { useEffect, useRef, useState } from 'react';
import { damp } from '../motion/math';
import { pointer } from '../motion/pointer';

/**
 * The cursor is the first lesson in timing: the dot is immediate,
 * the ring follows with inertia. Hovering an interactive element
 * reveals what the element expects from you.
 */
export function CursorSystem() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const fine = typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;

  useEffect(() => {
    if (!fine) return;
    document.documentElement.classList.add('has-cursor');
    let raf = 0;
    let rx = -100;
    let ry = -100;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (pointer.moved) {
        rx = damp(rx, pointer.x, 14, dt);
        ry = damp(ry, pointer.y, 14, dt);
        dotRef.current!.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
        ringRef.current!.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const over = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      const el = t.closest<HTMLElement>('[data-cursor], button, a');
      setHover(!!el);
      setLabel(el?.dataset.cursor ?? '');
    };
    const pd = () => setDown(true);
    const pu = () => setDown(false);
    window.addEventListener('pointerover', over);
    window.addEventListener('pointerdown', pd);
    window.addEventListener('pointerup', pu);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerover', over);
      window.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointerup', pu);
      document.documentElement.classList.remove('has-cursor');
    };
  }, [fine]);

  if (!fine) return null;
  return (
    <div className={`cursor ${hover ? 'is-hover' : ''} ${down ? 'is-down' : ''}`} aria-hidden>
      <div className="cursor-ring" ref={ringRef}>
        <span className="cursor-ring-shape" />
        <span className="cursor-label">{label}</span>
      </div>
      <div className="cursor-dot" ref={dotRef} />
    </div>
  );
}
