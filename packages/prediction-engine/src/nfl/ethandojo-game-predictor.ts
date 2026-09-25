/**
 * Ethandojo game predictor — seven-differential NFL game model.
 *
 * Feature vector (home − away) over seven team differentials:
 *   qbEPA, explosiveRate, turnoverMargin, passRush, pointDiff,
 *   availability, rosterCarryover.
 *
 * Contract:
 *  - Fail-closed inference: any missing / non-finite feature yields `null`.
 *    Never impute, never coerce, never guess a default.
 *  - Walk-forward training never sees the target week (strictly-before split).
 *  - Season simulation is Monte Carlo (default 10,000 reps), seeded and
 *    deterministic given a seed.
 *  - Benchmark gate for 10-6 and 11-5 records: a model that merely projects
 *    50% every game does NOT beat coin-flip (strict inequality required).
 *  - No hard-coded calendar dates anywhere; weeks/seasons are ordinal keys.
 *
 * Additive research module — not wired into any live prediction path.
 */

export const FEATURE_KEYS = [
  "qbEPA",
  "explosiveRate",
  "turnoverMargin",
  "passRush",
  "pointDiff",
  "availability",
  "rosterCarryover",
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type TeamFeatures = Readonly<Record<FeatureKey, number>>;

/** Home − away differential vector. `null` when any input feature is unusable. */
export type FeatureDifferentials = Readonly<Record<FeatureKey, number>>;

export interface GamePrediction {
  winProb: number;
  projectedScoreHome: number;
  projectedScoreAway: number;
}

export interface ModelWeights {
  intercept: number;
  /** One weight per FEATURE_KEYS entry, in FEATURE_KEYS order. */
  coefficients: readonly number[];
}

/** League-average combined score used to split projected points. Default 44. */
export const DEFAULT_LEAGUE_TOTAL = 44;

/** Points of margin per unit of composite logistic score. */
export const MARGIN_SCALE = 12;

function isUsableNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Home − away for every feature. Returns `null` if either side is missing any
 * feature or any value is non-finite (fail-closed; nothing is imputed).
 */
export function featureDifferentials(
  home: Partial<TeamFeatures> | null | undefined,
  away: Partial<TeamFeatures> | null | undefined,
): FeatureDifferentials | null {
  if (home == null || away == null) return null;
  const out: Record<FeatureKey, number> = {
    qbEPA: 0,
    explosiveRate: 0,
    turnoverMargin: 0,
    passRush: 0,
    pointDiff: 0,
    availability: 0,
    rosterCarryover: 0,
  };
  for (const key of FEATURE_KEYS) {
    const h = home[key];
    const a = away[key];
    if (!isUsableNumber(h) || !isUsableNumber(a)) return null;
    out[key] = h - a;
  }
  return out;
}

/**
 * Equal-weight composite prior used before any training data exists.
 * Magnitudes are intentionally modest; trained weights replace this.
 */
export function defaultWeights(): ModelWeights {
  return {
    intercept: 0,
    coefficients: [0.8, 0.6, 0.35, 0.45, 0.7, 0.5, 0.25],
  };
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * Logistic win probability from a differential vector.
 * `null` when any differential is non-finite (fail-closed).
 */
export function winProbabilityFromDifferentials(
  diffs: FeatureDifferentials | null | undefined,
  weights: ModelWeights = defaultWeights(),
): number | null {
  if (diffs == null) return null;
  if (
    !isUsableNumber(weights.intercept) ||
    !Array.isArray(weights.coefficients) ||
    weights.coefficients.length !== FEATURE_KEYS.length
  ) {
    return null;
  }
  let z = weights.intercept;
  for (let i = 0; i < FEATURE_KEYS.length; i++) {
    const key = FEATURE_KEYS[i];
    if (key === undefined) return null;
    const x = diffs[key];
    const w = weights.coefficients[i];
    if (!isUsableNumber(x) || !isUsableNumber(w)) return null;
    z += w * x;
  }
  const p = sigmoid(z);
  return Number.isFinite(p) ? p : null;
}

/**
 * Full game prediction. Fail-closed: missing/non-finite features on either
 * side return `null`. Projected scores split `leagueAverageTotal` around the
 * logistic-implied margin; both scores are finite when the result is non-null.
 */
export function predictGame(
  home: Partial<TeamFeatures> | null | undefined,
  away: Partial<TeamFeatures> | null | undefined,
  weights: ModelWeights = defaultWeights(),
  leagueAverageTotal: number = DEFAULT_LEAGUE_TOTAL,
): GamePrediction | null {
  const diffs = featureDifferentials(home, away);
  if (diffs == null) return null;
  if (!isUsableNumber(leagueAverageTotal) || leagueAverageTotal <= 0) return null;
  const winProb = winProbabilityFromDifferentials(diffs, weights);
  if (winProb == null) return null;
  // Map probability to expected margin: (p − 0.5) is in [−0.5, 0.5].
  const margin = (winProb - 0.5) * 2 * MARGIN_SCALE;
  const projectedScoreHome = leagueAverageTotal / 2 + margin / 2;
  const projectedScoreAway = leagueAverageTotal / 2 - margin / 2;
  if (!isUsableNumber(projectedScoreHome) || !isUsableNumber(projectedScoreAway)) {
    return null;
  }
  return { winProb, projectedScoreHome, projectedScoreAway };
}

// ---------------------------------------------------------------------------
// Walk-forward training
// ---------------------------------------------------------------------------

export interface WalkForwardSample {
  season: number;
  week: number;
  differentials: FeatureDifferentials;
  homeWon: boolean;
}

export interface WalkForwardSplit {
  /** Strictly-before the target (season, week). Safe training rows. */
  train: readonly WalkForwardSample[];
  /** The target week and anything after it — never used for fitting. */
  excluded: readonly WalkForwardSample[];
}

function sampleKey(s: { season: number; week: number }): number {
  return s.season * 1000 + s.week;
}

/**
 * Strictly-before walk-forward split. The target week (and every later week of
 * the target season / later seasons) lands in `excluded`, so training can never
 * leak the target week. Seasons/weeks are ordinal keys — no calendar dates.
 */
export function walkForwardSplit(
  samples: readonly WalkForwardSample[],
  targetSeason: number,
  targetWeek: number,
): WalkForwardSplit {
  const target = sampleKey({ season: targetSeason, week: targetWeek });
  const train: WalkForwardSample[] = [];
  const excluded: WalkForwardSample[] = [];
  for (const s of samples) {
    if (sampleKey(s) < target) train.push(s);
    else excluded.push(s);
  }
  return { train, excluded };
}

const FIT_ITERATIONS = 400;
const FIT_LEARNING_RATE = 0.05;
const FIT_L2 = 0.01;

/**
 * Fit logistic weights on the walk-forward training split only.
 * Returns `null` when the split is empty or any training row is unusable
 * (fail-closed — never invents weights from bad rows).
 */
export function trainWalkForward(
  samples: readonly WalkForwardSample[],
  targetSeason: number,
  targetWeek: number,
): ModelWeights | null {
  const { train } = walkForwardSplit(samples, targetSeason, targetWeek);
  if (train.length === 0) return null;
  for (const s of train) {
    if (!isUsableNumber(s.season) || !isUsableNumber(s.week)) return null;
    for (const key of FEATURE_KEYS) {
      if (!isUsableNumber(s.differentials[key])) return null;
    }
    if (typeof s.homeWon !== "boolean") return null;
  }

  const n = FEATURE_KEYS.length;
  const w: number[] = new Array<number>(n).fill(0);
  let b = 0;

  for (let iter = 0; iter < FIT_ITERATIONS; iter++) {
    const gradW: number[] = new Array<number>(n).fill(0);
    let gradB = 0;
    for (const s of train) {
      let z = b;
      for (let i = 0; i < n; i++) {
        const key = FEATURE_KEYS[i];
        if (key === undefined) return null;
        const wi = w[i];
        const xi = s.differentials[key];
        if (wi === undefined || !isUsableNumber(xi)) return null;
        z += wi * xi;
      }
      const y = s.homeWon ? 1 : 0;
      const err = sigmoid(z) - y;
      for (let i = 0; i < n; i++) {
        const key = FEATURE_KEYS[i];
        if (key === undefined) return null;
        const xi = s.differentials[key];
        const gi = gradW[i];
        if (gi === undefined || !isUsableNumber(xi)) return null;
        gradW[i] = gi + err * xi;
      }
      gradB += err;
    }
    const m = train.length;
    for (let i = 0; i < n; i++) {
      const wi = w[i];
      const gi = gradW[i];
      if (wi === undefined || gi === undefined) return null;
      w[i] = wi - FIT_LEARNING_RATE * (gi / m + FIT_L2 * wi);
    }
    b -= FIT_LEARNING_RATE * (gradB / m);
  }

  if (!isUsableNumber(b)) return null;
  for (const wi of w) if (!isUsableNumber(wi)) return null;
  return { intercept: b, coefficients: w };
}

// ---------------------------------------------------------------------------
// Season simulator (Monte Carlo)
// ---------------------------------------------------------------------------

export interface SeasonScheduleGame {
  week: number;
  homeTeam: string;
  awayTeam: string;
  /** P(home team wins). Must be finite in [0, 1]. */
  homeWinProb: number;
}

export interface TeamSeasonSummary {
  team: string;
  meanWins: number;
  /** winsHistogram[k] = number of sims in which the team won exactly k games. */
  winsHistogram: readonly number[];
  p10Wins: number;
  p50Wins: number;
  p90Wins: number;
}

export const DEFAULT_SEASON_REPS = 10_000;

/** Deterministic 32-bit PRNG (mulberry32). Same seed → same stream. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function quantileFromHistogram(hist: readonly number[], reps: number, q: number): number {
  const target = q * reps;
  let acc = 0;
  for (let k = 0; k < hist.length; k++) {
    const c = hist[k] ?? 0;
    acc += c;
    if (acc >= target) return k;
  }
  return Math.max(0, hist.length - 1);
}

/**
 * Monte Carlo season simulator. Default 10,000 reps. Each game is an
 * independent Bernoulli draw at `homeWinProb`. Throws on structurally invalid
 * input (empty schedule, unknown team, non-finite or out-of-range probability)
 * — this is a programming error path, not a data-missing path.
 */
export function simulateSeason(
  schedule: readonly SeasonScheduleGame[],
  options?: { reps?: number; seed?: number },
): readonly TeamSeasonSummary[] {
  if (schedule.length === 0) throw new Error("simulateSeason: empty schedule");
  const reps = options?.reps ?? DEFAULT_SEASON_REPS;
  if (!Number.isInteger(reps) || reps <= 0) throw new Error("simulateSeason: reps must be a positive integer");
  const seed = options?.seed ?? 20260925;
  const rng = mulberry32(seed);

  const teams = new Set<string>();
  for (const g of schedule) {
    if (!isUsableNumber(g.homeWinProb) || g.homeWinProb < 0 || g.homeWinProb > 1) {
      throw new Error("simulateSeason: homeWinProb must be in [0,1]");
    }
    if (typeof g.homeTeam !== "string" || g.homeTeam.length === 0) {
      throw new Error("simulateSeason: homeTeam required");
    }
    if (typeof g.awayTeam !== "string" || g.awayTeam.length === 0) {
      throw new Error("simulateSeason: awayTeam required");
    }
    teams.add(g.homeTeam);
    teams.add(g.awayTeam);
  }

  const teamList = [...teams].sort();
  const teamIndex = new Map<string, number>();
  teamList.forEach((t, i) => teamIndex.set(t, i));

  const gamesPerTeam = new Array<number>(teamList.length).fill(0);
  const wins = new Array<number>(teamList.length).fill(0);
  // hist[team][k] = count of sims with exactly k wins
  const hist: number[][] = teamList.map(() => new Array<number>(schedule.length + 1).fill(0));

  for (let rep = 0; rep < reps; rep++) {
    wins.fill(0);
    for (const g of schedule) {
      const hi = teamIndex.get(g.homeTeam);
      const ai = teamIndex.get(g.awayTeam);
      if (hi === undefined || ai === undefined) {
        throw new Error("simulateSeason: unknown team in schedule");
      }
      if (rep === 0) {
        gamesPerTeam[hi] = (gamesPerTeam[hi] ?? 0) + 1;
        gamesPerTeam[ai] = (gamesPerTeam[ai] ?? 0) + 1;
      }
      const homeWins = rng() < g.homeWinProb;
      const winner = homeWins ? hi : ai;
      wins[winner] = (wins[winner] ?? 0) + 1;
    }
    for (let t = 0; t < teamList.length; t++) {
      const w = wins[t] ?? 0;
      const row = hist[t];
      if (row === undefined) throw new Error("simulateSeason: histogram missing");
      row[w] = (row[w] ?? 0) + 1;
    }
  }

  return teamList.map((team, t) => {
    const row = hist[t] ?? [];
    let totalWins = 0;
    for (let k = 0; k < row.length; k++) totalWins += k * (row[k] ?? 0);
    return {
      team,
      meanWins: totalWins / reps,
      winsHistogram: row,
      p10Wins: quantileFromHistogram(row, reps, 0.1),
      p50Wins: quantileFromHistogram(row, reps, 0.5),
      p90Wins: quantileFromHistogram(row, reps, 0.9),
    };
  });
}

// ---------------------------------------------------------------------------
// Benchmark evaluator (10-6 and 11-5 records)
// ---------------------------------------------------------------------------

export type TargetRecord = "10-6" | "11-5";

export interface RecordBenchmarkInput {
  /** Model P(team wins game i), one entry per game of the season. */
  readonly gameWinProbs: readonly number[];
  /** The team's actual win total for that season. */
  readonly actualWins: number;
  readonly targetRecord: TargetRecord;
}

export interface RecordBenchmarkResult {
  targetRecord: TargetRecord;
  gamesInSeason: number;
  actualWins: number;
  /** Sum of per-game model win probabilities. */
  projectedWins: number;
  /** Coin-flip baseline projects 0.5 per game. */
  coinFlipProjectedWins: number;
  absError: number;
  coinFlipAbsError: number;
  /**
   * Strict: the model must beat coin-flip on absolute win error.
   * A model that projects 50% every game ties the baseline and does NOT beat it.
   */
  beatsCoinFlip: boolean;
}

const TARGET_RECORDS: Readonly<Record<TargetRecord, { wins: number; losses: number }>> = {
  "10-6": { wins: 10, losses: 6 },
  "11-5": { wins: 11, losses: 5 },
};

/**
 * Benchmark gate for 10-6 / 11-5 seasons. Compares the model's projected win
 * total against the coin-flip baseline (0.5 per game). Returns `null` on any
 * missing / non-finite / out-of-range input (fail-closed).
 */
export function evaluateRecordBenchmark(
  input: RecordBenchmarkInput | null | undefined,
): RecordBenchmarkResult | null {
  if (input == null) return null;
  const spec = TARGET_RECORDS[input.targetRecord];
  if (spec === undefined) return null;
  const probs = input.gameWinProbs;
  if (!Array.isArray(probs) || probs.length === 0) return null;
  if (!Number.isInteger(input.actualWins) || input.actualWins < 0) return null;

  const gamesInSeason = probs.length;
  if (gamesInSeason !== spec.wins + spec.losses) return null;
  if (input.actualWins !== spec.wins) return null;

  let projectedWins = 0;
  for (const p of probs) {
    if (!isUsableNumber(p) || p < 0 || p > 1) return null;
    projectedWins += p;
  }
  const coinFlipProjectedWins = 0.5 * gamesInSeason;
  const absError = Math.abs(projectedWins - input.actualWins);
  const coinFlipAbsError = Math.abs(coinFlipProjectedWins - input.actualWins);
  // Strict inequality: 50% every game → absError === coinFlipAbsError → false.
  const beatsCoinFlip = absError < coinFlipAbsError;
  return {
    targetRecord: input.targetRecord,
    gamesInSeason,
    actualWins: input.actualWins,
    projectedWins,
    coinFlipProjectedWins,
    absError,
    coinFlipAbsError,
    beatsCoinFlip,
  };
}

// ============================================================
// Engine-facing API (handoff-suite contract)

export interface GamePredictorApi {
  /**
   * `null` is a legal, meaningful input: it means "this differential was not
   * observed" and the call fails closed with `null`. The implementation has
   * always checked `v == null` for exactly that reason, but the parameter type
   * said `Partial<FeatureDifferentials>`, which admits `undefined` and a bare
   * omission but NOT `null`. The type denied the fail-closed path it implements.
   */
  predict(differentials: PredictorInput): GamePrediction | null;
  simulateSeason(teamWinProbs: readonly number[], reps?: number): { projectedWins: number; playoffOdds: number } | null;
  evaluateBenchmark(input: RecordBenchmarkInput | null | undefined): RecordBenchmarkResult | null;
}

/** Feature input where each differential may be absent, `null`, or a number. */
export type PredictorInput = {
  readonly [K in FeatureKey]?: number | null;
};

export interface GamePredictorOptions {
  readonly now?: () => Date;
}

export function createGamePredictor(options: GamePredictorOptions = {}): GamePredictorApi {
  const now = options.now ?? (() => new Date());
  void now;
  return {
    predict(differentials: PredictorInput): GamePrediction | null {
      const filled: Record<string, number> = {};
      for (const k of FEATURE_KEYS) {
        const v = differentials[k];
        if (v == null || !Number.isFinite(v)) return null;
        filled[k] = v;
      }
      const diffs = filled as unknown as FeatureDifferentials;
      const winProb = winProbabilityFromDifferentials(diffs, defaultWeights());
      if (winProb == null) return null;
      const margin = (winProb - 0.5) * 2 * MARGIN_SCALE;
      const half = DEFAULT_LEAGUE_TOTAL / 2;
      return {
        winProb,
        projectedScoreHome: half + margin / 2,
        projectedScoreAway: half - margin / 2,
      };
    },
    simulateSeason(teamWinProbs: readonly number[], reps = 10000) {
      if (!Array.isArray(teamWinProbs) || teamWinProbs.length === 0) return null;
      for (const p of teamWinProbs) {
        if (!isUsableNumber(p) || p < 0 || p > 1) return null;
      }
      if (!Number.isInteger(reps) || reps <= 0) return null;
      let winsSum = 0;
      let playoffCount = 0;
      for (let r = 0; r < reps; r++) {
        let wins = 0;
        for (const p of teamWinProbs) { if (Math.random() < p) wins += 1; }
        winsSum += wins;
        if (wins >= 10) playoffCount += 1;
      }
      return { projectedWins: winsSum / reps, playoffOdds: playoffCount / reps };
    },
    evaluateBenchmark(input) { return evaluateRecordBenchmark(input); },
  };
}
