/**
 * Strategic signal adapters — real computation from winprob, spread,
 * totals, ratings, and NGS-adjacent metric modules.
 *
 * Each adapter invokes the real exported function and returns the result
 * as an Observation. Fail-closed when input is missing. No fake data.
 */

import type { AdapterResult } from "./universal-adapter.js";
import { normalCoverProbability, type MarginModel } from "../spread/margin-multipliers.js";
import { pinballLoss } from "../totals/quantile-totals.js";
import { predictSpread, type LsFit } from "../ratings/least-squares-ratings.js";
import { anchorWeight } from "../winprob/anchored-live-wp.js";
import { fgMakeProbability } from "../nfl/ngs-adjacent-metrics.js";
import { nflPasserRating } from "../nfl/coverage-db-metrics.js";
import { generalizedPoisson } from "../nfl/generalized-poisson.js";

const NOW_ISO = (): string => new Date().toISOString();

// ── Spread / cover probability ──────────────────────────────────────────────

export interface CoverProbInput {
  readonly spread: number;
  readonly projectedMargin: number;
  readonly marginSd?: number;
}

/**
 * Cover probability for a spread using the normal margin model.
 * Real computation via spread/margin-multipliers normalCoverProbability.
 */
export function coverProbabilityAdapter(
  input: CoverProbInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.spread) ||
    !Number.isFinite(input.projectedMargin)
  ) {
    return {
      failClosed: true,
      reason: "missing or non-finite spread/projectedMargin",
      source: "spread:cover-probability",
    };
  }
  const sd = input.marginSd ?? 13.5;
  // Shift the standard normal cover curve by the projected margin edge
  const edge = input.projectedMargin + input.spread;
  const p = normalCoverProbability(edge, sd);
  return {
    source: "spread:cover-probability",
    asOf: NOW_ISO(),
    value: Number(p.toFixed(4)),
    confidence: 0.75,
    provenance: "packages/prediction-engine/src/spread/margin-multipliers.ts#normalCoverProbability",
    family: "MARKET",
    raw: {
      spread: input.spread,
      projectedMargin: input.projectedMargin,
      marginSd: sd,
      edge,
      coverProb: Number(p.toFixed(4)),
    },
  };
}

// ── Totals / pinball loss ───────────────────────────────────────────────────

export interface PinballInput {
  readonly y: number;
  readonly q: number;
  readonly tau: number;
}

export function pinballLossAdapter(
  input: PinballInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.y) ||
    !Number.isFinite(input.q) ||
    !Number.isFinite(input.tau) ||
    input.tau <= 0 ||
    input.tau >= 1
  ) {
    return {
      failClosed: true,
      reason: "missing y/q or tau outside (0,1)",
      source: "totals:pinball-loss",
    };
  }
  const loss = pinballLoss(input.y, input.q, input.tau);
  return {
    source: "totals:pinball-loss",
    asOf: NOW_ISO(),
    value: Number(loss.toFixed(6)),
    confidence: 1,
    provenance: "packages/prediction-engine/src/totals/quantile-totals.ts#pinballLoss",
    family: "CALIBRATION_HISTORY",
    raw: { y: input.y, q: input.q, tau: input.tau, loss: Number(loss.toFixed(6)) },
  };
}

// ── Ratings / least-squares spread ──────────────────────────────────────────

export interface LsPredictInput {
  readonly fit: LsFit | null | undefined;
  readonly home: string;
  readonly away: string;
}

export function lsSpreadAdapter(
  input: LsPredictInput | null | undefined,
): AdapterResult {
  if (!input || !input.fit || !input.home || !input.away) {
    return {
      failClosed: true,
      reason: "missing least-squares fit or team ids",
      source: "ratings:ls-spread",
    };
  }
  try {
    const spread = predictSpread(input.fit, input.home, input.away);
    if (!Number.isFinite(spread)) {
      return {
        failClosed: true,
        reason: "predictSpread returned non-finite value",
        source: "ratings:ls-spread",
      };
    }
    return {
      source: "ratings:ls-spread",
      asOf: NOW_ISO(),
      value: Number(spread.toFixed(3)),
      confidence: 0.7,
      provenance: "packages/prediction-engine/src/ratings/least-squares-ratings.ts#predictSpread",
      family: "MARKET",
      raw: { home: input.home, away: input.away, spread: Number(spread.toFixed(3)) },
    };
  } catch {
    return {
      failClosed: true,
      reason: "predictSpread threw (team not in fit)",
      source: "ratings:ls-spread",
    };
  }
}

// ── Win probability / anchored live WP ──────────────────────────────────────

export interface AnchorWeightInput {
  readonly secondsLeft: number;
  readonly kappa: number;
}

export function anchorWeightAdapter(
  input: AnchorWeightInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.secondsLeft) ||
    !Number.isFinite(input.kappa) ||
    input.kappa <= 0
  ) {
    return {
      failClosed: true,
      reason: "missing secondsLeft or invalid kappa",
      source: "winprob:anchor-weight",
    };
  }
  const w = anchorWeight(input.secondsLeft, input.kappa);
  return {
    source: "winprob:anchor-weight",
    asOf: NOW_ISO(),
    value: Number(w.toFixed(4)),
    confidence: 0.8,
    provenance: "packages/prediction-engine/src/winprob/anchored-live-wp.ts#anchorWeight",
    family: "MARKET",
    raw: {
      secondsLeft: input.secondsLeft,
      kappa: input.kappa,
      weight: Number(w.toFixed(4)),
    },
  };
}

// ── NGS-12 kicker make probability ─────────────────────────────────────────

export interface FgMakeInput {
  readonly distance: number | null;
  readonly windMph?: number | null;
  readonly isOutdoor?: boolean | null;
}

export function fgMakeProbabilityAdapter(
  input: FgMakeInput | null | undefined,
): AdapterResult {
  if (!input) {
    return {
      failClosed: true,
      reason: "missing field-goal attempt input",
      source: "nfl:fg-make-probability",
    };
  }
  const p = fgMakeProbability(input.distance, input.windMph ?? null, input.isOutdoor ?? null);
  if (p === null) {
    return {
      failClosed: true,
      reason: "distance missing or outside [15,70] — not imputed",
      source: "nfl:fg-make-probability",
    };
  }
  return {
    source: "nfl:fg-make-probability",
    asOf: NOW_ISO(),
    value: p,
    confidence: 0.7,
    provenance: "packages/prediction-engine/src/nfl/ngs-adjacent-metrics.ts#fgMakeProbability",
    family: "PLAY_CHARTING",
    raw: {
      distance: input.distance,
      windMph: input.windMph ?? null,
      isOutdoor: input.isOutdoor ?? null,
      pMake: p,
    },
  };
}

// ── NGS-11 passer rating allowed ───────────────────────────────────────────

export interface PasserRatingInput {
  readonly attempts: number;
  readonly completions: number;
  readonly yards: number;
  readonly touchdowns: number;
  readonly interceptions: number;
}

export function passerRatingAllowedAdapter(
  input: PasserRatingInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.attempts) ||
    input.attempts <= 0 ||
    !Number.isFinite(input.completions) ||
    !Number.isFinite(input.yards) ||
    !Number.isFinite(input.touchdowns) ||
    !Number.isFinite(input.interceptions)
  ) {
    return {
      failClosed: true,
      reason: "missing passer-rating inputs or attempts <= 0",
      source: "nfl:passer-rating-allowed",
    };
  }
  const r = nflPasserRating(
    input.attempts,
    input.completions,
    input.yards,
    input.touchdowns,
    input.interceptions,
  );
  if (r === null) {
    return {
      failClosed: true,
      reason: "passer rating null",
      source: "nfl:passer-rating-allowed",
    };
  }
  return {
    source: "nfl:passer-rating-allowed",
    asOf: NOW_ISO(),
    value: Number(r.toFixed(2)),
    confidence: 0.85,
    provenance: "packages/prediction-engine/src/nfl/coverage-db-metrics.ts#nflPasserRating",
    family: "PLAY_CHARTING",
    raw: {
      attempts: input.attempts,
      completions: input.completions,
      yards: input.yards,
      touchdowns: input.touchdowns,
      interceptions: input.interceptions,
      rating: Number(r.toFixed(2)),
    },
  };
}

// ── V6 generalized Poisson PMF ─────────────────────────────────────────────

export interface GpPmfInput {
  readonly k: number;
  readonly theta: number;
  readonly lambda: number;
}

export function generalizedPoissonAdapter(
  input: GpPmfInput | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isInteger(input.k) ||
    input.k < 0 ||
    !Number.isFinite(input.theta) ||
    !Number.isFinite(input.lambda)
  ) {
    return {
      failClosed: true,
      reason: "invalid generalized-Poisson inputs",
      source: "nfl:generalized-poisson",
    };
  }
  const p = generalizedPoisson(input.k, input.theta, input.lambda);
  return {
    source: "nfl:generalized-poisson",
    asOf: NOW_ISO(),
    value: Number(p.toFixed(6)),
    confidence: 1,
    provenance: "packages/prediction-engine/src/nfl/generalized-poisson.ts#generalizedPoisson",
    family: "PLAY_CHARTING",
    raw: {
      k: input.k,
      theta: input.theta,
      lambda: input.lambda,
      pmf: Number(p.toFixed(6)),
    },
  };
}

// ── Registry ───────────────────────────────────────────────────────────────

export const STRATEGIC_ADAPTERS = {
  coverProbability: coverProbabilityAdapter,
  pinballLoss: pinballLossAdapter,
  lsSpread: lsSpreadAdapter,
  anchorWeight: anchorWeightAdapter,
  fgMakeProbability: fgMakeProbabilityAdapter,
  passerRatingAllowed: passerRatingAllowedAdapter,
  generalizedPoisson: generalizedPoissonAdapter,
} as const;

export type StrategicAdapterName = keyof typeof STRATEGIC_ADAPTERS;

// Re-export MarginModel type for callers
export type { MarginModel };
