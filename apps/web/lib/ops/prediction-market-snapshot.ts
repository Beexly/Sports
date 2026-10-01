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
  readonly homeFairProb?: number | null;
  readonly awayFairProb?: number | null;
  readonly capturedAt?: string;
}

export interface MarketSignalRow {
  readonly sourceCategory: "MARKET_SENTIMENT";
  readonly sourceName: string;
  readonly signalKey: "fair_value_moneyline";
  readonly signalValue: {
    readonly homeFairProb: number | null;
    readonly awayFairProb: number | null;
    readonly capturedAt: string;
  };
  /** 0.90 — regulated-exchange public prices, de-vigged, near-zero overround. */
  readonly trustLevel: 0.9;
}

/**
 * Project a fair-value snapshot to a persistable row, or null when the
 * snapshot carries no usable probability or no as-of timestamp
 * (honest miss — never persisted).
 */
export function toMarketSignalRow(fv: FairValueLike): MarketSignalRow | null {
  const home = fv.homeFairProb;
  const away = fv.awayFairProb;
  const usable =
    (typeof home === "number" && Number.isFinite(home)) ||
    (typeof away === "number" && Number.isFinite(away));
  if (!usable) return null;
  // Without the CLV as-of timestamp the row cannot be honestly timestamped.
  if (!fv.capturedAt) return null;
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
