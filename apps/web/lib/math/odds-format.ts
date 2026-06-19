/**
 * Multi-format odds converter — pure math, zero dependencies.
 * Attribution: Re-implemented TS-native from oddslib (MIT, github.com/1player/oddslib)
 * Supports: American / Decimal / Fractional / Hong Kong / Malay / Indonesian / Probability
 */

export type OddsFormat = "american" | "decimal" | "fractional" | "hongkong" | "malay" | "indonesian" | "probability";

/** Parse an odds value and convert it to implied probability (0–1). */
export function oddsToProb(value: number, format: OddsFormat): number {
  switch (format) {
    case "probability":
      return Math.max(0, Math.min(1, value));
    case "decimal":
      if (value <= 0) return 0;
      return 1 / value;
    case "american":
      if (value > 0) return 100 / (value + 100);
      if (value < 0) return Math.abs(value) / (Math.abs(value) + 100);
      return 0;
    case "fractional": {
      // e.g. 5/2 → pass as 5/2 = 2.5 numerator/denominator ratio
      // Accepts decimal ratio: 5/2 = 2.5
      if (value <= 0) return 0;
      return 1 / (value + 1);
    }
    case "hongkong":
      if (value <= 0) return 0;
      return 1 / (value + 1);
    case "malay":
      if (value > 0 && value <= 1) return 1 / (value + 1);
      if (value < 0) return Math.abs(value) / (Math.abs(value) + 1);
      return 0;
    case "indonesian":
      if (value >= 1) return 1 / (value + 1);
      if (value < 0) return Math.abs(value) / (Math.abs(value) + 1);
      return 0;
    default:
      return 0;
  }
}

/** Convert implied probability (0–1) to a target format. */
export function probToOdds(prob: number, format: OddsFormat): number {
  if (prob <= 0 || prob >= 1) {
    // Return boundary values
    if (format === "american") return prob <= 0 ? -Infinity : Infinity;
    return 0;
  }
  switch (format) {
    case "probability":
      return prob;
    case "decimal":
      return 1 / prob;
    case "american":
      if (prob > 0.5) return -((prob / (1 - prob)) * 100);
      return ((1 - prob) / prob) * 100;
    case "fractional":
      return (1 - prob) / prob;
    case "hongkong":
      return (1 - prob) / prob;
    case "malay": {
      const dec = 1 / prob;
      const net = dec - 1;
      if (net <= 1) return net;
      return -(1 / net);
    }
    case "indonesian": {
      const dec = 1 / prob;
      const net = dec - 1;
      if (net >= 1) return net;
      return -(1 / net);
    }
    default:
      return 0;
  }
}

/** Convert between any two odds formats directly. */
export function convertOdds(value: number, from: OddsFormat, to: OddsFormat): number {
  if (from === to) return value;
  const prob = oddsToProb(value, from);
  return probToOdds(prob, to);
}

/** Format American odds for display: "+150" or "-110" */
export function formatAmerican(value: number): string {
  const rounded = Math.round(value);
  return rounded >= 0 ? `+${rounded}` : `${rounded}`;
}

/** Format decimal odds for display: "2.50" */
export function formatDecimal(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

/** Format probability as percentage: "52.4%" */
export function formatProbability(prob: number, decimals = 1): string {
  return `${(prob * 100).toFixed(decimals)}%`;
}
