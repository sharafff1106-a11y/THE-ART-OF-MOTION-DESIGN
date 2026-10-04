/** A tiny shaded-cube renderer for 2D canvas — real 3D, no WebGL context. */
const V = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
const F = [
  [0, 1, 2, 3],
  [5, 4, 7, 6],
  [4, 0, 3, 7],
  [1, 5, 6, 2],
  [4, 5, 1, 0],
  [3, 2, 6, 7],
];

export function drawCube(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  rx: number,
  ry: number,
  rz: number,
  tint: [number, number, number] = [52, 52, 54],
  sx = 1,
  sy = 1,
) {
  const cX = Math.cos(rx);
  const sX = Math.sin(rx);
  const cY = Math.cos(ry);
  const sY = Math.sin(ry);
  const cZ = Math.cos(rz);
  const sZ = Math.sin(rz);
  const P = V.map(([x, y, z]) => {
    // rotate Y, then X, then Z
    let x1 = x * cY + z * sY;
    let z1 = -x * sY + z * cY;
    let y1 = y * cX - z1 * sX;
    z1 = y * sX + z1 * cX;
    const x2 = x1 * cZ - y1 * sZ;
    y1 = x1 * sZ + y1 * cZ;
    x1 = x2;
    const persp = 1 / (1 + z1 * 0.08);
    return [cx + x1 * size * 0.5 * persp * sx, cy + y1 * size * 0.5 * persp * sy, z1];
  });
  const light = [-0.45, -0.75, -0.5];
  const faces = F.map((f) => {
    const [a, b, c] = f.map((i) => P[i]);
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const cross = ux * vy - uy * vx;
    // approximate world normal from original verts for lighting
    const n = [0, 1, 2].map((k) => f.reduce((s, i) => s + V[i][k], 0) / 4);
    const z = f.reduce((s, i) => s + P[i][2], 0) / 4;
    return { f, cross, n, z };
  });
  faces
    .filter((q) => q.cross > 0)
    .sort((a, b) => b.z - a.z)
    .forEach(({ f, n }) => {
      // rotate normal the same way for shading
      let x = n[0] * cY + n[2] * sY;
      let z = -n[0] * sY + n[2] * cY;
      const y = n[1] * cX - z * sX;
      z = n[1] * sX + z * cX;
      const xr = x * cZ - y * sZ;
      const yr = x * sZ + y * cZ;
      x = xr;
      const d = Math.max(0, -(x * light[0] + yr * light[1] + z * light[2]));
      const k = 0.28 + d * 1.25;
      ctx.fillStyle = `rgb(${Math.min(255, tint[0] * k + 20 * d)},${Math.min(255, tint[1] * k + 20 * d)},${Math.min(255, tint[2] * k + 22 * d)})`;
      ctx.beginPath();
      f.forEach((i, j) => (j ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1])));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();
    });
}
