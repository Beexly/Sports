/**
 * Reality-engine OFFLINE win-rate diagnostics aggregator (Workstream-K, slice B+D).
 *
 * WHAT THIS IS
 * A PURE, fully-testable aggregator. Given an array of EXPORTED settled-pick records
 * (the read-only shape `scripts/reality/export-picks.mjs` writes to JSON), it computes
 * a structured `DiagnosticsReport`: CLV-by-segment (sport / market / confidence band /
 * time-to-close) via the engine's own `summarizeClv`; an `edgeSignificance` verdict over
 * the decided sample; an HONEST calibration-readiness line (eligible-sample count vs the
 * engine's 100 floor — read from the input, never fabricated; "unknown" when the export
 * does not carry it); per-edge-type counts via `tagEdgeType`; per-autopsy-class counts
 * via `classifyAutopsy`; and a no-bet-quality caveat (we do not yet log rejected markets).
 *
 * It is the spec in reports/reality-engine/next-safe-implementation-slice.md (options
 * B+D as one slice), reading the segmentation shape from clv-quality-measurement-plan.md
 * and the no-bet honesty caveat from no-bet-quality-measurement-plan.md.
 *
 * WHY IT IS SAFE
 * - PURE: no DB, no fetch, no env, no I/O, no clock. Inputs in, structured report out.
 * - It IMPORTS the prediction-engine read-only (`summarizeClv`, `edgeSignificance`,
 *   `tagEdgeType`, `classifyAutopsy`) so every number traces to the engine's own math;
 *   it re-implements nothing the engine already decides.
 * - It is NEVER imported into the Next.js request path. It is the canonical
 *   implementation behind the offline `scripts/reality/diagnostics.mjs` runner only.
 * - It changes NO public behavior, NO schema, NO gate. Confidence stays the heuristic
 *   sum in scoring.ts; this is a read-only mirror.
 *
 * HONESTY (non-negotiable)
 * - Every count/rate traces to the supplied input. No fabricated win-rate or ROI.
 * - The report always carries the "building the record / calibration data-blocked at
 *   <N>/100" caveat and the "no-bet ledger not yet wired" caveat.
 * - Win/loss RESULT counts are reported, but the report never claims a calibrated win
 *   rate or edge from a sub-floor sample — it states what the sample is and what is missing.
 */

import {
  summarizeClv,
  edgeSignificance,
  tagEdgeType,
  classifyAutopsy,
  confidenceBand,
  CONFIDENCE_BANDS,
  DEFAULT_MIN_CALIBRATION_SAMPLE,
  type ClvVerdict,
  type ClvSummary,
  type SignificanceResult,
  type EdgeType,
  type EdgeTypeSignals,
  type AutopsyClass,
  type AutopsyInput,
  type PickResult,
  type ConfidenceBand,
} from "@sports/prediction-engine";

/** CLV unit — points (spread/total) vs probability (moneyline). Never mixed in a segment. */
export type DiagnosticsClvKind = "POINTS" | "PROBABILITY";

/** The pick market, mirroring the engine's PickType space at the granularity we segment on. */
export type DiagnosticsMarket = "SPREAD" | "TOTAL" | "MONEYLINE" | "OTHER";

/**
 * One exported settled-pick record — the read-only projection of a settled `Pick` row
 * (joined to its Game/Sport) that the export step writes to JSON. All fields are
 * optional-tolerant: a real export may be missing a derived signal, and the aggregator
 * must degrade honestly (counting it as "unknown") rather than fabricate.
 */
export interface SettledPickRecord {
  /** Sport key, e.g. "americanfootball_nfl". Unknown → grouped under "unknown". */
  readonly sport?: string | null;
  /** Market/pick type. Unknown values fall to "OTHER". */
  readonly market?: string | null;
  /** Final settled result. Drives the autopsy + edge-significance decided sample. */
  readonly result?: PickResult | string | null;
  /** Published access tier (FREE/PRO/...). Reported for context, never gated here. */
  readonly tier?: string | null;
  /** Published 0–100 confidence at generation. Buckets into CONFIDENCE_BANDS. */
  readonly confidence?: number | null;
  /** Graded CLV verdict vs the close (clv-capture.ts). */
  readonly clvVerdict?: ClvVerdict | string | null;
  /** Signed graded CLV value — positive = beat the close. */
  readonly clvValue?: number | null;
  /** CLV unit — keeps points and probability samples from being averaged together. */
  readonly clvKind?: DiagnosticsClvKind | string | null;
  /** ISO timestamp the pick was generated/locked. Used with commenceTime for time-to-close. */
  readonly generatedAt?: string | null;
  /** ISO kickoff timestamp. Used with generatedAt for the time-to-close bucket. */
  readonly commenceTime?: string | null;
  /**
   * Null-hypothesis P(chosen side wins) with NO edge — typically market-implied. Required
   * for the edge-significance test; records without it are excluded from that test only.
   */
  readonly nullProb?: number | null;
  /** Freshness facts at lock time (feeds the autopsy stale-data class). */
  readonly freshness?: { readonly stale?: boolean | null; readonly dataQualityScore?: number | null } | null;
  /** Line-movement facts derived from the stored Odds history (feeds autopsy + edge-type). */
  readonly lineMovement?: {
    readonly closeReachedOurNumber?: boolean | null;
    readonly lockedWorseThanOpener?: boolean | null;
    readonly magnitude?: number | null;
    readonly reversal?: number | null;
  } | null;
  /** Cross-book de-vigged P(home) dispersion in the snapshot (feeds edge-type tagging). */
  readonly bookDispersion?: number | null;
  /** How many books the dispersion spans (a one-book read is not disagreement). */
  readonly bookCount?: number | null;
  /** Independent edge decision (assessEdge) if exported — feeds the no-clear-edge default. */
  readonly edgeDecision?: "SPEAK" | "LEAN" | "PASS" | string | null;
}

/**
 * Calibration-readiness facts, READ from the export (never computed/fabricated here).
 * `eligibleSampleSize` is the count of settled, canonical, learning-eligible picks the
 * export observed in the DB. When the export cannot supply it, leave it null → the
 * report says "unknown" rather than guessing.
 */
export interface CalibrationReadinessInput {
  /** Count of learning-eligible settled picks the export saw, or null if unknown. */
  readonly eligibleSampleSize?: number | null;
}

/** Options — only injectable RNG for the edge-significance Monte-Carlo (deterministic tests). */
export interface DiagnosticsOptions {
  /** Injectable RNG in [0,1) for edgeSignificance. Default Math.random (engine default). */
  readonly random?: () => number;
  /** Monte-Carlo trials for edgeSignificance. Default the engine's 2000. */
  readonly significanceTrials?: number;
  /** Minimum sample below which a CLV segment is suppressed as "collecting" (default 20). */
  readonly minSegmentSample?: number;
}

/** Mirror the conviction module's ≥20 discipline: a 2-pick segment is noise, not signal. */
export const DEFAULT_MIN_SEGMENT_SAMPLE = 20;

/** A CLV-by-segment row: the engine's summary fanned out by one segment key. */
export interface ClvSegmentReport {
  /** e.g. "americanfootball_nfl / SPREAD / 12-48h / SHARP". */
  readonly segmentKey: string;
  readonly sport: string;
  readonly market: DiagnosticsMarket;
  readonly timeToCloseBucket: TimeToCloseBucket;
  readonly confidenceBand: ConfidenceBand | "UNBANDED";
  /** POINTS vs PROBABILITY — never mixed within a segment. */
  readonly unit: DiagnosticsClvKind;
  /** The engine's summarizeClv output for this segment. */
  readonly summary: ClvSummary;
  /** True when sampleSize < minSegmentSample — surfaced as "collecting", not hidden. */
  readonly suppressed: boolean;
}

/** Time-to-close buckets from the CLV-quality plan. */
export type TimeToCloseBucket = "<2h" | "2-12h" | "12-48h" | ">48h" | "unknown";

export interface EdgeTypeCount {
  readonly type: EdgeType | "untaggable";
  readonly count: number;
  /** True only for the engine's three detectable-now (HAVE) types. */
  readonly detectableNow: boolean;
}

export interface AutopsyCount {
  readonly cls: AutopsyClass;
  readonly count: number;
}

/** The full structured diagnostics report — the aggregator's return value. */
export interface DiagnosticsReport {
  /** Total exported records fed in. */
  readonly totalRecords: number;
  /** Records with a decisive WIN/LOSS result (the autopsy + result-aware sample). */
  readonly decidedRecords: number;
  /** Records carrying a graded CLV verdict (the CLV sample). */
  readonly clvGradedRecords: number;
  /** CLV-by-segment, one row per non-empty (sport × market × time-to-close × band × unit). */
  readonly clvBySegment: readonly ClvSegmentReport[];
  /** The global CLV rollup, split by unit (points vs probability never mixed). */
  readonly clvGlobalByUnit: readonly { readonly unit: DiagnosticsClvKind; readonly summary: ClvSummary }[];
  /**
   * Edge-significance over the DECIDED sample with an exported nullProb. Null when no
   * record carries a usable (result + nullProb) pair — we never invent a baseline.
   */
  readonly edgeSignificance: SignificanceResult | null;
  /** Why edgeSignificance is null / how many records were usable for it. */
  readonly edgeSignificanceNote: string;
  /** Per-edge-type counts via tagEdgeType (hypothesis tags, never proof). */
  readonly edgeTypeCounts: readonly EdgeTypeCount[];
  /** Per-autopsy-class counts via classifyAutopsy (process not scoreboard). */
  readonly autopsyCounts: readonly AutopsyCount[];
  /** Honest calibration-readiness line (eligible vs the 100 floor; "unknown" if absent). */
  readonly calibration: CalibrationReadinessReport;
  /** The standing honesty caveats that must ride on every report. */
  readonly caveats: readonly string[];
}

export interface CalibrationReadinessReport {
  /** Eligible learning sample the export observed, or null when unknown. */
  readonly eligibleSampleSize: number | null;
  /** The engine's activation floor (DEFAULT_MIN_CALIBRATION_SAMPLE = 100). */
  readonly floor: number;
  /** True only when eligibleSampleSize is known AND >= floor. Never true when unknown. */
  readonly meetsFloor: boolean;
  /** Plain-language, never-green-light readiness sentence. */
  readonly statusLine: string;
}

// ── internal helpers (pure) ────────────────────────────────────────────────────

const VALID_MARKETS: ReadonlySet<DiagnosticsMarket> = new Set(["SPREAD", "TOTAL", "MONEYLINE", "OTHER"]);

function normalizeMarket(market: string | null | undefined): DiagnosticsMarket {
  if (typeof market === "string") {
    const up = market.toUpperCase();
    if (VALID_MARKETS.has(up as DiagnosticsMarket)) return up as DiagnosticsMarket;
  }
  return "OTHER";
}

function normalizeUnit(kind: string | null | undefined, market: DiagnosticsMarket): DiagnosticsClvKind {
  if (kind === "POINTS" || kind === "PROBABILITY") return kind;
  // Fall back to the engine's market→unit convention: moneyline = probability, else points.
  return market === "MONEYLINE" ? "PROBABILITY" : "POINTS";
}

function normalizeResult(result: string | null | undefined): PickResult {
  if (result === "WIN" || result === "LOSS" || result === "PUSH" || result === "VOID" || result === "PENDING") {
    return result;
  }
  return "PENDING";
}

function normalizeVerdict(v: string | null | undefined): ClvVerdict | null {
  if (v === "BEAT_CLOSE" || v === "MATCHED_CLOSE" || v === "LOST_TO_CLOSE") return v;
  return null;
}

function bandOf(confidence: number | null | undefined): ConfidenceBand | "UNBANDED" {
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) return "UNBANDED";
  return confidenceBand(confidence) ?? "UNBANDED";
}

/** Hours from generation to kickoff → a coarse, honest time-to-close bucket. */
export function timeToCloseBucket(generatedAt?: string | null, commenceTime?: string | null): TimeToCloseBucket {
  if (!generatedAt || !commenceTime) return "unknown";
  const g = Date.parse(generatedAt);
  const c = Date.parse(commenceTime);
  if (!Number.isFinite(g) || !Number.isFinite(c)) return "unknown";
  const hours = (c - g) / 3_600_000;
  if (hours < 0) return "unknown"; // generated after kickoff is not a real lead time
  if (hours < 2) return "<2h";
  if (hours < 12) return "2-12h";
  if (hours < 48) return "12-48h";
  return ">48h";
}

function sportKey(sport: string | null | undefined): string {
  return typeof sport === "string" && sport.length > 0 ? sport : "unknown";
}

// ── the aggregator ───────────────────────────────────────────────────────────

/** The standing caveats. Exported so the markdown runner and tests share one source. */
export const STANDING_CAVEATS: readonly string[] = [
  "Building the record: confidence remains the heuristic sum in scoring.ts; nothing here is " +
    "wired into live confidence. These diagnostics are a read-only mirror.",
  "No-bet ledger not yet wired: we do not yet log the markets we considered and rejected, so " +
    "no-bet (gate-quality) alpha cannot be measured here. This report covers only PUBLISHED picks. " +
    "Unlock: the No-Bet Ledger (see reports/reality-engine/no-bet-quality-measurement-plan.md).",
];

/**
 * Build the structured diagnostics report from an array of exported settled-pick records.
 *
 * PURE: no DB, no fetch, no env, no clock. Every number traces to `records`. CLV is fanned
 * out per (sport × market × time-to-close × confidence band × unit) and summarized via the
 * engine's `summarizeClv`; the edge-significance verdict runs the engine's permutation test
 * over the decided sample with an exported `nullProb`; edge types and autopsy classes are
 * counted via the engine's `tagEdgeType` / `classifyAutopsy`. The calibration line is READ
 * from `readiness.eligibleSampleSize` (or "unknown") and compared to the engine's floor —
 * it is never fabricated and never reads as a green light. The standing honesty caveats
 * (building-the-record + no-bet-ledger-not-wired) always ride on the report.
 */
export function buildDiagnosticsReport(
  records: readonly SettledPickRecord[] = [],
  readiness: CalibrationReadinessInput = {},
  options: DiagnosticsOptions = {},
): DiagnosticsReport {
  const minSegment = options.minSegmentSample ?? DEFAULT_MIN_SEGMENT_SAMPLE;

  let decidedRecords = 0;
  let clvGradedRecords = 0;

  // CLV segmentation: key → { meta, items } where items are summarizeClv inputs.
  interface SegmentBucket {
    sport: string;
    market: DiagnosticsMarket;
    bucket: TimeToCloseBucket;
    band: ConfidenceBand | "UNBANDED";
    unit: DiagnosticsClvKind;
    items: { value: number; verdict: ClvVerdict }[];
  }
  const segments = new Map<string, SegmentBucket>();
  // Global rollup per unit (points vs probability — never mixed).
  const globalByUnit = new Map<DiagnosticsClvKind, { value: number; verdict: ClvVerdict }[]>();

  // Edge-type + autopsy tallies, initialized so every known label appears (count 0 is honest).
  const edgeTypeTally = new Map<EdgeType | "untaggable", number>();
  const autopsyTally = new Map<AutopsyClass, number>();

  // Edge-significance decided sample (needs result WIN/LOSS + a usable nullProb).
  const significancePicks: { won: boolean; nullProb: number }[] = [];

  for (const rec of records) {
    const market = normalizeMarket(rec.market);
    const unit = normalizeUnit(rec.clvKind, market);
    const result = normalizeResult(rec.result);
    const verdict = normalizeVerdict(rec.clvVerdict);
    const band = bandOf(rec.confidence);
    const bucket = timeToCloseBucket(rec.generatedAt, rec.commenceTime);
    const sport = sportKey(rec.sport);

    if (result === "WIN" || result === "LOSS") decidedRecords += 1;

    // ── CLV-by-segment + global rollup (only graded rows with a finite value) ──
    if (verdict !== null && typeof rec.clvValue === "number" && Number.isFinite(rec.clvValue)) {
      clvGradedRecords += 1;
      const item = { value: rec.clvValue, verdict };

      const key = `${sport} / ${market} / ${bucket} / ${band} / ${unit}`;
      let seg = segments.get(key);
      if (!seg) {
        seg = { sport, market, bucket, band, unit, items: [] };
        segments.set(key, seg);
      }
      seg.items.push(item);

      const g = globalByUnit.get(unit) ?? [];
      g.push(item);
      globalByUnit.set(unit, g);
    }

    // ── Edge-type tag (hypothesis only; counts the data-blocked default honestly) ──
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

    // ── Autopsy class (process not scoreboard; settlement-time labeler) ──
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

    // ── Edge-significance decided sample ──
    if ((result === "WIN" || result === "LOSS") && typeof rec.nullProb === "number" && Number.isFinite(rec.nullProb)) {
      significancePicks.push({ won: result === "WIN", nullProb: rec.nullProb });
    }
  }

  // CLV segments → reports (deterministic order by key).
  const clvBySegment: ClvSegmentReport[] = [...segments.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([segmentKey, seg]) => {
      const summary = summarizeClv(seg.items);
      return {
        segmentKey,
        sport: seg.sport,
        market: seg.market,
        timeToCloseBucket: seg.bucket,
        confidenceBand: seg.band,
        unit: seg.unit,
        summary,
        suppressed: summary.sampleSize < minSegment,
      };
    });

  const clvGlobalByUnit = (["POINTS", "PROBABILITY"] as const)
    .filter((u) => globalByUnit.has(u))
    .map((unit) => ({ unit, summary: summarizeClv(globalByUnit.get(unit)) }));

  // Edge significance over the decided sample (engine permutation test; null when empty).
  let edgeSig: SignificanceResult | null = null;
  let edgeSigNote: string;
  if (significancePicks.length === 0) {
    edgeSigNote =
      "No decided record carried a usable null-hypothesis probability (result WIN/LOSS + nullProb). " +
      "Edge-significance not computed — we never invent a no-edge baseline.";
  } else {
    edgeSig = edgeSignificance(significancePicks, {
      random: options.random,
      trials: options.significanceTrials,
    });
    edgeSigNote = `Permutation test over ${significancePicks.length} decided picks carrying a market-implied null.`;
  }

  // Edge-type counts: include every registry type at count 0 for an honest, stable shape.
  const allEdgeTypes: (EdgeType | "untaggable")[] = [
    "stale-injury-price",
    "derivative-market-lag",
    "book-disagreement-lag",
    "market-overcorrection",
    "public-narrative-distortion",
    "scheme-mismatch",
    "player-usage-role-change",
    "weather-underreaction",
    "ol-dl-mismatch",
    "pace-game-script-mismatch",
    "coach-tendency-mispricing",
    "prop-threshold-mispricing",
    "no-clear-edge",
    "untaggable",
  ];
  const detectableNow: ReadonlySet<EdgeType | "untaggable"> = new Set<EdgeType | "untaggable">([
    "book-disagreement-lag",
    "market-overcorrection",
    "no-clear-edge",
  ]);
  const edgeTypeCounts: EdgeTypeCount[] = allEdgeTypes
    .map((type) => ({ type, count: edgeTypeTally.get(type) ?? 0, detectableNow: detectableNow.has(type) }))
    .filter((c) => c.count > 0 || c.type === "no-clear-edge" || c.type === "untaggable");

  const autopsyCounts: AutopsyCount[] = [...autopsyTally.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cls, count]) => ({ cls, count }));

  const calibration = buildCalibrationReadiness(readiness, decidedRecords);

  return {
    totalRecords: records.length,
    decidedRecords,
    clvGradedRecords,
    clvBySegment,
    clvGlobalByUnit,
    edgeSignificance: edgeSig,
    edgeSignificanceNote: edgeSigNote,
    edgeTypeCounts,
    autopsyCounts,
    calibration,
    caveats: STANDING_CAVEATS,
  };
}

/**
 * Build the honest calibration-readiness line. `eligibleSampleSize` is READ from the
 * export; when null we say "unknown" and `meetsFloor` is false (unknown is never a
 * green light). When known, we state N/100 plainly. This never authorizes activation —
 * that is a separate owner-gated MODEL_VERSION step.
 */
export function buildCalibrationReadiness(
  readiness: CalibrationReadinessInput,
  decidedRecordsInExport: number,
): CalibrationReadinessReport {
  const floor = DEFAULT_MIN_CALIBRATION_SAMPLE;
  const eligible =
    typeof readiness.eligibleSampleSize === "number" && Number.isFinite(readiness.eligibleSampleSize)
      ? Math.max(0, Math.floor(readiness.eligibleSampleSize))
      : null;

  if (eligible === null) {
    return {
      eligibleSampleSize: null,
      floor,
      meetsFloor: false,
      statusLine:
        `Calibration eligible-sample size is UNKNOWN (the export did not supply it); ` +
        `the activation floor is ${floor}. This export observed ${decidedRecordsInExport} decided ` +
        `published picks, which is NOT the same as the learning-eligible count. Calibration remains ` +
        `data-blocked and inactive until the eligible count is known and crosses ${floor}.`,
    };
  }

  const meetsFloor = eligible >= floor;
  return {
    eligibleSampleSize: eligible,
    floor,
    meetsFloor,
    statusLine: meetsFloor
      ? `Calibration eligible sample ${eligible}/${floor} — the floor is met. This is EVIDENCE ` +
        `that a fit may be attempted offline (scripts/calibration/fit-and-validate.mjs); it is NOT ` +
        `authorization. Activation is a separate owner-gated MODEL_VERSION step.`
      : `Building the record: calibration data-blocked at ${eligible}/${floor} eligible settled picks. ` +
        `The isotonic calibrator self-suppresses below the floor; confidence stays uncalibrated.`,
  };
}
