/**
 * Identical-row score bake-off (2026-09-08, ledger C-261).
 *
 * WHY THIS EXISTS. scoreBakeoff / scoreBakeoffByMarket compare four ranking
 * scores, each on whatever rows carry that score: on the 2026-09-08 truth
 * surface the MONEYLINE rows read confidence n 745, independent_trueProb n
 * 712, marketFairProb n 135. Those are different row sets, so the gap between
 * any two cells is part score quality and part row selection, and the market
 * score is measured only where a market price exists. This module removes that
 * confound: ONE row set, every score, same outcomes, same bins.
 *
 * ROW SET. Settled canonical WIN/LOSS two-way MONEYLINE picks on which ALL of
 *   confidence/100, independent trueProb, blend_indep_conf and marketFairProb
 * are finite. Three-way moneyline sports are excluded structurally (the same
 * helper every other loader uses). Nothing else is filtered.
 *
 * MARKET PROBABILITY. Resolved in the ORDER THE CALIBRATION LOADER USES
 * (live-calibration-p.ts resolveMarketAnchoredCalibrationP): proof receipt,
 * then factor-breakdown market fair (independentEdge.marketFairProb, then the
 * top-level field), then the injected odds-table resolver. The bake-off's own
 * row builder (proven-path-rows.ts) reads the factor breakdown BEFORE the
 * receipt and never calls the resolver; that difference is exactly why the
 * by-market marketFairProb cell has n 135 while the eligibility sample has
 * n 475 on the same surface. Every row reports which source supplied its
 * market probability so the reader can see the composition.
 *
 * METRICS. Same functions as every other cell on the truth surface
 * (@sports/prediction-engine brierDecomposition, expectedCalibrationError:
 * 10 equal-width probability bins, rounded to 4 places). The /calibration chart
 * buckets by confidence in five 10-point BUCKETS (compute.ts); that is a
 * display grouping, not the floor definition, and it is not used here so the
 * numbers stay comparable with calibrationEligibility and scoreBakeoffByMarket.
 *
 * BOOTSTRAP. Seeded percentile bootstrap (mulberry32, fixed seed, 200
 * resamples by default). The SAME resample indices are applied to every score
 * (paired), so brierGapVsMarketCi95 is the interval of (score Brier minus
 * marketFairProb Brier) on the same resampled rows: an interval entirely above
 * zero means the market beats that score on the identical rows at the 95%
 * percentile level. Deterministic: two runs on the same rows give the same
 * intervals.
 *
 * SENSITIVITY. C-247 found stored FINAL scores that the ESPN feed contradicts,
 * with settled published picks on them. The contradicted game ids come from
 * `npm run ops:verify-scores` (PR #720), whose classifier needs the stored
 * games AND the live ESPN finals, so it cannot run inside this loader. The
 * builder accepts `excludeGameIds`; without it the sensitivity cell reads
 * NOT RUN with the exact command, never an estimate.
 *
 * This is MEASUREMENT ONLY. No floor, threshold, delta, pause group, gate or
 * MODEL_VERSION reads this module; nothing here changes what publishes.
 */

import {
  brierDecomposition,
  expectedCalibrationError,
  type CalibrationSample,
} from "@sports/prediction-engine";
import type { RankingScoreKind } from "@/lib/calibration/proven-path-engine";
import { mulberry32 } from "@/lib/calibration/bootstrap-calib-ci";
import { DEFAULT_METRIC_CI_RESAMPLES, type MetricCi95 } from "@/lib/calibration/bootstrap-metric-ci";
import {
  resolveMarketAnchoredCalibrationP,
  NULL_MARKET_PROBABILITY_RESOLVER,
  type MarketAnchoredPSource,
  type MarketProbabilityResolver,
  type PickForLiveCal,
} from "@/lib/calibration/live-calibration-p";
import {
  extractProvenPathProbs,
  isMoneylinePickType,
  threeWayMoneylineExclusion,
  type FactorBreakdownLike,
} from "@/lib/calibration/proven-path-rows";

/** Fixed so two runs on the same rows give the same intervals. */
export const IDENTICAL_ROW_BOOTSTRAP_SEED = 20260908;

export const IDENTICAL_ROW_SET_DEFINITION =
  "Settled canonical WIN/LOSS two-way MONEYLINE picks on which confidence/100, independent trueProb, blend_indep_conf and marketFairProb are ALL finite. marketFairProb resolved in the calibration loader's order (proof receipt, then factor-breakdown market fair, then the odds-table resolver at generatedAt). Three-way moneyline sports excluded structurally. Same metric functions and 10 equal-width probability bins as calibrationEligibility and scoreBakeoffByMarket.";

export const VERIFY_SCORES_COMMAND = "npm run ops:verify-scores -- --json";

export const IDENTICAL_ROW_SCORE_KINDS: readonly RankingScoreKind[] = [
  "confidence",
  "independent_trueProb",
  "blend_indep_conf",
  "marketFairProb",
];

export type IdenticalRowInput = {
  /** confidence/100, clamped to [0,1]. */
  readonly pConfidence: number;
  /** Raw independent trueProb (0–1). Never confidence-echo rankingP. */
  readonly pIndependent: number;
  /** Market-anchored probability for the picked side (0–1), never the synthetic 0.5. */
  readonly marketP: number;
  /** Which resolver step supplied marketP. */
  readonly marketPSource: MarketAnchoredPSource;
  readonly y: 0 | 1;
  readonly sport: string;
  readonly modelVersion: string | null;
  readonly gameId: string | null;
};

/** Why a settled MONEYLINE pick did not enter the identical row set. */
export type IdenticalRowDropReason =
  | "not_win_loss"
  | "non_moneyline_market"
  | "three_way_market"
  | "no_confidence"
  | "no_independent_trueprob"
  | "no_market_probability";

export type IdenticalRowDropCounts = Readonly<Record<IdenticalRowDropReason, number>>;

export type IdenticalRowSelection = {
  readonly rows: IdenticalRowInput[];
  /** Picks seen by the selector, before any drop. */
  readonly candidates: number;
  readonly dropped: IdenticalRowDropCounts;
};

export type IdenticalRowScoreRow = {
  readonly score: RankingScoreKind;
  readonly n: number;
  readonly brier: number | null;
  readonly ece: number | null;
  readonly murphyReliability: number | null;
  readonly murphyResolution: number | null;
  readonly murphyUncertainty: number | null;
  /** mean p on wins minus mean p on losses; null when either side is empty. */
  readonly separation: number | null;
  readonly brierCi95: MetricCi95 | null;
  readonly resolutionCi95: MetricCi95 | null;
  /**
   * Paired bootstrap interval of (this score's Brier − marketFairProb Brier)
   * on the same resampled rows. null on the marketFairProb row itself.
   */
  readonly brierGapVsMarketCi95: MetricCi95 | null;
};

export type IdenticalRowSlice = {
  readonly n: number;
  readonly scores: readonly IdenticalRowScoreRow[];
};

export type IdenticalRowSportSlice = IdenticalRowSlice & { readonly sport: string };
export type IdenticalRowModelVersionSlice = IdenticalRowSlice & { readonly modelVersion: string };

export type ContradictedFinalsSensitivity =
  | {
      readonly status: "NOT RUN";
      readonly excludedGameIds: 0;
      readonly command: string;
      readonly note: string;
    }
  | {
      readonly status: "ok";
      /** Distinct game ids in the exclusion set (whether or not they matched a row). */
      readonly excludedGameIds: number;
      /** Rows removed from the identical set by the exclusion. */
      readonly rowsRemoved: number;
      readonly table: IdenticalRowSlice;
    };

export type ScoreBakeoffIdenticalRows = {
  readonly rowSet: string;
  readonly n: number;
  readonly candidates: number;
  readonly dropped: IdenticalRowDropCounts;
  readonly marketPSources: Readonly<Record<MarketAnchoredPSource, number>>;
  readonly scores: readonly IdenticalRowScoreRow[];
  readonly bySport: readonly IdenticalRowSportSlice[];
  readonly byModelVersion: readonly IdenticalRowModelVersionSlice[];
  readonly bootstrap: { readonly resamples: number; readonly seed: number; readonly paired: true };
  readonly contradictedFinalsSensitivity: ContradictedFinalsSensitivity;
  readonly notes: readonly string[];
};

function emptyDrops(): Record<IdenticalRowDropReason, number> {
  return {
    not_win_loss: 0,
    non_moneyline_market: 0,
    three_way_market: 0,
    no_confidence: 0,
    no_independent_trueprob: 0,
    no_market_probability: 0,
  };
}

function emptySources(): Record<MarketAnchoredPSource, number> {
  return { proof_receipt: 0, factor_breakdown: 0, resolver: 0, resolver_single_book: 0 };
}

/** Pick fields the selector reads; a superset of PickForLiveCal's identity fields. */
export type PickForIdenticalRows = PickForLiveCal & {
  readonly gameId?: string | null;
};

/**
 * Select the identical row set from settled picks. Market probability follows
 * the calibration loader's resolver order (see module doc); the caller injects
 * the odds-table resolver exactly as the calibration loader does.
 */
export function selectIdenticalRows(
  picks: readonly PickForIdenticalRows[],
  resolveMarketP: MarketProbabilityResolver = NULL_MARKET_PROBABILITY_RESOLVER,
): IdenticalRowSelection {
  const rows: IdenticalRowInput[] = [];
  const dropped = emptyDrops();
  for (const pick of picks) {
    if (pick.result !== "WIN" && pick.result !== "LOSS") {
      dropped.not_win_loss += 1;
      continue;
    }
    if (!isMoneylinePickType(pick.pickType)) {
      dropped.non_moneyline_market += 1;
      continue;
    }
    if (threeWayMoneylineExclusion({ pickType: pick.pickType, sportKey: pick.sportKey })) {
      dropped.three_way_market += 1;
      continue;
    }
    if (typeof pick.confidence !== "number" || !Number.isFinite(pick.confidence)) {
      dropped.no_confidence += 1;
      continue;
    }
    const fb = (pick.factorBreakdown ?? null) as FactorBreakdownLike | null;
    const { pIndependent } = extractProvenPathProbs(fb);
    if (pIndependent == null) {
      dropped.no_independent_trueprob += 1;
      continue;
    }
    const market = resolveMarketAnchoredCalibrationP(pick, resolveMarketP);
    if (!market) {
      dropped.no_market_probability += 1;
      continue;
    }
    rows.push({
      pConfidence: Math.min(1, Math.max(0, pick.confidence / 100)),
      pIndependent,
      marketP: market.p,
      marketPSource: market.source,
      y: pick.result === "WIN" ? 1 : 0,
      sport: pick.sportKey ?? "unknown",
      modelVersion: pick.modelVersion ?? null,
      gameId: pick.gameId ?? null,
    });
  }
  return { rows, candidates: picks.length, dropped };
}

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

/** Probability for a score kind on an identical row. Every kind is defined on every row. */
export function identicalRowProbability(row: IdenticalRowInput, kind: RankingScoreKind): number {
  switch (kind) {
    case "confidence":
      return clampP(row.pConfidence);
    case "independent_trueProb":
      return clampP(row.pIndependent);
    case "blend_indep_conf":
      return clampP(0.5 * row.pConfidence + 0.5 * row.pIndependent);
    case "marketFairProb":
      return clampP(row.marketP);
  }
}

function toSamples(rows: readonly IdenticalRowInput[], kind: RankingScoreKind): CalibrationSample[] {
  return rows.map((r) => ({ p: identicalRowProbability(r, kind), y: r.y }));
}

function separationOf(samples: readonly CalibrationSample[]): number | null {
  let winSum = 0;
  let winN = 0;
  let lossSum = 0;
  let lossN = 0;
  for (const s of samples) {
    if (s.y === 1) {
      winSum += s.p;
      winN += 1;
    } else {
      lossSum += s.p;
      lossN += 1;
    }
  }
  if (winN === 0 || lossN === 0) return null;
  return winSum / winN - lossSum / lossN;
}

function percentile95(values: readonly number[], resamples: number): MetricCi95 {
  const sorted = [...values].sort((a, b) => a - b);
  const last = sorted.length - 1;
  const lo = sorted[Math.floor(0.025 * last)] ?? sorted[0] ?? 0;
  const hi = sorted[Math.ceil(0.975 * last)] ?? sorted[last] ?? 0;
  return { lo, hi, resamples };
}

/**
 * Deterministic paired resample index sets: one array of row indices per
 * resample, shared by every score so the gap interval is paired.
 */
function pairedResampleIndices(n: number, resamples: number, seed: number): number[][] {
  const rand = mulberry32(seed);
  const out: number[][] = [];
  for (let b = 0; b < resamples; b++) {
    const idx = new Array<number>(n);
    for (let i = 0; i < n; i++) idx[i] = Math.floor(rand() * n);
    out.push(idx);
  }
  return out;
}

/**
 * All four scores on one row set. Returns n 0 rows (all metrics null) on an
 * empty input; bootstrap intervals need at least two rows.
 */
export function scoreIdenticalRows(
  rows: readonly IdenticalRowInput[],
  options?: { readonly resamples?: number; readonly seed?: number },
): IdenticalRowSlice {
  const n = rows.length;
  const resamples = Math.max(1, Math.floor(options?.resamples ?? DEFAULT_METRIC_CI_RESAMPLES));
  const seed = options?.seed ?? IDENTICAL_ROW_BOOTSTRAP_SEED;

  if (n === 0) {
    return {
      n: 0,
      scores: IDENTICAL_ROW_SCORE_KINDS.map((score) => ({
        score,
        n: 0,
        brier: null,
        ece: null,
        murphyReliability: null,
        murphyResolution: null,
        murphyUncertainty: null,
        separation: null,
        brierCi95: null,
        resolutionCi95: null,
        brierGapVsMarketCi95: null,
      })),
    };
  }

  const samplesByKind = new Map<RankingScoreKind, CalibrationSample[]>();
  for (const kind of IDENTICAL_ROW_SCORE_KINDS) samplesByKind.set(kind, toSamples(rows, kind));

  // Paired bootstrap: the same index draw applied to every score.
  const canBootstrap = n >= 2;
  const draws = canBootstrap ? pairedResampleIndices(n, resamples, seed) : [];
  const briers = new Map<RankingScoreKind, number[]>();
  const resolutions = new Map<RankingScoreKind, number[]>();
  for (const kind of IDENTICAL_ROW_SCORE_KINDS) {
    briers.set(kind, []);
    resolutions.set(kind, []);
  }
  const draw: CalibrationSample[] = new Array<CalibrationSample>(n);
  for (const idx of draws) {
    for (const kind of IDENTICAL_ROW_SCORE_KINDS) {
      const src = samplesByKind.get(kind)!;
      for (let i = 0; i < n; i++) draw[i] = src[idx[i]!]!;
      const d = brierDecomposition(draw);
      briers.get(kind)!.push(d.brier);
      resolutions.get(kind)!.push(d.resolution);
    }
  }
  const marketBriers = briers.get("marketFairProb")!;

  const scores: IdenticalRowScoreRow[] = IDENTICAL_ROW_SCORE_KINDS.map((score) => {
    const samples = samplesByKind.get(score)!;
    const d = brierDecomposition(samples);
    const kindBriers = briers.get(score)!;
    const gap =
      score === "marketFairProb" || !canBootstrap
        ? null
        : percentile95(
            kindBriers.map((b, i) => b - marketBriers[i]!),
            resamples,
          );
    return {
      score,
      n,
      brier: d.brier,
      ece: expectedCalibrationError(samples),
      murphyReliability: d.reliability,
      murphyResolution: d.resolution,
      murphyUncertainty: d.uncertainty,
      separation: separationOf(samples),
      brierCi95: canBootstrap ? percentile95(kindBriers, resamples) : null,
      resolutionCi95: canBootstrap ? percentile95(resolutions.get(score)!, resamples) : null,
      brierGapVsMarketCi95: gap,
    };
  });

  return { n, scores };
}

function groupBy<K extends string>(
  rows: readonly IdenticalRowInput[],
  keyOf: (r: IdenticalRowInput) => K,
): Map<K, IdenticalRowInput[]> {
  const out = new Map<K, IdenticalRowInput[]>();
  for (const r of rows) {
    const k = keyOf(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}

export type BuildIdenticalRowBakeoffOptions = {
  readonly resamples?: number;
  readonly seed?: number;
  /**
   * Game ids whose stored FINAL the feed contradicts (output of
   * VERIFY_SCORES_COMMAND). When absent or empty the sensitivity cell is
   * NOT RUN; it is never estimated.
   */
  readonly excludeGameIds?: ReadonlySet<string>;
};

/** Full identical-row bake-off artifact from a selection. */
export function buildScoreBakeoffIdenticalRows(
  selection: IdenticalRowSelection,
  options?: BuildIdenticalRowBakeoffOptions,
): ScoreBakeoffIdenticalRows {
  const { rows } = selection;
  const resamples = Math.max(1, Math.floor(options?.resamples ?? DEFAULT_METRIC_CI_RESAMPLES));
  const seed = options?.seed ?? IDENTICAL_ROW_BOOTSTRAP_SEED;
  const bootstrapOptions = { resamples, seed };

  const marketPSources = emptySources();
  for (const r of rows) marketPSources[r.marketPSource] += 1;

  const pooled = scoreIdenticalRows(rows, bootstrapOptions);

  const bySport: IdenticalRowSportSlice[] = [...groupBy(rows, (r) => r.sport)]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sport, list]) => ({ sport, ...scoreIdenticalRows(list, bootstrapOptions) }));

  const byModelVersion: IdenticalRowModelVersionSlice[] = [
    ...groupBy(rows, (r) => r.modelVersion ?? "unknown"),
  ]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([modelVersion, list]) => ({ modelVersion, ...scoreIdenticalRows(list, bootstrapOptions) }));

  const exclude = options?.excludeGameIds;
  let contradictedFinalsSensitivity: ContradictedFinalsSensitivity;
  if (exclude && exclude.size > 0) {
    const kept = rows.filter((r) => r.gameId == null || !exclude.has(r.gameId));
    contradictedFinalsSensitivity = {
      status: "ok",
      excludedGameIds: exclude.size,
      rowsRemoved: rows.length - kept.length,
      table: scoreIdenticalRows(kept, bootstrapOptions),
    };
  } else {
    contradictedFinalsSensitivity = {
      status: "NOT RUN",
      excludedGameIds: 0,
      command: VERIFY_SCORES_COMMAND,
      note:
        "C-247: some stored FINAL scores are contradicted by the ESPN feed they were ingested from, so every outcome above is a measurement over that record. The classifier (scripts/ops/lib/score-reconciliation.ts, PR #720) needs the stored games and the live ESPN finals, so it does not run here. Run the command, collect the contradicted game ids, and pass them as excludeGameIds to buildScoreBakeoffIdenticalRows to fill this cell. It is never estimated.",
    };
  }

  const notes: string[] = [
    "Identical-row bake-off: every score is measured on the SAME rows with the SAME outcomes, so a gap between two cells is score quality, not row selection. scoreBakeoffByMarket measures each score on whatever rows carry it and is kept for coverage transparency.",
    `Row set: ${rows.length} of ${selection.candidates} candidate picks. Dropped: ${JSON.stringify(selection.dropped)}. marketFairProb sources: ${JSON.stringify(marketPSources)}.`,
    "Market probability order is the calibration loader's (proof receipt, then factor-breakdown market fair, then the odds-table resolver at generatedAt); the by-market bake-off reads the factor breakdown before the receipt and never calls the resolver, which is why its marketFairProb n is smaller than the eligibility sample on the same surface.",
    `Bootstrap: seeded percentile intervals (2.5% to 97.5%), ${resamples} resamples, seed ${seed}, PAIRED across scores so brierGapVsMarketCi95 is the interval of (score Brier minus marketFairProb Brier) on the same resampled rows. Deterministic.`,
    "ECE uses the engine's 10 equal-width probability bins, the same function as calibrationEligibility; the /calibration chart's five confidence BUCKETS (compute.ts) are a display grouping and are not used here.",
    "Measurement only: no floor, threshold, delta, pause group, gate or MODEL_VERSION reads this table.",
  ];

  return {
    rowSet: IDENTICAL_ROW_SET_DEFINITION,
    n: rows.length,
    candidates: selection.candidates,
    dropped: selection.dropped,
    marketPSources,
    scores: pooled.scores,
    bySport,
    byModelVersion,
    bootstrap: { resamples, seed, paired: true },
    contradictedFinalsSensitivity,
    notes,
  };
}
