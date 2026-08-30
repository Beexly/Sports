/**
 * Scheduled backtest harness — continuous calibration proof (mission #6).
 *
 * Replays SETTLED picks through the REAL calibration pipeline and returns a
 * structured, provenance-stamped report. This is the mechanism by which the
 * platform continuously re-proves its own calibration, on a schedule, rather
 * than only when a human opens the /calibration page.
 *
 * Pure by design: no DB access, no env reads, no Date.now() unless passed in.
 * The impure edges (querying settled picks, honoring live operator config,
 * writing the report artifact, cron auth) live in the route handler
 * (`app/api/cron/backtest-calibration/route.ts`), which is the only place
 * this module's `now`/`currentSeason`/`minSampleSize` options get filled in
 * from something real. Keeping the math pure is what makes it fixture-testable
 * and keeps this file "just glue" over the already-audited calibration math.
 *
 * Reuse, not reimplementation:
 *   - `computeCalibration` (apps/web/lib/calibration/compute.ts) — buckets,
 *     discrimination, proposals. The same function /api/calibration serves.
 *   - `groupCalibrationByModelVersion` (apps/web/lib/calibration/model-version-report.ts)
 *     — per-model-version Brier + the existing season-exclusion filter.
 *   - `brierDecomposition` (@sports/prediction-engine) — the Murphy
 *     reliability/resolution/uncertainty split. Its `uncertainty` term IS the
 *     Brier score of the climatology forecaster (always predict the base
 *     rate) — no separate "climatology" math needs to exist; this module just
 *     reads that field honestly.
 *   - `isSettledHistoricalSeason` (apps/web/lib/nfl/season-week.ts) — the
 *     existing "is this season over" predicate, generalized here to any
 *     caller-supplied `season` (not NFL-specific in its logic, only its
 *     current home). No other cross-sport season model exists in this repo
 *     today (see the route for what that means for wiring).
 *
 * Nothing here reimplements Brier, ECE, or bucket math — every score comes
 * from one of the four imports above.
 */

import { createHash } from "node:crypto";
import { computeCalibration, type CalibrationPickInput, type CalibrationReport } from "@/lib/calibration/compute";
import {
  groupCalibrationByModelVersion,
  type VersionedCalibrationSample,
} from "@/lib/calibration/model-version-report";
import { isSettledHistoricalSeason } from "@/lib/nfl/season-week";
import { brierDecomposition, type BrierDecomposition, type CalibrationSample } from "@sports/prediction-engine";

/**
 * Bumped only when this module's math/shape changes in a way that would make
 * two reports non-comparable. Stamped into every report's provenance so a
 * downstream reader can tell whether two runs are apples-to-apples.
 */
export const BACKTEST_HARNESS_VERSION = "backtest-harness-v1";

/** One settled pick, as the harness needs it. Callers own DB shape → this mapping. */
export interface BacktestPickInput extends CalibrationPickInput {
  /** The MODEL_VERSION that generated this pick — required for model-version grouping. */
  readonly modelVersion: string;
  /**
   * Season the pick's game belongs to, if the caller can derive one (only NFL
   * has a season model in this repo today — see season-week.ts). Undefined
   * means "no season judgment available"; such picks are never excluded on
   * season grounds (there is nothing to exclude them FOR).
   */
  readonly season?: number | null;
}

export interface BacktestCoverage {
  /** Every pick the harness was handed, before any exclusion. */
  readonly totalInput: number;
  /** Picks dropped because their season is not yet strictly before `currentSeason`. */
  readonly excludedCurrentSeason: number;
  /** Picks in the eligible set still awaiting a result (never counted in any score). */
  readonly excludedPending: number;
  /** WIN + LOSS + PUSH in the eligible set — feeds `calibration` (matches computeCalibration's own accounting). */
  readonly settledSampleSize: number;
  /** WIN + LOSS only in the eligible set — feeds `reliabilityDecomposition` / `climatology` (PUSH/VOID excluded, per CalibrationSample's contract). */
  readonly binarySampleSize: number;
  /** The honest-zero floor this run was judged against. */
  readonly minSampleSize: number;
  /** True once `settledSampleSize >= minSampleSize`. Gates every derived (non-raw-count) field below. */
  readonly sufficientSample: boolean;
  /** The season passed in as "current" (excluded), or null if the caller supplied none. */
  readonly currentSeason: number | null;
}

export interface BacktestModelVersionGroup {
  readonly modelVersion: string;
  readonly sampleSize: number;
  readonly brier: number;
  /** Same per-group honesty floor as a calibration bucket (MIN_PUBLISH_BUCKET_SAMPLE in compute.ts). */
  readonly sufficientSample: boolean;
}

export interface BacktestClimatologyComparison {
  /** Model's raw Brier score over the binary sample (brierDecomposition().brier). Null = withheld (insufficient sample). */
  readonly modelBrierScore: number | null;
  /** Climatology's Brier score = baseRate·(1−baseRate) — the always-predict-the-base-rate forecaster. Same withholding. */
  readonly climatologyBrierScore: number | null;
  /** climatology − model; positive means the model beats climatology. Null = withheld. */
  readonly edgeOverClimatology: number | null;
  readonly modelBeatsClimatology: boolean | null;
  readonly note: string;
}

export interface BacktestProvenanceStamp {
  readonly harnessVersion: string;
  /** SHA-256 over the exact (id, confidence, result, modelVersion, season) rows scored, sorted by id. Reproducible replay proof: same inputs → same hash. */
  readonly inputsHash: string;
  /** SHA-256 over the report body (everything except this stamp). Lets a caller detect a changed output for the same inputs (e.g. after a harness-version bump). */
  readonly outputHash: string;
  readonly generatedAt: string;
}

export interface BacktestHarnessReport {
  /** "empty" = zero settled picks; "insufficient-sample" = some, but below the floor; "ok" = fully scored. */
  readonly status: "empty" | "insufficient-sample" | "ok";
  readonly generatedAt: string;
  readonly coverage: BacktestCoverage;
  /** The exact same report shape /api/calibration serves — buckets, proposals, discrimination. */
  readonly calibration: CalibrationReport;
  /** Murphy decomposition over the binary sample. Null below the honest-zero floor. */
  readonly reliabilityDecomposition: BrierDecomposition | null;
  readonly climatology: BacktestClimatologyComparison;
  /** Empty array below the honest-zero floor — never a fabricated per-version breakdown off a thin sample. */
  readonly byModelVersion: readonly BacktestModelVersionGroup[];
  readonly provenance: BacktestProvenanceStamp;
  readonly note: string;
}

export interface RunBacktestHarnessOptions {
  readonly now?: Date;
  /** The in-progress season to exclude. Omit to apply no season exclusion. */
  readonly currentSeason?: number;
  /**
   * Honest-zero floor for `settledSampleSize`. Defaults to 100 — the same
   * literal default as MIN_SETTLED_PICKS_FOR_LEARNING in platform-config.ts.
   * Kept as a literal (not read from env/gates) so this module stays pure;
   * pass the live operator value in from the route if you want it honored.
   */
  readonly minSampleSize?: number;
}

const DEFAULT_MIN_SAMPLE_SIZE = 100;
// Mirrors compute.ts's private MIN_PUBLISH_BUCKET_SAMPLE floor for a single
// bucket's win rate to be publishable. Applied here per model-version group.
const PER_GROUP_MIN_SAMPLE = 30;

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Mirrors compute.ts's private `expectedFromConfidence` exactly (not
 * exported, so re-declared here) so the climatology comparison and
 * model-version Brier use the SAME confidence→probability mapping as the
 * bucket report — the numbers stay comparable across the two. This is a
 * one-line data mapping, not a reimplementation of any scoring algorithm.
 */
function toUnitProbability(confidence: number): number {
  return Math.max(0.01, Math.min(0.99, confidence / 100));
}

/** WIN/LOSS only — PUSH/VOID/PENDING excluded, per CalibrationSample's documented contract. */
function toBinaryOutcome(result: BacktestPickInput["result"]): 0 | 1 | null {
  if (result === "WIN") return 1;
  if (result === "LOSS") return 0;
  return null;
}

function canonicalStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalStringify(entry)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Run the harness over a set of settled picks. Pure and deterministic given
 * fixed `options.now` — same inputs always produce the same report and the
 * same `provenance.inputsHash`/`outputHash`.
 */
export function runBacktestHarness(
  picks: readonly BacktestPickInput[],
  options: RunBacktestHarnessOptions = {},
): BacktestHarnessReport {
  const now = options.now ?? new Date();
  const minSampleSize = options.minSampleSize ?? DEFAULT_MIN_SAMPLE_SIZE;
  const currentSeason = options.currentSeason ?? null;
  const generatedAt = now.toISOString();

  const inputsHash = sha256Hex(
    canonicalStringify(
      [...picks]
        .map((pick) => ({
          id: pick.id,
          confidence: pick.confidence,
          result: pick.result,
          modelVersion: pick.modelVersion,
          season: pick.season ?? null,
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    ),
  );

  // Unsettled/current-season exclusion: a pick whose season is not strictly
  // before `currentSeason` belongs to a season still in progress. Replaying
  // it through a calibration proof would leak live, still-shifting outcomes
  // into what is supposed to be a settled-history backtest. Picks with no
  // known season are never excluded here — there is nothing to judge them
  // against (see BacktestPickInput.season).
  let excludedCurrentSeason = 0;
  const eligible = picks.filter((pick) => {
    if (currentSeason === null || pick.season === undefined || pick.season === null) return true;
    const settled = isSettledHistoricalSeason(pick.season, currentSeason);
    if (!settled) excludedCurrentSeason += 1;
    return settled;
  });

  const excludedPending = eligible.filter((pick) => pick.result === "PENDING").length;

  const calibration = computeCalibration(eligible);
  const settledSampleSize = calibration.sampleSize; // WIN/LOSS/PUSH — identical accounting to computeCalibration

  const binarySamples: CalibrationSample[] = eligible.flatMap((pick) => {
    const outcome = toBinaryOutcome(pick.result);
    return outcome === null ? [] : [{ p: toUnitProbability(pick.confidence), y: outcome }];
  });
  const binarySampleSize = binarySamples.length;

  const sufficientSample = settledSampleSize >= minSampleSize;
  const decomposition = binarySampleSize > 0 ? brierDecomposition(binarySamples) : null;

  const climatology: BacktestClimatologyComparison = (() => {
    if (!sufficientSample || decomposition === null) {
      return {
        modelBrierScore: null,
        climatologyBrierScore: null,
        edgeOverClimatology: null,
        modelBeatsClimatology: null,
        note:
          settledSampleSize === 0
            ? "No settled canonical picks were provided. Backtest remains collecting."
            : `Sample below the honest-zero floor (${settledSampleSize}/${minSampleSize} settled picks) — withholding Brier-vs-climatology rather than publish a noisy read on a thin sample.`,
      };
    }
    const edge = round4(decomposition.uncertainty - decomposition.brier);
    return {
      modelBrierScore: decomposition.brier,
      climatologyBrierScore: decomposition.uncertainty,
      edgeOverClimatology: edge,
      modelBeatsClimatology: edge > 0,
      note:
        edge > 0
          ? "Model Brier score beats the climatology (always-predict-the-base-rate) baseline on this sample."
          : "Model Brier score does not beat the climatology baseline on this sample.",
    };
  })();

  const versionSamples: VersionedCalibrationSample[] = eligible.flatMap((pick) => {
    const outcome = toBinaryOutcome(pick.result);
    if (outcome === null) return [];
    return [
      {
        modelVersion: pick.modelVersion,
        probability: toUnitProbability(pick.confidence),
        outcome,
        season: pick.season ?? undefined,
      },
    ];
  });
  // `eligible` already excludes the current season, so no currentSeason arg
  // is passed here — groupCalibrationByModelVersion's own filter would be a
  // no-op on top of the harness's, and passing it twice invites drift if the
  // two predicates ever diverge.
  const byModelVersion: BacktestModelVersionGroup[] = sufficientSample
    ? groupCalibrationByModelVersion(versionSamples)
        .map((group) => ({ ...group, sufficientSample: group.sampleSize >= PER_GROUP_MIN_SAMPLE }))
        .sort((left, right) => right.sampleSize - left.sampleSize)
    : []; // honest zero: never publish a per-version breakdown off a sample too thin to trust overall

  const status: BacktestHarnessReport["status"] =
    settledSampleSize === 0 ? "empty" : sufficientSample ? "ok" : "insufficient-sample";

  const note =
    status === "empty"
      ? "No settled canonical picks were provided. Calibration remains collecting."
      : status === "insufficient-sample"
        ? `${settledSampleSize} settled picks is below the honest-zero floor of ${minSampleSize}. Coverage and raw counts are reported; derived scores (reliability decomposition, climatology comparison, model-version Brier) are withheld rather than fabricated off a thin sample.`
        : "Backtest is evidence only — a continuous re-proof of calibration, not a scoring-weight change.";

  const bodyBeforeProvenance = {
    status,
    generatedAt,
    coverage: {
      totalInput: picks.length,
      excludedCurrentSeason,
      excludedPending,
      settledSampleSize,
      binarySampleSize,
      minSampleSize,
      sufficientSample,
      currentSeason,
    },
    calibration,
    reliabilityDecomposition: sufficientSample ? decomposition : null,
    climatology,
    byModelVersion,
    note,
  } as const;

  const outputHash = sha256Hex(canonicalStringify(bodyBeforeProvenance));

  return {
    ...bodyBeforeProvenance,
    provenance: {
      harnessVersion: BACKTEST_HARNESS_VERSION,
      inputsHash,
      outputHash,
      generatedAt,
    },
  };
}
