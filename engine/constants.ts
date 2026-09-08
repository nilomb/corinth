import type {
  BuildingId,
  GoodsDistrictId,
  GoodsHarborId,
  HarborDistrictId,
  MarketNodeId,
  PlayerCount,
} from "./types";

/** Harbor districts, bottom → top, matching the physical board. */
export const HARBOR_ORDER = [
  "Goats",
  "Oil",
  "Wine",
  "Carpets",
  "Spices",
  "Gold",
] as const satisfies readonly HarborDistrictId[];

export const GOODS_HARBOR = [
  "Oil",
  "Wine",
  "Carpets",
  "Spices",
] as const satisfies readonly GoodsHarborId[];

export const SHEET_DISTRICTS = [
  "orange",
  "blue",
  "purple",
  "green",
] as const satisfies readonly GoodsDistrictId[];

export const BUILDING_IDS = [
  "temple",
  "warehouse",
  "stable",
  "store",
] as const satisfies readonly BuildingId[];

/** Harbor goods district → sheet color (cr_scoring_a4). Orange has no first-place bonus. */
export const HARBOR_TO_SHEET = {
  Spices: "orange",
  Carpets: "blue",
  Wine: "purple",
  Oil: "green",
} as const;

export const SHEET_TO_HARBOR = {
  orange: "Spices",
  blue: "Carpets",
  purple: "Wine",
  green: "Oil",
} as const;

export const WHITE_DICE = 9;
export const MAX_YELLOW_DICE = 3;
export const GOLD_TRACK = 24;
export const GOAT_TRACK = 24;
export const STARTING_GOLD = 1;
export const STARTING_GOATS = 1;
export const TURN_SLOTS = 6;

/** 2–3 players: 6 rounds. 4 players: 4 rounds (two turn-track boxes pre-filled). */
export function maxRoundsFor(playerCount: PlayerCount): 4 | 6 {
  return playerCount === 4 ? 4 : 6;
}

export function preMarkedTurns(playerCount: PlayerCount): 0 | 2 {
  return playerCount === 4 ? 2 : 0;
}

export const BUILDINGS = {
  temple: { gold: 3, goats: 3, vpPerBuilding: 3 },
  warehouse: { gold: 4, goats: 4, extraGood: 1 },
  stable: { gold: 2, goats: 1, freeStepMod: 2 },
  store: { gold: 0, goats: 2, extraGold: 2 },
} as const;

export const DISTRICT_BONUS_VP = {
  orange: null,
  blue: 3,
  purple: 4,
  green: 5,
} as const;

/**
 * Shop sizes and VP. Pixel positions stay in the UI layout.
 * Symbol counts match SCORECARD_SHEET_LAYOUT in index.html.
 */
export const SHOPS = {
  orange: [
    { points: 4, symbols: 2 },
    { points: 5, symbols: 2 },
    { points: 10, symbols: 4 },
  ],
  blue: [
    { points: 3, symbols: 2 },
    { points: 5, symbols: 3 },
    { points: 8, symbols: 4 },
  ],
  purple: [
    { points: 2, symbols: 2 },
    { points: 3, symbols: 3 },
    { points: 4, symbols: 3 },
    { points: 6, symbols: 4 },
  ],
  green: [
    { points: 1, symbols: 2 },
    { points: 2, symbols: 3 },
    { points: 3, symbols: 3 },
    { points: 6, symbols: 5 },
  ],
} as const;

export const MARKET_ORIGIN: MarketNodeId = "r2c2";

export const MARKET_DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

/** 5×5 market effects, row-major. Ids are `r{row}c{col}`. */
export const MARKET_GRID = [
  [
    { t: "score", d: 0 },
    { t: "die" },
    { t: "goods", district: "blue", qty: 1 },
    { t: "plus" },
    { t: "score", d: 1 },
  ],
  [
    { t: "goods", district: "orange", qty: 1 },
    { t: "goods", district: "green", qty: 1 },
    { t: "goats", qty: 2 },
    { t: "die" },
    { t: "goods", district: "green", qty: 2 },
  ],
  [
    { t: "plus" },
    { t: "goods", district: "purple", qty: 1 },
    { t: "steward" },
    { t: "gold", qty: 1 },
    { t: "plus" },
  ],
  [
    { t: "goods", district: "green", qty: 2 },
    { t: "gold", qty: 2 },
    { t: "die" },
    { t: "goods", district: "purple", qty: 1 },
    { t: "goods", district: "blue", qty: 1 },
  ],
  [
    { t: "score", d: 2 },
    { t: "goats", qty: 1 },
    { t: "plus" },
    { t: "goats", qty: 2 },
    { t: "goods", district: "orange", qty: 1 },
  ],
] as const;
