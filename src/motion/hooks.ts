import { RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { audio } from '../audio/engine';

export type Frame = (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, time: number) => void;

/**
 * A DPR-aware 2D canvas loop that only runs while the canvas is on screen.
 * DPR is capped (default 1.5): the difference is invisible on soft visuals,
 * the saving in fill-rate is large.
 */
export function useCanvasLoop(ref: RefObject<HTMLCanvasElement>, frame: Frame, maxDpr = 1.5) {
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frameRef.current(ctx, w, h, dt, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !raf) {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        } else if (!e.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: '80px' },
    );
    io.observe(canvas);
    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, maxDpr]);
}

/** Visibility of an element. `once` keeps it true after the first reveal. */
export function useInView(ref: RefObject<Element>, { threshold = 0, rootMargin = '0px', once = false } = {}) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin, once]);
  return inView;
}

export function useSoundEnabled() {
  return useSyncExternalStore(audio.subscribe, audio.getEnabled);
}

/** Pointer position relative to an element, normalised to -1..1, stored in a ref. */
export function useLocalPointer(ref: RefObject<HTMLElement>) {
  const p = useRef({ x: 0, y: 0, px: -9999, py: -9999, inside: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      p.current.px = e.clientX - r.left;
      p.current.py = e.clientY - r.top;
      p.current.x = (p.current.px / r.width) * 2 - 1;
      p.current.y = (p.current.py / r.height) * 2 - 1;
      p.current.inside = true;
    };
    const leave = () => {
      p.current.inside = false;
    };
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [ref]);
  return p;
}
