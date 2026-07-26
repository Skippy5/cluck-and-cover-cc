/**
 * Draws the farm from game state. Reads only — never mutates the simulation.
 */

import { TAU } from '../core/math';
import { circle, pen, shadow, type Ctx } from '../art/draw';
import { CREAM, INK, THEMES, type Theme } from '../art/palette';
import { drawApple, drawFence, drawGround, drawObstacle, drawSurround } from '../art/scenery';
import {
  drawChicken,
  drawDog,
  drawEgg,
  drawFarmer,
  drawFox,
  drawKernel,
  drawPowerup,
  drawRooster,
  drawSnake,
  drawWeasel,
} from '../art/sprites';
import { CONFIG } from './config';
import type { Game } from './game';

interface Drawable {
  z: number;
  draw: () => void;
}

const DISPLAY_FONT = '700 20px ui-serif, Georgia, "Iowan Old Style", "Palatino Linotype", serif';

export function render(ctx: Ctx, game: Game, vw: number, vh: number): void {
  const theme = THEMES[game.levelDef.theme] ?? THEMES.barnyard;

  // --- fit the world into the viewport, leaving a border of surround
  const pad = 26;
  const scale = Math.min((vw - pad * 2) / game.worldW, (vh - pad * 2) / game.worldH);
  const ox = (vw - game.worldW * scale) / 2;
  const oy = (vh - game.worldH * scale) / 2;
  game.view = { scale, ox, oy };

  drawSurround(ctx, vw, vh, theme);

  ctx.save();
  const shakeX = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  const shakeY = game.shake > 0 ? (Math.random() - 0.5) * game.shake : 0;
  ctx.translate(ox + shakeX, oy + shakeY);
  ctx.scale(scale, scale);

  // clip everything to the field so nothing spills onto the surround
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, game.worldW, game.worldH);
  ctx.clip();

  drawGround(ctx, game.worldW, game.worldH, theme);
  drawFieldContents(ctx, game, theme);

  if (game.levelDef.twist.darkness) drawLantern(ctx, game);
  if (theme.wash) {
    ctx.fillStyle = theme.wash;
    ctx.fillRect(0, 0, game.worldW, game.worldH);
  }

  drawFx(ctx, game);
  ctx.restore();

  drawFence(ctx, game.worldW, game.worldH, theme);
  ctx.restore();

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(193,84,58,${game.flash * 0.28})`;
    ctx.fillRect(0, 0, vw, vh);
  }
}

function drawFieldContents(ctx: Ctx, game: Game, theme: Theme): void {
  const items: Drawable[] = [];
  const t = game.time;

  // --- mud sits under everything; it is ground dressing, not furniture
  for (const o of game.obstacles) {
    if (!o.slows) continue;
    ctx.save();
    ctx.translate(o.x, o.y);
    drawObstacle(ctx, o.kind, o.w, o.h, o.seed, t);
    ctx.restore();
  }

  for (const o of game.obstacles) {
    if (o.slows) continue;
    // trees and sunflowers sort on their base so Skip can pass behind them
    const z = o.kind === 'tree' || o.kind === 'sunflower' ? o.y + o.h * 0.34 : o.y;
    items.push({
      z,
      draw: () => {
        ctx.save();
        ctx.translate(o.x, o.y);
        drawObstacle(ctx, o.kind, o.w, o.h, o.seed, t);
        ctx.restore();
      },
    });
  }

  for (const e of game.eggs) {
    const frozen = game.levelDef.twist.eggsFreeze
      ? Math.max(0, (e.age - (CONFIG.eggFreezeTime - 4)) / 4)
      : 0;
    items.push({
      z: e.y,
      draw: () => {
        ctx.save();
        ctx.translate(e.x, e.y);
        drawEgg(ctx, e.kind, t + e.wobble, Math.min(frozen, 1));
        ctx.restore();
      },
    });
  }

  for (const p of game.powerups) {
    items.push({
      z: p.y,
      draw: () => {
        ctx.save();
        ctx.translate(p.x, p.y);
        drawPowerup(ctx, p.kind, t + p.age);
        ctx.restore();
      },
    });
  }

  for (const c of game.chickens) {
    if (c.taken) continue; // drawn in the fox's jaws instead
    items.push({
      z: c.y,
      draw: () => {
        ctx.save();
        ctx.translate(c.x, c.y);
        drawChicken(ctx, c.phase, c.facing, c.moving);
        ctx.restore();
      },
    });
  }

  for (const s of game.snakes) {
    if (s.boss && s.hp <= 0) continue;
    items.push({
      z: s.y,
      draw: () => {
        ctx.save();
        if (s.hitFlash > 0) ctx.globalAlpha = 0.55 + Math.sin(t * 60) * 0.35;
        drawSnake(ctx, {
          pts: slitherPoints(s.body, t, s.width, Math.hypot(s.vx, s.vy)),
          width: s.width,
          crowned: s.boss,
          enraged: s.enrage > 0,
          swallow: s.swallow / CONFIG.snakeSwallowTime,
          t,
        });
        ctx.restore();
      },
    });
  }

  if (game.rooster) {
    const r = game.rooster;
    items.push({
      z: r.y,
      draw: () => {
        ctx.save();
        ctx.translate(r.x, r.y);
        if (r.life < 3) ctx.globalAlpha = 0.4 + Math.abs(Math.sin(t * 8)) * 0.6;
        drawRooster(ctx, r.phase, r.facing);
        ctx.restore();
      },
    });
  }

  for (const w of game.weasels) {
    items.push({
      z: w.y,
      draw: () => {
        ctx.save();
        ctx.translate(w.x, w.y);
        drawWeasel(ctx, w.phase, w.facing);
        ctx.restore();
      },
    });
  }

  if (game.dog) {
    const d = game.dog;
    items.push({
      z: d.y,
      draw: () => {
        ctx.save();
        ctx.translate(d.x, d.y);
        drawDog(ctx, d.phase, d.facing);
        ctx.restore();
      },
    });
  }

  const fox = game.fox;
  if (fox && fox.hp > 0) {
    items.push({
      z: fox.y,
      draw: () => {
        if (fox.state === 'windup') drawChargeTell(ctx, fox.x, fox.y, fox.chargeX, fox.chargeY, fox.windup);
        ctx.save();
        ctx.translate(fox.x, fox.y);
        if (fox.hitFlash > 0) ctx.globalAlpha = 0.55 + Math.sin(t * 60) * 0.35;
        drawFox(ctx, {
          phase: fox.phase,
          facing: fox.facing,
          windup: fox.state === 'windup' ? fox.windup : 0,
          carrying: !!fox.carrying,
          hurt: fox.hitFlash,
        });
        ctx.restore();
      },
    });
  }

  for (const a of game.apples) {
    items.push({
      z: a.y + 0.5,
      draw: () => {
        if (a.splat > 0) {
          ctx.save();
          ctx.globalAlpha = a.splat / 0.35;
          ctx.translate(a.x, a.y);
          ctx.scale(1.6, 0.7);
          circle(ctx, 0, 0, 7, '#8f3524', 1.4);
          ctx.restore();
          return;
        }
        shadow(ctx, a.x, a.y, 6 - a.z * 0.03, 2.4, 0.2);
        ctx.save();
        ctx.translate(a.x, a.y - a.z);
        drawApple(ctx, a.spin);
        ctx.restore();
      },
    });
  }

  // --- Farmer Skip
  const f = game.farmer;
  items.push({
    z: f.y,
    draw: () => {
      ctx.save();
      ctx.translate(f.x, f.y);
      if (f.invuln > 0 && Math.floor(f.invuln * 12) % 2 === 0) ctx.globalAlpha = 0.4;
      if (game.active?.kind === 'speed') drawSpeedLines(ctx, f.facing, t);
      drawFarmer(ctx, { phase: f.phase, facing: f.facing, moving: f.moving, stunned: f.stun > 0 });
      if (game.active?.kind === 'shield') drawShieldBubble(ctx, t);
      if (game.active?.kind === 'magnet') drawMagnetField(ctx, t);
      ctx.restore();
    },
  });

  for (const k of game.kernels) {
    items.push({
      z: k.y + 1000, // corn flies over everything
      draw: () => {
        ctx.save();
        ctx.translate(k.x, k.y);
        drawKernel(ctx, k.spin);
        ctx.restore();
      },
    });
  }

  items.sort((a, b) => a.z - b.z);
  for (const it of items) it.draw();

  // aiming mark, so it is always obvious where the corn goes
  if (game.phase === 'playing') drawReticle(ctx, game, theme);
}

/** Adds the lateral wave that makes a rope of points read as a snake. */
function slitherPoints(
  body: { x: number; y: number }[],
  t: number,
  width: number,
  speed: number,
): { x: number; y: number }[] {
  const amp = Math.min(width * 0.42, 3 + speed * 0.02);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < body.length; i++) {
    const p = body[i];
    const next = body[Math.min(i + 1, body.length - 1)];
    const dx = next.x - p.x;
    const dy = next.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const wave = Math.sin(i * 0.55 - t * 9) * amp * (i === 0 ? 0.2 : 1);
    out.push({ x: p.x + nx * wave, y: p.y + ny * wave });
  }
  return out;
}

function drawShieldBubble(ctx: Ctx, t: number): void {
  ctx.save();
  ctx.globalAlpha = 0.32 + Math.sin(t * 5) * 0.08;
  ctx.beginPath();
  ctx.ellipse(0, -4, 27, 30, 0, 0, TAU);
  ctx.fillStyle = '#a9d3e2';
  ctx.fill();
  ctx.globalAlpha = 0.9;
  pen(ctx, 2.4, '#dff2fa');
  ctx.stroke();
  ctx.restore();
}

function drawSpeedLines(ctx: Ctx, facing: number, t: number): void {
  ctx.save();
  pen(ctx, 2.4, CREAM);
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = -12 + i * 11;
    const len = 12 + Math.sin(t * 18 + i) * 5;
    ctx.moveTo(-facing * 18, y);
    ctx.lineTo(-facing * (18 + len), y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawMagnetField(ctx: Ctx, t: number): void {
  ctx.save();
  ctx.globalAlpha = 0.22;
  pen(ctx, 2, '#c1543a');
  for (let i = 0; i < 2; i++) {
    const r = ((t * 60 + i * 64) % CONFIG.magnetRadius) + 20;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** The one-second tell before Rennard launches. */
function drawChargeTell(ctx: Ctx, x: number, y: number, tx: number, ty: number, windup: number): void {
  ctx.save();
  ctx.globalAlpha = 0.35 + windup * 0.4;
  ctx.setLineDash([10, 8]);
  pen(ctx, 3.5, '#c1543a');
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(x, y, 34 + (1 - windup) * 26, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawLantern(ctx: Ctx, game: Game): void {
  const f = game.farmer;
  const r = 210;
  const g = ctx.createRadialGradient(f.x, f.y, r * 0.34, f.x, f.y, r);
  g.addColorStop(0, 'rgba(9,12,20,0)');
  g.addColorStop(0.72, 'rgba(9,12,20,0.72)');
  g.addColorStop(1, 'rgba(6,9,15,0.94)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, game.worldW, game.worldH);
  // warm spill right around the lantern
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const warm = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 0.6);
  warm.addColorStop(0, 'rgba(224,166,58,0.20)');
  warm.addColorStop(1, 'rgba(224,166,58,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, game.worldW, game.worldH);
  ctx.restore();
}

function drawReticle(ctx: Ctx, game: Game, theme: Theme): void {
  const p = game.pointerWorld;
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = 0.55;
  pen(ctx, 2, theme.accent);
  ctx.beginPath();
  ctx.arc(p.x, p.y, 9, 0, TAU);
  ctx.moveTo(p.x - 15, p.y);
  ctx.lineTo(p.x - 5, p.y);
  ctx.moveTo(p.x + 5, p.y);
  ctx.lineTo(p.x + 15, p.y);
  ctx.moveTo(p.x, p.y - 15);
  ctx.lineTo(p.x, p.y - 5);
  ctx.moveTo(p.x, p.y + 5);
  ctx.lineTo(p.x, p.y + 15);
  ctx.stroke();
  ctx.restore();
}

function drawFx(ctx: Ctx, game: Game): void {
  for (const p of game.fx.particles) {
    const a = Math.min(1, p.life / (p.maxLife * 0.6));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = p.color;
    if (p.shape === 'dot') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, TAU);
      ctx.fill();
    } else if (p.shape === 'feather') {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, TAU);
      ctx.fill();
      pen(ctx, 0.8, INK);
      ctx.globalAlpha = a * 0.6;
      ctx.beginPath();
      ctx.moveTo(-p.size, 0);
      ctx.lineTo(p.size, 0);
      ctx.stroke();
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
    }
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of game.fx.texts) {
    const a = Math.min(1, t.life / (t.maxLife * 0.5));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = DISPLAY_FONT.replace('20px', `${t.size}px`);
    ctx.lineWidth = 4.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

/** Small standalone helper used by the title screen's animated strip. */
export function drawTitleVignette(ctx: Ctx, w: number, h: number, t: number): void {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w * 0.5, h * 0.62);
  const s = Math.min(w / 320, h / 150);
  ctx.scale(s, s);
  ctx.translate(-40, 0);
  drawFarmer(ctx, { phase: t * 7, facing: 1, moving: true, stunned: false });
  ctx.translate(70, 6);
  drawChicken(ctx, t * 6, 1, true);
  ctx.translate(58, -2);
  ctx.save();
  ctx.translate(0, -2);
  drawEgg(ctx, 'golden', t);
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.9;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 14; i++) {
    pts.push({ x: w * 0.5 - 150 - i * 7, y: h * 0.62 + Math.sin(t * 6 - i * 0.5) * 6 });
  }
  drawSnake(ctx, { pts, width: 11, crowned: false, enraged: false, swallow: 0, t });
  ctx.restore();
}
