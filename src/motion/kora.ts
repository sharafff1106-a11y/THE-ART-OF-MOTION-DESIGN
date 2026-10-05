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

/** A soft studio backdrop: vertical gradient plus a floor glow. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string, glow?: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (glow) {
    const r = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, h * 0.7);
    r.addColorStop(0, glow);
    r.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, w, h);
  }
}

/** Film-style subtitle for sounds, so the idea still reads with the sound off. */
export function drawSub(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 ${Math.max(11, h * 0.042)}px "IBM Plex Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  const y = h * 0.9;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - tw / 2 - 10, y - h * 0.035, tw + 20, h * 0.07, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(text, w / 2, y + 1);
  ctx.restore();
}

export const serif = (px: number, italic = false) => `${italic ? 'italic ' : ''}${px}px "Instrument Serif", Georgia, serif`;
