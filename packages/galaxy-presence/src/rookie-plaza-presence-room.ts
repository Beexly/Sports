import { MapSchema, Schema, type } from "@colyseus/schema";
import { Room } from "colyseus";
import type { Client } from "colyseus";

export class RookiePresencePlayer extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") z = 0;
  @type("string") role = "rookie";
  @type("string") faction = "unassigned";
  @type("string") label = "Rookie";
  @type("string") signal = "";
}

export class RookiePlazaPresenceState extends Schema {
  @type({ map: RookiePresencePlayer }) players = new MapSchema<RookiePresencePlayer>();
  @type("number") maxPlayers = 16;
}

export interface RookiePositionMessage {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RookieSignalMessage {
  readonly signal: string;
}

type PresenceClient = Pick<Client, "sessionId">;

export class RookiePlazaPresenceRoom extends Room<{ state: RookiePlazaPresenceState }> {
  maxClients = 16;

  onCreate(): void {
    this.setState(new RookiePlazaPresenceState());
    this.onMessage("position", (client, message: RookiePositionMessage) => {
      this.applyPosition(client.sessionId, message);
    });
    this.onMessage("signal", (client, message: RookieSignalMessage) => {
      this.applySignal(client.sessionId, message);
    });
  }

  onJoin(client: PresenceClient, options?: { role?: string; faction?: string; label?: string }): void {
    const player = new RookiePresencePlayer();
    player.x = (this.state.players.size % 4) - 1.5;
    player.z = 1 + Math.floor(this.state.players.size / 4);
    player.role = options?.role ?? "rookie";
    player.faction = options?.faction ?? "unassigned";
    player.label = options?.label ?? "Rookie";
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: PresenceClient): void {
    this.state.players.delete(client.sessionId);
  }

  applyPosition(sessionId: string, message: RookiePositionMessage): void {
    const player = this.state.players.get(sessionId);
    if (!player) return;
    player.x = clamp(message.x, -6.5, 6.5);
    player.y = clamp(message.y, 0, 2);
    player.z = clamp(message.z, -6.5, 6.5);
  }

  applySignal(sessionId: string, message: RookieSignalMessage): void {
    const player = this.state.players.get(sessionId);
    if (!player) return;
    player.signal = message.signal.slice(0, 32);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
