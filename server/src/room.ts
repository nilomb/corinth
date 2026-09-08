import { Server, type Connection, routePartykitRequest } from "partyserver";
import { applyMove } from "../../engine/apply";
import { MAX_YELLOW_DICE, WHITE_DICE } from "../../engine/constants";
import { createInitialState } from "../../engine/state";
import type { PlayerCount, PlayerId } from "../../engine/types";
import type { Move } from "../../engine/moves";
import { rollDiceSet } from "./rng";
import type {
  ClientId,
  ClientMessage,
  LobbySeat,
  RoomSnapshot,
  ServerMessage,
} from "../../shared/protocol";

interface ConnState {
  clientId: ClientId;
  name: string;
}

function isPlayerCount(n: unknown): n is PlayerCount {
  return n === 2 || n === 3 || n === 4;
}

function isPlayerId(n: unknown, count: PlayerCount): n is PlayerId {
  return (
    typeof n === "number" &&
    Number.isInteger(n) &&
    n >= 0 &&
    n < count
  );
}

function emptySeats(count: PlayerCount): LobbySeat[] {
  return Array.from({ length: count }, (_, i) => ({
    seat: i as PlayerId,
    clientId: null,
    name: `Giocatore ${i + 1}`,
    connected: false,
  }));
}

export class GameRoom extends Server {
  // Keep in-memory lobby/game state for the session. Hibernation would wipe it
  // unless we persist to storage (can add later).
  static options = { hibernate: false };

  hostClientId: ClientId | null = null;
  playerCount: PlayerCount = 2;
  seats: LobbySeat[] = emptySeats(2);
  status: RoomSnapshot["status"] = "lobby";
  gameState: RoomSnapshot["state"] = null;
  lastRoll: RoomSnapshot["lastRoll"] = null;
  clients = new Map<string, ConnState>();

  onConnect(_conn: Connection) {
    // Presence starts after hello.
  }

  onClose(conn: Connection) {
    const meta = this.clients.get(conn.id);
    this.clients.delete(conn.id);
    if (!meta) return;
    for (const seat of this.seats) {
      if (seat.clientId === meta.clientId) seat.connected = false;
    }
    this.broadcastRoom();
  }

  onMessage(conn: Connection, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let raw: unknown;
    try {
      raw = JSON.parse(message);
    } catch {
      this.send(conn, { type: "error", message: "JSON non valido" });
      return;
    }
    if (!raw || typeof raw !== "object" || !("type" in raw)) {
      this.send(conn, { type: "error", message: "Messaggio non valido" });
      return;
    }
    try {
      this.handle(conn, raw as ClientMessage);
    } catch (err) {
      const text = err instanceof Error ? err.message : "Errore server";
      this.send(conn, { type: "error", message: text });
    }
  }

  private handle(conn: Connection, msg: ClientMessage) {
    switch (msg.type) {
      case "hello":
        this.handleHello(conn, msg.clientId, msg.name);
        return;
      case "setPlayerCount":
        this.handleSetPlayerCount(conn, msg.playerCount);
        return;
      case "claimSeat":
        this.handleClaimSeat(conn, msg.seat);
        return;
      case "releaseSeat":
        this.handleReleaseSeat(conn);
        return;
      case "kick":
        this.handleKick(conn, msg.seat);
        return;
      case "setName":
        this.handleSetName(conn, msg.name);
        return;
      case "start":
        this.handleStart(conn);
        return;
      case "roll":
        this.handleRoll(conn, msg.purchasedYellow);
        return;
      case "move":
        this.handleMove(conn, msg.move);
        return;
      default:
        this.send(conn, { type: "error", message: "Tipo sconosciuto" });
    }
  }

  private meta(conn: Connection): ConnState | null {
    return this.clients.get(conn.id) ?? null;
  }

  private seatOf(clientId: ClientId): LobbySeat | null {
    return this.seats.find((s) => s.clientId === clientId) ?? null;
  }

  private handleHello(conn: Connection, clientId: string, name?: string) {
    if (!clientId || typeof clientId !== "string" || clientId.length > 80) {
      this.send(conn, { type: "error", message: "clientId non valido" });
      return;
    }
    const display =
      typeof name === "string" && name.trim()
        ? name.trim().slice(0, 24)
        : "Ospite";
    this.clients.set(conn.id, { clientId, name: display });
    if (!this.hostClientId) this.hostClientId = clientId;

    const seat = this.seatOf(clientId);
    if (seat) {
      seat.connected = true;
      if (display !== "Ospite") seat.name = display;
    }
    this.sendRoom(conn);
  }

  private requireHost(conn: Connection): ConnState | null {
    const m = this.meta(conn);
    if (!m || m.clientId !== this.hostClientId) {
      this.send(conn, { type: "error", message: "Solo l'host può farlo" });
      return null;
    }
    return m;
  }

  private handleSetPlayerCount(conn: Connection, playerCount: PlayerCount) {
    if (!this.requireHost(conn)) return;
    if (this.status !== "lobby") {
      this.send(conn, { type: "error", message: "Partita già iniziata" });
      return;
    }
    if (!isPlayerCount(playerCount)) {
      this.send(conn, { type: "error", message: "Numero giocatori non valido" });
      return;
    }
    const claimed = this.seats.filter((s) => s.clientId);
    if (claimed.length > playerCount) {
      this.send(conn, {
        type: "error",
        message: "Troppi seat già assegnati per ridurre",
      });
      return;
    }
    this.playerCount = playerCount;
    const next = emptySeats(playerCount);
    for (const old of claimed) {
      if (old.seat < playerCount) next[old.seat] = { ...old };
    }
    this.seats = next;
    this.broadcastRoom();
  }

  private handleClaimSeat(conn: Connection, seat: PlayerId) {
    const m = this.meta(conn);
    if (!m) {
      this.send(conn, { type: "error", message: "Fai prima hello" });
      return;
    }
    if (this.status !== "lobby") {
      this.send(conn, { type: "error", message: "Partita già iniziata" });
      return;
    }
    if (!isPlayerId(seat, this.playerCount)) {
      this.send(conn, { type: "error", message: "Seat non valido" });
      return;
    }
    const target = this.seats[seat]!;
    if (target.clientId && target.clientId !== m.clientId) {
      this.send(conn, { type: "error", message: "Seat già preso" });
      return;
    }
    for (const s of this.seats) {
      if (s.clientId === m.clientId) {
        s.clientId = null;
        s.connected = false;
        s.name = `Giocatore ${s.seat + 1}`;
      }
    }
    target.clientId = m.clientId;
    target.connected = true;
    target.name = m.name === "Ospite" ? `Giocatore ${seat + 1}` : m.name;
    this.broadcastRoom();
  }

  private handleReleaseSeat(conn: Connection) {
    const m = this.meta(conn);
    if (!m || this.status !== "lobby") return;
    for (const s of this.seats) {
      if (s.clientId === m.clientId) {
        s.clientId = null;
        s.connected = false;
        s.name = `Giocatore ${s.seat + 1}`;
      }
    }
    this.broadcastRoom();
  }

  private handleKick(conn: Connection, seat: PlayerId) {
    if (!this.requireHost(conn)) return;
    if (this.status !== "lobby") {
      this.send(conn, { type: "error", message: "Partita già iniziata" });
      return;
    }
    if (!isPlayerId(seat, this.playerCount)) {
      this.send(conn, { type: "error", message: "Seat non valido" });
      return;
    }
    const target = this.seats[seat]!;
    if (!target.clientId) {
      this.send(conn, { type: "error", message: "Seat libero" });
      return;
    }
    if (target.clientId === this.hostClientId) {
      this.send(conn, { type: "error", message: "Non puoi espellere l'host" });
      return;
    }
    const kickedId = target.clientId;
    target.clientId = null;
    target.connected = false;
    target.name = `Giocatore ${seat + 1}`;

    for (const c of this.getConnections()) {
      const meta = this.clients.get(c.id);
      if (meta?.clientId === kickedId) {
        this.send(c, {
          type: "kicked",
          message: "Sei stato espulso dalla stanza",
        });
        this.clients.delete(c.id);
        try {
          c.close(4000, "kicked");
        } catch {
          /* ignore */
        }
      }
    }
    this.broadcastRoom();
  }

  private handleSetName(conn: Connection, name: string) {
    const m = this.meta(conn);
    if (!m) return;
    const clean = String(name || "").trim().slice(0, 24) || "Ospite";
    m.name = clean;
    const seat = this.seatOf(m.clientId);
    if (seat) seat.name = clean;
    this.broadcastRoom();
  }

  private handleStart(conn: Connection) {
    if (!this.requireHost(conn)) return;
    if (this.status !== "lobby") {
      this.send(conn, { type: "error", message: "Già iniziata" });
      return;
    }
    const filled = this.seats.filter((s) => s.clientId);
    if (filled.length !== this.playerCount) {
      this.send(conn, {
        type: "error",
        message: `Servono ${this.playerCount} giocatori seduti`,
      });
      return;
    }
    const names = this.seats.map((s) => s.name);
    this.gameState = createInitialState(this.playerCount, names);
    this.status = "playing";
    this.lastRoll = null;
    this.broadcastRoom();
  }

  private handleRoll(conn: Connection, purchasedYellow: 0 | 1 | 2 | 3) {
    const m = this.meta(conn);
    if (!m || !this.gameState || this.status !== "playing") {
      this.send(conn, { type: "error", message: "Nessuna partita" });
      return;
    }
    const seat = this.seatOf(m.clientId);
    if (!seat) {
      this.send(conn, { type: "error", message: "Non hai un seat" });
      return;
    }
    if (this.gameState.phase !== "supply") {
      this.send(conn, { type: "error", message: "Non è fase lancio" });
      return;
    }
    if (seat.seat !== this.gameState.firstPlayerId) {
      this.send(conn, { type: "error", message: "Non sei il primo giocatore" });
      return;
    }
    const py = purchasedYellow;
    if (py !== 0 && py !== 1 && py !== 2 && py !== 3) {
      this.send(conn, { type: "error", message: "purchasedYellow non valido" });
      return;
    }
    const first = this.gameState.players.find(
      (p) => p.id === this.gameState!.firstPlayerId,
    );
    const owned = first ? first.sheet.mercato.yellowDice : 0;
    const yellowTotal = Math.min(MAX_YELLOW_DICE, owned + py);
    const dice = rollDiceSet(WHITE_DICE, yellowTotal);
    const move: Move = { type: "roll", purchasedYellow: py, dice };
    const result = applyMove(this.gameState, move, { playerId: seat.seat });
    if (!result.ok) {
      this.send(conn, { type: "error", message: result.error });
      return;
    }
    this.gameState = result.state;
    this.lastRoll = dice;
    if (result.state.phase === "over") this.status = "over";
    this.broadcastRoom();
  }

  private handleMove(
    conn: Connection,
    move: Extract<ClientMessage, { type: "move" }>["move"],
  ) {
    const m = this.meta(conn);
    if (!m || !this.gameState || this.status !== "playing") {
      this.send(conn, { type: "error", message: "Nessuna partita" });
      return;
    }
    const seat = this.seatOf(m.clientId);
    if (!seat) {
      this.send(conn, { type: "error", message: "Non hai un seat" });
      return;
    }
    if (!move || typeof move !== "object" || !("type" in move)) {
      this.send(conn, { type: "error", message: "Mossa non valida" });
      return;
    }
    if (move.type === "roll") {
      this.send(conn, { type: "error", message: "Usa il messaggio roll" });
      return;
    }
    const result = applyMove(this.gameState, move as Move, {
      playerId: seat.seat,
    });
    if (!result.ok) {
      this.send(conn, { type: "error", message: result.error });
      return;
    }
    this.gameState = result.state;
    this.lastRoll = null;
    if (result.state.phase === "over") this.status = "over";
    this.broadcastRoom();
  }

  private snapshotFor(clientId: ClientId | null): RoomSnapshot {
    const you =
      clientId == null
        ? null
        : (this.seats.find((s) => s.clientId === clientId)?.seat ?? null);
    return {
      code: this.name,
      status: this.status,
      playerCount: this.playerCount,
      hostClientId: this.hostClientId || "",
      seats: this.seats.map((s) => ({ ...s })),
      you,
      state: this.gameState,
      lastRoll: this.lastRoll,
    };
  }

  private send(conn: Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  private sendRoom(conn: Connection) {
    const m = this.meta(conn);
    this.send(conn, {
      type: "room",
      room: this.snapshotFor(m?.clientId ?? null),
    });
  }

  private broadcastRoom() {
    for (const conn of this.getConnections()) {
      this.sendRoom(conn);
    }
  }
}
