/** KORA — the fictional product that runs through the presentation. */
export function drawHeadphones(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  s: number,
  band = '#efe9df',
  cup = '#ff5a1f',
  draw = 1,
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = band;
  ctx.lineWidth = s * 0.07;
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.5, Math.PI, Math.PI + Math.PI * draw);
  ctx.stroke();
  ctx.fillStyle = cup;
  const w = s * 0.27;
  const h = s * 0.44;
  for (const side of [-1, 1]) {
    const x = cx + side * s * 0.5 - w / 2;
    ctx.beginPath();
    ctx.roundRect(x, cy - h * 0.25, w, h, w * 0.4);
    ctx.fill();
  }
  ctx.restore();
}
