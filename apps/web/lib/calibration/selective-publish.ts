/**
 * Selective publishing thresholds — reveal ranking tails; default OFF at runtime.
 * Offline sweep recommends δ, e, ρ; never invents edge.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";

export type SelectiveRow = {
  readonly p: number;
  readonly y: 0 | 1;
  readonly groupKey: string;
  readonly marketP?: number | null;
};

export type SelectiveThresholds = {
  /** |p - 0.5| min (confidence). */
  readonly delta: number;
  /** |p - marketP| min when market exists; null = ignore edge. */
  readonly edge: number | null;
  /** Min group Res to allowlist (from prior group table); null = no allowlist. */
  readonly minGroupRes: number | null;
  readonly groupResMap?: Readonly<Record<string, number>>;
};

export type SelectiveMetrics = {
  readonly n: number;
  readonly brier: number;
  readonly ece: number;
  readonly murphyReliability: number;
  readonly murphyResolution: number;
  readonly murphyUncertainty: number;
  readonly meanPWin: number;
  readonly meanPLoss: number;
  readonly separation: number; // meanPWin - meanPLoss
  readonly delta: number;
  readonly edge: number | null;
  readonly minGroupRes: number | null;
};

export function isSelectivePublishEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env["SELECTIVE_PUBLISH_ENABLED"]?.trim() === "true";
}

export function passesSelectiveThresholds(
  row: SelectiveRow,
  t: SelectiveThresholds,
): boolean {
  if (Math.abs(row.p - 0.5) < t.delta) return false;
  if (t.edge != null && t.edge > 0) {
    if (row.marketP != null && Number.isFinite(row.marketP)) {
      if (Math.abs(row.p - row.marketP) < t.edge) return false;
    }
    // no market line: allow in signal mode (edge filter N/A)
  }
  if (t.minGroupRes != null && t.groupResMap) {
    const gRes = t.groupResMap[row.groupKey];
    if (gRes == null || gRes < t.minGroupRes) return false;
  }
  return true;
}

export function filterSelective(
  rows: readonly SelectiveRow[],
  t: SelectiveThresholds,
): SelectiveRow[] {
  return rows.filter((r) => passesSelectiveThresholds(r, t));
}

function metricsOf(
  rows: readonly SelectiveRow[],
  t: SelectiveThresholds,
): SelectiveMetrics {
  const samples: CalibrationSample[] = rows.map((r) => ({ p: r.p, y: r.y }));
  if (samples.length === 0) {
    return {
      n: 0,
      brier: NaN,
      ece: NaN,
      murphyReliability: NaN,
      murphyResolution: NaN,
      murphyUncertainty: NaN,
      meanPWin: NaN,
      meanPLoss: NaN,
      separation: NaN,
      delta: t.delta,
      edge: t.edge,
      minGroupRes: t.minGroupRes,
    };
  }
  const d = brierDecomposition(samples);
  const wins = rows.filter((r) => r.y === 1);
  const losses = rows.filter((r) => r.y === 0);
  const meanPWin =
    wins.length === 0
      ? NaN
      : wins.reduce((s, r) => s + r.p, 0) / wins.length;
  const meanPLoss =
    losses.length === 0
      ? NaN
      : losses.reduce((s, r) => s + r.p, 0) / losses.length;
  return {
    n: rows.length,
    brier: d.brier,
    ece: expectedCalibrationError(samples),
    murphyReliability: d.reliability,
    murphyResolution: d.resolution,
    murphyUncertainty: d.uncertainty,
    meanPWin,
    meanPLoss,
    separation: meanPWin - meanPLoss,
    delta: t.delta,
    edge: t.edge,
    minGroupRes: t.minGroupRes,
  };
}

export type SweepArtifact = {
  readonly generatedAt: string;
  readonly baseline: SelectiveMetrics;
  readonly grid: readonly SelectiveMetrics[];
  readonly recommended: SelectiveMetrics | null;
  readonly note: string;
};

/**
 * Offline sweep over δ, e, ρ → pick max Res with n ≥ minN.
 */
export function selectivePublishSweep(
  rows: readonly SelectiveRow[],
  options?: {
    readonly deltas?: readonly number[];
    readonly edges?: readonly (number | null)[];
    readonly minGroupResList?: readonly (number | null)[];
    readonly groupResMap?: Readonly<Record<string, number>>;
    readonly minN?: number;
  },
): SweepArtifact {
  const deltas = options?.deltas ?? [0, 0.08, 0.1, 0.12, 0.15];
  const edges = options?.edges ?? [null, 0.03, 0.05];
  const minGroupResList = options?.minGroupResList ?? [null];
  const minN = options?.minN ?? 50;
  const groupResMap = options?.groupResMap;

  const baseline = metricsOf(rows, {
    delta: 0,
    edge: null,
    minGroupRes: null,
  });

  const grid: SelectiveMetrics[] = [];
  for (const delta of deltas) {
    for (const edge of edges) {
      for (const minGroupRes of minGroupResList) {
        const t: SelectiveThresholds = {
          delta,
          edge,
          minGroupRes,
          groupResMap,
        };
        const filtered = filterSelective(rows, t);
        grid.push(metricsOf(filtered, t));
      }
    }
  }

  let recommended: SelectiveMetrics | null = null;
  for (const m of grid) {
    if (m.n < minN || !Number.isFinite(m.murphyResolution)) continue;
    if (
      !recommended ||
      m.murphyResolution > recommended.murphyResolution ||
      (m.murphyResolution === recommended.murphyResolution && m.n > recommended.n)
    ) {
      recommended = m;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    baseline,
    grid,
    recommended,
    note:
      "Selective publish reveals ranking tails; does not invent edge. " +
      "SELECTIVE_PUBLISH_ENABLED default OFF. PROVEN still needs live floors after ranking improves.",
  };
}
