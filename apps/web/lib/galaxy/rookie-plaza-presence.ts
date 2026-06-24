import { GHOST_PRESENCE } from "@sports/galaxy-engine";

export interface RookiePlazaPresencePlayer {
  readonly sessionId: string;
  readonly label: string;
  readonly role: string;
  readonly faction: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly signal: string;
  readonly ghost: boolean;
  readonly lastSeenAt: string;
}

export interface RookiePlazaPresenceSnapshot {
  readonly roomId: "rookie-plaza-local-room";
  readonly mode: "local-live-adapter";
  readonly maxPlayers: 16;
  readonly players: readonly RookiePlazaPresencePlayer[];
}

const livePlayers = new Map<string, RookiePlazaPresencePlayer>();
const MAX_LIVE_PLAYERS = 11;
const SESSION_ID_LIMIT = 80;
const LABEL_LIMIT = 32;
const SIGNAL_LIMIT = 32;

export function getRookiePlazaPresenceSnapshot(now = new Date()): RookiePlazaPresenceSnapshot {
  pruneLivePlayers(MAX_LIVE_PLAYERS);
  const ghostPlayers = GHOST_PRESENCE.slice(0, 5).map((ghost, index): RookiePlazaPresencePlayer => ({
    sessionId: `ghost-${ghost.id}`,
    label: ghost.label,
    role: ghost.disclosedAs,
    faction: "system",
    x: 4.2 - index * 0.9,
    y: 0.45,
    z: 1.2 + (index % 3) * 1.1,
    signal: ghost.role,
    ghost: true,
    lastSeenAt: now.toISOString(),
  }));

  return {
    roomId: "rookie-plaza-local-room",
    mode: "local-live-adapter",
    maxPlayers: 16,
    players: [...livePlayers.values(), ...ghostPlayers].slice(0, 16),
  };
}

export function joinRookiePlazaPresence(sessionId: string, label = "Rookie"): RookiePlazaPresenceSnapshot {
  const safeSessionId = normalizeText(sessionId, SESSION_ID_LIMIT, "anonymous-rookie");
  const existing = livePlayers.get(safeSessionId);
  livePlayers.delete(safeSessionId);
  livePlayers.set(safeSessionId, {
    sessionId: safeSessionId,
    label: normalizeText(label, LABEL_LIMIT, "Rookie"),
    role: existing?.role ?? "rookie",
    faction: existing?.faction ?? "rookie-plaza",
    x: existing?.x ?? 0,
    y: existing?.y ?? 0.72,
    z: existing?.z ?? 1.2,
    signal: existing?.signal ?? "loaded",
    ghost: false,
    lastSeenAt: new Date().toISOString(),
  });
  return getRookiePlazaPresenceSnapshot();
}

export function syncRookiePlazaPresencePosition(
  sessionId: string,
  position: { readonly x: number; readonly y: number; readonly z: number },
): RookiePlazaPresenceSnapshot {
  const safeSessionId = normalizeText(sessionId, SESSION_ID_LIMIT, "anonymous-rookie");
  const current = livePlayers.get(safeSessionId) ?? {
    sessionId: safeSessionId,
    label: "Rookie",
    role: "rookie",
    faction: "rookie-plaza",
    x: 0,
    y: 0.72,
    z: 1.2,
    signal: "moving",
    ghost: false,
    lastSeenAt: new Date().toISOString(),
  };
  livePlayers.delete(safeSessionId);
  livePlayers.set(safeSessionId, {
    ...current,
    x: clamp(position.x, -6.5, 6.5),
    y: clamp(position.y, 0, 2),
    z: clamp(position.z, -6.5, 6.5),
    signal: "moving",
    lastSeenAt: new Date().toISOString(),
  });
  return getRookiePlazaPresenceSnapshot();
}

export function signalRookiePlazaPresence(sessionId: string, signal: string): RookiePlazaPresenceSnapshot {
  const safeSessionId = normalizeText(sessionId, SESSION_ID_LIMIT, "anonymous-rookie");
  const current = livePlayers.get(safeSessionId);
  if (!current) return joinRookiePlazaPresence(safeSessionId);
  livePlayers.delete(safeSessionId);
  livePlayers.set(safeSessionId, {
    ...current,
    signal: normalizeText(signal, SIGNAL_LIMIT, "heartbeat"),
    lastSeenAt: new Date().toISOString(),
  });
  return getRookiePlazaPresenceSnapshot();
}

function normalizeText(value: string, limit: number, fallback: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed.slice(0, limit) : fallback;
}

function pruneLivePlayers(maxPlayers: number): void {
  while (livePlayers.size > maxPlayers) {
    const oldest = livePlayers.keys().next().value;
    if (typeof oldest !== "string") return;
    livePlayers.delete(oldest);
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
