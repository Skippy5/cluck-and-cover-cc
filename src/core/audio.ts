/**
 * Every sound in the game is synthesized here with WebAudio — no audio files.
 * The context is created lazily on the first gesture so browsers don't block it.
 */

type Wave = OscillatorType;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;

  /** Safe to call repeatedly; only the first call after a gesture does anything. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.28;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.28;
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** One enveloped oscillator. All the cues below are built from these. */
  private tone(
    freq: number,
    dur: number,
    wave: Wave = 'square',
    gain = 0.5,
    slideTo?: number,
    delay = 0,
  ): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtered noise burst — used for dirt, thuds and shatters. */
  private noise(dur: number, gain = 0.3, freq = 900, delay = 0): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || this.muted) return;
    const t0 = ctx.currentTime + delay;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(env).connect(master);
    src.start(t0);
  }

  egg(combo: number): void {
    const step = Math.min(combo, 8) - 1;
    this.tone(520 * Math.pow(1.06, step), 0.09, 'triangle', 0.5);
    this.tone(780 * Math.pow(1.06, step), 0.07, 'sine', 0.25, undefined, 0.03);
  }

  throwCorn(): void {
    this.tone(340, 0.07, 'sawtooth', 0.18, 180);
  }

  hitEnemy(): void {
    this.noise(0.12, 0.35, 1400);
    this.tone(200, 0.1, 'square', 0.3, 90);
  }

  bossHit(): void {
    this.noise(0.18, 0.4, 700);
    this.tone(150, 0.22, 'sawtooth', 0.35, 70);
  }

  hurt(): void {
    this.tone(300, 0.3, 'sawtooth', 0.42, 70);
    this.noise(0.25, 0.3, 400);
  }

  powerup(): void {
    this.tone(440, 0.09, 'triangle', 0.35);
    this.tone(660, 0.09, 'triangle', 0.35, undefined, 0.08);
    this.tone(880, 0.16, 'triangle', 0.35, undefined, 0.16);
  }

  cluck(): void {
    this.tone(700, 0.05, 'square', 0.14, 480);
    this.tone(520, 0.06, 'square', 0.12, 620, 0.06);
  }

  levelClear(): void {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => this.tone(n, 0.22, 'triangle', 0.4, undefined, i * 0.12));
  }

  gameOver(): void {
    const notes = [392, 349, 294, 220];
    notes.forEach((n, i) => this.tone(n, 0.35, 'sawtooth', 0.3, undefined, i * 0.18));
  }

  victory(): void {
    const notes = [523, 659, 784, 1046, 784, 1046, 1318];
    notes.forEach((n, i) => this.tone(n, 0.26, 'triangle', 0.42, undefined, i * 0.15));
  }

  buy(): void {
    this.tone(880, 0.07, 'square', 0.3);
    this.tone(1320, 0.12, 'square', 0.25, undefined, 0.07);
  }

  deny(): void {
    this.tone(180, 0.16, 'square', 0.25, 110);
  }

  ui(): void {
    this.tone(660, 0.05, 'square', 0.16);
  }
}

export const sfx = new Sfx();
