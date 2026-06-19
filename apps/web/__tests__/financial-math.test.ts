/**
 * Tests for lib/math/financial-math.ts — pure financial / TVM math.
 * Covers interest & growth, annuities & loans, NPV/IRR, bond pricing,
 * depreciation, SaaS finance, and risk-adjusted returns.
 */

import { describe, it, expect } from "vitest";
import {
  // interest & growth
  simpleInterest,
  compoundInterest,
  futureValue,
  presentValue,
  effectiveAnnualRate,
  cagr,
  // annuities & loans
  futureValueAnnuity,
  presentValueAnnuity,
  loanPayment,
  amortizationSchedule,
  remainingBalance,
  // NPV / IRR
  netPresentValue,
  internalRateOfReturn,
  paybackPeriod,
  profitabilityIndex,
  // bonds
  bondPrice,
  currentYield,
  yieldToMaturity,
  macaulayDuration,
  // depreciation
  straightLineDepreciation,
  decliningBalanceDepreciation,
  doubleDecliningSchedule,
  // SaaS finance
  monthlyRecurringRevenue,
  annualRecurringRevenue,
  customerLifetimeValue,
  paybackPeriodMonths,
  breakEvenSubscribers,
  // risk-adjusted returns
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
  volatility,
} from "@/lib/math/financial-math";

const EPS = 1e-6;

// ─────────────────────────────────────────────────────────────────────────────
// 1. Interest & growth
// ─────────────────────────────────────────────────────────────────────────────

describe("simpleInterest", () => {
  it("computes P*r*t", () => {
    expect(simpleInterest(1000, 0.05, 3)).toBeCloseTo(150, 9);
  });
  it("is zero with zero rate", () => {
    expect(simpleInterest(1000, 0, 3)).toBe(0);
  });
  it("is zero with zero periods", () => {
    expect(simpleInterest(1000, 0.05, 0)).toBe(0);
  });
  it("is zero with zero principal", () => {
    expect(simpleInterest(0, 0.05, 3)).toBe(0);
  });
  it("scales linearly in periods", () => {
    expect(simpleInterest(500, 0.1, 2)).toBeCloseTo(100, 9);
    expect(simpleInterest(500, 0.1, 4)).toBeCloseTo(200, 9);
  });
  it("handles negative rate (cost/discount)", () => {
    expect(simpleInterest(1000, -0.02, 5)).toBeCloseTo(-100, 9);
  });
  it("handles fractional periods", () => {
    expect(simpleInterest(1200, 0.1, 0.5)).toBeCloseTo(60, 9);
  });
});

describe("compoundInterest", () => {
  it("matches manual annual compounding calc", () => {
    // 1000 * 1.05^3 - 1000 = 157.625
    expect(compoundInterest(1000, 0.05, 3)).toBeCloseTo(157.625, 6);
  });
  it("defaults to annual compounding (1 per period)", () => {
    const explicit = compoundInterest(1000, 0.05, 3, 1);
    const implicit = compoundInterest(1000, 0.05, 3);
    expect(implicit).toBeCloseTo(explicit, 9);
  });
  it("returns interest only, not balance", () => {
    const interest = compoundInterest(2000, 0.1, 1);
    expect(interest).toBeCloseTo(200, 6);
  });
  it("monthly compounding earns more than annual", () => {
    const annual = compoundInterest(1000, 0.12, 1, 1);
    const monthly = compoundInterest(1000, 0.12, 1, 12);
    expect(monthly).toBeGreaterThan(annual);
    expect(monthly).toBeCloseTo(126.825, 2);
  });
  it("is zero with zero rate", () => {
    expect(compoundInterest(1000, 0, 5)).toBeCloseTo(0, 9);
  });
  it("is zero with zero periods", () => {
    expect(compoundInterest(1000, 0.05, 0)).toBeCloseTo(0, 9);
  });
  it("returns 0 for non-positive compoundingPerPeriod", () => {
    expect(compoundInterest(1000, 0.05, 3, 0)).toBe(0);
    expect(compoundInterest(1000, 0.05, 3, -2)).toBe(0);
  });
  it("daily compounding approaches continuous", () => {
    const daily = compoundInterest(1000, 0.05, 1, 365);
    const cont = 1000 * (Math.exp(0.05) - 1);
    expect(daily).toBeCloseTo(cont, 1);
  });
});

describe("futureValue", () => {
  it("computes P*(1+r)^t", () => {
    expect(futureValue(1000, 0.05, 3)).toBeCloseTo(1157.625, 6);
  });
  it("equals principal at zero periods", () => {
    expect(futureValue(1000, 0.05, 0)).toBeCloseTo(1000, 9);
  });
  it("equals principal at zero rate", () => {
    expect(futureValue(1000, 0, 10)).toBeCloseTo(1000, 9);
  });
  it("grows with periods", () => {
    expect(futureValue(100, 0.1, 5)).toBeGreaterThan(futureValue(100, 0.1, 4));
  });
  it("handles negative rate (decay)", () => {
    expect(futureValue(1000, -0.1, 2)).toBeCloseTo(810, 6);
  });
});

describe("presentValue", () => {
  it("computes FV/(1+r)^t", () => {
    expect(presentValue(1157.625, 0.05, 3)).toBeCloseTo(1000, 6);
  });
  it("equals FV at zero periods", () => {
    expect(presentValue(1000, 0.05, 0)).toBeCloseTo(1000, 9);
  });
  it("equals FV at zero rate", () => {
    expect(presentValue(1000, 0, 5)).toBeCloseTo(1000, 9);
  });
  it("FV/PV roundtrip recovers principal", () => {
    const fv = futureValue(1234.56, 0.07, 9);
    expect(presentValue(fv, 0.07, 9)).toBeCloseTo(1234.56, 6);
  });
  it("PV/FV roundtrip recovers future value", () => {
    const pv = presentValue(5000, 0.03, 4);
    expect(futureValue(pv, 0.03, 4)).toBeCloseTo(5000, 6);
  });
  it("PV is less than FV for positive rate", () => {
    expect(presentValue(1000, 0.08, 5)).toBeLessThan(1000);
  });
});

describe("effectiveAnnualRate", () => {
  it("monthly compounding of 12% nominal", () => {
    // (1 + 0.12/12)^12 - 1 = 0.126825...
    expect(effectiveAnnualRate(0.12, 12)).toBeCloseTo(0.126825, 5);
  });
  it("annual compounding equals nominal", () => {
    expect(effectiveAnnualRate(0.1, 1)).toBeCloseTo(0.1, 9);
  });
  it("quarterly compounding", () => {
    expect(effectiveAnnualRate(0.08, 4)).toBeCloseTo(0.082432, 5);
  });
  it("more compounding => higher EAR", () => {
    expect(effectiveAnnualRate(0.1, 12)).toBeGreaterThan(
      effectiveAnnualRate(0.1, 4),
    );
  });
  it("returns 0 for non-positive compounding", () => {
    expect(effectiveAnnualRate(0.1, 0)).toBe(0);
    expect(effectiveAnnualRate(0.1, -3)).toBe(0);
  });
  it("zero nominal => zero EAR", () => {
    expect(effectiveAnnualRate(0, 12)).toBeCloseTo(0, 9);
  });
});

describe("cagr", () => {
  it("computes (end/begin)^(1/years) - 1", () => {
    // doubling over 3 years
    expect(cagr(100, 200, 3)).toBeCloseTo(Math.pow(2, 1 / 3) - 1, 9);
  });
  it("returns 0 when begin is 0", () => {
    expect(cagr(0, 200, 3)).toBe(0);
  });
  it("returns 0 when years is 0", () => {
    expect(cagr(100, 200, 0)).toBe(0);
  });
  it("zero growth when end equals begin", () => {
    expect(cagr(150, 150, 5)).toBeCloseTo(0, 9);
  });
  it("negative for shrinking value", () => {
    expect(cagr(200, 100, 2)).toBeLessThan(0);
  });
  it("one year matches simple ratio", () => {
    expect(cagr(100, 110, 1)).toBeCloseTo(0.1, 9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Annuities & loans
// ─────────────────────────────────────────────────────────────────────────────

describe("futureValueAnnuity", () => {
  it("computes ordinary annuity FV", () => {
    // 100 * ((1.05^10 - 1)/0.05) = 1257.789...
    expect(futureValueAnnuity(100, 0.05, 10)).toBeCloseTo(1257.789, 2);
  });
  it("rate=0 => payment*periods", () => {
    expect(futureValueAnnuity(100, 0, 10)).toBeCloseTo(1000, 9);
  });
  it("single period equals one payment", () => {
    expect(futureValueAnnuity(250, 0.05, 1)).toBeCloseTo(250, 6);
  });
  it("zero periods => 0", () => {
    expect(futureValueAnnuity(100, 0.05, 0)).toBeCloseTo(0, 9);
  });
  it("FV annuity exceeds PV annuity for positive rate", () => {
    expect(futureValueAnnuity(100, 0.05, 10)).toBeGreaterThan(
      presentValueAnnuity(100, 0.05, 10),
    );
  });
});

describe("presentValueAnnuity", () => {
  it("computes ordinary annuity PV", () => {
    // 100 * (1 - 1.05^-10)/0.05 = 772.173...
    expect(presentValueAnnuity(100, 0.05, 10)).toBeCloseTo(772.173, 2);
  });
  it("rate=0 => payment*periods", () => {
    expect(presentValueAnnuity(100, 0, 10)).toBeCloseTo(1000, 9);
  });
  it("relates to FV annuity by discounting", () => {
    const pv = presentValueAnnuity(100, 0.05, 10);
    const fv = futureValueAnnuity(100, 0.05, 10);
    expect(fv).toBeCloseTo(pv * Math.pow(1.05, 10), 4);
  });
  it("zero periods => 0", () => {
    expect(presentValueAnnuity(100, 0.05, 0)).toBeCloseTo(0, 9);
  });
  it("single period discounts one payment", () => {
    expect(presentValueAnnuity(100, 0.05, 1)).toBeCloseTo(100 / 1.05, 6);
  });
});

describe("loanPayment", () => {
  it("computes amortizing payment", () => {
    // 10000 @ 1%/period over 12 => 888.49
    expect(loanPayment(10000, 0.01, 12)).toBeCloseTo(888.49, 1);
  });
  it("rate=0 => principal/periods", () => {
    expect(loanPayment(12000, 0, 12)).toBeCloseTo(1000, 9);
  });
  it("zero periods => 0", () => {
    expect(loanPayment(10000, 0.01, 0)).toBe(0);
  });
  it("payment * periods exceeds principal for positive rate", () => {
    const pmt = loanPayment(10000, 0.01, 12);
    expect(pmt * 12).toBeGreaterThan(10000);
  });
  it("payment is the annuity that has PV = principal", () => {
    const pmt = loanPayment(10000, 0.01, 12);
    expect(presentValueAnnuity(pmt, 0.01, 12)).toBeCloseTo(10000, 4);
  });
  it("higher rate => higher payment", () => {
    expect(loanPayment(10000, 0.02, 12)).toBeGreaterThan(
      loanPayment(10000, 0.01, 12),
    );
  });
});

describe("amortizationSchedule", () => {
  const schedule = amortizationSchedule(10000, 0.01, 12);

  it("has one row per period", () => {
    expect(schedule.length).toBe(12);
  });
  it("periods are 1-indexed and sequential", () => {
    expect(schedule[0]?.period).toBe(1);
    expect(schedule[11]?.period).toBe(12);
  });
  it("final balance is ~0", () => {
    expect(schedule[11]?.balance ?? -1).toBeCloseTo(0, 6);
  });
  it("each row's payment ~= principal + interest", () => {
    for (const row of schedule) {
      expect(row.payment).toBeCloseTo(row.principal + row.interest, 6);
    }
  });
  it("principal portions sum to the loan principal", () => {
    const totalPrincipal = schedule.reduce((s, r) => s + r.principal, 0);
    expect(totalPrincipal).toBeCloseTo(10000, 4);
  });
  it("interest decreases over the life of the loan", () => {
    expect(schedule[0]?.interest ?? 0).toBeGreaterThan(
      schedule[11]?.interest ?? Infinity,
    );
  });
  it("principal paid increases over the life of the loan", () => {
    expect(schedule[11]?.principal ?? 0).toBeGreaterThan(
      schedule[0]?.principal ?? Infinity,
    );
  });
  it("first interest equals principal * rate", () => {
    expect(schedule[0]?.interest ?? -1).toBeCloseTo(100, 6);
  });
  it("balance is monotonically decreasing", () => {
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i]?.balance ?? Infinity).toBeLessThanOrEqual(
        (schedule[i - 1]?.balance ?? -Infinity) + EPS,
      );
    }
  });
  it("handles rate=0 schedule with even principal", () => {
    const flat = amortizationSchedule(1200, 0, 12);
    expect(flat[0]?.interest).toBe(0);
    expect(flat[0]?.principal).toBeCloseTo(100, 9);
    expect(flat[11]?.balance ?? -1).toBeCloseTo(0, 9);
  });
  it("returns empty for zero periods", () => {
    expect(amortizationSchedule(1000, 0.01, 0)).toEqual([]);
  });
  it("returns empty for negative periods", () => {
    expect(amortizationSchedule(1000, 0.01, -5)).toEqual([]);
  });
});

describe("remainingBalance", () => {
  it("equals principal before any payment", () => {
    expect(remainingBalance(10000, 0.01, 12, 0)).toBeCloseTo(10000, 6);
  });
  it("is ~0 after all payments", () => {
    expect(remainingBalance(10000, 0.01, 12, 12)).toBeCloseTo(0, 6);
  });
  it("matches the amortization schedule mid-loan", () => {
    const schedule = amortizationSchedule(10000, 0.01, 12);
    const after6 = remainingBalance(10000, 0.01, 12, 6);
    expect(after6).toBeCloseTo(schedule[5]?.balance ?? -1, 4);
  });
  it("rate=0 reduces balance linearly", () => {
    expect(remainingBalance(1200, 0, 12, 6)).toBeCloseTo(600, 9);
  });
  it("clamps to 0 once over-paid", () => {
    expect(remainingBalance(10000, 0.01, 12, 20)).toBe(0);
  });
  it("returns 0 for zero total periods", () => {
    expect(remainingBalance(10000, 0.01, 0, 0)).toBe(0);
  });
  it("decreases as periodsPaid grows", () => {
    expect(remainingBalance(10000, 0.01, 12, 3)).toBeGreaterThan(
      remainingBalance(10000, 0.01, 12, 9),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. NPV / IRR
// ─────────────────────────────────────────────────────────────────────────────

describe("netPresentValue", () => {
  it("at rate=0 is the sum of cash flows", () => {
    expect(netPresentValue(0, [-100, 50, 50, 50])).toBeCloseTo(50, 9);
  });
  it("treats index 0 as t=0 (undiscounted)", () => {
    expect(netPresentValue(0.1, [100])).toBeCloseTo(100, 9);
  });
  it("discounts later flows more", () => {
    expect(netPresentValue(0.1, [0, 100])).toBeCloseTo(100 / 1.1, 6);
  });
  it("matches a manual two-period calc", () => {
    // -1000 + 600/1.1 + 600/1.21 = 41.32...
    expect(netPresentValue(0.1, [-1000, 600, 600])).toBeCloseTo(41.322, 2);
  });
  it("empty cash flows => 0", () => {
    expect(netPresentValue(0.1, [])).toBe(0);
  });
  it("higher discount rate lowers NPV of an investment", () => {
    expect(netPresentValue(0.2, [-1000, 600, 600])).toBeLessThan(
      netPresentValue(0.05, [-1000, 600, 600]),
    );
  });
  it("NPV at the IRR is ~0", () => {
    const flows = [-1000, 500, 400, 300, 200];
    const irr = internalRateOfReturn(flows);
    expect(netPresentValue(irr, flows)).toBeCloseTo(0, 5);
  });
});

describe("internalRateOfReturn", () => {
  it("simple [-100, 110] ≈ 0.10", () => {
    expect(internalRateOfReturn([-100, 110])).toBeCloseTo(0.1, 5);
  });
  it("recovers a known IRR", () => {
    // -1000 then 1331 over 3 yrs => 10%
    expect(internalRateOfReturn([-1000, 0, 0, 1331])).toBeCloseTo(0.1, 4);
  });
  it("zero net return => IRR ≈ 0", () => {
    expect(internalRateOfReturn([-100, 100])).toBeCloseTo(0, 5);
  });
  it("makes NPV vanish for a multi-period stream", () => {
    const flows = [-500, 200, 200, 200];
    const irr = internalRateOfReturn(flows);
    expect(netPresentValue(irr, flows)).toBeCloseTo(0, 5);
  });
  it("returns NaN when there is no sign change", () => {
    expect(Number.isNaN(internalRateOfReturn([100, 200, 300]))).toBe(true);
  });
  it("returns NaN for empty input", () => {
    expect(Number.isNaN(internalRateOfReturn([]))).toBe(true);
  });
  it("respects a custom guess and still converges", () => {
    expect(internalRateOfReturn([-100, 110], 0.5)).toBeCloseTo(0.1, 5);
  });
  it("handles negative IRR (loss)", () => {
    const irr = internalRateOfReturn([-1000, 500]);
    expect(irr).toBeLessThan(0);
    expect(irr).toBeCloseTo(-0.5, 4);
  });
});

describe("paybackPeriod", () => {
  it("computes a whole-period payback", () => {
    expect(paybackPeriod(300, [100, 100, 100])).toBeCloseTo(3, 9);
  });
  it("computes a fractional payback", () => {
    // recoup 250 from [100,100,100] => 2.5 periods
    expect(paybackPeriod(250, [100, 100, 100])).toBeCloseTo(2.5, 6);
  });
  it("returns Infinity when never recouped", () => {
    expect(paybackPeriod(1000, [100, 100, 100])).toBe(Infinity);
  });
  it("zero investment pays back immediately", () => {
    expect(paybackPeriod(0, [100])).toBe(0);
  });
  it("recoups within the first period", () => {
    expect(paybackPeriod(50, [100, 100])).toBeCloseTo(0.5, 6);
  });
  it("handles uneven cash flows", () => {
    // need 250: 100 (cum100) + 200 (cum300) => 1 + 150/200 = 1.75
    expect(paybackPeriod(250, [100, 200, 50])).toBeCloseTo(1.75, 6);
  });
  it("Infinity when cash flows are empty", () => {
    expect(paybackPeriod(100, [])).toBe(Infinity);
  });
});

describe("profitabilityIndex", () => {
  it("PV(inflows)/investment at rate=0 is sum/investment", () => {
    expect(profitabilityIndex(0, 1000, [500, 500, 500])).toBeCloseTo(1.5, 9);
  });
  it("PI > 1 indicates a value-adding project", () => {
    expect(profitabilityIndex(0.1, 1000, [600, 600])).toBeGreaterThan(1);
  });
  it("PI < 1 indicates a value-destroying project", () => {
    expect(profitabilityIndex(0.1, 1000, [200, 200])).toBeLessThan(1);
  });
  it("discounts inflows starting at t=1", () => {
    expect(profitabilityIndex(0.1, 100, [110])).toBeCloseTo(1, 6);
  });
  it("returns Infinity for zero investment", () => {
    expect(profitabilityIndex(0.1, 0, [100])).toBe(Infinity);
  });
  it("higher rate lowers PI", () => {
    expect(profitabilityIndex(0.2, 1000, [600, 600])).toBeLessThan(
      profitabilityIndex(0.05, 1000, [600, 600]),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Bond pricing
// ─────────────────────────────────────────────────────────────────────────────

describe("bondPrice", () => {
  it("prices at par when marketRate = couponRate", () => {
    expect(bondPrice(1000, 0.05, 0.05, 10)).toBeCloseTo(1000, 4);
  });
  it("trades at a discount when marketRate > couponRate", () => {
    expect(bondPrice(1000, 0.05, 0.08, 10)).toBeLessThan(1000);
  });
  it("trades at a premium when marketRate < couponRate", () => {
    expect(bondPrice(1000, 0.05, 0.03, 10)).toBeGreaterThan(1000);
  });
  it("zero coupon bond is PV of face only", () => {
    expect(bondPrice(1000, 0, 0.05, 10)).toBeCloseTo(
      1000 / Math.pow(1.05, 10),
      6,
    );
  });
  it("marketRate=0 => undiscounted coupons + face", () => {
    expect(bondPrice(1000, 0.05, 0, 10)).toBeCloseTo(1000 * 0.05 * 10 + 1000, 6);
  });
  it("single-period bond", () => {
    expect(bondPrice(1000, 0.05, 0.05, 1)).toBeCloseTo(1000, 6);
  });
  it("matches a manual two-period calc", () => {
    // coupons 50, 50 + face 1000 at 6%
    const expected = 50 / 1.06 + 1050 / 1.06 / 1.06;
    expect(bondPrice(1000, 0.05, 0.06, 2)).toBeCloseTo(expected, 6);
  });
});

describe("currentYield", () => {
  it("computes coupon/price", () => {
    expect(currentYield(50, 1000)).toBeCloseTo(0.05, 9);
  });
  it("rises when price falls", () => {
    expect(currentYield(50, 900)).toBeGreaterThan(currentYield(50, 1000));
  });
  it("returns 0 for zero price", () => {
    expect(currentYield(50, 0)).toBe(0);
  });
  it("zero coupon => zero yield", () => {
    expect(currentYield(0, 1000)).toBe(0);
  });
});

describe("yieldToMaturity", () => {
  it("at par the YTM equals the coupon rate", () => {
    const price = bondPrice(1000, 0.05, 0.05, 10);
    expect(yieldToMaturity(price, 1000, 0.05, 10)).toBeCloseTo(0.05, 4);
  });
  it("recovers a discount-bond yield", () => {
    const price = bondPrice(1000, 0.05, 0.08, 10);
    expect(yieldToMaturity(price, 1000, 0.05, 10)).toBeCloseTo(0.08, 4);
  });
  it("recovers a premium-bond yield", () => {
    const price = bondPrice(1000, 0.06, 0.03, 8);
    expect(yieldToMaturity(price, 1000, 0.06, 8)).toBeCloseTo(0.03, 4);
  });
  it("YTM round-trips back to price via bondPrice", () => {
    const price = 920;
    const ytm = yieldToMaturity(price, 1000, 0.05, 10);
    expect(bondPrice(1000, 0.05, ytm, 10)).toBeCloseTo(price, 3);
  });
  it("zero-coupon YTM", () => {
    const price = bondPrice(1000, 0, 0.04, 5);
    expect(yieldToMaturity(price, 1000, 0, 5)).toBeCloseTo(0.04, 4);
  });
  it("returns NaN for non-positive price", () => {
    expect(Number.isNaN(yieldToMaturity(0, 1000, 0.05, 10))).toBe(true);
  });
  it("returns NaN for non-positive periods", () => {
    expect(Number.isNaN(yieldToMaturity(900, 1000, 0.05, 0))).toBe(true);
  });
  it("honors a custom guess", () => {
    const price = bondPrice(1000, 0.05, 0.07, 10);
    expect(yieldToMaturity(price, 1000, 0.05, 10, 0.2)).toBeCloseTo(0.07, 4);
  });
});

describe("macaulayDuration", () => {
  it("zero-coupon bond duration equals maturity", () => {
    expect(macaulayDuration(1000, 0, 0.05, 5)).toBeCloseTo(5, 6);
  });
  it("coupon bond duration is less than maturity", () => {
    expect(macaulayDuration(1000, 0.05, 0.05, 10)).toBeLessThan(10);
  });
  it("duration is positive", () => {
    expect(macaulayDuration(1000, 0.05, 0.05, 10)).toBeGreaterThan(0);
  });
  it("single-period bond duration is 1", () => {
    expect(macaulayDuration(1000, 0.05, 0.05, 1)).toBeCloseTo(1, 6);
  });
  it("higher coupon shortens duration", () => {
    expect(macaulayDuration(1000, 0.08, 0.05, 10)).toBeLessThan(
      macaulayDuration(1000, 0.02, 0.05, 10),
    );
  });
  it("returns 0 for non-positive periods", () => {
    expect(macaulayDuration(1000, 0.05, 0.05, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Depreciation
// ─────────────────────────────────────────────────────────────────────────────

describe("straightLineDepreciation", () => {
  it("computes (cost - salvage)/life", () => {
    expect(straightLineDepreciation(10000, 1000, 9)).toBeCloseTo(1000, 9);
  });
  it("returns 0 when life is 0", () => {
    expect(straightLineDepreciation(10000, 1000, 0)).toBe(0);
  });
  it("zero salvage uses full cost", () => {
    expect(straightLineDepreciation(5000, 0, 5)).toBeCloseTo(1000, 9);
  });
  it("equals cost-salvage when life is 1", () => {
    expect(straightLineDepreciation(5000, 500, 1)).toBeCloseTo(4500, 9);
  });
  it("life * per-period reaches cost - salvage", () => {
    const perPeriod = straightLineDepreciation(8000, 800, 6);
    expect(perPeriod * 6).toBeCloseTo(7200, 6);
  });
});

describe("decliningBalanceDepreciation", () => {
  it("first-period expense is cost * rate", () => {
    expect(decliningBalanceDepreciation(10000, 0.2, 1)).toBeCloseTo(2000, 9);
  });
  it("second-period uses reduced book value", () => {
    expect(decliningBalanceDepreciation(10000, 0.2, 2)).toBeCloseTo(1600, 6);
  });
  it("third-period continues the decline", () => {
    expect(decliningBalanceDepreciation(10000, 0.2, 3)).toBeCloseTo(1280, 6);
  });
  it("expense decreases each period", () => {
    expect(decliningBalanceDepreciation(10000, 0.2, 1)).toBeGreaterThan(
      decliningBalanceDepreciation(10000, 0.2, 2),
    );
  });
  it("returns 0 for period < 1", () => {
    expect(decliningBalanceDepreciation(10000, 0.2, 0)).toBe(0);
  });
});

describe("doubleDecliningSchedule", () => {
  const schedule = doubleDecliningSchedule(10000, 1000, 5);

  it("has one entry per period of life", () => {
    expect(schedule.length).toBe(5);
  });
  it("first-period uses double the straight-line rate", () => {
    // rate = 2/5 = 0.4 => 10000 * 0.4 = 4000
    expect(schedule[0] ?? -1).toBeCloseTo(4000, 6);
  });
  it("never drives book value below salvage", () => {
    let book = 10000;
    for (const dep of schedule) {
      book -= dep;
      expect(book).toBeGreaterThanOrEqual(1000 - EPS);
    }
  });
  it("total depreciation does not exceed cost - salvage", () => {
    const total = schedule.reduce((s, d) => s + d, 0);
    expect(total).toBeLessThanOrEqual(9000 + EPS);
  });
  it("all entries are non-negative", () => {
    for (const dep of schedule) {
      expect(dep).toBeGreaterThanOrEqual(0);
    }
  });
  it("returns empty for non-positive life", () => {
    expect(doubleDecliningSchedule(10000, 1000, 0)).toEqual([]);
    expect(doubleDecliningSchedule(10000, 1000, -3)).toEqual([]);
  });
  it("clamps late-period depreciation to remaining depreciable base", () => {
    // book value should end at or above salvage
    let book = 10000;
    for (const dep of schedule) book -= dep;
    expect(book).toBeGreaterThanOrEqual(1000 - EPS);
  });
  it("handles a high salvage value gracefully", () => {
    const sched = doubleDecliningSchedule(10000, 9000, 5);
    const total = sched.reduce((s, d) => s + d, 0);
    expect(total).toBeLessThanOrEqual(1000 + EPS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Subscription / SaaS finance
// ─────────────────────────────────────────────────────────────────────────────

describe("monthlyRecurringRevenue", () => {
  it("computes subscribers * price", () => {
    expect(monthlyRecurringRevenue(100, 14.99)).toBeCloseTo(1499, 6);
  });
  it("zero subscribers => 0", () => {
    expect(monthlyRecurringRevenue(0, 14.99)).toBe(0);
  });
  it("scales with subscribers", () => {
    expect(monthlyRecurringRevenue(200, 24.99)).toBeCloseTo(4998, 6);
  });
});

describe("annualRecurringRevenue", () => {
  it("is MRR * 12", () => {
    expect(annualRecurringRevenue(1000)).toBe(12000);
  });
  it("zero MRR => 0", () => {
    expect(annualRecurringRevenue(0)).toBe(0);
  });
  it("composes with MRR", () => {
    const mrr = monthlyRecurringRevenue(100, 14.99);
    expect(annualRecurringRevenue(mrr)).toBeCloseTo(17988, 4);
  });
});

describe("customerLifetimeValue", () => {
  it("computes (revenue * margin)/churn", () => {
    expect(customerLifetimeValue(15, 0.8, 0.05)).toBeCloseTo(240, 6);
  });
  it("returns Infinity when churn is 0", () => {
    expect(customerLifetimeValue(15, 0.8, 0)).toBe(Infinity);
  });
  it("higher churn lowers LTV", () => {
    expect(customerLifetimeValue(15, 0.8, 0.1)).toBeLessThan(
      customerLifetimeValue(15, 0.8, 0.05),
    );
  });
  it("higher margin raises LTV", () => {
    expect(customerLifetimeValue(15, 0.9, 0.05)).toBeGreaterThan(
      customerLifetimeValue(15, 0.7, 0.05),
    );
  });
  it("zero revenue => 0 LTV", () => {
    expect(customerLifetimeValue(0, 0.8, 0.05)).toBe(0);
  });
});

describe("paybackPeriodMonths", () => {
  it("computes CAC / monthly margin", () => {
    expect(paybackPeriodMonths(100, 20)).toBeCloseTo(5, 9);
  });
  it("returns Infinity when monthly margin is 0", () => {
    expect(paybackPeriodMonths(100, 0)).toBe(Infinity);
  });
  it("returns Infinity for negative margin", () => {
    expect(paybackPeriodMonths(100, -5)).toBe(Infinity);
  });
  it("higher CAC lengthens payback", () => {
    expect(paybackPeriodMonths(200, 20)).toBeGreaterThan(
      paybackPeriodMonths(100, 20),
    );
  });
  it("zero CAC pays back immediately", () => {
    expect(paybackPeriodMonths(0, 20)).toBe(0);
  });
});

describe("breakEvenSubscribers", () => {
  it("computes fixed / (price - varcost)", () => {
    expect(breakEvenSubscribers(10000, 15, 5)).toBeCloseTo(1000, 9);
  });
  it("returns Infinity when margin is 0", () => {
    expect(breakEvenSubscribers(10000, 5, 5)).toBe(Infinity);
  });
  it("returns Infinity when margin is negative", () => {
    expect(breakEvenSubscribers(10000, 5, 8)).toBe(Infinity);
  });
  it("higher fixed costs raise break-even count", () => {
    expect(breakEvenSubscribers(20000, 15, 5)).toBeGreaterThan(
      breakEvenSubscribers(10000, 15, 5),
    );
  });
  it("wider margin lowers break-even count", () => {
    expect(breakEvenSubscribers(10000, 25, 5)).toBeLessThan(
      breakEvenSubscribers(10000, 15, 5),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Risk-adjusted returns
// ─────────────────────────────────────────────────────────────────────────────

describe("volatility", () => {
  it("computes sample standard deviation", () => {
    // values [2,4,4,4,5,5,7,9], sample sd = sqrt(32/7) ≈ 2.13809
    expect(volatility([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.13809, 4);
  });
  it("returns 0 for fewer than 2 returns", () => {
    expect(volatility([0.05])).toBe(0);
    expect(volatility([])).toBe(0);
  });
  it("returns 0 for constant returns", () => {
    expect(volatility([0.02, 0.02, 0.02])).toBeCloseTo(0, 9);
  });
  it("is symmetric under sign flip", () => {
    expect(volatility([1, 2, 3])).toBeCloseTo(volatility([-1, -2, -3]), 9);
  });
  it("grows with dispersion", () => {
    expect(volatility([0, 10])).toBeGreaterThan(volatility([4, 6]));
  });
});

describe("sharpeRatio", () => {
  it("computes (mean - rf)/stdev", () => {
    const returns = [0.1, 0.2, 0.15, 0.05];
    const m = (0.1 + 0.2 + 0.15 + 0.05) / 4;
    const sd = volatility(returns);
    expect(sharpeRatio(returns, 0.02)).toBeCloseTo((m - 0.02) / sd, 6);
  });
  it("defaults risk-free rate to 0", () => {
    const returns = [0.1, 0.2, 0.15, 0.05];
    expect(sharpeRatio(returns)).toBeCloseTo(
      sharpeRatio(returns, 0),
      9,
    );
  });
  it("returns 0 for fewer than 2 returns", () => {
    expect(sharpeRatio([0.1])).toBe(0);
    expect(sharpeRatio([])).toBe(0);
  });
  it("returns 0 when stdev is 0", () => {
    expect(sharpeRatio([0.05, 0.05, 0.05])).toBe(0);
  });
  it("a higher risk-free rate lowers Sharpe", () => {
    const returns = [0.1, 0.2, 0.15, 0.05];
    expect(sharpeRatio(returns, 0.05)).toBeLessThan(sharpeRatio(returns, 0));
  });
  it("is negative when mean return < risk-free rate", () => {
    expect(sharpeRatio([0.01, 0.02, 0.03], 0.1)).toBeLessThan(0);
  });
});

describe("sortinoRatio", () => {
  it("returns 0 for fewer than 2 returns", () => {
    expect(sortinoRatio([0.1])).toBe(0);
    expect(sortinoRatio([])).toBe(0);
  });
  it("returns 0 when there is no downside deviation", () => {
    // all returns >= target => no downside
    expect(sortinoRatio([0.05, 0.1, 0.2], 0)).toBe(0);
  });
  it("computes a positive ratio with some downside", () => {
    const r = sortinoRatio([0.1, -0.05, 0.2, -0.02], 0);
    expect(Number.isFinite(r)).toBe(true);
  });
  it("only penalizes downside (>= Sharpe-style when mean positive)", () => {
    const returns = [0.1, -0.1, 0.2, -0.05];
    const sortino = sortinoRatio(returns, 0);
    const sharpe = sharpeRatio(returns, 0);
    expect(sortino).toBeGreaterThan(sharpe);
  });
  it("defaults target to 0", () => {
    const returns = [0.1, -0.05, 0.2, -0.02];
    expect(sortinoRatio(returns)).toBeCloseTo(sortinoRatio(returns, 0), 9);
  });
  it("higher target lowers the ratio", () => {
    const returns = [0.1, -0.05, 0.2, -0.02];
    expect(sortinoRatio(returns, 0.05)).toBeLessThan(sortinoRatio(returns, 0));
  });
});

describe("maxDrawdown", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(maxDrawdown([100])).toBe(0);
    expect(maxDrawdown([])).toBe(0);
  });
  it("returns 0 for a monotonically rising curve", () => {
    expect(maxDrawdown([100, 110, 120, 130])).toBe(0);
  });
  it("computes a simple peak-to-trough decline", () => {
    // peak 100 -> trough 80 => 20%
    expect(maxDrawdown([100, 80])).toBeCloseTo(0.2, 9);
  });
  it("finds the largest of several drawdowns", () => {
    // peak 100 -> 90 (10%), recover to 120 -> 60 (50%)
    expect(maxDrawdown([100, 90, 120, 60, 80])).toBeCloseTo(0.5, 9);
  });
  it("uses the running peak, not the global start", () => {
    expect(maxDrawdown([50, 100, 75])).toBeCloseTo(0.25, 9);
  });
  it("a full wipeout is a 100% drawdown", () => {
    expect(maxDrawdown([100, 0])).toBeCloseTo(1, 9);
  });
  it("ignores recovery above prior peak", () => {
    expect(maxDrawdown([100, 80, 200])).toBeCloseTo(0.2, 9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-cutting integration checks
// ─────────────────────────────────────────────────────────────────────────────

describe("integration: SaaS revenue modeling", () => {
  it("MRR -> ARR -> LTV pipeline is internally consistent", () => {
    const mrr = monthlyRecurringRevenue(500, 14.99);
    expect(annualRecurringRevenue(mrr)).toBeCloseTo(mrr * 12, 6);
    const ltv = customerLifetimeValue(14.99, 0.85, 0.04);
    expect(ltv).toBeGreaterThan(0);
    expect(Number.isFinite(ltv)).toBe(true);
  });
});

describe("integration: bond pricing and YTM are inverses", () => {
  it("price(rate) and ytm(price) round-trip", () => {
    for (const rate of [0.03, 0.05, 0.07, 0.09]) {
      const price = bondPrice(1000, 0.06, rate, 12);
      expect(yieldToMaturity(price, 1000, 0.06, 12)).toBeCloseTo(rate, 4);
    }
  });
});

describe("integration: NPV and IRR agree", () => {
  it("NPV at IRR is ~0 across several projects", () => {
    const projects = [
      [-1000, 500, 400, 300, 200],
      [-2000, 800, 800, 800],
      [-100, 110],
    ];
    for (const flows of projects) {
      const irr = internalRateOfReturn(flows);
      expect(netPresentValue(irr, flows)).toBeCloseTo(0, 4);
    }
  });
});
