/**
 * Continual-learning bridge — wires online metrics, EWC feature anchoring,
 * and AdaER replay-buffer selection into the live update path.
 *
 * This is the "learning" half of the engine: after each settlement, the
 * online metric suite tracks drift, EWC anchors features that matter, and
 * AdaER picks which past examples to keep in the replay buffer.
 *
 * Fail-closed on missing inputs. Never invents an importance weight.
 */

import {
  onlineMetricSuite,
  brierScore,
  ewcPenalty,
  importanceOverlap,
  overlapRegime,
  adaErBufferSelect,
  interferenceScores,
  type OnlineMetrics,
  type AdaErSelection,
  type OverlapRegime,
} from "@sports/prediction-engine";

export type OnlineMetricsEval =
  | { readonly ok: true; readonly data: OnlineMetrics }
  | { readonly ok: false; readonly reason: string };

/**
 * Track rolling Brier / log-loss / accuracy after each settled week.
 * Inputs are weekly series: one array of probs + outcomes per week.
 * Empty or misaligned weeks abstain.
 */
export function evalOnlineMetrics(input: {
  readonly weeklyProbs: readonly (readonly number[])[];
  readonly weeklyOutcomes: readonly (readonly number[])[];
}): OnlineMetricsEval {
  const { weeklyProbs, weeklyOutcomes } = input;
  if (
    !Array.isArray(weeklyProbs) ||
    !Array.isArray(weeklyOutcomes) ||
    weeklyProbs.length === 0 ||
    weeklyProbs.length !== weeklyOutcomes.length
  ) {
    return { ok: false, reason: "weeklyProbs and weeklyOutcomes must be non-empty and aligned" };
  }
  for (let w = 0; w < weeklyProbs.length; w++) {
    const wp = weeklyProbs[w]!;
    const wo = weeklyOutcomes[w]!;
    if (!Array.isArray(wp) || !Array.isArray(wo) || wp.length === 0 || wp.length !== wo.length) {
      return {
        ok: false,
        reason: `week ${w}: probs/outcomes must be non-empty and aligned — not imputed`,
      };
    }
    for (let i = 0; i < wp.length; i++) {
      const p = wp[i];
      if (p == null || !Number.isFinite(p) || p <= 0 || p >= 1) {
        return {
          ok: false,
          reason: `week ${w} row ${i}: prob must be finite in (0,1) — not imputed`,
        };
      }
    }
  }
  try {
    return {
      ok: true,
      data: onlineMetricSuite(weeklyProbs, weeklyOutcomes),
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type EwcAnchorEval =
  | {
      readonly ok: true;
      readonly data: {
        readonly penalty: number;
        readonly overlap: number;
        readonly regime: OverlapRegime;
      };
    }
  | { readonly ok: false; readonly reason: string };

/**
 * EWC anchor check: how important are the current features relative to the
 * anchored Fisher weights, and what regime does that put us in?
 */
export function evalEwcAnchor(input: {
  readonly currentParams: readonly number[];
  readonly anchoredParams: readonly number[];
  readonly fisherDiag: readonly number[];
  readonly lambda: number;
}): EwcAnchorEval {
  const { currentParams, anchoredParams, fisherDiag, lambda } = input;
  if (
    !Array.isArray(currentParams) ||
    !Array.isArray(anchoredParams) ||
    !Array.isArray(fisherDiag) ||
    currentParams.length === 0 ||
    currentParams.length !== anchoredParams.length ||
    currentParams.length !== fisherDiag.length
  ) {
    return {
      ok: false,
      reason: "currentParams/anchoredParams/fisherDiag must be non-empty and aligned",
    };
  }
  if (!Number.isFinite(lambda) || lambda < 0) {
    return { ok: false, reason: "lambda must be finite and >= 0" };
  }
  try {
    const penalty = ewcPenalty(
      currentParams as number[],
      anchoredParams as number[],
      fisherDiag as number[],
      lambda,
    );
    const overlap = importanceOverlap(
      fisherDiag as number[],
      currentParams as number[],
    );
    const regime = overlapRegime(overlap);
    return {
      ok: true,
      data: {
        penalty: Number(penalty.toFixed(6)),
        overlap: Number(overlap.toFixed(6)),
        regime,
      },
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export type AdaErSelectEval =
  | { readonly ok: true; readonly data: AdaErSelection }
  | { readonly ok: false; readonly reason: string };

/**
 * AdaER replay-buffer selection: which past examples to keep so the model
 * does not catastrophically forget. Interference = challengerLoss − championLoss.
 */
export function evalAdaErSelect(input: {
  readonly challengerLoss: readonly number[];
  readonly championLoss: readonly number[];
  readonly newWeekIndices: readonly number[];
  readonly topP: number;
  readonly reservoirK: number;
  readonly labels: readonly number[];
}): AdaErSelectEval {
  const { challengerLoss, championLoss, newWeekIndices, topP, reservoirK, labels } = input;
  if (
    !Array.isArray(challengerLoss) ||
    !Array.isArray(championLoss) ||
    !Array.isArray(newWeekIndices) ||
    !Array.isArray(labels) ||
    challengerLoss.length === 0 ||
    challengerLoss.length !== championLoss.length ||
    challengerLoss.length !== labels.length
  ) {
    return {
      ok: false,
      reason: "challengerLoss/championLoss/labels must be non-empty and aligned",
    };
  }
  if (!Number.isFinite(topP) || topP < 0 || !Number.isFinite(reservoirK) || reservoirK < 0) {
    return { ok: false, reason: "topP and reservoirK must be finite and >= 0" };
  }
  try {
    const data = adaErBufferSelect({
      challengerLoss: challengerLoss as number[],
      championLoss: championLoss as number[],
      newWeekIndices: newWeekIndices as number[],
      topP,
      reservoirK,
      labels: labels as number[],
    });
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Rolling Brier on a settled batch — the cheapest honest learning signal.
 */
export function settledBrier(
  probs: readonly number[],
  outcomes: readonly (0 | 1)[],
): number | null {
  if (
    !Array.isArray(probs) ||
    !Array.isArray(outcomes) ||
    probs.length === 0 ||
    probs.length !== outcomes.length
  ) {
    return null;
  }
  try {
    return Number(brierScore(probs as number[], outcomes as number[]).toFixed(6));
  } catch {
    return null;
  }
}

export {
  onlineMetricSuite,
  brierScore,
  ewcPenalty,
  importanceOverlap,
  overlapRegime,
  adaErBufferSelect,
  interferenceScores,
};
export type { OnlineMetrics, AdaErSelection, OverlapRegime };

// ── Teacher-student + certainty-weighted continual (live call sites) ───────

import {
  teacherEmaUpdate,
  consistencyLoss,
  forgettingAudit,
  rwalkPenalty,
  naturalGradLogistic,
  steinCoresetGreedy,
} from "@sports/prediction-engine";

export type TeacherStudentEval =
  | {
      readonly ok: true;
      readonly data: {
        readonly teacher: readonly number[];
        readonly consistencyLoss: number;
      };
    }
  | { readonly ok: false; readonly reason: string };

/**
 * EMA teacher update + consistency loss. Fail-closed on misaligned vectors.
 */
export function evalTeacherStudent(input: {
  readonly teacher: readonly number[];
  readonly student: readonly number[];
  readonly momentum: number;
}): TeacherStudentEval {
  const { teacher, student, momentum } = input;
  if (
    !Array.isArray(teacher) ||
    !Array.isArray(student) ||
    teacher.length === 0 ||
    teacher.length !== student.length
  ) {
    return { ok: false, reason: "teacher/student must be non-empty and aligned" };
  }
  if (!Number.isFinite(momentum) || momentum < 0 || momentum > 1) {
    return { ok: false, reason: "momentum must be finite in [0,1]" };
  }
  try {
    const updated = teacherEmaUpdate(
      teacher as number[],
      student as number[],
      momentum,
    );
    const loss = consistencyLoss(student as number[], updated);
    return {
      ok: true,
      data: {
        teacher: updated as number[],
        consistencyLoss: Number(loss.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type ForgettingAudit =
  | { readonly ok: true; readonly data: { readonly forget: number; readonly bwt: number } }
  | { readonly ok: false; readonly reason: string };

/**
 * Catastrophic-forgetting audit: mean forgetting + backward transfer.
 */
export function evalForgetting(input: {
  readonly accBefore: readonly number[];
  readonly accAfter: readonly number[];
}): ForgettingAudit {
  const { accBefore, accAfter } = input;
  if (
    !Array.isArray(accBefore) ||
    !Array.isArray(accAfter) ||
    accBefore.length === 0 ||
    accBefore.length !== accAfter.length
  ) {
    return { ok: false, reason: "accBefore/accAfter must be non-empty and aligned" };
  }
  for (let i = 0; i < accBefore.length; i++) {
    if (!Number.isFinite(accBefore[i]) || !Number.isFinite(accAfter[i])) {
      return { ok: false, reason: `row ${i}: accuracies must be finite — not imputed` };
    }
  }
  try {
    const data = forgettingAudit(accBefore as number[], accAfter as number[]);
    return {
      ok: true,
      data: {
        forget: Number(data.forget.toFixed(6)),
        bwt: Number(data.bwt.toFixed(6)),
      },
    };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type RwalkPenaltyEval =
  | { readonly ok: true; readonly penalty: number }
  | { readonly ok: false; readonly reason: string };

/**
 * RWalk penalty: importance-weighted distance from prior optima.
 */
export function evalRwalkPenalty(input: {
  readonly theta: readonly number[];
  readonly optParams: readonly (readonly number[])[];
  readonly fishers: readonly (readonly number[])[];
  readonly lambdas: readonly number[];
}): RwalkPenaltyEval {
  const { theta, optParams, fishers, lambdas } = input;
  if (!Array.isArray(theta) || theta.length === 0) {
    return { ok: false, reason: "theta must be non-empty" };
  }
  if (
    !Array.isArray(optParams) ||
    !Array.isArray(fishers) ||
    !Array.isArray(lambdas) ||
    optParams.length === 0 ||
    optParams.length !== fishers.length ||
    optParams.length !== lambdas.length
  ) {
    return { ok: false, reason: "optParams/fishers/lambdas must be non-empty and aligned" };
  }
  try {
    const p = rwalkPenalty(
      theta as number[],
      optParams as number[][],
      fishers as number[][],
      lambdas as number[],
    );
    return { ok: true, penalty: Number(p.toFixed(6)) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type NaturalGradEval =
  | { readonly ok: true; readonly theta: readonly number[] }
  | { readonly ok: false; readonly reason: string };

/**
 * One certainty-weighted natural-gradient step on a logistic model.
 */
export function evalNaturalGrad(input: {
  readonly X: readonly (readonly number[])[];
  readonly y: readonly number[];
  readonly theta: readonly number[];
  readonly damp: number;
}): NaturalGradEval {
  const { X, y, theta, damp } = input;
  if (!Array.isArray(X) || X.length === 0) {
    return { ok: false, reason: "X must be non-empty" };
  }
  if (!Array.isArray(y) || y.length !== X.length) {
    return { ok: false, reason: "y must align with X" };
  }
  if (!Array.isArray(theta) || theta.length === 0) {
    return { ok: false, reason: "theta must be non-empty" };
  }
  if (!Number.isFinite(damp) || damp < 0) {
    return { ok: false, reason: "damp must be finite and >= 0" };
  }
  try {
    const next = naturalGradLogistic(
      X as number[][],
      y as number[],
      theta as number[],
      damp,
    );
    return { ok: true, theta: next as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type CoresetEval =
  | { readonly ok: true; readonly indices: readonly number[] }
  | { readonly ok: false; readonly reason: string };

/**
 * Stein coreset selection: pick m representative rows for the replay buffer.
 */
export function evalSteinCoreset(input: {
  readonly X: readonly (readonly number[])[];
  readonly m: number;
  readonly bandwidth: number;
}): CoresetEval {
  const { X, m, bandwidth } = input;
  if (!Array.isArray(X) || X.length === 0) {
    return { ok: false, reason: "X must be non-empty" };
  }
  if (!Number.isFinite(m) || m <= 0 || m > X.length) {
    return { ok: false, reason: "m must be in (0, X.length]" };
  }
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) {
    return { ok: false, reason: "bandwidth must be > 0" };
  }
  try {
    const indices = steinCoresetGreedy(X as number[][], m, bandwidth);
    return { ok: true, indices: indices as number[] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export {
  teacherEmaUpdate,
  consistencyLoss,
  forgettingAudit,
  rwalkPenalty,
  naturalGradLogistic,
  steinCoresetGreedy,
};
