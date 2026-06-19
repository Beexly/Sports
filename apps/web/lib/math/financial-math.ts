/**
 * Pure TypeScript financial / time-value-of-money math for the
 * Galaxy Sports Edge platform.
 *
 * Useful for subscription revenue modeling (MRR/ARR/LTV), bankroll
 * projection, and general capital-budgeting analysis. No npm
 * dependencies — Node/standard-library math only. No `any` types.
 *
 * Conventions:
 *  - `rate` is a per-period rate expressed as a decimal (0.05 = 5%).
 *  - "interest" functions return interest *earned*, not the ending balance,
 *    unless the name says otherwise.
 *  - Annuities are ordinary (payments at the end of each period) unless noted.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Interest & growth
// ─────────────────────────────────────────────────────────────────────────────

/** Simple interest earned: P * r * t. */
export function simpleInterest(
  principal: number,
  rate: number,
  periods: number,
): number {
  return principal * rate * periods;
}

/**
 * Compound interest *earned* (not the ending balance).
 * @param compoundingPerPeriod number of compounding events per period (default 1)
 * @returns ending balance minus principal
 */
export function compoundInterest(
  principal: number,
  rate: number,
  periods: number,
  compoundingPerPeriod: number = 1,
): number {
  if (compoundingPerPeriod <= 0) return 0;
  const balance =
    principal *
    Math.pow(
      1 + rate / compoundingPerPeriod,
      compoundingPerPeriod * periods,
    );
  return balance - principal;
}

/** Future value of a lump sum: P * (1 + r)^t. */
export function futureValue(
  principal: number,
  rate: number,
  periods: number,
): number {
  return principal * Math.pow(1 + rate, periods);
}

/** Present value of a lump sum: FV / (1 + r)^t. */
export function presentValue(
  futureValue: number,
  rate: number,
  periods: number,
): number {
  return futureValue / Math.pow(1 + rate, periods);
}

/** Effective annual rate from a nominal rate: (1 + r/n)^n - 1. */
export function effectiveAnnualRate(
  nominalRate: number,
  compoundingPerYear: number,
): number {
  if (compoundingPerYear <= 0) return 0;
  return Math.pow(1 + nominalRate / compoundingPerYear, compoundingPerYear) - 1;
}

/**
 * Compound annual growth rate: (end/begin)^(1/years) - 1.
 * Returns 0 if begin is 0 or years is 0 (undefined growth).
 */
export function cagr(
  beginValue: number,
  endValue: number,
  years: number,
): number {
  if (beginValue === 0 || years === 0) return 0;
  return Math.pow(endValue / beginValue, 1 / years) - 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Annuities & loans
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Future value of an ordinary annuity.
 * @returns payment * [((1+r)^n - 1) / r]; if rate is 0, payment * periods.
 */
export function futureValueAnnuity(
  payment: number,
  rate: number,
  periods: number,
): number {
  if (rate === 0) return payment * periods;
  return payment * ((Math.pow(1 + rate, periods) - 1) / rate);
}

/**
 * Present value of an ordinary annuity.
 * @returns payment * [(1 - (1+r)^-n) / r]; if rate is 0, payment * periods.
 */
export function presentValueAnnuity(
  payment: number,
  rate: number,
  periods: number,
): number {
  if (rate === 0) return payment * periods;
  return payment * ((1 - Math.pow(1 + rate, -periods)) / rate);
}

/**
 * Level amortizing payment per period on a fully-amortizing loan.
 * @returns P * [r / (1 - (1+r)^-n)]; if rate is 0, principal / periods.
 */
export function loanPayment(
  principal: number,
  rate: number,
  periods: number,
): number {
  if (periods === 0) return 0;
  if (rate === 0) return principal / periods;
  return (principal * rate) / (1 - Math.pow(1 + rate, -periods));
}

export interface AmortizationRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

/**
 * Full amortization schedule for a fully-amortizing loan.
 * The final row's balance is snapped to exactly 0 to absorb rounding drift.
 */
export function amortizationSchedule(
  principal: number,
  rate: number,
  periods: number,
): AmortizationRow[] {
  const schedule: AmortizationRow[] = [];
  if (periods <= 0) return schedule;

  const payment = loanPayment(principal, rate, periods);
  let balance = principal;

  for (let period = 1; period <= periods; period++) {
    const interest = balance * rate;
    let principalPaid = payment - interest;
    let endingBalance = balance - principalPaid;

    // Snap the final period to zero to absorb floating-point drift.
    if (period === periods) {
      principalPaid = balance;
      endingBalance = 0;
    }

    schedule.push({
      period,
      payment: interest + principalPaid,
      principal: principalPaid,
      interest,
      balance: endingBalance,
    });

    balance = endingBalance;
  }

  return schedule;
}

/**
 * Outstanding balance after `periodsPaid` payments have been made.
 * @returns remaining principal; 0 once the loan is fully paid.
 */
export function remainingBalance(
  principal: number,
  rate: number,
  totalPeriods: number,
  periodsPaid: number,
): number {
  if (totalPeriods <= 0) return 0;
  if (periodsPaid >= totalPeriods) return 0;
  if (periodsPaid <= 0) return principal;

  if (rate === 0) {
    const payment = principal / totalPeriods;
    return Math.max(0, principal - payment * periodsPaid);
  }

  const payment = loanPayment(principal, rate, totalPeriods);
  const grown = principal * Math.pow(1 + rate, periodsPaid);
  const paid = payment * ((Math.pow(1 + rate, periodsPaid) - 1) / rate);
  return Math.max(0, grown - paid);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. NPV / IRR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Net present value. cashFlows[0] occurs at t=0 (undiscounted), cashFlows[1]
 * at t=1, and so on.
 */
export function netPresentValue(rate: number, cashFlows: number[]): number {
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += (cashFlows[t] ?? 0) / Math.pow(1 + rate, t);
  }
  return npv;
}

/**
 * Internal rate of return — the rate at which NPV is zero.
 * Tries Newton-Raphson, falling back to bisection if Newton diverges.
 * @returns the IRR as a decimal, or NaN if no root is found.
 */
export function internalRateOfReturn(
  cashFlows: number[],
  guess: number = 0.1,
  maxIter: number = 100,
  tolerance: number = 1e-7,
): number {
  if (cashFlows.length === 0) return NaN;

  const npvAt = (rate: number): number => netPresentValue(rate, cashFlows);
  const npvDeriv = (rate: number): number => {
    let d = 0;
    for (let t = 1; t < cashFlows.length; t++) {
      d += (-t * (cashFlows[t] ?? 0)) / Math.pow(1 + rate, t + 1);
    }
    return d;
  };

  // Newton-Raphson.
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    const value = npvAt(rate);
    if (Math.abs(value) < tolerance) return rate;
    const deriv = npvDeriv(rate);
    if (deriv === 0 || !Number.isFinite(deriv)) break;
    const next = rate - value / deriv;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - rate) < tolerance) return next;
    rate = next;
  }

  // Bisection fallback — scan for a sign change over a wide bracket.
  let low = -0.9999;
  let high = 10;
  let fLow = npvAt(low);
  let fHigh = npvAt(high);
  if (!Number.isFinite(fLow) || !Number.isFinite(fHigh)) return NaN;
  if (fLow * fHigh > 0) return NaN; // no sign change → no bracketed root

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const fMid = npvAt(mid);
    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) return mid;
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return NaN;
}

/**
 * Payback period — fractional number of periods to recoup an investment.
 * @param initialInvestment positive magnitude of the upfront outlay
 * @param cashFlows inflows for periods 1, 2, 3, …
 * @returns fractional periods, or Infinity if never recouped.
 */
export function paybackPeriod(
  initialInvestment: number,
  cashFlows: number[],
): number {
  if (initialInvestment <= 0) return 0;
  let cumulative = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    const flow = cashFlows[t] ?? 0;
    const prior = cumulative;
    cumulative += flow;
    if (cumulative >= initialInvestment) {
      const needed = initialInvestment - prior;
      const fraction = flow > 0 ? needed / flow : 0;
      return t + fraction;
    }
  }
  return Infinity;
}

/**
 * Profitability index: PV of future inflows / initial investment.
 * @param cashFlows inflows for periods 1, 2, 3, …
 */
export function profitabilityIndex(
  rate: number,
  initialInvestment: number,
  cashFlows: number[],
): number {
  if (initialInvestment === 0) return Infinity;
  let pvInflows = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    pvInflows += (cashFlows[t] ?? 0) / Math.pow(1 + rate, t + 1);
  }
  return pvInflows / initialInvestment;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Bond pricing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Price of a standard coupon bond = PV(coupons) + PV(face value).
 * @param couponRate per-period coupon rate (decimal)
 * @param marketRate per-period market/discount rate (decimal)
 */
export function bondPrice(
  faceValue: number,
  couponRate: number,
  marketRate: number,
  periods: number,
): number {
  const coupon = faceValue * couponRate;
  const pvCoupons =
    marketRate === 0
      ? coupon * periods
      : coupon * ((1 - Math.pow(1 + marketRate, -periods)) / marketRate);
  const pvFace = faceValue / Math.pow(1 + marketRate, periods);
  return pvCoupons + pvFace;
}

/** Current yield: annual coupon / price. Returns 0 if price is 0. */
export function currentYield(annualCoupon: number, price: number): number {
  if (price === 0) return 0;
  return annualCoupon / price;
}

/**
 * Yield to maturity — the per-period market rate that makes bondPrice equal
 * the observed price. Solved by bisection over a wide bracket.
 * @returns the per-period YTM, or NaN if no root is bracketed.
 */
export function yieldToMaturity(
  price: number,
  faceValue: number,
  couponRate: number,
  periods: number,
  guess: number = 0.05,
): number {
  if (periods <= 0 || price <= 0) return NaN;

  const f = (rate: number): number =>
    bondPrice(faceValue, couponRate, rate, periods) - price;

  // Establish a bracket. Start near the guess and widen until signs differ.
  let low = -0.9999;
  let high = Math.max(1, guess * 2 + 1);
  let fLow = f(low);
  let fHigh = f(high);

  // Widen the upper bound if both ends share a sign.
  let expand = 0;
  while (fLow * fHigh > 0 && expand < 60) {
    high *= 1.5;
    fHigh = f(high);
    expand++;
  }
  if (fLow * fHigh > 0) return NaN;

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < 1e-9 || (high - low) / 2 < 1e-10) return mid;
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return (low + high) / 2;
}

/**
 * Macaulay duration — the present-value-weighted average time (in periods)
 * to the bond's cash flows.
 */
export function macaulayDuration(
  faceValue: number,
  couponRate: number,
  marketRate: number,
  periods: number,
): number {
  if (periods <= 0) return 0;
  const coupon = faceValue * couponRate;

  let weightedPv = 0;
  let totalPv = 0;
  for (let t = 1; t <= periods; t++) {
    const cashFlow = t === periods ? coupon + faceValue : coupon;
    const pv = cashFlow / Math.pow(1 + marketRate, t);
    weightedPv += t * pv;
    totalPv += pv;
  }

  if (totalPv === 0) return 0;
  return weightedPv / totalPv;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Depreciation
// ─────────────────────────────────────────────────────────────────────────────

/** Straight-line depreciation per period. Returns 0 if life is 0. */
export function straightLineDepreciation(
  cost: number,
  salvage: number,
  life: number,
): number {
  if (life === 0) return 0;
  return (cost - salvage) / life;
}

/**
 * Declining-balance depreciation expense for a single period (1-indexed).
 * Book value at the start of `period` is cost * (1 - rate)^(period - 1).
 */
export function decliningBalanceDepreciation(
  cost: number,
  rate: number,
  period: number,
): number {
  if (period < 1) return 0;
  const beginBookValue = cost * Math.pow(1 - rate, period - 1);
  return beginBookValue * rate;
}

/**
 * Double-declining-balance depreciation schedule, one entry per period.
 * Expense never drives book value below salvage; any remaining write-down is
 * clamped so the cumulative depreciation tops out at (cost - salvage).
 */
export function doubleDecliningSchedule(
  cost: number,
  salvage: number,
  life: number,
): number[] {
  const schedule: number[] = [];
  if (life <= 0) return schedule;

  const rate = 2 / life;
  let bookValue = cost;

  for (let period = 0; period < life; period++) {
    let depreciation = bookValue * rate;
    // Never depreciate below salvage value.
    if (bookValue - depreciation < salvage) {
      depreciation = Math.max(0, bookValue - salvage);
    }
    schedule.push(depreciation);
    bookValue -= depreciation;
  }

  return schedule;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Subscription / SaaS finance
// ─────────────────────────────────────────────────────────────────────────────

/** Monthly recurring revenue: subscribers * average price. */
export function monthlyRecurringRevenue(
  subscribers: number,
  avgPrice: number,
): number {
  return subscribers * avgPrice;
}

/** Annual recurring revenue: MRR * 12. */
export function annualRecurringRevenue(mrr: number): number {
  return mrr * 12;
}

/**
 * Customer lifetime value: (avgRevenue * grossMargin) / churnRate.
 * @returns Infinity if churnRate is 0 (customers never leave).
 */
export function customerLifetimeValue(
  avgRevenue: number,
  grossMargin: number,
  churnRate: number,
): number {
  if (churnRate === 0) return Infinity;
  return (avgRevenue * grossMargin) / churnRate;
}

/**
 * CAC payback in months: CAC / monthly gross-margin contribution per customer.
 * @returns Infinity if the monthly margin is 0 or negative.
 */
export function paybackPeriodMonths(
  cac: number,
  monthlyMarginPerCustomer: number,
): number {
  if (monthlyMarginPerCustomer <= 0) return Infinity;
  return cac / monthlyMarginPerCustomer;
}

/**
 * Break-even subscriber count: fixedCosts / (price - variableCostPerSub).
 * @returns Infinity if the per-sub contribution margin is 0 or negative.
 */
export function breakEvenSubscribers(
  fixedCosts: number,
  pricePerSub: number,
  variableCostPerSub: number,
): number {
  const margin = pricePerSub - variableCostPerSub;
  if (margin <= 0) return Infinity;
  return fixedCosts / margin;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Risk-adjusted returns
// ─────────────────────────────────────────────────────────────────────────────

/** Arithmetic mean of an array. Returns 0 for an empty array. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
  }
  return sum / values.length;
}

/**
 * Sample standard deviation (n-1 denominator) of period returns.
 * Returns 0 if fewer than 2 observations.
 */
export function volatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  const m = mean(returns);
  let sumSq = 0;
  for (let i = 0; i < returns.length; i++) {
    const diff = (returns[i] ?? 0) - m;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / (returns.length - 1));
}

/**
 * Sharpe ratio: (mean excess return) / standard deviation.
 * @returns 0 if fewer than 2 returns or the deviation is 0.
 */
export function sharpeRatio(
  returns: number[],
  riskFreeRate: number = 0,
): number {
  if (returns.length < 2) return 0;
  const stdev = volatility(returns);
  if (stdev < 1e-12) return 0;
  return (mean(returns) - riskFreeRate) / stdev;
}

/**
 * Sortino ratio: (mean - target) / downside deviation, where downside
 * deviation only penalizes returns below the target.
 * @returns 0 if fewer than 2 returns or there is no downside deviation.
 */
export function sortinoRatio(
  returns: number[],
  targetReturn: number = 0,
): number {
  if (returns.length < 2) return 0;

  let sumSqDownside = 0;
  for (let i = 0; i < returns.length; i++) {
    const r = returns[i] ?? 0;
    if (r < targetReturn) {
      const diff = r - targetReturn;
      sumSqDownside += diff * diff;
    }
  }
  const downsideDeviation = Math.sqrt(sumSqDownside / returns.length);
  if (downsideDeviation < 1e-12) return 0;
  return (mean(returns) - targetReturn) / downsideDeviation;
}

/**
 * Maximum drawdown — the largest peak-to-trough decline in an equity curve,
 * expressed as a positive fraction (0.2 = a 20% drawdown).
 * @returns 0 if fewer than 2 points.
 */
export function maxDrawdown(equityCurve: number[]): number {
  if (equityCurve.length < 2) return 0;
  let peak = equityCurve[0] ?? 0;
  let maxDd = 0;
  for (let i = 1; i < equityCurve.length; i++) {
    const value = equityCurve[i] ?? 0;
    if (value > peak) {
      peak = value;
    } else if (peak > 0) {
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDd) maxDd = drawdown;
    }
  }
  return maxDd;
}
