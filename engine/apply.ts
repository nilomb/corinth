import {
  MAX_YELLOW_DICE,
  SHEET_DISTRICTS,
  TURN_SLOTS,
  WHITE_DICE,
} from "./constants";
import {
  clearYellowDice,
  groupInfo,
  isDieFace,
  sortDiceToHarbor,
  usableDistricts,
} from "./harbor";
import {
  commitMarketPath,
  findMarketDestinations,
  isOrthogonalPath,
  marketGoldCost,
  marketUsedSet,
  hasMarketStable,
} from "./market";
import { currentPicker } from "./moves";
import type {
  CompensationAction,
  CompleteTurnMove,
  MarketAction,
  Move,
  PickDistrictMove,
  QuantityAction,
  RollMove,
  StartGameMove,
  TurnAction,
} from "./moves";
import { winners } from "./score";
import {
  applyBuilding,
  applyShopMarks,
  goatGain,
  goldGain,
  goodsQuota,
  maybeClaimDistrictBonus,
  remainingResource,
  sheetDistrictFor,
} from "./sheet";
import { createInitialState, emptyHarbor, pickQueueForRound, playerId } from "./state";
import type {
  ApplyResult,
  BuildingId,
  Die,
  GameState,
  MarketNodeId,
  MoveContext,
  Player,
} from "./types";

function fail(error: string): ApplyResult {
  return { ok: false, error };
}

function ok(state: GameState): ApplyResult {
  return { ok: true, state };
}

function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

function playerOf(state: GameState, id: number): Player | null {
  return state.players.find((p) => p.id === id) ?? null;
}

function refreshBonuses(state: GameState, playerId: Player["id"]): void {
  for (const districtId of SHEET_DISTRICTS) {
    maybeClaimDistrictBonus(state, playerId, districtId);
  }
}

function applyStartGame(move: StartGameMove): ApplyResult {
  if (move.names !== undefined) {
    return ok(createInitialState(move.playerCount, move.names));
  }
  return ok(createInitialState(move.playerCount));
}

function applyRoll(
  state: GameState,
  move: RollMove,
  ctx: MoveContext,
): ApplyResult {
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
  const dice: Die[] = move.dice.map((d) => ({
    id: d.color === "white" ? `w${wi++}` : `y${yi++}`,
    color: d.color,
    face: d.face,
    district: null,
  }));
  state.harbor = sortDiceToHarbor(dice);
  state.phase = "draft";
  state.pickIndex = 0;
  state.activePick = null;
  return ok(state);
}

function requirePicker(state: GameState, ctx: MoveContext): string | null {
  if (state.phase !== "draft") return "not a draft step";
  let picker: ReturnType<typeof currentPicker>;
  try {
    picker = currentPicker(state.pickQueue, state.pickIndex);
  } catch {
    return "invalid pick queue";
  }
  if (ctx.playerId !== picker) return "not your pick";
  return null;
}

function applyPickDistrict(
  state: GameState,
  move: PickDistrictMove,
  ctx: MoveContext,
): ApplyResult {
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
    compensation: false,
  };
  state.phase = "action";
  return ok(state);
}

function applyTakeCompensation(
  state: GameState,
  ctx: MoveContext,
): ApplyResult {
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
    compensation: true,
  };
  state.phase = "action";
  return ok(state);
}

function samePath(a: MarketNodeId[], b: MarketNodeId[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function applyQuantity(
  sheet: Player["sheet"],
  pick: NonNullable<GameState["activePick"]>,
  action: QuantityAction,
  upcomingBuildings: BuildingId[],
): string | null {
  if (pick.compensation || pick.district == null) {
    return "quantity action requires a district pick";
  }
  const district = pick.district;
  if (district === "Gold") {
    if (action.shopMarks !== undefined && action.shopMarks.length > 0) {
      return "gold action does not take shop marks";
    }
    const qty = goldGain(sheet, pick.dieCount);
    if (qty <= 0) return "no room on the gold track";
    sheet.gold.circled += qty;
    return null;
  }
  if (district === "Goats") {
    if (action.shopMarks !== undefined && action.shopMarks.length > 0) {
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
  if (action.shopMarks === undefined) return "shop marks required";
  return applyShopMarks(sheet, districtId, action.shopMarks, quota);
}

function applyMarketAction(
  sheet: Player["sheet"],
  pick: NonNullable<GameState["activePick"]>,
  action: MarketAction,
): string | null {
  if (pick.compensation) return "use compensation action for a skip step";
  const pathErr = isOrthogonalPath(
    action.path,
    sheet.mercato.steward,
    marketUsedSet(sheet),
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
    marketUsedSet(sheet),
  );
  const dest = action.path[action.path.length - 1];
  if (!dest) return "empty path";
  const options = dests.get(dest) ?? [];
  if (!options.some((p) => samePath(p, action.path))) {
    return "illegal market path";
  }
  commitMarketPath(sheet, action.path, cost);
  return null;
}

function applyCompensationAction(
  sheet: Player["sheet"],
  pick: NonNullable<GameState["activePick"]>,
  action: CompensationAction,
): string | null {
  if (!pick.compensation) return "not a compensation turn";
  const pathErr = isOrthogonalPath(
    action.path,
    sheet.mercato.steward,
    marketUsedSet(sheet),
  );
  if (pathErr) return pathErr;
  if (action.path.length !== 2) return "compensation is exactly 1 step";
  const dests = findMarketDestinations(
    sheet.mercato.steward,
    1,
    marketUsedSet(sheet),
  );
  const dest = action.path[1];
  if (!dest || !(dests.get(dest) ?? []).some((p) => samePath(p, action.path))) {
    return "illegal compensation step";
  }
  commitMarketPath(sheet, action.path, 0);
  return null;
}

function applyAction(
  sheet: Player["sheet"],
  pick: NonNullable<GameState["activePick"]>,
  action: TurnAction,
  upcomingBuildings: BuildingId[],
): string | null {
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

function applyCompleteTurn(
  state: GameState,
  move: CompleteTurnMove,
  ctx: MoveContext,
): ApplyResult {
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

  const seen = new Set<string>();
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
    dieValue: pick.compensation ? null : pick.dieValue,
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
    (state.firstPlayerId + 1) % state.playerCount,
  );
  state.pickQueue = pickQueueForRound(state.playerCount, state.firstPlayerId);
  state.pickIndex = 0;
  state.harbor = emptyHarbor();
  state.phase = "supply";
  return ok(state);
}

export function applyMove(
  state: GameState,
  move: Move,
  ctx: MoveContext,
): ApplyResult {
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

export function unwrap(result: ApplyResult): GameState {
  if (!result.ok) throw new Error(result.error);
  return result.state;
}
