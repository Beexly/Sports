/**
 * Pangu-Weather: A 3D High-Resolution System for Fast and Accurate Global Weather Forecast
 *
 * arXiv:2211.02556 · lane:weather · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Adopt two transferable patterns (not the weather model itself): (1) hierarchical temporal
 * aggregation as a design pattern — train direct multi-week-ahead projection heads (1/2/4/8-week)
 * and greedily compose them to minimize chained calls, instead of iterating a 1-week model 8 times
 * (the paper quantifies naive 28x chaining's super-linear collapse; Pangu's 7x 24h chaining
 * recovers >30% RMSE); (2) the RQE tail metric (Eq. 4, 90%->99.99% log-spaced percentiles) to
 * audit whether GSE's weather inputs (wind especially) systematically underestimate extremes, with
 * asymmetric tail-aware loss on the weather features in the totals head if the audit shows
 * underestimation.
 *
 * ACCEPTANCE GATE: ADAPT: the two transferable ideas (multi-lead-time greedy chaining; RQE tail auditing) are
 * concrete, implementable, and map to real GSE subsystems (projection chaining, weather-adjusted
 * totals). Not ADOPT: GSE will not train a weather model — the 3DEST architecture and ERA5
 * pipeline stay in the literature, not the repo.
 *
 * Ingest role: connector interface (Pangu-Weather 3D global forecast adapter: schema + lead-time decay).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2211.02556" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT: the two transferable ideas (multi-lead-time greedy chaining; RQE tail auditing) are
 * concrete, implementable, and map to real GSE subsystems (projection chaining, weather-adjusted
 * totals). Not ADOPT: GSE will not train a weather model — the 3DEST architecture and ERA5
 * pipeline stay in the literature, not the repo.`;

export const CONFIG = {
  enabled: false,
  model: "Pangu-Weather 3D",
  resolution: "0.25deg",
  leadTimesH: [6, 24, 72, 120, 168],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PanguField {
  readonly variable: string;
  readonly level: string;
  readonly leadH: number;
  readonly issuedAt: string;
  readonly gridHash: string;
  readonly mean: number;
  readonly spread: number;
}

export function isPanguField(x: unknown): x is PanguField {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["variable"] === "string" &&
    typeof o["level"] === "string" &&
    isFiniteNumber(o["leadH"]) && (o["leadH"] as number) >= 0 &&
    typeof o["issuedAt"] === "string" && Number.isFinite(Date.parse(o["issuedAt"] as string)) &&
    typeof o["gridHash"] === "string" &&
    isFiniteNumber(o["mean"]) &&
    isFiniteNumber(o["spread"]) && (o["spread"] as number) >= 0
  );
}

/** Lead-time skill decay: exponential decay of anomaly correlation. */
export function skillDecay(leadH: number, tauH = 120, skill0 = 0.95): number | null {
  if (![leadH, tauH, skill0].every(isFiniteNumber) || leadH < 0 || tauH <= 0 || skill0 < 0 || skill0 > 1) return null;
  return skill0 * Math.exp(-leadH / tauH);
}

/** Spread-skill relationship: spread should grow ~ sqrt(lead). */
export function expectedSpread(spread0: number, leadH: number, refH = 24): number | null {
  if (![spread0, leadH, refH].every(isFiniteNumber) || spread0 < 0 || leadH < 0 || refH <= 0) return null;
  return spread0 * Math.sqrt(1 + leadH / refH);
}

/** Blend Pangu field with climatology by lead-time skill. */
export function blendWithClimo(fieldMean: number, climoMean: number, leadH: number, tauH = 120): number | null {
  const w = skillDecay(leadH, tauH);
  if (w === null || ![fieldMean, climoMean].every(isFiniteNumber)) return null;
  return w * fieldMean + (1 - w) * climoMean;
}

/** Freshness: hours since issuance. */
export function forecastAgeH(issuedAt: string, nowMs: number): number | null {
  const t = Date.parse(issuedAt);
  if (!Number.isFinite(t) || !isFiniteNumber(nowMs)) return null;
  return Math.max(0, (nowMs - t) / 3600000);
}
