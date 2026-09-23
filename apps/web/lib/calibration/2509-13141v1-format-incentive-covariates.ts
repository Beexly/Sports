/**
 * arXiv 2509.13141v1: A hidden benefit of incomplete round-robin tournaments: Encouraging offensive play.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Format-aware attacking-incentive covariates for soccer totals: precomputed incentive surfaces — the marginal qualification value of a goal given format, matchday, and table position — fed into the goal-expectancy model. Incentive predicts real goals only if high-incentive matches outscore low-incentive matches at similar team strengths.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * GSE adds format-aware attacking-incentive covariates to its soccer totals model: precomputed incentive surfaces (marginal qualification value of a goal given format, matchday, table position) fed into the goal-expectancy model.
 *
 * ACCEPTANCE GATE:
 * ADAPT iff the incentive predicts real goals: on post-reform UCL league-phase data, high-incentive matches show higher total goals (or higher goal-supremacy vs market) than low-incentive matches with similar team strengths.
 *
 * ENABLED=false: new model covariate; needs a human call.
 */


export const ENABLED = false;

export interface TableState {
  readonly team: string;
  readonly points: number;
  readonly goalDiff: number;
  readonly position: number;
}

export interface MatchContext {
  readonly matchday: number;
  readonly totalMatchdays: number;
  readonly home: TableState;
  readonly away: TableState;
  /** Points gap to the nearest qualification cutoff (positive = safely in). */
  readonly homeCutoffGap: number;
  readonly awayCutoffGap: number;
}

/**
 * Incentive tier of a match: the marginal qualification value of a goal.
 * High when either team sits near a cutoff with few matchdays left and the
 * goal difference is tight; low for dead rubbers.
 */
export function incentiveTier(ctx: MatchContext): "high" | "medium" | "low" {
  const matchdaysLeft = ctx.totalMatchdays - ctx.matchday;
  const urgency = matchdaysLeft <= 2 ? 2 : matchdaysLeft <= 4 ? 1 : 0;
  const nearCutoff = (gap: number) => Math.abs(gap) <= 3;
  const tightGd = Math.abs(ctx.home.goalDiff - ctx.away.goalDiff) <= 5;
  const eitherNear = nearCutoff(ctx.homeCutoffGap) || nearCutoff(ctx.awayCutoffGap);
  if (urgency === 2 && eitherNear) return "high";
  if (urgency >= 1 && (eitherNear || tightGd)) return "medium";
  return "low";
}

/**
 * Marginal qualification value of a goal (0..1): how much one extra goal
 * moves qualification probability, approximated from cutoff gap and GD.
 */
export function goalMarginalValue(cutoffGap: number, goalDiff: number): number {
  // Near the cutoff (|gap| <= 3), a goal is worth a lot; GD tightness scales it.
  const gapValue = Math.max(0, 1 - Math.abs(cutoffGap) / 6);
  const gdValue = Math.max(0, 1 - Math.abs(goalDiff) / 10);
  return Math.min(gapValue * (0.5 + 0.5 * gdValue), 1);
}

export interface IncentiveTestRow {
  readonly tier: "high" | "medium" | "low";
  /** Goal supremacy vs market (realized total goals minus market-implied). */
  readonly goalSupremacy: number;
  /** Team-strength control bucket (so comparisons hold strength fixed). */
  readonly strengthBucket: number;
}

/**
 * Incentive validity test: within each strength bucket, high-incentive matches
 * must show higher mean goal supremacy than low-incentive matches.
 */
export function incentiveValidityTest(
  rows: readonly IncentiveTestRow[],
): { pass: boolean; highMean: number; lowMean: number; bucketsTested: number } {
  const buckets = [...new Set(rows.map((r) => r.strengthBucket))];
  let highSum = 0;
  let highN = 0;
  let lowSum = 0;
  let lowN = 0;
  for (const b of buckets) {
    const inBucket = rows.filter((r) => r.strengthBucket === b);
    const high = inBucket.filter((r) => r.tier === "high");
    const low = inBucket.filter((r) => r.tier === "low");
    if (high.length === 0 || low.length === 0) continue;
    highSum += high.reduce((a, r) => a + r.goalSupremacy, 0);
    highN += high.length;
    lowSum += low.reduce((a, r) => a + r.goalSupremacy, 0);
    lowN += low.length;
  }
  const highMean = highN > 0 ? highSum / highN : 0;
  const lowMean = lowN > 0 ? lowSum / lowN : 0;
  return {
    pass: highN > 0 && lowN > 0 && highMean > lowMean,
    highMean,
    lowMean,
    bucketsTested: buckets.length,
  };
}
