import { RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { audio } from '../audio/engine';
import { clamp } from './math';

export type Frame = (ctx: CanvasRenderingContext2D, w: number, h: number, dt: number, time: number) => void;

/**
 * A DPR-aware canvas loop that only runs while the canvas is on screen.
 * `frame` may change on every render; the latest one is always called.
 */
export function useCanvasLoop(ref: RefObject<HTMLCanvasElement>, frame: Frame) {
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
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
      { rootMargin: '120px' },
    );
    io.observe(canvas);
    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

/** requestAnimationFrame loop that runs only while `ref` is on screen. */
export function useVisibleRaf(ref: RefObject<HTMLElement>, cb: (dt: number, time: number) => void) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cbRef.current(dt, now / 1000);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      } else if (!e.isIntersecting && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

/**
 * Scroll progress (0..1) through a tall section, plus a discrete `stage`
 * index derived from thresholds. Progress lives in a ref (read it per frame);
 * only stage changes cause a render.
 */
export function useChapterProgress(ref: RefObject<HTMLElement>, thresholds: number[]) {
  const progress = useRef(0);
  const [stage, setStage] = useState(0);
  const key = thresholds.join(',');
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const th = key.split(',').map(Number);
    const update = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0;
      progress.current = p;
      let s = 0;
      th.forEach((t, i) => {
        if (p >= t) s = i + 1;
      });
      setStage((prev) => (prev === s ? prev : s));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref, key]);
  return { progress, stage };
}

export function useSoundEnabled() {
  return useSyncExternalStore(audio.subscribe, audio.getEnabled);
}

export function usePrefersReducedMotion() {
  const [r, setR] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return r;
}
