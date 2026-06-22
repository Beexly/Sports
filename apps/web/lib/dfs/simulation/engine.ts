/**
 * DFS Monte Carlo Simulation Engine
 * Pure TypeScript log-normal simulation — no external dependencies.
 */

export interface SimulationInput {
  players: Array<{
    id: string;
    name: string;
    projection: number;
    floor: number;
    ceiling: number;
    ownership: number;
    volatility?: number;
  }>;
  lineups: Array<{ players: string[] }>; // player ids per lineup
  iterations?: number; // default 5000
}

export interface PlayerSimResult {
  id: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  boomProbability: number;
  bustProbability: number;
}

export interface LineupSimResult {
  lineupIndex: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  cashRateEstimate: number;
  top10PctEstimate: number;
  top1PctEstimate: number;
  bustProbability: number;
}

export interface SimulationResult {
  playerResults: PlayerSimResult[];
  lineupResults: LineupSimResult[];
  portfolioResults: {
    probAtLeastOneTop10Pct: number;
    probAtLeastOneTop1Pct: number;
    avgLineupP90: number;
    correlatedFailureRisk: number;
  };
  durationMs: number;
}

/** Box-Muller transform to generate a standard normal random variable */
function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Return the value at a given percentile (0–100) from a sorted ascending array */
function percentile(sorted: number[], pct: number): number {
  if (sorted.length === 0) return 0;
  const lastIdx = sorted.length - 1;
  const index = (pct / 100) * lastIdx;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const lo = sorted[lower] ?? 0;
  const hi = sorted[upper] ?? 0;
  if (lower === upper) return lo;
  const fraction = index - lower;
  return lo * (1 - fraction) + hi * fraction;
}

interface PlayerParams {
  id: string;
  mu: number;
  sigma: number;
  ceiling: number;
  floor: number;
  projection: number;
}

export function simulate(input: SimulationInput): SimulationResult {
  const startTime = Date.now();

  const { players, lineups } = input;

  // Cap iterations based on total work to maintain performance
  let iterations = input.iterations ?? 5000;
  const totalWork = lineups.length * iterations;
  if (totalWork > 500_000) {
    iterations = Math.max(1000, Math.floor(500_000 / Math.max(lineups.length, 1)));
  }
  // Clamp to sane bounds
  iterations = Math.min(10_000, Math.max(1_000, iterations));

  // Pre-compute log-normal parameters for each player
  const playerParams: PlayerParams[] = players.map((p) => {
    const proj = Math.max(p.projection, 0.1); // avoid log(0)
    const rawSigma = (p.ceiling - p.floor) / (proj * 4);
    const sigma = Math.min(1.0, Math.max(0.05, rawSigma));
    const mu = Math.log(proj) - 0.5 * sigma * sigma;
    return { id: p.id, mu, sigma, ceiling: p.ceiling, floor: p.floor, projection: p.projection };
  });

  const numPlayers = playerParams.length;
  const numLineups = lineups.length;

  // Build player index for fast lookup
  const playerIndexById = new Map<string, number>();
  playerParams.forEach((pp, i) => playerIndexById.set(pp.id, i));

  // Storage: flat Float64Arrays for performance
  // playerSamples[playerIndex * iterations + iterIndex]
  const playerSamples = new Float64Array(numPlayers * iterations);
  // lineupSamples[lineupIndex * iterations + iterIndex]
  const lineupSamples = new Float64Array(numLineups * iterations);

  // Pre-compute lineup player indices for fast inner loop
  const lineupPlayerIndices: number[][] = lineups.map((lu) =>
    lu.players
      .map((pid) => playerIndexById.get(pid))
      .filter((idx): idx is number => idx !== undefined)
  );

  // Run iterations
  const iterScores = new Float64Array(numPlayers);

  for (let iter = 0; iter < iterations; iter++) {
    // Sample each player
    for (let pi = 0; pi < numPlayers; pi++) {
      const pp = playerParams[pi];
      if (!pp) continue;
      const raw = Math.exp(pp.mu + pp.sigma * gaussianRandom());
      const clamped = Math.min(Math.max(raw, 0), pp.ceiling * 1.5);
      iterScores[pi] = clamped;
      playerSamples[pi * iterations + iter] = clamped;
    }

    // Sum lineup scores
    for (let li = 0; li < numLineups; li++) {
      let total = 0;
      const indices = lineupPlayerIndices[li];
      if (indices) {
        for (const idx of indices) {
          total += iterScores[idx] ?? 0;
        }
      }
      lineupSamples[li * iterations + iter] = total;
    }
  }

  // Helper: extract a player's scores as a sorted array
  const getSortedPlayerScores = (pi: number): number[] => {
    const arr: number[] = [];
    const base = pi * iterations;
    for (let i = 0; i < iterations; i++) {
      arr.push(playerSamples[base + i] ?? 0);
    }
    arr.sort((a, b) => a - b);
    return arr;
  };

  // Helper: extract a lineup's scores as an array (unsorted)
  const getLineupScores = (li: number): number[] => {
    const arr: number[] = [];
    const base = li * iterations;
    for (let i = 0; i < iterations; i++) {
      arr.push(lineupSamples[base + i] ?? 0);
    }
    return arr;
  };

  // Compute per-player results
  const playerResults: PlayerSimResult[] = playerParams.map((pp, i) => {
    const sorted = getSortedPlayerScores(i);
    const boomThresh = pp.ceiling * 0.9;
    const bustThresh = pp.floor * 1.1;
    let boomCount = 0;
    let bustCount = 0;
    for (const s of sorted) {
      if (s > boomThresh) boomCount++;
      if (s < bustThresh) bustCount++;
    }
    return {
      id: pp.id,
      p10: percentile(sorted, 10),
      p25: percentile(sorted, 25),
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
      boomProbability: boomCount / iterations,
      bustProbability: bustCount / iterations,
    };
  });

  // Compute per-lineup projection sum for threshold calculations
  const lineupProjectionSums: number[] = lineups.map((_, li) => {
    const indices = lineupPlayerIndices[li] ?? [];
    return indices.reduce((sum, idx) => {
      const pp = playerParams[idx];
      return sum + (pp ? pp.projection : 0);
    }, 0);
  });

  // Compute per-lineup results
  const lineupResults: LineupSimResult[] = lineups.map((_, li) => {
    const scores = getLineupScores(li);
    const sorted = [...scores].sort((a, b) => a - b);
    const projSum = lineupProjectionSums[li] ?? 0;
    const cashThresh = projSum * 1.0;
    const top10Thresh = projSum * 1.3;
    const top1Thresh = projSum * 1.7;
    const bustThresh = projSum * 0.7;

    let cashCount = 0;
    let top10Count = 0;
    let top1Count = 0;
    let bustCount = 0;
    for (const s of scores) {
      if (s > cashThresh) cashCount++;
      if (s > top10Thresh) top10Count++;
      if (s > top1Thresh) top1Count++;
      if (s < bustThresh) bustCount++;
    }

    return {
      lineupIndex: li,
      p50: percentile(sorted, 50),
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      cashRateEstimate: cashCount / iterations,
      top10PctEstimate: top10Count / iterations,
      top1PctEstimate: top1Count / iterations,
      bustProbability: bustCount / iterations,
    };
  });

  // Portfolio results
  let top10HitCount = 0;
  let top1HitCount = 0;

  for (let iter = 0; iter < iterations; iter++) {
    let anyTop10 = false;
    let anyTop1 = false;
    for (let li = 0; li < numLineups; li++) {
      const projSum = lineupProjectionSums[li] ?? 0;
      const score = lineupSamples[li * iterations + iter] ?? 0;
      if (score > projSum * 1.3) anyTop10 = true;
      if (score > projSum * 1.7) anyTop1 = true;
    }
    if (anyTop10) top10HitCount++;
    if (anyTop1) top1HitCount++;
  }

  const avgLineupP90 =
    lineupResults.length > 0
      ? lineupResults.reduce((sum, lr) => sum + lr.p90, 0) / lineupResults.length
      : 0;

  // Correlated failure risk heuristic based on player overlap
  let correlatedFailureRisk = 0;
  if (numLineups > 1) {
    let totalOverlap = 0;
    let pairs = 0;
    for (let a = 0; a < numLineups; a++) {
      for (let b = a + 1; b < numLineups; b++) {
        const indicesA = lineupPlayerIndices[a] ?? [];
        const indicesB = lineupPlayerIndices[b] ?? [];
        const setA = new Set(indicesA);
        const overlapCount = indicesB.filter((idx) => setA.has(idx)).length;
        const maxLen = Math.max(indicesA.length, indicesB.length);
        totalOverlap += maxLen > 0 ? overlapCount / maxLen : 0;
        pairs++;
      }
    }
    const avgOverlap = pairs > 0 ? totalOverlap / pairs : 0;
    correlatedFailureRisk = avgOverlap > 0.4 ? 0.6 : avgOverlap * 1.5;
  }

  const durationMs = Date.now() - startTime;

  return {
    playerResults,
    lineupResults,
    portfolioResults: {
      probAtLeastOneTop10Pct: top10HitCount / iterations,
      probAtLeastOneTop1Pct: top1HitCount / iterations,
      avgLineupP90,
      correlatedFailureRisk,
    },
    durationMs,
  };
}
