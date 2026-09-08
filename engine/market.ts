import {
  BUILDINGS,
  GOAT_TRACK,
  GOLD_TRACK,
  MARKET_DIRS,
  MARKET_GRID,
  MAX_YELLOW_DICE,
} from "./constants";
import type { MarketNodeId, ScoreSheet } from "./types";
import { remainingResource } from "./sheet";

export interface MarketNode {
  id: MarketNodeId;
  row: number;
  col: number;
  effect: (typeof MARKET_GRID)[number][number];
}

export function marketId(row: number, col: number): MarketNodeId | null {
  if (row < 0 || row > 4 || col < 0 || col > 4) return null;
  return `r${row}c${col}` as MarketNodeId;
}

export function parseMarketId(
  id: string,
): { row: number; col: number } | null {
  const m = /^r([0-4])c([0-4])$/.exec(id);
  if (!m) return null;
  return { row: Number(m[1]), col: Number(m[2]) };
}

export function getMarketNode(id: string): MarketNode | null {
  const parsed = parseMarketId(id);
  if (!parsed) return null;
  const effect = MARKET_GRID[parsed.row]?.[parsed.col];
  if (!effect) return null;
  return { id: id as MarketNodeId, row: parsed.row, col: parsed.col, effect };
}

export function marketUsedSet(sheet: ScoreSheet): Set<string> {
  const used = new Set<string>();
  const m = sheet.mercato;
  m.used.forEach((id) => used.add(id));
  m.moves.forEach((move) => {
    move.path.forEach((id) => used.add(id));
  });
  return used;
}

export function hasMarketStable(sheet: ScoreSheet): boolean {
  return sheet.buildings.stable;
}

/** Stalla: ±1 or ±2 steps free; extra gold extends that further. */
export function marketFreeSteps(hasStable: boolean): number {
  return hasStable ? BUILDINGS.stable.freeStepMod : 0;
}

export function marketGoldCost(
  diceValue: number,
  steps: number,
  hasStable: boolean,
): number {
  const need = Math.abs(steps - diceValue);
  return Math.max(0, need - marketFreeSteps(hasStable));
}

export function marketStepRange(
  sheet: ScoreSheet,
  diceValue: number,
): { min: number; max: number } {
  const extra =
    remainingResource(sheet, "gold") + marketFreeSteps(hasMarketStable(sheet));
  return {
    min: Math.max(1, diceValue - extra),
    max: diceValue + extra,
  };
}

export function findMarketDestinations(
  startId: MarketNodeId,
  steps: number,
  usedSet: Set<string>,
): Map<MarketNodeId, MarketNodeId[][]> {
  const dests = new Map<MarketNodeId, MarketNodeId[][]>();
  const start = getMarketNode(startId);
  if (!start || steps < 1) return dests;
  const walk = (
    row: number,
    col: number,
    left: number,
    pathSet: Set<string>,
    path: MarketNodeId[],
  ) => {
    if (left === 0) {
      const id = path[path.length - 1];
      if (!id || id === startId) return;
      const list = dests.get(id) ?? [];
      list.push(path.slice());
      dests.set(id, list);
      return;
    }
    for (const [dr, dc] of MARKET_DIRS) {
      const nr = row + dr;
      const nc = col + dc;
      const id = marketId(nr, nc);
      if (!id) continue;
      if (pathSet.has(id)) continue;
      if (id !== startId && usedSet.has(id)) continue;
      pathSet.add(id);
      path.push(id);
      walk(nr, nc, left - 1, pathSet, path);
      path.pop();
      pathSet.delete(id);
    }
  };
  walk(start.row, start.col, steps, new Set([startId]), [startId]);
  return dests;
}

export function marketActionPossible(
  sheet: ScoreSheet,
  diceValue: number,
): boolean {
  const start = sheet.mercato.steward;
  const used = marketUsedSet(sheet);
  const range = marketStepRange(sheet, diceValue);
  for (let steps = range.min; steps <= range.max; steps++) {
    if (findMarketDestinations(start, steps, used).size > 0) return true;
  }
  return false;
}

export function canStepOnce(sheet: ScoreSheet): boolean {
  const start = sheet.mercato.steward;
  return findMarketDestinations(start, 1, marketUsedSet(sheet)).size > 0;
}

function previousMarketScoreInfo(sheet: ScoreSheet): {
  moveIndex: number;
  diamond: 0 | 1 | 2 | 3;
  value: number;
} | null {
  const moves = sheet.mercato.moves;
  for (let i = moves.length - 1; i >= 0; i--) {
    const path = moves[i]?.path ?? [];
    const dest = path[path.length - 1];
    const node = dest ? getMarketNode(dest) : null;
    if (node && node.effect.t === "score") {
      const value = sheet.mercato.diamonds[node.effect.d];
      return {
        moveIndex: i,
        diamond: node.effect.d,
        value: Number(value) || 0,
      };
    }
  }
  return null;
}

export function computeMarketFlowerScore(
  sheet: ScoreSheet,
  destId: MarketNodeId,
): number {
  const circled = sheet.mercato.circled.concat([destId]);
  const plusCount = (ids: string[]) =>
    ids.reduce((n, id) => {
      const node = getMarketNode(id);
      return n + (node && node.effect.t === "plus" ? 1 : 0);
    }, 0);
  const prev = previousMarketScoreInfo(sheet);
  if (!prev) return circled.length + plusCount(circled);
  const newer: MarketNodeId[] = [];
  for (let i = prev.moveIndex + 1; i < sheet.mercato.moves.length; i++) {
    const path = sheet.mercato.moves[i]?.path ?? [];
    const dest = path[path.length - 1];
    if (dest) newer.push(dest);
  }
  newer.push(destId);
  return prev.value + newer.length + plusCount(newer);
}

export function applyMarketDestinationEffect(
  sheet: ScoreSheet,
  destId: MarketNodeId,
): void {
  const node = getMarketNode(destId);
  if (!node) return;
  const e = node.effect;
  // Goods are placed manually by the player (shopMarks on the market action).
  if (e.t === "gold") {
    const room = GOLD_TRACK - sheet.gold.circled;
    sheet.gold.circled += Math.min(e.qty, Math.max(0, room));
  } else if (e.t === "goats") {
    const room = GOAT_TRACK - sheet.goats.circled;
    sheet.goats.circled += Math.min(e.qty, Math.max(0, room));
  } else if (e.t === "die") {
    sheet.mercato.yellowDice = Math.min(
      MAX_YELLOW_DICE,
      sheet.mercato.yellowDice + 1,
    );
  } else if (e.t === "score") {
    sheet.mercato.diamonds[e.d] = computeMarketFlowerScore(sheet, destId);
  }
}

export function isOrthogonalPath(
  path: MarketNodeId[],
  start: MarketNodeId,
  used: Set<string>,
): string | null {
  if (path.length < 2) return "path must have at least two cells";
  if (path[0] !== start) return "path must start at the steward";
  const seen = new Set<string>([path[0]]);
  for (let i = 1; i < path.length; i++) {
    const prev = getMarketNode(path[i - 1]!);
    const cur = getMarketNode(path[i]!);
    if (!prev || !cur) return "invalid market cell";
    if (Math.abs(prev.row - cur.row) + Math.abs(prev.col - cur.col) !== 1) {
      return "path must move orthogonally";
    }
    if (seen.has(cur.id)) return "path cannot reuse a cell";
    if (cur.id !== start && used.has(cur.id)) return "path hits a used cell";
    seen.add(cur.id);
  }
  if (path[path.length - 1] === start) return "cannot end on the start cell";
  return null;
}

export function commitMarketPath(
  sheet: ScoreSheet,
  path: MarketNodeId[],
  goldCost: number,
): void {
  const destId = path[path.length - 1]!;
  if (goldCost) sheet.gold.spent += goldCost;
  applyMarketDestinationEffect(sheet, destId);
  sheet.mercato.moves.push({ path: path.slice() });
  sheet.mercato.circled.push(destId);
  sheet.mercato.steward = destId;
  sheet.mercato.used = Array.from(marketUsedSet(sheet)) as MarketNodeId[];
}
