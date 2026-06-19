/**
 * Attribution analytics — pure TypeScript, zero npm dependencies.
 *
 * Multi-touch attribution models, Shapley values, funnel analysis,
 * path analysis, ROI/budget optimization, and sports-specific attribution
 * for the Galaxy Sports Edge prediction platform.
 */

// ---------------------------------------------------------------------------
// 1. Single-touch attribution
// ---------------------------------------------------------------------------

/**
 * First-touch attribution: 100% credit to the first touchpoint.
 * Returns all-zero map if no conversion or no touchpoints.
 */
export function firstTouchAttribution(
  touchpoints: string[],
  conversion: boolean,
): Map<string, number> {
  const result = new Map<string, number>();
  if (!conversion || touchpoints.length === 0) {
    for (const tp of touchpoints) {
      result.set(tp, 0);
    }
    return result;
  }
  const first = touchpoints[0] ?? '';
  for (const tp of touchpoints) {
    result.set(tp, tp === first && tp !== '' ? 1 : 0);
  }
  // If for some reason first was already set from loop, ensure it's 1
  if (first !== '') {
    result.set(first, 1);
    for (const tp of touchpoints) {
      if (tp !== first) {
        if (!result.has(tp)) result.set(tp, 0);
      }
    }
  }
  return result;
}

/**
 * Last-touch attribution: 100% credit to the last touchpoint.
 * Returns all-zero map if no conversion or no touchpoints.
 */
export function lastTouchAttribution(
  touchpoints: string[],
  conversion: boolean,
): Map<string, number> {
  const result = new Map<string, number>();
  if (!conversion || touchpoints.length === 0) {
    for (const tp of touchpoints) {
      result.set(tp, 0);
    }
    return result;
  }
  const last = touchpoints[touchpoints.length - 1] ?? '';
  for (const tp of touchpoints) {
    result.set(tp, 0);
  }
  if (last !== '') {
    result.set(last, 1);
  }
  return result;
}

/**
 * Last non-direct attribution: last non-direct touch gets 100% credit.
 * Falls back to last touch if all touchpoints are direct.
 * Default directChannel = 'direct'.
 */
export function lastNonDirectAttribution(
  touchpoints: string[],
  conversion: boolean,
  directChannel = 'direct',
): Map<string, number> {
  const result = new Map<string, number>();
  if (!conversion || touchpoints.length === 0) {
    for (const tp of touchpoints) {
      result.set(tp, 0);
    }
    return result;
  }
  // Initialise all to 0
  for (const tp of touchpoints) {
    result.set(tp, 0);
  }
  // Find last non-direct
  let winner = '';
  for (let i = touchpoints.length - 1; i >= 0; i--) {
    const tp = touchpoints[i] ?? '';
    if (tp !== directChannel) {
      winner = tp;
      break;
    }
  }
  // Fall back to last touch if all direct
  if (winner === '') {
    winner = touchpoints[touchpoints.length - 1] ?? '';
  }
  if (winner !== '') {
    result.set(winner, 1);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2. Multi-touch attribution
// ---------------------------------------------------------------------------

/**
 * Linear attribution: equal credit split across all touchpoints.
 * Duplicate channels receive multiple shares.
 * Returns all-zero map if no conversion.
 */
export function linearAttribution(
  touchpoints: string[],
  conversion: boolean,
): Map<string, number> {
  const result = new Map<string, number>();
  if (!conversion || touchpoints.length === 0) {
    for (const tp of touchpoints) {
      result.set(tp, 0);
    }
    return result;
  }
  const share = 1 / touchpoints.length;
  for (const tp of touchpoints) {
    result.set(tp, (result.get(tp) ?? 0) + share);
  }
  return result;
}

/**
 * Time-decay attribution: exponential decay weighting; more recent = more credit.
 * Normalized to sum=1 (or all-zero if no conversion).
 * Default halfLife = 7 days in ms. If no timestamps, treats all equally.
 */
export function timeDecayAttribution(
  touchpoints: string[],
  timestamps: number[],
  conversion: boolean,
  halfLifeMs = 7 * 24 * 60 * 60 * 1000,
): Map<string, number> {
  const result = new Map<string, number>();
  if (!conversion || touchpoints.length === 0) {
    for (const tp of touchpoints) {
      result.set(tp, 0);
    }
    return result;
  }
  // If no timestamps or mismatched length, treat equally
  if (timestamps.length === 0 || timestamps.length !== touchpoints.length) {
    const share = 1 / touchpoints.length;
    for (const tp of touchpoints) {
      result.set(tp, (result.get(tp) ?? 0) + share);
    }
    return result;
  }
  // Conversion time is the maximum timestamp (latest event)
  const conversionTime = Math.max(...timestamps);
  const weights: number[] = touchpoints.map((_, i) => {
    const ts = timestamps[i] ?? conversionTime;
    const age = conversionTime - ts;
    return Math.pow(2, -age / halfLifeMs);
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < touchpoints.length; i++) {
    const tp = touchpoints[i] ?? '';
    const w = (weights[i] ?? 0) / total;
    result.set(tp, (result.get(tp) ?? 0) + w);
  }
  return result;
}

/**
 * Position-based attribution: first=40%, last=40%, rest=20% split equally.
 * Defaults firstPct=0.4, lastPct=0.4.
 * 1 touchpoint: 100%, 2 touchpoints: 50/50, no conversion: all 0.
 */
export function positionBasedAttribution(
  touchpoints: string[],
  conversion: boolean,
  firstPct = 0.4,
  lastPct = 0.4,
): Map<string, number> {
  const result = new Map<string, number>();
  if (!conversion || touchpoints.length === 0) {
    for (const tp of touchpoints) {
      result.set(tp, 0);
    }
    return result;
  }
  // Initialise
  for (const tp of touchpoints) {
    result.set(tp, 0);
  }
  const n = touchpoints.length;
  if (n === 1) {
    const tp = touchpoints[0] ?? '';
    result.set(tp, 1);
  } else if (n === 2) {
    const first = touchpoints[0] ?? '';
    const last = touchpoints[n - 1] ?? '';
    result.set(first, (result.get(first) ?? 0) + 0.5);
    result.set(last, (result.get(last) ?? 0) + 0.5);
  } else {
    const middle = touchpoints.slice(1, n - 1);
    const middlePct = 1 - firstPct - lastPct;
    const sharePerMiddle = middle.length > 0 ? middlePct / middle.length : 0;
    const first = touchpoints[0] ?? '';
    const last = touchpoints[n - 1] ?? '';
    result.set(first, (result.get(first) ?? 0) + firstPct);
    result.set(last, (result.get(last) ?? 0) + lastPct);
    for (const tp of middle) {
      result.set(tp, (result.get(tp) ?? 0) + sharePerMiddle);
    }
  }
  return result;
}

/**
 * W-shaped attribution: first=30%, middle=30%, last=30%, rest 10% equally.
 * Degrades gracefully: 1 touch=100%, 2 touches=45/45 with remaining 10% split.
 * No conversion: all 0.
 */
export function wShapedAttribution(
  touchpoints: string[],
  conversion: boolean,
): Map<string, number> {
  const result = new Map<string, number>();
  if (!conversion || touchpoints.length === 0) {
    for (const tp of touchpoints) {
      result.set(tp, 0);
    }
    return result;
  }
  // Initialise
  for (const tp of touchpoints) {
    result.set(tp, 0);
  }
  const n = touchpoints.length;
  if (n === 1) {
    const tp = touchpoints[0] ?? '';
    result.set(tp, 1);
  } else if (n === 2) {
    const first = touchpoints[0] ?? '';
    const last = touchpoints[n - 1] ?? '';
    result.set(first, (result.get(first) ?? 0) + 0.45);
    result.set(last, (result.get(last) ?? 0) + 0.45);
    // Remaining 10% split — no middle, so skip
    // But we still emit 0.9 total; remaining 0.1 goes equally to existing
    // "if any" clause from spec: "2 touch first/last 45/45 rest 10% if any"
    // With 2 touchpoints there's no "rest", so distribute 0.05 each
    result.set(first, (result.get(first) ?? 0) + 0.05);
    result.set(last, (result.get(last) ?? 0) + 0.05);
  } else {
    const midIdx = Math.floor((n - 1) / 2);
    const first = touchpoints[0] ?? '';
    const mid = touchpoints[midIdx] ?? '';
    const last = touchpoints[n - 1] ?? '';
    // Key positions get 30% each
    result.set(first, (result.get(first) ?? 0) + 0.3);
    result.set(mid, (result.get(mid) ?? 0) + 0.3);
    result.set(last, (result.get(last) ?? 0) + 0.3);
    // Rest get 10% split equally
    const rest: string[] = [];
    for (let i = 0; i < n; i++) {
      if (i !== 0 && i !== midIdx && i !== n - 1) {
        rest.push(touchpoints[i] ?? '');
      }
    }
    if (rest.length > 0) {
      const share = 0.1 / rest.length;
      for (const tp of rest) {
        result.set(tp, (result.get(tp) ?? 0) + share);
      }
    } else {
      // No rest touchpoints — distribute the 10% equally among the 3 key positions
      const bonus = 0.1 / 3;
      result.set(first, (result.get(first) ?? 0) + bonus);
      result.set(mid, (result.get(mid) ?? 0) + bonus);
      result.set(last, (result.get(last) ?? 0) + bonus);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 3. Data-driven attribution helpers
// ---------------------------------------------------------------------------

/**
 * Compute Shapley values for each player using exact formula over all subsets.
 * Supports up to 5 players (performance constraint).
 */
export function shapleyValue(
  players: string[],
  characteristicFn: (coalition: string[]) => number,
): Map<string, number> {
  const result = new Map<string, number>();
  const n = players.length;
  if (n === 0) return result;

  // Generate all subsets as bitmasks
  const factorial = (k: number): number => (k <= 1 ? 1 : k * factorial(k - 1));

  for (let pi = 0; pi < n; pi++) {
    const player = players[pi] ?? '';
    let value = 0;
    // Iterate over all subsets not containing player
    for (let mask = 0; mask < (1 << n); mask++) {
      if (mask & (1 << pi)) continue; // skip subsets containing player
      const sSize = bitCount(mask);
      const weight =
        (factorial(sSize) * factorial(n - sSize - 1)) / factorial(n);
      // Coalition S
      const coalition: string[] = [];
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) coalition.push(players[j] ?? '');
      }
      const vS = characteristicFn(coalition);
      const vSWithPlayer = characteristicFn([...coalition, player]);
      value += weight * (vSWithPlayer - vS);
    }
    result.set(player, value);
  }
  return result;
}

function bitCount(n: number): number {
  let count = 0;
  while (n > 0) {
    count += n & 1;
    n >>= 1;
  }
  return count;
}

/**
 * Conversion rate: conversions / visitors. Returns 0 if visitors = 0.
 */
export function conversionRate(conversions: number, visitors: number): number {
  if (visitors === 0) return 0;
  return conversions / visitors;
}

/**
 * Channel conversion rates: conversion rate per channel.
 */
export function channelConversionRates(
  events: { channel: string; converted: boolean }[],
): Map<string, number> {
  const totals = new Map<string, number>();
  const converts = new Map<string, number>();
  for (const e of events) {
    totals.set(e.channel, (totals.get(e.channel) ?? 0) + 1);
    if (e.converted) {
      converts.set(e.channel, (converts.get(e.channel) ?? 0) + 1);
    }
  }
  const result = new Map<string, number>();
  for (const [channel, total] of totals.entries()) {
    result.set(channel, (converts.get(channel) ?? 0) / total);
  }
  return result;
}

/**
 * Attributed revenue: multiply each channel's credit by total revenue.
 */
export function attributedRevenue(
  attribution: Map<string, number>,
  totalRevenue: number,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const [channel, credit] of attribution.entries()) {
    result.set(channel, credit * totalRevenue);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. Funnel analytics
// ---------------------------------------------------------------------------

export type FunnelStep = { name: string; users: number };

/**
 * Funnel conversion rates: rate from step i to step i+1.
 * Empty array if < 2 steps.
 */
export function funnelConversionRate(steps: FunnelStep[]): number[] {
  if (steps.length < 2) return [];
  const rates: number[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i] ?? { name: '', users: 0 };
    const next = steps[i + 1] ?? { name: '', users: 0 };
    rates.push(current.users === 0 ? 0 : next.users / current.users);
  }
  return rates;
}

/**
 * Funnel dropoff rates: 1 - conversionRate per step transition.
 */
export function funnelDropoffRate(steps: FunnelStep[]): number[] {
  return funnelConversionRate(steps).map((r) => 1 - r);
}

/**
 * Overall funnel conversion: top to bottom. 0 if first step users = 0.
 */
export function overallFunnelConversion(steps: FunnelStep[]): number {
  if (steps.length === 0) return 0;
  const first = steps[0] ?? { name: '', users: 0 };
  const last = steps[steps.length - 1] ?? { name: '', users: 0 };
  if (first.users === 0) return 0;
  return last.users / first.users;
}

/**
 * Funnel revenue: last step users × revenue per conversion.
 */
export function funnelRevenue(
  steps: FunnelStep[],
  revenuePerConversion: number,
): number {
  if (steps.length === 0) return 0;
  const last = steps[steps.length - 1] ?? { name: '', users: 0 };
  return last.users * revenuePerConversion;
}

/**
 * Funnel optimization priority: index of the step with the largest absolute
 * user drop (most users lost). Returns -1 if < 2 steps.
 */
export function funnelOptimizationPriority(steps: FunnelStep[]): number {
  if (steps.length < 2) return -1;
  let maxDrop = -Infinity;
  let idx = 0;
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i] ?? { name: '', users: 0 };
    const next = steps[i + 1] ?? { name: '', users: 0 };
    const drop = current.users - next.users;
    if (drop > maxDrop) {
      maxDrop = drop;
      idx = i;
    }
  }
  return idx;
}

// ---------------------------------------------------------------------------
// 5. Path analysis
// ---------------------------------------------------------------------------

export type ConversionPath = {
  touchpoints: string[];
  converted: boolean;
  revenue?: number;
};

/**
 * Common paths: group paths by joined touchpoints (e.g. "email > social > direct"),
 * return topN most common with conversion rate. Default topN = 10.
 */
export function commonPaths(
  paths: ConversionPath[],
  topN = 10,
): { path: string; count: number; conversionRate: number }[] {
  const countMap = new Map<string, number>();
  const convMap = new Map<string, number>();
  for (const p of paths) {
    const key = p.touchpoints.join(' > ');
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
    if (p.converted) {
      convMap.set(key, (convMap.get(key) ?? 0) + 1);
    }
  }
  const entries = Array.from(countMap.entries()).map(([path, count]) => ({
    path,
    count,
    conversionRate: (convMap.get(path) ?? 0) / count,
  }));
  entries.sort((a, b) => b.count - a.count || a.path.localeCompare(b.path));
  return entries.slice(0, topN);
}

/**
 * Assist rate: % of converting paths where channel appears but isn't the last touchpoint.
 */
export function assistRate(
  paths: ConversionPath[],
  channel: string,
): number {
  const convertedPaths = paths.filter((p) => p.converted);
  if (convertedPaths.length === 0) return 0;
  let assists = 0;
  for (const p of convertedPaths) {
    const last = p.touchpoints[p.touchpoints.length - 1];
    const appearsNotLast =
      p.touchpoints.includes(channel) && last !== channel;
    if (appearsNotLast) assists++;
  }
  return assists / convertedPaths.length;
}

/**
 * Channel first/last rate: % of converting paths where channel is first / last touch.
 */
export function channelFirstLastRate(
  paths: ConversionPath[],
  channel: string,
): { firstRate: number; lastRate: number } {
  const convertedPaths = paths.filter((p) => p.converted);
  if (convertedPaths.length === 0) return { firstRate: 0, lastRate: 0 };
  let firstCount = 0;
  let lastCount = 0;
  for (const p of convertedPaths) {
    const first = p.touchpoints[0] ?? '';
    const last = p.touchpoints[p.touchpoints.length - 1] ?? '';
    if (first === channel) firstCount++;
    if (last === channel) lastCount++;
  }
  return {
    firstRate: firstCount / convertedPaths.length,
    lastRate: lastCount / convertedPaths.length,
  };
}

/**
 * Average touchpoints to convert: mean touchpoints in converted paths.
 * Returns 0 if no conversions.
 */
export function avgTouchpointsToConvert(paths: ConversionPath[]): number {
  const converted = paths.filter((p) => p.converted);
  if (converted.length === 0) return 0;
  const total = converted.reduce((sum, p) => sum + p.touchpoints.length, 0);
  return total / converted.length;
}

// ---------------------------------------------------------------------------
// 6. ROI and budget optimization
// ---------------------------------------------------------------------------

/**
 * Channel ROI: (revenue - spend) / spend.
 * Infinity if spend=0 and revenue>0. -1 if both=0.
 */
export function channelROI(revenue: number, spend: number): number {
  if (spend === 0 && revenue > 0) return Infinity;
  if (spend === 0 && revenue === 0) return -1;
  return (revenue - spend) / spend;
}

/**
 * Marginal ROI: (ΔRevenue) / (ΔSpend). Infinity if ΔSpend=0.
 */
export function marginalROI(
  revenueAtSpend1: number,
  revenueAtSpend2: number,
  spend1: number,
  spend2: number,
): number {
  const dSpend = spend2 - spend1;
  if (dSpend === 0) return Infinity;
  return (revenueAtSpend2 - revenueAtSpend1) / dSpend;
}

/**
 * Budget allocation: allocate proportionally to ROI (ignore negative ROI channels).
 * Respect min/max constraints. If all ROI ≤ 0, split equally.
 */
export function budgetAllocation(
  channels: {
    name: string;
    roi: number;
    minBudget?: number;
    maxBudget?: number;
  }[],
  totalBudget: number,
): Map<string, number> {
  const result = new Map<string, number>();
  if (channels.length === 0) return result;

  const positiveChannels = channels.filter((c) => c.roi > 0);

  if (positiveChannels.length === 0) {
    // Split equally among all channels
    const share = totalBudget / channels.length;
    for (const c of channels) {
      const min = c.minBudget ?? 0;
      const max = c.maxBudget ?? Infinity;
      result.set(c.name, Math.min(Math.max(share, min), max));
    }
    return result;
  }

  // Allocate minimums first
  let remaining = totalBudget;
  const mins = new Map<string, number>();
  for (const c of channels) {
    const min = c.minBudget ?? 0;
    mins.set(c.name, min);
    result.set(c.name, 0);
  }
  // Give all positive-ROI channels their minimum
  for (const c of positiveChannels) {
    const min = mins.get(c.name) ?? 0;
    result.set(c.name, min);
    remaining -= min;
  }
  // Non-positive channels get 0 (or their minimum if specified? task says ignore negative)
  // per spec: "ignore negative ROI channels" — they get 0
  for (const c of channels) {
    if (c.roi <= 0 && !(result.get(c.name) ?? 0)) {
      result.set(c.name, 0);
    }
  }

  // Distribute remaining proportionally by ROI among positive channels
  const totalROI = positiveChannels.reduce((sum, c) => sum + c.roi, 0);
  const extras = new Map<string, number>();
  for (const c of positiveChannels) {
    const weight = c.roi / totalROI;
    extras.set(c.name, weight * remaining);
  }

  // Apply max constraints, redistributing overflow
  let iterations = 0;
  let capped: string[] = [];
  do {
    capped = [];
    let overflow = 0;
    let freeROI = 0;
    for (const c of positiveChannels) {
      const alloc = (result.get(c.name) ?? 0) + (extras.get(c.name) ?? 0);
      const max = c.maxBudget ?? Infinity;
      if (alloc > max) {
        const capAlloc = max - (mins.get(c.name) ?? 0);
        overflow += (extras.get(c.name) ?? 0) - Math.max(capAlloc, 0);
        extras.set(c.name, Math.max(capAlloc, 0));
        capped.push(c.name);
      } else {
        freeROI += c.roi;
      }
    }
    if (overflow > 0 && freeROI > 0) {
      for (const c of positiveChannels) {
        if (!capped.includes(c.name)) {
          extras.set(
            c.name,
            (extras.get(c.name) ?? 0) + (c.roi / freeROI) * overflow,
          );
        }
      }
    } else {
      break;
    }
    iterations++;
  } while (iterations < 100);

  for (const c of positiveChannels) {
    result.set(c.name, (mins.get(c.name) ?? 0) + (extras.get(c.name) ?? 0));
  }

  return result;
}

/**
 * ROAS: revenue / ad spend. Returns 0 if spend = 0.
 */
export function roas(revenue: number, adSpend: number): number {
  if (adSpend === 0) return 0;
  return revenue / adSpend;
}

/**
 * Cost per acquisition: spend / conversions. Infinity if conversions = 0.
 */
export function costPerAcquisition(spend: number, conversions: number): number {
  if (conversions === 0) return Infinity;
  return spend / conversions;
}

// ---------------------------------------------------------------------------
// 7. Sports-specific attribution
// ---------------------------------------------------------------------------

export type PickChannel =
  | 'organic'
  | 'email'
  | 'social'
  | 'direct'
  | 'referral'
  | 'push';

/**
 * Pick discovery path: first touch = discovery, last touch = conversion.
 * pathLength = total interactions. 'unknown' if empty.
 */
export function pickDiscoveryPath(
  interactions: { channel: PickChannel; timestamp: number }[],
  subscribed: boolean,
): { discoveryChannel: string; conversionChannel: string; pathLength: number } {
  if (interactions.length === 0) {
    return {
      discoveryChannel: 'unknown',
      conversionChannel: 'unknown',
      pathLength: 0,
    };
  }
  const first = interactions[0] ?? { channel: 'organic' as PickChannel, timestamp: 0 };
  const last = interactions[interactions.length - 1] ?? first;
  return {
    discoveryChannel: first.channel,
    conversionChannel: subscribed ? last.channel : 'unknown',
    pathLength: interactions.length,
  };
}

/**
 * Content attributed subscriptions: total attributed subscriptions per channel
 * (sum subscriptions per channel).
 */
export function contentAttributedSubscriptions(
  content: { id: string; views: number; subscriptions: number; channel: string }[],
): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of content) {
    result.set(item.channel, (result.get(item.channel) ?? 0) + item.subscriptions);
  }
  return result;
}

/**
 * Seasonal attribution shift: average attribution weight per channel across all months.
 * Weight = total credit / total months with data for that channel.
 */
export function seasonalAttributionShift(
  monthly: { month: number; channelCredits: Map<string, number> }[],
): Map<string, number> {
  const totalCredit = new Map<string, number>();
  const monthCount = new Map<string, number>();
  for (const m of monthly) {
    for (const [channel, credit] of m.channelCredits.entries()) {
      totalCredit.set(channel, (totalCredit.get(channel) ?? 0) + credit);
      monthCount.set(channel, (monthCount.get(channel) ?? 0) + 1);
    }
  }
  const result = new Map<string, number>();
  for (const [channel, total] of totalCredit.entries()) {
    result.set(channel, total / (monthCount.get(channel) ?? 1));
  }
  return result;
}
