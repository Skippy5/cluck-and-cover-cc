/**
 * The cast, drawn by hand in canvas paths. No images, no glyphs, no emoji.
 *
 * Convention: every sprite draws around its own origin (0,0) at the entity's
 * centre, with the ground line near +y. Callers translate/scale first.
 * The only exception is `drawSnake`, which needs world-space spine points.
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
  SKIN,
  SKY,
  SKY_DEEP,
  WHEAT,
  WHEAT_DEEP,
} from './palette';

const BEARD = '#e6e2d6'; // Skip has been farming a long time.
const BEARD_DEEP = '#c9c4b5';
const NOSE = '#c98a5f';
const FOX_FUR = '#cf6a33';
const WEASEL_FUR = '#b98545';

/* ------------------------------------------------------------------ */
/* Farmer Skip                                                         */
/* ------------------------------------------------------------------ */

export interface FarmerLook {
  /** Walk cycle phase in radians. */
  phase: number;
  /** 1 facing right, -1 facing left. */
  facing: number;
  moving: boolean;
  stunned: boolean;
}

/**
 * Farmer Skip: north of sixty, built like a fence post that won middle age,
 * permanently unimpressed. Straw hat, white beard, scowl you could plough with.
 * He is not having a good day; he is, however, having a very good harvest.
 */
export function drawFarmer(ctx: Ctx, look: FarmerLook): void {
  const { phase, facing, moving, stunned } = look;
  shadow(ctx, 0, 26, 14, 5);

  ctx.save();
  ctx.scale(facing, 1);

  const bob = moving ? Math.abs(Math.sin(phase)) * 2 : Math.sin(phase * 0.5) * 0.7;
  const swing = moving ? Math.sin(phase) * 6.5 : 0;
  const y = -bob;

  // --- back leg + boot
  limb(ctx, -4, y + 12, -4 - swing, 23, 7, SKY_DEEP);
  roundRect(ctx, -4 - swing, 25, 11, 7, 2.5, INK_SOFT, 2.2);

  // --- back arm
  limb(ctx, -8, y - 4, -10 - swing * 0.8, y + 9, 5.5, CREAM_DEEP);

  // --- torso: a stocky cream shirt under blue bib overalls
  roundRect(ctx, 0, y - 4, 25, 17, 7, CREAM);
  roundRect(ctx, 0, y + 8, 26, 19, 6, SKY_DEEP);
  roundRect(ctx, 0, y - 1, 15, 13, 3, SKY_DEEP, 2.2); // bib
  limb(ctx, -6, y - 5, -7.5, y - 12, 3.4, SKY_DEEP);
  limb(ctx, 6, y - 5, 7.5, y - 12, 3.4, SKY_DEEP);
  circle(ctx, -5, y - 4, 1.7, WHEAT, 1.4);
  circle(ctx, 5, y - 4, 1.7, WHEAT, 1.4);

  // --- front leg + boot
  limb(ctx, 4, y + 12, 4 + swing, 23, 7.5, SKY_DEEP);
  roundRect(ctx, 4 + swing, 25, 12, 7, 2.5, INK_SOFT, 2.2);

  // --- head. Deliberately large: the scowl is the character.
  const hy = y - 22;
  ellipse(ctx, -9.5, hy + 2, 2.8, 3.6, SKIN, 0, 2.2); // ear
  circle(ctx, 0, hy, 11, SKIN);

  // beard — a broad white spade covering the whole jaw and hanging past the chin
  ctx.beginPath();
  ctx.moveTo(-10.5, hy - 1.5);
  ctx.quadraticCurveTo(-12, hy + 10, -3.5, hy + 16);
  ctx.quadraticCurveTo(5, hy + 13, 9.5, hy + 3.5);
  ctx.quadraticCurveTo(4, hy + 5, -1, hy + 3.5);
  ctx.quadraticCurveTo(-6, hy + 2, -10.5, hy - 1.5);
  ink(ctx, BEARD, 2.6);
  pen(ctx, 1.2, BEARD_DEEP);
  ctx.beginPath();
  ctx.moveTo(-5, hy + 6);
  ctx.quadraticCurveTo(-4.5, hy + 11, -3.5, hy + 14.5);
  ctx.moveTo(0.5, hy + 5.5);
  ctx.quadraticCurveTo(1.5, hy + 10, 1, hy + 13);
  ctx.stroke();

  // the frown, sitting in the gap between moustache and beard
  pen(ctx, 2, INK);
  ctx.beginPath();
  ctx.moveTo(-2.5, hy + 7.5);
  ctx.quadraticCurveTo(1.5, hy + 5.6, 5, hy + 7);
  ctx.stroke();

  // nose: bulbous, weather-reddened, and pushed well out past the beard
  ellipse(ctx, 9.5, hy + 0.5, 5.2, 4.4, NOSE, -0.15);
  ctx.fillStyle = 'rgba(120,60,35,0.35)';
  ctx.beginPath();
  ctx.arc(11, hy + 1.5, 1, 0, TAU);
  ctx.arc(9, hy + 2.6, 0.9, 0, TAU);
  ctx.fill();

  // moustache: a thick bar bridging nose to beard
  ellipse(ctx, 4.5, hy + 5, 6.4, 2.8, BEARD, -0.18, 2);

  // squint + the eyebrow that does all the acting
  pen(ctx, 2.6, INK);
  ctx.beginPath();
  ctx.moveTo(0.5, hy - 2.6);
  ctx.lineTo(5.2, hy - 1.6);
  ctx.stroke();
  pen(ctx, 3.6, BEARD);
  ctx.beginPath();
  ctx.moveTo(-0.5, hy - 7.4); // high at the back...
  ctx.lineTo(7, hy - 3.4); // ...low over the nose. Permanently unimpressed.
  ctx.stroke();

  // --- straw hat: dome first, then the brim. Sits high enough to leave the
  // eyebrow doing its work.
  ctx.beginPath();
  ctx.moveTo(-10.5, hy - 10.5);
  ctx.quadraticCurveTo(-9, hy - 23, 0, hy - 23.5);
  ctx.quadraticCurveTo(9, hy - 23, 10.5, hy - 10.5);
  ctx.closePath();
  ink(ctx, WHEAT);
  ctx.beginPath();
  ctx.moveTo(-10.4, hy - 12);
  ctx.quadraticCurveTo(0, hy - 15.5, 10.4, hy - 12);
  pen(ctx, 4, BARN_DEEP);
  ctx.stroke();
  ellipse(ctx, 0.5, hy - 10, 19, 4.4, WHEAT);
  pen(ctx, 1, WHEAT_DEEP);
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    ctx.moveTo(0.5 + i * 5.2, hy - 12.2);
    ctx.lineTo(0.5 + i * 5.9, hy - 8);
  }
  ctx.stroke();

  // --- front arm, drawn last so it sits over the bib
  limb(ctx, 8, y - 4, 11 + swing * 0.8, y + 9, 6, CREAM);
  circle(ctx, 11.6 + swing * 0.9, y + 11.5, 3.6, SKIN, 2.2);

  ctx.restore();

  if (stunned) drawStunStars(ctx, 0, -42, phase);
}

/**
 * Skip head-and-shoulders, drawn at a size that can carry detail: the title
 * card, the HUD nameplate and the shop all use this. Roughly 100 units square,
 * centred on the origin.
 */
export function drawSkipPortrait(ctx: Ctx, t = 0): void {
  const breathe = Math.sin(t * 1.4) * 0.8;

  // shoulders: shirt under the bib
  ctx.beginPath();
  ctx.moveTo(-46, 52);
  ctx.quadraticCurveTo(-40, 20 + breathe, -16, 14 + breathe);
  ctx.lineTo(16, 14 + breathe);
  ctx.quadraticCurveTo(40, 20 + breathe, 46, 52);
  ctx.closePath();
  ink(ctx, CREAM, 3);
  ctx.beginPath();
  ctx.moveTo(-24, 52);
  ctx.quadraticCurveTo(-22, 26 + breathe, 0, 22 + breathe);
  ctx.quadraticCurveTo(22, 26 + breathe, 24, 52);
  ctx.closePath();
  ink(ctx, SKY_DEEP, 3);
  limb(ctx, -19, 30 + breathe, -22, 16 + breathe, 6, SKY_DEEP);
  limb(ctx, 19, 30 + breathe, 22, 16 + breathe, 6, SKY_DEEP);
  circle(ctx, -17, 32 + breathe, 3.4, WHEAT, 2);
  circle(ctx, 17, 32 + breathe, 3.4, WHEAT, 2);

  const hy = -14 + breathe;

  // neck
  roundRect(ctx, 0, hy + 26, 22, 20, 6, SKIN, 3);

  // ears
  ellipse(ctx, -25, hy + 4, 5, 7, SKIN, 0, 2.6);
  ellipse(ctx, 25, hy + 4, 5, 7, SKIN, 0, 2.6);

  // face
  ellipse(ctx, 0, hy, 25, 27, SKIN, 0, 3);

  // beard: a broad spade, wider than the jaw
  ctx.beginPath();
  ctx.moveTo(-25, hy - 2);
  ctx.quadraticCurveTo(-31, hy + 26, -12, hy + 40);
  ctx.quadraticCurveTo(0, hy + 45, 12, hy + 40);
  ctx.quadraticCurveTo(31, hy + 26, 25, hy - 2);
  ctx.quadraticCurveTo(14, hy + 10, 0, hy + 9);
  ctx.quadraticCurveTo(-14, hy + 10, -25, hy - 2);
  ink(ctx, BEARD, 3);
  pen(ctx, 1.8, BEARD_DEEP);
  ctx.beginPath();
  for (const x of [-13, -4.5, 4.5, 13]) {
    ctx.moveTo(x, hy + 14);
    ctx.quadraticCurveTo(x * 1.05, hy + 26, x * 0.75, hy + 37);
  }
  ctx.stroke();

  // the frown
  pen(ctx, 3, INK);
  ctx.beginPath();
  ctx.moveTo(-9, hy + 17);
  ctx.quadraticCurveTo(0, hy + 12, 9, hy + 17);
  ctx.stroke();

  // nose
  ellipse(ctx, 0, hy + 6, 9.5, 8, NOSE, 0, 3);
  ctx.fillStyle = 'rgba(120,60,35,0.32)';
  ctx.beginPath();
  ctx.arc(-3.5, hy + 7, 1.7, 0, TAU);
  ctx.arc(3.5, hy + 8.5, 1.5, 0, TAU);
  ctx.arc(0.5, hy + 3.5, 1.4, 0, TAU);
  ctx.fill();

  // moustache: one continuous sweep that droops past the corners of the mouth
  ctx.beginPath();
  ctx.moveTo(-19, hy + 11);
  ctx.quadraticCurveTo(-9, hy + 8, 0, hy + 12);
  ctx.quadraticCurveTo(9, hy + 8, 19, hy + 11);
  ctx.quadraticCurveTo(15, hy + 21, 6, hy + 18);
  ctx.quadraticCurveTo(0, hy + 16, -6, hy + 18);
  ctx.quadraticCurveTo(-15, hy + 21, -19, hy + 11);
  ink(ctx, BEARD, 2.6);
  pen(ctx, 1.4, BEARD_DEEP);
  ctx.beginPath();
  ctx.moveTo(-14, hy + 12);
  ctx.quadraticCurveTo(-11, hy + 16, -6, hy + 17);
  ctx.moveTo(14, hy + 12);
  ctx.quadraticCurveTo(11, hy + 16, 6, hy + 17);
  ctx.stroke();

  // eyes: heavy lids, permanently narrowed
  for (const s of [-1, 1]) {
    ellipse(ctx, s * 11, hy - 3, 6.5, 4.4, '#fbf6ea', 0, 2.4);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(s * 11 + s * 1.6, hy - 2.6, 2.6, 0, TAU);
    ctx.fill();
    pen(ctx, 3, SKIN);
    ctx.beginPath();
    ctx.moveTo(s * 4.5, hy - 6);
    ctx.lineTo(s * 18, hy - 5.5);
    ctx.stroke();
  }

  // the eyebrows, angled hard down toward the nose
  pen(ctx, 6.5, BEARD);
  ctx.beginPath();
  ctx.moveTo(-21, hy - 15);
  ctx.lineTo(-4, hy - 8);
  ctx.moveTo(21, hy - 15);
  ctx.lineTo(4, hy - 8);
  ctx.stroke();

  // crow's feet — sixty-two years of squinting into the sun
  pen(ctx, 1.6, '#b07d55');
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 20, hy - 1);
    ctx.lineTo(s * 25, hy - 3);
    ctx.moveTo(s * 20, hy + 2);
    ctx.lineTo(s * 25, hy + 1.5);
  }
  ctx.stroke();

  // straw hat
  ctx.beginPath();
  ctx.moveTo(-25, hy - 18);
  ctx.quadraticCurveTo(-22, hy - 52, 0, hy - 53);
  ctx.quadraticCurveTo(22, hy - 52, 25, hy - 18);
  ctx.closePath();
  ink(ctx, WHEAT, 3);
  ctx.beginPath();
  ctx.moveTo(-24.6, hy - 22);
  ctx.quadraticCurveTo(0, hy - 32, 24.6, hy - 22);
  pen(ctx, 9, BARN_DEEP);
  ctx.stroke();
  ellipse(ctx, 0, hy - 18, 46, 11, WHEAT, 0, 3);
  pen(ctx, 1.4, WHEAT_DEEP);
  ctx.beginPath();
  for (let i = -4; i <= 4; i++) {
    ctx.moveTo(i * 10, hy - 24);
    ctx.lineTo(i * 11.2, hy - 12);
  }
  ctx.stroke();
  // a bent brim, because it is not a new hat
  pen(ctx, 2, WHEAT_DEEP);
  ctx.beginPath();
  ctx.moveTo(-46, hy - 18);
  ctx.quadraticCurveTo(0, hy - 11, 46, hy - 18);
  ctx.stroke();
}

function drawStunStars(ctx: Ctx, x: number, y: number, phase: number): void {
  for (let i = 0; i < 3; i++) {
    const a = phase * 2.5 + (i * TAU) / 3;
    drawStar(ctx, x + Math.cos(a) * 12, y + Math.sin(a) * 4, 3.4, WHEAT);
  }
}

function drawStar(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ink(ctx, fill, 1.4);
}

/* ------------------------------------------------------------------ */
/* Chickens                                                            */
/* ------------------------------------------------------------------ */

export function drawChicken(ctx: Ctx, phase: number, facing: number, moving: boolean): void {
  shadow(ctx, 0, 13, 9, 3.4);
  ctx.save();
  ctx.scale(facing, 1);
  const bob = moving ? Math.abs(Math.sin(phase * 2)) * 1.6 : Math.sin(phase) * 0.5;
  const y = -bob;
  const step = moving ? Math.sin(phase * 2) * 3 : 0;

  // legs
  limb(ctx, -2, y + 6, -2 - step, 12, 2.2, WHEAT);
  limb(ctx, 3, y + 6, 3 + step, 12, 2.2, WHEAT);
  pen(ctx, 1.6, INK);
  ctx.beginPath();
  ctx.moveTo(-4 - step, 13);
  ctx.lineTo(-0.5 - step, 12.5);
  ctx.moveTo(1 + step, 13);
  ctx.lineTo(4.5 + step, 12.5);
  ctx.stroke();

  // tail: three short upswept feathers, well clear of the head end
  poly(ctx, [-9, y - 2, -15, y - 9, -12.5, y - 2.5, -17, y - 3, -12, y + 2, -9, y + 3], CREAM_DEEP, 2.2);

  // body — kept white so the hen never reads as a duck
  ellipse(ctx, 0, y, 12, 10, CREAM);

  // wing: small, high on the flank, flaps while walking
  const flap = moving ? Math.sin(phase * 2) * 0.45 : 0;
  ctx.save();
  ctx.translate(-2, y + 0.5);
  ctx.rotate(flap);
  ellipse(ctx, 0, 0, 5.4, 3.8, CREAM_DEEP, 0, 2);
  pen(ctx, 1, WHEAT_DEEP);
  ctx.beginPath();
  ctx.moveTo(-3.4, 1.2);
  ctx.lineTo(3.2, 0.4);
  ctx.stroke();
  ctx.restore();

  // neck + head
  const headY = y - 11 - (moving ? Math.sin(phase * 2 + 1) * 0.9 : 0);
  limb(ctx, 6, y - 4, 8.5, headY + 3, 5.4, CREAM);
  circle(ctx, 9.5, headY, 6, CREAM);

  // comb: big and unmistakably red
  ctx.beginPath();
  ctx.moveTo(5, headY - 5);
  ctx.quadraticCurveTo(6.4, headY - 11.5, 8.4, headY - 5.6);
  ctx.quadraticCurveTo(10.2, headY - 12, 12, headY - 5.4);
  ctx.quadraticCurveTo(13.6, headY - 10.5, 14.4, headY - 4.4);
  ctx.quadraticCurveTo(9.5, headY - 3, 5, headY - 5);
  ink(ctx, BARN, 2);

  // beak + wattle
  poly(ctx, [14, headY - 1.2, 20.5, headY + 1, 14, headY + 3.2], WHEAT, 2);
  ellipse(ctx, 13, headY + 5, 2.2, 3.2, BARN, 0, 1.8);

  circle(ctx, 11.4, headY - 1.4, 1.7, INK, 0);
  ctx.restore();
}

/** A chicken slung under a fox's jaw — legs up, thoroughly undignified. */
export function drawCarriedChicken(ctx: Ctx, phase: number): void {
  ctx.save();
  ctx.rotate(0.5 + Math.sin(phase * 6) * 0.12);
  ellipse(ctx, 0, 0, 8, 6.5, CREAM, 0, 2.2);
  poly(ctx, [-6, -1, -12, -5, -11, 1, -6, 2], CREAM_DEEP, 1.8);
  limb(ctx, 2, -4, 5, -10, 1.8, WHEAT);
  limb(ctx, 4, -3, 8, -8, 1.8, WHEAT);
  circle(ctx, 6, 1, 4, CREAM, 2.2);
  circle(ctx, 7.4, 0, 1.2, INK, 0);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Eggs                                                                */
/* ------------------------------------------------------------------ */

export type EggKind = 'normal' | 'golden' | 'special';

export function drawEgg(ctx: Ctx, kind: EggKind, t: number, frozen = 0): void {
  const bob = Math.sin(t * 2.2) * 0.8;
  shadow(ctx, 0, 8, 6, 2.4, 0.16);
  ctx.save();
  ctx.translate(0, bob);

  if (kind === 'normal') {
    ellipse(ctx, 0, 0, 6, 7.6, CREAM, 0, 2.2);
    ctx.fillStyle = CREAM_DEEP;
    ctx.beginPath();
    ctx.arc(-2, 1.5, 0.9, 0, TAU);
    ctx.arc(1.8, 3, 0.7, 0, TAU);
    ctx.arc(0.5, -2.5, 0.6, 0, TAU);
    ctx.fill();
  } else if (kind === 'golden') {
    ellipse(ctx, 0, 0, 6.3, 8, WHEAT, 0, 2.2);
    ctx.fillStyle = '#f7d071';
    ctx.beginPath();
    ctx.ellipse(-1.8, -2.4, 2.2, 3, -0.4, 0, TAU);
    ctx.fill();
    pen(ctx, 1.3, '#ffe9a8');
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + t * 1.4;
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 9.5);
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 12.5);
    }
    ctx.stroke();
  } else {
    ellipse(ctx, 0, 0, 6.3, 8, SKY, 0, 2.2);
    pen(ctx, 1.6, '#cdeaf5');
    ctx.beginPath();
    ctx.moveTo(-4.5, 1);
    ctx.quadraticCurveTo(0, -3, 4.5, 1);
    ctx.moveTo(-4, 4);
    ctx.quadraticCurveTo(0, 0.4, 4, 4);
    ctx.stroke();
    drawStar(ctx, 4.6, -6.4, 3.4 + Math.sin(t * 5) * 0.5, '#ffffff');
  }

  if (frozen > 0) {
    ctx.globalAlpha = 0.28 + frozen * 0.4;
    ctx.fillStyle = '#bfe4f2';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7.4, 9.2, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    pen(ctx, 1.2, '#ffffff');
    ctx.beginPath();
    ctx.moveTo(-5, -3);
    ctx.lineTo(-1, 2);
    ctx.moveTo(4, -4);
    ctx.lineTo(1.5, 5);
    ctx.stroke();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Snakes — drawn in world space along a spine                          */
/* ------------------------------------------------------------------ */

export interface SnakeLook {
  /** Spine points, head first. */
  pts: readonly { x: number; y: number }[];
  width: number;
  crowned: boolean;
  enraged: boolean;
  /** 0..1 — an egg travelling down the body as a visible lump. */
  swallow: number;
  t: number;
}

export function drawSnake(ctx: Ctx, look: SnakeLook): void {
  const { pts, width, crowned, enraged, swallow, t } = look;
  if (pts.length < 2) return;
  const body = enraged ? '#7ab04f' : CLOVER;

  ctx.save();
  // contact shadow
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#101010';
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y + width * 0.45);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y + width * 0.45);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ink outline then body
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  pen(ctx, width + 5, INK);
  ctx.stroke();
  pen(ctx, width, body);
  ctx.stroke();

  // the swallowed egg, working its way down the body
  if (swallow > 0) {
    const idx = Math.min(pts.length - 1, Math.floor((1 - swallow) * (pts.length - 1) * 0.7) + 1);
    const lump = pts[idx];
    ellipse(ctx, lump.x, lump.y, width * 0.8, width * 0.72, body, 0, 3);
  }

  // scale banding
  pen(ctx, width * 0.34, CLOVER_DEEP);
  ctx.beginPath();
  for (let i = 2; i < pts.length - 1; i += 3) {
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
  }
  ctx.stroke();

  // head
  const head = pts[0];
  const nx = pts[1] ? head.x - pts[1].x : 1;
  const ny = pts[1] ? head.y - pts[1].y : 0;
  const ang = Math.atan2(ny, nx);
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(ang);
  const hw = width * 0.78;
  ellipse(ctx, hw * 0.3, 0, hw * 1.15, hw * 0.85, body, 0, 3);
  // eyes
  circle(ctx, hw * 0.5, -hw * 0.45, hw * 0.24, WHEAT, 1.4);
  circle(ctx, hw * 0.5, hw * 0.45, hw * 0.24, WHEAT, 1.4);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hw * 0.58, -hw * 0.45, hw * 0.11, 0, TAU);
  ctx.arc(hw * 0.58, hw * 0.45, hw * 0.11, 0, TAU);
  ctx.fill();
  // forked tongue, flicking
  const flick = (Math.sin(t * 4) + 1) * 0.5;
  if (flick > 0.35) {
    const len = hw * (0.9 + flick * 0.8);
    pen(ctx, Math.max(1.2, hw * 0.14), BARN);
    ctx.beginPath();
    ctx.moveTo(hw * 1.3, 0);
    ctx.lineTo(hw * 1.3 + len, 0);
    ctx.moveTo(hw * 1.3 + len, 0);
    ctx.lineTo(hw * 1.3 + len * 1.4, -hw * 0.35);
    ctx.moveTo(hw * 1.3 + len, 0);
    ctx.lineTo(hw * 1.3 + len * 1.4, hw * 0.35);
    ctx.stroke();
  }
  if (crowned) {
    // Old Coilback wears the crown he took off the last farmer who tried this.
    ctx.save();
    ctx.rotate(-Math.PI / 2);
    poly(
      ctx,
      [-hw * 0.9, -hw * 0.2, -hw * 0.6, -hw * 1.1, -hw * 0.3, -hw * 0.35, 0, -hw * 1.3, hw * 0.3, -hw * 0.35, hw * 0.6, -hw * 1.1, hw * 0.9, -hw * 0.2],
      WHEAT,
      2.4,
    );
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Rooster                                                             */
/* ------------------------------------------------------------------ */

export function drawRooster(ctx: Ctx, phase: number, facing: number): void {
  shadow(ctx, 0, 16, 11, 4);
  ctx.save();
  ctx.scale(facing, 1);
  const bob = Math.abs(Math.sin(phase * 2)) * 2;
  const y = -bob;
  const step = Math.sin(phase * 2) * 4;

  // legs with spurs
  limb(ctx, -2, y + 8, -2 - step, 15, 2.8, WHEAT);
  limb(ctx, 4, y + 8, 4 + step, 15, 2.8, WHEAT);
  pen(ctx, 1.8, INK);
  ctx.beginPath();
  ctx.moveTo(-5 - step, 16);
  ctx.lineTo(0 - step, 15.5);
  ctx.moveTo(1 + step, 16);
  ctx.lineTo(6 + step, 15.5);
  ctx.stroke();

  // sweeping tail
  const tailSway = Math.sin(phase * 2) * 2;
  ctx.beginPath();
  ctx.moveTo(-8, y + 2);
  ctx.quadraticCurveTo(-22, y - 6 + tailSway, -18, y - 20 + tailSway);
  ctx.quadraticCurveTo(-13, y - 10, -7, y - 4);
  ink(ctx, CLOVER_DEEP, 2.4);
  ctx.beginPath();
  ctx.moveTo(-8, y + 3);
  ctx.quadraticCurveTo(-19, y - 3 + tailSway, -14, y - 16 + tailSway);
  ctx.quadraticCurveTo(-11, y - 7, -6, y - 2);
  ink(ctx, WHEAT, 2.2);

  // body
  ellipse(ctx, 0, y, 12.5, 11, BARN);
  ellipse(ctx, -1, y + 1.5, 7, 5, BARN_DEEP, 0.15, 2.2);

  // neck and head, thrusting forward on the strut
  const thrust = Math.max(0, Math.sin(phase * 2)) * 2.4;
  const hx = 9 + thrust;
  const hy = y - 13;
  limb(ctx, 5, y - 4, hx - 1, hy + 4, 6.5, BARN);
  circle(ctx, hx, hy, 6.4, BARN);

  // oversized comb
  ctx.beginPath();
  ctx.moveTo(hx - 5, hy - 5.2);
  ctx.quadraticCurveTo(hx - 3.5, hy - 12, hx - 1.5, hy - 5.8);
  ctx.quadraticCurveTo(hx + 0.5, hy - 13, hx + 2.5, hy - 5.6);
  ctx.quadraticCurveTo(hx + 4.5, hy - 11.5, hx + 6, hy - 4.6);
  ctx.quadraticCurveTo(hx, hy - 3, hx - 5, hy - 5.2);
  ink(ctx, BARN, 2.2);

  poly(ctx, [hx + 5, hy - 1, hx + 12.5, hy + 1.6, hx + 5, hy + 3.6], WHEAT, 2.2);
  ellipse(ctx, hx + 3.5, hy + 6, 2.4, 3.6, BARN, 0, 2);

  // the eye of something that has decided today is the day
  circle(ctx, hx + 2, hy - 1.6, 2.2, WHEAT, 1.6);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 2.6, hy - 1.4, 1.1, 0, TAU);
  ctx.fill();
  pen(ctx, 2, INK);
  ctx.beginPath();
  ctx.moveTo(hx - 1.4, hy - 5);
  ctx.lineTo(hx + 4.6, hy - 2.6);
  ctx.stroke();

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Weasel                                                              */
/* ------------------------------------------------------------------ */

export function drawWeasel(ctx: Ctx, phase: number, facing: number): void {
  shadow(ctx, 0, 9, 13, 3.4);
  ctx.save();
  ctx.scale(facing, 1);
  // the gallop: the spine arches, the legs gather and fling
  const arch = Math.sin(phase * 2) * 4;
  const gather = Math.cos(phase * 2) * 4;
  const y = -Math.abs(arch) * 0.4;

  // tail
  ctx.beginPath();
  ctx.moveTo(-11, y + 1);
  ctx.quadraticCurveTo(-22, y + 2 - arch, -27, y - 5 - arch);
  pen(ctx, 7, INK);
  ctx.stroke();
  pen(ctx, 4.4, WEASEL_FUR);
  ctx.stroke();

  // legs
  limb(ctx, -6, y + 3, -8 - gather, 10, 3, WEASEL_FUR);
  limb(ctx, 6, y + 3, 8 + gather, 10, 3, WEASEL_FUR);

  // long low body, arched
  ctx.beginPath();
  ctx.moveTo(-11, y + 1);
  ctx.quadraticCurveTo(0, y - 4 - arch, 11, y);
  pen(ctx, 13, INK);
  ctx.stroke();
  pen(ctx, 10, WEASEL_FUR);
  ctx.stroke();
  // cream underside
  ctx.beginPath();
  ctx.moveTo(-8, y + 4);
  ctx.quadraticCurveTo(0, y + 2 - arch * 0.4, 8, y + 3);
  pen(ctx, 3.4, CREAM_DEEP);
  ctx.stroke();

  // head: narrow, pointed, mask across the eyes
  const hx = 14;
  const hy = y - 2 - arch * 0.3;
  ellipse(ctx, hx, hy, 7.5, 5.2, WEASEL_FUR, 0.12);
  poly(ctx, [hx + 4, hy - 2, hx + 11, hy + 1.4, hx + 4, hy + 3.4], WEASEL_FUR, 2.2);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 10.4, hy + 1.2, 1.5, 0, TAU);
  ctx.fill();
  // mask
  pen(ctx, 3.2, INK_SOFT);
  ctx.beginPath();
  ctx.moveTo(hx - 1, hy - 3.4);
  ctx.lineTo(hx + 5, hy - 0.4);
  ctx.stroke();
  circle(ctx, hx + 2.4, hy - 1.4, 1.7, WHEAT, 1.2);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 2.8, hy - 1.4, 0.9, 0, TAU);
  ctx.fill();
  // ear
  circle(ctx, hx - 4.5, hy - 4.4, 2.6, WEASEL_FUR, 2);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Rennard the Rustler — the fox                                        */
/* ------------------------------------------------------------------ */

export interface FoxLook {
  phase: number;
  facing: number;
  /** 0..1 windup on a charge; the fox crouches before it launches. */
  windup: number;
  carrying: boolean;
  hurt: number;
}

export function drawFox(ctx: Ctx, look: FoxLook): void {
  const { phase, facing, windup, carrying, hurt } = look;
  shadow(ctx, 0, 22, 20, 6);
  ctx.save();
  ctx.scale(facing, 1);
  if (windup > 0) {
    // gather low and lean into the charge
    ctx.translate(-windup * 5, windup * 3);
    ctx.scale(1 + windup * 0.12, 1 - windup * 0.12);
  }
  const fur = hurt > 0 ? '#e89a72' : FOX_FUR;
  const bob = Math.abs(Math.sin(phase * 2)) * 2.5;
  const y = -bob;
  const step = Math.sin(phase * 2) * 7;

  // brush tail with the cream tip
  ctx.save();
  ctx.translate(-16, y + 2);
  ctx.rotate(Math.sin(phase * 2) * 0.18 - 0.25);
  ellipse(ctx, -9, -2, 13, 7.5, fur, -0.35);
  ellipse(ctx, -19, -6, 5.5, 4.6, CREAM, -0.35, 2.2);
  ctx.restore();

  // back legs / front legs, dark socks
  limb(ctx, -8, y + 9, -10 - step, 21, 5.5, fur);
  roundRect(ctx, -10 - step, 22, 8, 5, 2, INK_SOFT, 2);
  limb(ctx, 9, y + 9, 11 + step, 21, 5.5, fur);
  roundRect(ctx, 11 + step, 22, 8, 5, 2, INK_SOFT, 2);

  // body + cream chest
  ellipse(ctx, 0, y + 2, 17, 12, fur);
  ctx.beginPath();
  ctx.moveTo(-6, y + 10);
  ctx.quadraticCurveTo(4, y + 14, 14, y + 6);
  pen(ctx, 5, CREAM);
  ctx.stroke();

  // head
  const hx = 13;
  const hy = y - 10;
  // ears
  poly(ctx, [hx - 6, hy - 4, hx - 9, hy - 16, hx - 1, hy - 8], fur, 2.4);
  poly(ctx, [hx + 3, hy - 5, hx + 4, hy - 17, hx + 10, hy - 6], fur, 2.4);
  poly(ctx, [hx - 5.5, hy - 6, hx - 7.5, hy - 13, hx - 2.5, hy - 8.5], INK_SOFT, 1.2);
  poly(ctx, [hx + 4, hy - 7, hx + 4.8, hy - 14, hx + 8.5, hy - 7.5], INK_SOFT, 1.2);

  circle(ctx, hx, hy, 10, fur);
  // muzzle
  poly(ctx, [hx + 5, hy - 2, hx + 18, hy + 3, hx + 5, hy + 7], CREAM, 2.4);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(hx + 17, hy + 2.6, 2, 0, TAU);
  ctx.fill();
  // the bandit's mask
  pen(ctx, 4, INK_SOFT);
  ctx.beginPath();
  ctx.moveTo(hx - 7, hy - 3.5);
  ctx.lineTo(hx + 5, hy - 0.5);
  ctx.stroke();
  circle(ctx, hx + 1.5, hy - 1.6, 2.8, WHEAT, 1.6);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(hx + 2.2, hy - 1.6, 1, 2.2, 0, 0, TAU);
  ctx.fill();

  if (carrying) {
    ctx.save();
    ctx.translate(hx + 16, hy + 10);
    ctx.scale(0.9, 0.9);
    drawCarriedChicken(ctx, phase);
    ctx.restore();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* The farm dog (Swift Boots' better-behaved cousin)                    */
/* ------------------------------------------------------------------ */

/** Bess: a scruffy farm collie. Reads by her red collar and one dark ear. */
export function drawDog(ctx: Ctx, phase: number, facing: number): void {
  shadow(ctx, 0, 15, 14, 4.4);
  ctx.save();
  ctx.scale(facing, 1);
  const bob = Math.abs(Math.sin(phase * 2)) * 1.8;
  const y = -bob;
  const step = Math.sin(phase * 2) * 5;

  // tail: an upswept plume that wags
  ctx.save();
  ctx.translate(-12, y - 1);
  ctx.rotate(-0.7 + Math.sin(phase * 9) * 0.3);
  ellipse(ctx, -6, 0, 8, 4, CREAM, 0, 2.4);
  ctx.restore();

  // far legs first
  limb(ctx, -6, y + 6, -7 - step, 15, 3.8, WHEAT_DEEP);
  limb(ctx, 5, y + 6, 6 + step, 15, 3.8, WHEAT_DEEP);

  // body
  ellipse(ctx, 0, y + 1, 13, 8.8, CREAM);
  // saddle patch, so she is not one flat shape
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, y + 1, 13, 8.8, 0, 0, TAU);
  ctx.clip();
  ctx.fillStyle = WHEAT_DEEP;
  ctx.beginPath();
  ctx.ellipse(-3, y - 4, 10, 6, -0.15, 0, TAU);
  ctx.fill();
  ctx.restore();

  // near legs
  limb(ctx, -2, y + 7, -3 - step * 0.6, 15, 4, CREAM);
  limb(ctx, 8, y + 7, 9 + step * 0.6, 15, 4, CREAM);

  const hx = 12;
  const hy = y - 8;
  // ear behind the head
  ctx.save();
  ctx.translate(hx - 5, hy - 3);
  ctx.rotate(-0.3 + Math.sin(phase * 2) * 0.18);
  ellipse(ctx, 0, 4, 3.8, 6.5, WHEAT_DEEP, 0, 2.2);
  ctx.restore();

  // collar sits between body and head
  ctx.save();
  ctx.translate(hx - 6, hy + 5);
  ctx.rotate(0.5);
  roundRect(ctx, 0, 0, 5, 13, 2, BARN, 2);
  ctx.restore();

  circle(ctx, hx, hy, 7.2, CREAM);
  // muzzle
  ctx.beginPath();
  ctx.moveTo(hx + 3, hy - 1.5);
  ctx.quadraticCurveTo(hx + 13, hy - 0.5, hx + 13.5, hy + 2.6);
  ctx.quadraticCurveTo(hx + 12, hy + 6, hx + 3, hy + 5.5);
  ctx.closePath();
  ink(ctx, CREAM, 2.2);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(hx + 12.6, hy + 2, 2.2, 1.9, 0, 0, TAU);
  ctx.fill();
  // tongue, because of course
  ellipse(ctx, hx + 9, hy + 6.4, 2.6, 1.8, BARN, 0.2, 1.6);
  circle(ctx, hx + 2.6, hy - 2, 1.6, INK, 0);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Corn kernel projectile                                              */
/* ------------------------------------------------------------------ */

export function drawKernel(ctx: Ctx, spin: number): void {
  ctx.save();
  ctx.rotate(spin);
  ctx.beginPath();
  ctx.moveTo(5.5, 0);
  ctx.quadraticCurveTo(3, 4.4, -4.5, 2.6);
  ctx.quadraticCurveTo(-6, 0, -4.5, -2.6);
  ctx.quadraticCurveTo(3, -4.4, 5.5, 0);
  ink(ctx, WHEAT, 1.8);
  pen(ctx, 1, WHEAT_DEEP);
  ctx.beginPath();
  ctx.moveTo(-2.5, -1.4);
  ctx.lineTo(2.6, -0.6);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Power-up badges                                                      */
/* ------------------------------------------------------------------ */

export type PowerKind = 'speed' | 'shield' | 'magnet' | 'freeze';

const POWER_TINT: Record<PowerKind, string> = {
  speed: WHEAT,
  shield: SKY,
  magnet: BARN,
  freeze: '#bfe4f2',
};

export function powerTint(kind: PowerKind): string {
  return POWER_TINT[kind];
}

/** The pickup as it sits on the field: a nailed-up wooden token. */
export function drawPowerup(ctx: Ctx, kind: PowerKind, t: number): void {
  const bob = Math.sin(t * 3) * 2;
  shadow(ctx, 0, 16, 11, 3.6);
  ctx.save();
  ctx.translate(0, bob);
  ctx.rotate(Math.sin(t * 1.6) * 0.08);
  roundRect(ctx, 0, 0, 26, 26, 7, CREAM);
  roundRect(ctx, 0, 0, 20, 20, 5, POWER_TINT[kind], 1.6);
  drawPowerIcon(ctx, kind, 1);
  ctx.restore();
}

/** Icon only — reused at small size in the HUD and the shop. */
export function drawPowerIcon(ctx: Ctx, kind: PowerKind, scale = 1): void {
  ctx.save();
  ctx.scale(scale, scale);
  switch (kind) {
    case 'speed': {
      // a boot, mid-stride, with speed lines behind it
      poly(ctx, [-1, -7, 4, -7, 5, 1, 8, 3, 8, 6, -3, 6, -3, 0], INK_SOFT, 1.6);
      pen(ctx, 1.6, INK);
      ctx.beginPath();
      ctx.moveTo(-9, -4);
      ctx.lineTo(-4, -4);
      ctx.moveTo(-10, 0);
      ctx.lineTo(-5, 0);
      ctx.moveTo(-9, 4);
      ctx.lineTo(-5, 4);
      ctx.stroke();
      break;
    }
    case 'shield': {
      // a barrel-lid shield
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.quadraticCurveTo(8, -6, 8, 0);
      ctx.quadraticCurveTo(8, 6, 0, 9);
      ctx.quadraticCurveTo(-8, 6, -8, 0);
      ctx.quadraticCurveTo(-8, -6, 0, -8);
      ink(ctx, CREAM, 1.8);
      pen(ctx, 1.8, WHEAT_DEEP);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 8);
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();
      break;
    }
    case 'magnet': {
      // horseshoe magnet
      pen(ctx, 4.4, INK);
      ctx.beginPath();
      ctx.arc(0, 0, 6, Math.PI, TAU);
      ctx.stroke();
      pen(ctx, 3, CREAM);
      ctx.beginPath();
      ctx.arc(0, 0, 6, Math.PI, TAU);
      ctx.stroke();
      roundRect(ctx, -6, 3, 4.5, 6, 1, BARN_DEEP, 1.4);
      roundRect(ctx, 6, 3, 4.5, 6, 1, CREAM, 1.4);
      break;
    }
    case 'freeze': {
      // a six-spoke frost crystal
      pen(ctx, 2, INK);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
        ctx.lineTo(Math.cos(a) * 5 + Math.cos(a + 1) * 3, Math.sin(a) * 5 + Math.sin(a + 1) * 3);
      }
      ctx.stroke();
      pen(ctx, 1.1, '#ffffff');
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 7.4, Math.sin(a) * 7.4);
      }
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Shop upgrade icons                                                   */
/* ------------------------------------------------------------------ */

export type UpgradeIcon = 'boots' | 'cannon' | 'basket' | 'dog' | 'overalls';

export function drawUpgradeIcon(ctx: Ctx, icon: UpgradeIcon): void {
  switch (icon) {
    case 'boots': {
      poly(ctx, [-8, -10, -1, -10, 0, 2, 5, 5, 5, 9, -10, 9, -10, 0], SKY_DEEP, 2.2);
      pen(ctx, 1.6, INK);
      ctx.beginPath();
      ctx.moveTo(-10, 5);
      ctx.lineTo(5, 5);
      ctx.stroke();
      pen(ctx, 2, WHEAT);
      ctx.beginPath();
      ctx.moveTo(9, -6);
      ctx.lineTo(14, -6);
      ctx.moveTo(9, -1);
      ctx.lineTo(15, -1);
      ctx.stroke();
      break;
    }
    case 'cannon': {
      roundRect(ctx, -2, 2, 16, 9, 3, WHEAT_DEEP, 2.2);
      poly(ctx, [6, -2, 15, -6, 15, 3, 6, 6], INK_SOFT, 2.2);
      drawKernel(ctx, -0.4);
      break;
    }
    case 'basket': {
      ctx.beginPath();
      ctx.moveTo(-11, -3);
      ctx.lineTo(11, -3);
      ctx.lineTo(8, 9);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ink(ctx, WHEAT_DEEP, 2.2);
      pen(ctx, 1.4, INK);
      ctx.beginPath();
      ctx.arc(0, -3, 8, Math.PI, TAU);
      ctx.stroke();
      ellipse(ctx, -4, -6, 3.4, 4.4, CREAM, 0, 1.6);
      ellipse(ctx, 3, -7, 3.4, 4.4, WHEAT, 0, 1.6);
      break;
    }
    case 'dog': {
      ctx.save();
      ctx.scale(0.8, 0.8);
      drawDog(ctx, 1.2, 1);
      ctx.restore();
      break;
    }
    case 'overalls': {
      roundRect(ctx, 0, 3, 16, 14, 4, SKY_DEEP, 2.2);
      roundRect(ctx, 0, -2, 10, 9, 2, SKY_DEEP, 1.8);
      limb(ctx, -4, -5, -5, -11, 2.6, SKY_DEEP);
      limb(ctx, 4, -5, 5, -11, 2.6, SKY_DEEP);
      circle(ctx, -3.5, -3, 1.4, WHEAT, 1.2);
      circle(ctx, 3.5, -3, 1.4, WHEAT, 1.2);
      break;
    }
  }
}

/** Heart-free life pip: a little straw hat, because that is what Skip loses. */
export function drawLifePip(ctx: Ctx, filled: boolean): void {
  const fill = filled ? WHEAT : 'rgba(0,0,0,0.18)';
  const outline = filled ? INK : 'rgba(36,29,22,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 3, 9, 2.8, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  pen(ctx, 1.8, outline);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-5, 2.6);
  ctx.quadraticCurveTo(0, -8, 5, 2.6);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  pen(ctx, 1.8, outline);
  ctx.stroke();
  if (filled) {
    pen(ctx, 1.6, BARN_DEEP);
    ctx.beginPath();
    ctx.moveTo(-4.6, 1.8);
    ctx.quadraticCurveTo(0, -0.6, 4.6, 1.8);
    ctx.stroke();
  }
}
