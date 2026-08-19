/**
 * Live calibration metrics from canonical WIN/LOSS learning-eligible picks.
 * Shared by calibration-metrics cron and ops-truth seed (never invents rows).
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
} from "@sports/prediction-engine";
import type { DurableMetricsPayload } from "@/lib/ops/calibration-eligibility-durable";
import { picksToHonestCalibrationSamples } from "@/lib/calibration/live-calibration-p";

export interface PickRowForCal {
  readonly confidence: number | null;
  readonly result: "WIN" | "LOSS" | string;
  readonly modelVersion: string | null;
  readonly settledAt: Date | null;
  readonly pickType?: string | null;
  readonly factorBreakdown?: unknown;
}

function mceFromCurve(
  bins: Array<{ count: number; meanForecast: number; observedRate: number }>,
): number {
  let mce = 0;
  for (const b of bins) {
    if (b.count === 0) continue;
    mce = Math.max(mce, Math.abs(b.meanForecast - b.observedRate));
  }
  return mce;
}

export function picksToCalibrationSamples(picks: readonly PickRowForCal[]): {
  samples: CalibrationSample[];
  modelVersions: string[];
  settledFrom: string | null;
  settledTo: string | null;
  notes?: string[];
} {
  // Honest absolute-probability path (maps OFF; no invent).
  const honest = picksToHonestCalibrationSamples(
    picks.map((pick) => ({
      confidence: pick.confidence,
      result: pick.result,
      pickType: pick.pickType,
      factorBreakdown: pick.factorBreakdown,
      modelVersion: pick.modelVersion,
      settledAt: pick.settledAt,
    })),
  );
  return {
    samples: honest.samples.map((s) => ({ p: s.p, y: s.y })),
    modelVersions: honest.modelVersions,
    settledFrom: honest.settledFrom,
    settledTo: honest.settledTo,
    notes: honest.notes,
  };
}

export function buildDurableMetricsFromSamples(input: {
  samples: readonly CalibrationSample[];
  modelVersions: readonly string[];
  settledFrom: string | null;
  settledTo: string | null;
  gitSha?: string | null;
  notes?: readonly string[];
}): DurableMetricsPayload {
  const generatedAt = new Date().toISOString();
  const modelVersion =
    input.modelVersions.length === 1
      ? input.modelVersions[0]!
      : input.modelVersions.length > 1
        ? `mixed:${input.modelVersions.slice(0, 4).join(",")}`
        : null;
  const dateRange =
    input.settledFrom && input.settledTo
      ? `${input.settledFrom.slice(0, 10)}…${input.settledTo.slice(0, 10)}`
      : null;

  if (input.samples.length === 0) {
    return {
      generatedAt,
      gitSha: input.gitSha ?? null,
      n: 0,
      status: "collecting",
      modelVersion,
      dateRange,
      overall: null,
      notes: input.notes ?? ["No settled non-seed WIN/LOSS samples."],
    };
  }

  const decomp = brierDecomposition(input.samples);
  const ece = expectedCalibrationError(input.samples);
  const curve = reliabilityCurve(input.samples);
  const mce = mceFromCurve(curve);

  return {
    generatedAt,
    gitSha: input.gitSha ?? null,
    n: input.samples.length,
    status: "ok",
    modelVersion,
    dateRange,
    overall: {
      brier: decomp.brier,
      ece,
      mce,
      murphy: {
        reliability: decomp.reliability,
        resolution: decomp.resolution,
        uncertainty: decomp.uncertainty,
      },
    },
    notes: [
      ...(input.notes ?? []),
      "p from confidence/100 provisional; internal eligibility only until publish policy.",
    ],
  };
}

/** Prisma where for canonical learning samples (matches calibration-metrics cron). */
export const CANONICAL_LEARNING_PICK_WHERE = {
  isPublished: true,
  isBootstrap: false,
  result: { in: ["WIN" as const, "LOSS" as const] },
  signalSnapshot: { is: { eligibleForLearning: true } },
  NOT: { modelVersion: "v5.0.0-seed" },
};
