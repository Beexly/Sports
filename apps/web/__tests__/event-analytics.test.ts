import { describe, it, expect } from 'vitest';
import {
  StreamEvent,
  filterByType,
  filterByTimeRange,
  groupByType,
  sortByTime,
  eventCount,
  eventRate,
  tumblingWindow,
  slidingWindow,
  sessionWindow,
  countWindow,
  windowAggregation,
  runningMean,
  runningVariance,
  exponentialMovingAverage,
  bollingerBands,
  rsiStream,
  zScoreAnomaly,
  isoForestScore,
  medAbsoluteDeviation,
  robustZScore,
  changePointDetection,
  frequentPatterns,
  prefixPatterns,
  eventCoOccurrence,
  longestCommonSubsequence,
  patternFrequency,
  gameEventTimeline,
  scoringRunDetector,
  momentumSwitch,
  injuryImpactWindow,
  oddsMovementStream,
  eventSummary,
  periodComparison,
  topEventTypes,
  valueSummaryByType,
} from '@/lib/analytics/event-analytics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ev(
  type: string,
  timestamp: number,
  value?: number,
  metadata?: Record<string, string | number | boolean>
): StreamEvent {
  const e: StreamEvent = { type, timestamp };
  if (value !== undefined) e.value = value;
  if (metadata !== undefined) e.metadata = metadata;
  return e;
}

// ===========================================================================
// 1. Event stream basics
// ===========================================================================

describe('filterByType', () => {
  it('keeps only matching types', () => {
    const events = [ev('a', 1), ev('b', 2), ev('a', 3), ev('c', 4)];
    expect(filterByType(events, ['a']).map((e) => e.type)).toEqual(['a', 'a']);
  });

  it('matches multiple types', () => {
    const events = [ev('a', 1), ev('b', 2), ev('c', 3)];
    expect(filterByType(events, ['a', 'c']).length).toBe(2);
  });

  it('empty events returns empty', () => {
    expect(filterByType([], ['a'])).toEqual([]);
  });

  it('empty types list returns empty', () => {
    expect(filterByType([ev('a', 1)], [])).toEqual([]);
  });

  it('no matches returns empty', () => {
    expect(filterByType([ev('a', 1)], ['z'])).toEqual([]);
  });

  it('duplicate types in list still works', () => {
    const events = [ev('a', 1), ev('a', 2)];
    expect(filterByType(events, ['a', 'a']).length).toBe(2);
  });

  it('does not mutate original array', () => {
    const events = [ev('a', 1), ev('b', 2)];
    filterByType(events, ['a']);
    expect(events.length).toBe(2);
  });
});

describe('filterByTimeRange', () => {
  it('inclusive on both ends', () => {
    const events = [ev('a', 10), ev('a', 20), ev('a', 30)];
    expect(filterByTimeRange(events, 10, 30).length).toBe(3);
  });

  it('excludes outside range', () => {
    const events = [ev('a', 5), ev('a', 15), ev('a', 25)];
    expect(filterByTimeRange(events, 10, 20).map((e) => e.timestamp)).toEqual([15]);
  });

  it('start equals end keeps exact timestamp', () => {
    const events = [ev('a', 10), ev('a', 11)];
    expect(filterByTimeRange(events, 10, 10).length).toBe(1);
  });

  it('empty events returns empty', () => {
    expect(filterByTimeRange([], 0, 100)).toEqual([]);
  });

  it('inverted range (start > end) returns empty', () => {
    const events = [ev('a', 10)];
    expect(filterByTimeRange(events, 20, 5)).toEqual([]);
  });

  it('negative timestamps supported', () => {
    const events = [ev('a', -10), ev('a', 0), ev('a', 10)];
    expect(filterByTimeRange(events, -10, 0).length).toBe(2);
  });
});

describe('groupByType', () => {
  it('groups events by type', () => {
    const events = [ev('a', 1), ev('b', 2), ev('a', 3)];
    const m = groupByType(events);
    expect(m.get('a')?.length).toBe(2);
    expect(m.get('b')?.length).toBe(1);
  });

  it('empty events returns empty map', () => {
    expect(groupByType([]).size).toBe(0);
  });

  it('single type', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 3)];
    const m = groupByType(events);
    expect(m.size).toBe(1);
    expect(m.get('a')?.length).toBe(3);
  });

  it('preserves order within group', () => {
    const events = [ev('a', 3), ev('a', 1), ev('a', 2)];
    const m = groupByType(events);
    expect(m.get('a')?.map((e) => e.timestamp)).toEqual([3, 1, 2]);
  });
});

describe('sortByTime', () => {
  it('sorts ascending', () => {
    const events = [ev('a', 3), ev('b', 1), ev('c', 2)];
    expect(sortByTime(events).map((e) => e.timestamp)).toEqual([1, 2, 3]);
  });

  it('returns new array, does not mutate', () => {
    const events = [ev('a', 3), ev('b', 1)];
    const sorted = sortByTime(events);
    expect(sorted).not.toBe(events);
    expect(events.map((e) => e.timestamp)).toEqual([3, 1]);
  });

  it('empty returns empty', () => {
    expect(sortByTime([])).toEqual([]);
  });

  it('single element', () => {
    expect(sortByTime([ev('a', 5)]).map((e) => e.timestamp)).toEqual([5]);
  });

  it('already sorted stays sorted', () => {
    const events = [ev('a', 1), ev('b', 2), ev('c', 3)];
    expect(sortByTime(events).map((e) => e.timestamp)).toEqual([1, 2, 3]);
  });

  it('handles equal timestamps', () => {
    const events = [ev('a', 1), ev('b', 1), ev('c', 1)];
    expect(sortByTime(events).length).toBe(3);
  });

  it('handles negative timestamps', () => {
    const events = [ev('a', 5), ev('b', -5), ev('c', 0)];
    expect(sortByTime(events).map((e) => e.timestamp)).toEqual([-5, 0, 5]);
  });
});

describe('eventCount', () => {
  it('total count without type', () => {
    expect(eventCount([ev('a', 1), ev('b', 2)])).toBe(2);
  });

  it('count for a specific type', () => {
    const events = [ev('a', 1), ev('b', 2), ev('a', 3)];
    expect(eventCount(events, 'a')).toBe(2);
  });

  it('count of nonexistent type is 0', () => {
    expect(eventCount([ev('a', 1)], 'z')).toBe(0);
  });

  it('empty events is 0', () => {
    expect(eventCount([])).toBe(0);
  });

  it('empty events with type is 0', () => {
    expect(eventCount([], 'a')).toBe(0);
  });
});

describe('eventRate', () => {
  it('empty events returns 0', () => {
    expect(eventRate([])).toBe(0);
  });

  it('computes rate within default window', () => {
    // 60 events spanning the last 60 seconds -> 1 per second
    const events: StreamEvent[] = [];
    for (let i = 0; i < 60; i++) events.push(ev('a', i * 1000));
    // maxTs = 59000, windowStart = 59000 - 60000 = -1000, all 60 in window
    expect(eventRate(events)).toBeCloseTo(60 / 60, 5);
  });

  it('custom window', () => {
    const events = [ev('a', 0), ev('a', 5000), ev('a', 10000)];
    // windowMs = 10000, maxTs = 10000, windowStart = 0, > 0 excludes first
    const rate = eventRate(events, 10000);
    // events at 5000 and 10000 (> 0 and <= 10000) = 2 in 10s = 0.2
    expect(rate).toBeCloseTo(0.2, 5);
  });

  it('single event', () => {
    // single event at t=0, windowStart = -60000, in window -> 1 / 60
    expect(eventRate([ev('a', 0)])).toBeCloseTo(1 / 60, 5);
  });

  it('events outside window excluded', () => {
    const events = [ev('a', 0), ev('a', 100000)];
    // maxTs=100000, window default 60000, windowStart=40000; only 100000 counts
    expect(eventRate(events)).toBeCloseTo(1 / 60, 5);
  });
});

// ===========================================================================
// 2. Windowing operations
// ===========================================================================

describe('tumblingWindow', () => {
  it('empty events returns empty', () => {
    expect(tumblingWindow([], 1000)).toEqual([]);
  });

  it('zero window size returns empty', () => {
    expect(tumblingWindow([ev('a', 1)], 0)).toEqual([]);
  });

  it('negative window size returns empty', () => {
    expect(tumblingWindow([ev('a', 1)], -100)).toEqual([]);
  });

  it('non-overlapping windows partition events', () => {
    const events = [ev('a', 0), ev('a', 500), ev('a', 1000), ev('a', 1500)];
    const windows = tumblingWindow(events, 1000);
    // window [0,1000): t=0,500 ; window [1000,2000): t=1000,1500
    expect(windows.length).toBe(2);
    expect(windows[0]!.map((e) => e.timestamp)).toEqual([0, 500]);
    expect(windows[1]!.map((e) => e.timestamp)).toEqual([1000, 1500]);
  });

  it('single event one window', () => {
    const windows = tumblingWindow([ev('a', 5)], 1000);
    expect(windows.length).toBe(1);
    expect(windows[0]!.length).toBe(1);
  });

  it('all events in one window when window is large', () => {
    const events = [ev('a', 0), ev('a', 100), ev('a', 200)];
    const windows = tumblingWindow(events, 100000);
    expect(windows.length).toBe(1);
    expect(windows[0]!.length).toBe(3);
  });

  it('every event covered exactly once', () => {
    const events = [ev('a', 0), ev('a', 1000), ev('a', 2000), ev('a', 3000)];
    const windows = tumblingWindow(events, 1000);
    const total = windows.reduce((sum, w) => sum + w.length, 0);
    expect(total).toBe(4);
  });

  it('produces empty windows for gaps', () => {
    const events = [ev('a', 0), ev('a', 5000)];
    const windows = tumblingWindow(events, 1000);
    // windows from 0 covering up to 5000; window covering 5000 must exist
    const total = windows.reduce((s, w) => s + w.length, 0);
    expect(total).toBe(2);
  });
});

describe('slidingWindow', () => {
  it('empty events returns empty', () => {
    expect(slidingWindow([], 1000, 500)).toEqual([]);
  });

  it('zero window size returns empty', () => {
    expect(slidingWindow([ev('a', 1)], 0, 500)).toEqual([]);
  });

  it('zero step returns empty (guards infinite loop)', () => {
    expect(slidingWindow([ev('a', 1)], 1000, 0)).toEqual([]);
  });

  it('negative step returns empty', () => {
    expect(slidingWindow([ev('a', 1)], 1000, -100)).toEqual([]);
  });

  it('overlapping windows', () => {
    const events = [ev('a', 0), ev('a', 500), ev('a', 1000)];
    const windows = slidingWindow(events, 1000, 500);
    // starts: 0, 500, 1000 (<= maxTs 1000)
    expect(windows.length).toBe(3);
    // window at 0: [0,1000) -> 0,500
    expect(windows[0]!.map((e) => e.timestamp)).toEqual([0, 500]);
    // window at 500: [500,1500) -> 500,1000
    expect(windows[1]!.map((e) => e.timestamp)).toEqual([500, 1000]);
  });

  it('terminates with small step and large span', () => {
    const events = [ev('a', 0), ev('a', 10000)];
    const windows = slidingWindow(events, 1000, 1000);
    // starts 0..10000 step 1000 -> 11 windows
    expect(windows.length).toBe(11);
  });

  it('single event one window', () => {
    const windows = slidingWindow([ev('a', 0)], 1000, 500);
    expect(windows.length).toBe(1);
    expect(windows[0]!.length).toBe(1);
  });
});

describe('sessionWindow', () => {
  it('empty events returns empty', () => {
    expect(sessionWindow([], 1000)).toEqual([]);
  });

  it('single session when gaps small', () => {
    const events = [ev('a', 0), ev('a', 100), ev('a', 200)];
    const sessions = sessionWindow(events, 1000);
    expect(sessions.length).toBe(1);
    expect(sessions[0]!.length).toBe(3);
  });

  it('splits sessions on large gaps', () => {
    const events = [ev('a', 0), ev('a', 100), ev('a', 5000), ev('a', 5100)];
    const sessions = sessionWindow(events, 1000);
    expect(sessions.length).toBe(2);
    expect(sessions[0]!.length).toBe(2);
    expect(sessions[1]!.length).toBe(2);
  });

  it('gap exactly equal to gapMs stays in same session', () => {
    const events = [ev('a', 0), ev('a', 1000)];
    // diff = 1000, not > 1000, same session
    expect(sessionWindow(events, 1000).length).toBe(1);
  });

  it('gap just over gapMs splits', () => {
    const events = [ev('a', 0), ev('a', 1001)];
    expect(sessionWindow(events, 1000).length).toBe(2);
  });

  it('single event one session', () => {
    expect(sessionWindow([ev('a', 5)], 1000).length).toBe(1);
  });

  it('sorts before sessionizing', () => {
    const events = [ev('a', 5000), ev('a', 0), ev('a', 100)];
    const sessions = sessionWindow(events, 1000);
    expect(sessions.length).toBe(2);
  });

  it('zero gap splits all distinct timestamps', () => {
    const events = [ev('a', 0), ev('a', 1), ev('a', 2)];
    expect(sessionWindow(events, 0).length).toBe(3);
  });
});

describe('countWindow', () => {
  it('empty events returns empty', () => {
    expect(countWindow([], 2)).toEqual([]);
  });

  it('zero count returns empty', () => {
    expect(countWindow([ev('a', 1)], 0)).toEqual([]);
  });

  it('negative count returns empty', () => {
    expect(countWindow([ev('a', 1)], -2)).toEqual([]);
  });

  it('partitions into fixed-size windows', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 3), ev('a', 4)];
    const windows = countWindow(events, 2);
    expect(windows.length).toBe(2);
    expect(windows[0]!.length).toBe(2);
    expect(windows[1]!.length).toBe(2);
  });

  it('last window may be smaller', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 3)];
    const windows = countWindow(events, 2);
    expect(windows.length).toBe(2);
    expect(windows[1]!.length).toBe(1);
  });

  it('count larger than length yields one window', () => {
    const events = [ev('a', 1), ev('a', 2)];
    const windows = countWindow(events, 10);
    expect(windows.length).toBe(1);
    expect(windows[0]!.length).toBe(2);
  });

  it('count of 1 yields one window per event', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 3)];
    expect(countWindow(events, 1).length).toBe(3);
  });
});

describe('windowAggregation', () => {
  it('applies aggregator to each window', () => {
    const windows = [[ev('a', 1), ev('a', 2)], [ev('a', 3)]];
    const result = windowAggregation(windows, (es) => es.length);
    expect(result).toEqual([2, 1]);
  });

  it('empty windows returns empty', () => {
    expect(windowAggregation([], (es) => es.length)).toEqual([]);
  });

  it('aggregator summing values', () => {
    const windows = [[ev('a', 1, 10), ev('a', 2, 20)]];
    const result = windowAggregation(windows, (es) =>
      es.reduce((s, e) => s + (e.value ?? 0), 0)
    );
    expect(result).toEqual([30]);
  });

  it('window with empty array', () => {
    const result = windowAggregation([[]], (es) => es.length);
    expect(result).toEqual([0]);
  });
});

// ===========================================================================
// 3. Statistical stream analytics
// ===========================================================================

describe('runningMean', () => {
  it('empty returns empty', () => {
    expect(runningMean([])).toEqual([]);
  });

  it('single value', () => {
    expect(runningMean([5])).toEqual([5]);
  });

  it('cumulative means', () => {
    expect(runningMean([1, 2, 3])).toEqual([1, 1.5, 2]);
  });

  it('handles negatives', () => {
    expect(runningMean([-2, 2])).toEqual([-2, 0]);
  });

  it('all zeros', () => {
    expect(runningMean([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('length matches input', () => {
    expect(runningMean([1, 2, 3, 4, 5]).length).toBe(5);
  });
});

describe('runningVariance', () => {
  it('empty returns empty', () => {
    expect(runningVariance([])).toEqual([]);
  });

  it('single value has variance 0', () => {
    expect(runningVariance([5])).toEqual([0]);
  });

  it('first element variance is 0', () => {
    expect(runningVariance([1, 2, 3])[0]).toBe(0);
  });

  it('population variance for constant is 0', () => {
    const r = runningVariance([4, 4, 4, 4]);
    expect(r.every((x) => x === 0)).toBe(true);
  });

  it('population variance of [1,2,3]', () => {
    // mean=2, pop var = ((1)+(0)+(1))/3 = 2/3
    const r = runningVariance([1, 2, 3]);
    expect(r[2]).toBeCloseTo(2 / 3, 6);
  });

  it('two-element variance', () => {
    // [2,4] mean=3, pop var = (1+1)/2 = 1
    const r = runningVariance([2, 4]);
    expect(r[1]).toBeCloseTo(1, 6);
  });

  it('length matches input', () => {
    expect(runningVariance([1, 2, 3, 4]).length).toBe(4);
  });
});

describe('exponentialMovingAverage', () => {
  it('empty returns empty', () => {
    expect(exponentialMovingAverage([], 0.5)).toEqual([]);
  });

  it('first value equals first input', () => {
    expect(exponentialMovingAverage([10, 20], 0.5)[0]).toBe(10);
  });

  it('alpha 1 tracks input exactly', () => {
    expect(exponentialMovingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });

  it('alpha computation', () => {
    // ema[1] = 0.5*20 + 0.5*10 = 15
    const r = exponentialMovingAverage([10, 20], 0.5);
    expect(r[1]).toBeCloseTo(15, 6);
  });

  it('single value', () => {
    expect(exponentialMovingAverage([7], 0.3)).toEqual([7]);
  });

  it('length matches input', () => {
    expect(exponentialMovingAverage([1, 2, 3, 4], 0.2).length).toBe(4);
  });

  it('constant series stays constant', () => {
    const r = exponentialMovingAverage([5, 5, 5], 0.4);
    expect(r).toEqual([5, 5, 5]);
  });
});

describe('bollingerBands', () => {
  it('empty returns empty arrays', () => {
    const b = bollingerBands([], 3);
    expect(b.upper).toEqual([]);
    expect(b.middle).toEqual([]);
    expect(b.lower).toEqual([]);
  });

  it('single value: middle equals value, bands equal value (std 0)', () => {
    const b = bollingerBands([10], 3);
    expect(b.middle).toEqual([10]);
    expect(b.upper).toEqual([10]);
    expect(b.lower).toEqual([10]);
  });

  it('middle is rolling SMA', () => {
    const b = bollingerBands([1, 2, 3], 2);
    // i=0: [1] mean 1; i=1: [1,2] mean 1.5; i=2: [2,3] mean 2.5
    expect(b.middle).toEqual([1, 1.5, 2.5]);
  });

  it('upper >= middle >= lower', () => {
    const b = bollingerBands([1, 5, 2, 8, 3], 3);
    for (let i = 0; i < b.middle.length; i++) {
      expect(b.upper[i]!).toBeGreaterThanOrEqual(b.middle[i]!);
      expect(b.middle[i]!).toBeGreaterThanOrEqual(b.lower[i]!);
    }
  });

  it('custom numStdDev widens bands', () => {
    const narrow = bollingerBands([1, 2, 3, 4], 4, 1);
    const wide = bollingerBands([1, 2, 3, 4], 4, 3);
    const last = narrow.upper.length - 1;
    expect(wide.upper[last]!).toBeGreaterThan(narrow.upper[last]!);
  });

  it('lengths match input', () => {
    const b = bollingerBands([1, 2, 3, 4, 5], 3);
    expect(b.upper.length).toBe(5);
    expect(b.middle.length).toBe(5);
    expect(b.lower.length).toBe(5);
  });

  it('constant series has zero-width bands', () => {
    const b = bollingerBands([7, 7, 7, 7], 2);
    expect(b.upper).toEqual([7, 7, 7, 7]);
    expect(b.lower).toEqual([7, 7, 7, 7]);
  });
});

describe('rsiStream', () => {
  it('empty returns empty', () => {
    expect(rsiStream([])).toEqual([]);
  });

  it('insufficient data returns all zeros', () => {
    const r = rsiStream([1, 2, 3], 14);
    expect(r.length).toBe(3);
    expect(r.every((x) => x === 0)).toBe(true);
  });

  it('strictly increasing series gives RSI 100', () => {
    const values = Array.from({ length: 20 }, (_, i) => i);
    const r = rsiStream(values, 14);
    // no losses -> RSI = 100 from index period onward
    expect(r[14]).toBe(100);
    expect(r[19]).toBe(100);
  });

  it('strictly decreasing series gives RSI near 0', () => {
    const values = Array.from({ length: 20 }, (_, i) => 100 - i);
    const r = rsiStream(values, 14);
    // all losses -> avgGain 0 -> rs 0 -> RSI = 0
    expect(r[14]).toBeCloseTo(0, 6);
  });

  it('length matches input', () => {
    expect(rsiStream(Array.from({ length: 30 }, (_, i) => i), 14).length).toBe(30);
  });

  it('values before period are 0', () => {
    const values = Array.from({ length: 20 }, (_, i) => i);
    const r = rsiStream(values, 14);
    for (let i = 0; i < 14; i++) expect(r[i]).toBe(0);
  });

  it('default period 14', () => {
    const values = Array.from({ length: 16 }, (_, i) => i);
    const r = rsiStream(values);
    expect(r[15]).toBe(100);
  });

  it('rsi within 0..100 for mixed series', () => {
    const values = [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9];
    const r = rsiStream(values, 14);
    for (const x of r) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
    }
  });
});

// ===========================================================================
// 4. Anomaly detection
// ===========================================================================

describe('zScoreAnomaly', () => {
  it('empty returns empty', () => {
    expect(zScoreAnomaly([])).toEqual([]);
  });

  it('first two values always false', () => {
    const r = zScoreAnomaly([100, -100, 0, 0]);
    expect(r[0]).toBe(false);
    expect(r[1]).toBe(false);
  });

  it('detects a clear outlier (against non-degenerate history)', () => {
    // history has natural variance so std > 0; the spike is far beyond it
    const values = [10, 11, 9, 12, 8, 11, 9, 10, 12, 8, 500];
    const r = zScoreAnomaly(values, 3);
    expect(r[r.length - 1]).toBe(true);
  });

  it('zero-variance history clamps z to 0 (no false positive on first deviation)', () => {
    // guard: std === 0 -> z = 0, so a jump after a constant run is not flagged
    const values = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100];
    const r = zScoreAnomaly(values, 3);
    expect(r[r.length - 1]).toBe(false);
  });

  it('no anomaly for constant series', () => {
    const r = zScoreAnomaly([5, 5, 5, 5, 5]);
    expect(r.every((x) => x === false)).toBe(true);
  });

  it('length matches input', () => {
    expect(zScoreAnomaly([1, 2, 3, 4, 5]).length).toBe(5);
  });

  it('higher threshold reduces detections', () => {
    // non-degenerate history so std > 0 and z is meaningful
    const values = [10, 12, 8, 11, 9, 50];
    const low = zScoreAnomaly(values, 1);
    const high = zScoreAnomaly(values, 100);
    expect(low[5]).toBe(true);
    expect(high[5]).toBe(false);
  });

  it('single value is false', () => {
    expect(zScoreAnomaly([42])).toEqual([false]);
  });
});

describe('isoForestScore', () => {
  it('empty returns empty', () => {
    expect(isoForestScore([])).toEqual([]);
  });

  it('returns score per point', () => {
    const data = [[1], [2], [3], [100]];
    const scores = isoForestScore(data, 10, 42);
    expect(scores.length).toBe(4);
  });

  it('scores are in [0,1]', () => {
    const data = [[1], [2], [1.5], [2.2], [50]];
    const scores = isoForestScore(data, 10, 7);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('reproducible with same seed', () => {
    const data = [[1], [2], [3], [40]];
    const a = isoForestScore(data, 10, 99);
    const b = isoForestScore(data, 10, 99);
    expect(a).toEqual(b);
  });

  it('single point', () => {
    const scores = isoForestScore([[5]], 5, 1);
    expect(scores.length).toBe(1);
    expect(scores[0]!).toBeGreaterThanOrEqual(0);
    expect(scores[0]!).toBeLessThanOrEqual(1);
  });

  it('multi-dimensional points', () => {
    const data = [[1, 1], [2, 2], [1.5, 1.5], [100, 100]];
    const scores = isoForestScore(data, 10, 3);
    expect(scores.length).toBe(4);
  });

  it('identical points produce equal scores', () => {
    const data = [[5], [5], [5], [5]];
    const scores = isoForestScore(data, 10, 5);
    expect(scores.every((s) => s === scores[0])).toBe(true);
  });

  it('default numTrees and seed run', () => {
    const data = [[1], [2], [3]];
    expect(isoForestScore(data).length).toBe(3);
  });

  it('large dataset terminates', () => {
    const data = Array.from({ length: 300 }, (_, i) => [i % 10]);
    const scores = isoForestScore(data, 5, 42);
    expect(scores.length).toBe(300);
  });
});

describe('medAbsoluteDeviation', () => {
  it('empty returns 0', () => {
    expect(medAbsoluteDeviation([])).toBe(0);
  });

  it('single value returns 0', () => {
    expect(medAbsoluteDeviation([5])).toBe(0);
  });

  it('constant series returns 0', () => {
    expect(medAbsoluteDeviation([3, 3, 3])).toBe(0);
  });

  it('computes MAD', () => {
    // [1,2,3,4,5] median 3, deviations [2,1,0,1,2], median 1
    expect(medAbsoluteDeviation([1, 2, 3, 4, 5])).toBe(1);
  });

  it('even length series', () => {
    // [1,2,3,4] median 2.5, deviations [1.5,0.5,0.5,1.5], median 1
    expect(medAbsoluteDeviation([1, 2, 3, 4])).toBe(1);
  });
});

describe('robustZScore', () => {
  it('empty returns empty', () => {
    expect(robustZScore([])).toEqual([]);
  });

  it('constant series returns all zeros (scale 0)', () => {
    expect(robustZScore([4, 4, 4])).toEqual([0, 0, 0]);
  });

  it('length matches input', () => {
    expect(robustZScore([1, 2, 3, 4, 5]).length).toBe(5);
  });

  it('median maps to 0', () => {
    const r = robustZScore([1, 2, 3, 4, 5]);
    expect(r[2]).toBeCloseTo(0, 6);
  });

  it('symmetric around median', () => {
    const r = robustZScore([1, 2, 3, 4, 5]);
    expect(r[0]).toBeCloseTo(-r[4]!, 6);
  });

  it('no NaN or Infinity in output', () => {
    const r = robustZScore([10, 10, 10, 10, 1]);
    for (const x of r) {
      expect(isFinite(x)).toBe(true);
      expect(isNaN(x)).toBe(false);
    }
  });

  it('single value returns [0]', () => {
    expect(robustZScore([7])).toEqual([0]);
  });
});

describe('changePointDetection', () => {
  it('too few values returns empty', () => {
    expect(changePointDetection([1, 2, 3], 5)).toEqual([]);
  });

  it('empty returns empty', () => {
    expect(changePointDetection([])).toEqual([]);
  });

  it('no change in constant series returns empty', () => {
    const values = new Array(20).fill(5) as number[];
    expect(changePointDetection(values, 5)).toEqual([]);
  });

  it('detects a clear shift', () => {
    const values = [
      ...new Array(10).fill(0),
      ...new Array(10).fill(100),
    ] as number[];
    const cps = changePointDetection(values, 5);
    expect(cps.length).toBeGreaterThan(0);
    // change near index 10
    expect(cps[0]).toBeGreaterThanOrEqual(5);
    expect(cps[0]).toBeLessThanOrEqual(15);
  });

  it('terminates and returns sorted-ish indices for multiple shifts', () => {
    const values = [
      ...new Array(8).fill(0),
      ...new Array(8).fill(50),
      ...new Array(8).fill(100),
    ] as number[];
    const cps = changePointDetection(values, 4);
    expect(Array.isArray(cps)).toBe(true);
    // indices within range
    for (const c of cps) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(values.length);
    }
  });

  it('terminates with minSegmentSize 1 (no hang)', () => {
    const values = [
      ...new Array(10).fill(0),
      ...new Array(10).fill(100),
    ] as number[];
    const cps = changePointDetection(values, 1);
    expect(Array.isArray(cps)).toBe(true);
    expect(cps.length).toBeGreaterThan(0);
  });

  it('minSegmentSize 0 returns empty without hanging', () => {
    // Guard against zero-progress infinite loop (segmentStart += 0).
    const values = [
      ...new Array(10).fill(0),
      ...new Array(10).fill(100),
    ] as number[];
    expect(changePointDetection(values, 0)).toEqual([]);
  });

  it('negative minSegmentSize returns empty without hanging', () => {
    const values = new Array(20).fill(0).map((_, i) => i) as number[];
    expect(changePointDetection(values, -3)).toEqual([]);
  });

  it('default minSegmentSize 5', () => {
    const values = new Array(15).fill(1) as number[];
    expect(changePointDetection(values)).toEqual([]);
  });

  it('terminates on noisy data without infinite loop', () => {
    const values = Array.from({ length: 100 }, (_, i) =>
      Math.sin(i) + (i > 50 ? 10 : 0)
    );
    const cps = changePointDetection(values, 5);
    expect(Array.isArray(cps)).toBe(true);
  });
});

// ===========================================================================
// 5. Sequence pattern mining
// ===========================================================================

describe('frequentPatterns', () => {
  it('empty sequences returns empty map', () => {
    expect(frequentPatterns([]).size).toBe(0);
  });

  it('counts bigrams meeting minSupport', () => {
    const seqs = [
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
    ];
    const m = frequentPatterns(seqs, 2);
    expect(m.get('a,b')).toBe(2);
    expect(m.has('b,c')).toBe(false);
  });

  it('default minSupport 2', () => {
    const seqs = [['x', 'y'], ['x', 'y']];
    const m = frequentPatterns(seqs);
    expect(m.get('x,y')).toBe(2);
  });

  it('minSupport 1 keeps all bigrams', () => {
    const seqs = [['a', 'b', 'c']];
    const m = frequentPatterns(seqs, 1);
    expect(m.size).toBe(2);
  });

  it('single element sequences produce no bigrams', () => {
    const seqs = [['a'], ['b']];
    expect(frequentPatterns(seqs, 1).size).toBe(0);
  });

  it('empty inner sequences', () => {
    expect(frequentPatterns([[], []], 1).size).toBe(0);
  });

  it('repeated bigram in single sequence', () => {
    const seqs = [['a', 'b', 'a', 'b']];
    const m = frequentPatterns(seqs, 2);
    expect(m.get('a,b')).toBe(2);
  });
});

describe('prefixPatterns', () => {
  it('empty events returns empty', () => {
    expect(prefixPatterns([], 'start')).toEqual([]);
  });

  it('no prefix occurrences returns empty', () => {
    const events = [ev('a', 1), ev('b', 2)];
    expect(prefixPatterns(events, 'start')).toEqual([]);
  });

  it('collects events following each prefix', () => {
    const events = [
      ev('start', 1),
      ev('a', 2),
      ev('b', 3),
      ev('start', 4),
      ev('c', 5),
    ];
    const groups = prefixPatterns(events, 'start');
    expect(groups.length).toBe(2);
    expect(groups[0]!.map((e) => e.type)).toEqual(['a', 'b']);
    expect(groups[1]!.map((e) => e.type)).toEqual(['c']);
  });

  it('prefix at end yields empty group', () => {
    const events = [ev('start', 1), ev('a', 2), ev('start', 3)];
    const groups = prefixPatterns(events, 'start');
    expect(groups.length).toBe(2);
    expect(groups[1]).toEqual([]);
  });

  it('events before first prefix are ignored', () => {
    const events = [ev('a', 1), ev('start', 2), ev('b', 3)];
    const groups = prefixPatterns(events, 'start');
    expect(groups.length).toBe(1);
    expect(groups[0]!.map((e) => e.type)).toEqual(['b']);
  });

  it('sorts events by time first', () => {
    const events = [ev('b', 3), ev('start', 1), ev('a', 2)];
    const groups = prefixPatterns(events, 'start');
    expect(groups[0]!.map((e) => e.type)).toEqual(['a', 'b']);
  });
});

describe('eventCoOccurrence', () => {
  it('empty events returns empty', () => {
    expect(eventCoOccurrence([], 1000).size).toBe(0);
  });

  it('counts pairs within window', () => {
    const events = [ev('a', 0), ev('b', 100), ev('c', 5000)];
    const m = eventCoOccurrence(events, 1000);
    // a-b within 1000; c is 5000 away
    expect(m.get('a|b')).toBe(1);
    expect(m.has('a|c')).toBe(false);
  });

  it('alphabetical key ordering', () => {
    const events = [ev('z', 0), ev('a', 100)];
    const m = eventCoOccurrence(events, 1000);
    expect(m.has('a|z')).toBe(true);
  });

  it('single event no pairs', () => {
    expect(eventCoOccurrence([ev('a', 0)], 1000).size).toBe(0);
  });

  it('same type pair', () => {
    const events = [ev('a', 0), ev('a', 100)];
    const m = eventCoOccurrence(events, 1000);
    expect(m.get('a|a')).toBe(1);
  });

  it('window boundary exclusive (diff > windowMs breaks)', () => {
    const events = [ev('a', 0), ev('b', 1000), ev('c', 1001)];
    const m = eventCoOccurrence(events, 1000);
    // a-b diff 1000 (not > 1000) counted; a-c diff 1001 > 1000 break
    expect(m.get('a|b')).toBe(1);
    expect(m.has('a|c')).toBe(false);
    // b-c diff 1 counted
    expect(m.get('b|c')).toBe(1);
  });

  it('multiple pairs in window', () => {
    const events = [ev('a', 0), ev('b', 10), ev('c', 20)];
    const m = eventCoOccurrence(events, 1000);
    // a-b, a-c, b-c
    expect(m.size).toBe(3);
  });
});

describe('longestCommonSubsequence', () => {
  it('empty sequences returns empty', () => {
    expect(longestCommonSubsequence([], [])).toEqual([]);
  });

  it('one empty returns empty', () => {
    expect(longestCommonSubsequence(['a'], [])).toEqual([]);
    expect(longestCommonSubsequence([], ['a'])).toEqual([]);
  });

  it('identical sequences return full', () => {
    expect(longestCommonSubsequence(['a', 'b', 'c'], ['a', 'b', 'c'])).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('classic LCS example', () => {
    const r = longestCommonSubsequence(
      ['a', 'b', 'c', 'b', 'd', 'a', 'b'],
      ['b', 'd', 'c', 'a', 'b', 'a']
    );
    expect(r.length).toBe(4);
  });

  it('no common elements returns empty', () => {
    expect(longestCommonSubsequence(['a', 'b'], ['c', 'd'])).toEqual([]);
  });

  it('subsequence not substring', () => {
    expect(longestCommonSubsequence(['a', 'x', 'b'], ['a', 'y', 'b'])).toEqual([
      'a',
      'b',
    ]);
  });

  it('single common element', () => {
    expect(longestCommonSubsequence(['a', 'b'], ['b', 'c'])).toEqual(['b']);
  });
});

describe('patternFrequency', () => {
  it('empty pattern returns 0', () => {
    expect(patternFrequency([ev('a', 1)], [])).toBe(0);
  });

  it('pattern longer than events returns 0', () => {
    expect(patternFrequency([ev('a', 1)], ['a', 'b'])).toBe(0);
  });

  it('empty events returns 0', () => {
    expect(patternFrequency([], ['a'])).toBe(0);
  });

  it('counts non-overlapping occurrences', () => {
    const events = [ev('a', 1), ev('b', 2), ev('a', 3), ev('b', 4)];
    expect(patternFrequency(events, ['a', 'b'])).toBe(2);
  });

  it('non-overlapping for repeated single pattern', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 3), ev('a', 4)];
    // pattern [a,a]: matches at 0, then i jumps to 2, matches again -> 2
    expect(patternFrequency(events, ['a', 'a'])).toBe(2);
  });

  it('single-type pattern counts all', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 3)];
    expect(patternFrequency(events, ['a'])).toBe(3);
  });

  it('no match returns 0', () => {
    const events = [ev('a', 1), ev('b', 2)];
    expect(patternFrequency(events, ['c', 'd'])).toBe(0);
  });

  it('overlapping pattern counted only once where it would overlap', () => {
    // 'a','a','a' with pattern ['a','a'] -> match at 0, jump to 2, only 1 left -> 1
    const events = [ev('a', 1), ev('a', 2), ev('a', 3)];
    expect(patternFrequency(events, ['a', 'a'])).toBe(1);
  });
});

// ===========================================================================
// 6. Sports event stream applications
// ===========================================================================

describe('gameEventTimeline', () => {
  it('empty returns empty', () => {
    expect(gameEventTimeline([])).toEqual([]);
  });

  it('computes relative minutes', () => {
    const events = [ev('a', 0), ev('b', 60000), ev('c', 120000)];
    const t = gameEventTimeline(events);
    expect(t.map((x) => x.relativeMinute)).toEqual([0, 1, 2]);
  });

  it('sorts by time first', () => {
    const events = [ev('c', 120000), ev('a', 0), ev('b', 60000)];
    const t = gameEventTimeline(events);
    expect(t.map((x) => x.type)).toEqual(['a', 'b', 'c']);
  });

  it('floors partial minutes', () => {
    const events = [ev('a', 0), ev('b', 90000)];
    const t = gameEventTimeline(events);
    expect(t[1]!.relativeMinute).toBe(1);
  });

  it('single event minute 0', () => {
    const t = gameEventTimeline([ev('a', 50000)]);
    expect(t[0]!.relativeMinute).toBe(0);
  });

  it('preserves timestamps', () => {
    const t = gameEventTimeline([ev('a', 12345)]);
    expect(t[0]!.timestamp).toBe(12345);
  });
});

describe('scoringRunDetector', () => {
  it('empty returns empty', () => {
    expect(scoringRunDetector([], 3)).toEqual([]);
  });

  it('zero runLength returns empty', () => {
    expect(scoringRunDetector([ev('s', 1, undefined, { team: 'A' })], 0)).toEqual([]);
  });

  it('negative runLength returns empty', () => {
    expect(scoringRunDetector([ev('s', 1, undefined, { team: 'A' })], -1)).toEqual([]);
  });

  it('detects a run of same team', () => {
    const events = [
      ev('s', 1, undefined, { team: 'A' }),
      ev('s', 2, undefined, { team: 'A' }),
      ev('s', 3, undefined, { team: 'A' }),
    ];
    const runs = scoringRunDetector(events, 3);
    expect(runs.length).toBe(1);
    expect(runs[0]!.team).toBe('A');
    expect(runs[0]!.startIdx).toBe(0);
    expect(runs[0]!.endIdx).toBe(2);
  });

  it('resets on team change', () => {
    const events = [
      ev('s', 1, undefined, { team: 'A' }),
      ev('s', 2, undefined, { team: 'A' }),
      ev('s', 3, undefined, { team: 'B' }),
      ev('s', 4, undefined, { team: 'A' }),
    ];
    expect(scoringRunDetector(events, 3)).toEqual([]);
  });

  it('detects independent consecutive runs', () => {
    const events = [
      ev('s', 1, undefined, { team: 'A' }),
      ev('s', 2, undefined, { team: 'A' }),
      ev('s', 3, undefined, { team: 'A' }),
      ev('s', 4, undefined, { team: 'A' }),
    ];
    // runLength 2 -> two runs: [0,1] and [2,3]
    const runs = scoringRunDetector(events, 2);
    expect(runs.length).toBe(2);
    expect(runs[0]!.startIdx).toBe(0);
    expect(runs[1]!.startIdx).toBe(2);
  });

  it('custom team field', () => {
    const events = [
      ev('s', 1, undefined, { squad: 'X' }),
      ev('s', 2, undefined, { squad: 'X' }),
    ];
    const runs = scoringRunDetector(events, 2, 'squad');
    expect(runs.length).toBe(1);
    expect(runs[0]!.team).toBe('X');
  });

  it('ignores empty team', () => {
    const events = [ev('s', 1), ev('s', 2)];
    expect(scoringRunDetector(events, 2)).toEqual([]);
  });
});

describe('momentumSwitch', () => {
  it('fewer than lookback returns empty', () => {
    const events = [ev('s', 1, undefined, { team: 'A' })];
    expect(momentumSwitch(events, 5)).toEqual([]);
  });

  it('empty returns empty', () => {
    expect(momentumSwitch([])).toEqual([]);
  });

  it('detects dominant team switch', () => {
    const events = [
      ev('s', 1, undefined, { team: 'A' }),
      ev('s', 2, undefined, { team: 'A' }),
      ev('s', 3, undefined, { team: 'B' }),
      ev('s', 4, undefined, { team: 'B' }),
      ev('s', 5, undefined, { team: 'B' }),
      ev('s', 6, undefined, { team: 'B' }),
    ];
    const switches = momentumSwitch(events, 3);
    expect(switches.length).toBeGreaterThan(0);
  });

  it('no switch when one team dominates throughout', () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      ev('s', i, undefined, { team: 'A' })
    );
    expect(momentumSwitch(events, 3)).toEqual([]);
  });

  it('default lookback 5', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      ev('s', i, undefined, { team: 'A' })
    );
    expect(momentumSwitch(events)).toEqual([]);
  });

  it('returns indices in range', () => {
    const events = [
      ev('s', 1, undefined, { team: 'A' }),
      ev('s', 2, undefined, { team: 'A' }),
      ev('s', 3, undefined, { team: 'A' }),
      ev('s', 4, undefined, { team: 'B' }),
      ev('s', 5, undefined, { team: 'B' }),
      ev('s', 6, undefined, { team: 'B' }),
    ];
    const switches = momentumSwitch(events, 3);
    for (const s of switches) {
      expect(s).toBeGreaterThanOrEqual(2);
      expect(s).toBeLessThan(events.length);
    }
  });
});

describe('injuryImpactWindow', () => {
  it('empty returns empty', () => {
    expect(injuryImpactWindow([])).toEqual([]);
  });

  it('no injuries returns empty', () => {
    const events = [ev('a', 1), ev('b', 2)];
    expect(injuryImpactWindow(events)).toEqual([]);
  });

  it('collects events after injury within window', () => {
    const events = [
      ev('injury', 0),
      ev('a', 1000),
      ev('b', 2000),
      ev('c', 400000), // outside 300000 default
    ];
    const r = injuryImpactWindow(events);
    expect(r.length).toBe(1);
    expect(r[0]!.map((e) => e.type)).toEqual(['a', 'b']);
  });

  it('custom injury type and window', () => {
    const events = [ev('hurt', 0), ev('x', 100), ev('y', 50000)];
    const r = injuryImpactWindow(events, 'hurt', 1000);
    expect(r.length).toBe(1);
    expect(r[0]!.map((e) => e.type)).toEqual(['x']);
  });

  it('excludes the injury event itself', () => {
    const events = [ev('injury', 0), ev('injury', 100)];
    const r = injuryImpactWindow(events);
    // first injury window: events after 0 within 300000 -> the second injury
    expect(r.length).toBe(2);
    // each injury excludes itself
    expect(r[0]!.some((e) => e.timestamp === 0)).toBe(false);
  });

  it('window boundary inclusive on end', () => {
    const events = [ev('injury', 0), ev('a', 300000)];
    const r = injuryImpactWindow(events);
    expect(r[0]!.length).toBe(1);
  });

  it('events strictly after injury (not at same ts)', () => {
    const events = [ev('injury', 0), ev('a', 0)];
    const r = injuryImpactWindow(events);
    // a at same ts as injury, not > injury ts -> excluded
    expect(r[0]!.length).toBe(0);
  });
});

describe('oddsMovementStream', () => {
  it('empty returns empty', () => {
    expect(oddsMovementStream([])).toEqual([]);
  });

  it('single event per type produces no movement', () => {
    expect(oddsMovementStream([ev('a', 1, 1.5)])).toEqual([]);
  });

  it('detects upward movement', () => {
    const events = [ev('a', 1, 1.5), ev('a', 2, 2.0)];
    const r = oddsMovementStream(events);
    expect(r.length).toBe(1);
    expect(r[0]!.direction).toBe('up');
    expect(r[0]!.magnitude).toBeCloseTo(0.5, 6);
  });

  it('detects downward movement', () => {
    const events = [ev('a', 1, 2.0), ev('a', 2, 1.5)];
    const r = oddsMovementStream(events);
    expect(r[0]!.direction).toBe('down');
  });

  it('flat for small change <= 0.01', () => {
    const events = [ev('a', 1, 2.0), ev('a', 2, 2.005)];
    const r = oddsMovementStream(events);
    expect(r[0]!.direction).toBe('flat');
  });

  it('exactly 0.01 is flat', () => {
    const events = [ev('a', 1, 2.0), ev('a', 2, 2.01)];
    const r = oddsMovementStream(events);
    expect(r[0]!.direction).toBe('flat');
  });

  it('separates by type but sorts result by timestamp', () => {
    const events = [
      ev('a', 1, 1.0),
      ev('b', 2, 5.0),
      ev('a', 3, 2.0),
      ev('b', 4, 4.0),
    ];
    const r = oddsMovementStream(events);
    expect(r.length).toBe(2);
    expect(r.map((x) => x.timestamp)).toEqual([3, 4]);
  });

  it('handles missing value as 0', () => {
    const events = [ev('a', 1), ev('a', 2, 1.0)];
    const r = oddsMovementStream(events);
    expect(r[0]!.direction).toBe('up');
    expect(r[0]!.magnitude).toBeCloseTo(1.0, 6);
  });
});

// ===========================================================================
// 7. Aggregation and reporting
// ===========================================================================

describe('eventSummary', () => {
  it('empty returns zeroed summary', () => {
    expect(eventSummary([])).toEqual({
      totalEvents: 0,
      uniqueTypes: 0,
      timeSpanMs: 0,
      eventsPerMinute: 0,
      mostFrequentType: '',
    });
  });

  it('computes full summary', () => {
    const events = [
      ev('a', 0),
      ev('a', 60000),
      ev('b', 120000),
    ];
    const s = eventSummary(events);
    expect(s.totalEvents).toBe(3);
    expect(s.uniqueTypes).toBe(2);
    expect(s.timeSpanMs).toBe(120000);
    expect(s.mostFrequentType).toBe('a');
  });

  it('eventsPerMinute when timeSpan is 0', () => {
    const events = [ev('a', 5), ev('b', 5)];
    expect(eventSummary(events).eventsPerMinute).toBe(0);
  });

  it('eventsPerMinute computed', () => {
    // 2 events over 60000ms = 1 minute -> 2 per minute
    const events = [ev('a', 0), ev('a', 60000)];
    expect(eventSummary(events).eventsPerMinute).toBeCloseTo(2, 6);
  });

  it('single event', () => {
    const s = eventSummary([ev('a', 100)]);
    expect(s.totalEvents).toBe(1);
    expect(s.uniqueTypes).toBe(1);
    expect(s.timeSpanMs).toBe(0);
    expect(s.mostFrequentType).toBe('a');
  });

  it('most frequent picks the highest count', () => {
    const events = [ev('a', 1), ev('b', 2), ev('b', 3), ev('b', 4)];
    expect(eventSummary(events).mostFrequentType).toBe('b');
  });
});

describe('periodComparison', () => {
  it('counts both periods', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 10), ev('a', 11)];
    const r = periodComparison(events, [1, 2], [10, 11]);
    expect(r.period1Count).toBe(2);
    expect(r.period2Count).toBe(2);
    expect(r.change).toBe(0);
    expect(r.changePct).toBe(0);
  });

  it('positive change percentage', () => {
    const events = [ev('a', 1), ev('a', 10), ev('a', 11)];
    const r = periodComparison(events, [1, 1], [10, 11]);
    // p1=1, p2=2, change=1, pct=100
    expect(r.changePct).toBe(100);
  });

  it('Infinity when period1 is empty but period2 not', () => {
    const events = [ev('a', 10)];
    const r = periodComparison(events, [0, 5], [10, 11]);
    expect(r.period1Count).toBe(0);
    expect(r.changePct).toBe(Infinity);
  });

  it('zero pct when both empty', () => {
    const r = periodComparison([], [0, 5], [10, 15]);
    expect(r.changePct).toBe(0);
    expect(r.change).toBe(0);
  });

  it('negative change', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 10)];
    const r = periodComparison(events, [1, 2], [10, 11]);
    expect(r.change).toBe(-1);
    expect(r.changePct).toBe(-50);
  });
});

describe('topEventTypes', () => {
  it('empty returns empty', () => {
    expect(topEventTypes([])).toEqual([]);
  });

  it('sorts by count descending', () => {
    const events = [ev('a', 1), ev('b', 2), ev('b', 3), ev('c', 4), ev('c', 5), ev('c', 6)];
    const r = topEventTypes(events);
    expect(r.map((x) => x.type)).toEqual(['c', 'b', 'a']);
  });

  it('computes percentage', () => {
    const events = [ev('a', 1), ev('a', 2), ev('b', 3), ev('b', 4)];
    const r = topEventTypes(events);
    expect(r[0]!.pct).toBeCloseTo(50, 6);
  });

  it('limits to n', () => {
    const events = [ev('a', 1), ev('b', 2), ev('c', 3)];
    const r = topEventTypes(events, 2);
    expect(r.length).toBe(2);
  });

  it('default n is 10', () => {
    const events = Array.from({ length: 15 }, (_, i) => ev(`t${i}`, i));
    expect(topEventTypes(events).length).toBe(10);
  });

  it('counts add up correctly', () => {
    const events = [ev('a', 1), ev('a', 2), ev('a', 3)];
    const r = topEventTypes(events);
    expect(r[0]!.count).toBe(3);
    expect(r[0]!.pct).toBeCloseTo(100, 6);
  });

  it('single type', () => {
    const r = topEventTypes([ev('x', 1)]);
    expect(r).toEqual([{ type: 'x', count: 1, pct: 100 }]);
  });
});

describe('valueSummaryByType', () => {
  it('empty returns empty map', () => {
    expect(valueSummaryByType([]).size).toBe(0);
  });

  it('events without value are skipped', () => {
    const events = [ev('a', 1), ev('b', 2)];
    expect(valueSummaryByType(events).size).toBe(0);
  });

  it('aggregates count/sum/mean/min/max', () => {
    const events = [ev('a', 1, 10), ev('a', 2, 20), ev('a', 3, 30)];
    const m = valueSummaryByType(events);
    const a = m.get('a')!;
    expect(a.count).toBe(3);
    expect(a.sum).toBe(60);
    expect(a.mean).toBe(20);
    expect(a.min).toBe(10);
    expect(a.max).toBe(30);
  });

  it('single value type', () => {
    const m = valueSummaryByType([ev('a', 1, 5)]);
    const a = m.get('a')!;
    expect(a.count).toBe(1);
    expect(a.mean).toBe(5);
    expect(a.min).toBe(5);
    expect(a.max).toBe(5);
  });

  it('separate types tracked independently', () => {
    const events = [ev('a', 1, 10), ev('b', 2, 100)];
    const m = valueSummaryByType(events);
    expect(m.get('a')!.sum).toBe(10);
    expect(m.get('b')!.sum).toBe(100);
  });

  it('handles negative values', () => {
    const events = [ev('a', 1, -5), ev('a', 2, 5)];
    const a = valueSummaryByType(events).get('a')!;
    expect(a.min).toBe(-5);
    expect(a.max).toBe(5);
    expect(a.mean).toBe(0);
  });

  it('zero value not skipped (only undefined skipped)', () => {
    const events = [ev('a', 1, 0)];
    const m = valueSummaryByType(events);
    expect(m.get('a')!.count).toBe(1);
  });
});
