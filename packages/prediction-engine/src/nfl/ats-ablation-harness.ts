/**
 * W3 — ATS (against-the-spread) ablation harness.
 *
 * Drop-one-feature Δlog-loss ablation (V7 core) plus tier-kill policy:
 * kill feature tiers that fail to beat the holdout threshold.
 *
 * COMPOSES WITH: V7 feature-construction-recipe (ablation),
 * W2 closing-line-benchmark (walk-forward evaluation).
 */

import { computeMetrics } from "../calibration/calibration-gates.js";
import type { Sample } from "../eval/feature-construction-recipe.js";

export type PredictorFn = (
  features: Record<string, number | null>,
  train: readonly Sample[],
) => number;

export interface AblationEntry {
  readonly feature: string;
  readonly tier: string;
  readonly logLossWith: number;
  readonly logLossWithout: number;
  readonly deltaLogLoss: number;
  readonly brierWith: number;
  readonly brierWithout: number;
  readonly deltaBrier: number;
}

export interface AblationResult {
  readonly baselineLogLoss: number;
  readonly baselineBrier: number;
  readonly n: number;
  readonly entries: readonly AblationEntry[];
}

export interface TierSpec {
  readonly tier: string;
  readonly features: readonly string[];
}

export interface TierKillResult {
  readonly tier: string;
  readonly killed: boolean;
  readonly score: number;
  readonly threshold: number;
  readonly reason: string;
}

/**
 * Drop-one-feature ablation over a test sample set.
 * Δlog-loss = logLoss_without − logLoss_with. Positive → feature helps.
 */
export function ablate(
  features: readonly { readonly name: string; readonly tier?: string }[],
  target: readonly Sample[],
  train: readonly Sample[],
  predict: PredictorFn,
): AblationResult {
  if (target.length === 0) throw new Error("ablate: target samples must be non-empty");
  if (features.length === 0) throw new Error("ablate: features must be non-empty");

  const outcomes = target.map((s) => s.outcome);
  const baseProbs = target.map((s) => predict(s.features, train));
  assertProbsInUnit(baseProbs);
  const baseMetrics = computeMetrics(baseProbs, outcomes);

  const entries: AblationEntry[] = [];
  for (const f of features) {
    const withoutProbs = target.map((s) => {
      const dropped = { ...s.features, [f.name]: null };
      return predict(dropped, train);
    });
    assertProbsInUnit(withoutProbs);
    const withoutMetrics = computeMetrics(withoutProbs, outcomes);

    entries.push({
      feature: f.name,
      tier: f.tier ?? "default",
      logLossWith: Number(baseMetrics.logLoss.toFixed(6)),
      logLossWithout: Number(withoutMetrics.logLoss.toFixed(6)),
      deltaLogLoss: Number((withoutMetrics.logLoss - baseMetrics.logLoss).toFixed(6)),
      brierWith: Number(baseMetrics.brier.toFixed(6)),
      brierWithout: Number(withoutMetrics.brier.toFixed(6)),
      deltaBrier: Number((withoutMetrics.brier - baseMetrics.brier).toFixed(6)),
    });
  }

  entries.sort((a, b) => b.deltaLogLoss - a.deltaLogLoss);

  return {
    baselineLogLoss: Number(baseMetrics.logLoss.toFixed(6)),
    baselineBrier: Number(baseMetrics.brier.toFixed(6)),
    n: target.length,
    entries,
  };
}

function assertProbsInUnit(probs: readonly number[]): void {
  for (const p of probs) {
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error("ablate: predictor must return probability in (0,1)");
    }
  }
}

/**
 * Tier-kill policy: a tier is killed when its max feature Δlog-loss does not
 * beat the holdout threshold. Features with no positive contribution cannot
 * justify their tier's complexity.
 */
export function tierKill(
  tiers: readonly TierSpec[],
  ablation: AblationResult,
  threshold: number,
): readonly TierKillResult[] {
  if (!Number.isFinite(threshold)) {
    throw new Error("tierKill: threshold must be finite");
  }

  return tiers.map((t) => {
    const tierEntries = ablation.entries.filter((e) => e.tier === t.tier);
    if (tierEntries.length === 0) {
      return {
        tier: t.tier,
        killed: true,
        score: Number.NEGATIVE_INFINITY,
        threshold,
        reason: `tier ${t.tier} has no ablation entries — kill`,
      };
    }
    const score = Math.max(...tierEntries.map((e) => e.deltaLogLoss));
    const killed = !(score >= threshold);
    return {
      tier: t.tier,
      killed,
      score: Number(score.toFixed(6)),
      threshold,
      reason: killed
        ? `tier ${t.tier} best Δlog-loss ${score.toFixed(6)} below threshold ${threshold} — kill`
        : `tier ${t.tier} best Δlog-loss ${score.toFixed(6)} meets threshold ${threshold} — keep`,
    };
  });
}

/**
 * Full ATS ablation pipeline: drop-one ablation then tier kill.
 */
export function atsAblationPipeline(
  tiers: readonly TierSpec[],
  target: readonly Sample[],
  train: readonly Sample[],
  predict: PredictorFn,
  threshold: number,
): {
  readonly ablation: AblationResult;
  readonly tierResults: readonly TierKillResult[];
  readonly survivors: readonly string[];
} {
  const features = tiers.flatMap((t) =>
    t.features.map((name) => ({ name, tier: t.tier })),
  );
  const ablation = ablate(features, target, train, predict);
  const tierResults = tierKill(tiers, ablation, threshold);
  const survivors = tierResults.filter((r) => !r.killed).map((r) => r.tier);
  return { ablation, tierResults, survivors };
}
