/** Entity shapes. Plain data — all behaviour lives in the systems. */

import type { EggKind, PowerKind } from '../art/sprites';
import type { Obstacle } from './terrain';
import type { UpgradeId } from './config';

export interface Farmer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  phase: number;
  moving: boolean;
  invuln: number;
  stun: number;
  fireCooldown: number;
}

export interface Chicken {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  phase: number;
  moving: boolean;
  layTimer: number;
  tx: number;
  ty: number;
  retarget: number;
  /** Set while a fox is carrying it; the chicken stops behaving on its own. */
  taken: boolean;
}

export interface Egg {
  x: number;
  y: number;
  kind: EggKind;
  points: number;
  age: number;
  wobble: number;
}

export interface SnakeBodyPoint {
  x: number;
  y: number;
}

export interface Snake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  body: SnakeBodyPoint[];
  mode: 'egg' | 'farmer';
  retarget: number;
  boss: boolean;
  hp: number;
  enrage: number;
  hitFlash: number;
  /** Time left swallowing an egg: the snake slows right down and cannot eat. */
  swallow: number;
  width: number;
  speed: number;
}

export interface Rooster {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  phase: number;
  life: number;
}

export interface Weasel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  phase: number;
  life: number;
  target: Chicken | null;
  /** Set when the dog is on it — the weasel bolts for the nearest edge. */
  routed: boolean;
}

export interface Kernel {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  life: number;
  pierce: number;
  hit: Set<unknown>;
}

export interface PowerupPickup {
  x: number;
  y: number;
  kind: PowerKind;
  age: number;
}

export interface ActivePower {
  kind: PowerKind;
  time: number;
  duration: number;
}

export interface Apple {
  x: number;
  y: number;
  z: number;
  vz: number;
  spin: number;
  splat: number;
}

export interface Dog {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  phase: number;
  target: Weasel | null;
  /** Idle patrol waypoint. */
  tx: number;
  ty: number;
}

export interface Fox {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  phase: number;
  hp: number;
  state: 'stalk' | 'windup' | 'charge' | 'steal' | 'flee' | 'recover';
  timer: number;
  windup: number;
  carrying: Chicken | null;
  hitFlash: number;
  chargeX: number;
  chargeY: number;
}

export type Phase =
  | 'title'
  | 'levelIntro'
  | 'playing'
  | 'paused'
  | 'levelClear'
  | 'shop'
  | 'gameover'
  | 'victory';

export interface RunStats {
  eggsCollected: number;
  goldenEggs: number;
  specialEggs: number;
  pestsHit: number;
  chickensLost: number;
  bestCombo: number;
  levelsCleared: number;
  timePlayed: number;
}

export interface Upgrades {
  boots: number;
  cannon: number;
  basket: number;
  dog: number;
  overalls: number;
}

export const emptyUpgrades = (): Upgrades => ({ boots: 0, cannon: 0, basket: 0, dog: 0, overalls: 0 });

export type { Obstacle, UpgradeId };
