/**
 * Continuous-signal tilt â€” turns CONTINUOUS_VALUE registry signals into a
 * weighted probability adjustment.
 *
 * The signal registry runner drops CONTINUOUS_VALUE results (they carry no
 * homeFairProb). That drop is load-bearing for the probability blend, but it
 * also meant 20+ situational/efficiency/microclimate signals contributed
 * NOTHING to the published number. This module is the second path: each
 * continuous signal votes a log-odds tilt scaled by its registry trustWeight,
 * and the net tilt is applied to the independent-blend home probability.
 *
 * Fail-closed: missing signals produce no tilt. Never invents a direction.
 */

import type { SignalDefinition, SignalContinuousValue } from "@sports/types";
import type { SignalEvaluationContext, SignalFamily } from "@sports/types";
import { poolSignalsHierarchically } from "@sports/prediction-engine";

export interface ContinuousVote {
  readonly signalId: string;
  readonly family: string;
  readonly trustWeight: number;
  readonly rawValue: number;
  /** Signed log-odds contribution (positive = toward home). */
  readonly tilt: number;
}

export interface ContinuousTiltResult {
  readonly votes: readonly ContinuousVote[];
  readonly netTilt: number;
  readonly adjustedHomeP: number;
  readonly applied: boolean;
  readonly pooledEdge: number | null;
}

/**
 * Map a raw continuous value to a signed log-odds tilt in roughly [-0.35, 0.35].
 * Sign convention: positive raw value favors home. Values are squashed with
 * tanh so extreme outliers cannot dominate the blend.
 */
function valueToTilt(value: number, trustWeight: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const squashed = Math.tanh(value) * 0.35;
  return squashed * Math.min(1, Math.max(0, trustWeight));
}

/**
 * Evaluate continuous signals and compute the net tilt on homeP.
 * `homeP` is the independent-blend probability BEFORE tilt.
 */
export async function applyContinuousSignalTilt(
  homeP: number,
  signals: readonly SignalDefinition[],
  ctx: SignalEvaluationContext,
): Promise<ContinuousTiltResult> {
  const votes: ContinuousVote[] = [];
  // tilt accumulation replaced by hierarchical pool

  for (const signal of signals) {
    if (signal.outputKind !== "CONTINUOUS_VALUE") continue;
    if (signal.activationStatus !== "ACTIVE") continue;
    if (!signal.isRightsCleared(ctx.env)) continue;
    if (
      signal.validSports.length > 0 &&
      !signal.validSports.includes(ctx.sportKey as never)
    ) {
      continue;
    }
    if (!signal.evaluate) continue;

    try {
      const val = await signal.evaluate(ctx);
      if (val == null) continue;
      if ("homeFairProb" in val) continue; // probability path, not ours
      const continuous = val as SignalContinuousValue;
      if (!Number.isFinite(continuous.value)) continue;

      const tilt = valueToTilt(continuous.value, signal.trustWeight);
      if (tilt === 0) continue;

      votes.push({
        signalId: signal.id,
        family: signal.family,
        trustWeight: signal.trustWeight,
        rawValue: continuous.value,
        tilt: Number(tilt.toFixed(6)),
      });
    } catch {
      // silent abstain â€” never let one signal break the slate
    }
  }

  if (votes.length === 0) {
    return {
      votes,
      netTilt: 0,
      adjustedHomeP: homeP,
      applied: false,
      pooledEdge: null,
    };
  }

  // Hierarchical pool: inverse-variance within family, evidence-weighted
  // across families with DEFAULT_FAMILY_PRIOR_WEIGHTS. This is what makes
  // "all input weighted" real â€” EFFICIENCY carries 0.22, SITUATIONAL 0.12,
  // MICROCLIMATE 0.08, LUCK 0.05, NARRATIVE 0.05, etc.
  const pooled = poolSignalsHierarchically(
    votes.map((v) => ({
      signalId: v.signalId,
      family: v.family as SignalFamily,
      estimatedEdge: v.tilt,
      variance: Math.max(0.01, 1 - v.trustWeight),
      sampleSize: 100,
      isEligible: true,
    })),
    homeP,
  );

  const netTilt = pooled.blendedEdge ?? votes.reduce((s, v) => s + v.tilt, 0);

  // Convert homeP to log-odds, add tilt, convert back.
  const p = Math.min(1 - 1e-6, Math.max(1e-6, homeP));
  const logOdds = Math.log(p / (1 - p)) + netTilt;
  const adjusted = 1 / (1 + Math.exp(-logOdds));

  return {
    votes,
    netTilt: Number(netTilt.toFixed(6)),
    adjustedHomeP: Number(adjusted.toFixed(6)),
    applied: netTilt !== 0,
    pooledEdge: Number(netTilt.toFixed(6)),
  };
}
