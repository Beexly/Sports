/**
 * Monte Carlo game simulation utilities — pure, zero dependencies.
 *
 * Analytical tools for historical and research purposes.
 * All outputs are probability estimates based on statistical models.
 * Results are not predictions of actual game outcomes.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface SimulationConfig {
  iterations: number; // default 10000
  seed?: number; // for reproducibility (use LCG)
}

export interface TeamStrength {
  teamId: string;
  offensiveRating: number; // points per game, e.g. 24.5
  defensiveRating: number; // points allowed per game, e.g. 21.3
  homeFieldAdv?: number; // additional points at home, default 2.5
}

export interface SimulationResult {
  homeWinProbability: number; // 0-1
  awayWinProbability: number; // 0-1
  tieProb: number; // for sports with ties
  medianHomeScore: number;
  medianAwayScore: number;
  avgHomeScore: number;
  avgAwayScore: number;
  avgTotalPoints: number;
  stdDevHomeScore: number;
  stdDevAwayScore: number;
  homeWins: number; // raw counts
  awayWins: number;
  ties: number;
  iterations: number;
  coverProbability?: number; // if spread provided
  overProbability?: number; // if total provided
}

export interface ScoreDistribution {
  score: number;
  count: number;
  probability: number;
  cumulativeProbability: number;
}

export interface MarginDistribution {
  margin: number; // positive = home wins by this; negative = away wins
  count: number;
  probability: number;
}

export interface SeasonSimResult {
  teamId: string;
  avgWins: number;
  minWins: number;
  maxWins: number;
  stdDevWins: number;
  winDistribution: Record<number, number>; // wins → count
  playoffProbability: number; // > 8.5 wins (out of 17 = NFL)
}

export interface TournamentResult {
  champion: string;
  finalFourAppearances: Record<string, number>; // teamId → count
  championProbabilities: Record<string, number>; // teamId → 0-1
}

// ── LCG Random Number Generator ────────────────────────────────────────────

/**
 * Linear Congruential Generator for reproducible random number sequences.
 * Uses parameters from Numerical Recipes (m=2^32, a=1664525, c=1013904223).
 */
export class Lcg {
  private state: number;

  constructor(seed?: number) {
    this.state = seed !== undefined ? seed : 12345;
    // Ensure state is a 32-bit unsigned integer
    this.state = this.state >>> 0;
  }

  /** Returns uniform [0, 1) */
  next(): number {
    // LCG formula: state = (a * state + c) mod m
    this.state = ((1664525 * this.state + 1013904223) >>> 0);
    return this.state / 4294967296; // divide by 2^32
  }

  /** Returns integer in [0, max) */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  /** Returns from normal distribution (Box-Muller transform) */
  nextNormal(mean: number = 0, std: number = 1): number {
    // Box-Muller transform: requires two uniform samples
    const u1 = this.next();
    const u2 = this.next();
    // Avoid log(0) by clamping u1 away from 0
    const u1Safe = Math.max(u1, 1e-10);
    const z = Math.sqrt(-2 * Math.log(u1Safe)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z;
  }

  /**
   * Returns from Poisson distribution.
   * Uses Knuth algorithm: L=e^-lambda, start with p=1,k=0;
   * while p>L: p*=next(), k++; return k-1
   */
  nextPoisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let p = 1;
    let k = 0;
    do {
      k++;
      p *= this.next();
    } while (p > L);
    return k - 1;
  }
}

// ── Core Simulation Helpers ────────────────────────────────────────────────

function defaultConfig(config?: SimulationConfig): Required<SimulationConfig> {
  return {
    iterations: config?.iterations ?? 10000,
    seed: config?.seed ?? 12345,
  };
}

function computeExpectedScores(
  home: TeamStrength,
  away: TeamStrength
): { homeExpected: number; awayExpected: number } {
  const hfa = home.homeFieldAdv ?? 2.5;
  const homeExpected =
    (home.offensiveRating + away.defensiveRating) / 2 + hfa / 2;
  const awayExpected =
    (away.offensiveRating + home.defensiveRating) / 2 - hfa / 2;
  return { homeExpected, awayExpected };
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

function stdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

interface RawSimRun {
  homeScores: number[];
  awayScores: number[];
}

/** Run N normal-model games and return raw score arrays */
function runNormalSimulation(
  home: TeamStrength,
  away: TeamStrength,
  cfg: Required<SimulationConfig>,
  std: number = 10
): RawSimRun {
  const rng = new Lcg(cfg.seed);
  const { homeExpected, awayExpected } = computeExpectedScores(home, away);
  const homeScores: number[] = [];
  const awayScores: number[] = [];

  for (let i = 0; i < cfg.iterations; i++) {
    const hs = Math.max(0, rng.nextNormal(homeExpected, std));
    const as = Math.max(0, rng.nextNormal(awayExpected, std));
    homeScores.push(hs);
    awayScores.push(as);
  }

  return { homeScores, awayScores };
}

function buildResultFromRaw(
  homeScores: number[],
  awayScores: number[],
  spread?: number,
  overUnder?: number
): SimulationResult {
  const n = homeScores.length;
  let homeWins = 0;
  let awayWins = 0;
  let ties = 0;
  let coverCount = 0;
  let overCount = 0;

  for (let i = 0; i < n; i++) {
    const hs = homeScores[i] ?? 0;
    const as = awayScores[i] ?? 0;
    const margin = hs - as;

    if (margin > 0) homeWins++;
    else if (margin < 0) awayWins++;
    else ties++;

    if (spread !== undefined) {
      // Cover: home actual margin > -spread (home covers if margin > -spread)
      if (margin > -spread) coverCount++;
    }
    if (overUnder !== undefined) {
      if (hs + as > overUnder) overCount++;
    }
  }

  const sortedHome = [...homeScores].sort((a, b) => a - b);
  const sortedAway = [...awayScores].sort((a, b) => a - b);

  const avgHome = homeScores.reduce((a, b) => a + b, 0) / n;
  const avgAway = awayScores.reduce((a, b) => a + b, 0) / n;

  const result: SimulationResult = {
    homeWinProbability: homeWins / n,
    awayWinProbability: awayWins / n,
    tieProb: ties / n,
    medianHomeScore: median(sortedHome),
    medianAwayScore: median(sortedAway),
    avgHomeScore: avgHome,
    avgAwayScore: avgAway,
    avgTotalPoints: avgHome + avgAway,
    stdDevHomeScore: stdDev(homeScores, avgHome),
    stdDevAwayScore: stdDev(awayScores, avgAway),
    homeWins,
    awayWins,
    ties,
    iterations: n,
  };

  if (spread !== undefined) {
    result.coverProbability = coverCount / n;
  }
  if (overUnder !== undefined) {
    result.overProbability = overCount / n;
  }

  return result;
}

// ── Public Functions ───────────────────────────────────────────────────────

/**
 * Simulate a single game using a Normal scoring model (NFL-style continuous scoring).
 * Each team's score is drawn from Normal(mean, 10).
 * Scores are clamped to >= 0.
 */
export function simulateGame(
  home: TeamStrength,
  away: TeamStrength,
  config?: SimulationConfig
): SimulationResult {
  const cfg = defaultConfig(config);
  const { homeScores, awayScores } = runNormalSimulation(home, away, cfg);
  return buildResultFromRaw(homeScores, awayScores);
}

/**
 * Simulate a game and compute cover/over probabilities.
 * spread < 0 means home is favored (e.g., -3 = home -3).
 * Cover: home actual margin > -spread.
 * Over: home + away > overUnder.
 */
export function simulateGameWithSpread(
  home: TeamStrength,
  away: TeamStrength,
  spread: number,
  overUnder?: number,
  config?: SimulationConfig
): SimulationResult {
  const cfg = defaultConfig(config);
  const { homeScores, awayScores } = runNormalSimulation(home, away, cfg);
  return buildResultFromRaw(homeScores, awayScores, spread, overUnder);
}

/**
 * Simulate an entire season (e.g., NFL 17-game schedule).
 * Tracks win totals across all iterations.
 * playoffProbability: fraction of iterations with >= 9 wins.
 */
export function simulateSeason(
  teamId: string,
  schedule: Array<{ opponent: TeamStrength; isHome: boolean }>,
  teamStrength: TeamStrength,
  config?: SimulationConfig
): SeasonSimResult {
  const cfg = defaultConfig(config);
  const winDistribution: Record<number, number> = {};
  const winTotals: number[] = [];

  for (let iter = 0; iter < cfg.iterations; iter++) {
    // Use a different seed per iteration derived from base seed
    const iterSeed = (cfg.seed + iter * 1000003) >>> 0;
    let wins = 0;

    for (const game of schedule) {
      const home: TeamStrength = game.isHome ? teamStrength : game.opponent;
      const away: TeamStrength = game.isHome ? game.opponent : teamStrength;

      // Run a single-iteration simulation for this game
      const gameSeed = (iterSeed + wins * 7919) >>> 0;
      const rng = new Lcg(gameSeed);
      const { homeExpected, awayExpected } = computeExpectedScores(home, away);
      const hs = Math.max(0, rng.nextNormal(homeExpected, 10));
      const as = Math.max(0, rng.nextNormal(awayExpected, 10));

      const teamIsHome = game.isHome;
      const teamScore = teamIsHome ? hs : as;
      const oppScore = teamIsHome ? as : hs;

      if (teamScore > oppScore) wins++;
    }

    winTotals.push(wins);
    winDistribution[wins] = (winDistribution[wins] ?? 0) + 1;
  }

  const avgWins = winTotals.reduce((a, b) => a + b, 0) / cfg.iterations;
  const minWins = Math.min(...winTotals);
  const maxWins = Math.max(...winTotals);
  const playoffCount = winTotals.filter((w) => w >= 9).length;

  return {
    teamId,
    avgWins,
    minWins,
    maxWins,
    stdDevWins: stdDev(winTotals, avgWins),
    winDistribution,
    playoffProbability: playoffCount / cfg.iterations,
  };
}

/**
 * Simulate a game using Poisson scoring model (soccer/hockey: discrete, low-scoring).
 * Each team's score is drawn from Poisson(lambda).
 * tieProb is computed as fraction of simulations where home == away.
 */
export function simulatePoissonGame(
  homeLambda: number,
  awayLambda: number,
  config?: SimulationConfig
): SimulationResult {
  const cfg = defaultConfig(config);
  const rng = new Lcg(cfg.seed);
  const homeScores: number[] = [];
  const awayScores: number[] = [];

  for (let i = 0; i < cfg.iterations; i++) {
    const hs = rng.nextPoisson(homeLambda);
    const as = rng.nextPoisson(awayLambda);
    homeScores.push(hs);
    awayScores.push(as);
  }

  return buildResultFromRaw(homeScores, awayScores);
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 26.2.17).
 * Accurate to ~7 significant figures.
 */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly =
    t *
    (0.319381530 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const result = 1 - pdf * poly;
  return x >= 0 ? result : 1 - result;
}

/**
 * Estimate P(minScore <= X <= maxScore) using normal CDF approximation
 * with avg/std from the simulation result.
 */
export function scoreRangeProbability(
  results: SimulationResult,
  minScore: number,
  maxScore: number,
  forHome: boolean
): number {
  const mean = forHome ? results.avgHomeScore : results.avgAwayScore;
  const std = forHome ? results.stdDevHomeScore : results.stdDevAwayScore;

  if (std === 0) {
    return mean >= minScore && mean <= maxScore ? 1 : 0;
  }

  const zMin = (minScore - mean) / std;
  const zMax = (maxScore - mean) / std;
  return Math.max(0, Math.min(1, normalCdf(zMax) - normalCdf(zMin)));
}

/**
 * Run a full simulation and return score distribution bucketed by integer score.
 * Sorted ascending by score with cumulative probability.
 */
export function scoreDistribution(
  home: TeamStrength,
  away: TeamStrength,
  forHome: boolean,
  config?: SimulationConfig
): ScoreDistribution[] {
  const cfg = defaultConfig(config);
  const { homeScores, awayScores } = runNormalSimulation(home, away, cfg);
  const scores = forHome ? homeScores : awayScores;
  const n = scores.length;

  const buckets: Map<number, number> = new Map();
  for (const score of scores) {
    const bucket = Math.round(score);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const sorted = [...buckets.entries()].sort(([a], [b]) => a - b);
  const result: ScoreDistribution[] = [];
  let cumulative = 0;

  for (const [score, count] of sorted) {
    const probability = count / n;
    cumulative += probability;
    result.push({
      score,
      count,
      probability,
      cumulativeProbability: cumulative,
    });
  }

  return result;
}

/**
 * Run simulation and return margin distribution (homeScore - awayScore, rounded to int).
 * Sorted ascending by margin.
 */
export function marginDistribution(
  home: TeamStrength,
  away: TeamStrength,
  config?: SimulationConfig
): MarginDistribution[] {
  const cfg = defaultConfig(config);
  const { homeScores, awayScores } = runNormalSimulation(home, away, cfg);
  const n = homeScores.length;

  const buckets: Map<number, number> = new Map();
  for (let i = 0; i < n; i++) {
    const margin = Math.round((homeScores[i] ?? 0) - (awayScores[i] ?? 0));
    buckets.set(margin, (buckets.get(margin) ?? 0) + 1);
  }

  const sorted = [...buckets.entries()].sort(([a], [b]) => a - b);
  return sorted.map(([margin, count]) => ({
    margin,
    count,
    probability: count / n,
  }));
}

/**
 * Compute implied home win probability from a point spread.
 * P(home wins) = normalCdf(-spread / stdDev)
 * spread = -3 → home favored → P > 0.5
 */
export function impliedWinProbFromSpread(
  spread: number,
  stdDev: number = 13.5
): number {
  return normalCdf(-spread / stdDev);
}

/**
 * Convert win probability to American moneyline odds.
 * prob >= 0.5 → negative ML (favorite); prob < 0.5 → positive ML (underdog).
 * Clamped to [-10000, +10000].
 */
export function winProbToMoneyline(prob: number): number {
  const clamped = Math.max(0.0001, Math.min(0.9999, prob));
  let ml: number;
  if (clamped >= 0.5) {
    ml = -(clamped / (1 - clamped)) * 100;
  } else {
    ml = ((1 - clamped) / clamped) * 100;
  }
  ml = Math.round(ml);
  return Math.max(-10000, Math.min(10000, ml));
}

/**
 * Simulate a single-elimination tournament bracket.
 * Teams must be a power of 2 (2, 4, 8, 16).
 * Seedings: teams in input order (index 0 = 1-seed).
 * Tracks champion per iteration and final-four appearances.
 */
export function simulateTournament(
  teams: TeamStrength[],
  config?: SimulationConfig
): TournamentResult {
  const n = teams.length;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`Teams must be a power of 2, got ${n}`);
  }

  const cfg = defaultConfig(config);
  const championCounts: Record<string, number> = {};
  const finalFourCounts: Record<string, number> = {};

  for (const t of teams) {
    championCounts[t.teamId] = 0;
    finalFourCounts[t.teamId] = 0;
  }

  for (let iter = 0; iter < cfg.iterations; iter++) {
    let bracket = [...teams];
    const roundSeed = (cfg.seed + iter * 999983) >>> 0;

    let round = 0;
    while (bracket.length > 1) {
      const nextRound: TeamStrength[] = [];
      const isFinalFourRound = bracket.length === 4;

      for (let i = 0; i < bracket.length; i += 2) {
        const teamA = bracket[i];
        const teamB = bracket[i + 1];
        if (teamA === undefined || teamB === undefined) continue;
        const gameSeed = (roundSeed + round * 100003 + i * 7919) >>> 0;
        const rng = new Lcg(gameSeed);

        // teamA is home (higher seed), no home field advantage in tournament
        const neutralHome: TeamStrength = {
          ...teamA,
          homeFieldAdv: 0,
        };
        const { homeExpected, awayExpected } = computeExpectedScores(
          neutralHome,
          teamB
        );
        const scoreA = Math.max(0, rng.nextNormal(homeExpected, 10));
        const scoreB = Math.max(0, rng.nextNormal(awayExpected, 10));

        // In case of exact tie (extremely rare with Normal), pick higher seed
        const winner = scoreA >= scoreB ? teamA : teamB;
        nextRound.push(winner);

        if (isFinalFourRound) {
          finalFourCounts[teamA.teamId] = (finalFourCounts[teamA.teamId] ?? 0) + 1;
          finalFourCounts[teamB.teamId] = (finalFourCounts[teamB.teamId] ?? 0) + 1;
        }
      }

      bracket = nextRound;
      round++;
    }

    const champion = bracket[0];
    if (champion !== undefined) {
      championCounts[champion.teamId] = (championCounts[champion.teamId] ?? 0) + 1;
    }
  }

  const championProbabilities: Record<string, number> = {};
  for (const teamId of Object.keys(championCounts)) {
    championProbabilities[teamId] = (championCounts[teamId] ?? 0) / cfg.iterations;
  }

  // Find most likely champion
  let bestChampion = teams[0]!.teamId;
  let bestCount = 0;
  for (const [teamId, count] of Object.entries(championCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestChampion = teamId;
    }
  }

  return {
    champion: bestChampion,
    finalFourAppearances: finalFourCounts,
    championProbabilities,
  };
}

/**
 * Compute expected value of a bet.
 * EV = trueWinProb * profitIfWin - (1-trueWinProb) * 1
 * profitIfWin: odds > 0 → odds/100; odds < 0 → 100/|odds|
 */
export function betExpectedValue(
  trueWinProb: number,
  odds: number
): number {
  const profitIfWin = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
  return trueWinProb * profitIfWin - (1 - trueWinProb) * 1;
}

/**
 * Kelly criterion fraction for optimal bet sizing.
 * b = profitIfWin (from betExpectedValue formula)
 * Kelly = (b * trueWinProb - (1-trueWinProb)) / b
 * Clamped to [0, 1]; returns 0 if negative (negative EV).
 */
export function kellyFraction(trueWinProb: number, odds: number): number {
  const b = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
  const kelly = (b * trueWinProb - (1 - trueWinProb)) / b;
  return Math.max(0, Math.min(1, kelly));
}
