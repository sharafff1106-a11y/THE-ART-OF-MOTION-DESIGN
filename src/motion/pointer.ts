/**
 * One shared pointer model for the whole piece. Position, smoothed velocity
 * and total distance travelled — the visitor's movement is an input signal.
 */
export const pointer = {
  x: -9999,
  y: -9999,
  vx: 0,
  vy: 0,
  moved: false,
  distance: 0,
  lastT: 0,
};

let installed = false;

export function installPointer() {
  if (installed) return;
  installed = true;
  window.addEventListener(
    'pointermove',
    (e) => {
      const now = performance.now();
      if (pointer.moved) {
        const dt = Math.max(8, now - pointer.lastT) / 1000;
        const dx = e.clientX - pointer.x;
        const dy = e.clientY - pointer.y;
        pointer.vx = pointer.vx * 0.6 + (dx / dt) * 0.4;
        pointer.vy = pointer.vy * 0.6 + (dy / dt) * 0.4;
        pointer.distance += Math.hypot(dx, dy);
      }
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.moved = true;
      pointer.lastT = now;
    },
    { passive: true },
  );
}

/** Speed in px/s, decaying to zero once the pointer stops. */
export function pointerSpeed() {
  const idle = performance.now() - pointer.lastT;
  const decay = Math.max(0, 1 - idle / 140);
  return Math.hypot(pointer.vx, pointer.vy) * decay;
}
