import { BUILDINGS, DISTRICT_BONUS_VP } from "./constants";
import type {
  GameState,
  GoodsDistrictId,
  PlayerId,
  ScoreBreakdown,
  ScoreSheet,
} from "./types";
import { remainingResource } from "./sheet";

export function resourceVictoryPoints(count: number): number {
  return Math.floor(Math.max(0, count) / 2);
}

export function districtShopPoints(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
): number {
  return sheet.districts[districtId].shops.reduce(
    (sum, shop) => sum + (shop.marked.every(Boolean) ? shop.points : 0),
    0,
  );
}

export function districtBonusPoints(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
): number {
  if (sheet.districts[districtId].bonus !== "circled") return 0;
  return DISTRICT_BONUS_VP[districtId] ?? 0;
}

/** Last filled flower, already cumulative — do not sum diamonds. */
export function marketScore(sheet: ScoreSheet): number {
  const diamonds = sheet.mercato.diamonds;
  for (let i = diamonds.length - 1; i >= 0; i--) {
    const value = diamonds[i];
    if (value != null) return value;
  }
  return 0;
}

export function templeScore(sheet: ScoreSheet): number {
  if (!sheet.buildings.temple) return 0;
  const built = Object.values(sheet.buildings).filter(Boolean).length;
  return built * BUILDINGS.temple.vpPerBuilding;
}

export function scoreSheet(sheet: ScoreSheet): ScoreBreakdown {
  const orange =
    districtShopPoints(sheet, "orange") + districtBonusPoints(sheet, "orange");
  const blue =
    districtShopPoints(sheet, "blue") + districtBonusPoints(sheet, "blue");
  const purple =
    districtShopPoints(sheet, "purple") + districtBonusPoints(sheet, "purple");
  const green =
    districtShopPoints(sheet, "green") + districtBonusPoints(sheet, "green");
  const gold = resourceVictoryPoints(remainingResource(sheet, "gold"));
  const goats = resourceVictoryPoints(remainingResource(sheet, "goats"));
  const market = marketScore(sheet);
  const temple = templeScore(sheet);
  return {
    orange,
    blue,
    purple,
    green,
    gold,
    goats,
    market,
    temple,
    total: orange + blue + purple + green + gold + goats + market + temple,
  };
}

export function winners(state: GameState): PlayerId[] {
  const rows = state.players.map((p) => ({
    id: p.id,
    total: scoreSheet(p.sheet).total,
    gold: remainingResource(p.sheet, "gold"),
  }));
  const bestTotal = Math.max(...rows.map((r) => r.total));
  const byScore = rows.filter((r) => r.total === bestTotal);
  const bestGold = Math.max(...byScore.map((r) => r.gold));
  return byScore.filter((r) => r.gold === bestGold).map((r) => r.id);
}
