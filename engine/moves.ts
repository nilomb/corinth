import type {
  BuildingId,
  DieColor,
  DieFace,
  GoodsDistrictId,
  HarborDistrictId,
  MarketNodeId,
  PlayerCount,
  PlayerId,
} from "./types";

/**
 * Committed commands. The UI may keep a local pending draft; only these
 * enter the engine. RNG lives outside: the adapter (hot-seat or server)
 * supplies `dice` on `roll`.
 */
export type Move =
  | StartGameMove
  | RollMove
  | PickDistrictMove
  | TakeCompensationMove
  | CompleteTurnMove;

export interface StartGameMove {
  type: "startGame";
  playerCount: PlayerCount;
  names?: string[];
}

export interface RolledDie {
  color: DieColor;
  face: DieFace;
}

/**
 * First player of the round. `purchasedYellow` is extra dice bought with gold
 * this round (not counting yellows already owned from the market). Total
 * yellows rolled = min(3, owned + purchased). Gold cost = purchased.
 * `dice` must be 9 white + that many yellow, already faced.
 */
export interface RollMove {
  type: "roll";
  purchasedYellow: 0 | 1 | 2 | 3;
  dice: RolledDie[];
}

export interface PickDistrictMove {
  type: "pickDistrict";
  district: HarborDistrictId;
}

/** No legal group left (or fewer groups than remaining pickers). 1 market step. */
export interface TakeCompensationMove {
  type: "takeCompensation";
}

export interface CompleteTurnMove {
  type: "completeTurn";
  action: TurnAction;
  /** Newly built this turn, after the main action. Order = spend order. */
  buildings: BuildingId[];
}

export type TurnAction =
  | QuantityAction
  | MarketAction
  | CompensationAction
  | PassAction;

/** District's native action: gold / goats / deliver goods. */
export interface QuantityAction {
  kind: "quantity";
  /**
   * Required for a goods district. New marks only; count must equal the
   * quota (dice in the group, +1 if warehouse already owned — capped by
   * remaining symbols). Buildings are paid after the action, so a warehouse
   * bought this turn does not affect this quota.
   * Must finish the open shop before starting another in the same district.
   * Gold/goats: omit; engine circles `dieCount` (+2 gold if store already owned).
   */
  shopMarks?: ShopMark[];
}

export interface ShopMark {
  district: GoodsDistrictId;
  shopIndex: number;
  symbolIndex: number;
}

/**
 * Use the group's face value as steward steps. `extraGold` is gold spent to
 * modify distance after the stable's free ±1 or ±2. Path starts at the current
 * steward and does not reuse used cells.
 */
export interface MarketAction {
  kind: "market";
  path: MarketNodeId[];
  extraGold: number;
  /** Required when the destination is a goods cell; count must match the cell qty (capped by room). */
  shopMarks?: ShopMark[];
}

export interface CompensationAction {
  kind: "compensation";
  path: MarketNodeId[];
  /** Required when the destination is a goods cell. */
  shopMarks?: ShopMark[];
}

/** Decline the optional 1-step market move on a compensation turn. */
export interface PassAction {
  kind: "pass";
}

/**
 * Client-only. Never sent on the wire; `completeTurn` is the commit.
 * Mirrors the current scorecard pending / choice UI.
 */
export type PendingAction =
  | { type: "choice" }
  | { type: "gold"; qty: number }
  | { type: "goats"; qty: number }
  | {
      type: "shop-turn";
      district: GoodsDistrictId;
      shops: boolean[][];
      quota: number;
    }
  | {
      type: "market-move";
      steps: number;
      goldCost: number;
      dests: Array<{ id: MarketNodeId; paths: MarketNodeId[][] }>;
      selectedId: MarketNodeId | null;
      selectedPath: MarketNodeId[] | null;
    };

export const MOVE_PHASE: Record<
  Exclude<Move["type"], "startGame">,
  ReadonlyArray<"supply" | "draft" | "action" | "over">
> = {
  roll: ["supply"],
  pickDistrict: ["draft"],
  takeCompensation: ["draft"],
  completeTurn: ["action"],
};

export function currentPicker(queue: PlayerId[], pickIndex: number): PlayerId {
  const id = queue[pickIndex];
  if (id === undefined) {
    throw new Error(`pickIndex ${pickIndex} is outside the pick queue`);
  }
  return id;
}
