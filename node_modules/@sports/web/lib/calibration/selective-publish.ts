/**
 * Selective publishing thresholds — reveal ranking tails.
 * Offline sweep recommends δ, e, ρ with dual-objective + integrity guard.
 *
 * Integrity (segmented Murphy):
 *   BS_paused ≈ UNC_paused — do not discard skill or hide toxic middle.
 *
 * Runtime public filter: isSelectivePublishRuntimeEnabled (default ON).
 * Never invents edge. Never flips PROVEN gates.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
} from "@sports/prediction-engine";
import {
  computeSegmentedMurphy,
  type SegmentedMurphyReport,
} from "@/lib/calibration/segmented-murphy";

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
  /** Optional integrity attachment when computed. */
  readonly integrityStatus?: string;
  readonly pausedBrier?: number;
  readonly publishedVarP?: number;
};

/** Explicit true only. Runtime public filter uses isSelectivePublishRuntimeEnabled (default ON). */
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
  integrity?: SegmentedMurphyReport | null,
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
      integrityStatus: integrity?.integrity.status,
      pausedBrier: integrity?.paused.brier,
      publishedVarP: integrity?.published.varP,
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
    integrityStatus: integrity?.integrity.status,
    pausedBrier: integrity?.paused.brier,
    publishedVarP: integrity?.published.varP,
  };
}

export type SweepArtifact = {
  readonly generatedAt: string;
  readonly baseline: SelectiveMetrics;
  readonly grid: readonly SelectiveMetrics[];
  readonly recommended: SelectiveMetrics | null;
  /** Integrity-best δ when floor-clearing candidate exists. */
  readonly integrityRecommended: SelectiveMetrics | null;
  readonly note: string;
};

/**
 * Offline sweep over δ, e, ρ → pick max Res with n ≥ minN.
 * Dual objective: among candidates that do not explode Brier
 * (≤ baseline + 0.03 or ≤ 0.26), maximize RES.
 * Integrity: prefer candidates that do not discard skill or hide toxic middle
 * (BS_paused between floor/ceil when paused n is large enough).
 */
export function selectivePublishSweep(
  rows: readonly SelectiveRow[],
  options?: {
    readonly deltas?: readonly number[];
    readonly edges?: readonly (number | null)[];
    readonly minGroupResList?: readonly (number | null)[];
    readonly groupResMap?: Readonly<Record<string, number>>;
    readonly minN?: number;
    /** Max allowed Brier above baseline for dual-objective pick (default 0.03). */
    readonly maxBrierLift?: number;
    /** Absolute Brier ceiling for dual-objective pick (default 0.26). */
    readonly brierCeiling?: number;
    /** Prefer integrity-ok candidates when available (default true). */
    readonly preferIntegrity?: boolean;
  },
): SweepArtifact {
  const deltas = options?.deltas ?? [0, 0.08, 0.1, 0.12, 0.15, 0.18];
  const edges = options?.edges ?? [null, 0.03, 0.05];
  const minGroupResList = options?.minGroupResList ?? [null];
  const minN = options?.minN ?? 50;
  const groupResMap = options?.groupResMap;
  const maxBrierLift = options?.maxBrierLift ?? 0.03;
  const brierCeiling = options?.brierCeiling ?? 0.26;
  const preferIntegrity = options?.preferIntegrity !== false;

  const baseline = metricsOf(rows, {
    delta: 0,
    edge: null,
    minGroupRes: null,
  });

  const segmentedBase = rows.map((r) => ({
    p: r.p,
    y: r.y,
    groupKey: r.groupKey,
  }));

  const grid: SelectiveMetrics[] = [];
  const integrityByKey = new Map<string, SegmentedMurphyReport>();

  for (const delta of deltas) {
    // Integrity is δ-only (edge/minGroupRes are secondary filters).
    const seg = computeSegmentedMurphy(segmentedBase, delta);
    integrityByKey.set(String(delta), seg);
    for (const edge of edges) {
      for (const minGroupRes of minGroupResList) {
        const t: SelectiveThresholds = {
          delta,
          edge,
          minGroupRes,
          groupResMap,
        };
        const filtered = filterSelective(rows, t);
        grid.push(metricsOf(filtered, t, seg));
      }
    }
  }

  const brierCap = Number.isFinite(baseline.brier)
    ? Math.min(brierCeiling, baseline.brier + maxBrierLift)
    : brierCeiling;

  const integrityOk = (m: SelectiveMetrics): boolean => {
    if (!preferIntegrity) return true;
    const st = m.integrityStatus;
    if (st == null) return true;
    return st !== "discarding_skill" && st !== "hiding_bad_region";
  };

  let recommended: SelectiveMetrics | null = null;
  let dual: SelectiveMetrics | null = null;
  let integrityRecommended: SelectiveMetrics | null = null;

  for (const m of grid) {
    if (m.n < minN || !Number.isFinite(m.murphyResolution)) continue;

    // Unconstrained max-RES (legacy)
    if (
      !recommended ||
      m.murphyResolution > recommended.murphyResolution + 1e-9 ||
      (Math.abs(m.murphyResolution - recommended.murphyResolution) < 1e-9 &&
        m.n > recommended.n)
    ) {
      recommended = m;
    }

    // Dual: RES under Brier discipline
    if (Number.isFinite(m.brier) && m.brier <= brierCap + 1e-9) {
      if (
        !dual ||
        m.murphyResolution > dual.murphyResolution + 1e-9 ||
        (Math.abs(m.murphyResolution - dual.murphyResolution) < 1e-9 &&
          m.brier < dual.brier - 1e-9)
      ) {
        dual = m;
      }

      // Integrity-preferred dual
      if (integrityOk(m)) {
        if (
          !integrityRecommended ||
          m.murphyResolution > integrityRecommended.murphyResolution + 1e-9 ||
          (Math.abs(
            m.murphyResolution - integrityRecommended.murphyResolution,
          ) < 1e-9 &&
            m.brier < integrityRecommended.brier - 1e-9)
        ) {
          integrityRecommended = m;
        }
      }
    }
  }

  // Prefer dual when it has meaningful RES
  if (
    dual &&
    recommended &&
    dual.murphyResolution >=
      Math.min(
        recommended.murphyResolution * 0.5,
        recommended.murphyResolution,
      ) &&
    (dual.murphyResolution >= 0.008 ||
      dual.murphyResolution >= recommended.murphyResolution - 0.002)
  ) {
    recommended = dual;
  } else if (dual && !recommended) {
    recommended = dual;
  }

  // Prefer integrity-ok dual when comparable RES
  if (
    integrityRecommended &&
    recommended &&
    integrityOk(recommended) === false &&
    integrityRecommended.murphyResolution >=
      recommended.murphyResolution * 0.85
  ) {
    recommended = integrityRecommended;
  } else if (
    integrityRecommended &&
    recommended &&
    integrityOk(recommended) &&
    integrityRecommended.murphyResolution >= recommended.murphyResolution - 0.001 &&
    integrityRecommended.brier < recommended.brier - 1e-4
  ) {
    recommended = integrityRecommended;
  }

  return {
    generatedAt: new Date().toISOString(),
    baseline,
    grid,
    recommended,
    integrityRecommended,
    note:
      "Selective publish reveals ranking tails; does not invent edge. " +
      "Dual objective: max RES subject to Brier ≤ min(0.26, baseline+0.03). " +
      "Integrity: prefer candidates where BS_paused is not skill-discard or toxic hide. " +
      "Runtime selective default ON. PROVEN still needs live floors after ranking improves.",
  };
}
