/**
 * Murphy resolution + Brier by sport|market — engine ranking diagnostic.
 * Offline / cron artifact only. Does not change floors or publish.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";

export type GroupedCalibRow = {
  readonly groupKey: string; // sport|market
  readonly p: number;
  readonly y: 0 | 1;
  /** Optional market implied probability for edge filter. */
  readonly marketP?: number | null;
};

export type GroupResolutionRow = {
  readonly groupKey: string;
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  readonly murphyReliability: number;
  readonly murphyResolution: number;
  readonly murphyUncertainty: number;
};

export type ResolutionByGroupArtifact = {
  readonly generatedAt: string;
  readonly overall: GroupResolutionRow;
  readonly groups: readonly GroupResolutionRow[];
  readonly topByResolution: readonly GroupResolutionRow[];
  readonly bottomByResolution: readonly GroupResolutionRow[];
  readonly edgeFiltered: GroupResolutionRow | null;
  readonly note: string;
};

function scoreGroup(
  groupKey: string,
  samples: readonly CalibrationSample[],
): GroupResolutionRow {
  if (samples.length === 0) {
    return {
      groupKey,
      n: 0,
      brier: NaN,
      ece: NaN,
      murphyReliability: NaN,
      murphyResolution: NaN,
      murphyUncertainty: NaN,
    };
  }
  const d = brierDecomposition(samples);
  return {
    groupKey,
    n: samples.length,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    murphyReliability: d.reliability,
    murphyResolution: d.resolution,
    murphyUncertainty: d.uncertainty,
  };
}

/**
 * Edge filter: keep rows where |p − marketP| >= minEdge (model disagrees with market).
 * Recompute overall resolution on filtered subset.
 */
export function filterByEdge(
  rows: readonly GroupedCalibRow[],
  minEdge = 0.03,
): GroupedCalibRow[] {
  return rows.filter((r) => {
    if (r.marketP == null || !Number.isFinite(r.marketP)) return false;
    return Math.abs(r.p - r.marketP) >= minEdge;
  });
}

export function computeResolutionByGroup(
  rows: readonly GroupedCalibRow[],
  options?: { readonly minGroupN?: number; readonly minEdge?: number },
): ResolutionByGroupArtifact {
  const minGroupN = options?.minGroupN ?? 20;
  const minEdge = options?.minEdge ?? 0.03;
  const generatedAt = new Date().toISOString();

  const overallSamples: CalibrationSample[] = rows.map((r) => ({
    p: r.p,
    y: r.y,
  }));
  const overall = scoreGroup("ALL", overallSamples);

  const by = new Map<string, CalibrationSample[]>();
  for (const r of rows) {
    const arr = by.get(r.groupKey) ?? [];
    arr.push({ p: r.p, y: r.y });
    by.set(r.groupKey, arr);
  }

  const groups: GroupResolutionRow[] = [];
  for (const [gk, samples] of by) {
    if (samples.length < minGroupN) continue;
    groups.push(scoreGroup(gk, samples));
  }
  groups.sort((a, b) => b.murphyResolution - a.murphyResolution);

  const topByResolution = groups.slice(0, 5);
  const bottomByResolution = [...groups]
    .sort((a, b) => a.murphyResolution - b.murphyResolution)
    .slice(0, 5);

  const edged = filterByEdge(rows, minEdge);
  const edgeFiltered =
    edged.length >= minGroupN
      ? scoreGroup(`EDGE≥${minEdge}`, edged.map((r) => ({ p: r.p, y: r.y })))
      : null;

  const note =
    overall.murphyResolution < 0.01
      ? "Full-sample Murphy resolution ~0: recalibration cannot unlock PROVEN. Prefer selective groups with higher Res, market-relative features, and sport-specialized models. Platt/Temp/PAVA stay offline bake-off only."
      : "Per-group resolution ranking for engine focus. Eligibility floors unchanged.";

  return {
    generatedAt,
    overall,
    groups,
    topByResolution,
    bottomByResolution,
    edgeFiltered,
    note,
  };
}
