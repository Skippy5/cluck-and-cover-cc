/**
 * The farm itself: ground, fence, and every obstacle type. Same block-print
 * rules as the cast — flat fills, ink outline, no photographic texture.
 */

import { TAU } from '../core/math';
import { circle, ellipse, ink, limb, pen, poly, roundRect, shadow, type Ctx } from './draw';
import {
  BARN,
  BARN_DEEP,
  CLOVER,
  CLOVER_DEEP,
  CREAM,
  CREAM_DEEP,
  INK,
  INK_SOFT,
  SKY,
  SKY_DEEP,
  STONE,
  STONE_DEEP,
  WHEAT,
  WHEAT_DEEP,
  type Theme,
} from './palette';

export type ObstacleKind =
  | 'rock'
  | 'bale'
  | 'water'
  | 'tree'
  | 'crate'
  | 'sunflower'
  | 'mud'
  | 'drift'
  | 'stump';

/** Deterministic per-obstacle jitter so shapes look hand-cut but never flicker. */
const wobble = (seed: number, i: number): number => {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function drawObstacle(ctx: Ctx, kind: ObstacleKind, w: number, h: number, seed: number, t: number): void {
  switch (kind) {
    case 'rock':
      drawRock(ctx, w, h, seed);
      break;
    case 'bale':
      drawBale(ctx, w, h);
      break;
    case 'water':
      drawWater(ctx, w, h, seed, t);
      break;
    case 'tree':
      drawTree(ctx, w, h, seed);
      break;
    case 'crate':
      drawCrate(ctx, w, h);
      break;
    case 'sunflower':
      drawSunflower(ctx, w, h, seed, t);
      break;
    case 'mud':
      drawMud(ctx, w, h, seed);
      break;
    case 'drift':
      drawDrift(ctx, w, h, seed);
      break;
    case 'stump':
      drawStump(ctx, w, h);
      break;
  }
}

function drawRock(ctx: Ctx, w: number, h: number, seed: number): void {
  shadow(ctx, 0, h * 0.42, w * 0.52, h * 0.2);
  const pts: number[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU - Math.PI / 2;
    const r = 0.72 + wobble(seed, i) * 0.34;
    pts.push(Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r);
  }
  poly(ctx, pts, STONE, 3);
  // one flat facet catching the light
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, -h * 0.18);
  ctx.lineTo(w * 0.06, -h * 0.32);
  ctx.lineTo(w * 0.2, -h * 0.02);
  ctx.closePath();
  ctx.fillStyle = CREAM_DEEP;
  ctx.globalAlpha = 0.45;
  ctx.fill();
  ctx.globalAlpha = 1;
  pen(ctx, 1.4, STONE_DEEP);
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, h * 0.12);
  ctx.lineTo(w * 0.1, h * 0.24);
  ctx.stroke();
}

function drawBale(ctx: Ctx, w: number, h: number): void {
  shadow(ctx, 0, h * 0.46, w * 0.5, h * 0.16);
  roundRect(ctx, 0, 0, w, h, 6, WHEAT, 3);
  pen(ctx, 1.2, WHEAT_DEEP);
  ctx.beginPath();
  for (let i = 1; i < 6; i++) {
    const y = -h / 2 + (h / 6) * i;
    ctx.moveTo(-w / 2 + 4, y);
    ctx.lineTo(w / 2 - 4, y);
  }
  ctx.stroke();
  // twine
  pen(ctx, 2.4, INK_SOFT);
  ctx.beginPath();
  ctx.moveTo(-w * 0.22, -h / 2 + 2);
  ctx.lineTo(-w * 0.22, h / 2 - 2);
  ctx.moveTo(w * 0.22, -h / 2 + 2);
  ctx.lineTo(w * 0.22, h / 2 - 2);
  ctx.stroke();
}

function drawWater(ctx: Ctx, w: number, h: number, seed: number, t: number): void {
  // A muddy bank ring first, so the pond sits in the ground rather than on it.
  const ring: number[] = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 0.9 + wobble(seed, i) * 0.2;
    ring.push(Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r);
  }
  poly(ctx, ring, '#8a7a52', 2.4);

  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 0.78 + wobble(seed, i) * 0.18;
    pts.push(Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r);
  }
  // open water: light at the middle, deeper at the rim
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  const g = ctx.createRadialGradient(0, -h * 0.06, w * 0.08, 0, 0, w * 0.5);
  g.addColorStop(0, '#a9d3e2');
  g.addColorStop(0.62, SKY);
  g.addColorStop(1, SKY_DEEP);
  ctx.fillStyle = g;
  ctx.fill();
  pen(ctx, 2.6, SKY_DEEP);
  ctx.stroke();

  ctx.save();
  ctx.clip();
  // ripples and a couple of lily pads
  pen(ctx, 2, '#dff2fa');
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const y = -h * 0.26 + i * h * 0.18 + Math.sin(t * 1.3 + i) * 2.5;
    const x0 = -w * 0.3 + (i % 2) * w * 0.1;
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + w * 0.12, y - 3.5, x0 + w * 0.24, y);
    ctx.quadraticCurveTo(x0 + w * 0.36, y + 3.5, x0 + w * 0.48, y);
  }
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const px = (wobble(seed, i + 9) - 0.5) * w * 0.5;
    const py = (wobble(seed, i + 12) - 0.5) * h * 0.5;
    ctx.beginPath();
    ctx.ellipse(px, py, 9, 7, wobble(seed, i) * 3, 0.5, TAU);
    ctx.closePath();
    ink(ctx, CLOVER, 1.8);
  }
  ctx.restore();

  // reeds standing on the bank, breaking the outline
  pen(ctx, 2.4, CLOVER_DEEP);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = -w * 0.36 + i * w * 0.18 + wobble(seed, i + 5) * 10;
    const base = h * 0.42;
    ctx.moveTo(x, base);
    ctx.quadraticCurveTo(x + 4, base - h * 0.16, x + 1, base - h * 0.3);
  }
  ctx.stroke();
}

function drawTree(ctx: Ctx, w: number, h: number, seed: number): void {
  shadow(ctx, 0, h * 0.46, w * 0.42, h * 0.14);
  // trunk
  ctx.beginPath();
  ctx.moveTo(-w * 0.11, h * 0.46);
  ctx.lineTo(-w * 0.07, -h * 0.05);
  ctx.lineTo(w * 0.07, -h * 0.05);
  ctx.lineTo(w * 0.11, h * 0.46);
  ctx.closePath();
  ink(ctx, '#8a6238', 2.8);
  // canopy: three overlapping blobs
  const blobs: [number, number, number][] = [
    [-w * 0.24, -h * 0.16, w * 0.3],
    [w * 0.22, -h * 0.2, w * 0.29],
    [0, -h * 0.36, w * 0.34],
  ];
  for (const [bx, by, br] of blobs) circle(ctx, bx, by, br, CLOVER, 3);
  ctx.save();
  ctx.beginPath();
  for (const [bx, by, br] of blobs) {
    ctx.moveTo(bx + br, by);
    ctx.arc(bx, by, br, 0, TAU);
  }
  ctx.clip();
  ctx.fillStyle = CLOVER_DEEP;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(w * 0.16, -h * 0.06, w * 0.3, h * 0.16, 0.3, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  // apples
  for (let i = 0; i < 4; i++) {
    const ax = (wobble(seed, i) - 0.5) * w * 0.7;
    const ay = -h * 0.12 - wobble(seed, i + 3) * h * 0.3;
    circle(ctx, ax, ay, 4, BARN, 1.6);
  }
  ctx.restore();
}

function drawCrate(ctx: Ctx, w: number, h: number): void {
  shadow(ctx, 0, h * 0.46, w * 0.5, h * 0.16);
  roundRect(ctx, 0, 0, w, h, 3, '#9a7247', 3);
  pen(ctx, 2.2, '#7a5834');
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 3, -h / 2 + 3);
  ctx.lineTo(w / 2 - 3, h / 2 - 3);
  ctx.moveTo(w / 2 - 3, -h / 2 + 3);
  ctx.lineTo(-w / 2 + 3, h / 2 - 3);
  ctx.moveTo(-w / 2 + 3, 0);
  ctx.lineTo(w / 2 - 3, 0);
  ctx.stroke();
}

function drawSunflower(ctx: Ctx, w: number, h: number, seed: number, t: number): void {
  shadow(ctx, 0, h * 0.46, w * 0.3, h * 0.1);
  const sway = Math.sin(t * 1.1 + seed) * 0.06;
  ctx.save();
  ctx.translate(0, h * 0.42);
  ctx.rotate(sway);
  ctx.translate(0, -h * 0.42);
  // stem + leaves
  pen(ctx, 5, INK);
  ctx.beginPath();
  ctx.moveTo(0, h * 0.46);
  ctx.lineTo(0, -h * 0.1);
  ctx.stroke();
  pen(ctx, 3, CLOVER_DEEP);
  ctx.stroke();
  ellipse(ctx, -w * 0.24, h * 0.16, w * 0.2, h * 0.07, CLOVER, -0.5, 2);
  ellipse(ctx, w * 0.24, h * 0.02, w * 0.2, h * 0.07, CLOVER, 0.5, 2);
  // petals
  const head = -h * 0.22;
  const pr = w * 0.34;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    ctx.save();
    ctx.translate(Math.cos(a) * pr * 0.7, head + Math.sin(a) * pr * 0.7);
    ctx.rotate(a);
    ellipse(ctx, 0, 0, pr * 0.5, pr * 0.22, WHEAT, 0, 2);
    ctx.restore();
  }
  circle(ctx, 0, head, pr * 0.55, '#6b4a25', 2.6);
  ctx.fillStyle = INK_SOFT;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const r = pr * 0.3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, head + Math.sin(a) * r, 1.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawMud(ctx: Ctx, w: number, h: number, seed: number): void {
  const pts: number[] = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 0.78 + wobble(seed, i) * 0.28;
    pts.push(Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r);
  }
  // Flat in the ground, not sitting on it: a thin rim and a wet sheen.
  poly(ctx, pts, '#5c4526', 1.4);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#6d5330';
  ctx.beginPath();
  ctx.ellipse(-w * 0.1, -h * 0.06, w * 0.3, h * 0.22, 0.2, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#9a8156';
  ctx.beginPath();
  ctx.ellipse(w * 0.14, -h * 0.16, w * 0.2, h * 0.08, -0.3, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-w * 0.2, h * 0.18, w * 0.13, h * 0.05, 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawDrift(ctx: Ctx, w: number, h: number, seed: number): void {
  shadow(ctx, 0, h * 0.42, w * 0.46, h * 0.14, 0.1);
  const pts: number[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const r = 0.76 + wobble(seed, i) * 0.3;
    pts.push(Math.cos(a) * (w / 2) * r, Math.sin(a) * (h / 2) * r * 0.85);
  }
  poly(ctx, pts, '#f2f7fa', 2.6);
  ctx.fillStyle = '#d6e6ee';
  ctx.beginPath();
  ctx.ellipse(w * 0.08, h * 0.16, w * 0.3, h * 0.14, 0, 0, TAU);
  ctx.fill();
}

function drawStump(ctx: Ctx, w: number, h: number): void {
  shadow(ctx, 0, h * 0.42, w * 0.46, h * 0.16);
  roundRect(ctx, 0, h * 0.06, w * 0.82, h * 0.7, 4, '#8a6238', 3);
  ellipse(ctx, 0, -h * 0.26, w * 0.44, h * 0.2, '#a97c48', 0, 2.6);
  pen(ctx, 1.2, '#7a5834');
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.26, w * 0.44 * (i / 3), h * 0.2 * (i / 3), 0, 0, TAU);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/* Ground and fence                                                     */
/* ------------------------------------------------------------------ */

/** Mown field with alternating stripes and a faint print grain. */
export function drawGround(ctx: Ctx, w: number, h: number, theme: Theme): void {
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = theme.groundStripe;
  const band = 46;
  for (let y = 0; y < h; y += band * 2) {
    ctx.fillRect(0, y, w, Math.min(band, h - y));
  }
  // sparse tufts so the field is not a flat rectangle
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = wobble(i, 1) * w;
    const y = wobble(i, 2) * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y - 4);
    ctx.moveTo(x + 3, y);
    ctx.lineTo(x + 4, y - 3);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Post-and-rail fence drawn just inside the world bounds. */
export function drawFence(ctx: Ctx, w: number, h: number, theme: Theme): void {
  const rail = (x1: number, y1: number, x2: number, y2: number): void => {
    limb(ctx, x1, y1, x2, y2, 5, theme.fence);
  };
  const post = (x: number, y: number): void => {
    roundRect(ctx, x, y - 6, 9, 26, 2, theme.fenceDeep, 2.4);
  };
  rail(0, 6, w, 6);
  rail(0, h - 6, w, h - 6);
  rail(6, 0, 6, h);
  rail(w - 6, 0, w - 6, h);
  const step = 92;
  for (let x = 0; x <= w; x += step) {
    post(x, 6);
    post(x, h - 6);
  }
  for (let y = step; y < h - step / 2; y += step) {
    post(6, y);
    post(w - 6, y);
  }
}

/** Backdrop outside the fence: a suggestion of hills and a barn. */
export function drawSurround(ctx: Ctx, vw: number, vh: number, theme: Theme): void {
  ctx.fillStyle = theme.surround;
  ctx.fillRect(0, 0, vw, vh);
}

/** The apples that drop on Bruised Apple Grove. */
export function drawApple(ctx: Ctx, spin: number): void {
  ctx.save();
  ctx.rotate(spin);
  circle(ctx, 0, 0, 6, BARN, 2);
  ctx.fillStyle = BARN_DEEP;
  ctx.beginPath();
  ctx.ellipse(2, 2, 2.4, 3, 0.4, 0, TAU);
  ctx.fill();
  pen(ctx, 1.8, '#6b4a25');
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(1.5, -9);
  ctx.stroke();
  poly(ctx, [1.5, -9, 7, -11, 3, -6.5], CLOVER, 1.4);
  ctx.restore();
}

/** Small decorative chicken coop used on the level-intro cards. */
export function drawCoop(ctx: Ctx, scale = 1): void {
  ctx.save();
  ctx.scale(scale, scale);
  roundRect(ctx, 0, 8, 46, 30, 3, BARN, 3);
  poly(ctx, [-28, -8, 0, -26, 28, -8], BARN_DEEP, 3);
  roundRect(ctx, 0, 12, 16, 22, 2, INK_SOFT, 2.4);
  circle(ctx, 0, -2, 6, CREAM, 2.4);
  pen(ctx, 1.6, INK);
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.restore();
}
