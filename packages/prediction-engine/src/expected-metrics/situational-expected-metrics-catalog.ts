/**
 * situational-expected-metrics-catalog.ts — Consolidated catalogue and pure calculators
 * for the Q1–Q51 Expected-Metrics signals mapped to the 288-bit context mask (bits 220..278).
 */

export interface ExpectedMetricDescriptor {
  readonly code: string;
  readonly name: string;
  readonly bitIndex: number;
  readonly description: string;
  readonly targetType: "RATE" | "COUNT" | "EPA" | "PROBABILITY";
  readonly sampleHurdle: number;
}

export const SITUATIONAL_EXPECTED_METRICS_CATALOG: readonly ExpectedMetricDescriptor[] = [
  { code: "Q10", name: "Down-of-Conversion Distribution", bitIndex: 224, description: "Calculates conversion distribution across downs 1..4", targetType: "PROBABILITY", sampleHurdle: 20 },
  { code: "Q11", name: "Drive-Outcome Distribution", bitIndex: 225, description: "Categorical probability of TD / FG / Punt / Turnover per drive", targetType: "PROBABILITY", sampleHurdle: 15 },
  { code: "Q12", name: "Play-Caller Script Fingerprint", bitIndex: 226, description: "Pass/run ratio divergence under early-game script stress", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q14", name: "QB Pressure-Behavior Divergence", bitIndex: 227, description: "Time-to-throw change and bail rate when pressured", targetType: "RATE", sampleHurdle: 15 },
  { code: "Q15R", name: "Defensive Regressed FPTS Allowed", bitIndex: 228, description: "Opponent-adjusted fantasy points allowed by position", targetType: "RATE", sampleHurdle: 30 },
  { code: "Q17", name: "QB-Conditioned Receiver Efficiency", bitIndex: 229, description: "Receiver YPRR conditioned on specific QB dropback profile", targetType: "RATE", sampleHurdle: 20 },
  { code: "Q19", name: "Shotgun vs Under-Center EPA Split", bitIndex: 230, description: "Efficiency differential between shotgun and under-center snaps", targetType: "EPA", sampleHurdle: 30 },
  { code: "Q20", name: "Drive Sequencing Volatility", bitIndex: 231, description: "Markovian stall probability following explosive plays", targetType: "PROBABILITY", sampleHurdle: 20 },
  { code: "Q38", name: "Target Success Rate & EPA per Target", bitIndex: 232, description: "Positive EPA play rate on targets to specific receiver", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q41", name: "Scripted vs Non-Scripted EPA", bitIndex: 233, description: "First 15 plays EPA versus remaining regulation dropbacks", targetType: "EPA", sampleHurdle: 30 },
  { code: "Q42", name: "Play-Action vs Straight Dropback Split", bitIndex: 234, description: "Play-action EPA boost over standard pocket dropbacks", targetType: "EPA", sampleHurdle: 25 },
  { code: "Q43", name: "QB EPA on Defensive Penalties", bitIndex: 235, description: "EPA generated through drawn defensive pass interference / holding", targetType: "EPA", sampleHurdle: 20 },
  { code: "Q44", name: "Neutral-Script Game State EPA", bitIndex: 236, description: "EPA per dropback when score margin is within 7 points", targetType: "EPA", sampleHurdle: 35 },
  { code: "Q45", name: "Manageable 3rd Down Creation Rate", bitIndex: 237, description: "Rate of creating 3rd down with 4 or fewer yards to go", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q46", name: "Adjusted Scramble EPA", bitIndex: 238, description: "Scramble yards EPA over expected throwaway baseline", targetType: "EPA", sampleHurdle: 15 },
  { code: "Q47", name: "Pass-Rush Strength of Schedule Faced", bitIndex: 239, description: "Opponent PRWR weighted schedule adjustment", targetType: "RATE", sampleHurdle: 30 },
  { code: "Q48", name: "QB Multi-Dimensional Z-Score", bitIndex: 240, description: "Composite standard score across CPOE, EPA, PBWR-delta, and blitz answer", targetType: "RATE", sampleHurdle: 30 },
  { code: "Q49", name: "Toxic Differential", bitIndex: 241, description: "+20-yard explosive play margin minus turnover margin", targetType: "COUNT", sampleHurdle: 20 },
  { code: "Q50", name: "WR Target Depth After Leader (Gini)", bitIndex: 242, description: "Target share inequality across WR2 through WR4", targetType: "RATE", sampleHurdle: 25 },
  { code: "Q51", name: "Red-Zone Target Success Rate", bitIndex: 243, description: "Inside-the-20 target completion and TD rate by alignment", targetType: "RATE", sampleHurdle: 15 },
];

/**
 * Compute manageable 3rd down creation rate: (3rd & <= 4) / total 3rd down plays.
 */
export function computeManageableThirdDownRate(thirdDownDistances: readonly number[]): number {
  if (thirdDownDistances.length === 0) return 0;
  const manageable = thirdDownDistances.filter((d) => d <= 4).length;
  return Number((manageable / thirdDownDistances.length).toFixed(4));
}

/**
 * Compute toxic differential: Explosive plays (passes >= 20 yds + rushes >= 10 yds) minus turnovers.
 */
export function computeToxicDifferential(explosives: number, turnovers: number): number {
  return explosives - turnovers;
}

/**
 * Compute Gini coefficient of target distribution across receiving corps.
 */
export function computeTargetShareGini(shares: readonly number[]): number {
  if (shares.length === 0) return 0;
  const sorted = [...shares].sort((a, b) => a - b);
  const n = sorted.length;
  let num = 0;
  for (let i = 0; i < n; i++) {
    num += (2 * (i + 1) - n - 1) * sorted[i]!;
  }
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  if (mean <= 0) return 0;
  return Number((num / (n * n * mean)).toFixed(4));
}
