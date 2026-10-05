import { useSyncExternalStore } from 'react';
import { audio } from '../audio/engine';
import { drawHeadphones } from '../motion/kora';

/**
 * The client's world. Every chapter shows the visitor's own kind of product,
 * so the demonstrations are about their brand, not about abstract objects.
 */
export type Industry = 'fragrance' | 'fashion' | 'tech' | 'drink' | 'sport';

export interface Brand {
  id: Industry;
  label: string;
  /** fictional brand name used on screen */
  name: string;
  tagline: string;
  /** dark studio backdrop */
  dark: [string, string];
  /** light backdrop */
  light: [string, string];
  accent: string;
  /** draws the product centred on (cx, cy); s ≈ product height */
  draw: (ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, t?: number) => void;
  /** the product's own sound moment: three beats, with on-screen captions */
  moment: { label: string; play: () => void }[];
  /** the sound of the product being set down; m 0 (light) .. 1 (heavy) */
  place: (m: number, strength: number) => void;
}

const glassClink = () => {
  audio.burst(5200, 12, 0.04, 0.35);
  audio.tone(2637, 0.6, 0.05, { send: 0.5 });
  audio.tone(3951, 0.4, 0.03, { send: 0.5 });
};
const mist = () => audio.burst(7000, 0.7, 0.55, 0.32, { send: 0.2 });
const softClick = () => audio.click(3200, 0.2);
const sparkle = () => [2093, 2637, 3136].forEach((f, i) => audio.tone(f, 0.8, 0.025, { when: audio.ctx!.currentTime + i * 0.06, send: 0.6 }));
const fizz = () => {
  audio.burst(6000, 0.5, 1.2, 0.18, { send: 0.1 });
  for (let i = 0; i < 10; i++) audio.burst(4000 + Math.random() * 3000, 8, 0.02, 0.05, { when: audio.ctx!.currentTime + Math.random() * 1 });
};
const crack = () => {
  audio.burst(2500, 3, 0.05, 0.5);
  audio.burst(6000, 1, 0.25, 0.25);
};
const squeak = () => audio.sweep(1100, 1900, 0.12, 0.08, { type: 'triangle' });

// ───────────── product drawings ─────────────
function bottle(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const bw = s * 0.6;
  const bh = s * 0.6;
  const top = cy - s * 0.5;
  const bodyY = cy + s * 0.5 - bh;
  // glass body
  const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
  g.addColorStop(0, '#3a2116');
  g.addColorStop(0.5, '#8a5232');
  g.addColorStop(1, '#2a160e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, bodyY, bw, bh, s * 0.05);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(cx - bw * 0.36, bodyY + bh * 0.08, bw * 0.06, bh * 0.82);
  // label
  ctx.fillStyle = 'rgba(245,235,220,0.92)';
  ctx.fillRect(cx - bw * 0.28, bodyY + bh * 0.38, bw * 0.56, bh * 0.24);
  ctx.fillStyle = '#2a160e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${bh * 0.13}px "Instrument Serif", Georgia, serif`;
  ctx.fillText('VEIL', cx, bodyY + bh * 0.5);
  // neck + cap
  ctx.fillStyle = '#b89a6a';
  ctx.fillRect(cx - s * 0.05, bodyY - s * 0.07, s * 0.1, s * 0.07);
  const cg = ctx.createLinearGradient(cx - s * 0.17, 0, cx + s * 0.17, 0);
  cg.addColorStop(0, '#8a6a3a');
  cg.addColorStop(0.5, '#f1d9a0');
  cg.addColorStop(1, '#7a5a2a');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.17, top, s * 0.34, bodyY - s * 0.07 - top, s * 0.03);
  ctx.fill();
}

function handbag(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const bottom = cy + s * 0.5;
  const bh = s * 0.58;
  const topY = bottom - bh;
  const wt = s * 0.72;
  const wb = s * 0.9;
  // handle
  ctx.strokeStyle = '#6b4226';
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, topY, s * 0.24, Math.PI, 0);
  ctx.stroke();
  // body
  const g = ctx.createLinearGradient(0, topY, 0, bottom);
  g.addColorStop(0, '#c08a5c');
  g.addColorStop(1, '#7d4f2e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - wt / 2, topY);
  ctx.lineTo(cx + wt / 2, topY);
  ctx.lineTo(cx + wb / 2, bottom - s * 0.04);
  ctx.quadraticCurveTo(cx + wb / 2, bottom, cx + wb / 2 - s * 0.04, bottom);
  ctx.lineTo(cx - wb / 2 + s * 0.04, bottom);
  ctx.quadraticCurveTo(cx - wb / 2, bottom, cx - wb / 2, bottom - s * 0.04);
  ctx.closePath();
  ctx.fill();
  // flap
  ctx.fillStyle = 'rgba(60,35,18,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx - wt / 2, topY);
  ctx.lineTo(cx + wt / 2, topY);
  ctx.quadraticCurveTo(cx, topY + bh * 0.62, cx - wt / 2, topY);
  ctx.fill();
  // gold clasp
  const cg = ctx.createLinearGradient(cx - s * 0.06, 0, cx + s * 0.06, 0);
  cg.addColorStop(0, '#9a7a3a');
  cg.addColorStop(0.5, '#f6e2a8');
  cg.addColorStop(1, '#9a7a3a');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.roundRect(cx - s * 0.06, topY + bh * 0.26, s * 0.12, s * 0.07, s * 0.015);
  ctx.fill();
}

function can(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const w = s * 0.44;
  const h = s * 0.92;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, '#d98a12');
  g.addColorStop(0.35, '#ffd46a');
  g.addColorStop(0.6, '#ffb52e');
  g.addColorStop(1, '#b8650a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.04, w, h * 0.94, w * 0.12);
  ctx.fill();
  // rims
  ctx.fillStyle = '#c9c9c9';
  ctx.beginPath();
  ctx.ellipse(cx, y + h * 0.05, w * 0.47, h * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(cx - w * 0.1, y + h * 0.035, w * 0.2, h * 0.02);
  // label band
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(x, y + h * 0.42, w, h * 0.16);
  ctx.fillStyle = '#b8500a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${h * 0.09}px Inter, sans-serif`;
  ctx.fillText('SOLA', cx, y + h * 0.505);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + w * 0.18, y + h * 0.1, w * 0.07, h * 0.8);
}

function sneaker(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const w = s * 1.25;
  const x = cx - w / 2;
  const base = cy + s * 0.22;
  // sole
  ctx.fillStyle = '#f2efe9';
  ctx.beginPath();
  ctx.roundRect(x, base, w, s * 0.13, s * 0.06);
  ctx.fill();
  ctx.fillStyle = '#ff5a1f';
  ctx.fillRect(x + w * 0.03, base + s * 0.08, w * 0.94, s * 0.035);
  // upper
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.02, base);
  ctx.quadraticCurveTo(x + w * 0.02, base - s * 0.2, x + w * 0.28, base - s * 0.28);
  ctx.lineTo(x + w * 0.5, base - s * 0.42);
  ctx.quadraticCurveTo(x + w * 0.62, base - s * 0.48, x + w * 0.72, base - s * 0.4);
  ctx.quadraticCurveTo(x + w * 0.98, base - s * 0.22, x + w, base);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // stripe and laces
  ctx.strokeStyle = '#ff5a1f';
  ctx.lineWidth = s * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, base - s * 0.05);
  ctx.quadraticCurveTo(x + w * 0.55, base - s * 0.12, x + w * 0.78, base - s * 0.3);
  ctx.stroke();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = s * 0.018;
  for (let i = 0; i < 4; i++) {
    const lx = x + w * (0.44 + i * 0.06);
    ctx.beginPath();
    ctx.moveTo(lx, base - s * (0.3 + i * 0.03));
    ctx.lineTo(lx + w * 0.05, base - s * (0.26 + i * 0.03));
    ctx.stroke();
  }
}

export const BRANDS: Record<Industry, Brand> = {
  fragrance: {
    id: 'fragrance',
    label: 'Fragrance',
    name: 'VEIL',
    tagline: 'Wear the night.',
    dark: ['#1a1310', '#070505'],
    light: ['#efe6dc', '#dccfc0'],
    accent: '#c9a46b',
    draw: bottle,
    moment: [
      { label: '[ glass on marble ]', play: glassClink },
      { label: '[ soft mist ]', play: mist },
      { label: '[ shimmer ]', play: sparkle },
    ],
    place: (m, k) => {
      audio.impact(0.2 + m * 0.5, k * 0.7);
      if (m > 0.6) audio.tone(1975, 0.9, 0.025 * k, { send: 0.6 });
    },
  },
  fashion: {
    id: 'fashion',
    label: 'Fashion',
    name: 'NORD',
    tagline: 'Made to be noticed.',
    dark: ['#17120f', '#060504'],
    light: ['#f1ebe3', '#ddd2c4'],
    accent: '#d8b77a',
    draw: handbag,
    moment: [
      { label: '[ leather lands softly ]', play: () => audio.impact(0.45, 0.5) },
      { label: '[ gold clasp clicks ]', play: () => (audio.click(4200, 0.18), audio.tone(3520, 0.3, 0.03)) },
      { label: '[ a little shine ]', play: sparkle },
    ],
    place: (m, k) => audio.impact(0.3 + m * 0.45, k * 0.6),
  },
  tech: {
    id: 'tech',
    label: 'Tech',
    name: 'KORA',
    tagline: 'Hear everything.',
    dark: ['#161616', '#060606'],
    light: ['#ecebe8', '#d8d6d2'],
    accent: '#ff5a1f',
    draw: (ctx, cx, cy, s) => drawHeadphones(ctx, cx, cy + s * 0.05, s * 0.95),
    moment: [
      { label: '[ soft landing ]', play: () => (audio.impact(0.3, 0.5), softClick()) },
      { label: '[ power on ]', play: () => audio.sweep(300, 900, 0.35, 0.08) },
      { label: '[ bright chime ]', play: () => [880, 1318.5].forEach((f, i) => audio.tone(f, 1.2, 0.04, { when: audio.ctx!.currentTime + i * 0.08, send: 0.5 })) },
    ],
    place: (m, k) => audio.impact(0.25 + m * 0.5, k * 0.7),
  },
  drink: {
    id: 'drink',
    label: 'Food & Drink',
    name: 'SOLA',
    tagline: 'Taste the light.',
    dark: ['#1c140a', '#080603'],
    light: ['#fbf1de', '#efdcbc'],
    accent: '#ffb52e',
    draw: can,
    moment: [
      { label: '[ can on the table ]', play: () => audio.impact(0.25, 0.5) },
      { label: '[ crack and fizz ]', play: () => (crack(), fizz()) },
      { label: '[ ice clinks ]', play: glassClink },
    ],
    place: (m, k) => audio.impact(0.2 + m * 0.4, k * 0.6),
  },
  sport: {
    id: 'sport',
    label: 'Sport',
    name: 'STRIDE',
    tagline: 'Move first.',
    dark: ['#121417', '#050607'],
    light: ['#eef0f2', '#d7dbe0'],
    accent: '#ff5a1f',
    draw: sneaker,
    moment: [
      { label: '[ rubber hits the floor ]', play: () => audio.impact(0.55, 0.8) },
      { label: '[ squeak ]', play: squeak },
      { label: '[ swoosh ]', play: () => audio.whoosh(0.35, 0.16) },
    ],
    place: (m, k) => audio.impact(0.35 + m * 0.4, k * 0.8),
  },
};

export const INDUSTRIES = Object.values(BRANDS).map((b) => ({ id: b.id, label: b.label }));

// ───────────── the current choice, shared by every chapter ─────────────
let current: Industry = 'fragrance';
const listeners = new Set<() => void>();
export const brandStore = {
  get: () => BRANDS[current],
  id: () => current,
  set: (id: Industry) => {
    current = id;
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useBrand() {
  const id = useSyncExternalStore(brandStore.subscribe, brandStore.id);
  return BRANDS[id];
}
