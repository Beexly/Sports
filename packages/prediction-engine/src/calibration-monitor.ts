/**
 * Consecutive-day Brier health check — shadow.
 *
 * A single bad day is noise; a sustained run above the eligibility floor is a
 * regression worth surfacing. This module makes no claim about WHY Brier moved
 * (sample composition, a genuine model regression, a settlement bug) — it is a
 * trigger for a human to look, not a diagnosis.
 *
 * Deliberately pure and DB-agnostic: it takes an already-computed series of daily
 * Brier scores. The caller (an ops module with real database access) is
 * responsible for building that series from settled picks — see
 * `apps/web/lib/ops/calibration-regression-snapshot.ts`, which reuses the exact
 * `brierDecomposition` this package already exports rather than a second,
 * competing Brier calculator.
 */

import { expectedCalibrationError, type CalibrationSample } from "./probability-calibration.js";

function round(value: number, digits = 4): number {
  const s = 10 ** digits;
  return Math.round(value * s) / s;
}

export interface CalibrationHealthResult {
  readonly healthy: boolean;
  /** Longest run of consecutive above-threshold days ending at the series' end. */
  readonly currentStreak: number;
  /** Longest run of consecutive above-threshold days anywhere in the series. */
  readonly longestStreak: number;
  readonly threshold: number;
  readonly consecutiveDaysLimit: number;
  readonly alert: string | null;
}

/**
 * `recentBriers` is oldest-first (day 0 .. day N-1), matching how a caller would
 * naturally build it from `ORDER BY day ASC`. A non-finite entry (a day with no
 * settled picks, encoded as `NaN` rather than skipped, so gaps don't silently
 * reset the streak) breaks the current streak without counting as either a good
 * or a bad day — it is missing information, not evidence of health.
 */
export function checkCalibrationHealth(
  recentBriers: readonly number[],
  threshold = 0.22,
  consecutiveDays = 7,
): CalibrationHealthResult {
  const safeThreshold = Number.isFinite(threshold) ? threshold : 0.22;
  const safeLimit = Number.isInteger(consecutiveDays) && consecutiveDays > 0 ? consecutiveDays : 7;

  let currentStreak = 0;
  let longestStreak = 0;
  let alertStreak = 0;

  for (const brier of recentBriers) {
    if (!Number.isFinite(brier)) {
      currentStreak = 0;
      continue;
    }
    if (brier > safeThreshold) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    if (currentStreak >= safeLimit) {
      alertStreak = currentStreak;
    }
  }

  const healthy = alertStreak === 0;

  return {
    healthy,
    currentStreak,
    longestStreak,
    threshold: safeThreshold,
    consecutiveDaysLimit: safeLimit,
    alert: healthy
      ? null
      : `Brier > ${safeThreshold} for ${alertStreak} consecutive day(s) (limit ${safeLimit}).`,
  };
}

// ============================================================
// Negative-update guard — relative candidate-vs-incumbent regression check
// ============================================================
//
// Ported from arXiv:2403.04146 (FL-GUARD, "A Holistic Framework for Run-Time
// Detection and Recovery of Negative Federated Learning") — federation-
// agnostic at its core: a cheap run-time statistic for "did this update make
// things worse than the incumbent," robust-aggregated across cohorts,
// windowed, with an explicit consecutive-window trigger AND a symmetric
// cancellation rule. See docs/ops/edge/extraction/2026-08-26-group-learning-theory.md
// §2 for the full derivation (their Eqs. 1-5) and GSE's adaptation.
//
// Unlike `checkCalibrationHealth` above (an ABSOLUTE threshold on one
// series), this checks a RELATIVE gain — incumbent loss minus candidate loss
// — which is the actual question the C6 calibration apply/rollback decision
// asks: not "is Brier bad" but "did applying the candidate map make Brier
// worse than not applying it." Advisory only: this emits an alert
// recommendation, never a live gate flip — the C6 flip itself
// (CALIBRATION_ADJUSTMENTS_ENABLED) stays founder-gated per
// ADJUSTMENTS_ENABLE_RUNBOOK.

export interface CohortGain {
  /** e.g. "SPREAD:baseball_mlb" — identifies the cohort within one window; not otherwise used. */
  readonly cohort: string;
  /** The incumbent (currently-live) map's loss on this cohort's newest settlement window. */
  readonly incumbentLoss: number;
  /** The candidate (proposed) map's loss on the same cohort and window. */
  readonly candidateLoss: number;
}

export interface NegativeUpdateGuardResult {
  readonly alertActive: boolean;
  /** Consecutive most-recent rounds with smoothed beta-hat < 0. */
  readonly currentNegativeStreak: number;
  /** Consecutive most-recent rounds with smoothed beta-hat >= 0. */
  readonly currentPositiveStreak: number;
  readonly rollbackThreshold: number;
  readonly cancelWindow: number;
  /**
   * Smoothed beta-hat per round (same length and order as `windows`), NaN
   * for a round with no cohort data. beta-hat > 0 means the candidate beats
   * the incumbent in that round; < 0 means it is a negative update.
   */
  readonly smoothedSeries: readonly number[];
  readonly alert: string | null;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * `windows` is oldest-first, one array of per-cohort (incumbent, candidate)
 * loss pairs per settlement round — matching how a caller would build it
 * from the same settled-pick export the calibration fit report already
 * scripts, grouped by round then by cohort (pickType x sport). A round with
 * no cohorts (empty array) is a gap: its beta-hat is NaN and it resets both
 * streaks without counting as either a good or a bad round, matching
 * `checkCalibrationHealth`'s "missing information, not evidence" convention.
 *
 * Per round: per-cohort gain = incumbentLoss - candidateLoss (positive =
 * candidate is better); the round's statistic is the MEDIAN gain across its
 * cohorts (so one pathological cohort cannot flip the verdict — FL-GUARD's
 * robust-aggregation step, Eq. 4); the reported beta-hat is the trailing
 * mean of that statistic over the last `cancelWindow` rounds (Eq. 5 — the
 * source paper reuses one window size for both smoothing and cancellation,
 * kept here for fidelity).
 *
 * Trigger: smoothed beta-hat < 0 for MORE than `rollbackThreshold`
 * consecutive rounds raises a rollback alert. Cancellation: beta-hat >= 0
 * for `cancelWindow` consecutive rounds clears an active alert — the
 * asymmetric-then-symmetric hysteresis is deliberate (their §4.1, §5.1):
 * false positives are cheap to cancel, a real regression should not clear on
 * one good round.
 */
export function checkNegativeUpdateGuard(
  windows: readonly (readonly CohortGain[])[],
  rollbackThreshold = 3,
  cancelWindow = 2,
): NegativeUpdateGuardResult {
  const safeRollback = Number.isInteger(rollbackThreshold) && rollbackThreshold > 0 ? rollbackThreshold : 3;
  const safeCancel = Number.isInteger(cancelWindow) && cancelWindow > 0 ? cancelWindow : 2;

  const perRound = windows.map((cohorts) =>
    cohorts.length === 0 ? NaN : median(cohorts.map((c) => c.incumbentLoss - c.candidateLoss)),
  );

  const smoothedSeries: number[] = [];
  let negativeStreak = 0;
  let positiveStreak = 0;
  let alertActive = false;

  for (let i = 0; i < perRound.length; i++) {
    if (!Number.isFinite(perRound[i])) {
      smoothedSeries.push(NaN);
      negativeStreak = 0;
      positiveStreak = 0;
      continue;
    }
    // Trailing mean over the last `safeCancel` rounds' valid statistics
    // (natural warm-up: fewer than safeCancel samples for the first rounds).
    const windowStart = Math.max(0, i - safeCancel + 1);
    const trailing = perRound.slice(windowStart, i + 1).filter((v) => Number.isFinite(v));
    const smoothed = trailing.reduce((s, v) => s + v, 0) / trailing.length;
    smoothedSeries.push(smoothed);

    if (smoothed < 0) {
      negativeStreak += 1;
      positiveStreak = 0;
    } else {
      positiveStreak += 1;
      negativeStreak = 0;
    }

    if (!alertActive && negativeStreak > safeRollback) alertActive = true;
    else if (alertActive && positiveStreak >= safeCancel) alertActive = false;
  }

  return {
    alertActive,
    currentNegativeStreak: negativeStreak,
    currentPositiveStreak: positiveStreak,
    rollbackThreshold: safeRollback,
    cancelWindow: safeCancel,
    smoothedSeries,
    alert: alertActive
      ? `Candidate calibration map underperformed the incumbent (median cohort loss gain < 0) for more than ${safeRollback} consecutive round(s) — recommend rollback.`
      : null,
  };
}

// ============================================================
// Phase-bucketed calibration audit — catches aggregation-masking
// ============================================================
//
// Ported from arXiv:1906.05029 (Robberechts, Van Haaren & Davis, "A Bayesian
// Approach to In-Game Win Probability in Soccer," KDD '21), §3.4/§4.2 Table 1:
// their model's OVERALL ECE (0.011) hides badly-miscalibrated late-game tie
// probabilities that only show up when ECE is evaluated per game phase
// (H1/H2/final-10%) — baselines "calibrated overall" were markedly worse in
// that window. See docs/ops/edge/extraction/2026-08-26-group-batch3.md §1 for
// the full derivation and GSE's adaptation.
//
// GSE has no in-game phases (picks are pregame), so "phase" here generalizes
// the paper's own "time-to-event bucketing" framing: any caller-supplied
// label a pick's calibration might plausibly vary by — time-to-kickoff
// window, sport, pickType, book count, whatever the fit-report runbook wants
// to slice on. This is a pure audit surface: it fires no gate and flips
// nothing; it exists so a C-series calibration flip decision looks at the
// phase-split view, not just the headline number that can mask exactly the
// failure this paper measured.

export interface PhaseSample extends CalibrationSample {
  /** Caller-defined bucket label — e.g. a time-to-kickoff window, sport, or pickType. */
  readonly phase: string;
}

export interface PhaseBucketRow {
  readonly phase: string;
  readonly n: number;
  readonly ece: number;
  readonly brier: number;
  readonly meanForecast: number;
  readonly observedRate: number;
  /** This phase's ECE exceeds `floor` on its own — regardless of what the overall ECE shows. Only set when `n >= minPhaseSamples` (a thin phase's ECE is too noisy to act on). */
  readonly exceedsFloor: boolean;
}

export interface PhaseBucketedAuditResult {
  readonly overallEce: number;
  readonly overallBrier: number;
  readonly floor: number;
  readonly phases: readonly PhaseBucketRow[];
  /**
   * True exactly when the overall ECE is within `floor` but at least one
   * phase (with enough samples to trust) exceeds it — the aggregation-masking
   * failure mode this audit exists to catch. False when the overall is
   * ALSO over the floor: that failure is already visible without this audit.
   */
  readonly masked: boolean;
  readonly alert: string | null;
}

/**
 * Group `samples` by `phase`, compute ECE and raw Brier per group alongside
 * the overall figures, and flag whether any phase hides behind an
 * acceptable-looking overall average. `floor` defaults to the platform's ECE
 * eligibility floor (0.05, `2026-08-26-CALIBRATION-FIT-REPORT.md`).
 * `minPhaseSamples` (default 20) withholds the `exceedsFloor`/`masked`
 * verdict for phases too thin to trust — reported, not flagged.
 */
export function phaseBucketedCalibrationAudit(
  samples: readonly PhaseSample[],
  floor = 0.05,
  bins = 10,
  minPhaseSamples = 20,
): PhaseBucketedAuditResult {
  if (samples.length === 0) {
    return { overallEce: 0, overallBrier: 0, floor, phases: [], masked: false, alert: null };
  }

  const overallEce = expectedCalibrationError(samples, bins);
  const overallBrier = round(samples.reduce((sum, s) => sum + (s.p - s.y) ** 2, 0) / samples.length);

  const byPhase = new Map<string, PhaseSample[]>();
  for (const s of samples) {
    const arr = byPhase.get(s.phase) ?? [];
    arr.push(s);
    byPhase.set(s.phase, arr);
  }

  const phases: PhaseBucketRow[] = [...byPhase.entries()]
    .map(([phase, group]) => {
      const n = group.length;
      const ece = expectedCalibrationError(group, bins);
      return {
        phase,
        n,
        ece,
        brier: round(group.reduce((sum, s) => sum + (s.p - s.y) ** 2, 0) / n),
        meanForecast: round(group.reduce((sum, s) => sum + s.p, 0) / n),
        observedRate: round(group.reduce((sum, s) => sum + s.y, 0) / n),
        exceedsFloor: n >= minPhaseSamples && ece > floor,
      };
    })
    .sort((a, b) => (a.phase < b.phase ? -1 : a.phase > b.phase ? 1 : 0));

  const flagged = phases.filter((p) => p.exceedsFloor);
  const masked = overallEce <= floor && flagged.length > 0;

  return {
    overallEce,
    overallBrier,
    floor,
    phases,
    masked,
    alert: masked
      ? `Overall ECE ${overallEce.toFixed(4)} is within the ${floor} floor, but phase(s) ${flagged.map((p) => p.phase).join(", ")} exceed it — aggregation is masking a phase-specific miscalibration.`
      : null,
  };
}

// ============================================================
// Stability-plasticity check — bounds forgetting on the re-fit cadence
// ============================================================
//
// Ported from arXiv:2503.04638 ("No Forgetting Learning" — despite the name
// collision, No FORGETTING Learning, not football), a buffer-free continual-
// learning method whose Plasticity-Stability ratio (their Eq. 29: new-task
// learning gain divided by absolute forgetting on old tasks) names the exact
// failure mode GSE's re-fit cadence risks once any recency weighting or
// windowing enters the calibration fit: an update that buys recent-cohort
// performance by degrading early-season regimes. See
// docs/ops/edge/extraction/2026-08-26-group-learning-theory.md §1 for the
// full derivation. The paper's continual-learning MACHINERY does not port
// (GSE keeps every settled pick — no buffer constraint the method solves for);
// only the evaluation discipline does.

export interface CohortEce {
  readonly incumbentEce: number;
  readonly candidateEce: number;
}

export interface StabilityPlasticityResult {
  /** Held-out improvement of the candidate over the incumbent on the NEWEST cohort. Positive = candidate is better there. */
  readonly plasticity: number;
  /** Degradation of the candidate vs the incumbent on the OLDEST cohort. Positive = candidate forgot; negative = candidate improved there too. */
  readonly forgetting: number;
  /** plasticity / max(|forgetting|, epsilon) — their Eq. 29, higher is better. Reported for the bake-off table, not the pass/fail mechanism. */
  readonly psRatio: number;
  readonly forgettingBound: number;
  /** forgetting <= forgettingBound — the actual C6 eligibility gate. */
  readonly eligible: boolean;
  readonly alert: string | null;
}

/**
 * Compare a candidate calibration map's ECE against the incumbent's on the
 * newest and oldest settled cohorts (e.g. first-third vs last-third of the
 * season-to-date, or NFL-season week buckets). `forgettingBound` defaults to
 * +0.01 ECE on the early cohort — a candidate that improves the newest slice
 * but degrades the oldest beyond this bound is NOT eligible for C6, even if
 * its overall held-out ECE looks better. `forgettingBound` falls back to the
 * default when non-finite or negative (a negative bound would forbid every
 * candidate, including one that improves everywhere).
 */
export function stabilityPlasticityCheck(
  newestCohort: CohortEce,
  oldestCohort: CohortEce,
  forgettingBound = 0.01,
): StabilityPlasticityResult {
  const safeBound = Number.isFinite(forgettingBound) && forgettingBound >= 0 ? forgettingBound : 0.01;

  // Compare the RAW (unrounded) delta against safeBound -- rounding first
  // (e.g. 0.0100004 -> 0.01 at 4dp) could make a candidate that actually
  // exceeds the bound read as exactly at it and pass.
  const rawPlasticity = newestCohort.incumbentEce - newestCohort.candidateEce;
  const rawForgetting = oldestCohort.candidateEce - oldestCohort.incumbentEce;
  const plasticity = round(rawPlasticity);
  const forgetting = round(rawForgetting);
  const psRatio = round(rawPlasticity / Math.max(Math.abs(rawForgetting), 1e-6), 6);
  const eligible = rawForgetting <= safeBound;

  return {
    plasticity,
    forgetting,
    psRatio,
    forgettingBound: safeBound,
    eligible,
    alert: eligible
      ? null
      : `Candidate degrades the oldest cohort's ECE by ${forgetting.toFixed(4)}, exceeding the ${safeBound} forgetting bound — not eligible for C6 despite any newest-cohort improvement (plasticity ${plasticity.toFixed(4)}).`,
  };
}
