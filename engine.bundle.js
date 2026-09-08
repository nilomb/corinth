// engine/constants.ts
var HARBOR_ORDER = [
  "Goats",
  "Oil",
  "Wine",
  "Carpets",
  "Spices",
  "Gold"
];
var GOODS_HARBOR = [
  "Oil",
  "Wine",
  "Carpets",
  "Spices"
];
var SHEET_DISTRICTS = [
  "orange",
  "blue",
  "purple",
  "green"
];
var BUILDING_IDS = [
  "temple",
  "warehouse",
  "stable",
  "store"
];
var HARBOR_TO_SHEET = {
  Spices: "orange",
  Carpets: "blue",
  Wine: "purple",
  Oil: "green"
};
var SHEET_TO_HARBOR = {
  orange: "Spices",
  blue: "Carpets",
  purple: "Wine",
  green: "Oil"
};
var WHITE_DICE = 9;
var MAX_YELLOW_DICE = 3;
var GOLD_TRACK = 24;
var GOAT_TRACK = 24;
var STARTING_GOLD = 1;
var STARTING_GOATS = 1;
var TURN_SLOTS = 6;
function maxRoundsFor(playerCount) {
  return playerCount === 4 ? 4 : 6;
}
function preMarkedTurns(playerCount) {
  return playerCount === 4 ? 2 : 0;
}
var BUILDINGS = {
  temple: { gold: 3, goats: 3, vpPerBuilding: 3 },
  warehouse: { gold: 4, goats: 4, extraGood: 1 },
  stable: { gold: 2, goats: 1, freeStepMod: 2 },
  store: { gold: 0, goats: 2, extraGold: 2 }
};
var DISTRICT_BONUS_VP = {
  orange: null,
  blue: 3,
  purple: 4,
  green: 5
};
var SHOPS = {
  orange: [
    { points: 4, symbols: 2 },
    { points: 5, symbols: 2 },
    { points: 10, symbols: 4 }
  ],
  blue: [
    { points: 3, symbols: 2 },
    { points: 5, symbols: 3 },
    { points: 8, symbols: 4 }
  ],
  purple: [
    { points: 2, symbols: 2 },
    { points: 3, symbols: 3 },
    { points: 4, symbols: 3 },
    { points: 6, symbols: 4 }
  ],
  green: [
    { points: 1, symbols: 2 },
    { points: 2, symbols: 3 },
    { points: 3, symbols: 3 },
    { points: 6, symbols: 5 }
  ]
};
var MARKET_ORIGIN = "r2c2";
var MARKET_DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0]
];
var MARKET_GRID = [
  [
    { t: "score", d: 0 },
    { t: "die" },
    { t: "goods", district: "blue", qty: 2 },
    { t: "plus" },
    { t: "score", d: 1 }
  ],
  [
    { t: "goods", district: "orange", qty: 1 },
    { t: "goods", district: "green", qty: 1 },
    { t: "goats", qty: 2 },
    { t: "die" },
    { t: "goods", district: "green", qty: 2 }
  ],
  [
    { t: "plus" },
    { t: "goods", district: "purple", qty: 1 },
    { t: "steward" },
    { t: "gold", qty: 1 },
    { t: "plus" }
  ],
  [
    { t: "goods", district: "green", qty: 2 },
    { t: "gold", qty: 2 },
    { t: "die" },
    { t: "goods", district: "purple", qty: 1 },
    { t: "goods", district: "blue", qty: 2 }
  ],
  [
    { t: "score", d: 2 },
    { t: "goats", qty: 1 },
    { t: "plus" },
    { t: "goats", qty: 2 },
    { t: "goods", district: "orange", qty: 1 }
  ]
];

// engine/moves.ts
var MOVE_PHASE = {
  roll: ["supply"],
  pickDistrict: ["draft"],
  takeCompensation: ["draft"],
  completeTurn: ["action"]
};
function currentPicker(queue, pickIndex) {
  const id = queue[pickIndex];
  if (id === void 0) {
    throw new Error(`pickIndex ${pickIndex} is outside the pick queue`);
  }
  return id;
}

// engine/state.ts
function playerId(n) {
  if (n !== 0 && n !== 1 && n !== 2 && n !== 3) {
    throw new Error(`Invalid player id ${n}`);
  }
  return n;
}
function pickQueueForRound(playerCount, first) {
  if (playerCount === 2) {
    const second = playerId(1 - first);
    return [first, second, first];
  }
  return Array.from(
    { length: playerCount },
    (_, i) => playerId((first + i) % playerCount)
  );
}
function emptyHarbor() {
  return { dice: [], groups: {}, taken: [], yellowsCleared: false };
}
function emptyMarket() {
  return {
    steward: MARKET_ORIGIN,
    used: [],
    circled: [],
    moves: [],
    diamonds: [null, null, null, null],
    yellowDice: 0
  };
}
function emptySheet(playerCount) {
  const districts = {};
  Object.keys(SHOPS).forEach((id) => {
    districts[id] = {
      shops: SHOPS[id].map((shop) => ({
        points: shop.points,
        marked: Array.from({ length: shop.symbols }, () => false)
      })),
      bonus: null
    };
  });
  const buildings = {};
  BUILDING_IDS.forEach((id) => {
    buildings[id] = false;
  });
  return {
    districts,
    gold: { circled: STARTING_GOLD, spent: 0 },
    goats: { circled: STARTING_GOATS, spent: 0 },
    turns: { marked: preMarkedTurns(playerCount) },
    buildings,
    mercato: emptyMarket()
  };
}
function createInitialState(playerCount, names) {
  const firstPlayerId = playerId(0);
  const players = Array.from({ length: playerCount }, (_, i) => {
    const id = playerId(i);
    return {
      id,
      name: names?.[i] ?? `Giocatore ${i + 1}`,
      sheet: emptySheet(playerCount)
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
    winnerIds: []
  };
}

// engine/sheet.ts
function remainingResource(sheet, key) {
  const track = sheet[key];
  return Math.max(0, track.circled - track.spent);
}
function goldGain(sheet, dieCount) {
  const extra = sheet.buildings.store ? BUILDINGS.store.extraGold : 0;
  const room = GOLD_TRACK - sheet.gold.circled;
  return Math.min(dieCount + extra, Math.max(0, room));
}
function goatGain(sheet, dieCount) {
  const room = GOAT_TRACK - sheet.goats.circled;
  return Math.min(dieCount, Math.max(0, room));
}
function sheetDistrictFor(district) {
  if (district === "Gold" || district === "Goats") return null;
  return HARBOR_TO_SHEET[district];
}
function remainingUnmarked(sheet, districtId) {
  return sheet.districts[districtId].shops.reduce(
    (n, shop) => n + shop.marked.filter((m) => !m).length,
    0
  );
}
function goodsQuota(sheet, harborDistrict, dieCount, upcomingBuildings = []) {
  const districtId = sheetDistrictFor(harborDistrict);
  if (!districtId) return 0;
  const warehouse = sheet.buildings.warehouse || upcomingBuildings.includes("warehouse");
  const extra = warehouse ? BUILDINGS.warehouse.extraGood : 0;
  return Math.min(dieCount + extra, remainingUnmarked(sheet, districtId));
}
function shopIsComplete(marked) {
  return marked.every(Boolean);
}
function shopIsEmpty(marked) {
  return marked.every((v) => !v);
}
function shopIsStarted(marked) {
  return !shopIsEmpty(marked) && !shopIsComplete(marked);
}
function getIncompleteShopIndex(sheet, districtId) {
  return sheet.districts[districtId].shops.findIndex(
    (s) => shopIsStarted(s.marked)
  );
}
function canPlaceOnShop(sheet, districtId, shopIndex) {
  const shop = sheet.districts[districtId].shops[shopIndex];
  if (!shop || shopIsComplete(shop.marked)) return false;
  const incomplete = getIncompleteShopIndex(sheet, districtId);
  if (incomplete >= 0) return incomplete === shopIndex;
  return true;
}
function isDistrictComplete(sheet, districtId) {
  return sheet.districts[districtId].shops.every(
    (s) => shopIsComplete(s.marked)
  );
}
function autoMarkDistrictGoods(sheet, districtId, qty) {
  let left = qty;
  while (left > 0) {
    const incomplete = getIncompleteShopIndex(sheet, districtId);
    const shopIndex = incomplete >= 0 ? incomplete : sheet.districts[districtId].shops.findIndex(
      (s) => !shopIsComplete(s.marked)
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
function applyShopMarks(sheet, districtId, marks, quota) {
  if (marks.length !== quota) {
    return `expected ${quota} shop marks, got ${marks.length}`;
  }
  const seen = /* @__PURE__ */ new Set();
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
function maybeClaimDistrictBonus(state, playerId2, districtId) {
  if (districtId === "orange") return;
  const vp = DISTRICT_BONUS_VP[districtId];
  if (vp == null) return;
  const sheet = state.players.find((p) => p.id === playerId2)?.sheet;
  if (!sheet || !isDistrictComplete(sheet, districtId)) return;
  const claimed = state.districtBonuses[districtId];
  if (claimed != null) return;
  state.districtBonuses[districtId] = playerId2;
  for (const player of state.players) {
    player.sheet.districts[districtId].bonus = player.id === playerId2 ? "circled" : "crossed";
  }
}
function canAffordBuilding(sheet, building) {
  if (sheet.buildings[building]) return false;
  const cost = BUILDINGS[building];
  return remainingResource(sheet, "gold") >= cost.gold && remainingResource(sheet, "goats") >= cost.goats;
}
function applyBuilding(sheet, building) {
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

// engine/market.ts
function marketId(row, col) {
  if (row < 0 || row > 4 || col < 0 || col > 4) return null;
  return `r${row}c${col}`;
}
function parseMarketId(id) {
  const m = /^r([0-4])c([0-4])$/.exec(id);
  if (!m) return null;
  return { row: Number(m[1]), col: Number(m[2]) };
}
function getMarketNode(id) {
  const parsed = parseMarketId(id);
  if (!parsed) return null;
  const effect = MARKET_GRID[parsed.row]?.[parsed.col];
  if (!effect) return null;
  return { id, row: parsed.row, col: parsed.col, effect };
}
function marketUsedSet(sheet) {
  const used = /* @__PURE__ */ new Set();
  const m = sheet.mercato;
  m.used.forEach((id) => used.add(id));
  m.moves.forEach((move) => {
    move.path.forEach((id) => used.add(id));
  });
  return used;
}
function hasMarketStable(sheet) {
  return sheet.buildings.stable;
}
function marketFreeSteps(hasStable) {
  return hasStable ? BUILDINGS.stable.freeStepMod : 0;
}
function marketGoldCost(diceValue, steps, hasStable) {
  const need = Math.abs(steps - diceValue);
  return Math.max(0, need - marketFreeSteps(hasStable));
}
function marketStepRange(sheet, diceValue) {
  const extra = remainingResource(sheet, "gold") + marketFreeSteps(hasMarketStable(sheet));
  return {
    min: Math.max(1, diceValue - extra),
    max: diceValue + extra
  };
}
function findMarketDestinations(startId, steps, usedSet) {
  const dests = /* @__PURE__ */ new Map();
  const start = getMarketNode(startId);
  if (!start || steps < 1) return dests;
  const walk = (row, col, left, pathSet, path) => {
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
  walk(start.row, start.col, steps, /* @__PURE__ */ new Set([startId]), [startId]);
  return dests;
}
function marketActionPossible(sheet, diceValue) {
  const start = sheet.mercato.steward;
  const used = marketUsedSet(sheet);
  const range = marketStepRange(sheet, diceValue);
  for (let steps = range.min; steps <= range.max; steps++) {
    if (findMarketDestinations(start, steps, used).size > 0) return true;
  }
  return false;
}
function canStepOnce(sheet) {
  const start = sheet.mercato.steward;
  return findMarketDestinations(start, 1, marketUsedSet(sheet)).size > 0;
}
function previousMarketScoreInfo(sheet) {
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
        value: Number(value) || 0
      };
    }
  }
  return null;
}
function computeMarketFlowerScore(sheet, destId) {
  const circled = sheet.mercato.circled.concat([destId]);
  const plusCount = (ids) => ids.reduce((n, id) => {
    const node = getMarketNode(id);
    return n + (node && node.effect.t === "plus" ? 1 : 0);
  }, 0);
  const prev = previousMarketScoreInfo(sheet);
  if (!prev) return circled.length + plusCount(circled);
  const newer = [];
  for (let i = prev.moveIndex + 1; i < sheet.mercato.moves.length; i++) {
    const path = sheet.mercato.moves[i]?.path ?? [];
    const dest = path[path.length - 1];
    if (dest) newer.push(dest);
  }
  newer.push(destId);
  return prev.value + newer.length + plusCount(newer);
}
function applyMarketDestinationEffect(sheet, destId) {
  const node = getMarketNode(destId);
  if (!node) return;
  const e = node.effect;
  if (e.t === "gold") {
    const room = GOLD_TRACK - sheet.gold.circled;
    sheet.gold.circled += Math.min(e.qty, Math.max(0, room));
  } else if (e.t === "goats") {
    const room = GOAT_TRACK - sheet.goats.circled;
    sheet.goats.circled += Math.min(e.qty, Math.max(0, room));
  } else if (e.t === "die") {
    sheet.mercato.yellowDice = Math.min(
      MAX_YELLOW_DICE,
      sheet.mercato.yellowDice + 1
    );
  } else if (e.t === "score") {
    sheet.mercato.diamonds[e.d] = computeMarketFlowerScore(sheet, destId);
  }
}
function isOrthogonalPath(path, start, used) {
  if (path.length < 2) return "path must have at least two cells";
  if (path[0] !== start) return "path must start at the steward";
  const seen = /* @__PURE__ */ new Set([path[0]]);
  for (let i = 1; i < path.length; i++) {
    const prev = getMarketNode(path[i - 1]);
    const cur = getMarketNode(path[i]);
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
function commitMarketPath(sheet, path, goldCost) {
  const destId = path[path.length - 1];
  if (goldCost) sheet.gold.spent += goldCost;
  applyMarketDestinationEffect(sheet, destId);
  sheet.mercato.moves.push({ path: path.slice() });
  sheet.mercato.circled.push(destId);
  sheet.mercato.steward = destId;
  sheet.mercato.used = Array.from(marketUsedSet(sheet));
}

// engine/harbor.ts
function isDieFace(n) {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6;
}
function sortDiceToHarbor(dice) {
  const distinct = [...new Set(dice.map((d) => d.face))].sort((a, b) => a - b);
  const valueToDistrict = /* @__PURE__ */ new Map();
  if (distinct.length === 0) {
    return { dice: dice.map((d) => ({ ...d, district: null })), groups: {}, taken: [], yellowsCleared: false };
  }
  const lo = distinct[0];
  const hi = distinct[distinct.length - 1];
  if (lo === hi) {
    valueToDistrict.set(lo, "Gold");
  } else {
    valueToDistrict.set(lo, "Goats");
    valueToDistrict.set(hi, "Gold");
    distinct.filter((v) => v !== lo && v !== hi).forEach((v, i) => {
      const district = GOODS_HARBOR[i];
      if (district) valueToDistrict.set(v, district);
    });
  }
  const groups = {};
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
function remainingDistricts(harbor) {
  return HARBOR_ORDER.filter((d) => (harbor.groups[d]?.length ?? 0) > 0);
}
function groupInfo(harbor, district) {
  const ids = harbor.groups[district];
  if (!ids || ids.length === 0) return null;
  const die = harbor.dice.find((d) => d.id === ids[0]);
  if (!die) return null;
  return { ids, count: ids.length, face: die.face };
}
function quantityPossible(sheet, district, dieCount) {
  if (district === "Gold") return goldGain(sheet, dieCount) > 0;
  if (district === "Goats") return goatGain(sheet, dieCount) > 0;
  if (district === "Oil" || district === "Wine" || district === "Carpets" || district === "Spices") {
    return goodsQuota(sheet, district, dieCount) > 0;
  }
  return false;
}
function groupUsable(sheet, district, dieCount, face) {
  return quantityPossible(sheet, district, dieCount) || marketActionPossible(sheet, face);
}
function usableDistricts(harbor, sheet) {
  return remainingDistricts(harbor).filter((d) => {
    const info = groupInfo(harbor, d);
    return info ? groupUsable(sheet, d, info.count, info.face) : false;
  });
}
function clearYellowDice(harbor) {
  const yellowIds = new Set(
    harbor.dice.filter((d) => d.color === "yellow").map((d) => d.id)
  );
  for (const key of HARBOR_ORDER) {
    const ids = (harbor.groups[key] ?? []).filter((id) => !yellowIds.has(id));
    if (ids.length === 0) delete harbor.groups[key];
    else harbor.groups[key] = ids;
  }
  harbor.yellowsCleared = true;
}

// engine/score.ts
function resourceVictoryPoints(count) {
  return Math.floor(Math.max(0, count) / 2);
}
function districtShopPoints(sheet, districtId) {
  return sheet.districts[districtId].shops.reduce(
    (sum, shop) => sum + (shop.marked.every(Boolean) ? shop.points : 0),
    0
  );
}
function districtBonusPoints(sheet, districtId) {
  if (sheet.districts[districtId].bonus !== "circled") return 0;
  return DISTRICT_BONUS_VP[districtId] ?? 0;
}
function marketScore(sheet) {
  const diamonds = sheet.mercato.diamonds;
  let best = null;
  for (let i = 0; i < 3; i++) {
    if (diamonds[i] == null) continue;
    const v = Number(diamonds[i]) || 0;
    if (best == null || v > best) best = v;
  }
  return best == null ? 0 : best;
}
function templeScore(sheet) {
  if (!sheet.buildings.temple) return 0;
  const built = Object.values(sheet.buildings).filter(Boolean).length;
  return built * BUILDINGS.temple.vpPerBuilding;
}
function scoreSheet(sheet) {
  const orange = districtShopPoints(sheet, "orange") + districtBonusPoints(sheet, "orange");
  const blue = districtShopPoints(sheet, "blue") + districtBonusPoints(sheet, "blue");
  const purple = districtShopPoints(sheet, "purple") + districtBonusPoints(sheet, "purple");
  const green = districtShopPoints(sheet, "green") + districtBonusPoints(sheet, "green");
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
    total: orange + blue + purple + green + gold + goats + market + temple
  };
}
function winners(state) {
  const rows = state.players.map((p) => ({
    id: p.id,
    total: scoreSheet(p.sheet).total,
    gold: remainingResource(p.sheet, "gold")
  }));
  const bestTotal = Math.max(...rows.map((r) => r.total));
  const byScore = rows.filter((r) => r.total === bestTotal);
  const bestGold = Math.max(...byScore.map((r) => r.gold));
  return byScore.filter((r) => r.gold === bestGold).map((r) => r.id);
}

// engine/apply.ts
function fail(error) {
  return { ok: false, error };
}
function ok(state) {
  return { ok: true, state };
}
function cloneState(state) {
  return structuredClone(state);
}
function playerOf(state, id) {
  return state.players.find((p) => p.id === id) ?? null;
}
function refreshBonuses(state, playerId2) {
  for (const districtId of SHEET_DISTRICTS) {
    maybeClaimDistrictBonus(state, playerId2, districtId);
  }
}
function applyStartGame(move) {
  if (move.names !== void 0) {
    return ok(createInitialState(move.playerCount, move.names));
  }
  return ok(createInitialState(move.playerCount));
}
function applyRoll(state, move, ctx) {
  if (state.phase !== "supply") return fail("cannot roll now");
  if (ctx.playerId !== state.firstPlayerId) {
    return fail("only the first player can roll");
  }
  const first = playerOf(state, ctx.playerId);
  if (!first) return fail("unknown player");
  const owned = first.sheet.mercato.yellowDice;
  if (owned + move.purchasedYellow > MAX_YELLOW_DICE) {
    return fail("cannot roll more than 3 yellow dice");
  }
  if (remainingResource(first.sheet, "gold") < move.purchasedYellow) {
    return fail("not enough gold for yellow dice");
  }
  const expectedYellow = owned + move.purchasedYellow;
  const expectedTotal = WHITE_DICE + expectedYellow;
  if (move.dice.length !== expectedTotal) {
    return fail(`expected ${expectedTotal} dice`);
  }
  const white = move.dice.filter((d) => d.color === "white").length;
  const yellow = move.dice.filter((d) => d.color === "yellow").length;
  if (white !== WHITE_DICE || yellow !== expectedYellow) {
    return fail("dice colors do not match the yellow purchase");
  }
  if (move.dice.some((d) => !isDieFace(d.face))) {
    return fail("invalid die face");
  }
  first.sheet.gold.spent += move.purchasedYellow;
  for (const player of state.players) {
    if (player.sheet.turns.marked < TURN_SLOTS) player.sheet.turns.marked += 1;
  }
  let wi = 0;
  let yi = 0;
  const dice = move.dice.map((d) => ({
    id: d.color === "white" ? `w${wi++}` : `y${yi++}`,
    color: d.color,
    face: d.face,
    district: null
  }));
  state.harbor = sortDiceToHarbor(dice);
  state.phase = "draft";
  state.pickIndex = 0;
  state.activePick = null;
  return ok(state);
}
function requirePicker(state, ctx) {
  if (state.phase !== "draft") return "not a draft step";
  let picker;
  try {
    picker = currentPicker(state.pickQueue, state.pickIndex);
  } catch {
    return "invalid pick queue";
  }
  if (ctx.playerId !== picker) return "not your pick";
  return null;
}
function applyPickDistrict(state, move, ctx) {
  const err = requirePicker(state, ctx);
  if (err) return fail(err);
  const actor = playerOf(state, ctx.playerId);
  if (!actor) return fail("unknown player");
  const usable = usableDistricts(state.harbor, actor.sheet);
  if (!usable.includes(move.district)) {
    return fail("that district is not a legal pick");
  }
  const info = groupInfo(state.harbor, move.district);
  if (!info) return fail("empty district");
  delete state.harbor.groups[move.district];
  state.harbor.taken.push(move.district);
  state.activePick = {
    playerId: ctx.playerId,
    district: move.district,
    dieCount: info.count,
    dieValue: info.face,
    compensation: false
  };
  state.phase = "action";
  return ok(state);
}
function applyTakeCompensation(state, ctx) {
  const err = requirePicker(state, ctx);
  if (err) return fail(err);
  const actor = playerOf(state, ctx.playerId);
  if (!actor) return fail("unknown player");
  if (usableDistricts(state.harbor, actor.sheet).length > 0) {
    return fail("a legal district is still available");
  }
  state.activePick = {
    playerId: ctx.playerId,
    district: null,
    dieCount: 0,
    dieValue: 1,
    compensation: true
  };
  state.phase = "action";
  return ok(state);
}
function samePath(a, b) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
function applyQuantity(sheet, pick, action, upcomingBuildings) {
  if (pick.compensation || pick.district == null) {
    return "quantity action requires a district pick";
  }
  const district = pick.district;
  if (district === "Gold") {
    if (action.shopMarks !== void 0 && action.shopMarks.length > 0) {
      return "gold action does not take shop marks";
    }
    const qty = goldGain(sheet, pick.dieCount);
    if (qty <= 0) return "no room on the gold track";
    sheet.gold.circled += qty;
    return null;
  }
  if (district === "Goats") {
    if (action.shopMarks !== void 0 && action.shopMarks.length > 0) {
      return "goats action does not take shop marks";
    }
    const qty = goatGain(sheet, pick.dieCount);
    if (qty <= 0) return "no room on the goat track";
    sheet.goats.circled += qty;
    return null;
  }
  const districtId = sheetDistrictFor(district);
  if (!districtId) return "not a goods district";
  const quota = goodsQuota(sheet, district, pick.dieCount, upcomingBuildings);
  if (quota <= 0) return "no remaining goods in that district";
  if (action.shopMarks === void 0) return "shop marks required";
  return applyShopMarks(sheet, districtId, action.shopMarks, quota);
}
function applyGoodsFromMarketDestination(sheet, destId, shopMarks) {
  const node = getMarketNode(destId);
  if (!node || node.effect.t !== "goods") {
    if (shopMarks && shopMarks.length > 0) {
      return "shop marks only for goods destinations";
    }
    return null;
  }
  const need = node.effect.qty;
  const room = remainingUnmarked(sheet, node.effect.district);
  const quota = Math.min(need, room);
  if (quota <= 0) {
    if (shopMarks && shopMarks.length > 0) {
      return "no room for market goods";
    }
    return null;
  }
  if (shopMarks === void 0) return "shop marks required for market goods";
  return applyShopMarks(sheet, node.effect.district, shopMarks, quota);
}
function applyMarketAction(sheet, pick, action) {
  if (pick.compensation) return "use compensation action for a skip step";
  const pathErr = isOrthogonalPath(
    action.path,
    sheet.mercato.steward,
    marketUsedSet(sheet)
  );
  if (pathErr) return pathErr;
  const steps = action.path.length - 1;
  const cost = marketGoldCost(pick.dieValue, steps, hasMarketStable(sheet));
  if (action.extraGold !== cost) {
    return `extra gold must be ${cost}`;
  }
  if (remainingResource(sheet, "gold") < cost) return "not enough gold";
  const dests = findMarketDestinations(
    sheet.mercato.steward,
    steps,
    marketUsedSet(sheet)
  );
  const dest = action.path[action.path.length - 1];
  if (!dest) return "empty path";
  const options = dests.get(dest) ?? [];
  if (!options.some((p) => samePath(p, action.path))) {
    return "illegal market path";
  }
  commitMarketPath(sheet, action.path, cost);
  return applyGoodsFromMarketDestination(sheet, dest, action.shopMarks);
}
function applyCompensationAction(sheet, pick, action) {
  if (!pick.compensation) return "not a compensation turn";
  const pathErr = isOrthogonalPath(
    action.path,
    sheet.mercato.steward,
    marketUsedSet(sheet)
  );
  if (pathErr) return pathErr;
  if (action.path.length !== 2) return "compensation is exactly 1 step";
  const dests = findMarketDestinations(
    sheet.mercato.steward,
    1,
    marketUsedSet(sheet)
  );
  const dest = action.path[1];
  if (!dest || !(dests.get(dest) ?? []).some((p) => samePath(p, action.path))) {
    return "illegal compensation step";
  }
  commitMarketPath(sheet, action.path, 0);
  return applyGoodsFromMarketDestination(sheet, dest, action.shopMarks);
}
function applyAction(sheet, pick, action, upcomingBuildings) {
  switch (action.kind) {
    case "quantity":
      return applyQuantity(sheet, pick, action, upcomingBuildings);
    case "market":
      return applyMarketAction(sheet, pick, action);
    case "compensation":
      return applyCompensationAction(sheet, pick, action);
    case "pass":
      if (!pick.compensation) return "can only pass a compensation turn";
      return null;
  }
}
function applyCompleteTurn(state, move, ctx) {
  if (state.phase !== "action" || !state.activePick) {
    return fail("no action to complete");
  }
  const pick = state.activePick;
  if (ctx.playerId !== pick.playerId) return fail("not your action");
  const actor = playerOf(state, ctx.playerId);
  if (!actor) return fail("unknown player");
  const actionErr = applyAction(actor.sheet, pick, move.action, move.buildings);
  if (actionErr) return fail(actionErr);
  refreshBonuses(state, ctx.playerId);
  const seen = /* @__PURE__ */ new Set();
  for (const building of move.buildings) {
    if (seen.has(building)) return fail("duplicate building");
    seen.add(building);
    const buildErr = applyBuilding(actor.sheet, building);
    if (buildErr) return fail(buildErr);
  }
  state.log.push({
    round: state.round,
    playerId: ctx.playerId,
    district: pick.compensation ? "compensation" : pick.district ?? "compensation",
    dieCount: pick.dieCount,
    dieValue: pick.compensation ? null : pick.dieValue
  });
  if (pick.playerId === state.firstPlayerId && !state.harbor.yellowsCleared) {
    clearYellowDice(state.harbor);
  }
  state.activePick = null;
  state.pickIndex += 1;
  if (state.pickIndex < state.pickQueue.length) {
    state.phase = "draft";
    return ok(state);
  }
  if (state.round >= state.maxRounds) {
    state.phase = "over";
    state.winnerIds = winners(state);
    return ok(state);
  }
  state.round += 1;
  state.firstPlayerId = playerId(
    (state.firstPlayerId + 1) % state.playerCount
  );
  state.pickQueue = pickQueueForRound(state.playerCount, state.firstPlayerId);
  state.pickIndex = 0;
  state.harbor = emptyHarbor();
  state.phase = "supply";
  return ok(state);
}
function applyMove(state, move, ctx) {
  if (move.type === "startGame") return applyStartGame(move);
  if (state.phase === "over") return fail("game is over");
  const next = cloneState(state);
  switch (move.type) {
    case "roll":
      return applyRoll(next, move, ctx);
    case "pickDistrict":
      return applyPickDistrict(next, move, ctx);
    case "takeCompensation":
      return applyTakeCompensation(next, ctx);
    case "completeTurn":
      return applyCompleteTurn(next, move, ctx);
    default:
      return fail("unknown move");
  }
}
function unwrap(result) {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

// engine/sheet-ui.ts
function engineSheetToUi(sheet) {
  return {
    version: 1,
    districts: structuredClone(sheet.districts),
    gold: { circled: sheet.gold.circled, spent: sheet.gold.spent },
    goats: { circled: sheet.goats.circled, spent: sheet.goats.spent },
    turns: { marked: sheet.turns.marked },
    buildings: BUILDING_IDS.map((id) => sheet.buildings[id]),
    mercato: structuredClone(sheet.mercato),
    edifici: { mode: "structured" }
  };
}
function buildingIndexesToIds(indexes) {
  const ids = [];
  for (const index of indexes) {
    const id = BUILDING_IDS[index];
    if (id) ids.push(id);
  }
  return ids;
}
export {
  BUILDINGS,
  BUILDING_IDS,
  DISTRICT_BONUS_VP,
  GOAT_TRACK,
  GOLD_TRACK,
  GOODS_HARBOR,
  HARBOR_ORDER,
  HARBOR_TO_SHEET,
  MARKET_DIRS,
  MARKET_GRID,
  MARKET_ORIGIN,
  MAX_YELLOW_DICE,
  MOVE_PHASE,
  SHEET_DISTRICTS,
  SHEET_TO_HARBOR,
  SHOPS,
  STARTING_GOATS,
  STARTING_GOLD,
  TURN_SLOTS,
  WHITE_DICE,
  applyBuilding,
  applyMarketDestinationEffect,
  applyMove,
  applyShopMarks,
  autoMarkDistrictGoods,
  buildingIndexesToIds,
  canAffordBuilding,
  canPlaceOnShop,
  canStepOnce,
  clearYellowDice,
  commitMarketPath,
  computeMarketFlowerScore,
  createInitialState,
  currentPicker,
  districtBonusPoints,
  districtShopPoints,
  emptyHarbor,
  emptyMarket,
  emptySheet,
  engineSheetToUi,
  findMarketDestinations,
  getIncompleteShopIndex,
  getMarketNode,
  goatGain,
  goldGain,
  goodsQuota,
  groupInfo,
  groupUsable,
  hasMarketStable,
  isDieFace,
  isDistrictComplete,
  isOrthogonalPath,
  marketActionPossible,
  marketFreeSteps,
  marketGoldCost,
  marketId,
  marketScore,
  marketStepRange,
  marketUsedSet,
  maxRoundsFor,
  maybeClaimDistrictBonus,
  parseMarketId,
  pickQueueForRound,
  playerId,
  preMarkedTurns,
  quantityPossible,
  remainingDistricts,
  remainingResource,
  remainingUnmarked,
  resourceVictoryPoints,
  scoreSheet,
  sheetDistrictFor,
  shopIsComplete,
  shopIsEmpty,
  shopIsStarted,
  sortDiceToHarbor,
  templeScore,
  unwrap,
  usableDistricts,
  winners
};
