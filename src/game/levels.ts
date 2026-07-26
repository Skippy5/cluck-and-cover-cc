/**
 * The ten fields of Cluck & Cover. Each one changes the palette, the furniture
 * and exactly one rule, so no two levels are played the same way.
 */

import type { ObstacleKind } from '../art/scenery';
import { CONFIG } from './config';

export type BossKind = 'coilback' | 'rennard';

export interface LevelTwist {
  /** Water blocks Skip but the snake swims straight through it. */
  snakeSwims?: boolean;
  /** Apples fall from the trees and stun on impact. */
  fallingApples?: boolean;
  /** Sight limited to a radius around Skip. */
  darkness?: boolean;
  /** Two snakes sharing a single egg limit. */
  twinSnakes?: boolean;
  /** Obstacles are mud: they don't block, they slow Skip to 60%. */
  mud?: boolean;
  /** Icy footing — momentum instead of instant turns. */
  ice?: boolean;
  /** Uncollected eggs freeze and shatter. */
  eggsFreeze?: boolean;
  /** Level 1 only: no rooster, no weasel. */
  noPredators?: boolean;
}

export interface LevelDef {
  n: number;
  name: string;
  /** One line on the intro card, in Skip's voice. */
  card: string;
  /** The rule that makes this field different. */
  twistText: string;
  theme: string;
  obstacle: ObstacleKind;
  obstacleCount: number;
  obstacleSize: [number, number];
  boss?: BossKind;
  twist: LevelTwist;
}

export const LEVELS: LevelDef[] = [
  {
    n: 1,
    name: 'Stonewhistle Yard',
    card: 'Two hens, a few rocks, and one snake that thinks I have not noticed it.',
    twistText: 'Quiet start — no rooster, no weasel.',
    theme: 'barnyard',
    obstacle: 'rock',
    obstacleCount: 7,
    obstacleSize: [46, 40],
    twist: { noPredators: true },
  },
  {
    n: 2,
    name: 'The Rattlerows',
    card: 'Stacked the bales in rows. Now I cannot see a thing and neither can you.',
    twistText: 'Dense bale lanes — mind the corners.',
    theme: 'cornfield',
    obstacle: 'bale',
    obstacleCount: 16,
    obstacleSize: [74, 46],
    twist: {},
  },
  {
    n: 3,
    name: 'Duckweed Hollow',
    card: 'I have gone round that pond forty years. The snake has never once bothered.',
    twistText: 'Skip must skirt the water. The snake swims straight through.',
    theme: 'pond',
    obstacle: 'water',
    obstacleCount: 5,
    obstacleSize: [150, 110],
    twist: { snakeSwims: true },
  },
  {
    n: 4,
    name: 'Bruised Apple Grove',
    card: 'Trees drop what they like, when they like. Same as everyone else round here.',
    twistText: 'Falling apples stun Skip for a second.',
    theme: 'orchard',
    obstacle: 'tree',
    obstacleCount: 9,
    obstacleSize: [96, 108],
    twist: { fallingApples: true },
  },
  {
    n: 5,
    name: 'The Coilback Pit',
    card: 'Old Coilback. Ate my best hen in ninety-one. I have been waiting.',
    twistText: 'BOSS — land 10 corn hits. No quota. Eggs are just bait and money.',
    theme: 'pit',
    obstacle: 'stump',
    obstacleCount: 8,
    obstacleSize: [58, 50],
    boss: 'coilback',
    twist: {},
  },
  {
    n: 6,
    name: 'Lantern Dark',
    card: 'Lantern is on its last wick. Stay close to it and keep your ears open.',
    twistText: 'You can only see as far as the lantern reaches.',
    theme: 'night',
    obstacle: 'crate',
    obstacleCount: 13,
    obstacleSize: [58, 54],
    twist: { darkness: true },
  },
  {
    n: 7,
    name: 'Goldenhead Rows',
    card: 'Prettiest field I own. Naturally there are two snakes in it.',
    twistText: 'Twin snakes, sharing one egg limit between them.',
    theme: 'sunflower',
    obstacle: 'sunflower',
    obstacleCount: 15,
    obstacleSize: [64, 96],
    twist: { twinSnakes: true },
  },
  {
    n: 8,
    name: 'The Sowmire',
    card: 'Rained for a week. The mud only ever slows down the one doing the work.',
    twistText: 'Mud drags Skip to 60% speed. The pests do not care.',
    theme: 'mud',
    obstacle: 'mud',
    obstacleCount: 11,
    obstacleSize: [118, 92],
    twist: { mud: true },
  },
  {
    n: 9,
    name: 'Frostfallow',
    card: 'Boots slide, eggs crack, hens complain. Winter is my least favourite tenant.',
    twistText: 'Icy footing, and eggs shatter if left out for 12 seconds.',
    theme: 'winter',
    obstacle: 'drift',
    obstacleCount: 12,
    obstacleSize: [86, 62],
    twist: { ice: true, eggsFreeze: true },
  },
  {
    n: 10,
    name: "Rennard's Reckoning",
    card: 'The fox has had six of my hens. He is not having a seventh.',
    twistText: 'FINAL BOSS — Rennard the Rustler. 15 hits. He steals, then he charges.',
    theme: 'reckoning',
    obstacle: 'crate',
    obstacleCount: 10,
    obstacleSize: [60, 56],
    boss: 'rennard',
    twist: {},
  },
];

export const getLevel = (n: number): LevelDef => LEVELS[Math.min(n, LEVELS.length) - 1];

export const quotaFor = (n: number): number =>
  Math.min(CONFIG.quotaBase + CONFIG.quotaStep * (n - 1), CONFIG.quotaMax);

export const snakeLimitFor = (n: number): number =>
  Math.min(CONFIG.snakeLimitBase + CONFIG.snakeLimitStep * (n - 1), CONFIG.snakeLimitMax);

export const chickenCountFor = (n: number): number =>
  Math.min(CONFIG.chickenStart + (n - 1), CONFIG.chickenMax);

export const worldSizeFor = (n: number): { w: number; h: number } => ({
  w: CONFIG.worldBaseW + CONFIG.worldGrowW * (n - 1),
  h: CONFIG.worldBaseH + CONFIG.worldGrowH * (n - 1),
});

/** Egg cadence tightens every level, down to a floor. */
export const layRangeFor = (n: number): [number, number] => {
  const scale = Math.pow(CONFIG.layScalePerLevel, n - 1);
  return [
    Math.max(CONFIG.layFloorMin, CONFIG.layMin * scale),
    Math.max(CONFIG.layFloorMax, CONFIG.layMax * scale),
  ];
};

/** Skip's running commentary as the combo climbs. */
export const COMBO_CALLOUTS: { at: number; text: string; shake: number }[] = [
  { at: 3, text: 'HMPH. FINE.', shake: 0 },
  { at: 5, text: "THAT'LL DO.", shake: 3 },
  { at: 8, text: "NOW YOU'RE FARMIN'!", shake: 9 },
];
