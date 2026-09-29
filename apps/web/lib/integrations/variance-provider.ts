/**
 * The variance provider: OUR projection, behind the same founder gate.
 *
 * The separation this file exists to enforce:
 *
 *   process grade   (player-model.ts)  — EPA + target share + WOPR. CONTEXT.
 *                   canPublishProjections stays false, permanently.
 *   variance model  (fantasy-variance) — recency-weighted production rate x
 *                   remaining games, EB-shrunk, with a measured CV band. This
 *                   is the only thing that may be called a projection.
 *
 * So this provider does NOT read the grade's fppg. It reads production
 * player-weeks. A player the variance model cannot support is EXCLUDED, not
 * backfilled from the grade — backfilling is how a grade becomes a projection
 * wearing its name.
 *
 * Gate: `PROJECTIONS_PROVIDER=graded` (same env as the process-grade provider).
 * When the flag is off, this returns null and the illustrative pool stands.
 */

import type { ProjectionRow } from "@sports/prediction-engine";
import type { Player } from "../fantasy/players";
import {
  registerProjectionsProvider,
  type PlayerProjection,
  type ProjectionsProvider,
} from "./projections";
import { isConfigured } from "./providers";

export const VARIANCE_ATTRIBUTION =
  "Data via nflverse (CC-BY-4.0). Projection: our variance model " +
  "(recency-weighted production rate, empirical-Bayes shrinkage, measured CV band).";

export interface VariancePlayer extends Player {
  /** Games behind the estimate. Surfaced so the band is auditable, not magic. */
  readonly varianceGames?: number;
  /** n/(n+kappa): how much of the estimate is the player, not the prior. */
  readonly varianceReliability?: number;
}

function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/**
 * Map variance rows onto the `Player` shape the engines already read. Pure.
 * The band comes from the model: floor = proj*(1-CV), ceiling = proj*(1+CV).
 * Nothing here re-derives it, and nothing reads the process grade.
 */
export function varianceRowsToPlayers(
  rows: readonly ProjectionRow[],
  nameById: ReadonlyMap<string, { name: string; team: string }>,
): VariancePlayer[] {
  return rows
    .map((r): VariancePlayer | null => {
      const who = nameById.get(r.playerId);
      if (!who) return null; // no identity -> not surfaced, never invented
      return {
        id: r.playerId,
        name: who.name,
        pos: r.position,
        team: who.team,
        bye: 0, // a fact join elsewhere, never invented here
        proj: round(r.proj),
        floor: round(r.floor),
        ceiling: round(r.ceiling),
        usage: 0, // usage is a process-grade fact; a projection must not fake it
        schemeFit: 0.6, // documented neutral, matching the graded pool's fallback
        role: `${r.position} · variance model`,
        trend: "flat", // a projection has no trend; the grade owns that
        injury: "healthy",
        note:
          `Our variance model: ${r.games} games, reliability ${r.reliability.toFixed(2)}, ` +
          `band +/-${(r.cvPlayer * 100).toFixed(0)}%. Process grade is separate context.`,
        varianceGames: r.games,
        varianceReliability: round(r.reliability, 3),
      };
    })
    .filter((p): p is VariancePlayer => p !== null)
    .sort((a, b) => b.proj - a.proj);
}

/** Build the provider. Pure — no env read, no DB. */
export function buildVarianceProvider(
  pool: readonly VariancePlayer[],
  fetchedAt?: string,
  attribution: string = VARIANCE_ATTRIBUTION,
): ProjectionsProvider {
  return {
    name: "Variance model · nflverse production",
    live: true,
    fetchedAt,
    attribution,
    list: (): PlayerProjection[] =>
      pool.map((p) => ({
        playerId: p.id,
        name: p.name,
        pos: p.pos,
        team: p.team,
        proj: p.proj,
        floor: p.floor,
        ceiling: p.ceiling,
        source: "live" as const,
      })),
    players: () => pool,
  };
}

/**
 * Founder/server hook. Respects the env gate: `PROJECTIONS_PROVIDER=graded`
 * (or any configured value) is required before this registers.
 */
export function registerVarianceProvider(
  pool: readonly VariancePlayer[],
  fetchedAt?: string,
): boolean {
  if (!isConfigured("projections")) {
    registerProjectionsProvider(null);
    return false;
  }
  registerProjectionsProvider(
    pool.length > 0 ? buildVarianceProvider(pool, fetchedAt) : null,
  );
  return pool.length > 0;
}
