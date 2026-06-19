/**
 * Email Analytics Library
 * Pure TypeScript, zero dependencies, no side effects.
 * All functions are pure computations — no I/O, no network calls.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailCampaign {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
}

export interface EmailEvent {
  timestamp: Date;
  type: "open" | "click" | "bounce" | "unsubscribe" | "complaint";
  userId?: string;
}

export interface ListHealth {
  totalSubscribers: number;
  activeSubscribers: number;
  hardBounces: number;
  softBounces: number;
  unsubscribes: number;
}

export interface SendTimeRecommendation {
  dayOfWeek: number;
  hour: number;
  score: number;
  reason: string;
}

export interface CampaignBenchmark {
  industry: string;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  avgUnsubRate: number;
}

export interface DeliverabilityScore {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: string[];
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// Core rate calculations
// ---------------------------------------------------------------------------

/** delivered / sent */
export function deliveryRate(c: EmailCampaign): number {
  return safeDivide(c.delivered, c.sent);
}

/** opened / delivered */
export function openRate(c: EmailCampaign): number {
  return safeDivide(c.opened, c.delivered);
}

/** clicked / delivered */
export function clickRate(c: EmailCampaign): number {
  return safeDivide(c.clicked, c.delivered);
}

/** clicked / opened — Click-to-Open Rate (CTOR) */
export function clickToOpenRate(c: EmailCampaign): number {
  return safeDivide(c.clicked, c.opened);
}

/** bounced / sent */
export function bounceRate(c: EmailCampaign): number {
  return safeDivide(c.bounced, c.sent);
}

/** hardBounces / sent */
export function hardBounceRate(hardBounces: number, sent: number): number {
  return safeDivide(hardBounces, sent);
}

/** unsubscribed / delivered */
export function unsubscribeRate(c: EmailCampaign): number {
  return safeDivide(c.unsubscribed, c.delivered);
}

/** complained / delivered */
export function complaintRate(c: EmailCampaign): number {
  return safeDivide(c.complained, c.delivered);
}

/** conversions / clicked */
export function conversionRate(conversions: number, clicked: number): number {
  return safeDivide(conversions, clicked);
}

// ---------------------------------------------------------------------------
// Campaign scoring
// ---------------------------------------------------------------------------

/**
 * Weighted health score 0-100:
 * openRate×30 + clickRate×25 + (1-bounceRate)×20 + (1-unsubRate)×15 + (1-complaintRate)×10
 * Clamped to [0, 100].
 */
export function campaignHealthScore(c: EmailCampaign): number {
  const or = openRate(c);
  const cr = clickRate(c);
  const br = bounceRate(c);
  const ur = unsubscribeRate(c);
  const cpr = complaintRate(c);

  const score =
    or * 30 +
    cr * 25 +
    (1 - br) * 20 +
    (1 - ur) * 15 +
    (1 - cpr) * 10;

  return clamp(score, 0, 100);
}

/** A≥80, B≥65, C≥50, D≥35, F<35 */
export function campaignGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  return gradeFromScore(score);
}

/** revenue / sent */
export function revenuePerEmail(revenue: number, sent: number): number {
  return safeDivide(revenue, sent);
}

/** revenue / clicked */
export function revenuePerClick(revenue: number, clicked: number): number {
  return safeDivide(revenue, clicked);
}

/** (revenue - cost) / cost */
export function roi(revenue: number, cost: number): number {
  return safeDivide(revenue - cost, cost);
}

// ---------------------------------------------------------------------------
// List health
// ---------------------------------------------------------------------------

/**
 * 0-100 composite:
 * active/total × 50 + (1 - bounceRate × 2) × 25 + (1 - unsubRate × 5) × 25
 * Clamped to [0, 100].
 */
export function listHealthScore(health: ListHealth): number {
  const total = health.totalSubscribers;
  const activeRatio = safeDivide(health.activeSubscribers, total);
  const totalBounces = health.hardBounces + health.softBounces;
  const br = safeDivide(totalBounces, total);
  const unsubRate = safeDivide(health.unsubscribes, total);

  const score =
    activeRatio * 50 +
    (1 - br * 2) * 25 +
    (1 - unsubRate * 5) * 25;

  return clamp(score, 0, 100);
}

/**
 * Segment subscribers by engagement level.
 * - highly_engaged: opened in last 30d AND clicked
 * - engaged: opened in last 60d (but not highly engaged)
 * - at_risk: opened 61-180d ago
 * - inactive: >180d since last activity
 */
export function engagementSegmentation(
  subscribers: { opens: number; clicks: number; lastActivity: Date; now: Date }[]
): {
  highly_engaged: number;
  engaged: number;
  at_risk: number;
  inactive: number;
} {
  const result = { highly_engaged: 0, engaged: 0, at_risk: 0, inactive: 0 };

  for (const sub of subscribers) {
    const daysSince =
      (sub.now.getTime() - sub.lastActivity.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince <= 30 && sub.clicks > 0) {
      result.highly_engaged++;
    } else if (daysSince <= 60) {
      result.engaged++;
    } else if (daysSince <= 180) {
      result.at_risk++;
    } else {
      result.inactive++;
    }
  }

  return result;
}

/** totalList * expectedOpenRate */
export function estimatedReach(
  totalList: number,
  expectedOpenRate: number
): number {
  return totalList * expectedOpenRate;
}

/** (current - previous) / previous */
export function growthRate(current: number, previous: number): number {
  return safeDivide(current - previous, previous);
}

/** lost / starting */
export function churnRate(lost: number, starting: number): number {
  return safeDivide(lost, starting);
}

// ---------------------------------------------------------------------------
// Deliverability
// ---------------------------------------------------------------------------

interface DeliverabilityOptions {
  spfPass?: boolean;
  dkimPass?: boolean;
  dmarcPass?: boolean;
}

/**
 * Compute a deliverability score and grade.
 * Base = 100; deductions applied per issue found.
 */
export function deliverabilityScore(
  c: EmailCampaign,
  opts?: DeliverabilityOptions
): DeliverabilityScore {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  const br = bounceRate(c);
  const cpr = complaintRate(c);
  const or = openRate(c);
  const ur = unsubscribeRate(c);

  // Bounce rate deductions
  if (br > 0.05) {
    score -= 20;
    issues.push("Critical bounce rate above 5%");
    recommendations.push(
      "Immediately clean your list and remove hard bounces. Bounce rate above 5% severely damages sender reputation."
    );
  } else if (br > 0.02) {
    score -= 10;
    issues.push("Elevated bounce rate above 2%");
    recommendations.push(
      "Review list hygiene practices and remove invalid addresses. Target bounce rate below 2%."
    );
  }

  // Complaint rate deductions
  if (cpr > 0.001) {
    score -= 30;
    issues.push("Critical complaint rate above 0.1%");
    recommendations.push(
      "Implement double opt-in and review content quality. Complaint rate above 0.1% triggers ISP filtering."
    );
  } else if (cpr > 0.0005) {
    score -= 15;
    issues.push("Elevated complaint rate above 0.05%");
    recommendations.push(
      "Review unsubscribe flow visibility and content relevance to reduce complaints."
    );
  }

  // Low open rate
  if (or < 0.10) {
    score -= 15;
    issues.push("Open rate below 10%");
    recommendations.push(
      "Improve subject lines, sender name, and send-time targeting to increase engagement signals."
    );
  }

  // High unsubscribe rate
  if (ur > 0.005) {
    score -= 5;
    issues.push("Unsubscribe rate above 0.5%");
    recommendations.push(
      "Audit email frequency and content relevance. High unsubscribe rates signal poor list-content fit."
    );
  }

  // Authentication checks
  if (opts?.spfPass === false) {
    score -= 10;
    issues.push("SPF authentication failing");
    recommendations.push(
      "Configure SPF record in your DNS to authorize sending servers."
    );
  }

  if (opts?.dkimPass === false) {
    score -= 8;
    issues.push("DKIM authentication failing");
    recommendations.push(
      "Set up DKIM signing for your sending domain to prove message integrity."
    );
  }

  if (opts?.dmarcPass === false) {
    score -= 7;
    issues.push("DMARC policy not passing");
    recommendations.push(
      "Publish a DMARC record and ensure SPF and DKIM alignment for full authentication."
    );
  }

  const finalScore = clamp(score, 0, 100);
  const grade = gradeFromScore(finalScore);

  return { score: finalScore, grade, issues, recommendations };
}

/**
 * Assess reputation risk level.
 * - critical: complaintRate>0.002 OR bounceRate>0.08
 * - high: complaintRate>0.001 OR bounceRate>0.05
 * - medium: openRate<0.10 OR unsubRate>0.003
 * - low: otherwise
 */
export function reputationRisk(
  c: EmailCampaign
): "low" | "medium" | "high" | "critical" {
  const cpr = complaintRate(c);
  const br = bounceRate(c);
  const or = openRate(c);
  const ur = unsubscribeRate(c);

  if (cpr > 0.002 || br > 0.08) return "critical";
  if (cpr > 0.001 || br > 0.05) return "high";
  if (or < 0.10 || ur > 0.003) return "medium";
  return "low";
}

/**
 * Estimate inbox placement rate from deliverability score.
 * score≥80 → 0.90 (midpoint), score≥65 → 0.75, score≥50 → 0.55, else 0.30
 */
export function inboxPlacementEstimate(score: number): number {
  if (score >= 80) return 0.90;
  if (score >= 65) return 0.75;
  if (score >= 50) return 0.55;
  return 0.30;
}

// ---------------------------------------------------------------------------
// A/B testing
// ---------------------------------------------------------------------------

/**
 * Two-proportion z-test.
 * Returns pValue, significance (p < 0.05), and winner.
 */
export function abTestSignificance(
  controlOpens: number,
  controlSent: number,
  variantOpens: number,
  variantSent: number
): { pValue: number; significant: boolean; winner: "control" | "variant" | "tie" } {
  if (controlSent === 0 || variantSent === 0) {
    return { pValue: 1, significant: false, winner: "tie" };
  }

  const p1 = controlOpens / controlSent;
  const p2 = variantOpens / variantSent;
  const pPool =
    (controlOpens + variantOpens) / (controlSent + variantSent);

  const se = Math.sqrt(
    pPool * (1 - pPool) * (1 / controlSent + 1 / variantSent)
  );

  if (se === 0) {
    return { pValue: 1, significant: false, winner: "tie" };
  }

  const z = Math.abs(p1 - p2) / se;

  // Approximate two-tailed p-value using standard normal CDF approximation
  const pValue = 2 * (1 - standardNormalCDF(z));

  const significant = pValue < 0.05;
  let winner: "control" | "variant" | "tie" = "tie";
  if (significant) {
    winner = p2 > p1 ? "variant" : "control";
  }

  return { pValue, significant, winner };
}

/**
 * Approximate the CDF of the standard normal distribution.
 * Uses Horner's method approximation (Abramowitz & Stegun 26.2.17).
 */
function standardNormalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 +
          t * (-1.821255978 +
            t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Minimum detectable effect (MDE) quick estimate.
 * MDE = 1.65 * sqrt(2 * baseRate * (1 - baseRate) / 100)
 */
export function minimumDetectableEffect(
  baseRate: number,
  power?: number,
  alpha?: number
): number {
  // Quick MDE estimate — uses simplified formula as specified
  void power;
  void alpha;
  return 1.65 * Math.sqrt(2 * baseRate * (1 - baseRate) / 100);
}

/**
 * Required sample size per variant.
 * Standard formula: n = 2 * ((z_alpha/2 + z_beta)^2 * p * (1-p)) / mde^2
 * Default power = 0.80, alpha = 0.05
 */
export function requiredSampleSize(
  baseRate: number,
  mde: number,
  power: number = 0.8,
  alpha: number = 0.05
): number {
  if (mde === 0) return Infinity;

  // z-scores for common values — use inverse normal approximation
  const zAlpha = inverseNormalApprox(1 - alpha / 2);
  const zBeta = inverseNormalApprox(power);

  const n =
    (2 * Math.pow(zAlpha + zBeta, 2) * baseRate * (1 - baseRate)) /
    Math.pow(mde, 2);

  return Math.ceil(n);
}

/**
 * Simple rational approximation for the inverse normal CDF (probit).
 * Accurate to ~3 decimal places for p in (0.001, 0.999).
 */
function inverseNormalApprox(p: number): number {
  // Beasley-Springer-Moro algorithm approximation
  const a = [0, -3.969683028665376e+01, 2.209460984245205e+02,
             -2.759285104469687e+02, 1.383577518672690e+02,
             -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [0, -5.447609879822406e+01, 1.615858368580409e+02,
             -1.556989798598866e+02, 6.680131188771972e+01,
             -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01,
             -2.400758277161838e+00, -2.549732539343734e+00,
              4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01,
             2.445134137142996e+00, 3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]!*q+c[1]!)*q+c[2]!)*q+c[3]!)*q+c[4]!)*q+c[5]!) /
           ((((d[0]!*q+d[1]!)*q+d[2]!)*q+d[3]!)*q+1);
  }

  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[1]!*r+a[2]!)*r+a[3]!)*r+a[4]!)*r+a[5]!)*r+a[6]!)*q /
           (((((b[1]!*r+b[2]!)*r+b[3]!)*r+b[4]!)*r+b[5]!)*r+1);
  }

  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]!*q+c[1]!)*q+c[2]!)*q+c[3]!)*q+c[4]!)*q+c[5]!) /
          ((((d[0]!*q+d[1]!)*q+d[2]!)*q+d[3]!)*q+1);
}

// ---------------------------------------------------------------------------
// Send time optimization
// ---------------------------------------------------------------------------

/**
 * Return the hour (0-23) with the highest open event count.
 */
export function bestSendHour(events: EmailEvent[]): number {
  const counts = new Array<number>(24).fill(0);
  for (const e of events) {
    if (e.type === "open") {
      const h = e.timestamp.getHours();
      counts[h] = (counts[h] ?? 0) + 1;
    }
  }
  return counts.indexOf(Math.max(...counts));
}

/**
 * Return the day of week (0=Sunday) with the highest open event count.
 */
export function bestSendDay(events: EmailEvent[]): number {
  const counts = new Array<number>(7).fill(0);
  for (const e of events) {
    if (e.type === "open") {
      const d = e.timestamp.getDay();
      counts[d] = (counts[d] ?? 0) + 1;
    }
  }
  return counts.indexOf(Math.max(...counts));
}

/**
 * Return the best day+hour combination as a SendTimeRecommendation.
 * Score is the fraction of opens that occurred in that day+hour slot.
 */
export function sendTimeRecommendation(
  events: EmailEvent[],
  timezone?: string
): SendTimeRecommendation {
  void timezone; // pure calculation — timezone is contextual metadata only

  const opens = events.filter((e) => e.type === "open");

  if (opens.length === 0) {
    return {
      dayOfWeek: 2,
      hour: 10,
      score: 0,
      reason:
        "No engagement data available. Defaulting to Tuesday at 10:00 AM, a widely cited baseline for email delivery.",
    };
  }

  // Build day+hour matrix
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    new Array<number>(24).fill(0)
  );

  for (const e of opens) {
    const day = e.timestamp.getDay();
    const hour = e.timestamp.getHours();
    const row = matrix[day];
    if (row !== undefined) {
      row[hour] = (row[hour] ?? 0) + 1;
    }
  }

  let bestDay = 0;
  let bestHour = 0;
  let bestCount = 0;

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const count = matrix[d]?.[h] ?? 0;
      if (count > bestCount) {
        bestCount = count;
        bestDay = d;
        bestHour = h;
      }
    }
  }

  const score = bestCount / opens.length;
  const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ];
  const ampm = bestHour < 12 ? "AM" : "PM";
  const displayHour = bestHour % 12 === 0 ? 12 : bestHour % 12;
  const reason = `${dayNames[bestDay]} at ${displayHour}:00 ${ampm} had the highest historical open rate (${Math.round(score * 100)}% of opens).`;

  return { dayOfWeek: bestDay, hour: bestHour, score, reason };
}

/**
 * Array of 24 open rates by hour.
 * Each element = opens in that hour / total opens (relative rate).
 */
export function hourlyEngagement(events: EmailEvent[]): number[] {
  const counts = new Array<number>(24).fill(0);
  let totalOpens = 0;

  for (const e of events) {
    if (e.type === "open") {
      const h = e.timestamp.getHours();
      counts[h] = (counts[h] ?? 0) + 1;
      totalOpens++;
    }
  }

  if (totalOpens === 0) return counts;
  return counts.map((c) => c / totalOpens);
}

/**
 * Array of 7 open rates by day of week.
 * Each element = opens on that day / total opens (relative rate).
 */
export function dailyEngagement(events: EmailEvent[]): number[] {
  const counts = new Array<number>(7).fill(0);
  let totalOpens = 0;

  for (const e of events) {
    if (e.type === "open") {
      const d = e.timestamp.getDay();
      counts[d] = (counts[d] ?? 0) + 1;
      totalOpens++;
    }
  }

  if (totalOpens === 0) return counts;
  return counts.map((c) => c / totalOpens);
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

const BENCHMARKS: Record<string, CampaignBenchmark> = {
  sports: {
    industry: "sports",
    avgOpenRate: 0.21,
    avgClickRate: 0.025,
    avgBounceRate: 0.008,
    avgUnsubRate: 0.002,
  },
  media: {
    industry: "media",
    avgOpenRate: 0.22,
    avgClickRate: 0.045,
    avgBounceRate: 0.004,
    avgUnsubRate: 0.001,
  },
  ecommerce: {
    industry: "ecommerce",
    avgOpenRate: 0.15,
    avgClickRate: 0.020,
    avgBounceRate: 0.005,
    avgUnsubRate: 0.003,
  },
  saas: {
    industry: "saas",
    avgOpenRate: 0.24,
    avgClickRate: 0.035,
    avgBounceRate: 0.006,
    avgUnsubRate: 0.0015,
  },
  general: {
    industry: "general",
    avgOpenRate: 0.18,
    avgClickRate: 0.025,
    avgBounceRate: 0.007,
    avgUnsubRate: 0.0025,
  },
};

export function industryBenchmark(
  industry: "sports" | "media" | "ecommerce" | "saas" | "general"
): CampaignBenchmark {
  return BENCHMARKS[industry]!;
}

/**
 * Compare campaign rates vs industry benchmark.
 * "at" = within 10% relative of benchmark value.
 */
export function benchmarkComparison(
  c: EmailCampaign,
  industry: string
): {
  openRate: "above" | "below" | "at";
  clickRate: "above" | "below" | "at";
  overall: "above" | "below" | "at";
} {
  const benchmark = BENCHMARKS[industry] ?? BENCHMARKS["general"]!;
  const or = openRate(c);
  const cr = clickRate(c);

  function compare(actual: number, target: number): "above" | "below" | "at" {
    const tolerance = target * 0.10;
    if (actual >= target - tolerance && actual <= target + tolerance) return "at";
    return actual > target ? "above" : "below";
  }

  const orResult = compare(or, benchmark.avgOpenRate);
  const crResult = compare(cr, benchmark.avgClickRate);

  // Overall: if both are above or one is above and none is below → above, etc.
  const scores: number[] = [orResult, crResult].map((r) =>
    r === "above" ? 1 : r === "at" ? 0 : -1
  );
  const sum = scores.reduce((a, b) => a + b, 0);
  const overall: "above" | "below" | "at" =
    sum > 0 ? "above" : sum < 0 ? "below" : "at";

  return { openRate: orResult, clickRate: crResult, overall };
}

/**
 * Performance score 0-100 weighted vs benchmarks.
 * Opens and clicks are equally weighted.
 */
export function performanceScore(
  c: EmailCampaign,
  industry: string
): number {
  const benchmark = BENCHMARKS[industry] ?? BENCHMARKS["general"]!;
  const or = openRate(c);
  const cr = clickRate(c);

  // Ratio vs benchmark, capped at 2x (200% of benchmark = perfect score)
  const orScore = clamp(or / benchmark.avgOpenRate, 0, 2) * 50;
  const crScore = clamp(cr / benchmark.avgClickRate, 0, 2) * 50;

  return clamp(orScore + crScore, 0, 100);
}

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

/**
 * Sports pick alert performance tracking.
 * engagementScore = (openRate * 0.4 + clickRate * 0.6) * 100, clamped [0, 100].
 */
export function pickAlertEngagement(
  opens: number,
  clicks: number,
  sent: number
): { openRate: number; clickRate: number; engagementScore: number } {
  const or = safeDivide(opens, sent);
  const cr = safeDivide(clicks, sent);
  const engagementScore = clamp((or * 0.4 + cr * 0.6) * 100, 0, 100);
  return { openRate: or, clickRate: cr, engagementScore };
}

/**
 * Recommend send hour for a pick alert.
 * Send 2 hours before game start if possible, otherwise at game start hour.
 */
export function optimalPickAlertTiming(gameStartHour: number): number {
  if (gameStartHour >= 2) return gameStartHour - 2;
  return gameStartHour;
}

/**
 * Count subscribers per tier.
 */
export function segmentByPickTier(
  subscribers: { tier: "free" | "pro" | "elite" }[]
): { free: number; pro: number; elite: number } {
  const result = { free: 0, pro: 0, elite: 0 };
  for (const s of subscribers) {
    result[s.tier]++;
  }
  return result;
}
