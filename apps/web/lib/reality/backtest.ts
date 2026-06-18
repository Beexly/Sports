/**
 * Reality-engine OFFLINE backtest / out-of-sample validation harness (Workstream A4).
 *
 * WHAT THIS IS
 * A PURE, fully-testable function `runBacktest` that operates over an array of
 * historical SETTLED pick records and produces a structured `BacktestReport`.
 * It computes, SEGMENTED BY modelVersion:
 *   - Win rate, CLV beat-close rate, Brier score, ECE, reliability curve.
 *   - Edge-significance verdict (Monte-Carlo permutation test).
 *   - Edge-type and autopsy distributions (where inputs allow).
 *   - ROLLING WINDOWS (trailing-N chronological slices) to detect strategy drift.
 *   - OUT-OF-SAMPLE chronological train/holdout split, with calibration metrics
 *     computed ONLY on the holdout set to prevent look-ahead optimism.
 *
 * HEADLINE HONESTY (non-negotiable — these must ride on every report)
 *   - Win rate is reported AFTER the −110 vig break-even (52.38%). A raw win rate
 *     above 50% does not imply profit; the break-even at standard −110 juice is
 *     52.38%. We NEVER present raw win rate as profit.
 *   - Rolling windows exist because a strategy that worked once may stop. A full-
 *     sample win rate hides recency trends. Rolling windows surface them.
 *   - Out-of-sample holdout calibration is reported separately from in-sample
 *     calibration. In-sample calibration is optimistic by construction; the holdout
 *     is the honest number.
 *   - CLV beat-close rate is the LEADING indicator of real edge (we got a better
 *     number than the closing line), not the lagging win-rate scoreboard.
 *   - Self-suppresses below 100 picks with an honest "insufficient sample" result.
 *     Below-floor analysis is noise presented as signal; we refuse to do it.
 *
 * PURE: no DB, no fetch, no env, no I/O, no clock. Inputs in, structured report out.
 * Reuses engine exports: `expectedCalibrationError`, `reliabilityCurve`,
 * `edgeSignificance`, `tagEdgeType`, `classifyAutopsy`.
 *
 * OFFLINE-ONLY: never imported into the Next.js request path. The canonical runner
 * is `scripts/backtest/replay.mjs`.
 */

import {
  expectedCalibrationError,
  reliabilityCurve,
  edgeSignificance,
  tagEdgeType,
  classifyAutopsy,
  type CalibrationSample,
  type ReliabilityBin,
  type SignificanceResult,
  type EdgeType,
  type EdgeTypeSignals,
  type AutopsyClass,
  type AutopsyInput,
  type PickResult,
  type ClvVerdict,
} from "@sports/prediction-engine";

// ── Break-even constant (−110 juice, standard ATS / totals market) ─────────────
/** The win rate required to break even at standard −110 juice. Raw win rate above
 *  50% does NOT imply profit. 110 / (110 + 100) = 0.5238. */
export const BREAK_EVEN_VIG_110 = 52.38 / 100; // 0.5238

/** Minimum total picks before the backtest will produce any non-trivial result. */
export const MIN_BACKTEST_SAMPLE = 100;

// ── Input record shape ─────────────────────────────────────────────────────────

/**
 * One SETTLED pick record fed to `runBacktest`. All fields are optional-tolerant:
 * missing data degrades honestly rather than fabricating a result.
 */
export interface BacktestRecord {
  /** Engine model version string (e.g. "v5"). Segments the backtest. */
  readonly modelVersion?: string | null;
  /** ISO timestamp the pick was generated/locked. Used for chronological ordering. */
  readonly generatedAt?: string | null;
  /** Published 0–100 confidence at generation time. */
  readonly confidence?: number | null;
  /** Final settled result. */
  readonly result?: PickResult | string | null;
  /** Graded CLV verdict vs the closing line. */
  readonly clvVerdict?: ClvVerdict | string | null;
  /** Signed graded CLV value — positive = beat the close. */
  readonly clvValue?: number | null;
  /** Sport key, e.g. "americanfootball_nfl". */
  readonly sport?: string | null;
  /** Market/pick type, e.g. "SPREAD". */
  readonly market?: string | null;
  /** Null-hypothesis P(chosen side wins) with no edge — typically market-implied. */
  readonly nullProb?: number | null;
  /** Line-movement facts (feeds autopsy + edge-type). */
  readonly lineMovement?: {
    readonly closeReachedOurNumber?: boolean | null;
    readonly lockedWorseThanOpener?: boolean | null;
    readonly magnitude?: number | null;
    readonly reversal?: number | null;
  } | null;
  /** Cross-book de-vigged probability dispersion (feeds edge-type tagging). */
  readonly bookDispersion?: number | null;
  /** How many books the dispersion spans. */
  readonly bookCount?: number | null;
  /** Independent edge decision (feeds edge-type). */
  readonly edgeDecision?: "SPEAK" | "LEAN" | "PASS" | string | null;
  /** Freshness facts at lock time (feeds autopsy stale-data class). */
  readonly freshness?: {
    readonly stale?: boolean | null;
    readonly dataQualityScore?: number | null;
  } | null;
}

// ── Options ───────────────────────────────────────────────────────────────────

/**
 * Options for `runBacktest`. All optional with sensible defaults.
 */
export interface BacktestOptions {
  /**
   * Fraction of records to reserve as out-of-sample holdout (chronological tail).
   * Default 0.2 (20%). Applied after sorting by generatedAt ascending.
   */
  readonly holdoutFraction?: number;
  /**
   * Trailing-N window sizes for the rolling analysis. Default [50, 100, 200].
   * Windows larger than the total sample are silently skipped.
   */
  readonly rollingWindowSizes?: readonly number[];
  /**
   * Injectable RNG for the edge-significance Monte-Carlo. Default Math.random.
   * Inject a deterministic function for tests.
   */
  readonly random?: () => number;
  /** Monte-Carlo trials for the edge-significance test. Default 2000. */
  readonly significanceTrials?: number;
  /** Equal-width bins for ECE / reliability curve. Default 10. */
  readonly calibrationBins?: number;
}

// ── Result shapes ─────────────────────────────────────────────────────────────

/**
 * Core win-rate and calibration metrics over one sample slice.
 * NEVER present `winRate` as profit — the report must check against `breakEvenRate`.
 */
export interface SliceMetrics {
  readonly sampleSize: number;
  readonly decidedSize: number;
  /** Observed win rate over WIN+LOSS records. Null when decidedSize is 0. */
  readonly winRate: number | null;
  /** Break-even win rate at −110 standard juice (0.5238). */
  readonly breakEvenRate: number;
  /**
   * True when winRate is non-null AND winRate >= breakEvenRate.
   * A false result does NOT imply loss; it is EVIDENCE of insufficient edge over vig.
   * A true result does NOT imply profit; sample size and variance still matter.
   */
  readonly clearsBreakEven: boolean;
  /** Raw win rate minus break-even. Negative means under-break-even. */
  readonly edgeOverVig: number | null;
  /** CLV beat-close rate over CLV-graded records. The leading edge indicator. */
  readonly clvBeatCloseRate: number | null;
  /** Brier score (mean squared error of confidence/100 vs binary outcome). */
  readonly brierScore: number | null;
  /** Expected calibration error over the calibration bins. */
  readonly ece: number | null;
  /** The reliability diagram data — mean forecast vs observed rate per bin. */
  readonly reliabilityCurve: readonly ReliabilityBin[];
  /** Whether calibration holds (ECE < 0.05 threshold). Null when ECE is null. */
  readonly calibrationHolds: boolean | null;
  /** Edge-significance verdict. Null when the sample lacks nullProb data. */
  readonly edgeSignificance: SignificanceResult | null;
  /** Why edgeSignificance is null (when it is). */
  readonly edgeSignificanceNote: string;
}

/** One edge-type count row. */
export interface BacktestEdgeTypeCount {
  readonly type: EdgeType | "untaggable";
  readonly count: number;
}

/** One autopsy-class count row. */
export interface BacktestAutopsyCount {
  readonly cls: AutopsyClass;
  readonly count: number;
}

/** Metrics for one rolling window (trailing N picks chronologically). */
export interface RollingWindowResult {
  /** Window size (N). */
  readonly windowSize: number;
  /** modelVersion this window covers (null = across all versions). */
  readonly modelVersion: string | null;
  readonly metrics: SliceMetrics;
}

/** Out-of-sample split results for one modelVersion (or across all). */
export interface OutOfSampleResult {
  /** modelVersion this split covers (null = across all versions). */
  readonly modelVersion: string | null;
  /** Fraction of records in the holdout. */
  readonly holdoutFraction: number;
  /** Number of records in the training partition (chronologically first). */
  readonly trainSize: number;
  /** Number of records in the holdout partition (chronologically last). */
  readonly holdoutSize: number;
  /** Metrics on the holdout only (the honest out-of-sample number). */
  readonly holdoutMetrics: SliceMetrics;
  /**
   * In-sample metrics (training partition). Reported for comparison only.
   * In-sample calibration is optimistic by construction.
   */
  readonly inSampleMetrics: SliceMetrics;
  /**
   * True when holdout ECE < in-sample ECE — calibration actually holds out-of-sample.
   * False means calibration degrades on unseen data (a common anti-delusion finding).
   * Null when either ECE is null.
   */
  readonly calibrationHoldsOutOfSample: boolean | null;
}

/** Per-modelVersion backtest results. */
export interface ModelVersionResult {
  readonly modelVersion: string;
  /** All-records metrics for this model version. */
  readonly fullSampleMetrics: SliceMetrics;
  /** Edge-type distribution (hypothesis tags, not proof). */
  readonly edgeTypeCounts: readonly BacktestEdgeTypeCount[];
  /** Autopsy-class distribution (process not scoreboard). */
  readonly autopsyCounts: readonly BacktestAutopsyCount[];
  /** Rolling window analyses for this version. */
  readonly rollingWindows: readonly RollingWindowResult[];
  /** Out-of-sample split for this version. */
  readonly outOfSample: OutOfSampleResult;
}

/** The complete backtest report. */
export interface BacktestReport {
  /**
   * "INSUFFICIENT_SAMPLE" when total records < MIN_BACKTEST_SAMPLE.
   * The report is honest about this; we refuse to compute on noise.
   */
  readonly status: "OK" | "INSUFFICIENT_SAMPLE";
  /** Human-readable reason when status is INSUFFICIENT_SAMPLE. */
  readonly insufficientSampleNote: string | null;
  readonly totalRecords: number;
  /** Records with a decisive WIN or LOSS result. */
  readonly decidedRecords: number;
  /** Across-all-versions full-sample metrics. */
  readonly overallMetrics: SliceMetrics;
  /** Across-all-versions rolling windows. */
  readonly overallRollingWindows: readonly RollingWindowResult[];
  /** Across-all-versions out-of-sample split. */
  readonly overallOutOfSample: OutOfSampleResult;
  /** Per-modelVersion breakdowns. */
  readonly byModelVersion: readonly ModelVersionResult[];
  /** The standing honesty caveats that must ride on every report. */
  readonly caveats: readonly string[];
  /** Options used (for reproducibility in the report). */
  readonly options: {
    readonly holdoutFraction: number;
    readonly rollingWindowSizes: readonly number[];
    readonly significanceTrials: number;
    readonly calibrationBins: number;
  };
}

// ── Honesty caveats ───────────────────────────────────────────────────────────

/** Standing honesty caveats for the backtest report. */
export const BACKTEST_CAVEATS: readonly string[] = [
  "NEVER read raw win rate as profit: break-even at standard −110 juice is 52.38%. " +
    "A win rate above 50% does not cover the vig. Only a win rate above 52.38% (before sample-size " +
    "and variance considerations) implies a non-negative expected value at −110.",
  "Rolling windows exist because a strategy that worked once may stop. A full-sample win rate " +
    "hides recency degradation. Always check the trailing window for drift before drawing conclusions.",
  "The out-of-sample holdout (chronological 20% tail by default) is the honest calibration number. " +
    "In-sample calibration is optimistic by construction — the model has seen those picks. " +
    "Calibration that holds in-sample but degrades on the holdout is a red flag.",
  "CLV beat-close rate is the LEADING indicator of real edge: beating the closing line means the " +
    "market moved to our number after we locked. Win rate is the lagging scoreboard and is subject " +
    "to variance; CLV is the process grade. Prioritize CLV when the two diverge.",
  "This harness is READ-ONLY and OFFLINE. It changes NO scoring logic, NO schema, NO gate, and NO " +
    "MODEL_VERSION. Confidence remains the heuristic sum in scoring.ts. Nothing here authorizes " +
    "any public claim of edge or calibration.",
];

// ── Internal helpers ──────────────────────────────────────────────────────────

function normalizeResult(r: string | null | undefined): PickResult {
  if (r === "WIN" || r === "LOSS" || r === "PUSH" || r === "VOID" || r === "PENDING") return r;
  return "PENDING";
}

function normalizeVerdict(v: string | null | undefined): ClvVerdict | null {
  if (v === "BEAT_CLOSE" || v === "MATCHED_CLOSE" || v === "LOST_TO_CLOSE") return v;
  return null;
}

function normalizeModelVersion(mv: string | null | undefined): string {
  return typeof mv === "string" && mv.length > 0 ? mv : "unknown";
}

function sortedByGeneratedAt(records: readonly BacktestRecord[]): BacktestRecord[] {
  return [...records].sort((a, b) => {
    const ta = a.generatedAt ? Date.parse(a.generatedAt) : 0;
    const tb = b.generatedAt ? Date.parse(b.generatedAt) : 0;
    return ta - tb;
  });
}

/** Convert confidence (0–100) to probability (0–1) clamped to [0.001, 0.999]. */
function confToProb(confidence: number | null | undefined): number | null {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) return null;
  const p = Math.max(0.001, Math.min(0.999, confidence / 100));
  return p;
}

const ECE_CALIBRATION_THRESHOLD = 0.05;

/**
 * Compute the core slice metrics from a set of records.
 * PURE: no side effects. Reuses engine's ECE, reliabilityCurve, edgeSignificance.
 */
function computeSliceMetrics(
  records: readonly BacktestRecord[],
  options: {
    random?: () => number;
    significanceTrials?: number;
    calibrationBins?: number;
  } = {},
): SliceMetrics {
  const bins = options.calibrationBins ?? 10;

  let wins = 0;
  let decided = 0;
  let clvGraded = 0;
  let clvBeats = 0;
  const calibrationSamples: CalibrationSample[] = [];
  const significancePicks: { won: boolean; nullProb: number }[] = [];

  for (const rec of records) {
    const result = normalizeResult(rec.result);
    if (result === "WIN" || result === "LOSS") {
      decided += 1;
      if (result === "WIN") wins += 1;

      const p = confToProb(rec.confidence);
      if (p !== null) {
        calibrationSamples.push({ p, y: result === "WIN" ? 1 : 0 });
      }

      if (typeof rec.nullProb === "number" && Number.isFinite(rec.nullProb)) {
        significancePicks.push({ won: result === "WIN", nullProb: rec.nullProb });
      }
    }

    const verdict = normalizeVerdict(rec.clvVerdict);
    if (verdict !== null) {
      clvGraded += 1;
      if (verdict === "BEAT_CLOSE") clvBeats += 1;
    }
  }

  const winRate = decided > 0 ? wins / decided : null;
  const clvBeatCloseRate = clvGraded > 0 ? clvBeats / clvGraded : null;
  const clearsBreakEven = winRate !== null && winRate >= BREAK_EVEN_VIG_110;
  const edgeOverVig = winRate !== null ? winRate - BREAK_EVEN_VIG_110 : null;

  // Calibration metrics (Brier, ECE, reliability curve).
  let brierScore: number | null = null;
  let ece: number | null = null;
  let curve: ReliabilityBin[] = [];
  if (calibrationSamples.length > 0) {
    brierScore =
      Math.round(
        (calibrationSamples.reduce((s, c) => s + (c.p - c.y) ** 2, 0) / calibrationSamples.length) * 10000,
      ) / 10000;
    ece = expectedCalibrationError(calibrationSamples, bins);
    curve = reliabilityCurve(calibrationSamples, bins);
  }
  const calibrationHolds = ece !== null ? ece < ECE_CALIBRATION_THRESHOLD : null;

  // Edge significance.
  let sig: SignificanceResult | null = null;
  let sigNote: string;
  if (significancePicks.length === 0) {
    sigNote =
      "No decided record carried a usable null-hypothesis probability (result WIN/LOSS + nullProb). " +
      "Edge-significance not computed — we never invent a no-edge baseline.";
  } else {
    sig = edgeSignificance(significancePicks, {
      random: options.random,
      trials: options.significanceTrials ?? 2000,
    });
    sigNote = `Permutation test over ${significancePicks.length} decided picks carrying a market-implied null.`;
  }

  return {
    sampleSize: records.length,
    decidedSize: decided,
    winRate,
    breakEvenRate: BREAK_EVEN_VIG_110,
    clearsBreakEven,
    edgeOverVig,
    clvBeatCloseRate,
    brierScore,
    ece,
    reliabilityCurve: curve,
    calibrationHolds,
    edgeSignificance: sig,
    edgeSignificanceNote: sigNote,
  };
}

/** Compute edge-type and autopsy distributions for a set of records. */
function computeDistributions(records: readonly BacktestRecord[]): {
  edgeTypeCounts: BacktestEdgeTypeCount[];
  autopsyCounts: BacktestAutopsyCount[];
} {
  const edgeTypeTally = new Map<EdgeType | "untaggable", number>();
  const autopsyTally = new Map<AutopsyClass, number>();

  for (const rec of records) {
    // Edge-type tag.
    const edgeSignals: EdgeTypeSignals = {
      edgeDecision:
        rec.edgeDecision === "SPEAK" || rec.edgeDecision === "LEAN" || rec.edgeDecision === "PASS"
          ? rec.edgeDecision
          : undefined,
      homeProbDispersion: rec.bookDispersion ?? undefined,
      bookCount: rec.bookCount ?? undefined,
      lineMovementMagnitude: rec.lineMovement?.magnitude ?? undefined,
      lineMovementReversal: rec.lineMovement?.reversal ?? undefined,
    };
    const tag = tagEdgeType(edgeSignals);
    const tagKey: EdgeType | "untaggable" = tag.type ?? "untaggable";
    edgeTypeTally.set(tagKey, (edgeTypeTally.get(tagKey) ?? 0) + 1);

    // Autopsy class.
    const result = normalizeResult(rec.result);
    const verdict = normalizeVerdict(rec.clvVerdict);
    const autopsyInput: AutopsyInput = {
      result,
      clvVerdict: verdict,
      clvValue: typeof rec.clvValue === "number" ? rec.clvValue : null,
      confidence: typeof rec.confidence === "number" ? rec.confidence : null,
      freshness: rec.freshness
        ? { stale: rec.freshness.stale ?? null, dataQualityScore: rec.freshness.dataQualityScore ?? null }
        : undefined,
      lineMovement: rec.lineMovement
        ? {
            closeReachedOurNumber: rec.lineMovement.closeReachedOurNumber ?? null,
            lockedWorseThanOpener: rec.lineMovement.lockedWorseThanOpener ?? null,
          }
        : undefined,
    };
    const autopsy = classifyAutopsy(autopsyInput);
    autopsyTally.set(autopsy.cls, (autopsyTally.get(autopsy.cls) ?? 0) + 1);
  }

  const edgeTypeCounts: BacktestEdgeTypeCount[] = [...edgeTypeTally.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([type, count]) => ({ type, count }));

  const autopsyCounts: BacktestAutopsyCount[] = [...autopsyTally.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cls, count]) => ({ cls, count }));

  return { edgeTypeCounts, autopsyCounts };
}

/** Build rolling window results for a chronologically sorted array of records. */
function buildRollingWindows(
  sortedRecords: readonly BacktestRecord[],
  windowSizes: readonly number[],
  modelVersion: string | null,
  options: { random?: () => number; significanceTrials?: number; calibrationBins?: number },
): RollingWindowResult[] {
  const results: RollingWindowResult[] = [];
  for (const size of windowSizes) {
    if (size > sortedRecords.length) continue;
    const window = sortedRecords.slice(sortedRecords.length - size);
    results.push({
      windowSize: size,
      modelVersion,
      metrics: computeSliceMetrics(window, options),
    });
  }
  return results;
}

/** Build out-of-sample split results for a chronologically sorted array. */
function buildOutOfSampleSplit(
  sortedRecords: readonly BacktestRecord[],
  holdoutFraction: number,
  modelVersion: string | null,
  options: { random?: () => number; significanceTrials?: number; calibrationBins?: number },
): OutOfSampleResult {
  const holdoutSize = Math.max(1, Math.round(sortedRecords.length * holdoutFraction));
  const trainSize = sortedRecords.length - holdoutSize;
  const trainRecords = sortedRecords.slice(0, trainSize);
  const holdoutRecords = sortedRecords.slice(trainSize);

  const holdoutMetrics = computeSliceMetrics(holdoutRecords, options);
  const inSampleMetrics = computeSliceMetrics(trainRecords, options);

  let calibrationHoldsOutOfSample: boolean | null = null;
  if (holdoutMetrics.ece !== null && inSampleMetrics.ece !== null) {
    calibrationHoldsOutOfSample = holdoutMetrics.ece <= inSampleMetrics.ece;
  }

  return {
    modelVersion,
    holdoutFraction,
    trainSize,
    holdoutSize,
    holdoutMetrics,
    inSampleMetrics,
    calibrationHoldsOutOfSample,
  };
}

// ── The main exported function ─────────────────────────────────────────────────

/**
 * Run the full offline backtest over an array of historical settled-pick records.
 *
 * PURE: no DB, no fetch, no env, no clock. Inject `options.random` for determinism.
 * Self-suppresses with an honest INSUFFICIENT_SAMPLE status below MIN_BACKTEST_SAMPLE.
 *
 * Computes (SEGMENTED BY modelVersion AND as ROLLING WINDOWS AND out-of-sample split):
 *   win rate vs −110 break-even, CLV beat-close rate, Brier, ECE, reliability curve,
 *   edge-significance, edge-type distribution, autopsy distribution.
 *
 * Honest caveats always ride on the returned report. Never present raw win rate as
 * profit; never claim calibration from in-sample numbers alone.
 */
export function runBacktest(
  records: readonly BacktestRecord[] = [],
  options: BacktestOptions = {},
): BacktestReport {
  const holdoutFraction = options.holdoutFraction ?? 0.2;
  const rollingWindowSizes = options.rollingWindowSizes ?? [50, 100, 200];
  const significanceTrials = options.significanceTrials ?? 2000;
  const calibrationBins = options.calibrationBins ?? 10;
  const random = options.random;

  const sliceOptions = { random, significanceTrials, calibrationBins };

  // Insufficient-sample self-suppression — below 100 picks is noise, not signal.
  if (records.length < MIN_BACKTEST_SAMPLE) {
    const decidedCount = records.filter((r) => {
      const res = normalizeResult(r.result);
      return res === "WIN" || res === "LOSS";
    }).length;

    return {
      status: "INSUFFICIENT_SAMPLE",
      insufficientSampleNote:
        `Only ${records.length} records provided (minimum ${MIN_BACKTEST_SAMPLE} required). ` +
        `Below-floor analysis is noise presented as signal. Accumulate more settled picks ` +
        `before running the backtest. No metrics are computed.`,
      totalRecords: records.length,
      decidedRecords: decidedCount,
      overallMetrics: computeSliceMetrics([], sliceOptions),
      overallRollingWindows: [],
      overallOutOfSample: buildOutOfSampleSplit([], holdoutFraction, null, sliceOptions),
      byModelVersion: [],
      caveats: BACKTEST_CAVEATS,
      options: { holdoutFraction, rollingWindowSizes, significanceTrials, calibrationBins },
    };
  }

  // Sort all records chronologically (ascending generatedAt).
  const allSorted = sortedByGeneratedAt(records);

  // Overall metrics.
  const overallMetrics = computeSliceMetrics(allSorted, sliceOptions);
  const overallRollingWindows = buildRollingWindows(allSorted, rollingWindowSizes, null, sliceOptions);
  const overallOutOfSample = buildOutOfSampleSplit(allSorted, holdoutFraction, null, sliceOptions);

  const decidedRecords = allSorted.filter((r) => {
    const res = normalizeResult(r.result);
    return res === "WIN" || res === "LOSS";
  }).length;

  // Group records by modelVersion.
  const versionMap = new Map<string, BacktestRecord[]>();
  for (const rec of allSorted) {
    const mv = normalizeModelVersion(rec.modelVersion);
    const bucket = versionMap.get(mv) ?? [];
    bucket.push(rec);
    versionMap.set(mv, bucket);
  }

  // Per-modelVersion analysis (sorted by version key for stable output).
  const byModelVersion: ModelVersionResult[] = [...versionMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([mv, mvRecords]) => {
      const sorted = sortedByGeneratedAt(mvRecords);
      const fullSampleMetrics = computeSliceMetrics(sorted, sliceOptions);
      const { edgeTypeCounts, autopsyCounts } = computeDistributions(sorted);
      const rollingWindows = buildRollingWindows(sorted, rollingWindowSizes, mv, sliceOptions);
      const outOfSample = buildOutOfSampleSplit(sorted, holdoutFraction, mv, sliceOptions);
      return { modelVersion: mv, fullSampleMetrics, edgeTypeCounts, autopsyCounts, rollingWindows, outOfSample };
    });

  return {
    status: "OK",
    insufficientSampleNote: null,
    totalRecords: records.length,
    decidedRecords,
    overallMetrics,
    overallRollingWindows,
    overallOutOfSample,
    byModelVersion,
    caveats: BACKTEST_CAVEATS,
    options: { holdoutFraction, rollingWindowSizes, significanceTrials, calibrationBins },
  };
}
