import {
  BUILDINGS,
  DISTRICT_BONUS_VP,
  GOAT_TRACK,
  GOLD_TRACK,
  HARBOR_TO_SHEET,
} from "./constants";
import type {
  BuildingId,
  GameState,
  GoodsDistrictId,
  HarborDistrictId,
  PlayerId,
  ScoreSheet,
} from "./types";
import type { ShopMark } from "./moves";

export function remainingResource(
  sheet: ScoreSheet,
  key: "gold" | "goats",
): number {
  const track = sheet[key];
  return Math.max(0, track.circled - track.spent);
}

export function goldGain(sheet: ScoreSheet, dieCount: number): number {
  const extra = sheet.buildings.store ? BUILDINGS.store.extraGold : 0;
  const room = GOLD_TRACK - sheet.gold.circled;
  return Math.min(dieCount + extra, Math.max(0, room));
}

export function goatGain(sheet: ScoreSheet, dieCount: number): number {
  const room = GOAT_TRACK - sheet.goats.circled;
  return Math.min(dieCount, Math.max(0, room));
}

export function sheetDistrictFor(
  district: HarborDistrictId,
): GoodsDistrictId | null {
  if (district === "Gold" || district === "Goats") return null;
  return HARBOR_TO_SHEET[district];
}

export function remainingUnmarked(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
): number {
  return sheet.districts[districtId].shops.reduce(
    (n, shop) => n + shop.marked.filter((m) => !m).length,
    0,
  );
}

export function goodsQuota(
  sheet: ScoreSheet,
  harborDistrict: HarborDistrictId,
  dieCount: number,
): number {
  const districtId = sheetDistrictFor(harborDistrict);
  if (!districtId) return 0;
  // Buildings apply only after they are owned (built at end of a prior turn).
  const extra = sheet.buildings.warehouse ? BUILDINGS.warehouse.extraGood : 0;
  return Math.min(dieCount + extra, remainingUnmarked(sheet, districtId));
}

export function shopIsComplete(marked: boolean[]): boolean {
  return marked.every(Boolean);
}

export function shopIsEmpty(marked: boolean[]): boolean {
  return marked.every((v) => !v);
}

export function shopIsStarted(marked: boolean[]): boolean {
  return !shopIsEmpty(marked) && !shopIsComplete(marked);
}

export function getIncompleteShopIndex(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
): number {
  return sheet.districts[districtId].shops.findIndex((s) =>
    shopIsStarted(s.marked),
  );
}

export function canPlaceOnShop(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
  shopIndex: number,
): boolean {
  const shop = sheet.districts[districtId].shops[shopIndex];
  if (!shop || shopIsComplete(shop.marked)) return false;
  const incomplete = getIncompleteShopIndex(sheet, districtId);
  if (incomplete >= 0) return incomplete === shopIndex;
  return true;
}

export function isDistrictComplete(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
): boolean {
  return sheet.districts[districtId].shops.every((s) =>
    shopIsComplete(s.marked),
  );
}

export function autoMarkDistrictGoods(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
  qty: number,
): void {
  let left = qty;
  while (left > 0) {
    const incomplete = getIncompleteShopIndex(sheet, districtId);
    const shopIndex =
      incomplete >= 0
        ? incomplete
        : sheet.districts[districtId].shops.findIndex(
            (s) => !shopIsComplete(s.marked),
          );
    if (shopIndex < 0) break;
    const marked = sheet.districts[districtId].shops[shopIndex].marked;
    let progressed = false;
    for (let i = 0; i < marked.length && left > 0; i++) {
      if (!marked[i]) {
        marked[i] = true;
        left -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
}

export function applyShopMarks(
  sheet: ScoreSheet,
  districtId: GoodsDistrictId,
  marks: ShopMark[],
  quota: number,
): string | null {
  if (marks.length !== quota) {
    return `expected ${quota} shop marks, got ${marks.length}`;
  }
  const seen = new Set<string>();
  for (const mark of marks) {
    if (mark.district !== districtId) {
      return `mark district ${mark.district} does not match ${districtId}`;
    }
    const key = `${mark.shopIndex}:${mark.symbolIndex}`;
    if (seen.has(key)) return "duplicate shop mark";
    seen.add(key);
    const shop = sheet.districts[districtId].shops[mark.shopIndex];
    if (!shop) return "invalid shop index";
    if (mark.symbolIndex < 0 || mark.symbolIndex >= shop.marked.length) {
      return "invalid symbol index";
    }
    if (shop.marked[mark.symbolIndex]) return "symbol already marked";
    if (!canPlaceOnShop(sheet, districtId, mark.shopIndex)) {
      return "must finish the open shop before starting another";
    }
    shop.marked[mark.symbolIndex] = true;
  }
  return null;
}

export function maybeClaimDistrictBonus(
  state: GameState,
  playerId: PlayerId,
  districtId: GoodsDistrictId,
): void {
  if (districtId === "orange") return;
  const vp = DISTRICT_BONUS_VP[districtId];
  if (vp == null) return;
  const sheet = state.players.find((p) => p.id === playerId)?.sheet;
  if (!sheet || !isDistrictComplete(sheet, districtId)) return;
  const claimed = state.districtBonuses[districtId];
  if (claimed != null) return;
  state.districtBonuses[districtId] = playerId;
  for (const player of state.players) {
    player.sheet.districts[districtId].bonus =
      player.id === playerId ? "circled" : "crossed";
  }
}

export function canAffordBuilding(
  sheet: ScoreSheet,
  building: BuildingId,
): boolean {
  if (sheet.buildings[building]) return false;
  const cost = BUILDINGS[building];
  return (
    remainingResource(sheet, "gold") >= cost.gold &&
    remainingResource(sheet, "goats") >= cost.goats
  );
}

export function applyBuilding(sheet: ScoreSheet, building: BuildingId): string | null {
  if (sheet.buildings[building]) return `${building} already built`;
  const cost = BUILDINGS[building];
  if (!canAffordBuilding(sheet, building)) {
    return `cannot afford ${building}`;
  }
  sheet.buildings[building] = true;
  sheet.gold.spent += cost.gold;
  sheet.goats.spent += cost.goats;
  return null;
}
