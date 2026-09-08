import type { GameState, PlayerCount, PlayerId } from "../engine/types";
import type { Move, RolledDie } from "../engine/moves";

/** Stable id for this browser tab / profile (sessionStorage). */
export type ClientId = string;

export interface LobbySeat {
  seat: PlayerId;
  clientId: ClientId | null;
  name: string;
  connected: boolean;
}

export interface RoomSnapshot {
  code: string;
  status: "lobby" | "playing" | "over";
  playerCount: PlayerCount;
  hostClientId: ClientId;
  seats: LobbySeat[];
  you: PlayerId | null;
  state: GameState | null;
  /** Present after a successful roll so clients can animate. */
  lastRoll: RolledDie[] | null;
}

export type ClientMessage =
  | { type: "hello"; clientId: ClientId; name?: string }
  | { type: "setPlayerCount"; playerCount: PlayerCount }
  | { type: "claimSeat"; seat: PlayerId }
  | { type: "releaseSeat" }
  | { type: "kick"; seat: PlayerId }
  | { type: "setName"; name: string }
  | { type: "start" }
  | { type: "roll"; purchasedYellow: 0 | 1 | 2 | 3 }
  | {
      type: "move";
      move: Exclude<Move, { type: "startGame" } | { type: "roll" }>;
    };

export type ServerMessage =
  | { type: "room"; room: RoomSnapshot }
  | { type: "kicked"; message: string }
  | { type: "error"; message: string };
