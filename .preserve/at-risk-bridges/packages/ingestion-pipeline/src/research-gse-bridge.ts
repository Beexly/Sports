/**
 * Fail-closed bridge from `@sports/prediction-engine`'s research / gse-score /
 * ladder / pipeline families into the ingestion surface.
 *
 * Design rules this file is built around (a betting engine, so they are not
 * optional):
 *
 *  1. Every `evalX` returns `ResearchEval<T>` — never a throw, never a
 *     half-populated object. A refusal carries a specific, actionable reason.
 *  2. Kernel output is RE-VALIDATED, not trusted. Finiteness, legal range,
 *     interval containment and internal consistency are all re-checked here so
 *     a kernel regression surfaces as a closed gate rather than a published
 *     number.
 *  3. Nothing is imputed, defaulted, smoothed or placeholder-ed. A missing
 *     input fails; a degenerate output fails.
 *  4. Cross-fitting is only reported WITH its fold structure. A doubly-robust
 *     ATT whose folds are invisible is a laundered number.
 *  5. Every point estimate ships with its uncertainty, or it is refused.
 *  6. A decision surface is never named like a probability.
 *  7. "Declined" (the engine said no) is a different answer from "could not
 *     compute" (we could not run the kernel), and the return shapes keep them
 *     apart.
 *
 * Everything here is pure. No I/O, no clock, no `Math.random`, no database.
 */

import {
  runCapital,
  runNullSuite,
  runPlantedComparison,
  type CapitalPath,
  type NullReport,
  type PlantedReport,
} from "@sports/prediction-engine/src/research/capital.js";
import {
  DEFAULT_PANEL,
  generateDmlPanel,
  timeIndex,
  type DmlGameRow,
  type PanelDesign,
} from "@sports/prediction-engine/src/research/dml-panel.js";
import {
  FILTER_INTERVENTION_GAIN,
  N_FOLDS,
  TRIM_HIGH,
  TRIM_LOW,
  diagnoseQbOut,
  sensitivityInterval,
  type DmlDiagnostics,
} from "@sports/prediction-engine/src/research/dml-qb-out.js";
import {
  MAX_PARTICLES,
  MAX_UNITS,
  NbRbpf,
  logNbPmf,
  type NbRbpfDiagnostics,
  type NbRbpfSnapshot,
} from "@sports/prediction-engine/src/research/nb-rbpf.js";
import {
  generateSyntheticGames,
  type SyntheticDesign,
  type SyntheticGame,
} from "@sports/prediction-engine/src/research/synthetic-nb.js";
import {
  aggregateModelParliament,
  type ModelParliamentInput,
  type ModelVote,
} from "@sports/prediction-engine/src/gse-score/model-parliament.js";
import {
  computeNoBetStrength,
  type NoBetDecision,
  type NoBetRiskFactor,
  type NoBetRiskInput,
} from "@sports/prediction-engine/src/gse-score/no-bet-strength.js";
import {
  assessCalibrationContract,
  type CalibrationContractInput,
  type CalibrationContractStatus,
} from "@sports/prediction-engine/src/gse-score/calibration-contract.js";
import {
  calibrationActionCap,
  calibrationRequiresHardPass,
  calibrationRiskSeverity,
} from "@sports/prediction-engine/src/gse-score/calibration-action-policy.js";
import {
  evaluateFeatureContract,
  type FeatureContractInput,
  type FeatureSourceStatus,
  type GseFeatureValue,
} from "@sports/prediction-engine/src/gse-score/feature-contract.js";
import {
  computeGseActionScore,
  type GseActionDecision,
  type GseActionScoreInput,
} from "@sports/prediction-engine/src/gse-score/gse-action-score.js";
import { reduceLadder } from "@sports/prediction-engine/src/ladder/reduce.js";
import {
  fanoutGameSettledHeartbeat,
  type GameSettledFanoutInput,
  type GameSettledFanoutResult,
} from "@sports/prediction-engine/src/ladder/heartbeat.js";
import { LiveOrchestrator } from "@sports/prediction-engine/src/pipeline/live-orchestrator.js";
import type { TeamStrengthFilterOptions } from "@sports/prediction-engine/src/team-strength-filter.js";
import type {
  GameSettledEvent,
  GameSettledFanoutLedgerEntry,
  GameSettledStage,
} from "@sports/types";
import type { LadderEvent, LadderState, LadderTrack, PricingRung } from "@sports/types";

/** Terminal status of a bridged kernel call. A refusal is a first-class answer. */
export type ResearchEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): ResearchEval<never> {
  return { ok: false, reason };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isClosed(value: number, lo: number, hi: number): boolean {
  return Number.isFinite(value) && value >= lo && value <= hi;
}

function inOpen(value: number, lo: number, hi: number): boolean {
  return Number.isFinite(value) && value > lo && value < hi;
}

function describeError(err: unknown): string {
  if (err instanceof RangeError) return `RangeError: ${err.message}`;
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return `non-Error throw: ${String(err)}`;
}

/** Two-sided normal quantile for 1 - alpha/2; the kernels hard-code 1.96 at alpha = 0.05. */
const Z_975 = 1.96;

const LADDER_TRACK_SET: ReadonlySet<string> = new Set<LadderTrack>(["fantasy", "betting"]);
const PRICING_RUNGS: readonly PricingRung[] = ["FOUNDING", "PROVEN", "ESTABLISHED", "AUTHORITY"];
const RUNG_RANK: Readonly<Record<PricingRung, number>> = {
  FOUNDING: 0,
  PROVEN: 1,
  ESTABLISHED: 2,
  AUTHORITY: 3,
};
const NO_BET_DECISIONS: readonly NoBetDecision[] = ["CLEAR", "WATCH", "SOFT_PASS", "HARD_PASS"];
const NO_BET_FACTORS: readonly NoBetRiskFactor[] = [
  "MISSING_REQUIRED_DATA",
  "STALE_DATA",
  "MODEL_DISAGREEMENT",
  "CALIBRATION_NOT_VALIDATED",
  "SOURCE_RIGHTS_BLOCKED",
  "LOW_EVIDENCE",
  "MARKET_VOLATILITY",
  "RESPONSIBLE_GAMING",
];
const CALIBRATION_STATUSES: readonly CalibrationContractStatus[] = [
  "VALIDATED",
  "WATCH",
  "INSUFFICIENT_SAMPLE",
  "DRIFTING",
  "BLOCKED",
];
const GSE_DECISIONS: readonly GseActionDecision[] = ["PLAY", "LEAN", "WATCH", "PASS", "HARD_PASS"];
const FEATURE_SOURCE_STATUSES: readonly FeatureSourceStatus[] = ["allowed", "restricted", "unknown"];

// ─────────────────────────────────────────────────────────────────────────────
// (a1) research/dml-panel + research/dml-qb-out — doubly-robust, cross-fitted
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The exact fold structure `dml-qb-out.ts` will use, reconstructed from the
 * rows the caller supplied so the number can never be read without it.
 *
 * The kernel sorts by `season*100 + week`, then by team, then splits the
 * sorted sequence into `N_FOLDS` contiguous blocks; fold `k` is scored with a
 * nuisance model trained on folds `0..k-1` (strictly earlier weeks). Fold 0 is
 * therefore a TRAIN-ONLY fold and is never itself scored — `rowsScored` is
 * always strictly less than `rowsSupplied`.
 */
export interface DmlFoldStructure {
  readonly requestedFolds: number;
  readonly foldsUsed: number;
  readonly strategy: "time-ordered contiguous blocks; fold k scored on nuisances trained on folds 0..k-1";
  readonly foldSizes: readonly number[];
  readonly trainSizesBeforeEachScoredFold: readonly number[];
  readonly scoredFoldIndices: readonly number[];
  readonly rowsSupplied: number;
  readonly rowsScored: number;
  /** Train-set size floor the kernel applies; a fold below it is skipped whole. */
  readonly minTrainRows: number;
  /** True when the caller's own fold assignment matched the kernel's exactly. */
  readonly callerAssignmentsMatched: boolean | null;
}

export interface DmlUncertainty {
  readonly standardError: number;
  readonly ciLow: number;
  readonly ciHigh: number;
  readonly halfWidth: number;
  /** `lower <= point <= upper`, re-verified here rather than assumed. */
  readonly ciBoundsPoint: boolean;
  /** True only when the 95% interval excludes zero. A point estimate is not this. */
  readonly separatesFromZero: boolean;
  readonly z: number;
  /** False when n < 2 would leave the SE undefined. Such a call is refused. */
  readonly quantified: boolean;
}

export interface DmlQbOutAttInput {
  /** Real observed rows. At least 20 must land in the train-only fold 0. */
  readonly rows: readonly DmlGameRow[];
  /**
   * REQUIRED. The number of cross-fitting folds the caller believes are being
   * used. It must equal the kernel's hard-coded `N_FOLDS`; a mismatch is
   * refused rather than silently re-interpreting the estimate.
   */
  readonly nFolds: number;
  /** Optional independent fold assignment, in the SAME order as `rows`. Verified against the kernel. */
  readonly foldAssignments?: readonly number[];
  /** Default 20. Minimum number of cross-fitted score rows that may be published. */
  readonly minScoredRows?: number;
  /** Deterministic placebo resample seed. Default 7 (the kernel default). */
  readonly placeboSeed?: number;
  /** Unobserved-confounding sensitivity multiplier. Default 2. Must be >= 1. */
  readonly sensitivityGamma?: number;
}

export interface DmlQbOutAttResult {
  readonly att: number;
  readonly nTreated: number;
  readonly nTrimmed: number;
  readonly impliedLogitShift: number;
  readonly filterGain: number;
  readonly overlap: {
    readonly meanPropensity: number;
    readonly minPropensity: number;
    readonly maxPropensity: number;
    readonly trimmedFraction: number;
    readonly trimLow: number;
    readonly trimHigh: number;
    readonly allPropensitiesInsideHardClamp: boolean;
  };
  readonly folds: DmlFoldStructure;
  readonly uncertainty: DmlUncertainty;
  readonly placebo: {
    readonly seed: number;
    readonly att: number;
    readonly ciLow: number;
    readonly ciHigh: number;
    readonly containsZero: boolean;
  };
  readonly sensitivity: {
    readonly gamma: number;
    readonly interval: readonly [number, number];
    readonly boundsPoint: boolean;
  };
  readonly sutvaNote: string;
  readonly priced: false;
  readonly status: "shadow";
}

const DML_MIN_TRAIN_ROWS = 20;

function resolveDmlFoldStructure(
  rows: readonly DmlGameRow[],
  requestedFolds: number,
  callerAssignments: readonly number[] | undefined,
): DmlFoldStructure | { readonly error: string } {
  const sorted = [...rows].sort((a, b) => timeIndex(a) - timeIndex(b) || a.team - b.team);
  const n = sorted.length;
  const foldSizes: number[] = Array.from({ length: N_FOLDS }, () => 0);
  for (let i = 0; i < n; i++) {
    const k = Math.min(N_FOLDS - 1, Math.floor((i * N_FOLDS) / n));
    const slot = foldSizes[k];
    if (slot === undefined) {
      return { error: `internal: fold bucket ${k} is outside [0, ${N_FOLDS})` };
    }
    foldSizes[k] = slot + 1;
  }

  const scoredFoldIndices: number[] = [];
  const trainSizes: number[] = [];
  let rowsScored = 0;
  let trainSoFar = 0;
  for (let k = 0; k < N_FOLDS; k++) {
    const size = foldSizes[k] ?? 0;
    if (k === 0) {
      trainSoFar = size;
      continue;
    }
    if (trainSoFar >= DML_MIN_TRAIN_ROWS) {
      scoredFoldIndices.push(k);
      trainSizes.push(trainSoFar);
      rowsScored += size;
    }
    trainSoFar += size;
  }

  let assignmentsMatched: boolean | null = null;
  if (callerAssignments !== undefined) {
    if (callerAssignments.length !== rows.length) {
      return {
        error: `foldAssignments has ${callerAssignments.length} entries but rows has ${rowsSuppliedOf(rows)}`,
      };
    }
    const observed = Array.from({ length: N_FOLDS }, () => 0);
    for (const fold of callerAssignments) {
      if (!Number.isInteger(fold) || fold < 0 || fold >= N_FOLDS) {
        return { error: `foldAssignments must be integers in [0, ${N_FOLDS}), received ${String(fold)}` };
      }
      observed[fold] = (observed[fold] ?? 0) + 1;
    }
    for (let k = 0; k < N_FOLDS; k++) {
      if ((observed[k] ?? 0) !== (foldSizes[k] ?? 0)) {
        return {
          error:
            `foldAssignments disagree with the kernel's time-ordered blocking at fold ${k}: ` +
            `caller ${observed[k] ?? 0} rows, kernel ${foldSizes[k] ?? 0} rows`,
        };
      }
    }
    assignmentsMatched = true;
  }

  return {
    requestedFolds,
    foldsUsed: N_FOLDS,
    strategy: "time-ordered contiguous blocks; fold k scored on nuisances trained on folds 0..k-1",
    foldSizes,
    trainSizesBeforeEachScoredFold: trainSizes,
    scoredFoldIndices,
    rowsSupplied: rows.length,
    rowsScored,
    minTrainRows: DML_MIN_TRAIN_ROWS,
    callerAssignmentsMatched: assignmentsMatched,
  };
}

function rowsSuppliedOf(rows: readonly DmlGameRow[]): number {
  return rows.length;
}

function validateDmlRows(rows: readonly DmlGameRow[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row === undefined) {
      return `rows[${i}] is undefined`;
    }
    if (!Number.isInteger(row.season) || row.season < 0) return `rows[${i}].season must be a non-negative integer`;
    if (!Number.isInteger(row.week) || row.week < 0) return `rows[${i}].week must be a non-negative integer`;
    if (!Number.isInteger(row.team) || row.team < 0) return `rows[${i}].team must be a non-negative integer`;
    if (!Number.isInteger(row.opponent) || row.opponent < 0) return `rows[${i}].opponent must be a non-negative integer`;
    if (row.treatment !== 0 && row.treatment !== 1) return `rows[${i}].treatment must be 0 or 1`;
    if (row.win !== 0 && row.win !== 1) return `rows[${i}].win must be 0 or 1`;
    if (!isFiniteNumber(row.restDays)) return `rows[${i}].restDays must be finite`;
    if (!isFiniteNumber(row.travelKm) || row.travelKm < 0) return `rows[${i}].travelKm must be finite and >= 0`;
    if (!isFiniteNumber(row.strengthMean)) return `rows[${i}].strengthMean must be finite`;
    if (!isFiniteNumber(row.strengthVar) || row.strengthVar <= 0) return `rows[${i}].strengthVar must be > 0`;
    if (!isFiniteNumber(row.opponentStrength)) return `rows[${i}].opponentStrength must be finite`;
  }
  return null;
}

/**
 * Cross-fitted doubly-robust ATT for "starting QB out or limited".
 *
 * Refuses, rather than reports, when: the caller's fold count does not match
 * the kernel's; the caller's own fold assignment does not reproduce the
 * kernel's time-ordered blocking; fewer than `minScoredRows` rows survive
 * cross-fitting; no treated unit survives; the CI does not bound the point
 * estimate; or the ATT is far enough from 0.5 that the kernel's implied-logit
 * conversion is undefined (it silently reports 0 in that case, which would
 * read as "no shift" — a lie, so the call is closed here instead).
 */
export function evalDmlQbOutAtt(input: DmlQbOutAttInput): ResearchEval<DmlQbOutAttResult> {
  if (input === null || typeof input !== "object") {
    return fail("input must be an object");
  }
  const { rows, nFolds } = input;
  if (!Array.isArray(rows)) return fail("rows must be an array");
  if (rows.length === 0) return fail("rows is empty; there is no panel to cross-fit");
  if (!Number.isInteger(nFolds) || nFolds < 2) {
    return fail(`nFolds must be an integer >= 2, received ${String(nFolds)}`);
  }
  if (nFolds !== N_FOLDS) {
    return fail(
      `nFolds ${nFolds} does not match the kernel's hard-coded N_FOLDS ${N_FOLDS}; ` +
        "an ATT cross-fitted with a different number of folds is a different estimator and will not be reported here",
    );
  }
  const minScoredRows = input.minScoredRows ?? 20;
  if (!Number.isInteger(minScoredRows) || minScoredRows < 2) {
    return fail(`minScoredRows must be an integer >= 2, received ${String(minScoredRows)}`);
  }
  const placeboSeed = input.placeboSeed ?? 7;
  if (!Number.isFinite(placeboSeed) || !Number.isInteger(placeboSeed)) {
    return fail(`placeboSeed must be a finite integer, received ${String(placeboSeed)}`);
  }
  const gamma = input.sensitivityGamma ?? 2;
  if (!isFiniteNumber(gamma) || gamma < 1) {
    return fail(`sensitivityGamma must be finite and >= 1, received ${String(gamma)}`);
  }
  const rowError = validateDmlRows(rows);
  if (rowError !== null) return fail(rowError);

  const foldResolution = resolveDmlFoldStructure(rows, nFolds, input.foldAssignments);
  if ("error" in foldResolution) return fail(foldResolution.error);
  const folds = foldResolution;

  if ((folds.foldSizes[0] ?? 0) < DML_MIN_TRAIN_ROWS) {
    return fail(
      `time-ordered fold 0 holds ${folds.foldSizes[0] ?? 0} rows, below the kernel's ${DML_MIN_TRAIN_ROWS}-row ` +
        "train floor; no fold would be scored at all",
    );
  }
  if (folds.rowsScored < minScoredRows) {
    return fail(
      `cross-fitting scored ${folds.rowsScored} of ${rows.length} rows, below minScoredRows ${minScoredRows}`,
    );
  }

  let diagnostics: DmlDiagnostics;
  try {
    diagnostics = diagnoseQbOut(rows, placeboSeed);
  } catch (err) {
    return fail(`diagnoseQbOut threw ${describeError(err)}`);
  }

  const est = diagnostics.estimate;
  if (!isFiniteNumber(est.att)) return fail(`kernel produced a non-finite att (${String(est.att)})`);
  if (!isFiniteNumber(est.se) || est.se < 0) {
    return fail(`kernel produced an unusable standard error (${String(est.se)})`);
  }
  if (!isFiniteNumber(est.ciLow) || !isFiniteNumber(est.ciHigh)) {
    return fail("kernel produced a non-finite confidence interval");
  }
  if (est.ciHigh < est.ciLow) {
    return fail(`confidence interval is inverted: ciLow ${est.ciLow} > ciHigh ${est.ciHigh}`);
  }
  if (est.att < est.ciLow || est.att > est.ciHigh) {
    return fail(
      `confidence interval does not bound the point estimate: att ${est.att} outside [${est.ciLow}, ${est.ciHigh}]`,
    );
  }
  if (folds.rowsScored < 2) {
    return fail(`cross-fitting produced ${folds.rowsScored} scored rows; a standard error is undefined at n < 2`);
  }
  if (est.n !== folds.rowsScored) {
    return fail(
      `kernel scored ${est.n} rows but the declared fold structure scores ${folds.rowsScored}; refusing a mislabelled ATT`,
    );
  }
  if (est.nTreated < 1) {
    return fail("no treated unit survived cross-fitting; the ATT has no treatment arm");
  }
  if (!isClosed(est.att, -1, 1)) return fail(`att ${est.att} is outside the [-1, 1] win-probability scale`);
  if (Math.abs(est.att) >= 0.5) {
    return fail(
      `att ${est.att} drives p = 0.5 + att outside (0, 1), so the implied logit shift is undefined; ` +
        "the kernel would report 0.0 there, which reads as no effect, so this call is closed",
    );
  }
  if (!isFiniteNumber(est.impliedLogitShift)) return fail("impliedLogitShift is non-finite");
  if (!inOpen(est.minPropensity, 0, 1) || !inOpen(est.maxPropensity, 0, 1)) {
    return fail(
      `propensity range [${est.minPropensity}, ${est.maxPropensity}] is not strictly inside (0, 1); overlap is broken`,
    );
  }
  if (est.minPropensity > est.maxPropensity) {
    return fail(`propensity range is inverted: min ${est.minPropensity} > max ${est.maxPropensity}`);
  }
  if (!isClosed(est.meanPropensity, est.minPropensity, est.maxPropensity)) {
    return fail("meanPropensity lies outside the observed [min, max] propensity range");
  }
  if (est.nTrimmed < 0 || est.nTrimmed > est.n) return fail(`nTrimmed ${est.nTrimmed} is outside [0, ${est.n}]`);
  if (est.priced !== false) return fail("kernel estimate is no longer priced:false; shadow contract broken");
  if (est.status !== "shadow") return fail(`kernel estimate status is "${String(est.status)}", expected "shadow"`);
  if (!isNonEmptyString(diagnostics.sutvaNote)) return fail("sutvaNote is missing");
  if (!isFiniteNumber(diagnostics.placeboAtt)) return fail("placebo att is non-finite");
  if (!isFiniteNumber(diagnostics.placeboCiLow) || !isFiniteNumber(diagnostics.placeboCiHigh)) {
    return fail("placebo confidence interval is non-finite");
  }
  if (diagnostics.placeboCiHigh < diagnostics.placeboCiLow) return fail("placebo confidence interval is inverted");
  if (!Number.isInteger(diagnostics.sensitivityGamma) || diagnostics.sensitivityGamma < 1) {
    return fail(`sensitivityGamma ${diagnostics.sensitivityGamma} is not an integer >= 1`);
  }
  const sens = diagnostics.sensitivityInterval;
  if (sens.length !== 2 || !isFiniteNumber(sens[0]) || !isFiniteNumber(sens[1])) {
    return fail("sensitivity interval is not a finite pair");
  }
  const sensLow = sens[0] ?? Number.NaN;
  const sensHigh = sens[1] ?? Number.NaN;
  if (sensHigh < sensLow) return fail("sensitivity interval is inverted");
  if (est.att < sensLow || est.att > sensHigh) return fail("sensitivity interval does not contain the ATT");
  // Independent recomputation of the widening the kernel claims to have applied.
  const expectedSens: readonly [number, number] = sensitivityInterval(est, gamma);
  if (Math.abs((expectedSens[0] ?? 0) - sensLow) > 1e-9 || Math.abs((expectedSens[1] ?? 0) - sensHigh) > 1e-9) {
    return fail(
      `sensitivity interval [${sensLow}, ${sensHigh}] does not match an independent recomputation at gamma ${gamma}`,
    );
  }

  const halfWidth = (est.ciHigh - est.ciLow) / 2;
  return {
    ok: true,
    data: {
      att: est.att,
      nTreated: est.nTreated,
      nTrimmed: est.nTrimmed,
      impliedLogitShift: est.impliedLogitShift,
      filterGain: FILTER_INTERVENTION_GAIN,
      overlap: {
        meanPropensity: est.meanPropensity,
        minPropensity: est.minPropensity,
        maxPropensity: est.maxPropensity,
        trimmedFraction: est.n > 0 ? est.nTrimmed / est.n : 0,
        trimLow: TRIM_LOW,
        trimHigh: TRIM_HIGH,
        allPropensitiesInsideHardClamp: est.minPropensity >= 0.001 && est.maxPropensity <= 0.999,
      },
      folds,
      uncertainty: {
        standardError: est.se,
        ciLow: est.ciLow,
        ciHigh: est.ciHigh,
        halfWidth,
        ciBoundsPoint: est.ciLow <= est.att && est.att <= est.ciHigh,
        separatesFromZero: est.ciLow > 0 || est.ciHigh < 0,
        z: Z_975,
        quantified: est.se > 0,
      },
      placebo: {
        seed: placeboSeed,
        att: diagnostics.placeboAtt,
        ciLow: diagnostics.placeboCiLow,
        ciHigh: diagnostics.placeboCiHigh,
        containsZero: diagnostics.placeboContainsZero,
      },
      sensitivity: {
        gamma,
        interval: [sensLow, sensHigh],
        boundsPoint: est.att >= sensLow && est.att <= sensHigh,
      },
      sutvaNote: diagnostics.sutvaNote,
      priced: false,
      status: "shadow",
    },
  };
}

/**
 * Deterministic generator pass-through. A synthetic panel is a research fixture,
 * not product data — the result is stamped `synthetic: true` so a downstream
 * caller cannot mistake a seeded draw for an observed one.
 */
export interface DmlPanelFixtureInput {
  readonly seed: number;
  readonly design?: Partial<PanelDesign>;
  readonly defaultDesign: typeof DEFAULT_PANEL;
}

export interface DmlPanelFixture {
  readonly rows: readonly DmlGameRow[];
  readonly design: PanelDesign;
  readonly treatedRows: number;
  readonly wins: number;
  readonly synthetic: true;
  readonly priced: false;
  readonly status: "shadow";
}

export function evalDmlPanelFixture(input: DmlPanelFixtureInput): ResearchEval<DmlPanelFixture> {
  if (!isFiniteNumber(input.seed) || !Number.isInteger(input.seed)) {
    return fail(`seed must be a finite integer, received ${String(input.seed)}`);
  }
  const merged: PanelDesign = { ...input.defaultDesign, ...(input.design ?? {}) };
  const designError = validatePanelDesign(merged);
  if (designError !== null) return fail(designError);

  let rows: DmlGameRow[];
  try {
    rows = generateDmlPanel(input.seed, merged);
  } catch (err) {
    return fail(`generateDmlPanel threw ${describeError(err)}`);
  }
  if (rows.length === 0) return fail("generateDmlPanel returned no rows for the requested design");
  const rowError = validateDmlRows(rows);
  if (rowError !== null) return fail(`generated panel failed validation: ${rowError}`);
  const treatedRows = rows.filter((r) => r.treatment === 1).length;
  if (treatedRows === 0) return fail("generated panel has no treated rows; the ATT would have no treatment arm");
  const wins = rows.reduce((sum, r) => sum + r.win, 0);
  return {
    ok: true,
    data: { rows, design: merged, treatedRows, wins, synthetic: true, priced: false, status: "shadow" },
  };
}

function validatePanelDesign(design: PanelDesign): string | null {
  if (!Number.isInteger(design.nTeams) || design.nTeams < 2) return "design.nTeams must be an integer >= 2";
  if (!Number.isInteger(design.nWeeks) || design.nWeeks < 1) return "design.nWeeks must be an integer >= 1";
  if (!Number.isInteger(design.nSeasons) || design.nSeasons < 1) return "design.nSeasons must be an integer >= 1";
  if (!isFiniteNumber(design.plantedAtt)) return "design.plantedAtt must be finite";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// (a2) research/synthetic-nb + research/nb-rbpf — hierarchical NB particle filter
// ─────────────────────────────────────────────────────────────────────────────

export interface NbLogPmfInput {
  readonly y: number;
  readonly mu: number;
  readonly phi: number;
}

export interface NbLogPmfResult {
  readonly logPmf: number;
  readonly pmf: number;
  /** NB2 variance-to-mean ratio, 1 + mu/phi. This is why phi is load-bearing. */
  readonly varianceToMeanRatio: number;
}

export function evalNbLogPmf(input: NbLogPmfInput): ResearchEval<NbLogPmfResult> {
  if (!Number.isInteger(input.y) || input.y < 0) {
    return fail(`y must be a non-negative integer, received ${String(input.y)}`);
  }
  if (!isFiniteNumber(input.mu) || input.mu <= 0) return fail(`mu must be finite and > 0, received ${String(input.mu)}`);
  if (!isFiniteNumber(input.phi) || input.phi <= 0) return fail(`phi must be finite and > 0, received ${String(input.phi)}`);
  let logPmf: number;
  try {
    logPmf = logNbPmf(input.y, input.mu, input.phi);
  } catch (err) {
    return fail(`logNbPmf threw ${describeError(err)}`);
  }
  if (!isFiniteNumber(logPmf)) return fail(`logNbPmf returned a non-finite value for y=${input.y}`);
  if (logPmf === -1e12) {
    return fail(`logNbPmf refused y=${input.y} at mu=${input.mu}, phi=${input.phi} (its -1e12 sentinel)`);
  }
  const pmf = Math.exp(logPmf);
  if (!isClosed(pmf, 0, 1)) return fail(`pmf ${pmf} recovered from the log is outside [0, 1]`);
  return { ok: true, data: { logPmf, pmf, varianceToMeanRatio: 1 + input.mu / input.phi } };
}

export interface NbRbpDesign {
  readonly nTeams: number;
  readonly nPitchers: number;
  readonly nParks: number;
  readonly nUmpires: number;
  readonly nGames: number;
  readonly intercept: number;
  readonly phi: number;
  readonly planted: boolean;
}

export interface NbRbpfInput {
  /** REQUIRED. No unseeded stochastic model output is auditable. */
  readonly seed: number;
  readonly design: NbRbpDesign;
  readonly nParticles: number;
  readonly essThreshold: number;
  readonly liuWestDelta: number;
  /** Report the predictive P(Y > line) for these game indices only. Default: all. */
  readonly predictOnly?: readonly number[];
}

export interface NbRbpfGamePrediction {
  readonly index: number;
  readonly home: number;
  readonly away: number;
  readonly y: number;
  readonly line: number;
  /** Predictive P(Y > line) computed BEFORE this game was folded in. */
  readonly predictedOver: number;
  /** 1 when the realised total beat the line. Null when y === line (push). */
  readonly realisedOver: 0 | 1 | null;
}

export interface NbRbpfResult {
  readonly design: NbRbpDesign;
  readonly seed: number;
  readonly nParticles: number;
  readonly games: readonly NbRbpfGamePrediction[];
  readonly realisedOverMean: number;
  readonly meanPredictedOver: number;
  readonly brierScore: number;
  readonly pushCount: number;
  readonly diagnostics: NbRbpfDiagnostics;
  readonly synthetic: true;
  readonly priced: false;
  readonly status: "shadow";
}

function validateNbDesign(design: NbRbpDesign): string | null {
  if (!Number.isInteger(design.nTeams) || design.nTeams < 2 || design.nTeams > MAX_UNITS) {
    return `design.nTeams must be an integer in [2, ${MAX_UNITS}], received ${String(design.nTeams)}`;
  }
  if (!Number.isInteger(design.nPitchers) || design.nPitchers < 1 || design.nPitchers > MAX_UNITS) {
    return `design.nPitchers must be an integer in [1, ${MAX_UNITS}], received ${String(design.nPitchers)}`;
  }
  if (!Number.isInteger(design.nParks) || design.nParks < 1 || design.nParks > MAX_UNITS) {
    return `design.nParks must be an integer in [1, ${MAX_UNITS}], received ${String(design.nParks)}`;
  }
  if (!Number.isInteger(design.nUmpires) || design.nUmpires < 1 || design.nUmpires > MAX_UNITS) {
    return `design.nUmpires must be an integer in [1, ${MAX_UNITS}], received ${String(design.nUmpires)}`;
  }
  if (!Number.isInteger(design.nGames) || design.nGames < 1) {
    return `design.nGames must be an integer >= 1, received ${String(design.nGames)}`;
  }
  if (!isFiniteNumber(design.intercept)) return "design.intercept must be finite";
  if (!isFiniteNumber(design.phi) || design.phi <= 0) return `design.phi must be finite and > 0, received ${String(design.phi)}`;
  return null;
}

/**
 * Runs the hierarchical NB Rao-Blackwellised particle filter over a seeded
 * synthetic design, predicting P(total > line) BEFORE each game is folded in.
 *
 * The design must carry real between-unit variance (`planted: true`) to mean
 * anything: a uniform fixture collapses to the intercept-only mean and the
 * filter degenerates. Both arms are runnable and the caller chooses.
 */
export function evalNbRbpfPredictOver(input: NbRbpfInput): ResearchEval<NbRbpfResult> {
  if (!isFiniteNumber(input.seed) || !Number.isInteger(input.seed)) {
    return fail(`seed must be a finite integer, received ${String(input.seed)}`);
  }
  const designError = validateNbDesign(input.design);
  if (designError !== null) return fail(designError);
  if (!Number.isInteger(input.nParticles) || input.nParticles < 1 || input.nParticles > MAX_PARTICLES) {
    return fail(`nParticles must be an integer in [1, ${MAX_PARTICLES}], received ${String(input.nParticles)}`);
  }
  if (!isFiniteNumber(input.essThreshold) || input.essThreshold <= 0 || input.essThreshold > 1) {
    return fail(`essThreshold must lie in (0, 1], received ${String(input.essThreshold)}`);
  }
  if (!isFiniteNumber(input.liuWestDelta) || input.liuWestDelta <= 0 || input.liuWestDelta > 1) {
    return fail(`liuWestDelta must lie in (0, 1], received ${String(input.liuWestDelta)}`);
  }

  const fullDesign: SyntheticDesign = {
    nTeams: input.design.nTeams,
    nPitchers: input.design.nPitchers,
    nParks: input.design.nParks,
    nUmpires: input.design.nUmpires,
    nGames: input.design.nGames,
    intercept: input.design.intercept,
    phi: input.design.phi,
    planted: input.design.planted,
  };

  let observed: readonly SyntheticGame[];
  try {
    observed = generateSyntheticGames(input.seed, fullDesign);
  } catch (err) {
    return fail(`generateSyntheticGames threw ${describeError(err)}`);
  }
  if (observed.length !== fullDesign.nGames) {
    return fail(`generateSyntheticGames returned ${observed.length} games for a design requesting ${fullDesign.nGames}`);
  }

  const predictOnly: ReadonlySet<number> | null =
    input.predictOnly === undefined ? null : new Set(input.predictOnly);
  if (predictOnly !== null) {
    for (const idx of predictOnly) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= observed.length) {
        return fail(`predictOnly index ${String(idx)} is outside [0, ${observed.length})`);
      }
    }
  }

  let filter: NbRbpf;
  try {
    filter = new NbRbpf({
      seed: input.seed,
      nTeams: fullDesign.nTeams,
      nPitchers: fullDesign.nPitchers,
      nParks: fullDesign.nParks,
      nUmpires: fullDesign.nUmpires,
      nParticles: input.nParticles,
      essThreshold: input.essThreshold,
      liuWestDelta: input.liuWestDelta,
    });
  } catch (err) {
    return fail(`NbRbpf construction threw ${describeError(err)}`);
  }

  const predictions: NbRbpfGamePrediction[] = [];
  let overCount = 0;
  let brierSum = 0;
  let predictedSum = 0;
  let pushCount = 0;
  for (let i = 0; i < observed.length; i++) {
    const game = observed[i];
    if (game === undefined) {
      return fail(`generated game ${i} is undefined`);
    }
    let predictedOver: number;
    try {
      predictedOver = filter.predictOver(game);
    } catch (err) {
      return fail(`predictOver threw at game ${i}: ${describeError(err)}`);
    }
    if (!inOpen(predictedOver, 0, 1)) {
      return fail(`predictOver returned ${predictedOver} at game ${i}, outside the open unit interval`);
    }
    if (predictOnly === null || predictOnly.has(i)) {
      const realisedOver: 0 | 1 | null = game.y > game.line ? 1 : game.y < game.line ? 0 : null;
      predictions.push({
        index: i,
        home: game.home,
        away: game.away,
        y: game.y,
        line: game.line,
        predictedOver,
        realisedOver,
      });
      predictedSum += predictedOver;
      if (realisedOver === null) {
        pushCount += 1;
      } else {
        overCount += realisedOver;
        brierSum += (predictedOver - realisedOver) ** 2;
      }
    }
    try {
      filter.update(game);
    } catch (err) {
      return fail(`update threw at game ${i}: ${describeError(err)}`);
    }
  }

  if (predictions.length === 0) return fail("predictOnly selected no games, so there is nothing to report");
  const decided = predictions.length - pushCount;
  if (decided < 1) return fail("every predicted game pushed against the line; there is no realised outcome to score");

  let diagnostics: NbRbpfDiagnostics;
  try {
    diagnostics = filter.diagnostics();
  } catch (err) {
    return fail(`diagnostics threw ${describeError(err)}`);
  }
  if (!diagnostics.weightsFinite) return fail("particle weights are not finite; the cloud has degenerated");
  if (!isClosed(diagnostics.weightSum, 1 - 1e-9, 1 + 1e-9)) {
    return fail(`normalised particle weights sum to ${diagnostics.weightSum}, not 1`);
  }
  if (!isFiniteNumber(diagnostics.ess) || diagnostics.ess <= 0 || diagnostics.ess > input.nParticles + 1e-9) {
    return fail(`effective sample size ${diagnostics.ess} is outside (0, ${input.nParticles}]`);
  }
  if (!isFiniteNumber(diagnostics.essFraction) || diagnostics.essFraction <= 0 || diagnostics.essFraction > 1 + 1e-9) {
    return fail(`effective sample size fraction ${diagnostics.essFraction} is outside (0, 1]`);
  }
  if (diagnostics.observations !== observed.length) {
    return fail(
      `filter absorbed ${diagnostics.observations} observations for ${observed.length} games; the fold loop lost a game`,
    );
  }
  if (diagnostics.priced !== false || diagnostics.status !== "shadow") {
    return fail("filter diagnostics no longer carry priced:false / status:\"shadow\"");
  }

  return {
    ok: true,
    data: {
      design: input.design,
      seed: input.seed,
      nParticles: input.nParticles,
      games: predictions,
      realisedOverMean: overCount / decided,
      meanPredictedOver: predictedSum / predictions.length,
      brierScore: brierSum / decided,
      pushCount,
      diagnostics,
      synthetic: true,
      priced: false,
      status: "shadow",
    },
  };
}

export interface NbSnapshotInput {
  readonly seed: number;
  readonly design: NbRbpDesign;
  readonly nParticles: number;
  /** Fold this many games into the filter before snapshotting. */
  readonly gamesBeforeSnapshot: number;
  /** Then fold this many more, so the restored filter can be compared against the original. */
  readonly gamesAfterSnapshot: number;
}

export interface NbSnapshotRestoreResult {
  readonly nParticles: number;
  readonly snapshot: NbRbpfSnapshot;
  readonly predictedOverOriginal: number;
  readonly predictedOverRestored: number;
  /** True only when the two predictions are bit-identical, not merely close. */
  readonly bitIdentical: boolean;
  readonly diagnosticsOriginal: NbRbpfDiagnostics;
  readonly diagnosticsRestored: NbRbpfDiagnostics;
  readonly synthetic: true;
  readonly priced: false;
  readonly status: "shadow";
}

/**
 * Snapshot/restore is only worth anything if it resumes the SAME particle
 * cloud and the SAME RNG stream. This asserts bit-identity, not closeness:
 * a restored filter that merely approximates the original is a different model.
 */
export function evalNbSnapshotRestore(input: NbSnapshotInput): ResearchEval<NbSnapshotRestoreResult> {
  if (!isFiniteNumber(input.seed) || !Number.isInteger(input.seed)) {
    return fail(`seed must be a finite integer, received ${String(input.seed)}`);
  }
  const designError = validateNbDesign(input.design);
  if (designError !== null) return fail(designError);
  if (!Number.isInteger(input.nParticles) || input.nParticles < 1 || input.nParticles > MAX_PARTICLES) {
    return fail(`nParticles must be an integer in [1, ${MAX_PARTICLES}], received ${String(input.nParticles)}`);
  }
  const before = input.gamesBeforeSnapshot;
  const after = input.gamesAfterSnapshot;
  if (!Number.isInteger(before) || before < 1) return fail(`gamesBeforeSnapshot must be an integer >= 1, received ${String(before)}`);
  if (!Number.isInteger(after) || after < 1) return fail(`gamesAfterSnapshot must be an integer >= 1, received ${String(after)}`);
  if (before + after > input.design.nGames) {
    return fail(
      `gamesBeforeSnapshot ${before} + gamesAfterSnapshot ${after} exceeds design.nGames ${input.design.nGames}`,
    );
  }

  const design: SyntheticDesign = {
    nTeams: input.design.nTeams,
    nPitchers: input.design.nPitchers,
    nParks: input.design.nParks,
    nUmpires: input.design.nUmpires,
    nGames: input.design.nGames,
    intercept: input.design.intercept,
    phi: input.design.phi,
    planted: input.design.planted,
  };

  let games: readonly SyntheticGame[];
  try {
    games = generateSyntheticGames(input.seed, design);
  } catch (err) {
    return fail(`generateSyntheticGames threw ${describeError(err)}`);
  }

  const build = (): NbRbpf =>
    new NbRbpf({
      seed: input.seed,
      nTeams: design.nTeams,
      nPitchers: design.nPitchers,
      nParks: design.nParks,
      nUmpires: design.nUmpires,
      nParticles: input.nParticles,
    });

  let original: NbRbpf;
  try {
    original = build();
  } catch (err) {
    return fail(`NbRbpf construction threw ${describeError(err)}`);
  }
  for (let i = 0; i < before; i++) {
    const g = games[i];
    if (g === undefined) return fail(`generated game ${i} is undefined`);
    try {
      original.update(g);
    } catch (err) {
      return fail(`update threw at game ${i} before the snapshot: ${describeError(err)}`);
    }
  }

  let snapshot: NbRbpfSnapshot;
  let restored: NbRbpf;
  try {
    snapshot = original.snapshot();
    restored = NbRbpf.restore(snapshot);
  } catch (err) {
    return fail(`snapshot/restore threw ${describeError(err)}`);
  }
  if (snapshot.version !== 1) return fail(`snapshot version ${String(snapshot.version)} is not 1`);
  if (snapshot.observations !== before) {
    return fail(`snapshot records ${snapshot.observations} observations but ${before} games were folded in`);
  }

  for (let i = before; i < before + after; i++) {
    const g = games[i];
    if (g === undefined) return fail(`generated game ${i} is undefined`);
    try {
      original.update(g);
    } catch (err) {
      return fail(`update threw at game ${i} on the original filter: ${describeError(err)}`);
    }
  }
  for (let i = before; i < before + after; i++) {
    const g = games[i];
    if (g === undefined) return fail(`generated game ${i} is undefined`);
    try {
      restored.update(g);
    } catch (err) {
      return fail(`update threw at game ${i} on the restored filter: ${describeError(err)}`);
    }
  }

  const probe = games[before + after - 1];
  if (probe === undefined) return fail("probe game is undefined");
  let predictedOverOriginal: number;
  let predictedOverRestored: number;
  try {
    predictedOverOriginal = original.predictOver(probe);
    predictedOverRestored = restored.predictOver(probe);
  } catch (err) {
    return fail(`predictOver threw during the post-restore comparison: ${describeError(err)}`);
  }
  if (!inOpen(predictedOverOriginal, 0, 1) || !inOpen(predictedOverRestored, 0, 1)) {
    return fail("post-restore predictive probabilities are outside the open unit interval");
  }
  const bitIdentical = predictedOverOriginal === predictedOverRestored;
  if (!bitIdentical) {
    return fail(
      `restored filter predicted ${predictedOverRestored} where the original predicted ${predictedOverOriginal}; ` +
        "snapshot/restore did not resume the same cloud and RNG stream",
    );
  }
  const diagnosticsOriginal = original.diagnostics();
  const diagnosticsRestored = restored.diagnostics();
  if (diagnosticsOriginal.ess !== diagnosticsRestored.ess) {
    return fail(
      `restored filter ESS ${diagnosticsRestored.ess} differs from the original ${diagnosticsOriginal.ess}`,
    );
  }
  if (diagnosticsOriginal.resampleCount !== diagnosticsRestored.resampleCount) {
    return fail("restored filter resample count diverged from the original");
  }

  return {
    ok: true,
    data: {
      nParticles: input.nParticles,
      snapshot,
      predictedOverOriginal,
      predictedOverRestored,
      bitIdentical,
      diagnosticsOriginal,
      diagnosticsRestored,
      synthetic: true,
      priced: false,
      status: "shadow",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (a3) research/capital — fractional e-process capital, null arm, planted arm
// ─────────────────────────────────────────────────────────────────────────────

export interface RunCapitalInput {
  readonly seed: number;
  readonly planted: boolean;
  readonly adaptiveLambda?: boolean;
  readonly openLoop?: boolean;
  readonly design?: Partial<Omit<SyntheticDesign, "planted">>;
  readonly filter?: { readonly nParticles?: number };
}

export interface RunCapitalResult {
  readonly path: CapitalPath;
  readonly openLoop: boolean;
  readonly planted: boolean;
  readonly lambdaMode: "fixed" | "adaptive";
  /**
   * Under the open-loop arm the forecast IS the market, so every e-value is
   * exactly 1 and the capital path is identically 1. Surfaced explicitly
   * because a non-1 open-loop capital is a broken market comparison.
   */
  readonly openLoopCapitalIsExactlyOne: boolean;
  readonly terminalFinite: boolean;
  readonly maxCapitalExceedsTwenty: boolean;
  readonly synthetic: true;
  readonly priced: false;
  readonly status: "shadow";
}

const SYNTHETIC_DEFAULTS: Omit<SyntheticDesign, "planted"> = {
  nTeams: 8,
  nPitchers: 8,
  nParks: 4,
  nUmpires: 4,
  nGames: 80,
  intercept: Math.log(8.5),
  phi: 12,
};

function validateSyntheticDesignPatch(
  patch: Partial<Omit<SyntheticDesign, "planted">> | undefined,
): string | null {
  if (patch === undefined) return null;
  const designError = validateNbDesign({ ...SYNTHETIC_DEFAULTS, ...patch, planted: false });
  return designError === null ? null : designError.replace("design.", "design override ");
}

export function evalRunCapital(input: RunCapitalInput): ResearchEval<RunCapitalResult> {
  if (!isFiniteNumber(input.seed) || !Number.isInteger(input.seed)) {
    return fail(`seed must be a finite integer, received ${String(input.seed)}`);
  }
  if (typeof input.planted !== "boolean") return fail("planted must be a boolean");
  const designError = validateSyntheticDesignPatch(input.design);
  if (designError !== null) return fail(designError);
  const nParticles = input.filter?.nParticles ?? 24;
  if (!Number.isInteger(nParticles) || nParticles < 1 || nParticles > MAX_PARTICLES) {
    return fail(`filter.nParticles must be an integer in [1, ${MAX_PARTICLES}], received ${String(nParticles)}`);
  }

  const openLoop = input.openLoop === true;
  let path: CapitalPath;
  try {
    path = runCapital({
      seed: input.seed,
      planted: input.planted,
      adaptiveLambda: input.adaptiveLambda === true,
      openLoop,
      ...(input.design === undefined ? {} : { design: { ...input.design, planted: input.planted } }),
      filter: { nParticles },
    });
  } catch (err) {
    return fail(`runCapital threw ${describeError(err)}`);
  }

  if (!isFiniteNumber(path.terminal) || path.terminal <= 0) {
    return fail(`capital terminal ${String(path.terminal)} is not a finite positive number; the e-process collapsed`);
  }
  if (!isFiniteNumber(path.maxCapital) || path.maxCapital < 1) {
    return fail(`capital max ${String(path.maxCapital)} is not finite and >= 1`);
  }
  if (path.maxCapital < path.terminal) {
    return fail(`capital max ${path.maxCapital} is below the terminal value ${path.terminal}`);
  }
  if (!Number.isInteger(path.n) || path.n < 1) {
    return fail(`capital ran over ${String(path.n)} decided games; nothing was scored`);
  }
  if (path.exceeded20 !== path.maxCapital > 20) {
    return fail(`exceeded20 (${path.exceeded20}) disagrees with maxCapital ${path.maxCapital}`);
  }
  if (openLoop) {
    // Open loop predicts the market, so every e-value is 1 and capital cannot move.
    if (path.terminal !== 1 || path.maxCapital !== 1) {
      return fail(
        `open-loop capital moved (terminal ${path.terminal}, max ${path.maxCapital}); the open-loop baseline is defined as identically 1`,
      );
    }
    if (path.exceeded20) return fail("open-loop capital exceeded 20, which is impossible by construction");
  }

  return {
    ok: true,
    data: {
      path,
      openLoop,
      planted: input.planted,
      lambdaMode: input.adaptiveLambda === true ? "adaptive" : "fixed",
      openLoopCapitalIsExactlyOne: openLoop ? path.terminal === 1 : false,
      terminalFinite: Number.isFinite(path.terminal),
      maxCapitalExceedsTwenty: path.exceeded20,
      synthetic: true,
      priced: false,
      status: "shadow",
    },
  };
}

export interface CapitalNullSuiteInput {
  /** 1..200. Bounded because each seed runs a full particle filter. */
  readonly seeds: number;
  readonly startSeed?: number;
}

export interface CapitalNullSuiteResult {
  readonly report: NullReport;
  /** `rate === exceeded20 / seeds`, re-derived here rather than trusted. */
  readonly rateMatchesCount: boolean;
  /** `pass === rate <= alpha`, re-derived here rather than trusted. */
  readonly passMatchesAlpha: boolean;
  /** The e-process type-I claim, restated so a reader cannot infer it from `rate` alone. */
  readonly typeOneClaim: string;
  readonly synthetic: true;
  readonly priced: false;
  readonly status: "shadow";
}

export function evalCapitalNullSuite(input: CapitalNullSuiteInput): ResearchEval<CapitalNullSuiteResult> {
  if (!Number.isInteger(input.seeds) || input.seeds < 1 || input.seeds > 200) {
    return fail(`seeds must be an integer in [1, 200], received ${String(input.seeds)}`);
  }
  const startSeed = input.startSeed ?? 1;
  if (!Number.isInteger(startSeed)) return fail(`startSeed must be an integer, received ${String(startSeed)}`);

  let report: NullReport;
  try {
    report = runNullSuite(input.seeds, startSeed);
  } catch (err) {
    return fail(`runNullSuite threw ${describeError(err)}`);
  }

  if (report.seeds !== input.seeds) {
    return fail(`null suite ran ${report.seeds} seeds for a request of ${input.seeds}`);
  }
  if (!Number.isInteger(report.exceeded20) || report.exceeded20 < 0 || report.exceeded20 > report.seeds) {
    return fail(`exceeded20 ${String(report.exceeded20)} is outside [0, ${report.seeds}]`);
  }
  if (!isClosed(report.rate, 0, 1)) return fail(`violation rate ${String(report.rate)} is outside [0, 1]`);
  if (!isFiniteNumber(report.alpha) || report.alpha <= 0 || report.alpha > 1) {
    return fail(`alpha ${String(report.alpha)} is not a probability in (0, 1]`);
  }
  const rateMatchesCount = Math.abs(report.rate - report.exceeded20 / report.seeds) < 1e-12;
  if (!rateMatchesCount) {
    return fail(
      `reported rate ${report.rate} does not equal exceeded20/seeds (${report.exceeded20}/${report.seeds})`,
    );
  }
  const passMatchesAlpha = report.pass === report.rate <= report.alpha;
  if (!passMatchesAlpha) {
    return fail(`reported pass (${report.pass}) disagrees with rate <= alpha (${report.rate} <= ${report.alpha})`);
  }
  // The kernel fixes alpha at 0.05; a changed constant is a changed claim.
  if (report.alpha !== 0.05) {
    return fail(`null-suite alpha is ${report.alpha}, not the documented 0.05`);
  }

  return {
    ok: true,
    data: {
      report,
      rateMatchesCount,
      passMatchesAlpha,
      typeOneClaim:
        "Under the null arm every latent effect is exactly 0 and the market line equals the true mean, so a " +
        `calibrated engine's e-process is a martingale. Measured type-I violation rate over ${report.seeds} ` +
        `seeds: ${report.rate}.`,
      synthetic: true,
      priced: false,
      status: "shadow",
    },
  };
}

export interface CapitalPlantedComparisonInput {
  /** 1..50. Each seed runs the engine arm AND the open-loop arm. */
  readonly seeds: number;
  readonly startSeed?: number;
  readonly design?: Partial<Omit<SyntheticDesign, "planted">>;
  readonly filter?: { readonly nParticles?: number };
}

export interface CapitalPairedUncertainty {
  readonly pairedMeanDifference: number;
  readonly pairedSd: number;
  readonly pairedSe: number;
  readonly ciLow: number;
  readonly ciHigh: number;
  readonly ciBoundsMean: boolean;
  /** False means "not established at this seed count" — an honest negative, not a failure. */
  readonly excludesZero: boolean;
  readonly engineMaxMean: number;
  readonly engineMaxSd: number;
  readonly openLoopMaxMean: number;
  readonly openLoopMaxSd: number;
}

export interface CapitalPlantedComparisonResult {
  readonly report: PlantedReport;
  readonly uncertainty: CapitalPairedUncertainty;
  readonly synthetic: true;
  readonly priced: false;
  readonly status: "shadow";
}

/**
 * The kernel reports a paired median comparison with NO standard error, no
 * interval and no dispersion. A median with no uncertainty is a point estimate
 * dressed as a result, so this re-runs the SAME per-seed kernel and computes a
 * paired standard error, a 95% interval on the mean paired difference, and the
 * dispersion of each arm. The kernel's medians are then cross-checked against
 * an independent aggregation of the same per-seed series.
 */
export function evalCapitalPlantedComparison(
  input: CapitalPlantedComparisonInput,
): ResearchEval<CapitalPlantedComparisonResult> {
  if (!Number.isInteger(input.seeds) || input.seeds < 1 || input.seeds > 50) {
    return fail(`seeds must be an integer in [1, 50], received ${String(input.seeds)}`);
  }
  const startSeed = input.startSeed ?? 10_000;
  if (!Number.isInteger(startSeed)) return fail(`startSeed must be an integer, received ${String(startSeed)}`);
  const designError = validateSyntheticDesignPatch(input.design);
  if (designError !== null) return fail(designError);
  const nParticles = input.filter?.nParticles ?? 24;
  if (!Number.isInteger(nParticles) || nParticles < 1 || nParticles > MAX_PARTICLES) {
    return fail(`filter.nParticles must be an integer in [1, ${MAX_PARTICLES}], received ${String(nParticles)}`);
  }

  const designOverride = input.design === undefined ? undefined : { ...input.design, planted: true };
  const engineMax: number[] = [];
  const openMax: number[] = [];
  for (let i = 0; i < input.seeds; i++) {
    const seed = startSeed + i;
    let engine: CapitalPath;
    let open: CapitalPath;
    try {
      engine = runCapital({
        seed,
        planted: true,
        ...(designOverride === undefined ? {} : { design: designOverride }),
        filter: { nParticles },
      });
      open = runCapital({
        seed,
        planted: true,
        openLoop: true,
        ...(designOverride === undefined ? {} : { design: designOverride }),
        filter: { nParticles },
      });
    } catch (err) {
      return fail(`runCapital threw at seed ${seed}: ${describeError(err)}`);
    }
    if (!isFiniteNumber(engine.maxCapital) || !isFiniteNumber(open.maxCapital)) {
      return fail(`seed ${seed} produced a non-finite max capital`);
    }
    engineMax.push(engine.maxCapital);
    openMax.push(open.maxCapital);
  }

  const mean = (values: readonly number[]): number =>
    values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
  const median = (values: readonly number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    // The kernel's own convention: index floor(n/2) of the ascending series.
    return sorted[Math.floor(sorted.length / 2)] ?? 1;
  };
  const sd = (values: readonly number[]): number => {
    if (values.length < 2) return 0;
    const m = mean(values);
    return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
  };

  let report: PlantedReport;
  try {
    report = runPlantedComparison(input.seeds, startSeed);
  } catch (err) {
    return fail(`runPlantedComparison threw ${describeError(err)}`);
  }

  const engineMedian = median(engineMax);
  const openMedian = median(openMax);
  if (report.engineMedianMax !== engineMedian) {
    return fail(
      `kernel engine median ${report.engineMedianMax} disagrees with the independently aggregated median ${engineMedian}`,
    );
  }
  if (report.openLoopMedianMax !== openMedian) {
    return fail(
      `kernel open-loop median ${report.openLoopMedianMax} disagrees with the independently aggregated median ${openMedian}`,
    );
  }
  if (report.beatsOpenLoop !== report.engineMedianMax > report.openLoopMedianMax) {
    return fail(`beatsOpenLoop (${report.beatsOpenLoop}) disagrees with the medians it is derived from`);
  }
  if (!isFiniteNumber(report.engineMedianMax) || !isFiniteNumber(report.openLoopMedianMax)) {
    return fail("planted comparison medians are non-finite");
  }
  if (report.openLoopMedianMax !== 1) {
    return fail(
      `open-loop median max capital is ${report.openLoopMedianMax}, not the structurally required 1`,
    );
  }

  const diffs: number[] = [];
  for (let i = 0; i < engineMax.length; i++) {
    diffs.push((engineMax[i] ?? 0) - (openMax[i] ?? 0));
  }
  const pairedMean = mean(diffs);
  const pairedSd = sd(diffs);
  const pairedSe = diffs.length > 1 ? pairedSd / Math.sqrt(diffs.length) : 0;
  const ciLow = pairedMean - Z_975 * pairedSe;
  const ciHigh = pairedMean + Z_975 * pairedSe;
  if (!isFiniteNumber(pairedMean) || !isFiniteNumber(pairedSd) || !isFiniteNumber(pairedSe)) {
    return fail("paired uncertainty is non-finite");
  }
  if (pairedSd < 0) return fail("paired standard deviation is negative");
  if (ciHigh < ciLow) return fail("paired confidence interval is inverted");

  return {
    ok: true,
    data: {
      report,
      uncertainty: {
        pairedMeanDifference: pairedMean,
        pairedSd,
        pairedSe,
        ciLow,
        ciHigh,
        ciBoundsMean: pairedMean >= ciLow && pairedMean <= ciHigh,
        excludesZero: ciLow > 0 || ciHigh < 0,
        engineMaxMean: mean(engineMax),
        engineMaxSd: sd(engineMax),
        openLoopMaxMean: mean(openMax),
        openLoopMaxSd: sd(openMax),
      },
      synthetic: true,
      priced: false,
      status: "shadow",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (b1) gse-score/model-parliament — a DECISION surface, never a probability
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelParliamentInputBridge {
  readonly votes: readonly ModelVote[];
  readonly maxDisagreement?: number;
}

export interface ModelParliamentResultBridge {
  readonly status: "OK" | "WARN" | "BLOCK";
  /**
   * 0-100 agreement/quality scale. NOT a win probability, NOT a probability of
   * any kind. The literal `false` type is load-bearing: a downstream consumer
   * that tries to treat it as one does not compile.
   */
  readonly decisionConfidenceScore: number;
  readonly confidenceIsProbability: false;
  /**
   * Confidence-weighted mean of the callers' own probability votes. On the
   * [0, 1] scale by construction, but it is a BLEND, not a calibrated forecast:
   * it inherits the calibration of its inputs and is not itself checked.
   */
  readonly weightedModelProbability: number | null;
  readonly weightedModelProbabilityIsCalibrated: false;
  readonly disagreement: number;
  readonly votesSupplied: number;
  readonly votesUsed: number;
  readonly votesRejected: number;
  readonly warnings: readonly string[];
  readonly drivers: readonly { readonly name: string; readonly impact: number; readonly explanation: string }[];
  /**
   * A refusal by the kernel ("no valid vote", "zero effective weight") is a
   * DECLINED answer and is reported as ok:true. It is not "could not compute".
   */
  readonly declined: boolean;
}

function validateModelVote(vote: ModelVote, index: number): string | null {
  if (!isNonEmptyString(vote.modelId)) return `votes[${index}].modelId must be a non-empty string`;
  if (!isClosed(vote.probability, 0, 1)) {
    return `votes[${index}].probability ${String(vote.probability)} is outside [0, 1]`;
  }
  if (!isFiniteNumber(vote.confidence) || vote.confidence <= 0) {
    return `votes[${index}].confidence must be finite and > 0, received ${String(vote.confidence)}`;
  }
  if (vote.evidenceWeight !== undefined && (!isFiniteNumber(vote.evidenceWeight) || vote.evidenceWeight < 0)) {
    return `votes[${index}].evidenceWeight must be finite and >= 0 when present`;
  }
  if (vote.stale !== undefined && typeof vote.stale !== "boolean") {
    return `votes[${index}].stale must be a boolean when present`;
  }
  return null;
}

export function evalModelParliament(
  input: ModelParliamentInputBridge,
): ResearchEval<ModelParliamentResultBridge> {
  if (!Array.isArray(input.votes)) return fail("votes must be an array");
  if (input.votes.length === 0) return fail("votes is empty; a parliament of nobody is not a computation");
  if (input.maxDisagreement !== undefined && (!isFiniteNumber(input.maxDisagreement) || input.maxDisagreement <= 0)) {
    return fail(`maxDisagreement must be finite and > 0, received ${String(input.maxDisagreement)}`);
  }
  for (let i = 0; i < input.votes.length; i++) {
    const vote = input.votes[i];
    if (vote === undefined) return fail(`votes[${i}] is undefined`);
    const voteError = validateModelVote(vote, i);
    if (voteError !== null) return fail(voteError);
  }

  const parliamentary: ModelParliamentInput = {
    votes: input.votes,
    ...(input.maxDisagreement === undefined ? {} : { maxDisagreement: input.maxDisagreement }),
  };
  let result: ReturnType<typeof aggregateModelParliament>;
  try {
    result = aggregateModelParliament(parliamentary);
  } catch (err) {
    return fail(`aggregateModelParliament threw ${describeError(err)}`);
  }

  if (result.status !== "OK" && result.status !== "WARN" && result.status !== "BLOCK") {
    return fail(`parliament returned an unknown status "${String(result.status)}"`);
  }
  if (!isClosed(result.confidenceScore, 0, 100)) {
    return fail(`decision confidence score ${result.confidenceScore} is outside [0, 100]`);
  }
  if (!isClosed(result.disagreement, 0, 1)) {
    return fail(`disagreement ${result.disagreement} is outside [0, 1]`);
  }
  if (!Number.isInteger(result.votesUsed) || result.votesUsed < 0 || result.votesUsed > input.votes.length) {
    return fail(`votesUsed ${String(result.votesUsed)} is outside [0, ${input.votes.length}]`);
  }
  if (result.modeledProbability !== null && !isClosed(result.modeledProbability, 0, 1)) {
    return fail(`weighted model probability ${result.modeledProbability} is outside [0, 1]`);
  }
  if (result.status === "BLOCK" && result.modeledProbability !== null) {
    return fail("parliament is BLOCK but still produced a modeled probability");
  }
  if (result.status === "BLOCK" && result.votesUsed !== 0) {
    return fail(`parliament is BLOCK but reports ${result.votesUsed} votes used`);
  }
  if (result.status !== "BLOCK" && result.modeledProbability === null) {
    return fail("parliament is not BLOCK but produced no modeled probability");
  }
  // WARN must be earned: either a disagreement breach or a weak score.
  if (result.status === "WARN") {
    const maxDisagreement = input.maxDisagreement ?? 0.12;
    if (!(result.disagreement > maxDisagreement || result.confidenceScore < 35)) {
      return fail(
        `parliament returned WARN with disagreement ${result.disagreement} <= ${maxDisagreement} and score ${result.confidenceScore} >= 35`,
      );
    }
  }
  if (result.status === "OK" && result.disagreement > (input.maxDisagreement ?? 0.12)) {
    return fail(`parliament returned OK while disagreement ${result.disagreement} exceeds the tolerance`);
  }
  if (result.warnings.some((w) => !isNonEmptyString(w))) return fail("parliament emitted an empty warning string");
  for (const driver of result.drivers) {
    if (!isNonEmptyString(driver.name) || !isFiniteNumber(driver.impact)) {
      return fail("parliament emitted a driver with a missing name or non-finite impact");
    }
  }

  return {
    ok: true,
    data: {
      status: result.status,
      decisionConfidenceScore: result.confidenceScore,
      confidenceIsProbability: false,
      weightedModelProbability: result.modeledProbability,
      weightedModelProbabilityIsCalibrated: false,
      disagreement: result.disagreement,
      votesSupplied: input.votes.length,
      votesUsed: result.votesUsed,
      votesRejected: input.votes.length - result.votesUsed,
      warnings: result.warnings,
      drivers: result.drivers,
      declined: result.status === "BLOCK",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (b2) gse-score/no-bet-strength — "declined" is an answer, not an error
// ─────────────────────────────────────────────────────────────────────────────

export interface NoBetStrengthInputBridge {
  readonly risks: readonly NoBetRiskInput[];
  readonly evidenceHealth?: number;
}

export interface NoBetStrengthResultBridge {
  /** 0-100 refusal pressure. NOT a probability and NOT a win rate. */
  readonly refusalPressureScore: number;
  readonly refusalPressureIsProbability: false;
  readonly decision: NoBetDecision;
  /** The engine declined to act. Distinct from "we could not compute". */
  readonly declined: boolean;
  /** True only for the two states in which the engine is refusing to act at all. */
  readonly hardRefusal: boolean;
  readonly hardPassReasons: readonly string[];
  readonly risksSupplied: number;
  readonly drivers: readonly { readonly name: string; readonly impact: number; readonly explanation: string }[];
  /** Recomputed here from the reported score + hard-pass reasons. */
  readonly decisionReDerived: NoBetDecision;
}

function deriveNoBetDecision(score: number, hardReasons: number): NoBetDecision {
  if (hardReasons > 0 || score >= 85) return "HARD_PASS";
  if (score >= 60) return "SOFT_PASS";
  if (score >= 30) return "WATCH";
  return "CLEAR";
}

export function evalNoBetStrength(
  input: NoBetStrengthInputBridge,
): ResearchEval<NoBetStrengthResultBridge> {
  if (!Array.isArray(input.risks)) return fail("risks must be an array");
  if (input.evidenceHealth !== undefined && (!isFiniteNumber(input.evidenceHealth) || input.evidenceHealth < 0 || input.evidenceHealth > 100)) {
    return fail(`evidenceHealth must lie in [0, 100], received ${String(input.evidenceHealth)}`);
  }
  for (let i = 0; i < input.risks.length; i++) {
    const risk = input.risks[i];
    if (risk === undefined) return fail(`risks[${i}] is undefined`);
    if (!NO_BET_FACTORS.includes(risk.factor)) {
      return fail(`risks[${i}].factor "${String(risk.factor)}" is not a known risk factor`);
    }
    if (!isFiniteNumber(risk.severity) || risk.severity < 0 || risk.severity > 1) {
      return fail(`risks[${i}].severity must lie in [0, 1], received ${String(risk.severity)}`);
    }
    if (!isNonEmptyString(risk.reason)) return fail(`risks[${i}].reason must be a non-empty string`);
    if (risk.hardBlock !== undefined && typeof risk.hardBlock !== "boolean") {
      return fail(`risks[${i}].hardBlock must be a boolean when present`);
    }
  }

  let result: ReturnType<typeof computeNoBetStrength>;
  try {
    result = computeNoBetStrength({
      risks: input.risks,
      ...(input.evidenceHealth === undefined ? {} : { evidenceHealth: input.evidenceHealth }),
    });
  } catch (err) {
    return fail(`computeNoBetStrength threw ${describeError(err)}`);
  }

  if (!NO_BET_DECISIONS.includes(result.decision)) {
    return fail(`no-bet governor returned an unknown decision "${String(result.decision)}"`);
  }
  if (!isClosed(result.score, 0, 100)) {
    return fail(`refusal pressure score ${result.score} is outside [0, 100]`);
  }
  for (const driver of result.drivers) {
    if (!isNonEmptyString(driver.name) || !isFiniteNumber(driver.impact) || driver.impact < 0) {
      return fail("no-bet governor emitted a driver with a missing name, non-finite impact, or negative impact");
    }
  }
  const reDerived = deriveNoBetDecision(result.score, result.hardPassReasons.length);
  if (reDerived !== result.decision) {
    return fail(
      `no-bet decision "${result.decision}" is not the decision implied by score ${result.score} and ` +
        `${result.hardPassReasons.length} hard-pass reason(s) ("${reDerived}")`,
    );
  }
  // Every hard-pass reason must be traceable to a supplied risk.
  const suppliedReasons = new Set(input.risks.map((r) => r.reason));
  for (const reason of result.hardPassReasons) {
    if (!suppliedReasons.has(reason)) {
      return fail(`hard-pass reason "${reason}" does not correspond to any supplied risk`);
    }
  }

  return {
    ok: true,
    data: {
      refusalPressureScore: result.score,
      refusalPressureIsProbability: false,
      decision: result.decision,
      declined: result.decision === "SOFT_PASS" || result.decision === "HARD_PASS",
      hardRefusal: result.decision === "HARD_PASS",
      hardPassReasons: result.hardPassReasons,
      risksSupplied: input.risks.length,
      drivers: result.drivers,
      decisionReDerived: reDerived,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (b3) gse-score/calibration-contract + calibration-action-policy
// ─────────────────────────────────────────────────────────────────────────────

export interface CalibrationContractInputBridge extends CalibrationContractInput {
  /** Echoed back so a reader can see the floor that was actually applied. */
  readonly resolvedMinSampleCount?: number;
  readonly resolvedMaxExpectedCalibrationError?: number;
  readonly resolvedMaxDriftScore?: number;
}

export interface CalibrationActionPolicy {
  readonly status: CalibrationContractStatus;
  /** Hard ceiling on the action score this calibration state permits. */
  readonly actionScoreCap: number;
  readonly requiresHardPass: boolean;
  readonly riskSeverity: number;
}

export interface CalibrationContractResultBridge {
  readonly status: CalibrationContractStatus;
  /** A probability may be claimed to a customer only in this state. */
  readonly probabilityClaimsAllowed: boolean;
  readonly scoreModifier: number;
  readonly reasons: readonly string[];
  readonly resolved: {
    readonly minSampleCount: number;
    readonly maxExpectedCalibrationError: number;
    readonly maxDriftScore: number;
  };
  readonly policy: CalibrationActionPolicy;
  /** Recomputed here from the status and the resolved thresholds. */
  readonly statusReDerived: CalibrationContractStatus;
}

const DEFAULT_MIN_SAMPLE_COUNT = 250;
const DEFAULT_MAX_ECE = 0.06;
const DEFAULT_MAX_DRIFT = 0.1;

function deriveCalibrationStatus(input: CalibrationContractInput): CalibrationContractStatus {
  const minSampleCount = input.minSampleCount ?? DEFAULT_MIN_SAMPLE_COUNT;
  const maxEce = input.maxExpectedCalibrationError ?? DEFAULT_MAX_ECE;
  const maxDrift = input.maxDriftScore ?? DEFAULT_MAX_DRIFT;
  // Precedence is load-bearing: sample size, then a missing ECE, then drift,
  // then calibration error, then the baseline comparison.
  if (input.sampleCount < minSampleCount) return "INSUFFICIENT_SAMPLE";
  if (input.expectedCalibrationError === undefined || !Number.isFinite(input.expectedCalibrationError)) {
    return "BLOCKED";
  }
  if ((input.driftScore ?? 0) > maxDrift) return "DRIFTING";
  if (input.expectedCalibrationError > maxEce) return "WATCH";
  if (
    input.brierScore !== undefined &&
    input.baselineBrierScore !== undefined &&
    input.brierScore > input.baselineBrierScore
  ) {
    return "WATCH";
  }
  return "VALIDATED";
}

export function evalCalibrationContract(
  input: CalibrationContractInputBridge,
): ResearchEval<CalibrationContractResultBridge> {
  if (!Number.isInteger(input.sampleCount) || input.sampleCount < 0) {
    return fail(`sampleCount must be a non-negative integer, received ${String(input.sampleCount)}`);
  }
  if (input.minSampleCount !== undefined && (!isFiniteNumber(input.minSampleCount) || input.minSampleCount <= 0)) {
    return fail(`minSampleCount must be finite and > 0 when supplied, received ${String(input.minSampleCount)}`);
  }
  if (
    input.expectedCalibrationError !== undefined &&
    !isClosed(input.expectedCalibrationError, 0, 1)
  ) {
    return fail(`expectedCalibrationError must lie in [0, 1] when supplied, received ${String(input.expectedCalibrationError)}`);
  }
  if (input.maxExpectedCalibrationError !== undefined && (!isFiniteNumber(input.maxExpectedCalibrationError) || input.maxExpectedCalibrationError <= 0)) {
    return fail(`maxExpectedCalibrationError must be finite and > 0 when supplied`);
  }
  if (input.brierScore !== undefined && !isClosed(input.brierScore, 0, 1)) {
    return fail(`brierScore must lie in [0, 1] when supplied, received ${String(input.brierScore)}`);
  }
  if (input.baselineBrierScore !== undefined && !isClosed(input.baselineBrierScore, 0, 1)) {
    return fail(`baselineBrierScore must lie in [0, 1] when supplied, received ${String(input.baselineBrierScore)}`);
  }
  if (input.driftScore !== undefined && (!isFiniteNumber(input.driftScore) || input.driftScore < 0)) {
    return fail(`driftScore must be finite and >= 0 when supplied, received ${String(input.driftScore)}`);
  }
  if (input.maxDriftScore !== undefined && (!isFiniteNumber(input.maxDriftScore) || input.maxDriftScore < 0)) {
    return fail(`maxDriftScore must be finite and >= 0 when supplied`);
  }

  const kernelInput: CalibrationContractInput = {
    sampleCount: input.sampleCount,
    ...(input.minSampleCount === undefined ? {} : { minSampleCount: input.minSampleCount }),
    ...(input.expectedCalibrationError === undefined
      ? {}
      : { expectedCalibrationError: input.expectedCalibrationError }),
    ...(input.maxExpectedCalibrationError === undefined
      ? {}
      : { maxExpectedCalibrationError: input.maxExpectedCalibrationError }),
    ...(input.brierScore === undefined ? {} : { brierScore: input.brierScore }),
    ...(input.baselineBrierScore === undefined ? {} : { baselineBrierScore: input.baselineBrierScore }),
    ...(input.driftScore === undefined ? {} : { driftScore: input.driftScore }),
    ...(input.maxDriftScore === undefined ? {} : { maxDriftScore: input.maxDriftScore }),
  };

  let result: ReturnType<typeof assessCalibrationContract>;
  try {
    result = assessCalibrationContract(kernelInput);
  } catch (err) {
    return fail(`assessCalibrationContract threw ${describeError(err)}`);
  }

  if (!CALIBRATION_STATUSES.includes(result.status)) {
    return fail(`calibration contract returned an unknown status "${String(result.status)}"`);
  }
  if (result.probabilityClaimsAllowed !== (result.status === "VALIDATED")) {
    return fail(
      `probabilityClaimsAllowed (${result.probabilityClaimsAllowed}) is not consistent with status "${result.status}"`,
    );
  }
  if (!isFiniteNumber(result.scoreModifier) || result.scoreModifier < -25 || result.scoreModifier > 8) {
    return fail(`scoreModifier ${result.scoreModifier} is outside the documented [-25, 8] range`);
  }
  if (!Array.isArray(result.reasons) || result.reasons.length === 0) {
    return fail("calibration contract returned no reason; every verdict must be explained");
  }
  for (const reason of result.reasons) {
    if (!isNonEmptyString(reason)) return fail("calibration contract emitted an empty reason");
  }

  const statusReDerived = deriveCalibrationStatus(kernelInput);
  if (statusReDerived !== result.status) {
    return fail(
      `calibration status "${result.status}" is not reproducible from the inputs under the documented precedence ` +
        `(independently derived "${statusReDerived}")`,
    );
  }

  const actionScoreCap = calibrationActionCap(result.status);
  const requiresHardPass = calibrationRequiresHardPass(result.status);
  const riskSeverity = calibrationRiskSeverity(result.status);
  if (!isClosed(actionScoreCap, 0, 100)) return fail(`action score cap ${actionScoreCap} is outside [0, 100]`);
  if (!isClosed(riskSeverity, 0, 1)) return fail(`risk severity ${riskSeverity} is outside [0, 1]`);
  if ((actionScoreCap === 100) !== (result.status === "VALIDATED")) {
    return fail(`action cap ${actionScoreCap} is not exclusive to VALIDATED for status "${result.status}"`);
  }
  if (requiresHardPass !== (actionScoreCap === 24)) {
    return fail(`requiresHardPass (${requiresHardPass}) disagrees with the cap ${actionScoreCap} for "${result.status}"`);
  }
  if ((riskSeverity === 0) !== (result.status === "VALIDATED")) {
    return fail(`risk severity ${riskSeverity} is not zero-exactly for non-VALIDATED status "${result.status}"`);
  }

  return {
    ok: true,
    data: {
      status: result.status,
      probabilityClaimsAllowed: result.probabilityClaimsAllowed,
      scoreModifier: result.scoreModifier,
      reasons: result.reasons,
      resolved: {
        minSampleCount: input.minSampleCount ?? input.resolvedMinSampleCount ?? DEFAULT_MIN_SAMPLE_COUNT,
        maxExpectedCalibrationError:
          input.maxExpectedCalibrationError ?? input.resolvedMaxExpectedCalibrationError ?? DEFAULT_MAX_ECE,
        maxDriftScore: input.maxDriftScore ?? input.resolvedMaxDriftScore ?? DEFAULT_MAX_DRIFT,
      },
      policy: { status: result.status, actionScoreCap, requiresHardPass, riskSeverity },
      statusReDerived,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (b4) gse-score/feature-contract
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureContractInputBridge extends FeatureContractInput {
  readonly resolvedMaxAgeMinutes?: number;
}

export interface FeatureContractResultBridge {
  readonly status: "OK" | "WARN" | "BLOCK";
  /** 0-100 evidence health. NOT a probability. */
  readonly featureHealth: number;
  readonly featureHealthIsProbability: false;
  readonly missingRequired: readonly string[];
  readonly staleFeatures: readonly string[];
  readonly staleRequired: readonly string[];
  readonly blockedSources: readonly string[];
  readonly drivers: readonly { readonly name: string; readonly impact: number; readonly explanation: string }[];
  readonly resolved: { readonly maxAgeMinutes: number; readonly requiredKeys: readonly string[] };
  /** Recomputed here from the reported arrays + health. */
  readonly statusReDerived: "OK" | "WARN" | "BLOCK";
  /** Each blocked/stale list re-derived from the caller's own input. */
  readonly blockedSourcesReDerived: readonly string[];
  readonly staleFeaturesReDerived: readonly string[];
}

function deriveFeatureStatus(
  missingRequired: number,
  staleRequired: number,
  blockedSources: number,
  staleFeatures: number,
  featureHealth: number,
): "OK" | "WARN" | "BLOCK" {
  if (missingRequired > 0 || staleRequired > 0 || blockedSources > 0) return "BLOCK";
  if (staleFeatures > 0 || featureHealth < 70) return "WARN";
  return "OK";
}

export function evalFeatureContract(
  input: FeatureContractInputBridge,
): ResearchEval<FeatureContractResultBridge> {
  if (!Array.isArray(input.features)) return fail("features must be an array");
  if (input.features.length === 0) return fail("features is empty; there is no evidence to contract-check");
  if (input.maxAgeMinutes !== undefined && (!isFiniteNumber(input.maxAgeMinutes) || input.maxAgeMinutes < 1)) {
    return fail(`maxAgeMinutes must be finite and >= 1 when supplied, received ${String(input.maxAgeMinutes)}`);
  }
  const seenKeys = new Set<string>();
  for (let i = 0; i < input.features.length; i++) {
    const feature = input.features[i];
    if (feature === undefined) return fail(`features[${i}] is undefined`);
    if (!isNonEmptyString(feature.key)) return fail(`features[${i}].key must be a non-empty string`);
    if (seenKeys.has(feature.key)) {
      return fail(`features contains a duplicate key "${feature.key}"; the kernel's last-wins map would silently drop one`);
    }
    seenKeys.add(feature.key);
    if (!isFiniteNumber(feature.value)) return fail(`features[${i}].value must be finite`);
    if (feature.quality !== undefined && !isClosed(feature.quality, 0, 1)) {
      return fail(`features[${i}].quality must lie in [0, 1], received ${String(feature.quality)}`);
    }
    if (feature.ageMinutes !== undefined && (!isFiniteNumber(feature.ageMinutes) || feature.ageMinutes < 0)) {
      return fail(`features[${i}].ageMinutes must be finite and >= 0 when present`);
    }
    if (feature.required !== undefined && typeof feature.required !== "boolean") {
      return fail(`features[${i}].required must be a boolean when present`);
    }
    if (feature.sourcePolicy !== undefined) {
      const policy = feature.sourcePolicy;
      if (!isNonEmptyString(policy.sourceId)) {
        return fail(`features[${i}].sourcePolicy.sourceId must be a non-empty string`);
      }
      if (!FEATURE_SOURCE_STATUSES.includes(policy.status)) {
        return fail(`features[${i}].sourcePolicy.status "${String(policy.status)}" is not a known source status`);
      }
      if (typeof policy.allowedForModeling !== "boolean") {
        return fail(`features[${i}].sourcePolicy.allowedForModeling must be a boolean`);
      }
      // A policy that both permits and forbids modeling is an ambiguity, not a policy.
      if (policy.allowedForModeling && policy.status !== "allowed") {
        return fail(
          `features[${i}].sourcePolicy allows modeling while its status is "${policy.status}"; the contract cannot be satisfied`,
        );
      }
    }
  }
  for (const key of input.requiredFeatureKeys ?? []) {
    if (!isNonEmptyString(key)) return fail("requiredFeatureKeys must contain only non-empty strings");
  }

  const kernelInput: FeatureContractInput = {
    features: input.features,
    ...(input.requiredFeatureKeys === undefined ? {} : { requiredFeatureKeys: input.requiredFeatureKeys }),
    ...(input.maxAgeMinutes === undefined ? {} : { maxAgeMinutes: input.maxAgeMinutes }),
  };
  let result: ReturnType<typeof evaluateFeatureContract>;
  try {
    result = evaluateFeatureContract(kernelInput);
  } catch (err) {
    return fail(`evaluateFeatureContract threw ${describeError(err)}`);
  }

  if (result.status !== "OK" && result.status !== "WARN" && result.status !== "BLOCK") {
    return fail(`feature contract returned an unknown status "${String(result.status)}"`);
  }
  if (!isClosed(result.featureHealth, 0, 100)) {
    return fail(`feature health ${result.featureHealth} is outside [0, 100]`);
  }
  for (const list of [result.staleFeatures, result.staleRequired, result.blockedSources]) {
    for (const key of list) {
      if (!isNonEmptyString(key)) return fail("feature contract emitted an empty key in one of its lists");
      if (!seenKeys.has(key)) {
        return fail(`feature contract listed "${key}", which is not among the supplied features`);
      }
    }
  }

  const maxAgeMinutes = Math.max(1, input.maxAgeMinutes ?? 120);
  const staleReDerived = input.features
    .filter((f) => (f.ageMinutes ?? 0) > maxAgeMinutes)
    .map((f) => f.key);
  const blockedReDerived = input.features
    .filter((f) => {
      const p = f.sourcePolicy;
      return p !== undefined && (!p.allowedForModeling || p.status !== "allowed");
    })
    .map((f) => f.key);
  const sameOrder = (a: readonly string[], b: readonly string[]): boolean =>
    a.length === b.length && a.every((v, i) => v === b[i]);
  if (!sameOrder(result.staleFeatures, staleReDerived)) {
    return fail(
      `staleFeatures [${result.staleFeatures.join(", ")}] does not match the ages supplied against a ${maxAgeMinutes}-minute ceiling`,
    );
  }
  if (!sameOrder(result.blockedSources, blockedReDerived)) {
    return fail(
      `blockedSources [${result.blockedSources.join(", ")}] does not match the source policies supplied`,
    );
  }
  const requiredKeys = new Set<string>([
    ...input.features.filter((f) => f.required === true).map((f) => f.key),
    ...(input.requiredFeatureKeys ?? []),
  ]);
  for (const key of result.staleRequired) {
    if (!requiredKeys.has(key)) return fail(`staleRequired lists "${key}", which is not a required feature`);
  }
  for (const key of result.missingRequired) {
    if (seenKeys.has(key)) return fail(`missingRequired lists "${key}", which WAS supplied`);
  }
  const reDerived = deriveFeatureStatus(
    result.missingRequired.length,
    result.staleRequired.length,
    result.blockedSources.length,
    result.staleFeatures.length,
    result.featureHealth,
  );
  if (reDerived !== result.status) {
    return fail(
      `feature status "${result.status}" is not implied by the arrays it reported (independently derived "${reDerived}")`,
    );
  }

  return {
    ok: true,
    data: {
      status: result.status,
      featureHealth: result.featureHealth,
      featureHealthIsProbability: false,
      missingRequired: result.missingRequired,
      staleFeatures: result.staleFeatures,
      staleRequired: result.staleRequired,
      blockedSources: result.blockedSources,
      drivers: result.drivers,
      resolved: { maxAgeMinutes, requiredKeys: [...requiredKeys].sort() },
      statusReDerived: reDerived,
      blockedSourcesReDerived: blockedReDerived,
      staleFeaturesReDerived: staleReDerived,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (b5) gse-score/gse-action-score — the composite decision surface
// ─────────────────────────────────────────────────────────────────────────────

export interface GseActionScoreInputBridge extends GseActionScoreInput {
  readonly additionalNoBetRisks?: readonly NoBetRiskInput[];
}

export interface GseActionScoreResultBridge {
  /** 0-100 action tier. NOT a win probability, NOT a probability of anything. */
  readonly actionScore: number;
  readonly actionScoreIsProbability: false;
  readonly decision: GseActionDecision;
  readonly marketProbability: number;
  /** Model blend minus market. On the probability scale — the only number here that is. */
  readonly probabilityEdge: number;
  readonly weightedModelProbability: number | null;
  readonly parliamentDecisionConfidenceScore: number;
  readonly parliamentConfidenceIsProbability: false;
  readonly featureHealth: number;
  readonly calibrationStatus: CalibrationContractStatus;
  readonly probabilityClaimsAllowed: boolean;
  readonly noBetDecision: NoBetDecision;
  readonly noBetRefusalPressure: number;
  /** True when the kernel's own forced-hard-pass condition was met. */
  readonly forcedHardPass: boolean;
  /** The honesty gates this result satisfies, restated as assertions. */
  readonly honestyGates: {
    /** A non-positive edge can never reach PLAY/LEAN. */
    readonly positiveEdgeRequiredForAction: boolean;
    /** PLAY/LEAN are unreachable while probability claims are unearned. */
    readonly claimsGateActionTiers: boolean;
    readonly hardPassCappedAt: number | null;
  };
  readonly drivers: readonly { readonly name: string; readonly direction: string; readonly impact: number; readonly explanation: string }[];
}

export function evalGseActionScore(
  input: GseActionScoreInputBridge,
): ResearchEval<GseActionScoreResultBridge> {
  if (!isClosed(input.marketProbability, 0, 1)) {
    return fail(`marketProbability must lie in [0, 1], received ${String(input.marketProbability)}`);
  }
  if (input.modelParliament === undefined || !Array.isArray(input.modelParliament.votes)) {
    return fail("modelParliament.votes must be an array");
  }
  if (input.modelParliament.votes.length === 0) return fail("modelParliament.votes is empty");
  for (let i = 0; i < input.modelParliament.votes.length; i++) {
    const vote = input.modelParliament.votes[i];
    if (vote === undefined) return fail(`modelParliament.votes[${i}] is undefined`);
    const voteError = validateModelVote(vote, i);
    if (voteError !== null) return fail(`modelParliament.${voteError}`);
  }
  const featureCheck = evalFeatureContract(input.featureContract);
  if (!featureCheck.ok) return fail(`featureContract: ${featureCheck.reason}`);
  const calibrationCheck = evalCalibrationContract(input.calibration);
  if (!calibrationCheck.ok) return fail(`calibration: ${calibrationCheck.reason}`);
  for (let i = 0; i < (input.additionalNoBetRisks ?? []).length; i++) {
    const risk = (input.additionalNoBetRisks ?? [])[i];
    if (risk === undefined) return fail(`additionalNoBetRisks[${i}] is undefined`);
    if (!NO_BET_FACTORS.includes(risk.factor)) {
      return fail(`additionalNoBetRisks[${i}].factor "${String(risk.factor)}" is not a known risk factor`);
    }
    if (!isFiniteNumber(risk.severity) || risk.severity < 0 || risk.severity > 1) {
      return fail(`additionalNoBetRisks[${i}].severity must lie in [0, 1]`);
    }
    if (!isNonEmptyString(risk.reason)) return fail(`additionalNoBetRisks[${i}].reason must be non-empty`);
  }

  let result: ReturnType<typeof computeGseActionScore>;
  try {
    result = computeGseActionScore(input);
  } catch (err) {
    return fail(`computeGseActionScore threw ${describeError(err)}`);
  }

  if (!GSE_DECISIONS.includes(result.decision)) {
    return fail(`gse action score returned an unknown decision "${String(result.decision)}"`);
  }
  if (!isClosed(result.score, 0, 100)) return fail(`action score ${result.score} is outside [0, 100]`);
  if (!isClosed(result.marketProbability, 0, 1)) return fail("reported market probability is outside [0, 1]");
  if (!isFiniteNumber(result.probabilityEdge)) return fail("probability edge is non-finite");
  if (result.modeledProbability !== null && !isClosed(result.modeledProbability, 0, 1)) {
    return fail("weighted model probability is outside [0, 1]");
  }
  if (!isClosed(result.confidenceScore, 0, 100)) return fail("confidence score is outside [0, 100]");
  if (!isClosed(result.noBetStrength, 0, 100)) return fail("no-bet strength is outside [0, 100]");
  if (result.noBetStrength !== result.noBet.score) {
    return fail("noBetStrength and the embedded no-bet score disagree");
  }
  if (result.confidenceScore !== result.parliament.confidenceScore) {
    return fail("confidence score and the embedded parliament score disagree");
  }
  if (result.calibration.status !== calibrationCheck.data.status) {
    return fail(
      `composite calibration status "${result.calibration.status}" disagrees with the standalone contract's "${calibrationCheck.data.status}"`,
    );
  }
  if (result.featureContract.status !== featureCheck.data.status) {
    return fail(
      `composite feature status "${result.featureContract.status}" disagrees with the standalone contract's "${featureCheck.data.status}"`,
    );
  }

  // The edge the kernel reports, independently recomputed at its 4dp rounding.
  const expectedEdge =
    result.modeledProbability === null ? 0 : result.modeledProbability - result.marketProbability;
  if (Math.abs(expectedEdge - result.probabilityEdge) > 1e-4) {
    return fail(
      `reported edge ${result.probabilityEdge} is not model ${String(result.modeledProbability)} minus market ${result.marketProbability}`,
    );
  }

  const cap = result.calibration.status === "VALIDATED" ? 100 : calibrationActionCap(result.calibration.status);
  if (result.score > cap + 1e-9) {
    return fail(
      `action score ${result.score} exceeds the ${cap} ceiling calibration status "${result.calibration.status}" permits`,
    );
  }

  const forcedHardPass =
    result.noBet.decision === "HARD_PASS" ||
    result.featureContract.status === "BLOCK" ||
    result.parliament.status === "BLOCK" ||
    calibrationRequiresHardPass(result.calibration.status);
  if (forcedHardPass && result.decision !== "HARD_PASS") {
    return fail(
      `a forced hard-pass condition is present (noBet=${result.noBet.decision}, features=${result.featureContract.status}, ` +
        `parliament=${result.parliament.status}, calibration=${result.calibration.status}) but the decision is "${result.decision}"`,
    );
  }
  if (forcedHardPass && result.score > 24 + 1e-9) {
    return fail(`a forced hard-pass produced score ${result.score}, above the 24 hard-pass ceiling`);
  }

  // Honesty gate 1: a non-positive edge can never reach an action tier above WATCH.
  if ((result.decision === "PLAY" || result.decision === "LEAN") && result.probabilityEdge <= 0) {
    return fail(
      `decision "${result.decision}" is unreachable at a non-positive edge (${result.probabilityEdge}); refusing to publish it`,
    );
  }
  // Honesty gate 2: while probability claims are unearned, PLAY/LEAN are unreachable.
  if (!result.calibration.probabilityClaimsAllowed && (result.decision === "PLAY" || result.decision === "LEAN")) {
    return fail(
      `decision "${result.decision}" is unreachable while calibration status is "${result.calibration.status}"`,
    );
  }
  if (result.parliament.status === "BLOCK" && result.decision !== "HARD_PASS") {
    return fail("a BLOCKED parliament produced a decision other than HARD_PASS");
  }

  return {
    ok: true,
    data: {
      actionScore: result.score,
      actionScoreIsProbability: false,
      decision: result.decision,
      marketProbability: result.marketProbability,
      probabilityEdge: result.probabilityEdge,
      weightedModelProbability: result.modeledProbability,
      parliamentDecisionConfidenceScore: result.confidenceScore,
      parliamentConfidenceIsProbability: false,
      featureHealth: result.featureContract.featureHealth,
      calibrationStatus: result.calibration.status,
      probabilityClaimsAllowed: result.calibration.probabilityClaimsAllowed,
      noBetDecision: result.noBet.decision,
      noBetRefusalPressure: result.noBetStrength,
      forcedHardPass,
      honestyGates: {
        positiveEdgeRequiredForAction: result.probabilityEdge <= 0,
        claimsGateActionTiers: !result.calibration.probabilityClaimsAllowed,
        hardPassCappedAt: forcedHardPass ? 24 : null,
      },
      drivers: result.drivers,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (c1) ladder/reduce — rung state, with the derivations' provenance re-checked
// ─────────────────────────────────────────────────────────────────────────────

export interface ReduceLadderInput {
  readonly events: readonly LadderEvent[];
}

export interface LadderSurfaceEligibility {
  readonly canPublishProjections: boolean;
  readonly performanceStatsEnabled: boolean;
}

export interface ReduceLadderResult {
  readonly currentRung: PricingRung;
  readonly trackRungs: Readonly<Record<LadderTrack, PricingRung>>;
  readonly settledSamples: LadderState["settledSamples"];
  readonly validCalibration: Readonly<Record<LadderTrack, boolean>>;
  readonly surfaceEligibility: LadderSurfaceEligibility;
  readonly pricedEstimators: readonly string[];
  readonly derivations: readonly {
    readonly type: string;
    readonly track: LadderTrack;
    readonly rung: PricingRung;
    readonly estimatorKey?: string;
    readonly sourceEventIds: readonly string[];
  }[];
  readonly eventsSupplied: number;
  readonly eventIds: readonly string[];
  /** Every derivation cites events that were actually supplied. */
  readonly provenanceComplete: boolean;
  /** The eligibility booleans, re-derived from the reported rungs. */
  readonly surfaceEligibilityReDerived: LadderSurfaceEligibility;
}

function validateLadderEvent(event: LadderEvent, index: number): string | null {
  if (event === null || typeof event !== "object") return `events[${index}] is not an object`;
  if (!isNonEmptyString(event.id)) return `events[${index}].id must be a non-empty string`;
  if (!isNonEmptyString(event.occurredAt) || Number.isNaN(Date.parse(event.occurredAt))) {
    return `events[${index}].occurredAt must be a parseable timestamp, received "${String(event.occurredAt)}"`;
  }
  if (!isNonEmptyString(event.modelVersion)) return `events[${index}].modelVersion must be a non-empty string`;
  const type: string = event.type;
  switch (event.type) {
    case "SETTLED_SAMPLE_REACHED": {
      const payload = event.payload;
      if (!LADDER_TRACK_SET.has(payload.track)) return `events[${index}].payload.track is not a ladder track`;
      if (payload.sample !== "canonical" && payload.sample !== "bootstrap") {
        return `events[${index}].payload.sample must be "canonical" or "bootstrap"`;
      }
      if (!Number.isInteger(payload.settledCount) || payload.settledCount < 0) {
        return `events[${index}].payload.settledCount must be a non-negative integer`;
      }
      if (!isFiniteNumber(payload.threshold) || payload.threshold < 0) {
        return `events[${index}].payload.threshold must be finite and >= 0`;
      }
      return null;
    }
    case "CALIBRATION_PUBLISHED": {
      const payload = event.payload;
      if (!LADDER_TRACK_SET.has(payload.track)) return `events[${index}].payload.track is not a ladder track`;
      if (!["DRAFT", "ACKNOWLEDGED", "IMPLEMENTED", "REJECTED"].includes(payload.proposalStatus)) {
        return `events[${index}].payload.proposalStatus "${String(payload.proposalStatus)}" is not a proposal status`;
      }
      if (payload.frozenModelVersion !== null && !isNonEmptyString(payload.frozenModelVersion)) {
        return `events[${index}].payload.frozenModelVersion must be null or a non-empty string`;
      }
      if (!isNonEmptyString(payload.calibrationProposalId)) {
        return `events[${index}].payload.calibrationProposalId must be a non-empty string`;
      }
      return null;
    }
    case "FANTASY_PROOF_RECORDED": {
      const payload = event.payload;
      if (!isNonEmptyString(payload.estimatorKey)) return `events[${index}].payload.estimatorKey must be non-empty`;
      if (!Array.isArray(payload.positions) || payload.positions.length === 0) {
        return `events[${index}].payload.positions must be a non-empty array`;
      }
      for (let p = 0; p < payload.positions.length; p++) {
        const position = payload.positions[p];
        if (position === undefined) return `events[${index}].payload.positions[${p}] is undefined`;
        if (!isNonEmptyString(position.position)) {
          return `events[${index}].payload.positions[${p}].position must be non-empty`;
        }
        if (!Number.isInteger(position.sampleSize) || position.sampleSize < 0) {
          return `events[${index}].payload.positions[${p}].sampleSize must be a non-negative integer`;
        }
        if (!isFiniteNumber(position.meanAbsoluteError) || position.meanAbsoluteError < 0) {
          return `events[${index}].payload.positions[${p}].meanAbsoluteError must be finite and >= 0`;
        }
        if (!isClosed(position.intervalCoverage, 0, 1)) {
          return `events[${index}].payload.positions[${p}].intervalCoverage must lie in [0, 1]`;
        }
        if (!isFiniteNumber(position.rankCorrelation)) {
          return `events[${index}].payload.positions[${p}].rankCorrelation must be finite`;
        }
      }
      return null;
    }
    case "BETTING_PROOF_RECORDED": {
      const payload = event.payload;
      if (!isNonEmptyString(payload.estimatorKey)) return `events[${index}].payload.estimatorKey must be non-empty`;
      if (!Number.isInteger(payload.sampleSize) || payload.sampleSize < 0) {
        return `events[${index}].payload.sampleSize must be a non-negative integer`;
      }
      if (!isClosed(payload.clvBeatRate, 0, 1)) {
        return `events[${index}].payload.clvBeatRate must lie in [0, 1]`;
      }
      if (!isClosed(payload.brierScore, 0, 1)) {
        return `events[${index}].payload.brierScore must lie in [0, 1]`;
      }
      if (!isFiniteNumber(payload.logLoss) || payload.logLoss < 0) {
        return `events[${index}].payload.logLoss must be finite and >= 0`;
      }
      return null;
    }
    default:
      return `events[${index}].type "${type}" is not a ladder event type`;
  }
}

function validateLadderState(state: LadderState, eventIds: ReadonlySet<string>): string | null {
  if (!PRICING_RUNGS.includes(state.currentRung)) {
    return `currentRung "${String(state.currentRung)}" is not a pricing rung`;
  }
  for (const track of ["fantasy", "betting"] as const) {
    if (!PRICING_RUNGS.includes(state.trackRungs[track])) {
      return `trackRungs.${track} "${String(state.trackRungs[track])}" is not a pricing rung`;
    }
    if (typeof state.validCalibration[track] !== "boolean") {
      return `validCalibration.${track} is not a boolean`;
    }
    for (const sample of ["canonical", "bootstrap"] as const) {
      const count = state.settledSamples[sample][track];
      if (!Number.isInteger(count) || count < 0) {
        return `settledSamples.${sample}.${track} ${String(count)} is not a non-negative integer`;
      }
    }
  }
  if (typeof state.surfaceEligibility.canPublishProjections !== "boolean") {
    return "surfaceEligibility.canPublishProjections is not a boolean";
  }
  if (typeof state.surfaceEligibility.performanceStatsEnabled !== "boolean") {
    return "surfaceEligibility.performanceStatsEnabled is not a boolean";
  }
  const sorted = [...state.pricedEstimators];
  if (new Set(sorted).size !== sorted.length) return "pricedEstimators contains duplicates";
  const sortedCopy = [...sorted].sort((a, b) => a.localeCompare(b));
  if (sorted.some((k, i) => k !== sortedCopy[i])) return "pricedEstimators is not in sorted order";
  for (const key of sorted) {
    if (!isNonEmptyString(key)) return "pricedEstimators contains an empty key";
  }
  if (!Array.isArray(state.derivations)) return "derivations is not an array";
  for (const derivation of state.derivations) {
    if (!PRICING_RUNGS.includes(derivation.rung)) {
      return `derivation rung "${String(derivation.rung)}" is not a pricing rung`;
    }
    if (derivation.track !== "fantasy" && derivation.track !== "betting") {
      return `derivation track "${String(derivation.track)}" is not a ladder track`;
    }
    if (!Array.isArray(derivation.sourceEventIds) || derivation.sourceEventIds.length === 0) {
      return `derivation of type "${derivation.type}" cites no source event`;
    }
    for (const id of derivation.sourceEventIds) {
      if (!eventIds.has(id)) {
        return `derivation of type "${derivation.type}" cites event "${id}", which was not supplied`;
      }
    }
  }
  const reDerived: LadderSurfaceEligibility = {
    canPublishProjections: RUNG_RANK[state.trackRungs.fantasy] >= RUNG_RANK.PROVEN,
    performanceStatsEnabled: RUNG_RANK[state.trackRungs.betting] >= RUNG_RANK.PROVEN,
  };
  if (state.surfaceEligibility.canPublishProjections !== reDerived.canPublishProjections) {
    return `canPublishProjections ${state.surfaceEligibility.canPublishProjections} disagrees with the fantasy rung "${state.trackRungs.fantasy}"`;
  }
  if (state.surfaceEligibility.performanceStatsEnabled !== reDerived.performanceStatsEnabled) {
    return `performanceStatsEnabled ${state.surfaceEligibility.performanceStatsEnabled} disagrees with the betting rung "${state.trackRungs.betting}"`;
  }
  const lowestRung = RUNG_RANK[state.trackRungs.fantasy] <= RUNG_RANK[state.trackRungs.betting]
    ? state.trackRungs.fantasy
    : state.trackRungs.betting;
  if (state.currentRung !== lowestRung) {
    return `currentRung "${state.currentRung}" is not the lower of the two track rungs ("${lowestRung}")`;
  }
  // A rung above FOUNDING on the betting track must name the estimator that earned it.
  if (state.trackRungs.betting !== "FOUNDING" && state.pricedEstimators.length === 0) {
    return `betting track is at "${state.trackRungs.betting}" but no estimator is priced`;
  }
  for (const derivation of state.derivations) {
    const track: LadderTrack = derivation.track;
    if (derivation.type === "ESTIMATOR_PRICED") {
      if (!isNonEmptyString(derivation.estimatorKey)) {
        return "an ESTIMATOR_PRICED derivation carries no estimatorKey";
      }
      if (derivation.rung !== state.trackRungs[track]) {
        return `an ESTIMATOR_PRICED derivation cites rung "${derivation.rung}" while the ${track} track sits at "${state.trackRungs[track]}"`;
      }
    }
    if (derivation.type === "RUNG_ADVANCED" && derivation.rung === "FOUNDING") {
      return "a RUNG_ADVANCED derivation advanced to FOUNDING, which is not an earned rung";
    }
  }
  return null;
}

export function evalReduceLadder(input: ReduceLadderInput): ResearchEval<ReduceLadderResult> {
  if (!Array.isArray(input.events)) return fail("events must be an array");
  if (input.events.length === 0) return fail("events is empty; an empty ledger is FOUNDING by definition, not a reduction");
  const ids = new Set<string>();
  for (let i = 0; i < input.events.length; i++) {
    const event = input.events[i];
    if (event === undefined) return fail(`events[${i}] is undefined`);
    const eventError = validateLadderEvent(event, i);
    if (eventError !== null) return fail(eventError);
    if (ids.has(event.id)) {
      return fail(`events contains a duplicate id "${event.id}"; a replayed event would be counted twice`);
    }
    ids.add(event.id);
  }

  let state: LadderState;
  try {
    state = reduceLadder(input.events);
  } catch (err) {
    return fail(`reduceLadder threw ${describeError(err)}`);
  }
  const stateError = validateLadderState(state, ids);
  if (stateError !== null) return fail(stateError);

  return {
    ok: true,
    data: {
      currentRung: state.currentRung,
      trackRungs: state.trackRungs,
      settledSamples: state.settledSamples,
      validCalibration: state.validCalibration,
      surfaceEligibility: state.surfaceEligibility,
      pricedEstimators: state.pricedEstimators,
      derivations: state.derivations.map((d) => ({
        type: d.type,
        track: d.track,
        rung: d.rung,
        ...(d.estimatorKey === undefined ? {} : { estimatorKey: d.estimatorKey }),
        sourceEventIds: d.sourceEventIds,
      })),
      eventsSupplied: input.events.length,
      eventIds: [...ids],
      provenanceComplete: state.derivations.every((d) => d.sourceEventIds.every((id) => ids.has(id))),
      surfaceEligibilityReDerived: {
        canPublishProjections: RUNG_RANK[state.trackRungs.fantasy] >= RUNG_RANK.PROVEN,
        performanceStatsEnabled: RUNG_RANK[state.trackRungs.betting] >= RUNG_RANK.PROVEN,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (c2) ladder/heartbeat — per-game settled fan-out, idempotency is the product
// ─────────────────────────────────────────────────────────────────────────────

export interface GameSettledHeartbeatInput {
  readonly event: GameSettledEvent;
  readonly priorLedger?: readonly GameSettledFanoutLedgerEntry[];
  readonly priorLadderEvents?: readonly LadderEvent[];
}

export interface GameSettledHeartbeatResult {
  readonly ledger: readonly GameSettledFanoutLedgerEntry[];
  readonly newLedgerEntries: readonly GameSettledFanoutLedgerEntry[];
  readonly ladderEvents: readonly LadderEvent[];
  readonly newLadderEvents: readonly LadderEvent[];
  readonly ladderState: LadderState;
  readonly completedStages: readonly GameSettledStage[];
  readonly newEntriesAdded: number;
  /** Replaying the result against itself must add nothing; verified here, not assumed. */
  readonly idempotent: boolean;
  /** `ladderState` re-derived by calling reduceLadder on `ladderEvents` directly. */
  readonly ladderStateReDerived: LadderState;
}

function validateGameSettledEvent(event: GameSettledEvent): string | null {
  if (event === null || typeof event !== "object") return "event must be an object";
  if (event.type !== "GAME_SETTLED") return `event.type must be "GAME_SETTLED", received "${String(event.type)}"`;
  for (const field of ["id", "idempotencyKey", "occurredAt", "gameId", "league", "modelVersion"] as const) {
    if (!isNonEmptyString(event[field])) return `event.${field} must be a non-empty string`;
  }
  if (Number.isNaN(Date.parse(event.occurredAt))) return `event.occurredAt "${event.occurredAt}" is not a parseable timestamp`;
  if (!Number.isInteger(event.season) || !Number.isInteger(event.week)) return "event.season and event.week must be integers";
  const score = event.scoreline;
  if (score === null || typeof score !== "object") return "event.scoreline must be an object";
  if (!isNonEmptyString(score.homeTeamId) || !isNonEmptyString(score.awayTeamId)) {
    return "event.scoreline team ids must be non-empty strings";
  }
  if (!Number.isInteger(score.homePoints) || score.homePoints < 0) return "event.scoreline.homePoints must be a non-negative integer";
  if (!Number.isInteger(score.awayPoints) || score.awayPoints < 0) return "event.scoreline.awayPoints must be a non-negative integer";
  if (score.homeTeamId === score.awayTeamId) return "event.scoreline names the same team on both sides";
  if (!Array.isArray(event.completedStages)) return "event.completedStages must be an array";
  return null;
}

export function evalGameSettledHeartbeat(
  input: GameSettledHeartbeatInput,
): ResearchEval<GameSettledHeartbeatResult> {
  const eventError = validateGameSettledEvent(input.event);
  if (eventError !== null) return fail(eventError);
  const priorLedger = input.priorLedger ?? [];
  const priorLadderEvents = input.priorLadderEvents ?? [];
  if (!Array.isArray(priorLedger)) return fail("priorLedger must be an array when supplied");
  if (!Array.isArray(priorLadderEvents)) return fail("priorLadderEvents must be an array when supplied");
  for (let i = 0; i < priorLedger.length; i++) {
    const entry = priorLedger[i];
    if (entry === undefined) return fail(`priorLedger[${i}] is undefined`);
    if (!isNonEmptyString(entry.idempotencyKey)) return fail(`priorLedger[${i}].idempotencyKey must be a non-empty string`);
  }
  for (let i = 0; i < priorLadderEvents.length; i++) {
    const event = priorLadderEvents[i];
    if (event === undefined) return fail(`priorLadderEvents[${i}] is undefined`);
    const priorError = validateLadderEvent(event, i);
    if (priorError !== null) return fail(`priorLadderEvents: ${priorError}`);
  }

  const kernelInput: GameSettledFanoutInput = {
    event: input.event,
    priorLedger,
    priorLadderEvents,
  };
  let result: GameSettledFanoutResult;
  try {
    result = fanoutGameSettledHeartbeat(kernelInput);
  } catch (err) {
    return fail(`fanoutGameSettledHeartbeat threw ${describeError(err)}`);
  }

  const ledgerKeys = new Set<string>();
  for (const entry of result.ledger) {
    if (ledgerKeys.has(entry.idempotencyKey)) {
      return fail(`ledger contains a duplicate idempotencyKey "${entry.idempotencyKey}"`);
    }
    ledgerKeys.add(entry.idempotencyKey);
  }
  const priorKeys = new Set(priorLedger.map((entry) => entry.idempotencyKey));
  for (const entry of result.newLedgerEntries) {
    if (priorKeys.has(entry.idempotencyKey)) {
      return fail(`new ledger entry "${entry.idempotencyKey}" was already in the prior ledger`);
    }
  }
  if (result.ledger.length !== priorLedger.length + result.newLedgerEntries.length) {
    return fail(
      `ledger length ${result.ledger.length} is not prior (${priorLedger.length}) + new (${result.newLedgerEntries.length})`,
    );
  }
  if (result.ladderEvents.length !== priorLadderEvents.length + result.newLadderEvents.length) {
    return fail("ladderEvents length is not prior + new");
  }

  // The heartbeat embeds its own reduce; re-derive it from the event list.
  let ladderStateReDerived: LadderState;
  try {
    ladderStateReDerived = reduceLadder(result.ladderEvents);
  } catch (err) {
    return fail(`reduceLadder over the returned events threw ${describeError(err)}`);
  }
  if (ladderStateReDerived.currentRung !== result.ladderState.currentRung) {
    return fail(
      `heartbeat reports rung "${result.ladderState.currentRung}" but a direct reduction of the same events yields ` +
        `"${ladderStateReDerived.currentRung}"`,
    );
  }
  if (
    ladderStateReDerived.settledSamples.canonical.betting !==
    result.ladderState.settledSamples.canonical.betting
  ) {
    return fail("heartbeat's settled-sample count disagrees with a direct reduction of the same events");
  }
  const allEventIds = new Set(result.ladderEvents.map((e) => e.id));
  const stateError = validateLadderState(result.ladderState, allEventIds);
  if (stateError !== null) return fail(stateError);

  // Replaying the fan-out against its own output must be a no-op.
  let replay: GameSettledFanoutResult;
  try {
    replay = fanoutGameSettledHeartbeat({
      event: input.event,
      priorLedger: result.ledger,
      priorLadderEvents: result.ladderEvents,
    });
  } catch (err) {
    return fail(`replaying the fan-out threw ${describeError(err)}`);
  }
  const idempotent =
    replay.newLedgerEntries.length === 0 && replay.newLadderEvents.length === 0;
  if (!idempotent) {
    return fail(
      `replaying the fan-out added ${replay.newLedgerEntries.length} ledger entries and ${replay.newLadderEvents.length} ladder events; ` +
        "the heartbeat is not idempotent",
    );
  }

  return {
    ok: true,
    data: {
      ledger: result.ledger,
      newLedgerEntries: result.newLedgerEntries,
      ladderEvents: result.ladderEvents,
      newLadderEvents: result.newLadderEvents,
      ladderState: result.ladderState,
      completedStages: result.completedStages,
      newEntriesAdded: result.newLedgerEntries.length,
      idempotent,
      ladderStateReDerived,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (d) pipeline/live-orchestrator — SHADOW ONLY, never a publish path
// ─────────────────────────────────────────────────────────────────────────────

export interface OrchestratorEvalInput {
  readonly filter: TeamStrengthFilterOptions;
  readonly context: {
    readonly gameId: string;
    readonly homeTeamIdx: number;
    readonly awayTeamIdx: number;
    readonly marketHomeProb: number;
    readonly decimalOddsHome: number;
    readonly oddsEvents?: readonly {
      readonly time: number;
      readonly side: "home" | "away";
      readonly impliedProbDelta: number;
    }[];
    readonly evaluatedAt?: number;
  };
  readonly kellyAlpha?: number;
  readonly kellyCap?: number;
  /** Settle the game inside the same call so the E-process actually folds one pick. */
  readonly settle?: { readonly outcome: 0 | 1 };
}

export interface OrchestratorForecastSkill {
  readonly n: number;
  readonly logM: number;
  readonly anytimeValidPValue: number;
  readonly ourMeanProbability: number;
  readonly marketMeanProbability: number;
  readonly realisedRate: number;
  readonly minPicks: number;
  readonly eligible: boolean;
  readonly verdict: string;
  readonly vigWarning: boolean;
}

export interface OrchestratorEvalResult {
  readonly gameId: string;
  readonly particleFilterProb: number;
  readonly blendedProb: number;
  /** Mean of the particle filter and any SUCCEEDED remote endpoints. Not a probability claim. */
  readonly blendedProbIsCalibrated: false;
  readonly modelProbs: readonly number[];
  readonly edgeBitsVsBaseRate: number;
  readonly marketDisagreement: number;
  readonly kelly: {
    /** The honest stake: worst-case over the Beta set, after any cap. NOT a return estimate. */
    readonly robustFraction: number;
    readonly centralKellyFraction: number;
    readonly uncertaintyHaircut: number;
    readonly worstCaseProbability: number;
    readonly breakEvenProbability: number;
    readonly worstCaseEdge: number;
    readonly hasRobustEdge: boolean;
    readonly confidenceSet: { readonly lower: number; readonly upper: number; readonly width: number };
    readonly effectiveSampleSize: number;
    readonly priced: false;
    readonly status: "shadow";
  };
  readonly filterDiagnostics: {
    readonly observations: number;
    readonly ess: number;
    readonly essFraction: number;
    readonly weightsFinite: boolean;
  };
  readonly evaluatedAt: number;
  readonly forecastSkill: OrchestratorForecastSkill | null;
  /** Stamped because the kernel stamps it; asserted here so a regression is caught. */
  readonly priced: false;
  readonly status: "shadow";
  /** No remote endpoints are reachable through this bridge; stated so the ensemble size is explicit. */
  readonly remoteEndpointsConfigured: 0;
}

export async function evalOrchestratorGame(
  input: OrchestratorEvalInput,
): Promise<ResearchEval<OrchestratorEvalResult>> {
  if (input.filter === null || typeof input.filter !== "object") return fail("filter options are required");
  if (!Number.isInteger(input.filter.nTeams) || input.filter.nTeams < 2 || input.filter.nTeams > 4096) {
    return fail(`filter.nTeams must be an integer in [2, 4096], received ${String(input.filter.nTeams)}`);
  }
  if (!isFiniteNumber(input.filter.seed)) return fail("filter.seed is required; an unseeded stochastic output is not auditable");
  if (input.filter.nParticles !== undefined && (!Number.isInteger(input.filter.nParticles) || input.filter.nParticles < 1)) {
    return fail(`filter.nParticles must be a positive integer, received ${String(input.filter.nParticles)}`);
  }
  const ctx = input.context;
  if (ctx === null || typeof ctx !== "object") return fail("context is required");
  if (!isNonEmptyString(ctx.gameId)) return fail("context.gameId must be a non-empty string");
  if (!Number.isInteger(ctx.homeTeamIdx) || ctx.homeTeamIdx < 0 || ctx.homeTeamIdx >= input.filter.nTeams) {
    return fail(`context.homeTeamIdx ${String(ctx.homeTeamIdx)} is outside [0, ${input.filter.nTeams})`);
  }
  if (!Number.isInteger(ctx.awayTeamIdx) || ctx.awayTeamIdx < 0 || ctx.awayTeamIdx >= input.filter.nTeams) {
    return fail(`context.awayTeamIdx ${String(ctx.awayTeamIdx)} is outside [0, ${input.filter.nTeams})`);
  }
  if (ctx.homeTeamIdx === ctx.awayTeamIdx) return fail("context names the same team as both home and away");
  if (!inOpen(ctx.marketHomeProb, 0, 1)) {
    return fail(`context.marketHomeProb must lie in (0, 1), received ${String(ctx.marketHomeProb)}`);
  }
  if (!isFiniteNumber(ctx.decimalOddsHome) || ctx.decimalOddsHome <= 1) {
    return fail(`context.decimalOddsHome must be finite and > 1, received ${String(ctx.decimalOddsHome)}`);
  }
  if (ctx.evaluatedAt !== undefined && !isFiniteNumber(ctx.evaluatedAt)) {
    return fail("context.evaluatedAt must be finite when supplied");
  }
  for (let i = 0; i < (ctx.oddsEvents ?? []).length; i++) {
    const event = (ctx.oddsEvents ?? [])[i];
    if (event === undefined) return fail(`context.oddsEvents[${i}] is undefined`);
    if (!isFiniteNumber(event.time)) return fail(`context.oddsEvents[${i}].time must be finite`);
    if (!isFiniteNumber(event.impliedProbDelta)) {
      return fail(`context.oddsEvents[${i}].impliedProbDelta must be finite`);
    }
    if (event.side !== "home" && event.side !== "away") {
      return fail(`context.oddsEvents[${i}].side "${String(event.side)}" is not a steam side`);
    }
  }
  if (input.settle !== undefined && input.settle.outcome !== 0 && input.settle.outcome !== 1) {
    return fail("settle.outcome must be 0 or 1");
  }

  let orchestrator: LiveOrchestrator;
  try {
    // No remote endpoints: this bridge is offline-only, so the ensemble is the
    // particle filter alone and `modelProbs` has a known, fixed length.
    orchestrator = new LiveOrchestrator({
      filter: input.filter,
      endpoints: [],
      ...(input.kellyAlpha === undefined ? {} : { kellyAlpha: input.kellyAlpha }),
      ...(input.kellyCap === undefined ? {} : { kellyCap: input.kellyCap }),
    });
  } catch (err) {
    return fail(`LiveOrchestrator construction threw ${describeError(err)}`);
  }

  let observation: Awaited<ReturnType<LiveOrchestrator["evaluateGame"]>>;
  try {
    observation = await orchestrator.evaluateGame({
      gameId: ctx.gameId,
      homeTeamIdx: ctx.homeTeamIdx,
      awayTeamIdx: ctx.awayTeamIdx,
      marketHomeProb: ctx.marketHomeProb,
      decimalOddsHome: ctx.decimalOddsHome,
      ...(ctx.oddsEvents === undefined ? {} : { oddsEvents: ctx.oddsEvents }),
      ...(ctx.evaluatedAt === undefined ? {} : { evaluatedAt: ctx.evaluatedAt }),
    });
  } catch (err) {
    return fail(`evaluateGame threw ${describeError(err)}`);
  }

  if (!isNonEmptyString(observation.gameId)) return fail("observation.gameId is empty");
  if (observation.gameId !== ctx.gameId) {
    return fail(`observation came back for game "${observation.gameId}", not the requested "${ctx.gameId}"`);
  }
  if (!inOpen(observation.particleFilterProb, 0, 1)) {
    return fail(`particle filter probability ${observation.particleFilterProb} is outside (0, 1)`);
  }
  if (!inOpen(observation.blendedProb, 0, 1)) {
    return fail(`blended probability ${observation.blendedProb} is outside (0, 1)`);
  }
  if (!Array.isArray(observation.modelProbs) || observation.modelProbs.length === 0) {
    return fail("observation carries no model probabilities");
  }
  for (let i = 0; i < observation.modelProbs.length; i++) {
    const p = observation.modelProbs[i];
    if (p === undefined || !inOpen(p, 0, 1)) {
      return fail(`modelProbs[${i}] ${String(p)} is outside (0, 1)`);
    }
  }
  if (observation.modelProbs[0] !== observation.particleFilterProb) {
    return fail("modelProbs[0] is not the particle filter probability the kernel documents");
  }
  if (observation.remoteProbabilities.succeeded.length !== 0) {
    return fail("a remote endpoint reported success; this bridge configures none");
  }
  if (!isFiniteNumber(observation.edgeBitsVsBaseRate)) return fail("edgeBitsVsBaseRate is non-finite");
  if (!isFiniteNumber(observation.marketDisagreement)) return fail("marketDisagreement is non-finite");
  if (Math.abs(observation.marketDisagreement - (observation.blendedProb - ctx.marketHomeProb)) > 1e-9) {
    return fail("marketDisagreement is not blendedProb minus the market probability");
  }
  if (!isFiniteNumber(observation.evaluatedAt)) return fail("evaluatedAt is non-finite");
  if (observation.priced !== false || observation.status !== "shadow") {
    return fail("observation no longer carries priced:false / status:\"shadow\"");
  }
  const kelly = observation.kelly;
  if (!isFiniteNumber(kelly.robustFraction) || kelly.robustFraction < 0) {
    return fail(`kelly robust fraction ${String(kelly.robustFraction)} is not finite and >= 0`);
  }
  if (!isFiniteNumber(kelly.centralKellyFraction) || kelly.centralKellyFraction < 0) {
    return fail("central Kelly fraction is not finite and >= 0");
  }
  if (kelly.robustFraction > kelly.centralKellyFraction + 1e-12) {
    return fail("the robust fraction exceeds the central Kelly fraction; the uncertainty haircut is not a haircut");
  }
  if (!isFiniteNumber(kelly.uncertaintyHaircut) || kelly.uncertaintyHaircut < 0) {
    return fail("uncertainty haircut is not finite and >= 0");
  }
  if (Math.abs(kelly.uncertaintyHaircut - (kelly.centralKellyFraction - kelly.robustFraction)) > 1e-9) {
    return fail("uncertainty haircut does not equal central Kelly minus the robust fraction");
  }
  if (!isClosed(kelly.worstCaseProbability, 0, 1)) {
    return fail("worst-case probability is outside [0, 1]");
  }
  if (kelly.worstCaseProbability > kelly.probability + 1e-12) {
    return fail("the worst-case probability is above the central estimate; the honesty clamp is inverted");
  }
  if (!isClosed(kelly.breakEvenProbability, 0, 1)) return fail("break-even probability is outside [0, 1]");
  if (Math.abs(kelly.breakEvenProbability - 1 / ctx.decimalOddsHome) > 1e-9) {
    return fail("break-even probability is not 1 / decimalOdds");
  }
  if (!isFiniteNumber(kelly.worstCaseEdge)) return fail("worst-case edge is non-finite");
  if (Math.abs(kelly.worstCaseEdge - (kelly.worstCaseProbability - kelly.breakEvenProbability)) > 1e-9) {
    return fail("worst-case edge is not worst-case probability minus break-even");
  }
  if (kelly.hasRobustEdge !== kelly.worstCaseEdge > 0) {
    return fail(`hasRobustEdge (${kelly.hasRobustEdge}) disagrees with worstCaseEdge ${kelly.worstCaseEdge}`);
  }
  if (kelly.priced !== false || kelly.status !== "shadow") {
    return fail("kelly result no longer carries priced:false / status:\"shadow\"");
  }
  const cs = kelly.confidenceSet;
  if (!isClosed(cs.lower, 0, 1) || !isClosed(cs.upper, 0, 1)) {
    return fail(`beta confidence set [${cs.lower}, ${cs.upper}] is not inside [0, 1]`);
  }
  if (cs.upper < cs.lower) return fail("beta confidence set is inverted");
  if (!isFiniteNumber(cs.width) || cs.width < 0) return fail("beta confidence set width is negative or non-finite");
  if (Math.abs(cs.width - (cs.upper - cs.lower)) > 1e-9) {
    return fail("beta confidence set width does not equal upper minus lower");
  }
  if (cs.lower > kelly.probability || cs.upper < kelly.probability) {
    return fail("the beta confidence set does not contain the probability it was built from");
  }
  if (!Number.isInteger(kelly.effectiveSampleSize) || kelly.effectiveSampleSize < 0) {
    return fail("effectiveSampleSize is not a non-negative integer");
  }
  const fd = observation.filterDiagnostics;
  if (!fd.weightsFinite) return fail("filter particle weights are not finite");
  // ESS/nParticles is a computed ratio and can exceed 1 by one ulp; the tolerance
  // is float noise, not slack.
  if (!isClosed(fd.essFraction, 0, 1 + 1e-9)) {
    return fail(`filter ESS fraction ${fd.essFraction} is outside (0, 1]`);
  }
  if (!Number.isInteger(fd.observations) || fd.observations < 0) {
    return fail("filter observations is not a non-negative integer");
  }

  let forecastSkill: OrchestratorForecastSkill | null = null;
  if (input.settle !== undefined) {
    // A cold-started filter has never observed a game, so the pending pair has
    // to be registered explicitly — the kernel documents this path.
    orchestrator.registerPendingObservation(ctx.gameId, observation.blendedProb, ctx.marketHomeProb);
    let settlement: ReturnType<LiveOrchestrator["settleGame"]>;
    try {
      settlement = orchestrator.settleGame(
        ctx.gameId,
        ctx.homeTeamIdx,
        ctx.awayTeamIdx,
        input.settle.outcome,
      );
    } catch (err) {
      return fail(`settleGame threw ${describeError(err)}`);
    }
    const fs = settlement.forecastSkill;
    if (fs === null) {
      return fail(
        "settleGame folded no forecast-skill pick; the E-process would sit at n=0 forever without a registered observation",
      );
    }
    if (!Number.isInteger(fs.n) || fs.n < 1) return fail(`forecast-skill n ${String(fs.n)} is not a positive integer`);
    if (!isFiniteNumber(fs.logM)) return fail("forecast-skill logM is non-finite");
    if (!isClosed(fs.anytimeValidPValue, 0, 1)) {
      return fail(`anytime-valid p-value ${fs.anytimeValidPValue} is outside [0, 1]`);
    }
    if (!isClosed(fs.ourMeanProbability, 0, 1) || !isClosed(fs.marketMeanProbability, 0, 1)) {
      return fail("forecast-skill mean probabilities are outside [0, 1]");
    }
    if (!isClosed(fs.realisedRate, 0, 1)) return fail("forecast-skill realised rate is outside [0, 1]");
    if (fs.n !== 1) {
      return fail(`forecast-skill n is ${fs.n} after folding exactly one pick`);
    }
    if (fs.realisedRate !== input.settle.outcome) {
      return fail(`forecast-skill realised rate ${fs.realisedRate} is not the outcome just settled`);
    }
    if (!isFiniteNumber(fs.minPicks) || fs.minPicks < 1) return fail("forecast-skill minPicks is invalid");
    if (typeof fs.eligible !== "boolean") return fail("forecast-skill eligibility is not a boolean");
    if (typeof fs.vigWarning !== "boolean") return fail("forecast-skill vigWarning is not a boolean");
    if (!isNonEmptyString(fs.verdict)) return fail("forecast-skill verdict is empty");
    forecastSkill = {
      n: fs.n,
      logM: fs.logM,
      anytimeValidPValue: fs.anytimeValidPValue,
      ourMeanProbability: fs.ourMeanProbability,
      marketMeanProbability: fs.marketMeanProbability,
      realisedRate: fs.realisedRate,
      minPicks: fs.minPicks,
      eligible: fs.eligible,
      verdict: fs.verdict,
      vigWarning: fs.vigWarning,
    };
  }

  return {
    ok: true,
    data: {
      gameId: observation.gameId,
      particleFilterProb: observation.particleFilterProb,
      blendedProb: observation.blendedProb,
      blendedProbIsCalibrated: false,
      modelProbs: observation.modelProbs,
      edgeBitsVsBaseRate: observation.edgeBitsVsBaseRate,
      marketDisagreement: observation.marketDisagreement,
      kelly: {
        robustFraction: kelly.robustFraction,
        centralKellyFraction: kelly.centralKellyFraction,
        uncertaintyHaircut: kelly.uncertaintyHaircut,
        worstCaseProbability: kelly.worstCaseProbability,
        breakEvenProbability: kelly.breakEvenProbability,
        worstCaseEdge: kelly.worstCaseEdge,
        hasRobustEdge: kelly.hasRobustEdge,
        confidenceSet: { lower: cs.lower, upper: cs.upper, width: cs.width },
        effectiveSampleSize: kelly.effectiveSampleSize,
        priced: false,
        status: "shadow",
      },
      filterDiagnostics: {
        observations: fd.observations,
        ess: fd.ess,
        essFraction: fd.essFraction,
        weightsFinite: fd.weightsFinite,
      },
      evaluatedAt: observation.evaluatedAt,
      forecastSkill,
      priced: false,
      status: "shadow",
      remoteEndpointsConfigured: 0,
    },
  };
}
