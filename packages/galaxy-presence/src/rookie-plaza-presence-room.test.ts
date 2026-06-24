import { describe, expect, it } from "vitest";
import { RookiePlazaPresenceRoom } from "./rookie-plaza-presence-room.js";
import {
  DEFAULT_ROOKIE_PLAZA_PRESENCE_PORT,
  ROOKIE_PLAZA_ROOM_NAME,
  getRookiePlazaPresenceServerInfo,
} from "./server.js";

describe("RookiePlazaPresenceRoom", () => {
  it("creates authoritative presence state with a 16 player cap", () => {
    const room = new RookiePlazaPresenceRoom();
    room.onCreate();
    expect(room.maxClients).toBe(16);
    expect(room.state.players.size).toBe(0);
  });

  it("joins, syncs clamped position, sends a signal, and leaves", () => {
    const room = new RookiePlazaPresenceRoom();
    room.onCreate();
    const client = { sessionId: "session-a" };

    room.onJoin(client, { role: "scout", faction: "Rookies", label: "Test Scout" });
    expect(room.state.players.get("session-a")?.role).toBe("scout");

    room.applyPosition("session-a", { x: 99, y: 1, z: -99 });
    const moved = room.state.players.get("session-a");
    expect(moved?.x).toBe(6.5);
    expect(moved?.z).toBe(-6.5);

    room.applySignal("session-a", { signal: "proof-check" });
    expect(room.state.players.get("session-a")?.signal).toBe("proof-check");

    room.onLeave(client);
    expect(room.state.players.size).toBe(0);
  });

  it("declares a runnable Colyseus room server contract", () => {
    expect(DEFAULT_ROOKIE_PLAZA_PRESENCE_PORT).toBe(2567);
    expect(ROOKIE_PLAZA_ROOM_NAME).toBe("rookie_plaza");
    expect(getRookiePlazaPresenceServerInfo()).toEqual({
      roomName: "rookie_plaza",
      maxClients: 16,
      transport: "colyseus-websocket",
      status: "ready",
    });
  });
});
