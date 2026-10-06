/**
 * Tendency models: the film knowledge base as predictive features.
 *
 * Plays accumulate in the play database (db/schema/watch-plays.sql). These
 * are the aggregate queries that turn a season of film into answers:
 *   - "When THIS team is in THIS formation on THIS down/distance, run or pass?"
 *   - "What route combinations do they run from trips?"
 *   - "Who gets targeted from empty?"
 *
 * Implemented as pure functions over PlayRecord[] so they are fully
 * testable without a database; the SQL views in the schema mirror the
 * same groupings for production use. Everything here is internal and
 * weight-zero until validated.
 *
 * Original implementation for GSE.
 */

import type { PlayRecord } from "./cv-play.js";

export type DistanceBucket = "short" | "medium" | "long";

export function distanceBucket(distanceYd: number | null): DistanceBucket | null {
  if (distanceYd == null) return null;
  if (distanceYd <= 3) return "short";
  if (distanceYd <= 7) return "medium";
  return "long";
}

export interface TendencyFilter {
  readonly team?: string;
  readonly down?: number;
  readonly bucket?: DistanceBucket;
  readonly distribution?: string;
  readonly personnel?: string;
  /** Minimum plays for a bucket to be reported. Default 5. */
  readonly minN?: number;
}

function applyFilter(
  plays: readonly PlayRecord[],
  f: TendencyFilter,
): PlayRecord[] {
  return plays.filter((p) => {
    if (f.team && p.possession !== f.team) return false;
    if (f.down != null && p.down !== f.down) return false;
    if (f.bucket && distanceBucket(p.distanceYd) !== f.bucket) return false;
    if (f.distribution && p.distribution !== f.distribution) return false;
    if (f.personnel && p.personnel !== f.personnel) return false;
    return true;
  });
}

export interface RunPassTendency {
  readonly n: number;
  readonly runs: number;
  readonly passes: number;
  readonly runRate: number;
  readonly passRate: number;
}

/**
 * Run/pass tendency for a situation. play-action and screens count as
 * passes (the defense must defend the throw); unknowns are excluded.
 */
export function runPassTendency(
  plays: readonly PlayRecord[],
  filter: TendencyFilter = {},
): RunPassTendency | null {
  const minN = filter.minN ?? 5;
  const rows = applyFilter(plays, filter).filter(
    (p) => p.playType === "run" || p.playType === "pass" || p.playType === "play-action" || p.playType === "screen",
  );
  if (rows.length < minN) return null;
  const runs = rows.filter((p) => p.playType === "run").length;
  const passes = rows.length - runs;
  return {
    n: rows.length,
    runs,
    passes,
    runRate: Math.round((runs / rows.length) * 1000) / 1000,
    passRate: Math.round((passes / rows.length) * 1000) / 1000,
  };
}

export interface RouteComboFreq {
  readonly combo: string;
  readonly n: number;
  readonly share: number;
}

/** Most common route combinations from a formation family. */
export function routeCombinationFrequency(
  plays: readonly PlayRecord[],
  filter: TendencyFilter = {},
  topK = 10,
): RouteComboFreq[] {
  const minN = filter.minN ?? 5;
  const rows = applyFilter(plays, filter).filter((p) => p.routeCombo);
  if (rows.length < minN) return [];
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.routeCombo!, (counts.get(r.routeCombo!) ?? 0) + 1);
  return [...counts.entries()]
    .map(([combo, n]) => ({
      combo,
      n,
      share: Math.round((n / rows.length) * 1000) / 1000,
    }))
    .sort((a, b) => b.n - a.n)
    .slice(0, topK);
}

export interface TargetShare {
  readonly formation: string;
  readonly route: string;
  /** Share of that formation's targets running this route. */
  readonly share: number;
  readonly n: number;
}

/**
 * Target share by formation × route. Approximation: every classified
 * route in a pass play counts as a potential target (true target data
 * needs the catch-point link; v2 refines with separation-at-catch).
 */
export function targetShareByFormation(
  plays: readonly PlayRecord[],
  filter: TendencyFilter = {},
): TargetShare[] {
  const rows = applyFilter(plays, filter).filter(
    (p) => p.distribution && p.routeCombo && (p.playType === "pass" || p.playType === "play-action"),
  );
  const byFormation = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const fm = byFormation.get(r.distribution!) ?? new Map<string, number>();
    for (const route of r.routeCombo!.split("+")) {
      fm.set(route, (fm.get(route) ?? 0) + 1);
    }
    byFormation.set(r.distribution!, fm);
  }
  const out: TargetShare[] = [];
  for (const [formation, routes] of byFormation) {
    const total = [...routes.values()].reduce((a, b) => a + b, 0);
    for (const [route, n] of routes) {
      out.push({
        formation,
        route,
        share: Math.round((n / total) * 1000) / 1000,
        n,
      });
    }
  }
  return out.sort((a, b) => b.share - a.share);
}

export interface DownTendencyRow {
  readonly down: number;
  readonly bucket: DistanceBucket;
  readonly n: number;
  readonly runRate: number;
  readonly passRate: number;
}

/** Full down × distance run/pass matrix for a team. */
export function downDistanceMatrix(
  plays: readonly PlayRecord[],
  team: string,
  minN = 5,
): DownTendencyRow[] {
  const rows: DownTendencyRow[] = [];
  for (const down of [1, 2, 3, 4]) {
    for (const bucket of ["short", "medium", "long"] as DistanceBucket[]) {
      const t = runPassTendency(plays, { team, down, bucket, minN });
      if (t) rows.push({ down, bucket, n: t.n, runRate: t.runRate, passRate: t.passRate });
    }
  }
  return rows;
}
