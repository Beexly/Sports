/**
 * Tests for attribution-analytics.ts
 * ~140+ tests covering all exported functions.
 */

import { describe, it, expect } from 'vitest';
import {
  firstTouchAttribution,
  lastTouchAttribution,
  lastNonDirectAttribution,
  linearAttribution,
  timeDecayAttribution,
  positionBasedAttribution,
  wShapedAttribution,
  shapleyValue,
  conversionRate,
  channelConversionRates,
  attributedRevenue,
  funnelConversionRate,
  funnelDropoffRate,
  overallFunnelConversion,
  funnelRevenue,
  funnelOptimizationPriority,
  commonPaths,
  assistRate,
  channelFirstLastRate,
  avgTouchpointsToConvert,
  channelROI,
  marginalROI,
  budgetAllocation,
  roas,
  costPerAcquisition,
  pickDiscoveryPath,
  contentAttributedSubscriptions,
  seasonalAttributionShift,
} from '@/lib/analytics/attribution-analytics';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function approx(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

// ---------------------------------------------------------------------------
// 1. Single-touch: firstTouchAttribution
// ---------------------------------------------------------------------------
describe('firstTouchAttribution', () => {
  it('gives 100% to first touchpoint on conversion', () => {
    const result = firstTouchAttribution(['email', 'social', 'direct'], true);
    expect(result.get('email')).toBe(1);
    expect(result.get('social')).toBe(0);
    expect(result.get('direct')).toBe(0);
  });

  it('returns all zeros if no conversion', () => {
    const result = firstTouchAttribution(['email', 'social'], false);
    expect(result.get('email')).toBe(0);
    expect(result.get('social')).toBe(0);
  });

  it('returns empty map for empty touchpoints with no conversion', () => {
    const result = firstTouchAttribution([], false);
    expect(result.size).toBe(0);
  });

  it('returns empty map for empty touchpoints with conversion', () => {
    const result = firstTouchAttribution([], true);
    expect(result.size).toBe(0);
  });

  it('single touchpoint gets 100% on conversion', () => {
    const result = firstTouchAttribution(['organic'], true);
    expect(result.get('organic')).toBe(1);
  });

  it('single touchpoint gets 0 on no conversion', () => {
    const result = firstTouchAttribution(['organic'], false);
    expect(result.get('organic')).toBe(0);
  });

  it('first of duplicate channels gets 1, subsequent 0', () => {
    const result = firstTouchAttribution(['email', 'email', 'email'], true);
    // map key 'email' will end up as 1 since first sets it
    expect(result.get('email')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 1. Single-touch: lastTouchAttribution
// ---------------------------------------------------------------------------
describe('lastTouchAttribution', () => {
  it('gives 100% to last touchpoint on conversion', () => {
    const result = lastTouchAttribution(['email', 'social', 'direct'], true);
    expect(result.get('direct')).toBe(1);
    expect(result.get('email')).toBe(0);
    expect(result.get('social')).toBe(0);
  });

  it('returns all zeros if no conversion', () => {
    const result = lastTouchAttribution(['email', 'social'], false);
    expect(result.get('email')).toBe(0);
    expect(result.get('social')).toBe(0);
  });

  it('returns empty map for empty touchpoints', () => {
    const result = lastTouchAttribution([], true);
    expect(result.size).toBe(0);
  });

  it('single touchpoint gets 100% on conversion', () => {
    const result = lastTouchAttribution(['organic'], true);
    expect(result.get('organic')).toBe(1);
  });

  it('single touchpoint gets 0 on no conversion', () => {
    const result = lastTouchAttribution(['organic'], false);
    expect(result.get('organic')).toBe(0);
  });

  it('last of duplicate channels gets accumulated credit', () => {
    const result = lastTouchAttribution(['email', 'social', 'email'], true);
    expect(result.get('email')).toBe(1);
    expect(result.get('social')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 1. Single-touch: lastNonDirectAttribution
// ---------------------------------------------------------------------------
describe('lastNonDirectAttribution', () => {
  it('gives credit to last non-direct touch', () => {
    const result = lastNonDirectAttribution(
      ['email', 'direct', 'social', 'direct'],
      true,
    );
    expect(result.get('social')).toBe(1);
    expect(result.get('email')).toBe(0);
    expect(result.get('direct')).toBe(0);
  });

  it('falls back to last touch if all direct', () => {
    const result = lastNonDirectAttribution(
      ['direct', 'direct'],
      true,
    );
    expect(result.get('direct')).toBe(1);
  });

  it('returns all zeros if no conversion', () => {
    const result = lastNonDirectAttribution(['email', 'social'], false);
    expect(result.get('email')).toBe(0);
    expect(result.get('social')).toBe(0);
  });

  it('uses custom directChannel', () => {
    const result = lastNonDirectAttribution(
      ['organic', 'none', 'email', 'none'],
      true,
      'none',
    );
    expect(result.get('email')).toBe(1);
    expect(result.get('none')).toBe(0);
  });

  it('returns empty map for empty touchpoints with conversion', () => {
    const result = lastNonDirectAttribution([], true);
    expect(result.size).toBe(0);
  });

  it('single non-direct touchpoint gets 100%', () => {
    const result = lastNonDirectAttribution(['email'], true);
    expect(result.get('email')).toBe(1);
  });

  it('returns all zeros if no conversion with empty touchpoints', () => {
    const result = lastNonDirectAttribution([], false);
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Multi-touch: linearAttribution
// ---------------------------------------------------------------------------
describe('linearAttribution', () => {
  it('splits credit equally across 3 touchpoints', () => {
    const result = linearAttribution(['email', 'social', 'direct'], true);
    expect(approx(result.get('email') ?? 0, 1 / 3)).toBe(true);
    expect(approx(result.get('social') ?? 0, 1 / 3)).toBe(true);
    expect(approx(result.get('direct') ?? 0, 1 / 3)).toBe(true);
  });

  it('returns all zeros if no conversion', () => {
    const result = linearAttribution(['email', 'social'], false);
    expect(result.get('email')).toBe(0);
    expect(result.get('social')).toBe(0);
  });

  it('duplicate channels accumulate multiple shares', () => {
    const result = linearAttribution(['email', 'social', 'email'], true);
    // email gets 2/3, social gets 1/3
    expect(approx(result.get('email') ?? 0, 2 / 3)).toBe(true);
    expect(approx(result.get('social') ?? 0, 1 / 3)).toBe(true);
  });

  it('single touchpoint gets 100%', () => {
    const result = linearAttribution(['direct'], true);
    expect(result.get('direct')).toBe(1);
  });

  it('empty touchpoints returns empty map', () => {
    const result = linearAttribution([], true);
    expect(result.size).toBe(0);
  });

  it('all same channel accumulates correctly', () => {
    const result = linearAttribution(['email', 'email', 'email', 'email'], true);
    expect(approx(result.get('email') ?? 0, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Multi-touch: timeDecayAttribution
// ---------------------------------------------------------------------------
describe('timeDecayAttribution', () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const HALF_LIFE = 7 * ONE_DAY;

  it('more recent touchpoints get more credit', () => {
    const now = 1_000_000_000_000;
    const ts = [now - 14 * ONE_DAY, now - 7 * ONE_DAY, now];
    const result = timeDecayAttribution(
      ['old', 'mid', 'new'],
      ts,
      true,
      HALF_LIFE,
    );
    const oldCredit = result.get('old') ?? 0;
    const midCredit = result.get('mid') ?? 0;
    const newCredit = result.get('new') ?? 0;
    expect(newCredit).toBeGreaterThan(midCredit);
    expect(midCredit).toBeGreaterThan(oldCredit);
  });

  it('credits sum to 1 on conversion', () => {
    const now = 1_000_000_000_000;
    const ts = [now - 10 * ONE_DAY, now - 3 * ONE_DAY, now];
    const result = timeDecayAttribution(['a', 'b', 'c'], ts, true, HALF_LIFE);
    const total = [...result.values()].reduce((s, v) => s + v, 0);
    expect(approx(total, 1)).toBe(true);
  });

  it('returns all zeros if no conversion', () => {
    const now = 1_000_000_000_000;
    const ts = [now - ONE_DAY, now];
    const result = timeDecayAttribution(['a', 'b'], ts, false, HALF_LIFE);
    expect(result.get('a')).toBe(0);
    expect(result.get('b')).toBe(0);
  });

  it('falls back to equal when no timestamps provided', () => {
    const result = timeDecayAttribution(['a', 'b', 'c'], [], true, HALF_LIFE);
    expect(approx(result.get('a') ?? 0, 1 / 3)).toBe(true);
    expect(approx(result.get('b') ?? 0, 1 / 3)).toBe(true);
    expect(approx(result.get('c') ?? 0, 1 / 3)).toBe(true);
  });

  it('all same timestamp yields equal distribution', () => {
    const now = 1_000_000_000_000;
    const ts = [now, now, now];
    const result = timeDecayAttribution(['x', 'y', 'z'], ts, true, HALF_LIFE);
    expect(approx(result.get('x') ?? 0, 1 / 3)).toBe(true);
    expect(approx(result.get('y') ?? 0, 1 / 3)).toBe(true);
    expect(approx(result.get('z') ?? 0, 1 / 3)).toBe(true);
  });

  it('mismatched timestamp length falls back to equal split', () => {
    const now = 1_000_000_000_000;
    const result = timeDecayAttribution(['a', 'b'], [now], true, HALF_LIFE);
    expect(approx(result.get('a') ?? 0, 0.5)).toBe(true);
    expect(approx(result.get('b') ?? 0, 0.5)).toBe(true);
  });

  it('single touchpoint gets all credit', () => {
    const now = 1_000_000_000_000;
    const result = timeDecayAttribution(['solo'], [now], true, HALF_LIFE);
    expect(approx(result.get('solo') ?? 0, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Multi-touch: positionBasedAttribution
// ---------------------------------------------------------------------------
describe('positionBasedAttribution', () => {
  it('1 touchpoint gets 100%', () => {
    const result = positionBasedAttribution(['only'], true);
    expect(result.get('only')).toBe(1);
  });

  it('2 touchpoints get 50/50', () => {
    const result = positionBasedAttribution(['a', 'b'], true);
    expect(approx(result.get('a') ?? 0, 0.5)).toBe(true);
    expect(approx(result.get('b') ?? 0, 0.5)).toBe(true);
  });

  it('default 3 touchpoints: 40/20/40', () => {
    const result = positionBasedAttribution(['first', 'mid', 'last'], true);
    expect(approx(result.get('first') ?? 0, 0.4)).toBe(true);
    expect(approx(result.get('mid') ?? 0, 0.2)).toBe(true);
    expect(approx(result.get('last') ?? 0, 0.4)).toBe(true);
  });

  it('5 touchpoints: first=40%, last=40%, middle 3 share 20%', () => {
    const result = positionBasedAttribution(
      ['a', 'b', 'c', 'd', 'e'],
      true,
    );
    expect(approx(result.get('a') ?? 0, 0.4)).toBe(true);
    expect(approx(result.get('e') ?? 0, 0.4)).toBe(true);
    const midShare = 0.2 / 3;
    expect(approx(result.get('b') ?? 0, midShare)).toBe(true);
    expect(approx(result.get('c') ?? 0, midShare)).toBe(true);
    expect(approx(result.get('d') ?? 0, midShare)).toBe(true);
  });

  it('no conversion returns all zeros', () => {
    const result = positionBasedAttribution(['a', 'b', 'c'], false);
    expect(result.get('a')).toBe(0);
    expect(result.get('b')).toBe(0);
    expect(result.get('c')).toBe(0);
  });

  it('custom firstPct and lastPct', () => {
    const result = positionBasedAttribution(
      ['a', 'b', 'c'],
      true,
      0.5,
      0.3,
    );
    expect(approx(result.get('a') ?? 0, 0.5)).toBe(true);
    expect(approx(result.get('c') ?? 0, 0.3)).toBe(true);
    expect(approx(result.get('b') ?? 0, 0.2)).toBe(true);
  });

  it('empty touchpoints returns empty map', () => {
    const result = positionBasedAttribution([], true);
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Multi-touch: wShapedAttribution
// ---------------------------------------------------------------------------
describe('wShapedAttribution', () => {
  it('1 touchpoint gets 100%', () => {
    const result = wShapedAttribution(['only'], true);
    expect(approx(result.get('only') ?? 0, 1)).toBe(true);
  });

  it('2 touchpoints: first/last each get 50%', () => {
    const result = wShapedAttribution(['a', 'b'], true);
    expect(approx(result.get('a') ?? 0, 0.5)).toBe(true);
    expect(approx(result.get('b') ?? 0, 0.5)).toBe(true);
  });

  it('3 touchpoints: each key gets ~33%', () => {
    const result = wShapedAttribution(['first', 'mid', 'last'], true);
    // With 3 touchpoints, all 3 are key positions, no rest, so 10% split among 3
    // first=0.3 + 0.1/3, mid=0.3 + 0.1/3, last=0.3 + 0.1/3
    const expected = 0.3 + 0.1 / 3;
    expect(approx(result.get('first') ?? 0, expected, 1e-9)).toBe(true);
    expect(approx(result.get('mid') ?? 0, expected, 1e-9)).toBe(true);
    expect(approx(result.get('last') ?? 0, expected, 1e-9)).toBe(true);
  });

  it('5 touchpoints: first/mid/last get 30%, rest split 10%', () => {
    const result = wShapedAttribution(['a', 'b', 'c', 'd', 'e'], true);
    expect(approx(result.get('a') ?? 0, 0.3)).toBe(true);
    expect(approx(result.get('c') ?? 0, 0.3)).toBe(true);
    expect(approx(result.get('e') ?? 0, 0.3)).toBe(true);
    expect(approx(result.get('b') ?? 0, 0.05)).toBe(true);
    expect(approx(result.get('d') ?? 0, 0.05)).toBe(true);
  });

  it('no conversion returns all zeros', () => {
    const result = wShapedAttribution(['a', 'b', 'c'], false);
    expect(result.get('a')).toBe(0);
    expect(result.get('b')).toBe(0);
    expect(result.get('c')).toBe(0);
  });

  it('credits sum to 1 on conversion for various lengths', () => {
    for (const n of [1, 2, 3, 4, 5, 7]) {
      const tps = Array.from({ length: n }, (_, i) => `ch${i}`);
      const result = wShapedAttribution(tps, true);
      const total = [...result.values()].reduce((s, v) => s + v, 0);
      expect(approx(total, 1, 1e-9)).toBe(true);
    }
  });

  it('empty touchpoints returns empty map', () => {
    const result = wShapedAttribution([], true);
    expect(result.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Data-driven: shapleyValue
// ---------------------------------------------------------------------------
describe('shapleyValue', () => {
  it('single player game: gets full value', () => {
    const result = shapleyValue(['A'], (c) => (c.includes('A') ? 10 : 0));
    expect(approx(result.get('A') ?? 0, 10)).toBe(true);
  });

  it('two players symmetric game splits evenly', () => {
    // v({A})=1, v({B})=1, v({A,B})=3
    const v = (c: string[]) =>
      c.includes('A') && c.includes('B') ? 3 : c.length === 1 ? 1 : 0;
    const result = shapleyValue(['A', 'B'], v);
    expect(approx(result.get('A') ?? 0, 1.5)).toBe(true);
    expect(approx(result.get('B') ?? 0, 1.5)).toBe(true);
  });

  it('dummy player gets 0 Shapley value', () => {
    // v({A,B})=1 if both present, else v({A})=1, v({B})=0 — B is dummy
    const v = (c: string[]) => (c.includes('A') ? 1 : 0);
    const result = shapleyValue(['A', 'B'], v);
    expect(approx(result.get('B') ?? 0, 0)).toBe(true);
    expect(approx(result.get('A') ?? 0, 1)).toBe(true);
  });

  it('Shapley values sum to v(grand coalition)', () => {
    const v = (c: string[]) => {
      if (c.includes('A') && c.includes('B') && c.includes('C')) return 9;
      if (c.includes('A') && c.includes('B')) return 5;
      if (c.includes('A') && c.includes('C')) return 4;
      if (c.includes('B') && c.includes('C')) return 3;
      if (c.includes('A')) return 2;
      if (c.includes('B')) return 1;
      if (c.includes('C')) return 1;
      return 0;
    };
    const result = shapleyValue(['A', 'B', 'C'], v);
    const total = [...result.values()].reduce((s, v) => s + v, 0);
    expect(approx(total, 9)).toBe(true);
  });

  it('empty players returns empty map', () => {
    const result = shapleyValue([], () => 0);
    expect(result.size).toBe(0);
  });

  it('asymmetric 2-player game', () => {
    // A alone = 3, B alone = 1, together = 6
    const v = (c: string[]) => {
      if (c.includes('A') && c.includes('B')) return 6;
      if (c.includes('A')) return 3;
      if (c.includes('B')) return 1;
      return 0;
    };
    const result = shapleyValue(['A', 'B'], v);
    // Shapley A = 0.5*(3-0) + 0.5*(6-1) = 1.5 + 2.5 = 4
    // Shapley B = 0.5*(1-0) + 0.5*(6-3) = 0.5 + 1.5 = 2
    expect(approx(result.get('A') ?? 0, 4)).toBe(true);
    expect(approx(result.get('B') ?? 0, 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Data-driven: conversionRate
// ---------------------------------------------------------------------------
describe('conversionRate', () => {
  it('computes rate correctly', () => {
    expect(conversionRate(50, 1000)).toBe(0.05);
  });
  it('returns 0 when visitors is 0', () => {
    expect(conversionRate(0, 0)).toBe(0);
    expect(conversionRate(5, 0)).toBe(0);
  });
  it('returns 1.0 when all visitors convert', () => {
    expect(conversionRate(100, 100)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Data-driven: channelConversionRates
// ---------------------------------------------------------------------------
describe('channelConversionRates', () => {
  it('computes per-channel rates', () => {
    const events = [
      { channel: 'email', converted: true },
      { channel: 'email', converted: false },
      { channel: 'social', converted: true },
    ];
    const result = channelConversionRates(events);
    expect(approx(result.get('email') ?? 0, 0.5)).toBe(true);
    expect(approx(result.get('social') ?? 0, 1)).toBe(true);
  });

  it('returns 0 rate for all-no-conversion channel', () => {
    const events = [
      { channel: 'direct', converted: false },
      { channel: 'direct', converted: false },
    ];
    const result = channelConversionRates(events);
    expect(result.get('direct')).toBe(0);
  });

  it('empty events returns empty map', () => {
    expect(channelConversionRates([]).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Data-driven: attributedRevenue
// ---------------------------------------------------------------------------
describe('attributedRevenue', () => {
  it('multiplies credits by revenue', () => {
    const attr = new Map([
      ['email', 0.5],
      ['social', 0.3],
      ['direct', 0.2],
    ]);
    const result = attributedRevenue(attr, 1000);
    expect(result.get('email')).toBe(500);
    expect(result.get('social')).toBe(300);
    expect(result.get('direct')).toBe(200);
  });

  it('zero revenue yields zero for all channels', () => {
    const attr = new Map([['email', 0.7], ['direct', 0.3]]);
    const result = attributedRevenue(attr, 0);
    expect(result.get('email')).toBe(0);
    expect(result.get('direct')).toBe(0);
  });

  it('empty attribution returns empty map', () => {
    expect(attributedRevenue(new Map(), 500).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Funnel analytics
// ---------------------------------------------------------------------------
describe('funnelConversionRate', () => {
  it('returns empty array for < 2 steps', () => {
    expect(funnelConversionRate([])).toEqual([]);
    expect(funnelConversionRate([{ name: 'a', users: 100 }])).toEqual([]);
  });

  it('computes step-to-step rates', () => {
    const steps = [
      { name: 'visit', users: 1000 },
      { name: 'signup', users: 500 },
      { name: 'purchase', users: 100 },
    ];
    const rates = funnelConversionRate(steps);
    expect(approx(rates[0] ?? 0, 0.5)).toBe(true);
    expect(approx(rates[1] ?? 0, 0.2)).toBe(true);
  });

  it('returns 0 rate when step has 0 users', () => {
    const steps = [
      { name: 'a', users: 0 },
      { name: 'b', users: 100 },
    ];
    expect(funnelConversionRate(steps)[0]).toBe(0);
  });
});

describe('funnelDropoffRate', () => {
  it('returns 1 - conversionRate per transition', () => {
    const steps = [
      { name: 'a', users: 1000 },
      { name: 'b', users: 800 },
      { name: 'c', users: 200 },
    ];
    const rates = funnelDropoffRate(steps);
    expect(approx(rates[0] ?? 0, 0.2)).toBe(true);
    expect(approx(rates[1] ?? 0, 0.75)).toBe(true);
  });

  it('returns empty for < 2 steps', () => {
    expect(funnelDropoffRate([{ name: 'x', users: 10 }])).toEqual([]);
  });
});

describe('overallFunnelConversion', () => {
  it('returns last/first ratio', () => {
    const steps = [
      { name: 'top', users: 1000 },
      { name: 'mid', users: 500 },
      { name: 'bottom', users: 100 },
    ];
    expect(overallFunnelConversion(steps)).toBe(0.1);
  });

  it('returns 0 if first step has 0 users', () => {
    const steps = [
      { name: 'top', users: 0 },
      { name: 'bottom', users: 50 },
    ];
    expect(overallFunnelConversion(steps)).toBe(0);
  });

  it('returns 0 for empty steps', () => {
    expect(overallFunnelConversion([])).toBe(0);
  });

  it('single step returns ratio of 1', () => {
    expect(overallFunnelConversion([{ name: 'only', users: 100 }])).toBe(1);
  });
});

describe('funnelRevenue', () => {
  it('multiplies last step users by revenue per conversion', () => {
    const steps = [
      { name: 'visit', users: 1000 },
      { name: 'purchase', users: 50 },
    ];
    expect(funnelRevenue(steps, 29.99)).toBeCloseTo(1499.5, 1);
  });

  it('returns 0 for empty steps', () => {
    expect(funnelRevenue([], 100)).toBe(0);
  });
});

describe('funnelOptimizationPriority', () => {
  it('returns index of largest absolute drop', () => {
    const steps = [
      { name: 'a', users: 1000 },
      { name: 'b', users: 900 },   // drop 100
      { name: 'c', users: 200 },   // drop 700 ← biggest
      { name: 'd', users: 180 },   // drop 20
    ];
    expect(funnelOptimizationPriority(steps)).toBe(1); // step index 1 -> 2
  });

  it('returns -1 if < 2 steps', () => {
    expect(funnelOptimizationPriority([])).toBe(-1);
    expect(funnelOptimizationPriority([{ name: 'a', users: 10 }])).toBe(-1);
  });

  it('returns 0 when first drop is biggest', () => {
    const steps = [
      { name: 'a', users: 1000 },
      { name: 'b', users: 100 },
      { name: 'c', users: 90 },
    ];
    expect(funnelOptimizationPriority(steps)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Path analysis
// ---------------------------------------------------------------------------
describe('commonPaths', () => {
  const paths = [
    { touchpoints: ['email', 'direct'], converted: true },
    { touchpoints: ['email', 'direct'], converted: true },
    { touchpoints: ['email', 'direct'], converted: false },
    { touchpoints: ['social'], converted: true },
    { touchpoints: ['organic', 'email', 'direct'], converted: true },
  ];

  it('returns most common paths first', () => {
    const result = commonPaths(paths);
    expect(result[0]?.path).toBe('email > direct');
    expect(result[0]?.count).toBe(3);
  });

  it('computes conversion rate per path', () => {
    const result = commonPaths(paths);
    const emailDirect = result.find((r) => r.path === 'email > direct');
    expect(approx(emailDirect?.conversionRate ?? 0, 2 / 3)).toBe(true);
  });

  it('respects topN parameter', () => {
    const result = commonPaths(paths, 1);
    expect(result.length).toBe(1);
  });

  it('default topN is 10', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      touchpoints: [`ch${i}`],
      converted: true,
    }));
    expect(commonPaths(many).length).toBe(10);
  });

  it('empty paths returns empty array', () => {
    expect(commonPaths([])).toEqual([]);
  });
});

describe('assistRate', () => {
  const paths = [
    { touchpoints: ['email', 'social', 'direct'], converted: true },
    { touchpoints: ['email', 'direct'], converted: true },
    { touchpoints: ['social', 'direct'], converted: true },
    { touchpoints: ['email'], converted: true },
    { touchpoints: ['email', 'social'], converted: false },
  ];

  it('counts email assists (appears but not last)', () => {
    // Converted: 4 paths. email appears not-last in path 1, path 2. In path 4 email is last.
    // path1: email not last ✓, path2: email not last ✓, path3: no email, path4: email is last ✗
    const rate = assistRate(paths, 'email');
    expect(approx(rate, 2 / 4)).toBe(true);
  });

  it('returns 0 when no converting paths', () => {
    const noConv = [{ touchpoints: ['email'], converted: false }];
    expect(assistRate(noConv, 'email')).toBe(0);
  });

  it('returns 0 when channel never assists', () => {
    expect(assistRate(paths, 'referral')).toBe(0);
  });
});

describe('channelFirstLastRate', () => {
  const paths = [
    { touchpoints: ['email', 'direct', 'social'], converted: true },
    { touchpoints: ['email', 'social'], converted: true },
    { touchpoints: ['social', 'email'], converted: true },
    { touchpoints: ['social'], converted: false },
  ];

  it('computes first and last rates', () => {
    // Converted: 3 paths
    // email first: path1, path2 = 2/3
    // email last: path3 = 1/3
    const result = channelFirstLastRate(paths, 'email');
    expect(approx(result.firstRate, 2 / 3)).toBe(true);
    expect(approx(result.lastRate, 1 / 3)).toBe(true);
  });

  it('returns 0/0 when no converting paths', () => {
    const result = channelFirstLastRate(
      [{ touchpoints: ['email'], converted: false }],
      'email',
    );
    expect(result.firstRate).toBe(0);
    expect(result.lastRate).toBe(0);
  });
});

describe('avgTouchpointsToConvert', () => {
  it('computes mean touchpoints in converted paths', () => {
    const paths = [
      { touchpoints: ['a', 'b', 'c'], converted: true },
      { touchpoints: ['a'], converted: true },
      { touchpoints: ['a', 'b', 'c', 'd', 'e'], converted: false },
    ];
    expect(avgTouchpointsToConvert(paths)).toBe(2); // (3+1)/2
  });

  it('returns 0 if no conversions', () => {
    const paths = [{ touchpoints: ['a', 'b'], converted: false }];
    expect(avgTouchpointsToConvert(paths)).toBe(0);
  });

  it('returns 0 for empty paths', () => {
    expect(avgTouchpointsToConvert([])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. ROI and budget optimization
// ---------------------------------------------------------------------------
describe('channelROI', () => {
  it('computes (revenue - spend) / spend', () => {
    expect(channelROI(1500, 1000)).toBe(0.5);
  });
  it('returns Infinity when spend=0 and revenue>0', () => {
    expect(channelROI(100, 0)).toBe(Infinity);
  });
  it('returns -1 when both 0', () => {
    expect(channelROI(0, 0)).toBe(-1);
  });
  it('returns -1 when revenue < spend', () => {
    expect(channelROI(500, 1000)).toBe(-0.5);
  });
});

describe('marginalROI', () => {
  it('computes delta revenue / delta spend', () => {
    expect(marginalROI(1000, 1500, 500, 750)).toBe(2);
  });
  it('returns Infinity when delta spend is 0', () => {
    expect(marginalROI(1000, 1500, 500, 500)).toBe(Infinity);
  });
  it('handles negative delta', () => {
    expect(marginalROI(1500, 1000, 750, 500)).toBe(2);
  });
});

describe('budgetAllocation', () => {
  it('allocates proportionally to ROI', () => {
    const channels = [
      { name: 'email', roi: 3 },
      { name: 'social', roi: 1 },
    ];
    const result = budgetAllocation(channels, 1000);
    const email = result.get('email') ?? 0;
    const social = result.get('social') ?? 0;
    expect(approx(email, 750)).toBe(true);
    expect(approx(social, 250)).toBe(true);
  });

  it('ignores negative ROI channels', () => {
    const channels = [
      { name: 'good', roi: 2 },
      { name: 'bad', roi: -1 },
    ];
    const result = budgetAllocation(channels, 500);
    expect(result.get('bad')).toBe(0);
    expect(result.get('good')).toBeGreaterThan(0);
  });

  it('splits equally if all ROI <= 0', () => {
    const channels = [
      { name: 'a', roi: -1 },
      { name: 'b', roi: -2 },
    ];
    const result = budgetAllocation(channels, 100);
    expect(approx(result.get('a') ?? 0, 50, 1)).toBe(true);
    expect(approx(result.get('b') ?? 0, 50, 1)).toBe(true);
  });

  it('respects maxBudget constraint', () => {
    const channels = [
      { name: 'a', roi: 5, maxBudget: 100 },
      { name: 'b', roi: 1 },
    ];
    const result = budgetAllocation(channels, 1000);
    expect((result.get('a') ?? 0)).toBeLessThanOrEqual(100 + 1e-9);
  });

  it('respects minBudget constraint', () => {
    const channels = [
      { name: 'a', roi: 1, minBudget: 200 },
      { name: 'b', roi: 10 },
    ];
    const result = budgetAllocation(channels, 1000);
    expect((result.get('a') ?? 0)).toBeGreaterThanOrEqual(200 - 1e-9);
  });

  it('empty channels returns empty map', () => {
    expect(budgetAllocation([], 1000).size).toBe(0);
  });
});

describe('roas', () => {
  it('computes revenue / ad spend', () => {
    expect(roas(5000, 1000)).toBe(5);
  });
  it('returns 0 when spend is 0', () => {
    expect(roas(1000, 0)).toBe(0);
  });
  it('returns 0 when both 0', () => {
    expect(roas(0, 0)).toBe(0);
  });
});

describe('costPerAcquisition', () => {
  it('computes spend / conversions', () => {
    expect(costPerAcquisition(1000, 50)).toBe(20);
  });
  it('returns Infinity when conversions is 0', () => {
    expect(costPerAcquisition(1000, 0)).toBe(Infinity);
  });
  it('returns Infinity when spend is 0 and conversions is 0', () => {
    expect(costPerAcquisition(0, 0)).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// 7. Sports-specific attribution
// ---------------------------------------------------------------------------
describe('pickDiscoveryPath', () => {
  it('returns first as discovery, last as conversion channel', () => {
    const interactions = [
      { channel: 'organic' as const, timestamp: 1000 },
      { channel: 'email' as const, timestamp: 2000 },
      { channel: 'direct' as const, timestamp: 3000 },
    ];
    const result = pickDiscoveryPath(interactions, true);
    expect(result.discoveryChannel).toBe('organic');
    expect(result.conversionChannel).toBe('direct');
    expect(result.pathLength).toBe(3);
  });

  it('returns unknown for empty interactions', () => {
    const result = pickDiscoveryPath([], false);
    expect(result.discoveryChannel).toBe('unknown');
    expect(result.conversionChannel).toBe('unknown');
    expect(result.pathLength).toBe(0);
  });

  it('returns unknown conversion if not subscribed', () => {
    const interactions = [
      { channel: 'email' as const, timestamp: 1000 },
      { channel: 'social' as const, timestamp: 2000 },
    ];
    const result = pickDiscoveryPath(interactions, false);
    expect(result.discoveryChannel).toBe('email');
    expect(result.conversionChannel).toBe('unknown');
    expect(result.pathLength).toBe(2);
  });

  it('single interaction: discovery and conversion same channel', () => {
    const interactions = [{ channel: 'push' as const, timestamp: 1000 }];
    const result = pickDiscoveryPath(interactions, true);
    expect(result.discoveryChannel).toBe('push');
    expect(result.conversionChannel).toBe('push');
    expect(result.pathLength).toBe(1);
  });
});

describe('contentAttributedSubscriptions', () => {
  it('sums subscriptions per channel', () => {
    const content = [
      { id: '1', views: 1000, subscriptions: 10, channel: 'email' },
      { id: '2', views: 500, subscriptions: 5, channel: 'email' },
      { id: '3', views: 800, subscriptions: 8, channel: 'social' },
    ];
    const result = contentAttributedSubscriptions(content);
    expect(result.get('email')).toBe(15);
    expect(result.get('social')).toBe(8);
  });

  it('returns empty map for no content', () => {
    expect(contentAttributedSubscriptions([]).size).toBe(0);
  });

  it('single item per channel', () => {
    const content = [{ id: 'x', views: 100, subscriptions: 3, channel: 'organic' }];
    const result = contentAttributedSubscriptions(content);
    expect(result.get('organic')).toBe(3);
  });
});

describe('seasonalAttributionShift', () => {
  it('averages channel credits across months', () => {
    const monthly = [
      {
        month: 1,
        channelCredits: new Map([['email', 0.6], ['social', 0.4]]),
      },
      {
        month: 2,
        channelCredits: new Map([['email', 0.4], ['social', 0.6]]),
      },
    ];
    const result = seasonalAttributionShift(monthly);
    expect(approx(result.get('email') ?? 0, 0.5)).toBe(true);
    expect(approx(result.get('social') ?? 0, 0.5)).toBe(true);
  });

  it('handles channel appearing in only one month', () => {
    const monthly = [
      {
        month: 1,
        channelCredits: new Map([['email', 0.8], ['push', 0.2]]),
      },
      {
        month: 2,
        channelCredits: new Map([['email', 0.6]]),
      },
    ];
    const result = seasonalAttributionShift(monthly);
    // push only in month 1: average = 0.2/1 = 0.2
    expect(approx(result.get('push') ?? 0, 0.2)).toBe(true);
    // email in both: (0.8 + 0.6) / 2 = 0.7
    expect(approx(result.get('email') ?? 0, 0.7)).toBe(true);
  });

  it('returns empty map for empty input', () => {
    expect(seasonalAttributionShift([]).size).toBe(0);
  });

  it('single month returns channel credits as-is', () => {
    const monthly = [
      {
        month: 6,
        channelCredits: new Map([['organic', 0.7], ['direct', 0.3]]),
      },
    ];
    const result = seasonalAttributionShift(monthly);
    expect(approx(result.get('organic') ?? 0, 0.7)).toBe(true);
    expect(approx(result.get('direct') ?? 0, 0.3)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases and integration
// ---------------------------------------------------------------------------
describe('Edge cases', () => {
  it('firstTouchAttribution: all zeros with empty + no conversion', () => {
    const result = firstTouchAttribution([], false);
    expect([...result.values()].every((v) => v === 0)).toBe(true);
    expect(result.size).toBe(0);
  });

  it('linearAttribution: single channel, 5 appearances, sums to 1', () => {
    const tps = ['email', 'email', 'email', 'email', 'email'];
    const result = linearAttribution(tps, true);
    expect(approx(result.get('email') ?? 0, 1)).toBe(true);
  });

  it('positionBasedAttribution: duplicate first/last same channel', () => {
    const result = positionBasedAttribution(['a', 'b', 'a'], true);
    // first=a +0.4, last=a +0.4, mid=b +0.2
    expect(approx(result.get('a') ?? 0, 0.8)).toBe(true);
    expect(approx(result.get('b') ?? 0, 0.2)).toBe(true);
  });

  it('funnelConversionRate: handles equal users (no drop)', () => {
    const steps = [
      { name: 'a', users: 100 },
      { name: 'b', users: 100 },
    ];
    expect(funnelConversionRate(steps)[0]).toBe(1);
    expect(funnelDropoffRate(steps)[0]).toBe(0);
  });

  it('commonPaths: tie-breaking by path string sort', () => {
    const paths = [
      { touchpoints: ['b'], converted: true },
      { touchpoints: ['a'], converted: true },
    ];
    const result = commonPaths(paths);
    // Both count=1, tie breaks alphabetically: 'a' before 'b'
    expect(result[0]?.path).toBe('a');
    expect(result[1]?.path).toBe('b');
  });

  it('shapleyValue: all-zero characteristic fn gives all zeros', () => {
    const result = shapleyValue(['A', 'B', 'C'], () => 0);
    for (const v of result.values()) {
      expect(approx(v, 0)).toBe(true);
    }
  });

  it('budgetAllocation: single channel gets full budget', () => {
    const channels = [{ name: 'email', roi: 2 }];
    const result = budgetAllocation(channels, 500);
    expect(approx(result.get('email') ?? 0, 500)).toBe(true);
  });

  it('assistRate: channel is always last — rate is 0', () => {
    const paths = [
      { touchpoints: ['email', 'direct'], converted: true },
      { touchpoints: ['social', 'direct'], converted: true },
    ];
    expect(assistRate(paths, 'direct')).toBe(0);
  });

  it('avgTouchpointsToConvert: single touchpoint paths', () => {
    const paths = [
      { touchpoints: ['a'], converted: true },
      { touchpoints: ['b'], converted: true },
      { touchpoints: ['c'], converted: false },
    ];
    expect(avgTouchpointsToConvert(paths)).toBe(1);
  });

  it('seasonalAttributionShift: 3 months same weights → same average', () => {
    const credits = new Map([['email', 0.5], ['social', 0.5]]);
    const monthly = [1, 2, 3].map((m) => ({ month: m, channelCredits: credits }));
    const result = seasonalAttributionShift(monthly);
    expect(approx(result.get('email') ?? 0, 0.5)).toBe(true);
    expect(approx(result.get('social') ?? 0, 0.5)).toBe(true);
  });

  it('wShapedAttribution: 4 touchpoints — credits sum to 1', () => {
    const result = wShapedAttribution(['a', 'b', 'c', 'd'], true);
    const total = [...result.values()].reduce((s, v) => s + v, 0);
    expect(approx(total, 1, 1e-9)).toBe(true);
  });

  it('timeDecayAttribution: two channels, recent one dominates', () => {
    const now = 1_700_000_000_000;
    const halfLife = 7 * 24 * 60 * 60 * 1000;
    const result = timeDecayAttribution(
      ['old', 'new'],
      [now - 30 * 24 * 60 * 60 * 1000, now],
      true,
      halfLife,
    );
    expect((result.get('new') ?? 0)).toBeGreaterThan(result.get('old') ?? 0);
  });

  it('firstTouchAttribution: returns only the first channel with credit', () => {
    const result = firstTouchAttribution(
      ['organic', 'email', 'social', 'direct'],
      true,
    );
    expect(result.get('organic')).toBe(1);
    expect(result.get('email')).toBe(0);
    expect(result.get('social')).toBe(0);
    expect(result.get('direct')).toBe(0);
  });

  it('lastNonDirectAttribution: custom channel all entries are direct custom', () => {
    const result = lastNonDirectAttribution(['none', 'none', 'none'], true, 'none');
    expect(result.get('none')).toBe(1);
  });

  it('channelConversionRates: multiple channels with mixed data', () => {
    const events = [
      { channel: 'a', converted: true },
      { channel: 'a', converted: true },
      { channel: 'a', converted: false },
      { channel: 'b', converted: false },
      { channel: 'b', converted: false },
    ];
    const result = channelConversionRates(events);
    expect(approx(result.get('a') ?? 0, 2 / 3)).toBe(true);
    expect(approx(result.get('b') ?? 0, 0)).toBe(true);
  });

  it('shapleyValue: 4 players sum to grand coalition value', () => {
    const v = (c: string[]) => c.length; // each player contributes 1
    const result = shapleyValue(['A', 'B', 'C', 'D'], v);
    const total = [...result.values()].reduce((s, x) => s + x, 0);
    expect(approx(total, 4)).toBe(true);
    // symmetric: each gets 1
    for (const val of result.values()) {
      expect(approx(val, 1)).toBe(true);
    }
  });

  it('funnelOptimizationPriority: 2-step funnel, only one drop', () => {
    const steps = [{ name: 'top', users: 100 }, { name: 'bottom', users: 10 }];
    expect(funnelOptimizationPriority(steps)).toBe(0);
  });

  it('commonPaths: paths with no touchpoints are grouped as empty key', () => {
    const paths = [
      { touchpoints: [], converted: true },
      { touchpoints: [], converted: false },
    ];
    const result = commonPaths(paths);
    expect(result[0]?.count).toBe(2);
    expect(result[0]?.path).toBe('');
    expect(approx(result[0]?.conversionRate ?? 0, 0.5)).toBe(true);
  });

  it('channelFirstLastRate: no converting paths returns zeros', () => {
    const paths = [{ touchpoints: ['email', 'direct'], converted: false }];
    const result = channelFirstLastRate(paths, 'email');
    expect(result.firstRate).toBe(0);
    expect(result.lastRate).toBe(0);
  });

  it('budgetAllocation: zero ROI channel treated as non-positive', () => {
    const channels = [
      { name: 'zero', roi: 0 },
      { name: 'pos', roi: 1 },
    ];
    const result = budgetAllocation(channels, 100);
    expect(result.get('zero')).toBe(0);
    expect(approx(result.get('pos') ?? 0, 100)).toBe(true);
  });

  it('marginalROI: large positive delta', () => {
    expect(marginalROI(0, 10000, 0, 1000)).toBe(10);
  });

  it('roas: high return scenario', () => {
    expect(roas(50000, 5000)).toBe(10);
  });

  it('contentAttributedSubscriptions: channels with zero subscriptions', () => {
    const content = [
      { id: '1', views: 1000, subscriptions: 0, channel: 'social' },
      { id: '2', views: 200, subscriptions: 3, channel: 'email' },
    ];
    const result = contentAttributedSubscriptions(content);
    expect(result.get('social')).toBe(0);
    expect(result.get('email')).toBe(3);
  });

  it('pickDiscoveryPath: subscribed false empty — all unknown', () => {
    const result = pickDiscoveryPath([], true);
    expect(result.discoveryChannel).toBe('unknown');
    expect(result.conversionChannel).toBe('unknown');
    expect(result.pathLength).toBe(0);
  });
});
