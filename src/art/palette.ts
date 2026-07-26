/**
 * ART DIRECTION — "hand-pressed farm poster"
 *
 * Everything in Cluck & Cover is drawn as if it were block-printed onto rough
 * paper: flat fills, one heavy ink outline, no gradients on characters, and a
 * deliberately small palette. Six named colours carry the whole game; level
 * themes only ever re-tint the ground and furniture, never the cast, so the
 * farmer and the snake read identically in a sunflower field and in the dark.
 */

export const INK = '#241d16'; // outline + type. Nearly black, warm.
export const CREAM = '#f4e5c3'; // paper, shirts, eggshell
export const WHEAT = '#e0a63a'; // straw, gold, corn
export const CLOVER = '#5f8d4a'; // grass, snake, leaves
export const BARN = '#c1543a'; // barn red, combs, fox, danger
export const SKY = '#7ba6b8'; // water, denim, cold

/** Tints and shades, all derived from the six above. */
export const INK_SOFT = '#3d3225';
export const CREAM_DEEP = '#e0cda6';
export const WHEAT_DEEP = '#b97f26';
export const CLOVER_DEEP = '#3f6634';
export const BARN_DEEP = '#8f3524';
export const SKY_DEEP = '#4e7386';
export const SKIN = '#d8a273';
export const STONE = '#8d8576';
export const STONE_DEEP = '#635d51';

/** Per-level dressing. The cast never changes colour; the farm does. */
export interface Theme {
  /** Field fill and the alternating mown stripe over it. */
  ground: string;
  groundStripe: string;
  /** Fence posts and rails around the playfield. */
  fence: string;
  fenceDeep: string;
  /** Backdrop outside the fence. */
  surround: string;
  /** Theme highlight used for level cards and HUD trim. */
  accent: string;
  /** Multiplied over the whole field — used for night and winter. */
  wash: string | null;
}

export const THEMES: Record<string, Theme> = {
  barnyard: {
    ground: '#8fa957',
    groundStripe: '#849e4f',
    fence: '#a8794a',
    fenceDeep: '#7d5732',
    surround: '#3f4a33',
    accent: WHEAT,
    wash: null,
  },
  cornfield: {
    ground: '#c8a94f',
    groundStripe: '#bd9e44',
    fence: '#a8794a',
    fenceDeep: '#7d5732',
    surround: '#57492a',
    accent: WHEAT,
    wash: null,
  },
  pond: {
    ground: '#7f9a5a',
    groundStripe: '#769050',
    fence: '#8f8f7a',
    fenceDeep: '#6b6b58',
    surround: '#33463f',
    accent: SKY,
    wash: null,
  },
  orchard: {
    ground: '#7f9a53',
    groundStripe: '#77914d',
    fence: '#a8794a',
    fenceDeep: '#7d5732',
    surround: '#37432d',
    accent: BARN,
    wash: null,
  },
  pit: {
    ground: '#9b7f4e',
    groundStripe: '#907547',
    fence: '#6f5a3c',
    fenceDeep: '#4e3f2a',
    surround: '#2f2a1f',
    accent: CLOVER,
    wash: null,
  },
  night: {
    ground: '#39465a',
    groundStripe: '#344055',
    fence: '#4a4335',
    fenceDeep: '#332f25',
    surround: '#161c26',
    accent: SKY,
    wash: 'rgba(18,24,38,0.35)',
  },
  sunflower: {
    ground: '#93a94f',
    groundStripe: '#8a9f49',
    fence: '#a8794a',
    fenceDeep: '#7d5732',
    surround: '#4a4a24',
    accent: WHEAT,
    wash: null,
  },
  mud: {
    ground: '#8a7546',
    groundStripe: '#816c40',
    fence: '#7d6a48',
    fenceDeep: '#5b4c33',
    surround: '#3b3423',
    accent: '#6f5a34',
    wash: null,
  },
  winter: {
    ground: '#d9e2e6',
    groundStripe: '#cfd9de',
    fence: '#8d9298',
    fenceDeep: '#6a6f75',
    surround: '#5e6a72',
    accent: SKY,
    wash: 'rgba(140,180,205,0.16)',
  },
  reckoning: {
    ground: '#a86f45',
    groundStripe: '#9d663f',
    fence: '#7d5732',
    fenceDeep: '#5a3d22',
    surround: '#3a2a1c',
    accent: BARN,
    wash: 'rgba(120,50,25,0.12)',
  },
};

/** Palette slices handed to particle bursts. */
export const FX_EGG = [CREAM, CREAM_DEEP, '#ffffff'] as const;
export const FX_GOLD = [WHEAT, '#f7d071', CREAM] as const;
export const FX_SPECIAL = [SKY, '#a9d3e2', CREAM] as const;
export const FX_BLOOD = [BARN, BARN_DEEP, WHEAT_DEEP] as const;
export const FX_DUST = [STONE, CREAM_DEEP, WHEAT_DEEP] as const;
export const FX_FEATHER = [CREAM, CREAM_DEEP, BARN] as const;
export const FX_LEAF = [CLOVER, CLOVER_DEEP, WHEAT] as const;
