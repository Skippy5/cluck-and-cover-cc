/**
 * Particle bursts and floating score text. Both are pure presentation —
 * nothing here feeds back into gameplay, so it can be cleared at any time.
 */

import { rand, TAU } from './math';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  spin: number;
  angle: number;
  gravity: number;
  shape: 'chip' | 'dot' | 'feather';
}

export interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  size: number;
}

export class Fx {
  particles: Particle[] = [];
  texts: FloatText[] = [];

  clear(): void {
    this.particles.length = 0;
    this.texts.length = 0;
  }

  burst(
    x: number,
    y: number,
    colors: readonly string[],
    count = 10,
    opts: { speed?: number; size?: number; life?: number; shape?: Particle['shape']; gravity?: number } = {},
  ): void {
    const speed = opts.speed ?? 140;
    const size = opts.size ?? 4;
    const life = opts.life ?? 0.5;
    const shape = opts.shape ?? 'chip';
    const gravity = opts.gravity ?? 260;
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.35, speed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rand(0, 40),
        life: rand(life * 0.7, life * 1.3),
        maxLife: life,
        size: rand(size * 0.6, size * 1.4),
        color: colors[Math.floor(Math.random() * colors.length)],
        spin: rand(-8, 8),
        angle: rand(0, TAU),
        gravity,
        shape,
      });
    }
  }

  /** Slow drifting feathers, for anything that involves a chicken. */
  feathers(x: number, y: number, colors: readonly string[], count = 6): void {
    this.burst(x, y, colors, count, { speed: 70, size: 6, life: 1.1, shape: 'feather', gravity: 40 });
  }

  text(x: number, y: number, text: string, color: string, size = 18): void {
    this.texts.push({ x, y, vy: -46, life: 0.95, maxLife: 0.95, text, color, size });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - 1.6 * dt;
      if (p.shape === 'feather') p.vx += Math.sin(p.life * 7) * 24 * dt;
      p.angle += p.spin * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 1 - 1.4 * dt;
    }
  }
}
