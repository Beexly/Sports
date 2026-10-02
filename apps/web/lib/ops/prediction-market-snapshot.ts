/**
 * Pure projection: independent fair-value snapshot → game_signals row.
 *
 * WHY. `tryKalshiFairValue` / `tryPolymarketIndependentFairValue` return
 * `IndependentMarketFairValue` ({ source, homeFairProb, awayFairProb,
 * capturedAt }). Nothing persisted those snapshots — the fetch→persist loop
 * was open. This module is the persist half's pure core: it turns a fair-value
 * result into the exact `game_signals` row the cron upserts.
 *
 * RIGHTS POSTURE (not negotiable):
 * - Kalshi's source-registry verdict is "paid-required" (Developer Agreement
 *   v1.1 §3/§3.1 — written grant required). `tryKalshiFairValue` enforces this
 *   via `isIngestible("kalshi")` and returns null until the grant exists.
 * - Polymarket is on compliance hold, default OFF (`INDEPENDENT_POLYMARKET=1`
 *   to enable). `tryPolymarketIndependentFairValue` enforces this.
 * This module never bypasses those gates — it only projects results the
 * gated fetchers actually returned. A null pair is an honest miss: no row.
 */

export interface FairValueLike {
  readonly source: string;
  readonly homeFairProb: number | null;
  readonly awayFairProb: number | null;
  readonly capturedAt: string;
}

export interface MarketSignalRow {
  readonly sourceCategory: "MARKET_SENTIMENT";
  readonly sourceName: string;
  readonly signalKey: "fair_value_moneyline";
  readonly signalValue: {
    readonly homeFairProb: number | null;
    readonly awayFairProb: number | null;
    /**
     * Required, NOT optional. This timestamp is the CLV as-of key: a market
     * snapshot stored without one cannot be compared against a later line, so
     * it can never be graded. `IndependentMarketFairValue.capturedAt` is
     * optional, which means a producer may omit it — so the value is checked at
     * runtime below and the row is REFUSED rather than persisted undated.
     */
    readonly capturedAt: string;
  };
  /** 0.90 — regulated-exchange public prices, de-vigged, near-zero overround. */
  readonly trustLevel: 0.9;
}

/**
 * Project a fair-value snapshot to a persistable row, or null when the
 * snapshot carries no usable probability (honest miss — never persisted).
 */
export function toMarketSignalRow(
  // Accepts `undefined` as well as `null` because the producers here return
  // `IndependentMarketFairValue`, whose fair-prob fields are optional
  // (`number | null | undefined`). The body already distinguishes a real number
  // from a missing one and writes `null` for anything absent, so `undefined` is
  // handled correctly rather than merely tolerated.
  fv: FairValueLike | { readonly source: string; readonly homeFairProb?: number | null; readonly awayFairProb?: number | null; readonly capturedAt?: string },
): MarketSignalRow | null {
  const home = fv.homeFairProb;
  const away = fv.awayFairProb;
  const usable =
    (typeof home === "number" && Number.isFinite(home)) ||
    (typeof away === "number" && Number.isFinite(away));
  if (!usable) return null;
  // An undated snapshot cannot be CLV-indexed, so persisting one would create a
  // row that can never be graded. Absence is refusal, not a default timestamp:
  // stamping "now" would claim the read happened at a moment it did not.
  if (typeof fv.capturedAt !== "string" || fv.capturedAt.length === 0) return null;
  return {
    sourceCategory: "MARKET_SENTIMENT",
    sourceName: fv.source,
    signalKey: "fair_value_moneyline",
    signalValue: {
      homeFairProb: typeof home === "number" && Number.isFinite(home) ? home : null,
      awayFairProb: typeof away === "number" && Number.isFinite(away) ? away : null,
      capturedAt: fv.capturedAt,
    },
    trustLevel: 0.9,
  };
}
