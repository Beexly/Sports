/**
 * Live calibration metrics from canonical WIN/LOSS learning-eligible picks.
 * Shared by calibration-metrics cron and ops-truth seed (never invents rows).
 *
 * v5.2.8 Phase 2 (2026-09-05): the eligibility sample is market-anchored only.
 * A pick with no market probability is excluded and counted, never scored on
 * confidence/100. Three-way moneyline sports are excluded structurally.
 */

import type { CalibrationSample } from "@sports/prediction-engine";
import {
  brierDecomposition,
  expectedCalibrationError,
  reliabilityCurve,
} from "@sports/prediction-engine";
import type { DurableMetricsPayload } from "@/lib/ops/calibration-eligibility-durable";
import {
  MARKET_ANCHORED_SAMPLE_COMPOSITION_NOTE,
  picksToMarketAnchoredCalibrationSamples,
  type MarketAnchoredSample,
  type MarketProbabilityResolver,
} from "@/lib/calibration/live-calibration-p";
import type { CalibrationExclusionCounts } from "@/lib/calibration/proven-path-rows";
import { sliceCalibrationMetrics, type CalibrationSliceMetrics } from "@/lib/calibration/metric-slices";
import {
  bootstrapCalibrationMetricCis,
  METRIC_CI_READING_NOTE,
  type MetricCi95,
} from "@/lib/calibration/bootstrap-metric-ci";
import {
  marketPSourcesFromBySource,
  type OddsTableMarketPStats,
} from "@/lib/calibration/publish-time-market-p-loader";

export interface PickRowForCal {
  readonly confidence: number | null;
  readonly result: "WIN" | "LOSS" | string;
  readonly modelVersion: string | null;
  readonly settledAt: Date | null;
  readonly pickType?: string | null;
  readonly factorBreakdown?: unknown;
  /** Immutable publish-time receipt; its marketFairProb backs up the factor breakdown. */
  readonly proofReceipt?: { readonly marketFairProb?: number | null } | null;
  /** game.sport.key; drives the three-way moneyline exclusion and the bySport slice. */
  readonly sportKey?: string | null;
  /** WP-28 identity fields for the odds-table resolver; optional passthrough. */
  readonly id?: string | null;
  readonly gameId?: string | null;
  readonly generatedAt?: Date | null;
  readonly selection?: string | null;
  readonly homeTeamName?: string | null;
  readonly awayTeamName?: string | null;
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

export type CalibrationSampleBuild = {
  samples: CalibrationSample[];
  /** Same rows as `samples`, tagged with sport and model version for the slices. */
  taggedSamples: MarketAnchoredSample[];
  exclusions: CalibrationExclusionCounts;
  bySource: Record<string, number>;
  modelVersions: string[];
  settledFrom: string | null;
  settledTo: string | null;
  notes?: string[];
};

export function picksToCalibrationSamples(
  picks: readonly PickRowForCal[],
  options?: { readonly resolveMarketP?: MarketProbabilityResolver },
): CalibrationSampleBuild {
  const built = picksToMarketAnchoredCalibrationSamples(
    picks.map((pick) => ({
      confidence: pick.confidence,
      result: pick.result,
      pickType: pick.pickType,
      factorBreakdown: pick.factorBreakdown,
      proofReceipt: pick.proofReceipt,
      modelVersion: pick.modelVersion,
      settledAt: pick.settledAt,
      sportKey: pick.sportKey ?? null,
      id: pick.id ?? null,
      gameId: pick.gameId ?? null,
      generatedAt: pick.generatedAt ?? null,
      selection: pick.selection ?? null,
      homeTeamName: pick.homeTeamName ?? null,
      awayTeamName: pick.awayTeamName ?? null,
    })),
    options,
  );
  return {
    samples: built.samples.map((s) => ({ p: s.p, y: s.y })),
    taggedSamples: built.samples,
    exclusions: built.excluded,
    bySource: built.bySource,
    modelVersions: built.modelVersions,
    settledFrom: built.settledFrom,
    settledTo: built.settledTo,
    notes: built.notes,
  };
}

export type CalibrationBreakdowns = {
  readonly bySport: CalibrationSliceMetrics[];
  readonly byModelVersion: CalibrationSliceMetrics[];
  /** Per pick type (MONEYLINE / SPREAD / TOTAL): the pooled sample is not moneyline-only. */
  readonly byMarket: CalibrationSliceMetrics[];
  readonly brierCi95: MetricCi95 | null;
  readonly eceCi95: MetricCi95 | null;
};

/**
 * bySport / byModelVersion / byMarket slices plus the seeded bootstrap
 * intervals for the pooled Brier and ECE. Deterministic for a given sample
 * and seed.
 */
export function computeCalibrationBreakdowns(
  taggedSamples: readonly MarketAnchoredSample[],
  options?: { readonly seed?: number; readonly resamples?: number },
): CalibrationBreakdowns {
  const cis = bootstrapCalibrationMetricCis(taggedSamples, options);
  return {
    bySport: sliceCalibrationMetrics(taggedSamples, (s) => s.sportKey),
    byModelVersion: sliceCalibrationMetrics(taggedSamples, (s) => s.modelVersion),
    byMarket: sliceCalibrationMetrics(taggedSamples, (s) => s.pickType),
    brierCi95: cis?.brierCi95 ?? null,
    eceCi95: cis?.eceCi95 ?? null,
  };
}

export function buildDurableMetricsFromSamples(input: {
  samples: readonly CalibrationSample[];
  /** When present, the artifact carries bySport / byModelVersion and the CIs. */
  taggedSamples?: readonly MarketAnchoredSample[];
  exclusions?: CalibrationExclusionCounts;
  /** Builder's per-source counts; mapped to pSources (receipts versus the odds table). */
  bySource?: Readonly<Record<string, number>>;
  /** WP-28 odds-table recompute coverage, when the loader ran. */
  marketPFromOddsTable?: OddsTableMarketPStats;
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
  // The sample-composition statement travels on every artifact, whichever
  // caller built it (the ops seed passes its own notes, not the builder's).
  const callerNotes = [...(input.notes ?? [])];
  if (!callerNotes.includes(MARKET_ANCHORED_SAMPLE_COMPOSITION_NOTE)) {
    callerNotes.push(MARKET_ANCHORED_SAMPLE_COMPOSITION_NOTE);
  }

  if (input.samples.length === 0) {
    return {
      generatedAt,
      gitSha: input.gitSha ?? null,
      n: 0,
      status: "collecting",
      modelVersion,
      dateRange,
      overall: null,
      pBasis: "market_anchored",
      exclusions: input.exclusions,
      pSources: input.bySource ? marketPSourcesFromBySource(input.bySource) : undefined,
      marketPFromOddsTable: input.marketPFromOddsTable,
      notes: input.notes
        ? callerNotes
        : ["No settled non-seed WIN/LOSS samples with a market-anchored probability.", MARKET_ANCHORED_SAMPLE_COMPOSITION_NOTE],
    };
  }

  const decomp = brierDecomposition(input.samples);
  const ece = expectedCalibrationError(input.samples);
  const curve = reliabilityCurve(input.samples);
  const mce = mceFromCurve(curve);
  const breakdowns = input.taggedSamples
    ? computeCalibrationBreakdowns(input.taggedSamples)
    : null;

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
    pBasis: "market_anchored",
    exclusions: input.exclusions,
    pSources: input.bySource ? marketPSourcesFromBySource(input.bySource) : undefined,
    marketPFromOddsTable: input.marketPFromOddsTable,
    bySport: breakdowns?.bySport,
    byModelVersion: breakdowns?.byModelVersion,
    byMarket: breakdowns?.byMarket,
    brierCi95: breakdowns?.brierCi95 ?? null,
    eceCi95: breakdowns?.eceCi95 ?? null,
    notes: [
      ...callerNotes,
      "p scored for the floors: market-anchored probability only, publish-time value. Order: the proof receipt minted before kickoff (immutable), else the factor-breakdown market fair only for rows with no receipt (refreshed until settlement, so not publish-time-fixed), else the publish-time recompute from the append-only odds table (same mean-implied proportional de-vig as the receipt, MIN_BOOKMAKERS real books, rows at or before generatedAt). Picks with none are excluded and counted; confidence/100 is never scored. Internal eligibility only until publish policy.",
      ...(breakdowns ? [METRIC_CI_READING_NOTE] : []),
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
