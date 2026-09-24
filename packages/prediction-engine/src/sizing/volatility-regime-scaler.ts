
export type VolRegime = "low" | "normal" | "high";

/** Rolling standard deviation of returns (trailing window). */
export function rollingVolatility(returns: readonly number[], window: number): number[] {
  if (!(window >= 2)) throw new Error("volatility-regime-scaler: window >= 2 required");
  const out: number[] = [];
  for (let i = 0; i < returns.length; i++) {
    const slice = returns.slice(Math.max(0, i - window + 1), i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const sd = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(slice.length - 1, 1));
    out.push(sd);
  }
  return out;
}

function quantile(sorted: number[], q: number): number {
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx] ?? 0;
}

/** Classify current vol against trailing history: <25% low, >75% high. */
export function classifyRegime(currentVol: number, history: readonly number[]): VolRegime {
  if (history.length === 0) return "normal";
  const sorted = [...history].sort((a, b) => a - b);
  if (currentVol <= quantile(sorted, 0.25)) return "low";
  if (currentVol >= quantile(sorted, 0.75)) return "high";
  return "normal";
}

export interface ScalerConfig {
  readonly lowMult?: number;
  readonly normalMult?: number;
  readonly highMult?: number;
}

/** Regime multiplier with a drawdown haircut: mult *= max(0, 1 - drawdown). */
export function stakeMultiplier(regime: VolRegime, drawdown: number, cfg: ScalerConfig = {}): number {
  const base = regime === "low" ? (cfg.lowMult ?? 1) : regime === "high" ? (cfg.highMult ?? 0.4) : (cfg.normalMult ?? 0.75);
  return base * Math.max(0, 1 - Math.max(drawdown, 0));
}

/** Scale a base stake, capped at maxBankrollFrac of bankroll. */
export function scaleStake(baseStake: number, multiplier: number, bankroll: number, maxBankrollFrac = 0.05): number {
  if (!(bankroll > 0)) throw new Error("volatility-regime-scaler: bankroll must be positive");
  return Math.min(Math.max(baseStake * multiplier, 0), maxBankrollFrac * bankroll);
}
