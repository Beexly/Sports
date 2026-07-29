/**
 * Odds math — American / decimal / implied / multi-way multiplicative de-vig.
 * Pure, no network. Used by every quote source.
 */

export type OddsFormat = "american" | "decimal" | "probability";

export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) {
    throw new Error("invalid american odds");
  }
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    throw new Error("invalid decimal odds");
  }
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/** Raw implied probability from American (includes vig share). */
export function americanToImplied(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

export function decimalToImplied(decimal: number): number {
  if (decimal <= 1) throw new Error("invalid decimal");
  return 1 / decimal;
}

/**
 * Multiplicative de-vig for n-way markets.
 * p_i = (1/d_i) / sum_j(1/d_j)
 */
export function multiWayDevig(
  decimals: readonly number[],
): { fair: number[]; overround: number } {
  if (decimals.length < 2) throw new Error("need ≥2 outcomes");
  const raw = decimals.map(decimalToImplied);
  const sum = raw.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) throw new Error("zero mass");
  return {
    fair: raw.map((r) => r / sum),
    overround: sum - 1,
  };
}

/** Two-way moneyline / spread side de-vig. */
export function twoWayDevig(
  americanA: number,
  americanB: number,
): { pA: number; pB: number; overround: number } {
  const dA = americanToDecimal(americanA);
  const dB = americanToDecimal(americanB);
  const { fair, overround } = multiWayDevig([dA, dB]);
  return { pA: fair[0]!, pB: fair[1]!, overround };
}

/** Consensus across books: median of fair probabilities. */
export function medianConsensus(probs: readonly number[]): number {
  const s = [...probs].filter((p) => Number.isFinite(p) && p > 0 && p < 1).sort((a, b) => a - b);
  if (s.length === 0) throw new Error("no probs");
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

export function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(1 - 1e-9, Math.max(1e-9, p));
}
