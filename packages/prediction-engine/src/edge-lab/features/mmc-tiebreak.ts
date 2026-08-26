/**
 * MMC tiebreaker for the Brier-OGD ensemble — wiring gap #2 from
 * handoff/research/forecasting/INDEX.md ("Wire mmc-contribution into
 * earned-weight/Brier-OGD updates as a tiebreaker for herd-tracking sources").
 *
 * EDGE THESIS: Brier-OGD rewards raw accuracy. Two members with identical
 * (herd) forecasts earn identical weight even though together they contribute
 * zero information beyond one copy. Numerai's MMC fixes the metric, not the
 * weighting; this module adapts it into a POST-HOC weight adjustment:
 *
 *   w'_i ∝ w_i · exp(λ · MMC_i)      (then re-projected onto the simplex)
 *
 * Properties, by design:
 * - λ = 0 → exact identity (incumbent weights byte-for-byte).
 * - λ small (default 0.1) → Brier performance still dominates; MMC breaks
 *   ties between similarly-accurate members in favor of UNIQUE signal.
 * - Members with null MMC (degenerate / absorbed / incomplete streams) are
 *   left untouched — never rewarded, never punished for missing data.
 * - Pure math, no I/O; does not touch live scoring or flip gates (same shadow
 *   posture as brier-ogd-ensemble itself).
 */

import {
  metaModelContribution,
  type MmcSourceStream,
} from "./mmc-contribution.js";
import { projectProbabilitySimplex } from "../../brier-ogd-ensemble.js";

export interface MmcTiebreakSample {
  readonly members: Readonly<Record<string, number>>;
  readonly y: 0 | 1;
}

export interface MmcTiebreakResult {
  /** Adjusted weights, on the simplex (sums to 1 like the input). */
  readonly weights: Readonly<Record<string, number>>;
  /** Per-model MMC used for the tilt; null = excluded (no adjustment). */
  readonly mmcByModel: Readonly<Record<string, number | null>>;
  /** Models actually adjusted (finite MMC, nonzero prior weight, λ > 0). */
  readonly adjustedModels: readonly string[];
}

/**
 * Apply the MMC tilt. `samples` must be in the SAME order used by the OGD run
 * (runBrierOgdEnsemble sorts internally by `t`); alignment matters because MMC
 * correlates across rows. Fail closed on non-positive strength or empty input;
 * short histories (<3 resolved rows) return the input weights unchanged with
 * all-null MMC rather than fabricating correlations.
 */
export function applyMmcTiebreak(
  finalWeights: Readonly<Record<string, number>>,
  samples: readonly MmcTiebreakSample[],
  options: { strength?: number } = {},
): MmcTiebreakResult {
  const lambda = options.strength ?? 0.1;
  if (!Number.isFinite(lambda) || lambda < 0) {
    throw new Error(`strength must be finite and >= 0, got ${String(lambda)}`);
  }
  const models = Object.keys(finalWeights);
  if (models.length === 0) {
    throw new Error("finalWeights must contain at least one entry");
  }
  if (!Array.isArray(samples) || samples.length === 0) {
    throw new Error("samples must contain at least one entry");
  }

  const mmcByModel: Record<string, number | null> = {};
  const adjustedModels: string[] = [];

  // Need enough resolved rows AND ≥2 candidate streams for a meaningful residual.
  const eligible: string[] = [];
  if (samples.length >= 3) {
    for (const id of models) {
      let complete = true;
      for (const s of samples) {
        const p = s.members[id];
        if (p == null || !Number.isFinite(p) || p <= 0 || p >= 1) {
          complete = false;
          break;
        }
      }
      if (complete) eligible.push(id);
    }
  }

  for (const id of models) mmcByModel[id] = null;

  if (eligible.length >= 2 && lambda > 0) {
    const outcomes = samples.map((s) => s.y);
    const streams: MmcSourceStream[] = eligible.map((id) => ({
      name: id,
      probs: samples.map((s) => s.members[id]!),
    }));
    let contributions: Readonly<Record<string, number | null>> = {};
    try {
      contributions = metaModelContribution(outcomes, streams).contributions.reduce<
        Record<string, number | null>
      >((acc, c) => ((acc[c.name] = c.mmc), acc), {});
    } catch {
      // Degenerate field (e.g. all streams identical): honest nulls, no tilt.
      contributions = {};
    }

    const tilted = new Map<string, number>();
    for (const id of models) {
      const w = finalWeights[id]!;
      const mmc = contributions[id];
      if (mmc != null && Number.isFinite(mmc) && w > 0) {
        tilted.set(id, w * Math.exp(lambda * mmc));
        adjustedModels.push(id);
      } else {
        tilted.set(id, w);
      }
    }
    const projected = projectProbabilitySimplex(tilted, models);
    return { weights: projected, mmcByModel, adjustedModels };
  }

  return { weights: { ...finalWeights }, mmcByModel, adjustedModels };
}
