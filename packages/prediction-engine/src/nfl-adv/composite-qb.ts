/**
 * GSE composite QB ranking — AGENTS.md ENGINE BENCHMARK: COMPOSITE QB RANKING.
 *
 * Source claim (@sfdata9ers): EPA/Play + Success Rate + CPOE + Air Yards per
 * Reception. Weights unpublished. We do not invent their weights.
 *
 * GSE formula (`gse-composite-qb-z4-v1`): equal-weight mean of sample z-scores
 * of those four components, computed inside the qualifying sample. CPOE is
 * nflverse's 0–100 scale (percentage points), not a 0–1 rate. Air yards per
 * reception is completed air yards / receptions, not aDOT (air yards / attempts).
 *
 * Fail-closed: a non-finite component drops that QB (no imputation). Fewer than
 * two qualifiers → refuse. This is GSE's formula, not a reproduction of the
 * unpublished sfdata9ers mix.
 */

import { mean, round, stddev } from "../expected-metrics/numeric.js";

export const COMPOSITE_QB_METHOD_TAG = "gse-composite-qb-z4-v1" as const;

export const COMPOSITE_QB_COMPONENTS = [
  "epaPerPlay",
  "successRate",
  "cpoe",
  "airYardsPerReception",
] as const;

export interface QbCompositeInput {
  readonly playerId: string;
  readonly attempts: number;
  /** Mean EPA on dropbacks in the lab sample. */
  readonly epaPerPlay: number;
  /** Lab success rate (EPA > 0) on those dropbacks. */
  readonly successRate: number;
  /** nflverse CPOE, percentage points (0–100 scale). */
  readonly cpoe: number;
  /** Sum of air_yards on completions / receptions. */
  readonly airYardsPerReception: number;
}

export interface QbCompositeRow {
  readonly playerId: string;
  readonly attempts: number;
  readonly zEpa: number;
  readonly zSuccess: number;
  readonly zCpoe: number;
  readonly zAirYardsPerReception: number;
  /** Mean of the four z-scores. */
  readonly composite: number;
  readonly rank: number;
}

export type CompositeQbResult =
  | {
      readonly ok: true;
      readonly method: typeof COMPOSITE_QB_METHOD_TAG;
      readonly n: number;
      readonly rows: readonly QbCompositeRow[];
    }
  | {
      readonly ok: false;
      readonly method: typeof COMPOSITE_QB_METHOD_TAG;
      readonly reason: "insufficient_qualifiers";
      readonly n: number;
    };

function zOf(xs: readonly number[], x: number): number {
  const s = stddev(xs);
  if (s <= 1e-12) return 0;
  return (x - mean(xs)) / s;
}

function componentsFinite(row: QbCompositeInput): boolean {
  return (
    Number.isFinite(row.epaPerPlay) &&
    Number.isFinite(row.successRate) &&
    Number.isFinite(row.cpoe) &&
    Number.isFinite(row.airYardsPerReception) &&
    Number.isFinite(row.attempts)
  );
}

export function rankCompositeQbs(
  rows: readonly QbCompositeInput[],
  minAttempts: number,
): CompositeQbResult {
  const kept = rows.filter((r) => r.attempts >= minAttempts && componentsFinite(r));
  if (kept.length < 2) {
    return { ok: false, method: COMPOSITE_QB_METHOD_TAG, reason: "insufficient_qualifiers", n: kept.length };
  }
  const epa = kept.map((r) => r.epaPerPlay);
  const sr = kept.map((r) => r.successRate);
  const cpoe = kept.map((r) => r.cpoe);
  const aypr = kept.map((r) => r.airYardsPerReception);
  const scored: QbCompositeRow[] = kept.map((r) => {
    const zEpa = zOf(epa, r.epaPerPlay);
    const zSuccess = zOf(sr, r.successRate);
    const zCpoe = zOf(cpoe, r.cpoe);
    const zAirYardsPerReception = zOf(aypr, r.airYardsPerReception);
    return {
      playerId: r.playerId,
      attempts: r.attempts,
      zEpa,
      zSuccess,
      zCpoe,
      zAirYardsPerReception,
      composite: (zEpa + zSuccess + zCpoe + zAirYardsPerReception) / 4,
      rank: 0,
    };
  });
  scored.sort(
    (a, b) => b.composite - a.composite || (a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0),
  );
  const ranked = scored.map((row, i) => ({
    ...row,
    zEpa: round(row.zEpa, 6),
    zSuccess: round(row.zSuccess, 6),
    zCpoe: round(row.zCpoe, 6),
    zAirYardsPerReception: round(row.zAirYardsPerReception, 6),
    composite: round(row.composite, 6),
    rank: i + 1,
  }));
  return { ok: true, method: COMPOSITE_QB_METHOD_TAG, n: ranked.length, rows: ranked };
}
