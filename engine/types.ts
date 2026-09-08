export type PlayerCount = 2 | 3 | 4;
export type PlayerId = 0 | 1 | 2 | 3;
export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type DieColor = "white" | "yellow";

export type HarborDistrictId =
  | "Goats"
  | "Oil"
  | "Wine"
  | "Carpets"
  | "Spices"
  | "Gold";

export type GoodsHarborId = "Oil" | "Wine" | "Carpets" | "Spices";
export type GoodsDistrictId = "orange" | "blue" | "purple" | "green";
export type BuildingId = "temple" | "warehouse" | "stable" | "store";
export type BonusMark = "circled" | "crossed";
export type MarketNodeId = `r${0 | 1 | 2 | 3 | 4}c${0 | 1 | 2 | 3 | 4}`;

export type Phase =
  /** First player may buy extra yellows, then rolls. */
  | "supply"
  /** Clockwise draft: take a remaining group, or compensation. */
  | "draft"
  /** Active player resolves the taken group on their sheet, then may build. */
  | "action"
  | "over";

export interface Die {
  id: string;
  color: DieColor;
  face: DieFace;
  district: HarborDistrictId | null;
}

export interface HarborState {
  dice: Die[];
  /** Die ids currently sitting on each district. Empty omitted. */
  groups: Partial<Record<HarborDistrictId, string[]>>;
  taken: HarborDistrictId[];
  /** True after the first player of the round finishes their first pick. */
  yellowsCleared: boolean;
}

export interface ShopState {
  points: number;
  marked: boolean[];
}

export interface DistrictState {
  shops: ShopState[];
  /** Orange is always null. Others: circled by the first closer, crossed for the rest. */
  bonus: BonusMark | null;
}

export interface ResourceTrack {
  circled: number;
  spent: number;
}

export interface MarketMoveRecord {
  path: MarketNodeId[];
}

export interface MarketState {
  steward: MarketNodeId;
  used: MarketNodeId[];
  circled: MarketNodeId[];
  moves: MarketMoveRecord[];
  /** Cumulative flower scores in diamond order 0..2 (column uses the highest). */
  diamonds: [number | null, number | null, number | null, number | null];
  /** Permanent extra yellows from market "die" spaces, capped at 3. */
  yellowDice: number;
}

export interface ScoreSheet {
  districts: Record<GoodsDistrictId, DistrictState>;
  gold: ResourceTrack;
  goats: ResourceTrack;
  turns: { marked: number };
  buildings: Record<BuildingId, boolean>;
  mercato: MarketState;
}

export interface Player {
  id: PlayerId;
  name: string;
  sheet: ScoreSheet;
}

/** Dice already taken this turn; sheet not yet confirmed. */
export interface ActivePick {
  playerId: PlayerId;
  district: HarborDistrictId | null;
  dieCount: number;
  dieValue: DieFace;
  compensation: boolean;
}

export interface DistrictBonuses {
  blue: PlayerId | null;
  purple: PlayerId | null;
  green: PlayerId | null;
}

export interface LogEntry {
  round: number;
  playerId: PlayerId;
  district: HarborDistrictId | "compensation";
  dieCount: number;
  dieValue: DieFace | null;
}

export interface ScoreBreakdown {
  orange: number;
  blue: number;
  purple: number;
  green: number;
  gold: number;
  goats: number;
  market: number;
  temple: number;
  total: number;
}

/**
 * Authoritative committed state. UI pending edits do not live here.
 *
 * Round counter is 1..maxRounds (6, or 4 at 4 players). Printed "18/16 turns"
 * are player-picks, not this number. First player rotates every round.
 */
export interface GameState {
  version: 1;
  playerCount: PlayerCount;
  phase: Phase;
  round: number;
  maxRounds: 4 | 6;
  firstPlayerId: PlayerId;
  /** Who picks this round, in order. Length 3 at 2 players (start player twice). */
  pickQueue: PlayerId[];
  pickIndex: number;
  activePick: ActivePick | null;
  harbor: HarborState;
  districtBonuses: DistrictBonuses;
  players: Player[];
  log: LogEntry[];
  winnerIds: PlayerId[];
}

export interface MoveContext {
  playerId: PlayerId;
}

export type ApplyResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };
