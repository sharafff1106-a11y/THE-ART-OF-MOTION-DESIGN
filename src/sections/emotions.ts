import { audio } from '../audio/engine';

export type EmotionId = 'calm' | 'nervous' | 'powerful' | 'playful' | 'luxury' | 'sad' | 'hopeful';

export interface Emotion {
  label: string;
  speed: number;
  amp: number;
  freq: number;
  gloss: number;
  rot: number;
  scale: number;
  y: number;
  pulse?: number;
  jitter?: number;
  bounce?: number;
  colors: [string, string, string];
  /** soft background light behind the form */
  light: string;
  line: string;
  sound: () => void;
}

const chord = (notes: number[], dur: number, gain: number, spread = 0) =>
  notes.forEach((f, i) => audio.tone(f, dur, gain, { when: audio.ctx ? audio.ctx.currentTime + i * spread : undefined, pan: (i / notes.length) * 1.2 - 0.6 }));

export const EMOTIONS: Record<EmotionId, Emotion> = {
  calm: {
    label: 'Calm',
    speed: 0.22, amp: 0.14, freq: 1.1, gloss: 0.4, rot: 0.12, scale: 1, y: 0,
    colors: ['#8fb4ff', '#d7c8ff', '#ffe1d1'], light: 'rgba(143,180,255,0.28)',
    line: 'Slow, wide, and soft. Nothing to prove.',
    sound: () => chord([220, 277.2, 329.6], 3.5, 0.05, 0.12),
  },
  nervous: {
    label: 'Nervous',
    speed: 2.8, amp: 0.1, freq: 4.2, gloss: 0.2, rot: 0.9, scale: 0.88, y: 0, jitter: 0.035,
    colors: ['#9aa3a8', '#4a6670', '#e8f0f0'], light: 'rgba(120,150,160,0.25)',
    line: 'Small, fast, irregular. It cannot settle.',
    sound: () => {
      for (let i = 0; i < 9; i++) audio.click(2600 + Math.random() * 1600, 0.08, { when: audio.ctx ? audio.ctx.currentTime + i * (0.05 + Math.random() * 0.07) : undefined });
    },
  },
  powerful: {
    label: 'Powerful',
    speed: 0.7, amp: 0.26, freq: 1.4, gloss: 0.6, rot: 0.25, scale: 1.12, y: 0, pulse: 0.9,
    colors: ['#ff4d12', '#2b3cff', '#ff9a6a'], light: 'rgba(255,90,40,0.25)',
    line: 'Large, heavy, deliberate. Every beat lands.',
    sound: () => {
      audio.impact(0.95, 0.8);
      chord([55, 82.4, 110], 2.6, 0.08);
    },
  },
  playful: {
    label: 'Playful',
    speed: 1.4, amp: 0.24, freq: 2.2, gloss: 0.7, rot: 0.7, scale: 0.92, y: -0.1, bounce: 0.22,
    colors: ['#ff6fb5', '#ffd23f', '#40d8ff'], light: 'rgba(255,170,90,0.25)',
    line: 'Bouncy, elastic, surprising.',
    sound: () => [523, 659, 784, 1047].forEach((f, i) => audio.tone(f, 0.35, 0.05, { when: audio.ctx ? audio.ctx.currentTime + i * 0.09 : undefined, type: 'triangle' })),
  },
  luxury: {
    label: 'Luxury',
    speed: 0.16, amp: 0.07, freq: 0.9, gloss: 1.4, rot: 0.08, scale: 1.02, y: 0,
    colors: ['#1a1714', '#c9a46b', '#f4ead8'], light: 'rgba(201,164,107,0.25)',
    line: 'Very little movement. Total control.',
    sound: () => chord([196, 246.9, 293.7, 370], 4, 0.04, 0.2),
  },
  sad: {
    label: 'Sad',
    speed: 0.14, amp: 0.1, freq: 0.8, gloss: 0.15, rot: 0.05, scale: 0.84, y: -0.32,
    colors: ['#6f7c8c', '#2d3846', '#aab4c0'], light: 'rgba(90,110,130,0.22)',
    line: 'It sinks, slows, and loses colour.',
    sound: () => chord([220, 261.6, 329.6], 4.5, 0.045, 0.35),
  },
  hopeful: {
    label: 'Hopeful',
    speed: 0.42, amp: 0.18, freq: 1.3, gloss: 0.8, rot: 0.18, scale: 1.02, y: 0.18,
    colors: ['#ffb38a', '#ffe58a', '#9fd3ff'], light: 'rgba(255,214,140,0.3)',
    line: 'It rises, warms, and opens.',
    sound: () => chord([261.6, 329.6, 392, 523.3], 3.4, 0.045, 0.15),
  },
};
