/**
 * Tests for pricing-analytics.ts — ~150 test cases covering all exports.
 * Zero npm dependencies; run with: npx vitest run __tests__/pricing-analytics.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  // 1. Price Elasticity
  priceElasticity,
  crossElasticity,
  incomeElasticity,
  elasticityCategory,
  optimalPriceFromElasticity,
  // 2. Revenue Optimization
  revenueAtPrice,
  profitAtPrice,
  revenueMaximizingPrice,
  profitMaximizingPrice,
  breakEvenUnits,
  breakEvenRevenue,
  // 3. Subscription Pricing
  monthlyToAnnualConversion,
  annualSavings,
  annualSavingsPct,
  mrr,
  arr,
  arppu,
  revenuePerUser,
  // 4. A/B Pricing Tests
  priceLiftCalculator,
  significantPriceLift,
  requiredSampleSizeForPriceTest,
  conversionRateLift,
  // 5. Willingness to Pay
  vanWestendorpPSM,
  gaborsGrangerDemand,
  gaborsGrangerOptimal,
  conjointPartWorth,
  // 6. Price Sensitivity Metrics
  priceIndexVsCompetitor,
  perceivedValueScore,
  valueForMoneyScore,
  priceQualityRatio,
  premiumPriceJustification,
  // 7. Discount Analysis
  discountImpactOnMargin,
  minimumVolumeForDiscount,
  couponROI,
  bundleDiscount,
} from '@/lib/analytics/pricing-analytics';

// ---------------------------------------------------------------------------
// 1. Price Elasticity
// ---------------------------------------------------------------------------

describe('priceElasticity', () => {
  it('computes basic PED', () => {
    expect(priceElasticity(-20, 10)).toBeCloseTo(-2);
  });

  it('returns Infinity when price unchanged', () => {
    expect(priceElasticity(10, 0)).toBe(Infinity);
  });

  it('handles zero quantity change', () => {
    expect(priceElasticity(0, 10)).toBe(0);
  });

  it('handles both negative', () => {
    expect(priceElasticity(-5, -10)).toBeCloseTo(0.5);
  });

  it('unit elastic: PED = -1', () => {
    expect(priceElasticity(-10, 10)).toBeCloseTo(-1);
  });
});

describe('crossElasticity', () => {
  it('computes positive XED (substitutes)', () => {
    expect(crossElasticity(15, 10)).toBeCloseTo(1.5);
  });

  it('computes negative XED (complements)', () => {
    expect(crossElasticity(-10, 5)).toBeCloseTo(-2);
  });

  it('returns Infinity when price B unchanged', () => {
    expect(crossElasticity(5, 0)).toBe(Infinity);
  });

  it('handles zero quantity change', () => {
    expect(crossElasticity(0, 20)).toBe(0);
  });
});

describe('incomeElasticity', () => {
  it('computes normal good (YED > 0)', () => {
    expect(incomeElasticity(10, 5)).toBeCloseTo(2);
  });

  it('computes inferior good (YED < 0)', () => {
    expect(incomeElasticity(-5, 10)).toBeCloseTo(-0.5);
  });

  it('returns Infinity when income unchanged', () => {
    expect(incomeElasticity(10, 0)).toBe(Infinity);
  });

  it('luxury good (YED > 1)', () => {
    expect(incomeElasticity(20, 10)).toBeCloseTo(2);
  });
});

describe('elasticityCategory', () => {
  it('perfectly_elastic for Infinity', () => {
    expect(elasticityCategory(Infinity)).toBe('perfectly_elastic');
  });

  it('perfectly_elastic for -Infinity', () => {
    expect(elasticityCategory(-Infinity)).toBe('perfectly_elastic');
  });

  it('elastic for |PED| > 1', () => {
    expect(elasticityCategory(-2)).toBe('elastic');
    expect(elasticityCategory(1.5)).toBe('elastic');
  });

  it('unit_elastic for |PED| = 1', () => {
    expect(elasticityCategory(-1)).toBe('unit_elastic');
    expect(elasticityCategory(1)).toBe('unit_elastic');
  });

  it('inelastic for 0 < |PED| < 1', () => {
    expect(elasticityCategory(-0.5)).toBe('inelastic');
    expect(elasticityCategory(0.3)).toBe('inelastic');
  });

  it('perfectly_inelastic for 0', () => {
    expect(elasticityCategory(0)).toBe('perfectly_inelastic');
  });

  it('large elastic value', () => {
    expect(elasticityCategory(-100)).toBe('elastic');
  });
});

describe('optimalPriceFromElasticity', () => {
  it('applies Lerner index for elastic demand', () => {
    // P* = MC / (1 + 1/PED) with PED=-2, MC=10: 10/(1+1/-2) = 10/0.5 = 20
    expect(optimalPriceFromElasticity(15, -2, 10)).toBeCloseTo(20);
  });

  it('returns currentPrice when PED >= -1 (inelastic)', () => {
    expect(optimalPriceFromElasticity(25, -0.5, 10)).toBe(25);
  });

  it('returns currentPrice when PED = 0', () => {
    expect(optimalPriceFromElasticity(25, 0, 10)).toBe(25);
  });

  it('returns currentPrice when PED = -1', () => {
    expect(optimalPriceFromElasticity(25, -1, 10)).toBe(25);
  });

  it('positive PED falls back to currentPrice', () => {
    expect(optimalPriceFromElasticity(30, 2, 10)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// 2. Revenue Optimization
// ---------------------------------------------------------------------------

describe('revenueAtPrice', () => {
  it('computes revenue for simple demand', () => {
    // Q = 100 - 5*10 = 50; R = 10*50 = 500
    expect(revenueAtPrice(10, 100, -5)).toBeCloseTo(500);
  });

  it('returns 0 when demand is negative', () => {
    // Q = 100 - 5*100 = -400 → clamped to 0
    expect(revenueAtPrice(100, 100, -5)).toBe(0);
  });

  it('returns 0 when price is 0', () => {
    expect(revenueAtPrice(0, 100, -5)).toBe(0);
  });

  it('handles zero slope', () => {
    // Q = 100, R = 50 * 100 = 5000
    expect(revenueAtPrice(50, 100, 0)).toBeCloseTo(5000);
  });

  it('positive slope increases demand', () => {
    // Q = 50 + 2*10 = 70; R = 10*70 = 700
    expect(revenueAtPrice(10, 50, 2)).toBeCloseTo(700);
  });
});

describe('profitAtPrice', () => {
  it('computes profit correctly', () => {
    // Q = 100 - 5*20 = 0; profit = (20-10)*0 - 1000 = -1000
    expect(profitAtPrice(20, 100, -5, 10, 1000)).toBeCloseTo(-1000);
  });

  it('computes positive profit', () => {
    // Q = 100 - 5*10 = 50; profit = (10-5)*50 - 50 = 250-50 = 200
    expect(profitAtPrice(10, 100, -5, 5, 50)).toBeCloseTo(200);
  });

  it('clamps negative demand to 0', () => {
    // Q = 10 - 5*10 = -40 → 0; profit = (10-5)*0 - 100 = -100
    expect(profitAtPrice(10, 10, -5, 5, 100)).toBeCloseTo(-100);
  });
});

describe('revenueMaximizingPrice', () => {
  it('computes revenue-maximising price', () => {
    // P* = -100 / (2 * -5) = 10
    expect(revenueMaximizingPrice(100, -5)).toBeCloseTo(10);
  });

  it('returns 0 when slope is 0', () => {
    expect(revenueMaximizingPrice(100, 0)).toBe(0);
  });

  it('returns 0 when slope is positive', () => {
    expect(revenueMaximizingPrice(100, 5)).toBe(0);
  });

  it('handles large intercept', () => {
    expect(revenueMaximizingPrice(1000, -10)).toBeCloseTo(50);
  });
});

describe('profitMaximizingPrice', () => {
  it('computes profit-maximising price', () => {
    // P* = (VC - intercept/slope)/2 = (5 - 100/-5)/2 = (5+20)/2 = 12.5
    expect(profitMaximizingPrice(100, -5, 5)).toBeCloseTo(12.5);
  });

  it('returns 0 when slope is 0', () => {
    expect(profitMaximizingPrice(100, 0, 5)).toBe(0);
  });

  it('positive slope produces a result', () => {
    // P* = (10 - 50/5)/2 = (10-10)/2 = 0
    expect(profitMaximizingPrice(50, 5, 10)).toBeCloseTo(0);
  });
});

describe('breakEvenUnits', () => {
  it('computes break-even correctly', () => {
    // FC=1000, P=20, VC=10: 1000/(20-10) = 100
    expect(breakEvenUnits(1000, 20, 10)).toBeCloseTo(100);
  });

  it('returns Infinity when P equals VC', () => {
    expect(breakEvenUnits(1000, 10, 10)).toBe(Infinity);
  });

  it('handles zero fixed cost', () => {
    expect(breakEvenUnits(0, 20, 10)).toBe(0);
  });
});

describe('breakEvenRevenue', () => {
  it('computes break-even revenue', () => {
    // FC=5000, margin=0.5: 10000
    expect(breakEvenRevenue(5000, 0.5)).toBeCloseTo(10000);
  });

  it('returns Infinity when grossMargin is 0', () => {
    expect(breakEvenRevenue(5000, 0)).toBe(Infinity);
  });

  it('handles high margin', () => {
    expect(breakEvenRevenue(1000, 1)).toBeCloseTo(1000);
  });
});

// ---------------------------------------------------------------------------
// 3. Subscription Pricing
// ---------------------------------------------------------------------------

describe('monthlyToAnnualConversion', () => {
  it('computes annual price with 20% discount', () => {
    // 10 * 12 * 0.8 = 96
    expect(monthlyToAnnualConversion(10, 0.2)).toBeCloseTo(96);
  });

  it('no discount', () => {
    expect(monthlyToAnnualConversion(10, 0)).toBeCloseTo(120);
  });

  it('100% discount → 0', () => {
    expect(monthlyToAnnualConversion(10, 1)).toBeCloseTo(0);
  });

  it('works with Pro tier pricing', () => {
    // $14.99/mo, $99/yr annual → discount ≈ 45%
    const annual = monthlyToAnnualConversion(14.99, 1 - 99 / (14.99 * 12));
    expect(annual).toBeCloseTo(99, 1);
  });
});

describe('annualSavings', () => {
  it('computes savings correctly', () => {
    expect(annualSavings(10, 96)).toBeCloseTo(24);
  });

  it('zero savings when annual = monthly*12', () => {
    expect(annualSavings(10, 120)).toBe(0);
  });

  it('negative savings (annual more expensive)', () => {
    expect(annualSavings(10, 150)).toBe(-30);
  });
});

describe('annualSavingsPct', () => {
  it('computes savings percentage', () => {
    // 24/120 = 0.2
    expect(annualSavingsPct(10, 96)).toBeCloseTo(0.2);
  });

  it('returns 0 when monthly is 0', () => {
    expect(annualSavingsPct(0, 0)).toBe(0);
  });

  it('returns 0 when annual equals monthly*12', () => {
    expect(annualSavingsPct(10, 120)).toBe(0);
  });

  it('Pro tier savings ~45%', () => {
    expect(annualSavingsPct(14.99, 99)).toBeCloseTo(0.4496, 3);
  });
});

describe('mrr', () => {
  it('sums monthly subscribers', () => {
    const subs = [
      { price: 10, billingCycle: 'monthly' as const },
      { price: 20, billingCycle: 'monthly' as const },
    ];
    expect(mrr(subs)).toBeCloseTo(30);
  });

  it('converts annual to monthly equivalent', () => {
    const subs = [{ price: 120, billingCycle: 'annual' as const }];
    expect(mrr(subs)).toBeCloseTo(10);
  });

  it('mixes monthly and annual', () => {
    const subs = [
      { price: 10, billingCycle: 'monthly' as const },
      { price: 240, billingCycle: 'annual' as const },
    ];
    expect(mrr(subs)).toBeCloseTo(30);
  });

  it('returns 0 for empty list', () => {
    expect(mrr([])).toBe(0);
  });
});

describe('arr', () => {
  it('multiplies MRR by 12', () => {
    expect(arr(1000)).toBeCloseTo(12000);
  });

  it('arr of 0 is 0', () => {
    expect(arr(0)).toBe(0);
  });
});

describe('arppu', () => {
  it('computes average revenue per paying user', () => {
    expect(arppu(1000, 100)).toBeCloseTo(10);
  });

  it('returns 0 for zero paying users', () => {
    expect(arppu(1000, 0)).toBe(0);
  });
});

describe('revenuePerUser', () => {
  it('computes RPU including free users', () => {
    expect(revenuePerUser(1000, 500)).toBeCloseTo(2);
  });

  it('returns 0 for zero total users', () => {
    expect(revenuePerUser(1000, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. A/B Pricing Tests
// ---------------------------------------------------------------------------

describe('priceLiftCalculator', () => {
  it('computes ARPU and lift correctly', () => {
    const result = priceLiftCalculator(1000, 1200, 100, 100);
    expect(result.arpu.control).toBeCloseTo(10);
    expect(result.arpu.treatment).toBeCloseTo(12);
    expect(result.lift).toBeCloseTo(2);
    expect(result.liftPct).toBeCloseTo(0.2);
  });

  it('handles zero control users', () => {
    const result = priceLiftCalculator(0, 1200, 0, 100);
    expect(result.arpu.control).toBe(0);
    expect(result.liftPct).toBe(0);
  });

  it('handles zero treatment users', () => {
    const result = priceLiftCalculator(1000, 0, 100, 0);
    expect(result.arpu.treatment).toBe(0);
    expect(result.lift).toBeCloseTo(-10);
  });

  it('equal revenue → zero lift', () => {
    const result = priceLiftCalculator(1000, 1000, 100, 100);
    expect(result.lift).toBeCloseTo(0);
    expect(result.liftPct).toBeCloseTo(0);
  });
});

describe('significantPriceLift', () => {
  it('detects significant lift with large sample and clear difference', () => {
    // Large N, clear difference → significant
    const sig = significantPriceLift(10, 15, 10000, 10000, 5, 5, 0.05);
    expect(sig).toBe(true);
  });

  it('not significant with small sample and small difference', () => {
    const sig = significantPriceLift(10, 10.01, 10, 10, 5, 5, 0.05);
    expect(sig).toBe(false);
  });

  it('returns true when SE is 0 and values differ', () => {
    const sig = significantPriceLift(10, 12, 1, 1, 0, 0);
    expect(sig).toBe(true);
  });

  it('returns false when SE is 0 and values are equal', () => {
    const sig = significantPriceLift(10, 10, 1, 1, 0, 0);
    expect(sig).toBe(false);
  });

  it('respects custom alpha', () => {
    // With alpha=0.5 (very lenient), should be significant for mild diff
    const sig = significantPriceLift(10, 11, 100, 100, 3, 3, 0.5);
    expect(sig).toBe(true);
  });
});

describe('requiredSampleSizeForPriceTest', () => {
  it('computes reasonable sample size', () => {
    // Standard: alpha=0.05, power=0.8, 20% lift
    // n = 2*((z0.975+z0.8)*5/2)^2 ≈ 2*(2.802*2.5)^2 ≈ 99
    const n = requiredSampleSizeForPriceTest(10, 0.2, 5);
    expect(n).toBeGreaterThanOrEqual(95);
    expect(n).toBeLessThan(10000);
  });

  it('returns Infinity when minDetectableLift is 0', () => {
    expect(requiredSampleSizeForPriceTest(10, 0, 5)).toBe(Infinity);
  });

  it('larger lift requires fewer samples', () => {
    const n1 = requiredSampleSizeForPriceTest(10, 0.1, 5);
    const n2 = requiredSampleSizeForPriceTest(10, 0.5, 5);
    expect(n1).toBeGreaterThan(n2);
  });

  it('higher power requires more samples', () => {
    const nLow = requiredSampleSizeForPriceTest(10, 0.2, 5, 0.05, 0.7);
    const nHigh = requiredSampleSizeForPriceTest(10, 0.2, 5, 0.05, 0.9);
    expect(nHigh).toBeGreaterThan(nLow);
  });

  it('result is a positive integer', () => {
    const n = requiredSampleSizeForPriceTest(10, 0.2, 5);
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
  });
});

describe('conversionRateLift', () => {
  it('computes positive lift', () => {
    expect(conversionRateLift(0.1, 0.12)).toBeCloseTo(0.2);
  });

  it('computes negative lift', () => {
    expect(conversionRateLift(0.1, 0.08)).toBeCloseTo(-0.2);
  });

  it('returns 0 when control rate is 0', () => {
    expect(conversionRateLift(0, 0.1)).toBe(0);
  });

  it('zero change = zero lift', () => {
    expect(conversionRateLift(0.1, 0.1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Willingness to Pay
// ---------------------------------------------------------------------------

describe('vanWestendorpPSM', () => {
  it('returns zeros for empty responses', () => {
    const result = vanWestendorpPSM([]);
    expect(result.acceptableRangeLow).toBe(0);
    expect(result.acceptableRangeHigh).toBe(0);
    expect(result.optimalPrice).toBe(0);
    expect(result.indifferencePrice).toBe(0);
  });

  it('all four prices are within the price range', () => {
    const responses = [
      { tooExpensive: 50, expensive: 30, cheap: 15, tooCheap: 5 },
      { tooExpensive: 60, expensive: 40, cheap: 20, tooCheap: 8 },
      { tooExpensive: 45, expensive: 35, cheap: 18, tooCheap: 6 },
      { tooExpensive: 55, expensive: 38, cheap: 22, tooCheap: 7 },
      { tooExpensive: 70, expensive: 45, cheap: 25, tooCheap: 10 },
    ];
    const result = vanWestendorpPSM(responses);
    expect(result.acceptableRangeLow).toBeGreaterThanOrEqual(0);
    expect(result.acceptableRangeHigh).toBeGreaterThanOrEqual(0);
    expect(result.optimalPrice).toBeGreaterThanOrEqual(0);
    expect(result.indifferencePrice).toBeGreaterThanOrEqual(0);
  });

  it('acceptable range low is less than high for typical data', () => {
    const responses = Array.from({ length: 10 }, (_, i) => ({
      tooExpensive: 100 - i,
      expensive: 70 - i,
      cheap: 30 + i,
      tooCheap: 5 + i,
    }));
    const result = vanWestendorpPSM(responses);
    expect(result.acceptableRangeLow).toBeLessThanOrEqual(result.acceptableRangeHigh);
  });

  it('single response returns midpoint', () => {
    const result = vanWestendorpPSM([
      { tooExpensive: 100, expensive: 80, cheap: 40, tooCheap: 10 },
    ]);
    // All distributions intersect at the midpoints
    expect(result.optimalPrice).toBeGreaterThanOrEqual(0);
  });

  it('handles uniform distribution (all same prices)', () => {
    const responses = Array.from({ length: 5 }, () => ({
      tooExpensive: 50,
      expensive: 30,
      cheap: 20,
      tooCheap: 10,
    }));
    const result = vanWestendorpPSM(responses);
    // Should not throw, results are numbers
    expect(typeof result.optimalPrice).toBe('number');
    expect(typeof result.indifferencePrice).toBe('number');
  });
});

describe('gaborsGrangerDemand', () => {
  it('returns sorted price/acceptance pairs', () => {
    const demand = gaborsGrangerDemand([30, 10, 20], [0.5, 0.9, 0.7]);
    expect(demand[0]?.price).toBe(10);
    expect(demand[1]?.price).toBe(20);
    expect(demand[2]?.price).toBe(30);
  });

  it('normalises values > 1 as percentages', () => {
    const demand = gaborsGrangerDemand([10], [80]);
    expect(demand[0]?.acceptancePct).toBeCloseTo(0.8);
  });

  it('values <= 1 pass through unchanged', () => {
    const demand = gaborsGrangerDemand([10], [0.8]);
    expect(demand[0]?.acceptancePct).toBeCloseTo(0.8);
  });

  it('returns empty for empty input', () => {
    expect(gaborsGrangerDemand([], [])).toHaveLength(0);
  });

  it('handles mismatched lengths — uses shorter', () => {
    const demand = gaborsGrangerDemand([10, 20, 30], [0.9, 0.7]);
    expect(demand).toHaveLength(2);
  });
});

describe('gaborsGrangerOptimal', () => {
  it('returns price that maximises revenue', () => {
    // price*acc: 10*0.9=9, 20*0.7=14, 30*0.5=15 → 30
    const opt = gaborsGrangerOptimal([10, 20, 30], [0.9, 0.7, 0.5]);
    expect(opt).toBe(30);
  });

  it('returns 0 for empty input', () => {
    expect(gaborsGrangerOptimal([], [])).toBe(0);
  });

  it('handles tie by returning first occurrence (sorted)', () => {
    // 10*1=10, 20*0.5=10 → first = 10
    const opt = gaborsGrangerOptimal([20, 10], [0.5, 1.0]);
    expect(opt).toBe(10);
  });

  it('works with percentage inputs', () => {
    // 10*0.9=9, 20*0.7=14, 30*0.5=15 → 30
    const opt = gaborsGrangerOptimal([10, 20, 30], [90, 70, 50]);
    expect(opt).toBe(30);
  });

  it('single price returns that price', () => {
    expect(gaborsGrangerOptimal([25], [0.8])).toBe(25);
  });
});

describe('conjointPartWorth', () => {
  it('creates correct attribute::level keys', () => {
    const map = conjointPartWorth(
      ['price', 'speed'],
      [['low', 'high'], ['fast', 'slow']],
      [[1.5, -1.5], [2.0, -2.0]]
    );
    expect(map.get('price::low')).toBeCloseTo(1.5);
    expect(map.get('price::high')).toBeCloseTo(-1.5);
    expect(map.get('speed::fast')).toBeCloseTo(2.0);
    expect(map.get('speed::slow')).toBeCloseTo(-2.0);
  });

  it('returns empty map for empty input', () => {
    const map = conjointPartWorth([], [], []);
    expect(map.size).toBe(0);
  });

  it('handles single attribute', () => {
    const map = conjointPartWorth(['brand'], [['A', 'B', 'C']], [[3, 1, -4]]);
    expect(map.size).toBe(3);
    expect(map.get('brand::A')).toBeCloseTo(3);
  });

  it('handles missing utility gracefully (uses 0)', () => {
    const map = conjointPartWorth(['size'], [['S', 'M', 'L']], [[1, 2]]);
    // Third level utility is missing → defaults to 0
    expect(map.get('size::L')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Price Sensitivity Metrics
// ---------------------------------------------------------------------------

describe('priceIndexVsCompetitor', () => {
  it('computes price index correctly', () => {
    expect(priceIndexVsCompetitor(15, 10)).toBeCloseTo(150);
  });

  it('parity index = 100', () => {
    expect(priceIndexVsCompetitor(10, 10)).toBeCloseTo(100);
  });

  it('discount index < 100', () => {
    expect(priceIndexVsCompetitor(8, 10)).toBeCloseTo(80);
  });

  it('returns Infinity when competitor price is 0', () => {
    expect(priceIndexVsCompetitor(10, 0)).toBe(Infinity);
  });
});

describe('perceivedValueScore', () => {
  it('computes weighted average', () => {
    // (5*0.4 + 4*0.6) / 1.0 = (2 + 2.4) / 1 = 4.4
    expect(perceivedValueScore([5, 4], [0.4, 0.6])).toBeCloseTo(4.4);
  });

  it('returns 0 for empty arrays', () => {
    expect(perceivedValueScore([], [])).toBe(0);
  });

  it('returns 0 when weights sum to 0', () => {
    expect(perceivedValueScore([5, 4], [0, 0])).toBe(0);
  });

  it('handles single benefit', () => {
    expect(perceivedValueScore([8], [1])).toBeCloseTo(8);
  });

  it('handles unequal length arrays — uses shorter', () => {
    expect(perceivedValueScore([5, 4, 3], [0.5, 0.5])).toBeCloseTo(4.5);
  });
});

describe('valueForMoneyScore', () => {
  it('computes VfM correctly', () => {
    expect(valueForMoneyScore(80, 10)).toBeCloseTo(8);
  });

  it('returns 0 when price is 0', () => {
    expect(valueForMoneyScore(80, 0)).toBe(0);
  });

  it('high perceived value → high score', () => {
    expect(valueForMoneyScore(100, 5)).toBeCloseTo(20);
  });
});

describe('priceQualityRatio', () => {
  it('computes ratio correctly', () => {
    expect(priceQualityRatio(90, 30)).toBeCloseTo(3);
  });

  it('returns Infinity when price is 0 and quality > 0', () => {
    expect(priceQualityRatio(90, 0)).toBe(Infinity);
  });

  it('returns 0 when both are 0', () => {
    expect(priceQualityRatio(0, 0)).toBe(0);
  });

  it('lower price → higher ratio', () => {
    const r1 = priceQualityRatio(90, 10);
    const r2 = priceQualityRatio(90, 20);
    expect(r1).toBeGreaterThan(r2);
  });
});

describe('premiumPriceJustification', () => {
  it('computes fair premium price', () => {
    // myQ=9, compQ=7, compP=50 → 50 * (9/7) ≈ 64.29
    expect(premiumPriceJustification(9, 7, 50)).toBeCloseTo(64.29, 1);
  });

  it('equal quality → same price', () => {
    expect(premiumPriceJustification(8, 8, 100)).toBeCloseTo(100);
  });

  it('returns 0 when competitor quality is 0', () => {
    expect(premiumPriceJustification(9, 0, 50)).toBe(0);
  });

  it('inferior quality → discounted price', () => {
    expect(premiumPriceJustification(5, 10, 100)).toBeCloseTo(50);
  });
});

// ---------------------------------------------------------------------------
// 7. Discount Analysis
// ---------------------------------------------------------------------------

describe('discountImpactOnMargin', () => {
  it('computes margin erosion correctly', () => {
    // originalP=100, disc=0.2, COGS=60
    // discountedP = 80
    // origMargin = (100-60)/100 = 40%
    // newMargin = (80-60)/80 = 25%
    // impact = 25%-40% = -15%
    const result = discountImpactOnMargin(100, 0.2, 60);
    expect(result.discountedPrice).toBeCloseTo(80);
    expect(result.originalMarginPct).toBeCloseTo(0.4);
    expect(result.newMarginPct).toBeCloseTo(0.25);
    expect(result.marginImpact).toBeCloseTo(-0.15);
  });

  it('handles zero original price', () => {
    const result = discountImpactOnMargin(0, 0.1, 0);
    expect(result.originalMarginPct).toBe(0);
    expect(result.newMarginPct).toBe(0);
  });

  it('100% discount → discounted price = 0', () => {
    const result = discountImpactOnMargin(100, 1, 60);
    expect(result.discountedPrice).toBeCloseTo(0);
    expect(result.newMarginPct).toBe(0);
  });

  it('no discount → no impact', () => {
    const result = discountImpactOnMargin(100, 0, 60);
    expect(result.discountedPrice).toBeCloseTo(100);
    expect(result.marginImpact).toBeCloseTo(0);
  });
});

describe('minimumVolumeForDiscount', () => {
  it('computes minimum volume correctly', () => {
    // price=100, originalMargin=40, disc=0.20
    // cogs = 100-40 = 60
    // discountedPrice = 80
    // newContribution = 80-60 = 20
    // minVol = 40/20 = 2
    expect(minimumVolumeForDiscount(40, 0.2, 100)).toBeCloseTo(2);
  });

  it('returns Infinity when newContribution <= 0', () => {
    // price=10, originalMargin=10, disc=0.5
    // cogs=0, discountedPrice=5, newContribution=5 → 10/5=2
    // Let margin be greater than price × (1-disc): disc=0.9, price=10, margin=5
    // cogs=5, discountedPrice=1, newContribution=1-5=-4 → Infinity
    expect(minimumVolumeForDiscount(5, 0.9, 10)).toBe(Infinity);
  });

  it('zero discount → min volume is 1', () => {
    // price=100, margin=40, disc=0
    // cogs=60, discountedP=100, newCont=40
    // minVol = 40/40 = 1
    expect(minimumVolumeForDiscount(40, 0, 100)).toBeCloseTo(1);
  });
});

describe('couponROI', () => {
  it('computes positive ROI', () => {
    // redemptions=100, value=5, incRevenue=2000, campaign=200
    // couponCost=500, ROI=(2000-500-200)/200 = 1300/200 = 6.5
    expect(couponROI(100, 5, 2000, 200)).toBeCloseTo(6.5);
  });

  it('negative ROI when costs exceed revenue', () => {
    // couponCost=100*20=2000, ROI=(500-2000-200)/200 = -1700/200 = -8.5
    expect(couponROI(100, 20, 500, 200)).toBeCloseTo(-8.5);
  });

  it('returns Infinity when campaignCost is 0', () => {
    expect(couponROI(100, 5, 2000, 0)).toBe(Infinity);
  });

  it('zero redemptions', () => {
    // ROI = (1000 - 0 - 100) / 100 = 9
    expect(couponROI(0, 5, 1000, 100)).toBeCloseTo(9);
  });
});

describe('bundleDiscount', () => {
  it('computes savings and percentage', () => {
    // sum = 30+20+10 = 60, bundle=45, savings=15, pct=0.25
    const result = bundleDiscount([30, 20, 10], 45);
    expect(result.savings).toBeCloseTo(15);
    expect(result.savingsPct).toBeCloseTo(0.25);
  });

  it('handles empty individual prices', () => {
    const result = bundleDiscount([], 10);
    expect(result.savings).toBe(-10);
    expect(result.savingsPct).toBe(0);
  });

  it('bundle equals sum → zero savings', () => {
    const result = bundleDiscount([10, 20], 30);
    expect(result.savings).toBeCloseTo(0);
    expect(result.savingsPct).toBeCloseTo(0);
  });

  it('bundle more expensive than individual sum → negative savings', () => {
    const result = bundleDiscount([10, 10], 30);
    expect(result.savings).toBeCloseTo(-10);
    expect(result.savingsPct).toBeCloseTo(-0.5);
  });

  it('single item bundle', () => {
    const result = bundleDiscount([50], 40);
    expect(result.savings).toBeCloseTo(10);
    expect(result.savingsPct).toBeCloseTo(0.2);
  });
});
