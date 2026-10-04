/**
 * Pre-rendered shaded spheres. Drawing a cached bitmap is far cheaper than
 * building a radial gradient per object per frame — this is what lets
 * the 2D chapters show hundreds of "3D" spheres at 60fps.
 */
const cache = new Map<string, HTMLCanvasElement>();

export type SphereKind = 'black' | 'white' | 'orange' | 'glow' | 'grey';

export function sphereSprite(kind: SphereKind, size = 128) {
  const key = `${kind}:${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const r = size / 2;
  if (kind === 'glow') {
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,120,60,0.9)');
    grad.addColorStop(0.25, 'rgba(255,90,40,0.35)');
    grad.addColorStop(1, 'rgba(255,80,30,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  } else {
    const stops: Record<Exclude<SphereKind, 'glow'>, [string, string, string]> = {
      black: ['#6b6b6b', '#1a1a1a', '#000000'],
      white: ['#ffffff', '#d9d6d0', '#8d8a85'],
      orange: ['#ffd0b0', '#ff5a1f', '#a3230a'],
      grey: ['#e6e3de', '#9a9792', '#4d4b48'],
    };
    const [a, b, d] = stops[kind];
    const grad = g.createRadialGradient(r * 0.68, r * 0.62, r * 0.05, r, r, r * 0.98);
    grad.addColorStop(0, a);
    grad.addColorStop(0.45, b);
    grad.addColorStop(1, d);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r * 0.96, 0, Math.PI * 2);
    g.fill();
  }
  cache.set(key, c);
  return c;
}

export function drawSphere(ctx: CanvasRenderingContext2D, kind: SphereKind, x: number, y: number, radius: number) {
  const s = sphereSprite(kind);
  ctx.drawImage(s, x - radius, y - radius, radius * 2, radius * 2);
}
