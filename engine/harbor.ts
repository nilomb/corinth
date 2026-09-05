import { GOODS_HARBOR, HARBOR_ORDER } from "./constants";
import type {
  Die,
  DieFace,
  HarborDistrictId,
  HarborState,
  ScoreSheet,
} from "./types";
import { goodsQuota, goldGain, goatGain } from "./sheet";
import { marketActionPossible } from "./market";

export function isDieFace(n: number): n is DieFace {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6;
}

/** Highest distinct value → Gold, lowest → Goats, remaining values low→high up the goods rows. */
export function sortDiceToHarbor(dice: Die[]): HarborState {
  const distinct = [...new Set(dice.map((d) => d.face))].sort((a, b) => a - b);
  const valueToDistrict = new Map<DieFace, HarborDistrictId>();
  if (distinct.length === 0) {
    return { dice: dice.map((d) => ({ ...d, district: null })), groups: {}, taken: [], yellowsCleared: false };
  }
  const lo = distinct[0]!;
  const hi = distinct[distinct.length - 1]!;
  if (lo === hi) {
    valueToDistrict.set(lo, "Gold");
  } else {
    valueToDistrict.set(lo, "Goats");
    valueToDistrict.set(hi, "Gold");
    distinct
      .filter((v) => v !== lo && v !== hi)
      .forEach((v, i) => {
        const district = GOODS_HARBOR[i];
        if (district) valueToDistrict.set(v, district);
      });
  }
  const groups: HarborState["groups"] = {};
  const assigned = dice.map((die) => {
    const district = valueToDistrict.get(die.face) ?? null;
    if (district) {
      const list = groups[district] ?? [];
      list.push(die.id);
      groups[district] = list;
    }
    return { ...die, district };
  });
  return { dice: assigned, groups, taken: [], yellowsCleared: false };
}

export function remainingDistricts(harbor: HarborState): HarborDistrictId[] {
  return HARBOR_ORDER.filter((d) => (harbor.groups[d]?.length ?? 0) > 0);
}

export function groupInfo(
  harbor: HarborState,
  district: HarborDistrictId,
): { ids: string[]; count: number; face: DieFace } | null {
  const ids = harbor.groups[district];
  if (!ids || ids.length === 0) return null;
  const die = harbor.dice.find((d) => d.id === ids[0]);
  if (!die) return null;
  return { ids, count: ids.length, face: die.face };
}

export function quantityPossible(
  sheet: ScoreSheet,
  district: HarborDistrictId,
  dieCount: number,
): boolean {
  if (district === "Gold") return goldGain(sheet, dieCount) > 0;
  if (district === "Goats") return goatGain(sheet, dieCount) > 0;
  if (district === "Oil" || district === "Wine" || district === "Carpets" || district === "Spices") {
    return goodsQuota(sheet, district, dieCount) > 0;
  }
  return false;
}

export function groupUsable(
  sheet: ScoreSheet,
  district: HarborDistrictId,
  dieCount: number,
  face: DieFace,
): boolean {
  return quantityPossible(sheet, district, dieCount) || marketActionPossible(sheet, face);
}

export function usableDistricts(
  harbor: HarborState,
  sheet: ScoreSheet,
): HarborDistrictId[] {
  return remainingDistricts(harbor).filter((d) => {
    const info = groupInfo(harbor, d);
    return info ? groupUsable(sheet, d, info.count, info.face) : false;
  });
}

export function clearYellowDice(harbor: HarborState): void {
  const yellowIds = new Set(
    harbor.dice.filter((d) => d.color === "yellow").map((d) => d.id),
  );
  for (const key of HARBOR_ORDER) {
    const ids = (harbor.groups[key] ?? []).filter((id) => !yellowIds.has(id));
    if (ids.length === 0) delete harbor.groups[key];
    else harbor.groups[key] = ids;
  }
  harbor.yellowsCleared = true;
}
