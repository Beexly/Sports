/**
 * Product Analytics Library — Galaxy Sports Edge
 *
 * Pure TypeScript, zero npm dependencies.
 * All metrics computed from real inputs — no fabricated data.
 */

// ---------------------------------------------------------------------------
// 1. User engagement ratios
// ---------------------------------------------------------------------------

/** Identity holder for daily active users metric. */
export function dau(dailyActiveUsers: number): number {
  return dailyActiveUsers;
}

/** Identity holder for weekly active users metric. */
export function wau(weeklyActiveUsers: number): number {
  return weeklyActiveUsers;
}

/** Identity holder for monthly active users metric. */
export function mau(monthlyActiveUsers: number): number {
  return monthlyActiveUsers;
}

/**
 * Stickiness ratio: DAU / MAU, returns a value in [0, 1].
 * Returns 0 when MAU is 0.
 */
export function stickinessRatio(dauValue: number, mauValue: number): number {
  if (mauValue === 0) return 0;
  return dauValue / mauValue;
}

/**
 * Weekly stickiness: WAU / MAU, returns a value in [0, 1].
 * Returns 0 when MAU is 0.
 */
export function weeklyStickiness(wauValue: number, mauValue: number): number {
  if (mauValue === 0) return 0;
  return wauValue / mauValue;
}

/**
 * Engagement score: (sessions*2 + actions*0.5 + durationMinutes*0.1)
 * Normalized to 0–100, capped at 100.
 */
export function engagementScore(
  sessions: number,
  actions: number,
  durationMinutes: number,
): number {
  const raw = sessions * 2 + actions * 0.5 + durationMinutes * 0.1;
  return Math.min(100, raw);
}

// ---------------------------------------------------------------------------
// 2. Retention analysis
// ---------------------------------------------------------------------------

/**
 * Day-1 retention percentage.
 * Returns 0 when usersDay0 is 0.
 */
export function dayOneRetention(usersDay0: number, usersDay1: number): number {
  if (usersDay0 === 0) return 0;
  return (usersDay1 / usersDay0) * 100;
}

/**
 * Day-7 retention percentage.
 * Returns 0 when usersDay0 is 0.
 */
export function day7Retention(usersDay0: number, usersDay7: number): number {
  if (usersDay0 === 0) return 0;
  return (usersDay7 / usersDay0) * 100;
}

/**
 * Day-30 retention percentage.
 * Returns 0 when usersDay0 is 0.
 */
export function day30Retention(usersDay0: number, usersDay30: number): number {
  if (usersDay0 === 0) return 0;
  return (usersDay30 / usersDay0) * 100;
}

/**
 * Linear regression slope across retention rates indexed by day position.
 * Returns 0 for arrays with fewer than 2 elements.
 */
export function retentionCurveSlope(retentionRates: number[]): number {
  const n = retentionRates.length;
  if (n < 2) return 0;

  // x values are 0-based indices
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const rate = retentionRates[i] ?? 0;
    sumX += i;
    sumY += rate;
    sumXY += i * rate;
    sumXX += i * i;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Churn rate: (startUsers + newUsers - endUsers) / startUsers * 100.
 * Returns 0 when startUsers is 0.
 */
export function churnRate(
  startUsers: number,
  endUsers: number,
  newUsers: number,
): number {
  if (startUsers === 0) return 0;
  return ((startUsers + newUsers - endUsers) / startUsers) * 100;
}

/**
 * Bucket a retention rate into a qualitative label.
 * >40% = excellent, >25% = good, >10% = average, else poor.
 */
export function retentionBucket(
  rate: number,
): 'excellent' | 'good' | 'average' | 'poor' {
  if (rate > 40) return 'excellent';
  if (rate > 25) return 'good';
  if (rate > 10) return 'average';
  return 'poor';
}

// ---------------------------------------------------------------------------
// 3. Feature adoption
// ---------------------------------------------------------------------------

/**
 * Feature adoption rate percentage.
 * Returns 0 when totalEligibleUsers is 0.
 */
export function featureAdoptionRate(
  usersUsedFeature: number,
  totalEligibleUsers: number,
): number {
  if (totalEligibleUsers === 0) return 0;
  return (usersUsedFeature / totalEligibleUsers) * 100;
}

/**
 * Feature adoption velocity: rate of change per period.
 * (last - first) / (count - 1). Returns 0 for arrays with fewer than 2 elements.
 */
export function featureAdoptionVelocity(adoptionRates: number[]): number {
  const n = adoptionRates.length;
  if (n < 2) return 0;
  const first = adoptionRates[0] ?? 0;
  const last = adoptionRates[n - 1] ?? 0;
  return (last - first) / (n - 1);
}

/**
 * Feature stickiness: featureDAU / featureMAU.
 * Returns 0 when featureMAU is 0.
 */
export function featureStickiness(
  featureDAU: number,
  featureMAU: number,
): number {
  if (featureMAU === 0) return 0;
  return featureDAU / featureMAU;
}

/**
 * Adoption funnel — for each step, compute absolute dropout from previous step
 * and percentage conversion from previous step.
 */
export function adoptionFunnel(steps: number[]): Array<{
  step: number;
  users: number;
  dropOff: number;
  conversionFromPrev: number;
}> {
  return steps.map((users, index) => {
    if (index === 0) {
      return { step: index, users, dropOff: 0, conversionFromPrev: 100 };
    }
    const prev = steps[index - 1] ?? 0;
    const dropOff = prev - users;
    const conversionFromPrev = prev === 0 ? 0 : (users / prev) * 100;
    return { step: index, users, dropOff, conversionFromPrev };
  });
}

/**
 * Time to adopt: days from first login to first feature use (floored).
 */
export function timeToAdopt(
  firstLoginDate: Date,
  firstFeatureUseDate: Date,
): number {
  const diffMs = firstFeatureUseDate.getTime() - firstLoginDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ---------------------------------------------------------------------------
// 4. Session analytics
// ---------------------------------------------------------------------------

/**
 * Average session duration in milliseconds.
 * Returns 0 when sessions is 0.
 */
export function averageSessionDuration(
  totalDurationMs: number,
  sessions: number,
): number {
  if (sessions === 0) return 0;
  return totalDurationMs / sessions;
}

/**
 * Bounce rate percentage.
 * Returns 0 when totalSessions is 0.
 */
export function bounceRate(
  singlePageSessions: number,
  totalSessions: number,
): number {
  if (totalSessions === 0) return 0;
  return (singlePageSessions / totalSessions) * 100;
}

/**
 * Average pages per session.
 * Returns 0 when sessions is 0.
 */
export function pagesPerSession(
  totalPageviews: number,
  sessions: number,
): number {
  if (sessions === 0) return 0;
  return totalPageviews / sessions;
}

/**
 * Compute descriptive statistics from an array of per-session action counts.
 */
export function sessionDepth(actions: number[]): {
  mean: number;
  median: number;
  p75: number;
  p95: number;
} {
  if (actions.length === 0) {
    return { mean: 0, median: 0, p75: 0, p95: 0 };
  }

  const sorted = [...actions].sort((a, b) => a - b);
  const n = sorted.length;

  const mean = sorted.reduce((acc, v) => acc + v, 0) / n;

  const percentile = (p: number): number => {
    const idx = (p / 100) * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    const loVal = sorted[lo] ?? 0;
    const hiVal = sorted[hi] ?? 0;
    if (lo === hi) return loVal;
    return loVal + (hiVal - loVal) * (idx - lo);
  };

  const median = percentile(50);
  const p75 = percentile(75);
  const p95 = percentile(95);

  return { mean, median, p75, p95 };
}

/**
 * Session quality score 0–100.
 * Bounced sessions return 0.
 * Otherwise: (duration/300000)*30 + (pages/10)*30 + (actions/20)*40, capped 100.
 */
export function sessionQualityScore(
  duration: number,
  pages: number,
  actions: number,
  bounced: boolean,
): number {
  if (bounced) return 0;
  const raw =
    (duration / 300000) * 30 + (pages / 10) * 30 + (actions / 20) * 40;
  return Math.min(100, raw);
}

// ---------------------------------------------------------------------------
// 5. NPS and satisfaction
// ---------------------------------------------------------------------------

/**
 * Net Promoter Score: (promoters/total - detractors/total) * 100.
 * Returns 0 when total is 0.
 */
export function npsScore(
  promoters: number,
  detractors: number,
  total: number,
): number {
  if (total === 0) return 0;
  return (promoters / total - detractors / total) * 100;
}

/**
 * NPS qualitative category.
 * >70 = excellent, >50 = good, >0 = needs_improvement, else bad.
 */
export function npsCategory(
  score: number,
): 'excellent' | 'good' | 'needs_improvement' | 'bad' {
  if (score > 70) return 'excellent';
  if (score > 50) return 'good';
  if (score > 0) return 'needs_improvement';
  return 'bad';
}

/**
 * CSAT score percentage.
 * Returns 0 when totalResponses is 0.
 */
export function csatScore(
  satisfiedResponses: number,
  totalResponses: number,
): number {
  if (totalResponses === 0) return 0;
  return (satisfiedResponses / totalResponses) * 100;
}

/**
 * Sentiment score: (positive - negative) / total * 100.
 * Returns 0 when all counts sum to 0.
 */
export function sentimentScore(
  positive: number,
  negative: number,
  neutral: number,
): number {
  const total = positive + negative + neutral;
  if (total === 0) return 0;
  return ((positive - negative) / total) * 100;
}

// ---------------------------------------------------------------------------
// 6. Growth metrics
// ---------------------------------------------------------------------------

/**
 * Period-over-period growth rate percentage.
 * Throws when previous is 0.
 */
export function growthRate(current: number, previous: number): number {
  if (previous === 0) {
    throw new Error('growthRate: previous value must not be zero');
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Compound annual growth rate (CAGR).
 * ((endValue / startValue)^(1/periods) - 1) * 100.
 */
export function compoundGrowthRate(
  startValue: number,
  endValue: number,
  periods: number,
): number {
  if (startValue === 0) {
    throw new Error('compoundGrowthRate: startValue must not be zero');
  }
  return (Math.pow(endValue / startValue, 1 / periods) - 1) * 100;
}

/**
 * Viral coefficient: invitesPerUser * conversionRate.
 */
export function kFactor(
  invitesPerUser: number,
  conversionRate: number,
): number {
  return invitesPerUser * conversionRate;
}

/**
 * Payback period in months: CAC / (ARPU * grossMargin / 100).
 */
export function paybackPeriod(
  cac: number,
  arpu: number,
  grossMargin: number,
): number {
  return cac / (arpu * (grossMargin / 100));
}

/**
 * Customer lifetime value: ARPU / churnRateMonthly (decimal).
 * Returns Infinity when churnRateMonthly is 0.
 */
export function customerLifetimeValue(
  arpu: number,
  churnRateMonthly: number,
): number {
  if (churnRateMonthly === 0) return Infinity;
  return arpu / churnRateMonthly;
}

// ---------------------------------------------------------------------------
// 7. Funnel analytics
// ---------------------------------------------------------------------------

/**
 * Overall funnel conversion rate percentage.
 * Returns 0 when topOfFunnel is 0.
 */
export function funnelConversionRate(
  topOfFunnel: number,
  bottomOfFunnel: number,
): number {
  if (topOfFunnel === 0) return 0;
  return (bottomOfFunnel / topOfFunnel) * 100;
}

/**
 * Absolute dropoff at each stage transition.
 * Returns array of length (stages.length - 1).
 */
export function funnelDropOff(stages: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1] ?? 0;
    const curr = stages[i] ?? 0;
    result.push(prev - curr);
  }
  return result;
}

/**
 * Percentage dropoff at each stage transition relative to the previous stage.
 * Returns array of length (stages.length - 1).
 */
export function funnelDropOffPct(stages: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1] ?? 0;
    const curr = stages[i] ?? 0;
    if (prev === 0) {
      result.push(0);
    } else {
      result.push(((prev - curr) / prev) * 100);
    }
  }
  return result;
}

/**
 * Funnel revenue: sum of stage[i] * conversionValues[i].
 */
export function funnelRevenue(
  stages: number[],
  conversionValues: number[],
): number {
  return stages.reduce((sum, users, i) => {
    return sum + users * (conversionValues[i] ?? 0);
  }, 0);
}

/**
 * Index of the stage with the highest absolute dropoff.
 * Returns -1 for empty or single-element arrays.
 * The returned index corresponds to the transition FROM that index TO the next.
 */
export function identifyBottleneck(stages: number[]): number {
  if (stages.length < 2) return -1;

  let maxDrop = -Infinity;
  let maxIdx = 0;

  for (let i = 0; i < stages.length - 1; i++) {
    const curr = stages[i] ?? 0;
    const next = stages[i + 1] ?? 0;
    const drop = curr - next;
    if (drop > maxDrop) {
      maxDrop = drop;
      maxIdx = i;
    }
  }

  return maxIdx;
}

// ---------------------------------------------------------------------------
// 8. Pick platform specific
// ---------------------------------------------------------------------------

/**
 * Pick view-to-favorite rate percentage.
 * Returns 0 when views is 0.
 */
export function pickViewToFavoriteRate(
  views: number,
  favorites: number,
): number {
  if (views === 0) return 0;
  return (favorites / views) * 100;
}

/**
 * Pick engagement score: (favorites*3 + shares*5 + comments*4) / views * 100.
 * Capped at 100. Returns 0 when views is 0.
 */
export function pickEngagement(
  views: number,
  favorites: number,
  shares: number,
  comments: number,
): number {
  if (views === 0) return 0;
  const raw = ((favorites * 3 + shares * 5 + comments * 4) / views) * 100;
  return Math.min(100, raw);
}

/**
 * Subscription conversion funnel rates.
 * Each rate is percentage of the previous stage; overallRate = paidSubscribers/visitors*100.
 */
export function subscriptionConversionFunnel(
  visitors: number,
  signups: number,
  trialists: number,
  paidSubscribers: number,
): {
  signupRate: number;
  trialRate: number;
  paidRate: number;
  overallRate: number;
} {
  const signupRate = visitors === 0 ? 0 : (signups / visitors) * 100;
  const trialRate = signups === 0 ? 0 : (trialists / signups) * 100;
  const paidRate = trialists === 0 ? 0 : (paidSubscribers / trialists) * 100;
  const overallRate = visitors === 0 ? 0 : (paidSubscribers / visitors) * 100;

  return { signupRate, trialRate, paidRate, overallRate };
}

/**
 * Content performance score (0–100):
 * - views normalized by 1000, capped at 30 points
 * - avgTimeOnPage normalized by 180s, capped at 40 points
 * - scrollDepth percentage, capped at 30 points
 */
export function contentPerformanceScore(
  views: number,
  avgTimeOnPage: number,
  scrollDepth: number,
): number {
  const viewScore = Math.min(30, (views / 1000) * 30);
  const timeScore = Math.min(40, (avgTimeOnPage / 180) * 40);
  const scrollScore = Math.min(30, scrollDepth);
  return viewScore + timeScore + scrollScore;
}
