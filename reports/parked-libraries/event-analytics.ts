/**
 * event-analytics.ts
 *
 * Pure TypeScript analytics library for event stream processing.
 * Zero npm dependencies (Node built-ins only). No `any` types.
 * Compatible with noUncheckedIndexedAccess: all array index reads use ?? fallbacks.
 *
 * This is a MATH/ANALYTICS library and does NOT import from events.ts.
 */

// ---------------------------------------------------------------------------
// 1. Event stream types and basics
// ---------------------------------------------------------------------------

export type StreamEvent = {
  type: string;
  timestamp: number;
  value?: number;
  metadata?: Record<string, string | number | boolean>;
};

/** Keep only events whose type is in the provided list. */
export function filterByType(
  events: StreamEvent[],
  types: string[]
): StreamEvent[] {
  const set = new Set(types);
  return events.filter((e) => set.has(e.type));
}

/** Inclusive time range filter. */
export function filterByTimeRange(
  events: StreamEvent[],
  startMs: number,
  endMs: number
): StreamEvent[] {
  return events.filter((e) => e.timestamp >= startMs && e.timestamp <= endMs);
}

/** Group events by their type. */
export function groupByType(events: StreamEvent[]): Map<string, StreamEvent[]> {
  const map = new Map<string, StreamEvent[]>();
  for (const e of events) {
    const bucket = map.get(e.type) ?? [];
    bucket.push(e);
    map.set(e.type, bucket);
  }
  return map;
}

/** Sort events ascending by timestamp (returns new array). */
export function sortByTime(events: StreamEvent[]): StreamEvent[] {
  return [...events].sort((a, b) => a.timestamp - b.timestamp);
}

/** Total event count, or count for a specific type. */
export function eventCount(events: StreamEvent[], type?: string): number {
  if (type === undefined) return events.length;
  return events.filter((e) => e.type === type).length;
}

/**
 * Events per second in a rolling window ending at the most recent event timestamp.
 * windowMs defaults to 60000 (last 60 seconds).
 */
export function eventRate(
  events: StreamEvent[],
  windowMs: number = 60_000
): number {
  if (events.length === 0) return 0;
  const maxTs = Math.max(...events.map((e) => e.timestamp));
  const windowStart = maxTs - windowMs;
  const inWindow = events.filter((e) => e.timestamp > windowStart && e.timestamp <= maxTs);
  return inWindow.length / (windowMs / 1000);
}

// ---------------------------------------------------------------------------
// 2. Windowing operations
// ---------------------------------------------------------------------------

/**
 * Non-overlapping tumbling windows. Windows start from the minimum timestamp.
 * Each window covers [t, t + windowSizeMs). Last window may be partial.
 */
export function tumblingWindow(
  events: StreamEvent[],
  windowSizeMs: number
): StreamEvent[][] {
  if (events.length === 0 || windowSizeMs <= 0) return [];
  const sorted = sortByTime(events);
  const first = sorted[0];
  if (first === undefined) return [];
  const minTs = first.timestamp;
  const last = sorted[sorted.length - 1];
  if (last === undefined) return [];
  const maxTs = last.timestamp;

  const windows: StreamEvent[][] = [];
  let windowStart = minTs;
  while (windowStart <= maxTs) {
    const windowEnd = windowStart + windowSizeMs;
    windows.push(sorted.filter((e) => e.timestamp >= windowStart && e.timestamp < windowEnd));
    windowStart = windowEnd;
  }
  return windows;
}

/**
 * Overlapping sliding windows. Step determines the stride.
 * Windows start from the minimum timestamp.
 */
export function slidingWindow(
  events: StreamEvent[],
  windowSizeMs: number,
  stepMs: number
): StreamEvent[][] {
  if (events.length === 0 || windowSizeMs <= 0 || stepMs <= 0) return [];
  const sorted = sortByTime(events);
  const first = sorted[0];
  if (first === undefined) return [];
  const last = sorted[sorted.length - 1];
  if (last === undefined) return [];
  const minTs = first.timestamp;
  const maxTs = last.timestamp;

  const windows: StreamEvent[][] = [];
  let windowStart = minTs;
  while (windowStart <= maxTs) {
    const windowEnd = windowStart + windowSizeMs;
    windows.push(sorted.filter((e) => e.timestamp >= windowStart && e.timestamp < windowEnd));
    windowStart += stepMs;
  }
  return windows;
}

/**
 * Session windows: group events separated by gaps > gapMs into separate sessions.
 */
export function sessionWindow(
  events: StreamEvent[],
  gapMs: number
): StreamEvent[][] {
  if (events.length === 0) return [];
  const sorted = sortByTime(events);
  const sessions: StreamEvent[][] = [];
  let current: StreamEvent[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    if (e === undefined) continue;
    if (current.length === 0) {
      current.push(e);
    } else {
      const prev = current[current.length - 1];
      if (prev === undefined || e.timestamp - prev.timestamp > gapMs) {
        sessions.push(current);
        current = [e];
      } else {
        current.push(e);
      }
    }
  }
  if (current.length > 0) sessions.push(current);
  return sessions;
}

/**
 * Fixed-size count windows. Last window may be smaller than count.
 */
export function countWindow(
  events: StreamEvent[],
  count: number
): StreamEvent[][] {
  if (events.length === 0 || count <= 0) return [];
  const windows: StreamEvent[][] = [];
  for (let i = 0; i < events.length; i += count) {
    windows.push(events.slice(i, i + count));
  }
  return windows;
}

/** Apply an aggregator function to each window and return aggregated values. */
export function windowAggregation(
  windows: StreamEvent[][],
  aggregator: (events: StreamEvent[]) => number
): number[] {
  return windows.map(aggregator);
}

// ---------------------------------------------------------------------------
// 3. Statistical stream analytics
// ---------------------------------------------------------------------------

/** Cumulative (running) mean at each point. */
export function runningMean(values: number[]): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    result.push(sum / (i + 1));
  }
  return result;
}

/**
 * Cumulative variance at each point using Welford's online algorithm.
 * Returns population variance.
 */
export function runningVariance(values: number[]): number[] {
  const result: number[] = [];
  let n = 0;
  let mean = 0;
  let M2 = 0;
  for (const v of values) {
    n++;
    const delta = v - mean;
    mean += delta / n;
    const delta2 = v - mean;
    M2 += delta * delta2;
    result.push(n < 2 ? 0 : M2 / n);
  }
  return result;
}

/**
 * Exponential Moving Average (EMA). alpha is the smoothing factor (0 < alpha <= 1).
 * First value = values[0].
 */
export function exponentialMovingAverage(
  values: number[],
  alpha: number
): number[] {
  if (values.length === 0) return [];
  const result: number[] = [];
  let ema = values[0] ?? 0;
  result.push(ema);
  for (let i = 1; i < values.length; i++) {
    const v = values[i] ?? 0;
    ema = alpha * v + (1 - alpha) * ema;
    result.push(ema);
  }
  return result;
}

/**
 * Bollinger Bands. Uses a rolling window for the middle band (SMA).
 * Values before the full window use all available data.
 * numStdDev defaults to 2.
 */
export function bollingerBands(
  values: number[],
  window: number,
  numStdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const len = slice.length;
    const sum = slice.reduce((acc, v) => acc + v, 0);
    const mean = sum / len;
    const variance =
      slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / len;
    const std = Math.sqrt(variance);
    middle.push(mean);
    upper.push(mean + numStdDev * std);
    lower.push(mean - numStdDev * std);
  }
  return { upper, middle, lower };
}

/**
 * RSI (Relative Strength Index) using Wilder's smoothing.
 * period defaults to 14. Returns 0 for insufficient data.
 */
export function rsiStream(values: number[], period: number = 14): number[] {
  const result: number[] = new Array(values.length).fill(0) as number[];
  if (values.length < period + 1) return result;

  // Compute initial average gain/loss over first period
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = (values[i] ?? 0) - (values[i - 1] ?? 0);
    if (diff > 0) avgGain += diff;
    else avgLoss += -diff;
  }
  avgGain /= period;
  avgLoss /= period;

  const rs0 = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0);

  for (let i = period + 1; i < values.length; i++) {
    const diff = (values[i] ?? 0) - (values[i - 1] ?? 0);
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 4. Anomaly detection
// ---------------------------------------------------------------------------

/**
 * Z-score anomaly detection using cumulative (running) stats.
 * Returns true if |z-score| > threshold. First 2 values always false.
 * threshold defaults to 3.0.
 */
export function zScoreAnomaly(
  values: number[],
  threshold: number = 3.0
): boolean[] {
  const result: boolean[] = [];
  let n = 0;
  let mean = 0;
  let M2 = 0;

  for (const v of values) {
    if (n < 2) {
      result.push(false);
      // Update running stats
      n++;
      const delta = v - mean;
      mean += delta / n;
      const delta2 = v - mean;
      M2 += delta * delta2;
      continue;
    }
    const variance = n < 1 ? 0 : M2 / n;
    const std = Math.sqrt(variance);
    const z = std === 0 ? 0 : (v - mean) / std;
    result.push(Math.abs(z) > threshold);
    // Update running stats
    n++;
    const delta = v - mean;
    mean += delta / n;
    const delta2 = v - mean;
    M2 += delta * delta2;
  }
  return result;
}

/**
 * Simplified Isolation Forest score.
 * Returns anomaly score in [0,1] for each point.
 * numTrees defaults to 10. Uses seed for reproducibility.
 */
export function isoForestScore(
  values: number[][],
  numTrees: number = 10,
  seed: number = 42
): number[] {
  if (values.length === 0) return [];

  // Simple seeded pseudo-random number generator (LCG)
  let rngState = seed;
  const rand = (): number => {
    rngState = (rngState * 1664525 + 1013904223) & 0xffffffff;
    return (rngState >>> 0) / 0xffffffff;
  };

  const n = values.length;
  const dim = values[0]?.length ?? 0;
  const subSampleSize = Math.min(256, n);

  /** Build an isolation tree on a subsample and return path length for each point */
  const buildAndScore = (): number[] => {
    // Subsample indices (Fisher-Yates on first subSampleSize)
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = 0; i < subSampleSize; i++) {
      const j = i + Math.floor(rand() * (n - i));
      const tmp = indices[i] ?? 0;
      indices[i] = indices[j] ?? 0;
      indices[j] = tmp;
    }
    const subsample = indices.slice(0, subSampleSize);

    // Compute path lengths via random split trees (recursive with explicit stack)
    const pathLengths = new Array(n).fill(0) as number[];

    const computePathLength = (
      pointIdx: number,
      nodeIndices: number[],
      depth: number
    ): number => {
      if (nodeIndices.length <= 1) {
        // Average path length for a BST node
        const sz = nodeIndices.length;
        return depth + (sz <= 1 ? 0 : 2 * (Math.log(sz - 1) + 0.5772156649) - (2 * (sz - 1)) / sz);
      }

      // Pick random split feature and value
      const feature = Math.floor(rand() * dim);
      let minVal = Infinity;
      let maxVal = -Infinity;
      for (const idx of nodeIndices) {
        const row = values[idx];
        const val = row !== undefined ? (row[feature] ?? 0) : 0;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      if (minVal === maxVal) {
        const sz = nodeIndices.length;
        return depth + (sz <= 1 ? 0 : 2 * (Math.log(sz - 1) + 0.5772156649) - (2 * (sz - 1)) / sz);
      }

      const splitVal = minVal + rand() * (maxVal - minVal);
      const row = values[pointIdx];
      const pointVal = row !== undefined ? (row[feature] ?? 0) : 0;

      if (pointVal < splitVal) {
        const left = nodeIndices.filter((idx) => {
          const r = values[idx];
          return r !== undefined ? (r[feature] ?? 0) < splitVal : true;
        });
        return computePathLength(pointIdx, left, depth + 1);
      } else {
        const right = nodeIndices.filter((idx) => {
          const r = values[idx];
          return r !== undefined ? (r[feature] ?? 0) >= splitVal : false;
        });
        return computePathLength(pointIdx, right, depth + 1);
      }
    };

    for (let i = 0; i < n; i++) {
      pathLengths[i] = computePathLength(i, subsample, 0);
    }
    return pathLengths;
  };

  // Average over all trees
  const totalPathLengths = new Array(n).fill(0) as number[];
  for (let t = 0; t < numTrees; t++) {
    const lengths = buildAndScore();
    for (let i = 0; i < n; i++) {
      totalPathLengths[i] = (totalPathLengths[i] ?? 0) + (lengths[i] ?? 0);
    }
  }

  // Average path length for a balanced BST on subSampleSize nodes
  const avgPathLengthBst = (sz: number): number => {
    if (sz <= 1) return 0;
    return 2 * (Math.log(sz - 1) + 0.5772156649) - (2 * (sz - 1)) / sz;
  };
  const c = avgPathLengthBst(subSampleSize);

  return totalPathLengths.map((total) => {
    const avgLen = total / numTrees;
    if (c === 0) return 0;
    return Math.pow(2, -avgLen / c);
  });
}

/** Median Absolute Deviation: median(|xi - median(x)|) */
export function medAbsoluteDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  const deviations = values.map((v) => Math.abs(v - med));
  return median(deviations);
}

/** Robust z-score: (x - median) / (1.4826 * MAD). Inf/NaN → 0. */
export function robustZScore(values: number[]): number[] {
  if (values.length === 0) return [];
  const med = median(values);
  const mad = medAbsoluteDeviation(values);
  const scale = 1.4826 * mad;
  return values.map((v) => {
    if (scale === 0) return 0;
    const z = (v - med) / scale;
    if (!isFinite(z) || isNaN(z)) return 0;
    return z;
  });
}

/**
 * CUSUM-based change point detection. Returns indices where significant mean
 * shift occurs. minSegmentSize defaults to 5.
 */
export function changePointDetection(
  values: number[],
  minSegmentSize: number = 5
): number[] {
  if (values.length < 2 * minSegmentSize) return [];

  const changePoints: number[] = [];
  const threshold = computeGlobalStd(values) * 1.0; // 1 sigma threshold

  let segmentStart = 0;

  while (segmentStart + 2 * minSegmentSize <= values.length) {
    const segment = values.slice(segmentStart);
    let maxCusum = -Infinity;
    let maxIdx = -1;

    // Evaluate all candidate split points within segment
    for (
      let splitIdx = minSegmentSize;
      splitIdx <= segment.length - minSegmentSize;
      splitIdx++
    ) {
      const left = segment.slice(0, splitIdx);
      const right = segment.slice(splitIdx);
      const leftMean = computeMean(left);
      const rightMean = computeMean(right);
      const diff = Math.abs(rightMean - leftMean);
      if (diff > maxCusum) {
        maxCusum = diff;
        maxIdx = splitIdx;
      }
    }

    if (maxCusum > threshold && maxIdx >= 0) {
      changePoints.push(segmentStart + maxIdx);
      segmentStart += maxIdx;
    } else {
      break;
    }
  }

  return changePoints;
}

// ---------------------------------------------------------------------------
// 5. Sequence pattern mining
// ---------------------------------------------------------------------------

/**
 * Count bigram patterns (consecutive pairs) across all sequences.
 * Returns patterns with count >= minSupport. minSupport defaults to 2.
 */
export function frequentPatterns(
  sequences: string[][],
  minSupport: number = 2
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i] ?? '';
      const b = seq[i + 1] ?? '';
      const key = `${a},${b}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const result = new Map<string, number>();
  for (const [k, v] of counts) {
    if (v >= minSupport) result.set(k, v);
  }
  return result;
}

/**
 * Collect all events that follow each occurrence of prefixType
 * (until the next occurrence of prefixType or end of stream).
 */
export function prefixPatterns(
  events: StreamEvent[],
  prefixType: string
): StreamEvent[][] {
  const result: StreamEvent[][] = [];
  const sorted = sortByTime(events);
  let currentGroup: StreamEvent[] | null = null;

  for (const e of sorted) {
    if (e.type === prefixType) {
      if (currentGroup !== null) result.push(currentGroup);
      currentGroup = [];
    } else if (currentGroup !== null) {
      currentGroup.push(e);
    }
  }
  if (currentGroup !== null) result.push(currentGroup);
  return result;
}

/**
 * Count co-occurring event type pairs within windowMs.
 * Key = "typeA|typeB" (alphabetically sorted). windowMs is a sliding window.
 */
export function eventCoOccurrence(
  events: StreamEvent[],
  windowMs: number
): Map<string, number> {
  const sorted = sortByTime(events);
  const counts = new Map<string, number>();

  for (let i = 0; i < sorted.length; i++) {
    const ei = sorted[i];
    if (ei === undefined) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const ej = sorted[j];
      if (ej === undefined) break;
      if (ej.timestamp - ei.timestamp > windowMs) break;
      const [a, b] = [ei.type, ej.type].sort();
      const key = `${a ?? ''}|${b ?? ''}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/** Standard longest common subsequence (LCS). */
export function longestCommonSubsequence(
  seq1: string[],
  seq2: string[]
): string[] {
  const m = seq1.length;
  const n = seq2.length;
  // dp[i][j] = LCS length for seq1[0..i-1] and seq2[0..j-1]
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0) as number[]
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const row = dp[i];
      const prevRow = dp[i - 1];
      if (row === undefined || prevRow === undefined) continue;
      if ((seq1[i - 1] ?? '') === (seq2[j - 1] ?? '')) {
        row[j] = (prevRow[j - 1] ?? 0) + 1;
      } else {
        row[j] = Math.max(prevRow[j] ?? 0, row[j - 1] ?? 0);
      }
    }
  }

  // Backtrack
  const lcs: string[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    const rowI = dp[i];
    const rowPrev = dp[i - 1];
    if (rowI === undefined || rowPrev === undefined) break;
    if ((seq1[i - 1] ?? '') === (seq2[j - 1] ?? '')) {
      lcs.unshift(seq1[i - 1] ?? '');
      i--;
      j--;
    } else if ((rowPrev[j] ?? 0) > (rowI[j - 1] ?? 0)) {
      i--;
    } else {
      j--;
    }
  }
  return lcs;
}

/**
 * Count non-overlapping occurrences of a pattern (array of types)
 * in the event type sequence.
 */
export function patternFrequency(
  events: StreamEvent[],
  pattern: string[]
): number {
  if (pattern.length === 0 || events.length < pattern.length) return 0;
  const types = events.map((e) => e.type);
  let count = 0;
  let i = 0;
  while (i <= types.length - pattern.length) {
    let match = true;
    for (let j = 0; j < pattern.length; j++) {
      if ((types[i + j] ?? '') !== (pattern[j] ?? '')) {
        match = false;
        break;
      }
    }
    if (match) {
      count++;
      i += pattern.length; // non-overlapping
    } else {
      i++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 6. Sports event stream applications
// ---------------------------------------------------------------------------

/**
 * Add relativeMinute = floor((timestamp - firstTimestamp) / 60000) to each event.
 */
export function gameEventTimeline(
  events: StreamEvent[]
): { type: string; timestamp: number; relativeMinute: number }[] {
  if (events.length === 0) return [];
  const sorted = sortByTime(events);
  const firstTs = sorted[0]?.timestamp ?? 0;
  return sorted.map((e) => ({
    type: e.type,
    timestamp: e.timestamp,
    relativeMinute: Math.floor((e.timestamp - firstTs) / 60_000),
  }));
}

/**
 * Find sequences of exactly runLength consecutive scoring events by the same team.
 * teamField is the metadata key for team. Defaults to 'team'.
 */
export function scoringRunDetector(
  events: StreamEvent[],
  runLength: number,
  teamField: string = 'team'
): { team: string; startIdx: number; endIdx: number }[] {
  if (events.length === 0 || runLength <= 0) return [];
  const result: { team: string; startIdx: number; endIdx: number }[] = [];

  let runStart = 0;
  let currentTeam = '';
  let runCount = 0;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e === undefined) continue;
    const team = String(e.metadata?.[teamField] ?? '');

    if (team === currentTeam && team !== '') {
      runCount++;
    } else {
      currentTeam = team;
      runStart = i;
      runCount = 1;
    }

    if (runCount === runLength) {
      result.push({
        team: currentTeam,
        startIdx: runStart,
        endIdx: i,
      });
      // Reset to allow detection of the next independent run
      runCount = 0;
      currentTeam = '';
    }
  }
  return result;
}

/**
 * Indices where the dominant team changes in a rolling lookback window
 * of scoring events. lookback defaults to 5.
 */
export function momentumSwitch(
  events: StreamEvent[],
  lookback: number = 5
): number[] {
  if (events.length < lookback) return [];
  const result: number[] = [];
  let prevDominant = '';

  for (let i = lookback - 1; i < events.length; i++) {
    const window = events.slice(i - lookback + 1, i + 1);
    const teamCounts = new Map<string, number>();
    for (const e of window) {
      const team = String(e.metadata?.['team'] ?? '');
      if (team) teamCounts.set(team, (teamCounts.get(team) ?? 0) + 1);
    }
    let dominant = '';
    let maxCount = 0;
    for (const [team, count] of teamCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominant = team;
      }
    }
    if (dominant !== '' && dominant !== prevDominant && prevDominant !== '') {
      result.push(i);
    }
    if (dominant !== '') prevDominant = dominant;
  }
  return result;
}

/**
 * Events within windowMs after each injury event.
 * injuryType defaults to 'injury'. windowMs defaults to 300000 (5 min).
 */
export function injuryImpactWindow(
  events: StreamEvent[],
  injuryType: string = 'injury',
  windowMs: number = 300_000
): StreamEvent[][] {
  const sorted = sortByTime(events);
  const result: StreamEvent[][] = [];

  for (const e of sorted) {
    if (e.type === injuryType) {
      const windowEnd = e.timestamp + windowMs;
      const impactEvents = sorted.filter(
        (other) =>
          other !== e &&
          other.timestamp > e.timestamp &&
          other.timestamp <= windowEnd
      );
      result.push(impactEvents);
    }
  }
  return result;
}

/**
 * Analyze consecutive value changes between events of the same type.
 * magnitude = |change|. ±0.01 threshold for flat.
 */
export function oddsMovementStream(
  events: StreamEvent[]
): { direction: 'up' | 'down' | 'flat'; magnitude: number; timestamp: number }[] {
  const byType = groupByType(events);
  const result: { direction: 'up' | 'down' | 'flat'; magnitude: number; timestamp: number }[] = [];

  for (const [, typeEvents] of byType) {
    const sorted = sortByTime(typeEvents);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev === undefined || curr === undefined) continue;
      const prevVal = prev.value ?? 0;
      const currVal = curr.value ?? 0;
      const change = currVal - prevVal;
      const magnitude = Math.abs(change);
      let direction: 'up' | 'down' | 'flat';
      if (magnitude <= 0.01) {
        direction = 'flat';
      } else if (change > 0) {
        direction = 'up';
      } else {
        direction = 'down';
      }
      result.push({ direction, magnitude, timestamp: curr.timestamp });
    }
  }
  // Sort by timestamp
  result.sort((a, b) => a.timestamp - b.timestamp);
  return result;
}

// ---------------------------------------------------------------------------
// 7. Aggregation and reporting
// ---------------------------------------------------------------------------

/**
 * Full event summary.
 */
export function eventSummary(events: StreamEvent[]): {
  totalEvents: number;
  uniqueTypes: number;
  timeSpanMs: number;
  eventsPerMinute: number;
  mostFrequentType: string;
} {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      uniqueTypes: 0,
      timeSpanMs: 0,
      eventsPerMinute: 0,
      mostFrequentType: '',
    };
  }

  const typeCounts = new Map<string, number>();
  let minTs = Infinity;
  let maxTs = -Infinity;
  for (const e of events) {
    typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
    if (e.timestamp < minTs) minTs = e.timestamp;
    if (e.timestamp > maxTs) maxTs = e.timestamp;
  }

  const timeSpanMs = maxTs - minTs;
  const eventsPerMinute =
    timeSpanMs === 0 ? 0 : events.length / (timeSpanMs / 60_000);

  let mostFrequentType = '';
  let maxCount = 0;
  for (const [type, count] of typeCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentType = type;
    }
  }

  return {
    totalEvents: events.length,
    uniqueTypes: typeCounts.size,
    timeSpanMs,
    eventsPerMinute,
    mostFrequentType,
  };
}

/**
 * Compare event counts between two time periods.
 */
export function periodComparison(
  events: StreamEvent[],
  period1: [number, number],
  period2: [number, number]
): { period1Count: number; period2Count: number; change: number; changePct: number } {
  const p1Count = filterByTimeRange(events, period1[0], period1[1]).length;
  const p2Count = filterByTimeRange(events, period2[0], period2[1]).length;
  const change = p2Count - p1Count;
  const changePct = p1Count === 0 ? (p2Count === 0 ? 0 : Infinity) : (change / p1Count) * 100;
  return { period1Count: p1Count, period2Count: p2Count, change, changePct };
}

/**
 * Top N event types by count with percentage. n defaults to 10.
 */
export function topEventTypes(
  events: StreamEvent[],
  n: number = 10
): { type: string; count: number; pct: number }[] {
  const typeCounts = new Map<string, number>();
  for (const e of events) {
    typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
  }
  const total = events.length;
  return [...typeCounts.entries()]
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, n)
    .map(([type, count]) => ({
      type,
      count: count ?? 0,
      pct: total === 0 ? 0 : ((count ?? 0) / total) * 100,
    }));
}

/**
 * Aggregate numeric values per event type.
 */
export function valueSummaryByType(
  events: StreamEvent[]
): Map<string, { count: number; sum: number; mean: number; min: number; max: number }> {
  const result = new Map<
    string,
    { count: number; sum: number; mean: number; min: number; max: number }
  >();

  for (const e of events) {
    if (e.value === undefined) continue;
    const existing = result.get(e.type);
    if (existing === undefined) {
      result.set(e.type, {
        count: 1,
        sum: e.value,
        mean: e.value,
        min: e.value,
        max: e.value,
      });
    } else {
      existing.count++;
      existing.sum += e.value;
      existing.mean = existing.sum / existing.count;
      if (e.value < existing.min) existing.min = e.value;
      if (e.value > existing.max) existing.max = e.value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

function computeMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function computeGlobalStd(values: number[]): number {
  if (values.length < 2) return 1;
  const mean = computeMean(values);
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) || 1;
}
