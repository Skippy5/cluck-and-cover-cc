/**
 * Shared drawing primitives for the block-print look: one heavy ink outline
 * around flat fills, plus a few shapes every sprite reuses.
 */

import { TAU } from '../core/math';
import { INK } from './palette';

export type Ctx = CanvasRenderingContext2D;

/** Configure the pen for an ink outline of the given weight. */
export function pen(ctx: Ctx, width = 2.6, color: string = INK): void {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

/** Fill then outline the current path. */
export function ink(ctx: Ctx, fill: string, width = 2.6, outline: string = INK): void {
  ctx.fillStyle = fill;
  ctx.fill();
  pen(ctx, width, outline);
  ctx.stroke();
}

export function ellipse(
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  rot = 0,
  width = 2.6,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ink(ctx, fill, width);
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, width = 2.6): void {
  ellipse(ctx, x, y, r, r, fill, 0, width);
}

export function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  width = 2.6,
): void {
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
  ink(ctx, fill, width);
}

/** A closed polygon from a flat [x,y,x,y,...] list. */
export function poly(ctx: Ctx, pts: readonly number[], fill: string, width = 2.6): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ink(ctx, fill, width);
}

/** A capsule between two points — the workhorse for limbs and tails. */
export function limb(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  pen(ctx, thickness + 2.4);
  ctx.stroke();
  pen(ctx, thickness, fill);
  ctx.stroke();
}

/** Soft contact shadow so entities sit on the ground instead of floating. */
export function shadow(ctx: Ctx, x: number, y: number, rx: number, ry = rx * 0.4, alpha = 0.18): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#101010';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
