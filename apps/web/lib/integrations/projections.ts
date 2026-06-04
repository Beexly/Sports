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

import { PLAYERS } from "../fantasy/players";
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
