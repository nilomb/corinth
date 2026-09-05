import {
  BUILDING_IDS,
  MARKET_ORIGIN,
  SHOPS,
  STARTING_GOATS,
  STARTING_GOLD,
  maxRoundsFor,
  preMarkedTurns,
} from "./constants";
import type {
  BuildingId,
  GameState,
  GoodsDistrictId,
  HarborState,
  MarketState,
  Player,
  PlayerCount,
  PlayerId,
  ScoreSheet,
} from "./types";

export function playerId(n: number): PlayerId {
  if (n !== 0 && n !== 1 && n !== 2 && n !== 3) {
    throw new Error(`Invalid player id ${n}`);
  }
  return n;
}

/** 2 players: start player picks twice (P, Q, P). 3–4: clockwise from first. */
export function pickQueueForRound(
  playerCount: PlayerCount,
  first: PlayerId,
): PlayerId[] {
  if (playerCount === 2) {
    const second = playerId(1 - first);
    return [first, second, first];
  }
  return Array.from({ length: playerCount }, (_, i) =>
    playerId((first + i) % playerCount),
  );
}

export function emptyHarbor(): HarborState {
  return { dice: [], groups: {}, taken: [], yellowsCleared: false };
}

export function emptyMarket(): MarketState {
  return {
    steward: MARKET_ORIGIN,
    used: [],
    circled: [],
    moves: [],
    diamonds: [null, null, null, null],
    yellowDice: 0,
  };
}

export function emptySheet(playerCount: PlayerCount): ScoreSheet {
  const districts = {} as ScoreSheet["districts"];
  (Object.keys(SHOPS) as GoodsDistrictId[]).forEach((id) => {
    districts[id] = {
      shops: SHOPS[id].map((shop) => ({
        points: shop.points,
        marked: Array.from({ length: shop.symbols }, () => false),
      })),
      bonus: null,
    };
  });
  const buildings = {} as Record<BuildingId, boolean>;
  BUILDING_IDS.forEach((id) => {
    buildings[id] = false;
  });
  return {
    districts,
    gold: { circled: STARTING_GOLD, spent: 0 },
    goats: { circled: STARTING_GOATS, spent: 0 },
    turns: { marked: preMarkedTurns(playerCount) },
    buildings,
    mercato: emptyMarket(),
  };
}

export function createInitialState(
  playerCount: PlayerCount,
  names?: string[],
): GameState {
  const firstPlayerId = playerId(0);
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => {
    const id = playerId(i);
    return {
      id,
      name: names?.[i] ?? `Giocatore ${i + 1}`,
      sheet: emptySheet(playerCount),
    };
  });
  return {
    version: 1,
    playerCount,
    phase: "supply",
    round: 1,
    maxRounds: maxRoundsFor(playerCount),
    firstPlayerId,
    pickQueue: pickQueueForRound(playerCount, firstPlayerId),
    pickIndex: 0,
    activePick: null,
    harbor: emptyHarbor(),
    districtBonuses: { blue: null, purple: null, green: null },
    players,
    log: [],
    winnerIds: [],
  };
}
