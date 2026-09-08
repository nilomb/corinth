import type { DieColor, DieFace } from "../../engine/types";
import type { RolledDie } from "../../engine/moves";

/** Cryptographically-ish random face 1–6 for Workers. */
export function rollFace(): DieFace {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return ((buf[0]! % 6) + 1) as DieFace;
}

export function rollDiceSet(
  whiteCount: number,
  yellowCount: number,
): RolledDie[] {
  const dice: RolledDie[] = [];
  for (let i = 0; i < whiteCount; i++) {
    dice.push({ color: "white" as DieColor, face: rollFace() });
  }
  for (let i = 0; i < yellowCount; i++) {
    dice.push({ color: "yellow" as DieColor, face: rollFace() });
  }
  return dice;
}
