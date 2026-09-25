/**
 * Props-HB bridge â€” wires the hierarchical Bayes prop models
 * (edge-lab/props-hb.ts + props-hb-*) into the live props slate.
 *
 * fitGroupPrior â†’ posteriorRate â†’ probOver is the real computation that
 * produces `modelProbOver` for gateProp. Fail-closed on missing samples.
 */

import {
  fitGroupPrior,
  posteriorRate,
  propsHbProbOver as probOver,
  probOverContinuous,
  shrinkageReport,
  type RateSample,
  type GammaPrior,
  type GammaPosterior,
} from "@sports/prediction-engine";

export interface PlayerRateHistory {
  readonly playerId: string;
  readonly propType: string;
  /** Per-game counting totals (e.g. receptions per game). */
  readonly samples: readonly RateSample[];
  /** The posted line (e.g. 5.5 receptions). */
  readonly line: number;
  /** How many games the upcoming contest represents (default 1). */
  readonly games?: number;
}

export interface PropHbEstimate {
  readonly playerId: string;
  readonly propType: string;
  readonly prior: GammaPrior;
  readonly posterior: GammaPosterior;
  readonly pOver: number;
  readonly pUnder: number;
  readonly line: number;
  readonly shrinkage: ReturnType<typeof shrinkageReport>;
}

export type PropHbResult =
  | { readonly ok: true; readonly data: PropHbEstimate }
  | { readonly ok: false; readonly reason: string };

/**
 * Fit a hierarchical Bayes P(over) for one player prop.
 * Null when the player has no samples or the prior cannot be fit â€”
 * never invents a probability.
 */
export function estimatePropOver(input: PlayerRateHistory): PropHbResult {
  if (!input || !Array.isArray(input.samples) || input.samples.length === 0) {
    return { ok: false, reason: "no rate samples â€” not imputed" };
  }
  if (!Number.isFinite(input.line)) {
    return { ok: false, reason: "line must be finite" };
  }
  const games = input.games ?? 1;
  if (!Number.isFinite(games) || games <= 0) {
    return { ok: false, reason: "games must be > 0" };
  }

  try {
    const prior = fitGroupPrior(input.samples);
    if (!prior) {
      return { ok: false, reason: "fitGroupPrior returned null (insufficient data)" };
    }

    const playerTotal = input.samples.reduce((s, x) => s + x.total, 0);
    const playerGames = input.samples.reduce((s, x) => s + x.games, 0);
    const posterior = posteriorRate(prior, playerTotal, playerGames);
    const pOver = probOver(posterior, input.line, games);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      return { ok: false, reason: "probOver returned value outside [0,1]" };
    }

    return {
      ok: true,
      data: {
        playerId: input.playerId,
        propType: input.propType,
        prior,
        posterior,
        pOver: Number(pOver.toFixed(6)),
        pUnder: Number((1 - pOver).toFixed(6)),
        line: input.line,
        shrinkage: shrinkageReport(prior, input.samples),
      },
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Batch version â€” returns a modelProbOver map keyed by `${playerId}:${propType}`
 * ready for `runPropsSlate`. Players that fail are omitted (not imputed).
 */
export function buildModelProbOver(
  histories: readonly PlayerRateHistory[],
): {
  readonly modelProbOver: Record<string, number>;
  readonly failures: readonly { readonly key: string; readonly reason: string }[];
} {
  const modelProbOver: Record<string, number> = {};
  const failures: { key: string; reason: string }[] = [];

  for (const h of histories) {
    const key = `${h.playerId}:${h.propType}`;
    const r = estimatePropOver(h);
    if (r.ok) {
      modelProbOver[key] = r.data.pOver;
    } else {
      failures.push({ key, reason: r.reason });
    }
  }

  return { modelProbOver, failures };
}

export {
  fitGroupPrior,
  posteriorRate,
  propsHbProbOver as probOver,
  probOverContinuous,
  shrinkageReport,
};
export type { RateSample, GammaPrior, GammaPosterior };
