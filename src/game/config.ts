/**
 * Every tunable number in one place. Balance lives here, not in the systems.
 */

import type { UpgradeIcon } from '../art/sprites';

export const CONFIG = {
  // --- world
  worldBaseW: 900,
  worldBaseH: 620,
  worldGrowW: 34,
  worldGrowH: 24,

  // --- Farmer Skip
  farmerSpeed: 198,
  farmerRadius: 15,
  farmerAccel: 12, // approach rate; ice lowers this dramatically
  startLives: 3,
  maxLives: 5,
  invulnTime: 1.7,
  stunTime: 1.0,

  // --- chickens & eggs
  chickenStart: 2,
  chickenMax: 8,
  chickenRadius: 11,
  // Laying cadence. Deliberately unhurried: Skip is sixty-two and the game is
  // about choosing a route round the field, not about scrambling after a flood.
  layMin: 2.2,
  layMax: 4.4,
  layScalePerLevel: 0.94,
  layFloorMin: 1.4,
  layFloorMax: 2.8,
  /**
   * Each hen past the starting pair stretches everyone's interval. Without this
   * a full flock of eight lays four times faster than a pair and the field
   * turns into a carpet of eggs.
   */
  layFlockSpread: 0.2,
  eggRadius: 8,
  pickupRadius: 21,
  eggCap: 18, // safety net so a parked player cannot flood the field
  eggFreezeTime: 12, // Frostfallow only

  // --- corn
  kernelSpeed: 585,
  kernelRadius: 6,
  kernelLife: 1.4,
  fireCooldown: 0.22,
  spreadAngle: 0.17,

  // --- snake
  snakeSpeedFactor: 0.66,
  snakeRadius: 13,
  snakeSegments: 16,
  snakeSegLen: 7.5,
  snakeEggChance: 0.7,
  snakeRetarget: 1.6,
  snakeCornPoints: 5,
  /**
   * A snake that has just swallowed an egg is slow and harmless while it gets
   * the thing down. This is the main brake on how fast it fills its limit, so
   * it is tuned against the laying rate above, not chosen for flavour.
   */
  snakeSwallowTime: 2.4,
  snakeSwallowSpeed: 0.3,
  /** Bosses are briefly untouchable after a hit, so a spread counts once. */
  bossHitCooldown: 0.42,

  // --- rooster
  roosterInterval: 20,
  roosterLife: 15,
  roosterSpeedFactor: 0.82,
  roosterRadius: 14,
  roosterCornPoints: 8,

  // --- weasel
  weaselInterval: 15,
  weaselLife: 20,
  weaselSpeed: 152,
  weaselRadius: 13,
  weaselCornPoints: 10,
  chickenLossLimit: 3,

  // --- power-ups
  powerupInterval: 10,
  powerupRadius: 16,
  magnetRadius: 128,
  magnetPull: 340,

  // --- combo
  comboWindow: 2.0,
  comboMaxBonus: 5,

  // --- dog
  dogSpeed: 190,
  dogRadius: 13,
  dogGuardRadius: 260,

  // --- scoring
  quotaBase: 5,
  quotaStep: 3,
  quotaMax: 20,
  snakeLimitBase: 5,
  snakeLimitStep: 2,
  snakeLimitMax: 15,
} as const;

export const EGG_KINDS = [
  { kind: 'normal' as const, weight: 0.7, points: 1 },
  { kind: 'golden' as const, weight: 0.2, points: 3 },
  { kind: 'special' as const, weight: 0.1, points: 5 },
];

export const POWER_WEIGHTS = [
  { kind: 'speed' as const, weight: 0.3, duration: 5 },
  { kind: 'shield' as const, weight: 0.25, duration: 7 },
  { kind: 'magnet' as const, weight: 0.25, duration: 6 },
  { kind: 'freeze' as const, weight: 0.2, duration: 4 },
];

export type UpgradeId = 'boots' | 'cannon' | 'basket' | 'dog' | 'overalls';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: UpgradeIcon;
  maxTier: number;
  /** Price for tier index 0..maxTier-1. Overalls override this (see priceFor). */
  prices: number[];
  tierText: string[];
  flavor: string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'boots',
    name: 'Swift Boots',
    icon: 'boots',
    maxTier: 3,
    prices: [35, 80, 150],
    tierText: ['+10% walking speed', '+20% walking speed', '+30% walking speed'],
    flavor: 'Skip does not run. Skip walks faster, disapprovingly.',
  },
  {
    id: 'cannon',
    name: 'Corn Cannon',
    icon: 'cannon',
    maxTier: 3,
    prices: [45, 100, 185],
    tierText: ['Throw 2 kernels', 'Throw 3 in a spread', '3 kernels, each pierces one pest'],
    flavor: 'Feed corn is for chickens. This is for everyone else.',
  },
  {
    id: 'basket',
    name: 'Big Basket',
    icon: 'basket',
    maxTier: 3,
    prices: [30, 70, 135],
    tierText: [
      '+1 point per golden/special egg',
      '+2 points per golden/special egg',
      '+3 points per golden/special egg',
    ],
    flavor: 'Holds more. Weighs more. Skip has opinions about both.',
  },
  {
    id: 'dog',
    name: 'Farm Dog',
    icon: 'dog',
    maxTier: 1,
    prices: [210],
    tierText: ['Bess patrols the field and runs weasels off'],
    flavor: 'The only member of this farm Skip has never complained about.',
  },
  {
    id: 'overalls',
    name: 'Spare Overalls',
    icon: 'overalls',
    maxTier: 5,
    prices: [55],
    tierText: ['One more life (max 5)'],
    flavor: 'Every pair mended twice. There will not be a third time.',
  },
];

/** Overalls get pricier every time; everything else uses its tier price. */
export function priceFor(def: UpgradeDef, owned: number): number {
  if (def.id === 'overalls') return 55 + 45 * owned;
  return def.prices[Math.min(owned, def.prices.length - 1)];
}
