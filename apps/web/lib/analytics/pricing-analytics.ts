/**
 * Pricing Analytics — pure TypeScript, zero npm dependencies.
 *
 * Covers: price elasticity, revenue optimization, subscription pricing,
 * A/B pricing tests, willingness-to-pay (Van Westendorp PSM, Gabor-Granger,
 * conjoint), price sensitivity metrics, and discount analysis.
 *
 * Constraints: no `any`, all exports named, noUncheckedIndexedAccess safe.
 */

// ---------------------------------------------------------------------------
// Internal math helpers
// ---------------------------------------------------------------------------

/** Normal CDF approximation (Abramowitz & Stegun). */
function normalCdf(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const b1 = 0.31938153;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const pC = 0.2316419;
  const c = 0.39894228;
  const t = 1 / (1 + pC * Math.abs(z));
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  const pdf = c * Math.exp(-0.5 * z * z);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Inverse normal CDF using Halley's method (Newton-Raphson on the CDF).
 * Accurate to ~6 decimal places for p in (0, 1).
 */
function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Initial rational approximation
  const a1 = -3.969683028665376e1;
  const a2 = 2.209460984245205e2;
  const a3 = -2.759285104469687e2;
  const a4 = 1.38357751867269e2;
  const a5 = -3.066479806614716e1;
  const a6 = 2.506628277459239;
  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972e1;
  const b5 = -1.328068155288572e1;
  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838;
  const c4 = -2.549732539343734;
  const c5 = 4.374664141464968;
  const c6 = 2.938163982698783;
  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996;
  const d4 = 3.754408661907416;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let x: number;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    const num = ((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6;
    const den = (((d1 * q + d2) * q + d3) * q + d4) * q + 1;
    x = num / den;
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    const num = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q;
    const den = ((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1;
    x = num / den;
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    const num = ((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6;
    const den = (((d1 * q + d2) * q + d3) * q + d4) * q + 1;
    x = -(num / den);
  }

  return x;
}

// ---------------------------------------------------------------------------
// 1. Price Elasticity
// ---------------------------------------------------------------------------

/**
 * Price Elasticity of Demand (PED) = %ΔQ / %ΔP.
 * Returns Infinity when percentChangePrice is 0.
 */
export function priceElasticity(
  percentChangeQuantity: number,
  percentChangePrice: number
): number {
  if (percentChangePrice === 0) return Infinity;
  return percentChangeQuantity / percentChangePrice;
}

/**
 * Cross-Price Elasticity of Demand (XED) = %ΔQ_A / %ΔP_B.
 * Returns Infinity when percentChangePriceB is 0.
 */
export function crossElasticity(
  percentChangeQuantityA: number,
  percentChangePriceB: number
): number {
  if (percentChangePriceB === 0) return Infinity;
  return percentChangeQuantityA / percentChangePriceB;
}

/**
 * Income Elasticity of Demand (YED) = %ΔQ / %ΔIncome.
 * Returns Infinity when percentChangeIncome is 0.
 */
export function incomeElasticity(
  percentChangeQuantity: number,
  percentChangeIncome: number
): number {
  if (percentChangeIncome === 0) return Infinity;
  return percentChangeQuantity / percentChangeIncome;
}

export type ElasticityCategory =
  | 'perfectly_elastic'
  | 'elastic'
  | 'unit_elastic'
  | 'inelastic'
  | 'perfectly_inelastic';

/**
 * Categorise PED by absolute value.
 *  |PED| = Inf → perfectly_elastic
 *  |PED| > 1   → elastic
 *  |PED| = 1   → unit_elastic
 *  0 < |PED| < 1 → inelastic
 *  |PED| = 0   → perfectly_inelastic
 */
export function elasticityCategory(ped: number): ElasticityCategory {
  const abs = Math.abs(ped);
  if (!isFinite(abs)) return 'perfectly_elastic';
  if (abs > 1) return 'elastic';
  if (abs === 1) return 'unit_elastic';
  if (abs > 0) return 'inelastic';
  return 'perfectly_inelastic';
}

/**
 * Optimal price from elasticity via Lerner index: P* = MC / (1 + 1/PED).
 * Returns currentPrice when PED >= -1 (not meaningful to apply formula).
 */
export function optimalPriceFromElasticity(
  currentPrice: number,
  ped: number,
  marginalCost: number
): number {
  if (ped >= -1) return currentPrice;
  return marginalCost / (1 + 1 / ped);
}

// ---------------------------------------------------------------------------
// 2. Revenue Optimization
// ---------------------------------------------------------------------------

/**
 * Revenue at a given price using linear demand: Q = intercept + slope*P.
 * Returns P * max(Q, 0).
 */
export function revenueAtPrice(
  price: number,
  demandIntercept: number,
  demandSlope: number
): number {
  const q = demandIntercept + demandSlope * price;
  return price * Math.max(q, 0);
}

/**
 * Profit = (P - VC) * max(Q, 0) - FC.
 */
export function profitAtPrice(
  price: number,
  demandIntercept: number,
  demandSlope: number,
  variableCost: number,
  fixedCost: number
): number {
  const q = Math.max(demandIntercept + demandSlope * price, 0);
  return (price - variableCost) * q - fixedCost;
}

/**
 * Revenue-maximising price: P* = -intercept / (2 * slope).
 * Returns 0 when slope >= 0.
 */
export function revenueMaximizingPrice(
  demandIntercept: number,
  demandSlope: number
): number {
  if (demandSlope >= 0) return 0;
  return -demandIntercept / (2 * demandSlope);
}

/**
 * Profit-maximising price: P* = (VC - intercept / slope) / 2.
 * Returns 0 when slope === 0.
 */
export function profitMaximizingPrice(
  demandIntercept: number,
  demandSlope: number,
  variableCost: number
): number {
  if (demandSlope === 0) return 0;
  return (variableCost - demandIntercept / demandSlope) / 2;
}

/**
 * Break-even units: FC / (P - VC).
 * Returns Infinity when P === VC.
 */
export function breakEvenUnits(
  fixedCost: number,
  price: number,
  variableCost: number
): number {
  const margin = price - variableCost;
  if (margin === 0) return Infinity;
  return fixedCost / margin;
}

/**
 * Break-even revenue: FC / grossMargin.
 * Returns Infinity when grossMargin === 0.
 */
export function breakEvenRevenue(fixedCost: number, grossMargin: number): number {
  if (grossMargin === 0) return Infinity;
  return fixedCost / grossMargin;
}

// ---------------------------------------------------------------------------
// 3. Subscription Pricing
// ---------------------------------------------------------------------------

/**
 * Annual price = monthly * 12 * (1 - discount).
 */
export function monthlyToAnnualConversion(
  monthlyPrice: number,
  annualDiscount: number
): number {
  return monthlyPrice * 12 * (1 - annualDiscount);
}

/**
 * Savings vs paying monthly for 12 months: monthly * 12 - annual.
 */
export function annualSavings(monthlyPrice: number, annualPrice: number): number {
  return monthlyPrice * 12 - annualPrice;
}

/**
 * Savings as a fraction of monthly * 12.
 * Returns 0 when monthlyPrice === 0.
 */
export function annualSavingsPct(monthlyPrice: number, annualPrice: number): number {
  const base = monthlyPrice * 12;
  if (base === 0) return 0;
  return (base - annualPrice) / base;
}

export interface Subscriber {
  price: number;
  billingCycle: 'monthly' | 'annual';
}

/**
 * Monthly Recurring Revenue: sum of monthly-equivalent amounts.
 * Annual subscribers contribute price / 12.
 */
export function mrr(subscribers: Subscriber[]): number {
  return subscribers.reduce((sum, sub) => {
    const monthly = sub.billingCycle === 'annual' ? sub.price / 12 : sub.price;
    return sum + monthly;
  }, 0);
}

/**
 * Annual Recurring Revenue = MRR * 12.
 */
export function arr(mrrValue: number): number {
  return mrrValue * 12;
}

/**
 * Average Revenue Per Paying User.
 * Returns 0 when payingUsers === 0.
 */
export function arppu(totalRevenue: number, payingUsers: number): number {
  if (payingUsers === 0) return 0;
  return totalRevenue / payingUsers;
}

/**
 * Revenue per user including free users.
 * Returns 0 when totalUsers === 0.
 */
export function revenuePerUser(totalRevenue: number, totalUsers: number): number {
  if (totalUsers === 0) return 0;
  return totalRevenue / totalUsers;
}

// ---------------------------------------------------------------------------
// 4. A/B Pricing Tests
// ---------------------------------------------------------------------------

export interface PriceLiftResult {
  arpu: { control: number; treatment: number };
  lift: number;
  liftPct: number;
}

/**
 * Calculate ARPU per group, absolute lift, and % lift.
 */
export function priceLiftCalculator(
  controlRevenue: number,
  treatmentRevenue: number,
  controlUsers: number,
  treatmentUsers: number
): PriceLiftResult {
  const controlARPU = controlUsers === 0 ? 0 : controlRevenue / controlUsers;
  const treatmentARPU = treatmentUsers === 0 ? 0 : treatmentRevenue / treatmentUsers;
  const lift = treatmentARPU - controlARPU;
  const liftPct = controlARPU === 0 ? 0 : lift / controlARPU;
  return {
    arpu: { control: controlARPU, treatment: treatmentARPU },
    lift,
    liftPct,
  };
}

/**
 * Welch's t-test for significance of ARPU difference.
 * Default alpha = 0.05 (two-tailed), uses normal approximation.
 */
export function significantPriceLift(
  controlARPU: number,
  treatmentARPU: number,
  controlN: number,
  treatmentN: number,
  controlStd: number,
  treatmentStd: number,
  alpha = 0.05
): boolean {
  const se = Math.sqrt(
    (controlStd * controlStd) / controlN + (treatmentStd * treatmentStd) / treatmentN
  );
  if (se === 0) return controlARPU !== treatmentARPU;
  const tStat = (treatmentARPU - controlARPU) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(tStat)));
  return pValue < alpha;
}

/**
 * Required sample size per group for a price test (standard formula).
 * n = 2 * ((z_alpha/2 + z_power) * stdDev / delta)^2
 * Defaults: alpha=0.05, power=0.8.
 */
export function requiredSampleSizeForPriceTest(
  baseARPU: number,
  minDetectableLift: number,
  stdDev: number,
  alpha = 0.05,
  power = 0.8
): number {
  const zAlpha = normInv(1 - alpha / 2);
  const zPower = normInv(power);
  const delta = baseARPU * minDetectableLift;
  if (delta === 0) return Infinity;
  const n = 2 * Math.pow(((zAlpha + zPower) * stdDev) / delta, 2);
  return Math.ceil(n);
}

/**
 * Conversion rate lift: (treatment - control) / control.
 * Returns 0 when controlRate === 0.
 */
export function conversionRateLift(controlRate: number, treatmentRate: number): number {
  if (controlRate === 0) return 0;
  return (treatmentRate - controlRate) / controlRate;
}

// ---------------------------------------------------------------------------
// 5. Willingness to Pay
// ---------------------------------------------------------------------------

export interface PSMResponse {
  tooExpensive: number;
  expensive: number;
  cheap: number;
  tooCheap: number;
}

export interface PSMResult {
  acceptableRangeLow: number;
  acceptableRangeHigh: number;
  optimalPrice: number;
  indifferencePrice: number;
}

/**
 * Van Westendorp Price Sensitivity Meter.
 *
 * Finds four price-point intersections from cumulative distributions:
 *  - acceptableRangeLow  (PMC): tooCheap% crosses expensive%
 *  - acceptableRangeHigh (PME): tooExpensive% crosses cheap%
 *  - optimalPrice        (OPP): tooExpensive% crosses tooCheap%
 *  - indifferencePrice   (IDP): expensive% crosses cheap%
 */
export function vanWestendorpPSM(responses: PSMResponse[]): PSMResult {
  if (responses.length === 0) {
    return {
      acceptableRangeLow: 0,
      acceptableRangeHigh: 0,
      optimalPrice: 0,
      indifferencePrice: 0,
    };
  }

  const n = responses.length;

  // Collect all unique price points across all four fields
  const allPricesSet = new Set<number>();
  for (const r of responses) {
    allPricesSet.add(r.tooExpensive);
    allPricesSet.add(r.expensive);
    allPricesSet.add(r.cheap);
    allPricesSet.add(r.tooCheap);
  }
  const prices = Array.from(allPricesSet).sort((a, b) => a - b);

  // Compute cumulative percentages at each price point
  const getCumPct = (values: number[], ascending: boolean): number[] => {
    return prices.map((p) => {
      const count = ascending
        ? values.filter((v) => v <= p).length
        : values.filter((v) => v >= p).length;
      return count / n;
    });
  };

  const tooExpPct = getCumPct(
    responses.map((r) => r.tooExpensive),
    false // descending: % who find it too expensive at >= p
  );
  const expPct = getCumPct(
    responses.map((r) => r.expensive),
    false // descending
  );
  const cheapPct = getCumPct(
    responses.map((r) => r.cheap),
    true // ascending
  );
  const tooCheapPct = getCumPct(
    responses.map((r) => r.tooCheap),
    true // ascending
  );

  /** Linear interpolation crossing point between two arrays. */
  function findCrossing(aArr: number[], bArr: number[]): number {
    for (let i = 0; i < prices.length - 1; i++) {
      const p0 = prices[i] ?? 0;
      const p1 = prices[i + 1] ?? 0;
      const a0 = aArr[i] ?? 0;
      const a1 = aArr[i + 1] ?? 0;
      const b0 = bArr[i] ?? 0;
      const b1 = bArr[i + 1] ?? 0;
      if ((a0 - b0) * (a1 - b1) <= 0) {
        const denom = (a0 - b0) - (a1 - b1);
        if (denom === 0) return (p0 + p1) / 2;
        const t = (a0 - b0) / denom;
        return p0 + t * (p1 - p0);
      }
    }
    // No crossing — return midpoint of price range
    return ((prices[0] ?? 0) + (prices[prices.length - 1] ?? 0)) / 2;
  }

  return {
    acceptableRangeLow: findCrossing(tooCheapPct, expPct),
    acceptableRangeHigh: findCrossing(tooExpPct, cheapPct),
    optimalPrice: findCrossing(tooExpPct, tooCheapPct),
    indifferencePrice: findCrossing(expPct, cheapPct),
  };
}

export interface GaborGrangerPoint {
  price: number;
  acceptancePct: number;
}

/**
 * Gabor-Granger demand: return sorted price/acceptance pairs.
 * Values > 1 are treated as percentages (divided by 100).
 */
export function gaborsGrangerDemand(
  testPrices: number[],
  acceptance: number[]
): GaborGrangerPoint[] {
  const len = Math.min(testPrices.length, acceptance.length);
  const pairs: GaborGrangerPoint[] = [];
  for (let i = 0; i < len; i++) {
    const price = testPrices[i] ?? 0;
    const rawAcc = acceptance[i] ?? 0;
    const acceptancePct = rawAcc > 1 ? rawAcc / 100 : rawAcc;
    pairs.push({ price, acceptancePct });
  }
  return pairs.sort((a, b) => a.price - b.price);
}

/**
 * Gabor-Granger optimal price: maximises price * acceptance.
 * Returns 0 for empty input.
 */
export function gaborsGrangerOptimal(testPrices: number[], acceptance: number[]): number {
  const demand = gaborsGrangerDemand(testPrices, acceptance);
  if (demand.length === 0) return 0;
  let bestRevenue = -Infinity;
  let bestPrice = demand[0]?.price ?? 0;
  for (const { price, acceptancePct } of demand) {
    const revenue = price * acceptancePct;
    if (revenue > bestRevenue) {
      bestRevenue = revenue;
      bestPrice = price;
    }
  }
  return bestPrice;
}

/**
 * Conjoint part-worth utilities.
 * Returns a Map<"attribute::level", utility>.
 */
export function conjointPartWorth(
  attributes: string[],
  levels: string[][],
  utilities: number[][]
): Map<string, number> {
  const result = new Map<string, number>();
  for (let a = 0; a < attributes.length; a++) {
    const attr = attributes[a] ?? '';
    const attrLevels = levels[a] ?? [];
    const attrUtils = utilities[a] ?? [];
    for (let l = 0; l < attrLevels.length; l++) {
      const level = attrLevels[l] ?? '';
      const util = attrUtils[l] ?? 0;
      result.set(`${attr}::${level}`, util);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 6. Price Sensitivity Metrics
// ---------------------------------------------------------------------------

/**
 * Price index vs competitor: (myPrice / competitorPrice) * 100.
 * Returns Infinity when competitorPrice === 0.
 */
export function priceIndexVsCompetitor(myPrice: number, competitorPrice: number): number {
  if (competitorPrice === 0) return Infinity;
  return (myPrice / competitorPrice) * 100;
}

/**
 * Perceived value score: weighted sum / total weight.
 * Returns 0 if weights sum to 0 or arrays are empty.
 */
export function perceivedValueScore(benefits: number[], weights: number[]): number {
  const len = Math.min(benefits.length, weights.length);
  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < len; i++) {
    const b = benefits[i] ?? 0;
    const w = weights[i] ?? 0;
    weightedSum += b * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

/**
 * Value-for-money score: perceivedValue / price.
 * Returns 0 when price === 0.
 */
export function valueForMoneyScore(perceivedValue: number, price: number): number {
  if (price === 0) return 0;
  return perceivedValue / price;
}

/**
 * Price-quality ratio: qualityScore / price.
 * Returns Infinity when price === 0 and quality > 0; 0 when both are 0.
 */
export function priceQualityRatio(qualityScore: number, price: number): number {
  if (price === 0) return qualityScore === 0 ? 0 : Infinity;
  return qualityScore / price;
}

/**
 * Fair premium price justified by quality differential:
 * competitorPrice * (myQuality / competitorQuality).
 * Returns 0 when competitorQuality === 0.
 */
export function premiumPriceJustification(
  myQuality: number,
  competitorQuality: number,
  competitorPrice: number
): number {
  if (competitorQuality === 0) return 0;
  return competitorPrice * (myQuality / competitorQuality);
}

// ---------------------------------------------------------------------------
// 7. Discount Analysis
// ---------------------------------------------------------------------------

export interface DiscountImpact {
  discountedPrice: number;
  originalMarginPct: number;
  newMarginPct: number;
  marginImpact: number;
}

/**
 * Margin erosion analysis after applying a discount.
 */
export function discountImpactOnMargin(
  originalPrice: number,
  discountPct: number,
  costOfGoods: number
): DiscountImpact {
  const discountedPrice = originalPrice * (1 - discountPct);
  const originalMarginPct =
    originalPrice === 0 ? 0 : (originalPrice - costOfGoods) / originalPrice;
  const newMarginPct =
    discountedPrice === 0 ? 0 : (discountedPrice - costOfGoods) / discountedPrice;
  const marginImpact = newMarginPct - originalMarginPct;
  return { discountedPrice, originalMarginPct, newMarginPct, marginImpact };
}

/**
 * Minimum volume required to break even on margin after a discount.
 * Derived from: originalMargin per unit / newContribution per unit.
 * Returns Infinity when newContribution <= 0.
 */
export function minimumVolumeForDiscount(
  originalMargin: number,
  discountPct: number,
  price: number
): number {
  const discountedPrice = price * (1 - discountPct);
  const cogs = price - originalMargin;
  const newContribution = discountedPrice - cogs;
  if (newContribution <= 0) return Infinity;
  return originalMargin / newContribution;
}

/**
 * Coupon ROI: (incrementalRevenue - couponCost - campaignCost) / campaignCost.
 * Returns Infinity when campaignCost === 0.
 */
export function couponROI(
  redemptions: number,
  couponValue: number,
  incrementalRevenue: number,
  campaignCost: number
): number {
  if (campaignCost === 0) return Infinity;
  const couponCost = redemptions * couponValue;
  return (incrementalRevenue - couponCost - campaignCost) / campaignCost;
}

export interface BundleDiscountResult {
  savings: number;
  savingsPct: number;
}

/**
 * Bundle discount vs sum of individual prices.
 */
export function bundleDiscount(
  individualPrices: number[],
  bundlePrice: number
): BundleDiscountResult {
  const sumIndividual = individualPrices.reduce((acc, p) => acc + p, 0);
  const savings = sumIndividual - bundlePrice;
  const savingsPct = sumIndividual === 0 ? 0 : savings / sumIndividual;
  return { savings, savingsPct };
}
