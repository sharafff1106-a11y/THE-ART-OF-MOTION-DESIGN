/**
 * Visual environments. Each chapter lives in its own light — the colour
 * system itself demonstrates contrast as the piece moves through it.
 */
export type Env = 'ivory' | 'paper' | 'bluegrey' | 'charcoal' | 'orange' | 'white';

export const ENV: Record<Env, { bg: string; fg: string; muted: string; accent: string }> = {
  ivory: { bg: '#efe9df', fg: '#1b1a17', muted: 'rgba(27,26,23,0.48)', accent: '#d2492a' },
  paper: { bg: '#f7f6f2', fg: '#141414', muted: 'rgba(20,20,20,0.45)', accent: '#d2492a' },
  bluegrey: { bg: '#dce2e6', fg: '#16202b', muted: 'rgba(22,32,43,0.5)', accent: '#2f5bd3' },
  charcoal: { bg: '#1c1c1a', fg: '#ece6da', muted: 'rgba(236,230,218,0.45)', accent: '#e8a25a' },
  orange: { bg: '#e05d2a', fg: '#1a110b', muted: 'rgba(26,17,11,0.55)', accent: '#fff3e6' },
  white: { bg: '#ffffff', fg: '#111111', muted: 'rgba(17,17,17,0.4)', accent: '#111111' },
};
