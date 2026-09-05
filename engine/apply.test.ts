import { applyMove, unwrap } from "./apply";
import { sortDiceToHarbor } from "./harbor";
import { marketGoldCost, marketStepRange } from "./market";
import { marketScore, scoreSheet, templeScore } from "./score";
import { goldGain, goodsQuota } from "./sheet";
import { createInitialState, pickQueueForRound } from "./state";
import type {
  Die,
  DieFace,
  GameState,
  MoveContext,
  PlayerId,
} from "./types";
import type { RolledDie } from "./moves";

let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (err) {
    failed += 1;
    const message = err instanceof Error ? err.message : String(err);
    console.error(`FAIL ${name}\n  ${message}`);
  }
}

function eq<T>(actual: T, expected: T, label: string): void {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label}: ${a} !== ${b}`);
}

function isTrue(value: boolean, label: string): void {
  if (!value) throw new Error(label);
}

function whites(faces: DieFace[]): RolledDie[] {
  return faces.map((face) => ({ color: "white" as const, face }));
}

function die(id: string, face: DieFace, color: Die["color"] = "white"): Die {
  return { id, color, face, district: null };
}

function ctx(playerId: PlayerId): MoveContext {
  return { playerId };
}

function rollNine(state: GameState, faces: DieFace[]): GameState {
  return unwrap(
    applyMove(
      state,
      { type: "roll", purchasedYellow: 0, dice: whites(faces) },
      ctx(state.firstPlayerId),
    ),
  );
}

function qty(state: GameState, playerId: PlayerId): GameState {
  return unwrap(
    applyMove(
      state,
      { type: "completeTurn", action: { kind: "quantity" }, buildings: [] },
      ctx(playerId),
    ),
  );
}

check("harbor: all same face → Gold only", () => {
  const harbor = sortDiceToHarbor(
    Array.from({ length: 9 }, (_, i) => die(`w${i}`, 4)),
  );
  eq(Object.keys(harbor.groups).sort(), ["Gold"], "groups");
  eq(harbor.groups.Gold?.length, 9, "gold count");
});

check("harbor: 1–6 spread fills every district", () => {
  const harbor = sortDiceToHarbor(
    [1, 2, 3, 4, 5, 6].map((f, i) => die(`w${i}`, f as DieFace)),
  );
  eq(harbor.groups.Goats?.length, 1, "goats");
  eq(harbor.groups.Oil?.length, 1, "oil");
  eq(harbor.groups.Wine?.length, 1, "wine");
  eq(harbor.groups.Carpets?.length, 1, "carpets");
  eq(harbor.groups.Spices?.length, 1, "spices");
  eq(harbor.groups.Gold?.length, 1, "gold");
});

check("harbor: mid values climb Oil→Spices", () => {
  const harbor = sortDiceToHarbor(
    [1, 1, 2, 3, 6, 6].map((f, i) => die(`w${i}`, f as DieFace)),
  );
  eq(harbor.groups.Goats?.length, 2, "goats");
  eq(harbor.groups.Oil?.length, 1, "oil=2");
  eq(harbor.groups.Wine?.length, 1, "wine=3");
  eq(harbor.groups.Gold?.length, 2, "gold");
  eq(harbor.groups.Carpets, undefined, "no carpets");
});

check("2p pick queue and 4p pre-marked turns", () => {
  eq(pickQueueForRound(2, 0), [0, 1, 0], "2p first=0");
  eq(pickQueueForRound(3, 1), [1, 2, 0], "3p rotates");
  const s4 = createInitialState(4);
  eq(s4.maxRounds, 4, "4p rounds");
  eq(s4.players[0]?.sheet.turns.marked, 2, "pre-marked");
});

check("market score uses last diamond, not the sum", () => {
  const sheet = createInitialState(2).players[0]!.sheet;
  sheet.mercato.diamonds = [3, 8, null, null];
  eq(marketScore(sheet), 8, "last diamond");
  isTrue(scoreSheet(sheet).market === 8, "breakdown market");
});

check("wrong player cannot roll", () => {
  const state = createInitialState(2);
  const result = applyMove(
    state,
    { type: "roll", purchasedYellow: 0, dice: whites([1, 1, 1, 1, 1, 1, 1, 1, 1]) },
    ctx(1),
  );
  isTrue(!result.ok, "rejected");
});

check("cannot buy more yellows than gold", () => {
  const state = createInitialState(2);
  const result = applyMove(
    state,
    {
      type: "roll",
      purchasedYellow: 2,
      dice: [
        ...whites([1, 1, 1, 1, 1, 1, 1, 1, 1]),
        { color: "yellow", face: 2 },
        { color: "yellow", face: 3 },
      ],
    },
    ctx(0),
  );
  isTrue(!result.ok, "rejected");
});

check("first player can buy one yellow with starting gold", () => {
  const state0 = createInitialState(2);
  const state = unwrap(
    applyMove(
      state0,
      {
        type: "roll",
        purchasedYellow: 1,
        dice: [
          ...whites([1, 1, 1, 1, 1, 1, 1, 1, 1]),
          { color: "yellow", face: 4 },
        ],
      },
      ctx(0),
    ),
  );
  eq(state.players[0]!.sheet.gold.spent, 1, "spent starting gold");
  eq(state.harbor.dice.filter((d) => d.color === "yellow").length, 1, "one yellow");
});

check("2p round: gold pick, rotate first player", () => {
  const faces: DieFace[] = [1, 1, 2, 3, 4, 5, 6, 6, 6];
  let state = rollNine(createInitialState(2), faces);
  eq(state.phase, "draft", "draft after roll");
  eq(state.players[0]?.sheet.turns.marked, 1, "turn marked");
  eq(state.harbor.groups.Gold?.length, 3, "3 gold dice");

  state = unwrap(applyMove(state, { type: "pickDistrict", district: "Gold" }, ctx(0)));
  state = qty(state, 0);
  eq(state.players[0]?.sheet.gold.circled, 4, "1 start + 3 gold");
  isTrue(state.harbor.yellowsCleared, "yellows cleared after P0");
  eq(state.pickQueue[state.pickIndex], 1, "P1 to pick");

  state = unwrap(applyMove(state, { type: "pickDistrict", district: "Goats" }, ctx(1)));
  state = qty(state, 1);
  eq(state.players[1]?.sheet.goats.circled, 3, "1 start + 2 goats");

  state = unwrap(applyMove(state, { type: "pickDistrict", district: "Spices" }, ctx(0)));
  state = unwrap(
    applyMove(
      state,
      {
        type: "completeTurn",
        action: {
          kind: "quantity",
          shopMarks: [{ district: "orange", shopIndex: 0, symbolIndex: 0 }],
        },
        buildings: [],
      },
      ctx(0),
    ),
  );
  eq(state.phase, "supply", "next round supply");
  eq(state.round, 2, "round 2");
  eq(state.firstPlayerId, 1, "first player rotated");
});

check("all-gold roll forces compensation for later pickers", () => {
  let state = rollNine(
    createInitialState(2),
    [4, 4, 4, 4, 4, 4, 4, 4, 4],
  );
  state = unwrap(applyMove(state, { type: "pickDistrict", district: "Gold" }, ctx(0)));
  state = qty(state, 0);
  const blocked = applyMove(state, { type: "pickDistrict", district: "Goats" }, ctx(1));
  isTrue(!blocked.ok, "no goats to pick");
  state = unwrap(applyMove(state, { type: "takeCompensation" }, ctx(1)));
  state = unwrap(
    applyMove(
      state,
      { type: "completeTurn", action: { kind: "pass" }, buildings: [] },
      ctx(1),
    ),
  );
  eq(state.activePick, null, "cleared");
  eq(state.pickIndex, 2, "P0 second pick");
});

check("first closer claims district bonus; others are crossed", () => {
  let state = createInitialState(2);
  const shops = state.players[0]!.sheet.districts.blue.shops;
  for (const shop of shops) shop.marked = shop.marked.map(() => true);
  const last = shops[shops.length - 1]!;
  last.marked[last.marked.length - 1] = false;

  state = rollNine(state, [1, 1, 2, 3, 4, 5, 6, 6, 6]);
  state = unwrap(
    applyMove(state, { type: "pickDistrict", district: "Carpets" }, ctx(0)),
  );
  state = unwrap(
    applyMove(
      state,
      {
        type: "completeTurn",
        action: {
          kind: "quantity",
          shopMarks: [{ district: "blue", shopIndex: 2, symbolIndex: 3 }],
        },
        buildings: [],
      },
      ctx(0),
    ),
  );
  eq(state.districtBonuses.blue, 0, "claimed by P0");
  eq(state.players[0]?.sheet.districts.blue.bonus, "circled", "P0 circled");
  eq(state.players[1]?.sheet.districts.blue.bonus, "crossed", "P1 crossed");
});

check("temple adds 3 VP per owned building to the total", () => {
  const sheet = createInitialState(2).players[0]!.sheet;
  eq(templeScore(sheet), 0, "no temple");
  sheet.buildings.temple = true;
  eq(templeScore(sheet), 3, "temple alone");
  eq(scoreSheet(sheet).temple, 3, "breakdown");
  eq(scoreSheet(sheet).total, 3, "in total / octagon");
  sheet.buildings.warehouse = true;
  eq(templeScore(sheet), 6, "two buildings");
});

check("warehouse adds one extra shop mark, including if built this turn", () => {
  const sheet = createInitialState(2).players[0]!.sheet;
  eq(goodsQuota(sheet, "Spices", 2), 2, "no warehouse");
  eq(goodsQuota(sheet, "Spices", 2, ["warehouse"]), 3, "upcoming warehouse");
  sheet.buildings.warehouse = true;
  eq(goodsQuota(sheet, "Spices", 2), 3, "owned warehouse");
});

check("stable: ±2 steps free, extra gold extends further", () => {
  eq(marketGoldCost(3, 5, true), 0, "±2 free");
  eq(marketGoldCost(3, 4, true), 0, "±1 free");
  eq(marketGoldCost(3, 6, true), 1, "±3 costs 1 gold");
  eq(marketGoldCost(3, 5, false), 2, "no stable");
  const sheet = createInitialState(2).players[0]!.sheet;
  sheet.buildings.stable = true;
  const range = marketStepRange(sheet, 3);
  eq(range, { min: 1, max: 6 }, "1 leftover gold + 2 free");
});

check("store adds 2 gold only after it is already owned", () => {
  const sheet = createInitialState(2).players[0]!.sheet;
  eq(goldGain(sheet, 3), 3, "no store");
  sheet.buildings.store = true;
  eq(goldGain(sheet, 3), 5, "store +2");

  let state = createInitialState(2);
  state.players[0]!.sheet.goats.circled = 2;
  state = rollNine(state, [1, 1, 2, 3, 4, 5, 6, 6, 6]);
  state = unwrap(
    applyMove(state, { type: "pickDistrict", district: "Gold" }, ctx(0)),
  );
  state = unwrap(
    applyMove(
      state,
      {
        type: "completeTurn",
        action: { kind: "quantity" },
        buildings: ["store"],
      },
      ctx(0),
    ),
  );
  eq(state.players[0]?.sheet.buildings.store, true, "built");
  eq(state.players[0]?.sheet.gold.circled, 4, "purchase turn is 1 start + 3 dice");

  let later = createInitialState(2);
  later.players[0]!.sheet.buildings.store = true;
  later = rollNine(later, [4, 4, 4, 4, 4, 4, 4, 4, 4]);
  later = unwrap(
    applyMove(later, { type: "pickDistrict", district: "Gold" }, ctx(0)),
  );
  later = qty(later, 0);
  eq(later.players[0]?.sheet.gold.circled, 12, "1 start + 9 dice + 2 store");
});

check("owned yellows are stripped after the first player's turn", () => {
  const state0 = createInitialState(2);
  state0.players[0]!.sheet.mercato.yellowDice = 1;
  let state = unwrap(
    applyMove(
      state0,
      {
        type: "roll",
        purchasedYellow: 0,
        dice: [
          ...whites([1, 1, 1, 1, 1, 1, 1, 1, 2]),
          { color: "yellow", face: 6 },
        ],
      },
      ctx(0),
    ),
  );
  eq(state.harbor.groups.Gold?.length, 1, "yellow on gold");
  state = unwrap(applyMove(state, { type: "pickDistrict", district: "Goats" }, ctx(0)));
  state = qty(state, 0);
  isTrue(state.harbor.yellowsCleared, "cleared");
  eq(state.harbor.groups.Gold, undefined, "yellow gold gone");
  eq(state.harbor.groups.Oil?.length, 1, "white 2 remains");
});

if (failed > 0) {
  throw new Error(`${failed} failed`);
}
console.log("\nall tests passed");
