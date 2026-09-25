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
