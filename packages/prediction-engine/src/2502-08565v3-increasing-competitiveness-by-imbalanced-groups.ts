/**
 * arXiv:2502.08565v3 — Increasing competitiveness by imbalanced groups: The example of the 48-team FIFA World Cup
 *
 * Incentive-discount adjustment for stakeless games: the favorite's underperformance scales with starter
 * rest share, rest-day differential, and mutual stakelessness, fit hierarchically across teams for coach
 * signatures that persist.
 *
 * Improvement: Add an incentive-discount adjustment for stakeless games with a dynamic dose-response: estimate how the favorite's underperformance scales with (a) fraction of starters rested (snap-share data), (b) days of rest differential, and (c) whether the opponent is also stakeless — fit hierarchically across teams to find coaches with persistent incentive-effect signatures GSE can price every January.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Adopt the incentive-discount adjustment if, on the 2025 test window (Weeks 15–18), the adjusted model beats the baseline by ≥1.5 percentage points of ATS cover rate OR reduces margin MAE by ≥0.4 points, with the stakeless×weight interaction coefficient significant at p<0.05 on the 2020–2024 fit.
 */

/** Dose variables for the incentive discount. */
export interface IncentiveDose {
  /** Fraction of starters rested (snap-share). */
  restShare: number;
  /** Rest-day differential (team - opponent). */
  restDiffDays: number;
  /** True when the opponent is also stakeless. */
  oppStakeless: boolean;
}

/** Team-level hierarchical coefficients (the coach-signature layer). */
export interface IncentiveCoeffs {
  team: string;
  /** Points of underperformance per unit rest share. */
  betaRest: number;
  /** Points per rest-day differential. */
  betaRestDiff: number;
  /** Extra discount when both teams are stakeless. */
  betaMutual: number;
}

/** Expected margin discount (points) for a stakeless favorite. */
export function incentiveDiscount(dose: IncentiveDose, c: IncentiveCoeffs): number {
  const rs = Math.min(1, Math.max(0, dose.restShare));
  const mutual = dose.oppStakeless ? 1 : 0;
  return c.betaRest * rs + c.betaRestDiff * dose.restDiffDays + c.betaMutual * rs * mutual;
}

/**
 * League-average (pooled) coefficients shrunk toward the global mean by the
 * hierarchical weight w in [0,1]: c_pool = w*c_team + (1-w)*c_global.
 */
export function shrinkCoeffs(
  team: IncentiveCoeffs,
  global: Omit<IncentiveCoeffs, "team">,
  w: number,
): IncentiveCoeffs {
  const ww = Math.min(1, Math.max(0, w));
  return {
    team: team.team,
    betaRest: ww * team.betaRest + (1 - ww) * global.betaRest,
    betaRestDiff: ww * team.betaRestDiff + (1 - ww) * global.betaRestDiff,
    betaMutual: ww * team.betaMutual + (1 - ww) * global.betaMutual,
  };
}
