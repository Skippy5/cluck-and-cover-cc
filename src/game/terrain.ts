/**
 * Obstacle layout and collision. Layouts are generated per level and are
 * guaranteed to leave the spawn area open, so Skip is never walled in.
 */

import type { ObstacleKind } from '../art/scenery';
import { dist, rand, randInt } from '../core/math';
import type { LevelDef } from './levels';

/**
 * 'all'      — solid for everybody.
 * 'landOnly' — water: solid for everything that walks, open to anything that swims.
 * 'none'     — decoration you can stand on (mud).
 */
export type Blocking = 'all' | 'landOnly' | 'none';

export interface Obstacle {
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  seed: number;
  /** Collision body, offset from the sprite origin. */
  shape: 'rect' | 'ellipse';
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  blocks: Blocking;
  /** Mud: doesn't block, but drags. */
  slows: boolean;
}

/** Collision body per obstacle type — deliberately smaller than the artwork. */
function bodyFor(kind: ObstacleKind, w: number, h: number): Pick<Obstacle, 'shape' | 'cx' | 'cy' | 'hw' | 'hh' | 'blocks' | 'slows'> {
  switch (kind) {
    case 'rock':
      return { shape: 'ellipse', cx: 0, cy: 0, hw: w * 0.44, hh: h * 0.42, blocks: 'all', slows: false };
    case 'bale':
      return { shape: 'rect', cx: 0, cy: 0, hw: w * 0.5, hh: h * 0.5, blocks: 'all', slows: false };
    case 'crate':
      return { shape: 'rect', cx: 0, cy: 0, hw: w * 0.5, hh: h * 0.5, blocks: 'all', slows: false };
    case 'water':
      // Skip and the hens go round it; only the snake goes through.
      return { shape: 'ellipse', cx: 0, cy: 0, hw: w * 0.44, hh: h * 0.42, blocks: 'landOnly', slows: false };
    case 'tree':
      // only the trunk blocks, so the canopy can overhang the field
      return { shape: 'ellipse', cx: 0, cy: h * 0.34, hw: w * 0.17, hh: h * 0.09, blocks: 'all', slows: false };
    case 'sunflower':
      return { shape: 'ellipse', cx: 0, cy: h * 0.36, hw: w * 0.14, hh: h * 0.06, blocks: 'all', slows: false };
    case 'stump':
      return { shape: 'ellipse', cx: 0, cy: 0, hw: w * 0.4, hh: h * 0.3, blocks: 'all', slows: false };
    case 'drift':
      return { shape: 'ellipse', cx: 0, cy: 0, hw: w * 0.4, hh: h * 0.32, blocks: 'all', slows: false };
    case 'mud':
      return { shape: 'ellipse', cx: 0, cy: 0, hw: w * 0.42, hh: h * 0.4, blocks: 'none', slows: true };
  }
}

const makeObstacle = (kind: ObstacleKind, x: number, y: number, w: number, h: number): Obstacle => ({
  kind,
  x,
  y,
  w,
  h,
  seed: Math.random() * 1000,
  ...bodyFor(kind, w, h),
});

/**
 * Scatter obstacles, keeping a clear disc at the spawn point and refusing
 * placements that crowd another obstacle.
 */
export function buildLevelTerrain(level: LevelDef, worldW: number, worldH: number): Obstacle[] {
  const out: Obstacle[] = [];
  const [bw, bh] = level.obstacleSize;
  const spawnX = worldW / 2;
  const spawnY = worldH / 2;
  const margin = 54;
  const clearRadius = 130;

  // Level 2 lays its bales out as staggered lanes rather than scattering them.
  if (level.n === 2) {
    const lanes = 4;
    for (let l = 0; l < lanes; l++) {
      const x = margin + 70 + ((worldW - margin * 2 - 140) / (lanes - 1)) * l;
      const gapAt = randInt(1, 3);
      for (let r = 0; r < 5; r++) {
        if (r === gapAt || r === gapAt + 1) continue;
        const y = margin + 60 + ((worldH - margin * 2 - 120) / 4) * r + (l % 2 === 0 ? 0 : 26);
        if (dist(x, y, spawnX, spawnY) < clearRadius) continue;
        out.push(makeObstacle(level.obstacle, x, y, bw, bh));
      }
    }
    return out;
  }

  let guard = 0;
  while (out.length < level.obstacleCount && guard < 800) {
    guard++;
    const w = bw * rand(0.85, 1.15);
    const h = bh * rand(0.85, 1.15);
    const x = rand(margin + w / 2, worldW - margin - w / 2);
    const y = rand(margin + h / 2, worldH - margin - h / 2);
    if (dist(x, y, spawnX, spawnY) < clearRadius + Math.max(w, h) * 0.5) continue;
    const tooClose = out.some((o) => dist(x, y, o.x, o.y) < (Math.max(w, h) + Math.max(o.w, o.h)) * 0.62);
    if (tooClose) continue;
    out.push(makeObstacle(level.obstacle, x, y, w, h));
  }
  return out;
}

/** True when a circle overlaps an obstacle's collision body. */
export function overlaps(o: Obstacle, x: number, y: number, r: number): boolean {
  const cx = o.x + o.cx;
  const cy = o.y + o.cy;
  if (o.shape === 'rect') {
    const nx = Math.max(cx - o.hw, Math.min(x, cx + o.hw));
    const ny = Math.max(cy - o.hh, Math.min(y, cy + o.hh));
    const dx = x - nx;
    const dy = y - ny;
    return dx * dx + dy * dy < r * r;
  }
  const nx = (x - cx) / (o.hw + r);
  const ny = (y - cy) / (o.hh + r);
  return nx * nx + ny * ny < 1;
}

export interface Movable {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Push a moving circle out of every obstacle it is inside, then clamp it to the
 * world. Pass `canSwim` for snakes, which treat water as open ground.
 */
export function resolveCollisions(
  m: Movable,
  r: number,
  obstacles: readonly Obstacle[],
  worldW: number,
  worldH: number,
  canSwim: boolean,
): void {
  for (const o of obstacles) {
    if (o.blocks === 'none') continue;
    if (o.blocks === 'landOnly' && canSwim) continue;
    const cx = o.x + o.cx;
    const cy = o.y + o.cy;

    if (o.shape === 'rect') {
      const nx = Math.max(cx - o.hw, Math.min(m.x, cx + o.hw));
      const ny = Math.max(cy - o.hh, Math.min(m.y, cy + o.hh));
      let dx = m.x - nx;
      let dy = m.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        m.x = nx + (dx / d) * r;
        m.y = ny + (dy / d) * r;
      } else {
        // centre is inside the rect: eject along the shallowest axis
        const left = m.x - (cx - o.hw);
        const right = cx + o.hw - m.x;
        const top = m.y - (cy - o.hh);
        const bottom = cy + o.hh - m.y;
        const min = Math.min(left, right, top, bottom);
        if (min === left) m.x = cx - o.hw - r;
        else if (min === right) m.x = cx + o.hw + r;
        else if (min === top) m.y = cy - o.hh - r;
        else m.y = cy + o.hh + r;
      }
      continue;
    }

    const ex = o.hw + r;
    const ey = o.hh + r;
    let nx = (m.x - cx) / ex;
    let ny = (m.y - cy) / ey;
    const d = Math.hypot(nx, ny);
    if (d >= 1) continue;
    if (d < 1e-6) {
      nx = 0;
      ny = 1;
    } else {
      nx /= d;
      ny /= d;
    }
    m.x = cx + nx * ex;
    m.y = cy + ny * ey;
  }

  m.x = Math.max(r + 10, Math.min(worldW - r - 10, m.x));
  m.y = Math.max(r + 10, Math.min(worldH - r - 10, m.y));
}

/** Is Skip standing in a mud patch? */
export function inSlowZone(obstacles: readonly Obstacle[], x: number, y: number, r: number): boolean {
  for (const o of obstacles) if (o.slows && overlaps(o, x, y, r * 0.4)) return true;
  return false;
}

/**
 * Find open ground for a spawn. Falls back to the least-bad candidate rather
 * than ever returning a position inside a wall.
 */
export function findClearSpot(
  obstacles: readonly Obstacle[],
  worldW: number,
  worldH: number,
  r: number,
  avoid: readonly { x: number; y: number; r: number }[] = [],
  tries = 60,
): { x: number; y: number } {
  let best = { x: worldW / 2, y: worldH / 2 };
  let bestScore = -Infinity;
  for (let i = 0; i < tries; i++) {
    const x = rand(r + 30, worldW - r - 30);
    const y = rand(r + 30, worldH - r - 30);
    if (obstacles.some((o) => o.blocks !== 'none' && overlaps(o, x, y, r + 6))) continue;
    let score = Infinity;
    for (const a of avoid) score = Math.min(score, dist(x, y, a.x, a.y) - a.r);
    if (score === Infinity) return { x, y };
    if (score > bestScore) {
      bestScore = score;
      best = { x, y };
    }
    if (score > 220) break;
  }
  return best;
}

/** A point just outside a random edge, used for entrances. */
export function edgeSpawn(worldW: number, worldH: number): { x: number; y: number } {
  const side = randInt(0, 3);
  switch (side) {
    case 0:
      return { x: rand(60, worldW - 60), y: 24 };
    case 1:
      return { x: worldW - 24, y: rand(60, worldH - 60) };
    case 2:
      return { x: rand(60, worldW - 60), y: worldH - 24 };
    default:
      return { x: 24, y: rand(60, worldH - 60) };
  }
}

/** Nearest world edge point — where a routed pest runs to. */
export function nearestEdge(x: number, y: number, worldW: number, worldH: number): { x: number; y: number } {
  const d = [x, worldW - x, y, worldH - y];
  const min = Math.min(...d);
  if (min === d[0]) return { x: -40, y };
  if (min === d[1]) return { x: worldW + 40, y };
  if (min === d[2]) return { x, y: -40 };
  return { x, y: worldH + 40 };
}
