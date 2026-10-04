/**
 * The sonic system.
 *
 * Nothing here is a sample. Every sound is synthesised from two raw materials —
 * noise and sine — shaped by envelopes, filters and space. That keeps the
 * sound physically linked to the motion parameters that drive it (mass,
 * velocity, material) instead of being a decoration laid on top.
 */
import { clamp, lerp } from '../motion/math';

type Listener = (enabled: boolean) => void;

interface VoiceOpts {
  when?: number;
  pan?: number;
  /** amount sent to the shared reverb, 0..1 */
  send?: number;
}

class AudioEngine {
  ctx: AudioContext | null = null;
  enabled = false;

  private master!: GainNode;
  private reverbIn!: GainNode;
  private noise!: AudioBuffer;
  private airNodes: { gain: GainNode; filter: BiquadFilterNode } | null = null;
  private listeners = new Set<Listener>();

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  getEnabled = () => this.enabled;

  private emit() {
    this.listeners.forEach((l) => l(this.enabled));
  }

  private init() {
    const Ctx: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.002;
    comp.release.value = 0.2;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp).connect(ctx.destination);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.impulse(3.2, 2.8);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 0.9;
    this.reverbIn.connect(reverb).connect(this.master);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private impulse(seconds: number, decay: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  async enable() {
    if (!this.ctx) this.init();
    const ctx = this.ctx!;
    await ctx.resume();
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.12);
    this.enabled = true;
    this.emit();
  }

  disable() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
    this.enabled = false;
    this.emit();
    window.setTimeout(() => {
      if (!this.enabled) ctx.suspend();
    }, 600);
  }

  toggle() {
    if (this.enabled) this.disable();
    else void this.enable();
  }

  /** True only when sound can actually be heard. */
  get live() {
    return this.enabled && !!this.ctx && this.ctx.state === 'running';
  }

  /** Convert a performance.now()-based time (seconds) into AudioContext time. */
  at(perfSeconds: number) {
    const ctx = this.ctx!;
    return ctx.currentTime + Math.max(0, perfSeconds - performance.now() / 1000);
  }

  /** Output bus for one voice: gain → pan → master (+ reverb send). */
  private bus(gain: number, pan = 0, send = 0) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = gain;
    const p = ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p).connect(this.master);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      p.connect(s).connect(this.reverbIn);
    }
    return g;
  }

  private env(param: AudioParam, t: number, attack: number, decay: number, peak = 1) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  /** Filtered noise burst: the raw material of every transient. */
  burst(freq: number, q: number, decay: number, gain: number, o: VoiceOpts = {}) {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = o.when ?? ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const e = ctx.createGain();
    this.env(e.gain, t, 0.001, decay);
    src.connect(f).connect(e).connect(this.bus(gain, o.pan, o.send));
    src.start(t, Math.random() * 1.5);
    src.stop(t + decay + 0.05);
  }

  /** Pitched sine with an exponential pitch sweep — the body of an impact. */
  sweep(f0: number, f1: number, dur: number, gain: number, o: VoiceOpts & { type?: OscillatorType } = {}) {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = o.when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const e = ctx.createGain();
    this.env(e.gain, t, 0.002, dur);
    osc.connect(e).connect(this.bus(gain, o.pan, o.send));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** A micro click — interface, ticks, decisions. */
  click(freq = 2600, gain = 0.2, o: VoiceOpts = {}) {
    this.burst(freq, 8, 0.028, gain, { send: 0.05, ...o });
    this.sweep(freq * 0.5, freq * 0.45, 0.02, gain * 0.35, o);
  }

  tick(gain = 0.12, o: VoiceOpts = {}) {
    this.burst(5200, 10, 0.012, gain, o);
  }

  /**
   * An impact whose character is derived from mass and strength.
   * mass 0 → a high, dry click. mass 1 → a deep, long, room-filling thud.
   */
  impact(mass: number, strength: number, o: VoiceOpts = {}) {
    if (!this.live) return;
    const m = clamp(mass, 0, 1);
    const s = clamp(strength, 0, 1);
    if (s < 0.02) return;
    const send = lerp(0.04, 0.55, m);
    const base = { ...o, send };
    // transient
    this.burst(lerp(4800, 650, m), lerp(6, 1.2, m), lerp(0.014, 0.07, m), s * lerp(0.35, 0.55, m), base);
    // body
    this.sweep(lerp(1100, 120, m), lerp(620, 40, m), lerp(0.045, 0.6, m), s * lerp(0.22, 1, m), base);
    // sub-bass for heavy objects
    if (m > 0.5) this.sweep(62, 30, 0.6 + m * 0.9, s * (m - 0.45) * 1.6, { ...o, send: 0.2 });
    // debris for massive objects
    if (m > 0.75) {
      const t0 = o.when ?? this.ctx!.currentTime;
      for (let i = 0; i < 7; i++) {
        this.burst(1200 + Math.random() * 3200, 4, 0.02, s * 0.06 * Math.random(), {
          when: t0 + 0.04 + Math.random() * 0.4,
          pan: (Math.random() - 0.5) * 1.4,
          send: 0.4,
        });
      }
    }
  }

  kick(gain = 0.6, o: VoiceOpts = {}) {
    this.sweep(170, 46, 0.34, gain, o);
    this.burst(1400, 2, 0.012, gain * 0.25, o);
  }

  wood(freq = 1800, gain = 0.3, o: VoiceOpts = {}) {
    this.burst(freq, 14, 0.045, gain, { send: 0.12, ...o });
    this.sweep(freq * 0.5, freq * 0.48, 0.06, gain * 0.5, { send: 0.12, ...o });
  }

  tone(freq: number, dur: number, gain: number, o: VoiceOpts & { type?: OscillatorType } = {}) {
    if (!this.live) return;
    const ctx = this.ctx!;
    const t = o.when ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.value = freq;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t);
    e.gain.linearRampToValueAtTime(1, t + Math.min(0.4, dur * 0.3));
    e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(e).connect(this.bus(gain, o.pan, o.send ?? 0.3));
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /**
   * Continuous air: a bed of filtered noise driven by movement.
   * level 0..1, brightness 0..1.
   */
  air(level: number, brightness = 0.5) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (!this.airNodes) {
      if (!this.live) return;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(this.master);
      const s = ctx.createGain();
      s.gain.value = 0.3;
      gain.connect(s).connect(this.reverbIn);
      src.start();
      this.airNodes = { gain, filter };
    }
    const t = ctx.currentTime;
    this.airNodes.gain.gain.setTargetAtTime(this.enabled ? clamp(level, 0, 1) * 0.16 : 0, t, 0.08);
    this.airNodes.filter.frequency.setTargetAtTime(lerp(260, 3800, clamp(brightness, 0, 1)), t, 0.1);
  }
}

export const audio = new AudioEngine();
