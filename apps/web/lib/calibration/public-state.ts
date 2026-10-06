/**
 * Public calibration state — ONE honest, customer-safe answer derived from the
 * evidence, replacing the boolean a caller used to assert.
 *
 * THE DEFECT THIS FIXES
 * ---------------------
 * `compilePublicClaim` has always taken `calibrationPublishable?: boolean`. That
 * is an ASSERTION, not a measurement: any caller can pass `true` and the single
 * public gate ALLOWs the claim. Nothing in the compiler can tell a verified
 * reading from a hopeful one. (The integrity ledger records the compiler itself
 * as `wiredStatus: "NO"` — nothing walked it on the public render path — so
 * until this module existed there was no verified reading to pass at all.)
 *
 * Worse, the platform measured TWO different quantities and published them side
 * by side without saying which was which:
 *   - the market-implied PROBABILITY on settled two-way moneylines (the number
 *     ECE/Brier/Murphy are actually computed on), and
 *   - the confidence SCORE, which `computeCalibration` states outright is
 *     "not a calibrated win probability" and is anti-predictive at the top.
 * A customer reading a GREEN gate on /calibration and a reliability curve on
 * /performance could reasonably conflate them. The honest reading is that they
 * are different instruments, and only one of them is a probability.
 *
 * WHAT THIS MODULE DOES
 * ---------------------
 * Compiles the durable eligibility evidence into one graded state with a
 * customer-safe sentence beside it. It COMPOSES `calibration-eligibility` and
 * `calibration-eligibility-durable`; it never re-implements a floor, and it
 * never re-derives a metric.
 *
 * HONESTY RULES, in code:
 *   - `MEETS_FLOOR` clears OUR floor on THIS sample. It never asserts that the
 *     model "is calibrated" — one sample clearing one threshold is a much
 *     weaker claim, and the wording is held to it.
 *   - Below the sample floor the evidence is withheld, not approximated. A
 *     `COLLECTING` state carries no numbers at all.
 *   - `BELOW_FLOOR` is a first-class, fully renderable state. Bad news the
 *     platform measured is published as itself, with the failing floor named.
 *   - `UNAVAILABLE` is NOT a verdict. A failed read is never reported as a
 *     failing measurement, and never as a passing one either.
 *   - `STALE` is its own state: old-but-real evidence is not live evidence.
 *   - The confidence-score disclosure ships on EVERY state. The score is on the
 *     same page as the probability; the caveat that separates them can never be
 *     the thing that gets dropped.
 *
 * Pure, no I/O, no env reads. Every string it emits is asserted banned-phrase
 * clean in `__tests__/calibration-public-state.test.ts`.
 */

import {
  type CalibrationEligibilityFloors,
  type CalibrationEligibilityReport,
} from "@/lib/ops/calibration-eligibility";
import {
  failingFloorsFromReport,
  type EligibilityDurableSnap,
  type PublishReceipt,
} from "@/lib/ops/calibration-eligibility-durable";

/**
 * Four missed six-hourly runs. Mirrors `MAX_SNAP_AGE_MS` in
 * components/calibration/gate-reading.tsx, which cannot be imported here: that
 * module is a React component, and a pure grading module must not pull React in
 * to ask whether a timestamp is old. The shared test asserts the two agree, so
 * a future edit to one that misses the other fails a test rather than
 * silently giving two surfaces different freshness rules.
 */
export const MAX_SNAP_AGE_MS = 24 * 60 * 60 * 1000;

/** True when a snap is older than the schedule allows, or its clock is unreadable. */
export function snapIsStale(snap: EligibilityDurableSnap, now: number = Date.now()): boolean {
  const t = Date.parse(snap.evaluatedAt);
  if (!Number.isFinite(t)) return true;
  return now - t > MAX_SNAP_AGE_MS;
}

/**
 * Graded calibration state. Ordered worst-evidence-first; the ordering is
 * meaningful (see `rankState`) because the caller reports ONE state and a
 * RED/withheld reading must never be reported as a passing one.
 */
export type CalibrationState =
  /** No artifact has ever been written. We have never measured this. */
  | "NO_EVIDENCE"
  /** A read failed. Not a verdict in either direction. */
  | "UNAVAILABLE"
  /** Evidence exists but is older than the measurement schedule allows. */
  | "STALE"
  /** A real sample exists, below the sample floor. Evidence withheld. */
  | "COLLECTING"
  /** Measured, and it FAILS our floor. Publishable bad news. */
  | "BELOW_FLOOR"
  /** Measured, and it clears our floor on this sample. */
  | "MEETS_FLOOR";

/** Evidence the state was graded on. Null whenever the state withholds figures. */
export interface CalibrationEvidence {
  /** Settled, canonical, scored rows behind the reading. */
  readonly n: number;
  readonly brier: number | null;
  /** Bias-corrected ECE — the figure the floor reads. */
  readonly eceDebiased: number | null;
  /** Sampling-noise expectation the correction subtracts. Stated with it. */
  readonly eceNoise: number | null;
  readonly murphyReliability: number | null;
}

export interface CalibrationPublicState {
  readonly state: CalibrationState;
  /**
   * True only for `MEETS_FLOOR`. The ONE field a claim may read to assert that
   * a calibration figure is backed. Narrow on purpose: everything else is a
   * statement, not a licence.
   */
  readonly clearsOurFloor: boolean;
  /** Null for every state that withholds figures (UNAVAILABLE/STALE/COLLECTING). */
  readonly evidence: CalibrationEvidence | null;
  /** The floors the evidence was compared against. Null when unmeasured. */
  readonly floors: CalibrationEligibilityFloors | null;
  /** Floor comparisons that failed, named. Empty when none failed. */
  readonly failingFloors: readonly string[];
  /**
   * One customer-safe sentence describing the state against our own floor.
   * Never asserts a win rate — that number belongs to the Honest Band on
   * /performance, which owns the uncertainty interval for it.
   */
  readonly statement: string;
  /** The quantity the numbers above were measured ON. Always the probability. */
  readonly measuredQuantity: string;
  /** What this state explicitly does NOT establish. Always non-empty. */
  readonly notEstablished: readonly string[];
  /** ISO time of the evaluation, or null when nothing was evaluated. */
  readonly measuredAt: string | null;
  /**
   * The confidence-score disclosure. Constant across every state, because the
   * score sits next to the probability on the same page and the distinction is
   * structural — it does not depend on how this sample happens to read.
   */
  readonly confidenceScoreDisclosure: string;
  /** Model version the reading was stamped with, when known. */
  readonly modelVersion: string | null;
}

/**
 * Read the durable record and grade it. The I/O wrapper around
 * `resolveCalibrationState`, kept beside it so the mapping from store to state
 * has exactly one definition.
 *
 * A READ FAILURE is caught and reported as `UNAVAILABLE` rather than thrown.
 * A `/calibration` outage is not a reason to 500 the Proof Room: a customer
 * deserves to be told the reading is unavailable, which is a real, honest
 * answer, rather than shown an error page that tells them nothing.
 */
export async function loadCalibrationPublicState(): Promise<CalibrationPublicState> {
  const { loadLatestEligibilitySnap } = await import("@/lib/ops/calibration-eligibility-durable");
  const { CONFIDENCE_PROBABILITY_CAVEAT } = await import("@/lib/calibration/compute");
  let snap: EligibilityDurableSnap | null = null;
  let readFailed = false;
  try {
    snap = await loadLatestEligibilitySnap();
  } catch {
    readFailed = true;
  }
  return resolveCalibrationState({
    snap,
    readFailed,
    confidenceScoreDisclosure: CONFIDENCE_PROBABILITY_CAVEAT,
  });
}

/**
 * What the numbers were measured ON. Deliberately a literal: this is the
 * sentence that stops a reader treating the ECE figure as a statement about the
 * confidence score, or about win rate.
 */
export const MEASURED_QUANTITY =
  "the market-implied win probability on our settled two-way moneyline picks";

/**
 * What no state in this module can establish. Attached to EVERY state, because
 * the failure mode being guarded against is a reader inferring more from a
 * passing gate than a passing gate supports.
 */
export const NOT_ESTABLISHED: readonly string[] = [
  "It is not a claim about future results, and past performance does not guarantee them.",
  "It is not a win rate. Win rate, with its uncertainty band, is reported separately.",
  "It does not describe the confidence score, which is a ranking score rather than a probability.",
  "It is a reading on one sample against thresholds we set ourselves, not an external certification.",
];

// The failing-floor list COMES FROM the durable module, which is the single
// source of truth for that wording. It is not re-derived here: two copies of
// "which floor did we miss" is precisely how a public surface ends up naming a
// floor the gate never failed.
function failingFloorsFrom(
  report: CalibrationEligibilityReport,
): readonly string[] {
  return failingFloorsFromReport(report);
}

/** Worst-evidence-first, so a caller reporting one state never reports a
 *  passing reading over a withheld one. */
const STATE_RANK: Readonly<Record<CalibrationState, number>> = {
  NO_EVIDENCE: 0,
  UNAVAILABLE: 1,
  STALE: 2,
  COLLECTING: 3,
  BELOW_FLOOR: 4,
  MEETS_FLOOR: 5,
};

export function rankState(state: CalibrationState): number {
  return STATE_RANK[state];
}

/**
 * Worsen a state. Used by the claim compiler so an unknown or withheld reading
 * can never satisfy a calibration claim by default.
 */
export function worseState(
  a: CalibrationState,
  b: CalibrationState,
): CalibrationState {
  return STATE_RANK[a] <= STATE_RANK[b] ? a : b;
}

export interface CalibrationStateInput {
  /** Durable eligibility evaluation, or null when none was ever written. */
  readonly snap: EligibilityDurableSnap | null;
  /**
   * Set when the read itself failed, as opposed to finding nothing. Distinguishes
   * "we never measured" from "we could not look" — a failed read is not a verdict.
   */
  readonly readFailed?: boolean;
  /** Latest publish receipt, when one exists. */
  readonly receipt?: PublishReceipt | null;
  /** Injected clock, so staleness is testable rather than ambient. */
  readonly now?: number;
  /**
   * The confidence-score disclosure, injected from its single source of truth
   * (`CONFIDENCE_PROBABILITY_CAVEAT`). Passed in rather than imported so this
   * module cannot fork the wording; the test asserts the identity.
   */
  readonly confidenceScoreDisclosure: string;
}

function base(input: CalibrationStateInput): Pick<
  CalibrationPublicState,
  "measuredQuantity" | "notEstablished" | "confidenceScoreDisclosure"
> {
  return {
    measuredQuantity: MEASURED_QUANTITY,
    notEstablished: NOT_ESTABLISHED,
    confidenceScoreDisclosure: input.confidenceScoreDisclosure,
  };
}

/**
 * Grade the durable evidence. Pure: same input, same state, every time.
 *
 * `MEETS_FLOOR` is reachable only by a real report that cleared every floor on
 * its own sample. There is no code path that grants it without one.
 */
export function resolveCalibrationState(
  input: CalibrationStateInput,
): CalibrationPublicState {
  const shared = base(input);

  if (input.readFailed) {
    return {
      ...shared,
      state: "UNAVAILABLE",
      clearsOurFloor: false,
      evidence: null,
      floors: null,
      failingFloors: [],
      statement:
        "We could not read our calibration record just now. That is a connection problem, not a result, and we are not reporting it as one.",
      measuredAt: null,
      modelVersion: null,
    };
  }

  const snap = input.snap;
  if (!snap) {
    return {
      ...shared,
      state: "NO_EVIDENCE",
      clearsOurFloor: false,
      evidence: null,
      floors: null,
      failingFloors: [],
      statement:
        "We have not published a calibration reading yet. Until a settled sample clears our sample floor we report no calibration figures at all.",
      measuredAt: null,
      modelVersion: null,
    };
  }

  const report = snap.report;
  const measuredAt = snap.evaluatedAt || null;
  const modelVersion = report.modelVersion ?? null;
  const failing = failingFloorsFrom(report);
  const belowSampleFloor = report.n < report.floors.n;

  // Staleness is checked BEFORE the verdict is read: evidence past the schedule
  // is not live evidence, and a passing reading that has expired must not keep
  // its numbers on the page.
  if (snapIsStale(snap, input.now ?? Date.now())) {
    return {
      ...shared,
      state: "STALE",
      clearsOurFloor: false,
      evidence: null,
      floors: report.floors,
      failingFloors: failing,
      statement: `Our last calibration reading is from ${measuredAt ?? "an unknown time"} and is older than our measurement schedule allows. We are withholding its figures rather than showing you a stale number.`,
      measuredAt,
      modelVersion,
    };
  }

  if (belowSampleFloor) {
    return {
      ...shared,
      state: "COLLECTING",
      clearsOurFloor: false,
      // No evidence object at all: a sub-floor sample is not a weak reading, it
      // is no reading. Returning it would invite a renderer to print it.
      evidence: null,
      floors: report.floors,
      failingFloors: failing,
      statement: `We are still collecting: ${report.n} of the ${report.floors.n} settled picks our floor requires. We publish no calibration figure below that, because a small sample cannot support one.`,
      measuredAt,
      modelVersion,
    };
  }

  const evidence: CalibrationEvidence = {
    n: report.n,
    brier: report.brier,
    eceDebiased: report.eceDebiased,
    eceNoise: report.eceNoise,
    murphyReliability: report.murphy?.reliability ?? null,
  };

  if (failing.length > 0 || report.status !== "GREEN") {
    return {
      ...shared,
      state: "BELOW_FLOOR",
      clearsOurFloor: false,
      evidence,
      floors: report.floors,
      failingFloors: failing,
      statement: `Our latest reading does not clear our own calibration floor on ${report.n} settled picks. The measurements that missed: ${failing.join("; ") || "the eligibility streak has not completed"}. We are publishing this because it is what we measured.`,
      measuredAt,
      modelVersion,
    };
  }

  // MEETS_FLOOR. The wording is deliberately narrow: it clears OUR floor on THIS
  // sample. It does not say "calibrated", "accurate", or anything that would
  // survive being quoted without `notEstablished` attached.
  return {
    ...shared,
    state: "MEETS_FLOOR",
    clearsOurFloor: true,
    evidence,
    floors: report.floors,
    failingFloors: [],
    statement: `On ${report.n} settled picks, our latest reading of ${MEASURED_QUANTITY} cleared every floor we set for it: a Brier score of ${report.brier?.toFixed(3) ?? "n/a"} and a bias-corrected calibration error of ${(report.eceDebiased ?? report.ece)?.toFixed(3) ?? "n/a"}. That is one sample against thresholds we chose ourselves.`,
    measuredAt,
    modelVersion,
  };
}

/**
 * The single field a CALIBRATION claim must read. Anything other than
 * `MEETS_FLOOR` withholds the claim.
 */
export function calibrationStateClearsFloor(
  state: CalibrationPublicState | null | undefined,
): boolean {
  return state?.state === "MEETS_FLOOR" && state.clearsOurFloor === true;
}
