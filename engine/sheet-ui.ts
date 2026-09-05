import { BUILDING_IDS } from "./constants";
import type { BuildingId, ScoreSheet } from "./types";

/** UI digital state uses a boolean[] aligned with SCORECARD_SHEET_LAYOUT.buildings. */
export function engineSheetToUi(sheet: ScoreSheet) {
  return {
    version: 1 as const,
    districts: structuredClone(sheet.districts),
    gold: { circled: sheet.gold.circled, spent: sheet.gold.spent },
    goats: { circled: sheet.goats.circled, spent: sheet.goats.spent },
    turns: { marked: sheet.turns.marked },
    buildings: BUILDING_IDS.map((id) => sheet.buildings[id]),
    mercato: structuredClone(sheet.mercato),
    edifici: { mode: "structured" as const },
  };
}

export function buildingIndexesToIds(indexes: number[]): BuildingId[] {
  const ids: BuildingId[] = [];
  for (const index of indexes) {
    const id = BUILDING_IDS[index];
    if (id) ids.push(id);
  }
  return ids;
}
