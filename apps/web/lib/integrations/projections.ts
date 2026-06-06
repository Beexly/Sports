/**
 * Projections provider — the swappable source the fantasy engines read from.
 *
 * Everything (lineup, waivers, DFS, trade, Autopilot) consumes projections
 * through this interface. The default is the illustrative pool; a licensed live
 * feed is injected by the founder (registered AND enabled by env). Engines don't
 * change when the source flips — they just call resolveProjectionsProvider().
 * Honors the founder gate: live data requires both a registered provider and the
 * env flag. Pure (env-injectable).
 */

import { PLAYERS, type Player } from "../fantasy/players";
import { isConfigured } from "./providers";

export type PlayerProjection = {
  readonly playerId: string;
  readonly name: string;
  readonly pos: string;
  readonly team: string;
  readonly proj: number;
  readonly floor: number;
  readonly ceiling: number;
  readonly source: "illustrative" | "live";
};

export interface ProjectionsProvider {
  readonly name: string;
  readonly live: boolean;
  list(): PlayerProjection[];
  /**
   * The rich player pool the fantasy engines consume (usage/scheme/trend/etc.).
   * Optional so the thin `list()` contract stays backward-compatible; a live
   * feed that drives the engines must implement it. The illustrative default
   * returns the demo universe.
   */
  players?(): readonly Player[];
}

/** The default: the clearly-labelled illustrative pool. */
export const ILLUSTRATIVE_PROJECTIONS: ProjectionsProvider = {
  name: "Illustrative pool",
  live: false,
  list: () =>
    PLAYERS.map((p) => ({
      playerId: p.id, name: p.name, pos: p.pos, team: p.team,
      proj: p.proj, floor: p.floor, ceiling: p.ceiling, source: "illustrative" as const,
    })),
  players: () => PLAYERS,
};

let liveProvider: ProjectionsProvider | null = null;

/** Founder hook: register a licensed live provider. Ignored unless it reports live. */
export function registerProjectionsProvider(provider: ProjectionsProvider | null): void {
  liveProvider = provider && provider.live ? provider : null;
}

/** The active provider — live only when registered AND enabled by env; else illustrative. */
export function resolveProjectionsProvider(env: Record<string, string | undefined> = process.env): ProjectionsProvider {
  if (liveProvider && isConfigured("projections", env)) return liveProvider;
  return ILLUSTRATIVE_PROJECTIONS;
}

export function isLiveProjections(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(liveProvider) && isConfigured("projections", env);
}

/**
 * The active rich player pool the fantasy engines should read from. Returns the
 * live feed's players only when a provider is registered, reports `live`, exposes
 * `players()`, AND the env flag is set; otherwise the clearly-labelled
 * illustrative universe. This is the single swap point that makes every fantasy
 * tool plug-in ready: flip the key and the same engines run on the real feed,
 * with no fabricated data in the gated state.
 */
export function activePlayerPool(env: Record<string, string | undefined> = process.env): readonly Player[] {
  const provider = resolveProjectionsProvider(env);
  if (provider.live && provider.players) return provider.players();
  return PLAYERS;
}
