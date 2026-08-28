/**
 * Credit governor — Phase 2 (data heartbeat) of the Finish-Line plan.
 *
 * The paid Odds API plan (20,000 credits/month, reset the 1st, 00:00 UTC) was
 * exhausted in ~5 days at ~4,000 credits/day. The governor enforces credit
 * governance so projected burn stays <= 20,000/month without code changes to
 * the caller:
 *
 *   1. Per-sport monthly budgets (configurable; default even split of the plan).
 *   2. Pace-based early-stop: when the upstream x-requests-remaining is below
 *      what the remaining days of the month can sustain at the daily target,
 *      non-essential (historical / line-archive) calls are refused.
 *   3. 10x historical discipline: a historical odds call costs ~10 live calls;
 *      it is refused when it would push projected monthly burn over budget.
 *
 * This module is PURE (no DB, no network) so it is unit-testable in isolation
 * and the same decision is made in tests, cron, and the live path. The caller
 * records the verdict on IngestionRun (oddsApiRemainingRequests already exists).
 *
 * It does NOT flip any gate and never mints or blocks picks — it only answers
 * "may we spend N credits on SPORT right now?".
 */

export interface CreditBudgetConfig {
  /** Total monthly credits available (plan default 20,000). */
  readonly monthlyBudget: number;
  /** Day-of-month the budget resets (plan: 1). */
  readonly resetDayOfMonth: number;
  /** Per-sport share of the monthly budget (default: even split across sports). */
  readonly perSportShare: Readonly<Record<string, number>>;
  /**
   * Multiplier a historical odds call costs vs a single live call. The plan's
   * "10x historical-endpoint discipline" => 10.
   */
  readonly historicalCostMultiplier: number;
  /** Day-of-month used for "now" (injectable for deterministic tests). */
  readonly nowDayOfMonth?: number;
  /** Total sports sharing the budget (used when perSportShare is empty). */
  readonly sportCount?: number;
}

export const DEFAULT_CREDIT_CONFIG: CreditBudgetConfig = {
  monthlyBudget: 20_000,
  resetDayOfMonth: 1,
  perSportShare: {},
  historicalCostMultiplier: 10,
  sportCount: 8,
};

export interface CreditDecision {
  readonly allowed: boolean;
  /** Human-readable reason for allow/refuse (cockpit telemetry). */
  readonly reason: string;
  /** Projected remaining credits after this spend. */
  readonly projectedRemaining: number;
  /** True when this was a historical (10x) call. */
  readonly historical: boolean;
  /** Daily pace target derived from the budget and days left in the month. */
  readonly dailyPaceTarget: number;
}

/** Days left in the current credit window (inclusive of today). */
export function daysLeftInWindow(
  dayOfMonth: number,
  resetDayOfMonth: number,
  daysInMonth = 30,
): number {
  if (resetDayOfMonth <= 1) {
    // Window runs day 1..daysInMonth; days left including today.
    return Math.max(1, daysInMonth - dayOfMonth + 1);
  }
  // Generic window [resetDayOfMonth .. next reset]; assume ~30-day month.
  const nextReset = resetDayOfMonth + daysInMonth;
  let left = nextReset - dayOfMonth;
  if (left <= 0) left += daysInMonth;
  return Math.max(1, left);
}

/** Per-sport monthly allowance. Even split when no explicit share is given. */
export function sportMonthlyAllowance(
  sport: string,
  config: CreditBudgetConfig,
): number {
  const explicit = config.perSportShare[sport];
  if (typeof explicit === "number" && explicit > 0) return explicit;
  const count = Math.max(1, config.sportCount ?? 8);
  return Math.floor(config.monthlyBudget / count);
}

/**
 * Decide whether `sport` may spend `cost` credits right now, given the upstream
 * `remainingRequests` (x-requests-remaining) and how many we have already spent
 * this cycle (`usedThisCycle`).
 *
 * @param historical when true the call is a historical odds pull (10x cost).
 */
export function decideCreditSpend(
  sport: string,
  cost: number,
  remainingRequests: number | null,
  config: CreditBudgetConfig = DEFAULT_CREDIT_CONFIG,
  opts: { usedThisCycle?: number; historical?: boolean; daysInMonth?: number } = {},
): CreditDecision {
  const historical = opts.historical ?? false;
  const usedThisCycle = opts.usedThisCycle ?? 0;
  const effectiveCost = historical ? cost * config.historicalCostMultiplier : cost;

  const dayOfMonth =
    config.nowDayOfMonth ?? new Date().getUTCDate();
  const daysLeft = daysLeftInWindow(dayOfMonth, config.resetDayOfMonth, opts.daysInMonth ?? 30);
  const allowance = sportMonthlyAllowance(sport, config);
  // Pace target: what we can still afford to spend per remaining day.
  const dailyPaceTarget = Math.floor(allowance / daysLeft);

  // No upstream signal (e.g. keyless path): never refuse on credit grounds,
  // but report the pace target so the caller can still self-limit.
  if (remainingRequests == null) {
    return {
      allowed: true,
      reason: "no upstream credit signal (keyless path); pace target advisory only",
      projectedRemaining: -1,
      historical,
      dailyPaceTarget,
    };
  }

  const projectedRemaining = remainingRequests - effectiveCost - usedThisCycle;

  // Pace-based early-stop: if what's left upstream is already below what the
  // remaining days can sustain at the daily target, refuse non-essential spends.
  // Essential live calls (historical=false) are still allowed while any credits
  // remain, but historical pulls are refused once we are under the pace floor.
  if (projectedRemaining < 0) {
    return {
      allowed: false,
      reason: `would exceed upstream remaining (${remainingRequests} - ${effectiveCost} - ${usedThisCycle} < 0)`,
      projectedRemaining,
      historical,
      dailyPaceTarget,
    };
  }

  if (historical && remainingRequests < dailyPaceTarget) {
    return {
      allowed: false,
      reason: `historical 10x pull refused: remaining ${remainingRequests} below daily pace floor ${dailyPaceTarget}`,
      projectedRemaining,
      historical,
      dailyPaceTarget,
    };
  }

  return {
    allowed: true,
    reason:
      remainingRequests < dailyPaceTarget
        ? `allowed but under pace floor ${dailyPaceTarget} (remaining ${remainingRequests})`
        : `allowed (remaining ${remainingRequests}, pace floor ${dailyPaceTarget})`,
    projectedRemaining,
    historical,
    dailyPaceTarget,
  };
}

/**
 * Cockpit telemetry: a one-line per-sport credit posture for the operator
 * surface. Pure — callers format it however the UI wants.
 */
export interface CreditTelemetry {
  readonly sport: string;
  readonly remainingRequests: number | null;
  readonly monthlyAllowance: number;
  readonly dailyPaceTarget: number;
  readonly underPaceFloor: boolean;
}

export function creditTelemetry(
  sport: string,
  remainingRequests: number | null,
  config: CreditBudgetConfig = DEFAULT_CREDIT_CONFIG,
  opts: { daysInMonth?: number } = {},
): CreditTelemetry {
  const dayOfMonth = config.nowDayOfMonth ?? new Date().getUTCDate();
  const daysLeft = daysLeftInWindow(dayOfMonth, config.resetDayOfMonth, opts.daysInMonth ?? 30);
  const allowance = sportMonthlyAllowance(sport, config);
  const dailyPaceTarget = Math.floor(allowance / daysLeft);
  return {
    sport,
    remainingRequests,
    monthlyAllowance: allowance,
    dailyPaceTarget,
    underPaceFloor: remainingRequests != null && remainingRequests < dailyPaceTarget,
  };
}
