/**
 * Weight presets. The object never changes size or shape —
 * only how it accelerates, resists, collides and settles.
 */
export interface MassPreset {
  id: string;
  label: string;
  /** readout only */
  kg: string;
  /** 0..1 — drives sound and world reaction */
  mass: number;
  gravity: number;
  /** spring stiffness of the drag (how eagerly it follows the hand) */
  stiffness: number;
  damping: number;
  restitution: number;
  /** horizontal friction on the floor */
  friction: number;
  /** air drag */
  drag: number;
  /** how much the object itself deforms on impact */
  squash: number;
  /** how much the world reacts on impact */
  shake: number;
}

export const MASS: MassPreset[] = [
  { id: 'weightless', label: 'Weightless', kg: '0.000', mass: 0, gravity: 0, stiffness: 140, damping: 9, restitution: 0.95, friction: 0.2, drag: 0.35, squash: 0.1, shake: 0 },
  { id: 'light', label: 'Light', kg: '0.02', mass: 0.08, gravity: 1500, stiffness: 320, damping: 22, restitution: 0.66, friction: 3.2, drag: 0.9, squash: 0.42, shake: 0 },
  { id: 'medium', label: 'Medium', kg: '2.4', mass: 0.4, gravity: 2300, stiffness: 95, damping: 15, restitution: 0.38, friction: 2.2, drag: 0.35, squash: 0.2, shake: 4 },
  { id: 'heavy', label: 'Heavy', kg: '86', mass: 0.72, gravity: 3300, stiffness: 28, damping: 9.5, restitution: 0.14, friction: 1.6, drag: 0.12, squash: 0.08, shake: 16 },
  { id: 'massive', label: 'Massive', kg: '4 200', mass: 1, gravity: 4300, stiffness: 9, damping: 5.6, restitution: 0.04, friction: 1.2, drag: 0.04, squash: 0.03, shake: 34 },
];
