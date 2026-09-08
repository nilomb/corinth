import { PartySocket } from "partysocket";

const PARTY = "game-room";

function partyHost() {
  const fromEnv = import.meta.env?.VITE_PARTY_HOST;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  return "127.0.0.1:8787";
}

export function getOrCreateClientId() {
  const key = "corinth_client_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function randomRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 4; i++) {
    code += alphabet[buf[i] % alphabet.length];
  }
  return code;
}

/**
 * @param {{
 *   roomCode: string,
 *   clientId?: string,
 *   name?: string,
 *   onRoom?: (room: any) => void,
 *   onError?: (message: string) => void,
 *   onKicked?: (message: string) => void,
 * }} opts
 */
export function connectRoom(opts) {
  const clientId = opts.clientId || getOrCreateClientId();
  const roomCode = String(opts.roomCode || "")
    .trim()
    .toUpperCase();
  if (!roomCode) throw new Error("Codice room mancante");

  const host = partyHost();
  const socket = new PartySocket({
    host,
    party: PARTY,
    room: roomCode,
  });

  /** @type {any} */
  let lastRoom = null;

  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({
        type: "hello",
        clientId,
        name: opts.name,
      }),
    );
  });

  socket.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    if (msg.type === "error") {
      opts.onError?.(msg.message);
      return;
    }
    if (msg.type === "kicked") {
      opts.onKicked?.(msg.message || "Sei stato espulso");
      return;
    }
    if (msg.type === "room") {
      lastRoom = msg.room;
      opts.onRoom?.(msg.room);
    }
  });

  socket.addEventListener("error", () => {
    opts.onError?.("Connessione room fallita");
  });

  return {
    clientId,
    roomCode,
    getRoom: () => lastRoom,
    send(msg) {
      if (socket.readyState !== WebSocket.OPEN) {
        throw new Error("Socket non connesso");
      }
      socket.send(JSON.stringify(msg));
    },
    close() {
      socket.close();
    },
  };
}
