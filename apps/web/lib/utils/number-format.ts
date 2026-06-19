/**
 * Number formatting utilities — pure, zero dependencies.
 *
 * Human-friendly formatting for stats, probabilities, money, and counts.
 */

/**
 * Format a large number with K/M/B suffix.
 * 1200 → "1.2K", 1_500_000 → "1.5M", 2_000_000_000 → "2B"
 */
export function compactNumber(n: number, decimals = 1): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";

  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(decimals).replace(/\.0$/, "")}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(decimals).replace(/\.0$/, "")}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(decimals).replace(/\.0$/, "")}K`;
  return n.toFixed(0);
}

/**
 * Format a probability (0–1) as a percentage string.
 * 0.7423 → "74.2%", 0.5 → "50%"
 */
export function formatPct(prob: number, decimals = 1): string {
  if (!isFinite(prob)) return "—";
  const pct = prob * 100;
  const fixed = pct.toFixed(decimals);
  return `${fixed.replace(/\.0$/, "")}%`;
}

/**
 * Format a probability 0–100 scale (already in percent).
 * 74.23 → "74.2%"
 */
export function formatPct100(pct: number, decimals = 1): string {
  return formatPct(pct / 100, decimals);
}

/**
 * Format American odds: +150, -110, EV (for ±0).
 */
export function formatAmericanOdds(odds: number): string {
  if (!isFinite(odds)) return "—";
  if (odds === 0) return "EV";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/**
 * Format a signed number with explicit + sign for positive.
 * Used for CLV display: +2.3, -1.5, 0.0
 */
export function formatSigned(n: number, decimals = 1): string {
  if (!isFinite(n)) return "—";
  const fixed = Math.abs(n).toFixed(decimals);
  if (n > 0) return `+${fixed}`;
  if (n < 0) return `-${fixed}`;
  return fixed;
}

/**
 * Format a currency amount.
 * 1234.5 → "$1,234.50"
 */
export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  if (!isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Format a decimal odds value.
 * 1.909 → "1.91", 2.0 → "2.00"
 */
export function formatDecimalOdds(odds: number, decimals = 2): string {
  if (!isFinite(odds) || odds <= 0) return "—";
  return odds.toFixed(decimals);
}

/**
 * Round to N significant figures.
 * 0.00734 (2 sig figs) → 0.0073
 */
export function sigFigs(n: number, figures = 3): number {
  if (n === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(n)));
  const factor = Math.pow(10, figures - 1 - magnitude);
  return Math.round(n * factor) / factor;
}

/**
 * Clamp a number to [min, max].
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Linear interpolation between a and b at t (0–1).
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Map n from [inMin, inMax] to [outMin, outMax].
 */
export function remap(n: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  return outMin + ((n - inMin) / (inMax - inMin)) * (outMax - outMin);
}
