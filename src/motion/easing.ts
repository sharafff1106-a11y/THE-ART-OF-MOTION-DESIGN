/**
 * Timing presets. Each one moves the same distance in the same duration.
 * Only the distribution of that movement over time changes — and with it,
 * the personality.
 */
import { lerp } from './math';

export type Ease = (t: number) => number;

export const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart: Ease = (t) => 1 - Math.pow(1 - t, 4);
export const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutExpo: Ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

const linear: Ease = (t) => t;

/** Pull back, hold the breath, release. */
const anticipation: Ease = (t) => {
  const split = 0.38;
  const back = -0.14;
  if (t < split) return back * easeInOutSine(t / split);
  return lerp(back, 1, easeOutQuart((t - split) / (1 - split)));
};

/** Too much energy: passes the target and comes back. */
const overshoot: Ease = (t) => {
  const s = 2.4;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

/** A damped spring — arrives, then loses its energy physically. */
const settle: Ease = (t) => {
  if (t >= 1) return 1;
  return 1 - Math.exp(-6.2 * t) * Math.cos(15.5 * t);
};

export interface TimingPreset {
  id: string;
  label: string;
  ease: Ease;
  personality: string;
  note: string;
}

export const TIMING: TimingPreset[] = [
  { id: 'linear', label: 'Linear', ease: linear, personality: 'mechanical.', note: 'Constant speed. Nothing in nature moves like this.' },
  { id: 'eased', label: 'Eased', ease: easeInOutCubic, personality: 'natural.', note: 'It gathers speed, then lets it go.' },
  { id: 'anticipation', label: 'Anticipation', ease: anticipation, personality: 'intentional.', note: 'A small move backwards announces the big one.' },
  { id: 'overshoot', label: 'Overshoot', ease: overshoot, personality: 'energetic.', note: 'More energy than it needs. Confidence, or excitement.' },
  { id: 'settle', label: 'Settle', ease: settle, personality: 'physical.', note: 'It arrives, then has to lose what it carried.' },
];
