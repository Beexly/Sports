/**
 * V7 — Feature-construction discipline.
 *
 * Declare a typed feature space, fit on chronological split only, report
 * calibration bins / Brier / log-loss / ablation, and assert no future
 * features via V1 leakage probes.
 *
 * COMPOSES WITH: V1 leakage-antipatterns probes, ml-estimator,
 * W3 ats-ablation-harness.
 */

import {
  assertNoLeakage,
  runAllProbes,
  type FeatureBuilder,
  type FixtureGame,
} from "./leakage-antipatterns.js";
import { computeMetrics } from "../calibration/calibration-gates.js";

export type FeatureType = "number" | "binary" | "categorical";

export interface FeatureSpec {
  readonly name: string;
  readonly type: FeatureType;
  readonly unit: string;
  /** Features marked as-of: must be known before kickoff. */
  readonly asOf: boolean;
  readonly description?: string;
}

export interface FeatureSpace {
  readonly features: readonly FeatureSpec[];
  readonly version: string;
}

export interface FeatureSpaceError {
  readonly code:
    | "DUPLICATE_NAME"
    | "EMPTY_NAME"
    | "INVALID_TYPE"
    | "EMPTY_UNIT"
    | "NO_FEATURES";
  readonly message: string;
}

export type FeatureSpaceResult =
  | { readonly ok: true; readonly space: FeatureSpace }
  | { readonly ok: false; readonly errors: readonly FeatureSpaceError[] };

/**
 * Declare a typed feature space. Rejects empty/duplicate names and
 * unspecified units — feature construction must be explicit.
 */
export function defineFeatureSpace(
  specs: readonly FeatureSpec[],
  version: string,
): FeatureSpaceResult {
  const errors: FeatureSpaceError[] = [];
  if (!Array.isArray(specs) || specs.length === 0) {
    errors.push({ code: "NO_FEATURES", message: "feature space must declare at least one feature" });
    return { ok: false, errors };
  }

  const seen = new Set<string>();
  for (const s of specs) {
    if (!s.name || s.name.trim().length === 0) {
      errors.push({ code: "EMPTY_NAME", message: "feature name must be non-empty" });
    } else if (seen.has(s.name)) {
      errors.push({ code: "DUPLICATE_NAME", message: `duplicate feature name ${s.name}` });
    } else {
      seen.add(s.name);
    }
    if (s.type !== "number" && s.type !== "binary" && s.type !== "categorical") {
      errors.push({
        code: "INVALID_TYPE",
        message: `feature ${s.name} has invalid type ${String(s.type)}`,
      });
    }
    if (!s.unit || s.unit.trim().length === 0) {
      errors.push({ code: "EMPTY_UNIT", message: `feature ${s.name} must declare a unit` });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    space: {
      features: specs.map((s) => ({
        ...s,
        name: s.name.trim(),
        unit: s.unit.trim(),
      })),
      version,
    },
  };
}

// ── Dataset / chronological split ───────────────────────────────────────────

export interface Sample {
  readonly features: Record<string, number | null>;
  readonly outcome: number;
  /** ISO timestamp used for chronological ordering. */
  readonly timestamp: string;
}

export interface ChronologicalSplit {
  readonly train: readonly Sample[];
  readonly test: readonly Sample[];
  readonly trainEnd: string;
  readonly testStart: string;
}

/**
 * Chronological split only — never random. Sorted by timestamp; first
 * `trainRatio` fraction is train, remainder is test.
 */
export function chronologicalSplit(
  samples: readonly Sample[],
  trainRatio = 0.7,
): ChronologicalSplit {
  if (samples.length < 2) {
    throw new Error("chronologicalSplit: need at least 2 samples");
  }
  if (!(trainRatio > 0 && trainRatio < 1)) {
    throw new Error("chronologicalSplit: trainRatio must be in (0,1)");
  }
  const sorted = samples
    .slice()
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const cut = Math.max(1, Math.min(sorted.length - 1, Math.floor(sorted.length * trainRatio)));
  const train = sorted.slice(0, cut);
  const test = sorted.slice(cut);
  return {
    train,
    test,
    trainEnd: train[train.length - 1]!.timestamp,
    testStart: test[0]!.timestamp,
  };
}

// ── Fit + report ────────────────────────────────────────────────────────────

export interface CalibrationBin {
  readonly lower: number;
  readonly upper: number;
  readonly meanPredicted: number;
  readonly meanObserved: number;
  readonly count: number;
}

export interface AblationRow {
  readonly feature: string;
  readonly logLossWithout: number;
  readonly deltaLogLoss: number;
}

export interface LeakageProbeInputs {
  readonly featureBuilder: FeatureBuilder;
  readonly cleanFixture: readonly FixtureGame[];
  readonly contaminatedFixture: readonly FixtureGame[];
  readonly signFixture: readonly FixtureGame[];
}

export interface FitReport {
  readonly nTrain: number;
  readonly nTest: number;
  readonly brier: number;
  readonly logLoss: number;
  readonly calibrationBins: readonly CalibrationBin[];
  readonly ablation: readonly AblationRow[];
  readonly leakage: {
    readonly clean: boolean;
    readonly probeCount: number;
    readonly failures: readonly string[];
  };
}

export type PredictorFn = (
  features: Record<string, number | null>,
  train: readonly Sample[],
) => number;

/**
 * Fit on the train split (chronological), score on test, report:
 * Brier, log-loss, calibration bins, drop-one ablation.
 * Runs V1 leakage probes and fail-closes on leakage.
 */
export function fitAndReport(
  space: FeatureSpace,
  samples: readonly Sample[],
  predict: PredictorFn,
  opts: {
    readonly trainRatio?: number;
    readonly nBins?: number;
    readonly leakageProbes?: LeakageProbeInputs;
    readonly ablation?: boolean;
  } = {},
): FitReport {
  const split = chronologicalSplit(samples, opts.trainRatio ?? 0.7);

  // V1 leakage probes (optional; when provided, fail-closed on any leak)
  let leakage: FitReport["leakage"];
  if (opts.leakageProbes) {
    const suite = runAllProbes(
      opts.leakageProbes.featureBuilder,
      opts.leakageProbes.cleanFixture,
      opts.leakageProbes.contaminatedFixture,
      opts.leakageProbes.signFixture,
    );
    leakage = {
      clean: suite.allClean,
      probeCount: suite.probes.length,
      failures: suite.probes.filter((p) => p.leaked).map((p) => p.name),
    };
    assertNoLeakage(suite);
  } else {
    leakage = { clean: true, probeCount: 0, failures: [] };
  }

  const probs: number[] = [];
  const outcomes: number[] = [];
  for (const s of split.test) {
    const p = predict(s.features, split.train);
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("fitAndReport: predictor must return probability in (0,1)");
    }
    probs.push(p);
    outcomes.push(s.outcome);
  }

  const metrics = computeMetrics(probs, outcomes);
  const nBins = opts.nBins ?? 10;
  const calibrationBins = buildCalibrationBins(probs, outcomes, nBins);

  const ablation: AblationRow[] = [];
  if (opts.ablation !== false) {
    for (const f of space.features) {
      const without: Sample[] = split.test.map((s) => ({
        ...s,
        features: { ...s.features, [f.name]: null },
      }));
      const trainWithout = split.train.map((s) => ({
        ...s,
        features: { ...s.features, [f.name]: null },
      }));
      const probsWithout = without.map((s) => predict(s.features, trainWithout));
      const llWithout = computeMetrics(probsWithout, outcomes).logLoss;
      ablation.push({
        feature: f.name,
        logLossWithout: Number(llWithout.toFixed(6)),
        deltaLogLoss: Number((llWithout - metrics.logLoss).toFixed(6)),
      });
    }
    ablation.sort((a, b) => b.deltaLogLoss - a.deltaLogLoss);
  }

  return {
    nTrain: split.train.length,
    nTest: split.test.length,
    brier: Number(metrics.brier.toFixed(6)),
    logLoss: Number(metrics.logLoss.toFixed(6)),
    calibrationBins,
    ablation,
    leakage,
  };
}

function buildCalibrationBins(
  probs: readonly number[],
  outcomes: readonly number[],
  nBins: number,
): CalibrationBin[] {
  const bins: CalibrationBin[] = [];
  for (let b = 0; b < nBins; b++) {
    const lower = b / nBins;
    const upper = (b + 1) / nBins;
    let sumP = 0;
    let sumY = 0;
    let count = 0;
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i]!;
      const inBin = b === nBins - 1 ? p >= lower && p <= upper : p >= lower && p < upper;
      if (inBin) {
        sumP += p;
        sumY += outcomes[i]!;
        count += 1;
      }
    }
    bins.push({
      lower: Number(lower.toFixed(3)),
      upper: Number(upper.toFixed(3)),
      meanPredicted: count > 0 ? Number((sumP / count).toFixed(4)) : Number.NaN,
      meanObserved: count > 0 ? Number((sumY / count).toFixed(4)) : Number.NaN,
      count,
    });
  }
  return bins;
}

/**
 * Assert chronological order is respected — no sample may use a timestamp
 * after the train end when scored as a train sample.
 */
export function assertChronologicalIntegrity(split: ChronologicalSplit): void {
  const trainEndMs = Date.parse(split.trainEnd);
  const testStartMs = Date.parse(split.testStart);
  if (!(trainEndMs <= testStartMs)) {
    throw new Error(
      `chronological integrity violated: trainEnd ${split.trainEnd} after testStart ${split.testStart}`,
    );
  }
  for (const s of split.train) {
    if (Date.parse(s.timestamp) > trainEndMs) {
      throw new Error(`train sample timestamp ${s.timestamp} after train end ${split.trainEnd}`);
    }
  }
}
