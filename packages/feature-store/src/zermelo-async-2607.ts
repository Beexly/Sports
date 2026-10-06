/**
 * Synchronous vs asynchronous (Newman alpha=0) Bradley-Terry fitters
 *
 * Research port: arXiv:2607.22221v1
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure comparison harness for the paper's Zermelo-type iteration family.
 * zermeloSync runs the classic synchronous Zermelo iteration; newmanAsyncAlpha0
 * runs per-team asynchronous (Gauss-Seidel) updates with unit-product
 * normalization after each full sweep. Each per-team Zermelo update is the exact
 * coordinate maximizer of the Bradley-Terry log-likelihood, so the async variant
 * is coordinate ascent and its log-likelihood increases monotonically across
 * sweeps (up to floating-point noise). compareFitters runs both to tolerance and
 * reports pass counts, max log-ratio MLE disagreement, the async pass-count
 * ratio, and the async monotonicity verdict.
 *
 * BT model: P(a beats b) = pi_a / (pi_a + pi_b); Zermelo update for team i is
 * pi_i <- W_i / sum_j n_ij / (pi_i + pi_j), with W_i total wins and n_ij games
 * played between i and j. Unit-product normalization (geometric mean 1) fixes
 * the MLE's scale indeterminacy so the two fitters are directly comparable.
 *
 * ACCEPTANCE GATE: ADOPT the async alpha=0 fitter iff on the CFB dataset it
 * reaches tolerance in >=1.5x fewer full passes than synchronous Zermelo AND
 * produces identical MLEs to 1e-9 log-ratio AND likelihood increases
 * monotonically across passes. Hard REJECT if the async variant ever decreases
 * likelihood across a pass. (The 1.5x bar is a real-data criterion; this module
 * is the harness that measures it — it reports the ratio, it does not claim it.)
 */

export interface GameResult {
  teamA: string;
  teamB: string;
  /** true if teamA won, false if teamB won */
  aWon: boolean;
}

export interface FitResult {
  /** unit-product normalized strengths (geometric mean 1) */
  strengths: Record<string, number>;
  /** full sweeps run to reach tolerance */
  passes: number;
  logLikelihood: number;
  /** per-sweep log-likelihood trace, starting from the initial point */
  likelihoodTrace: number[];
  converged: boolean;
}

export interface FitterComparison {
  sync: FitResult;
  async: FitResult;
  /** max over teams of |log(pi_sync) - log(pi_async)| */
  maxLogRatioDiff: number;
  /** sync.passes / async.passes; >1 means async was faster */
  passRatio: number;
  /** async likelihood never decreased across a sweep (within 1e-12) */
  asyncMonotone: boolean;
  /** gate-relevant verdict: identical MLEs to 1e-9 log-ratio */
  identicalMles: boolean;
}

interface ParsedSeason {
  teams: string[];
  wins: Map<string, number>;
  meetings: Map<string, Map<string, number>>;
}

function parseSeason(games: GameResult[]): ParsedSeason {
  const teams: string[] = [];
  const seen = new Set<string>();
  const wins = new Map<string, number>();
  const meetings = new Map<string, Map<string, number>>();
  const addTeam = (t: string): void => {
    if (!seen.has(t)) {
      seen.add(t);
      teams.push(t);
      wins.set(t, 0);
      meetings.set(t, new Map());
    }
  };
  for (const g of games ?? []) {
    if (!g || typeof g.teamA !== "string" || typeof g.teamB !== "string") continue;
    if (g.teamA.length === 0 || g.teamB.length === 0) continue;
    if (g.teamA === g.teamB) continue; // self-games carry no information
    addTeam(g.teamA);
    addTeam(g.teamB);
    const ma = meetings.get(g.teamA);
    const mb = meetings.get(g.teamB);
    if (ma && mb) {
      ma.set(g.teamB, (ma.get(g.teamB) ?? 0) + 1);
      mb.set(g.teamA, (mb.get(g.teamA) ?? 0) + 1);
    }
    if (g.aWon) wins.set(g.teamA, (wins.get(g.teamA) ?? 0) + 1);
    else wins.set(g.teamB, (wins.get(g.teamB) ?? 0) + 1);
  }
  return { teams, wins, meetings };
}

function logLikelihood(
  games: GameResult[],
  strengths: Map<string, number>,
): number {
  let ll = 0;
  for (const g of games) {
    const pa = strengths.get(g.teamA) ?? 1;
    const pb = strengths.get(g.teamB) ?? 1;
    if (!(pa > 0) || !(pb > 0) || !Number.isFinite(pa) || !Number.isFinite(pb)) {
      return Number.NEGATIVE_INFINITY;
    }
    ll += g.aWon ? Math.log(pa / (pa + pb)) : Math.log(pb / (pa + pb));
  }
  return ll;
}

/**
 * Fit Bradley-Terry strengths.
 *
 * @param games   game results
 * @param async   false = synchronous Zermelo; true = Newman alpha=0
 *                asynchronous per-team updates with unit-product normalization
 * @param tol     sweep convergence tolerance on max |log-ratio| change
 * @param maxPasses safety cap on full sweeps
 */
export function fitBradleyTerry(
  games: GameResult[],
  async: boolean,
  tol = 1e-12,
  maxPasses = 50000,
): FitResult {
  const { teams, wins, meetings } = parseSeason(games);
  const pi = new Map<string, number>();
  for (const t of teams) pi.set(t, 1);

  const normalize = (): void => {
    let sum = 0;
    for (const t of teams) sum += Math.log(Math.max(pi.get(t) ?? 1, 1e-300));
    const gm = Math.exp(sum / teams.length);
    for (const t of teams) pi.set(t, (pi.get(t) ?? 1) / gm);
  };

  const validGames = (games ?? []).filter(
    (g) =>
      g &&
      typeof g.teamA === "string" &&
      typeof g.teamB === "string" &&
      g.teamA.length > 0 &&
      g.teamB.length > 0 &&
      g.teamA !== g.teamB,
  );

  normalize();
  const likelihoodTrace: number[] = [logLikelihood(validGames, pi)];
  let passes = 0;
  let converged = teams.length === 0;

  while (!converged && passes < maxPasses) {
    const prev = new Map(pi);
    passes += 1;
    if (!async) {
      const next = new Map<string, number>();
      for (const i of teams) {
        let denom = 0;
        const row = meetings.get(i);
        if (row) {
          for (const [j, n] of row) denom += n / ((pi.get(i) ?? 1) + (pi.get(j) ?? 1));
        }
        const w = wins.get(i) ?? 0;
        next.set(i, denom > 0 ? (w > 0 ? w / denom : 1e-12) : (pi.get(i) ?? 1));
      }
      for (const [t, v] of next) pi.set(t, v);
    } else {
      // Newman alpha=0: per-team updates in place (coordinate ascent)
      for (const i of teams) {
        let denom = 0;
        const row = meetings.get(i);
        if (row) {
          for (const [j, n] of row) denom += n / ((pi.get(i) ?? 1) + (pi.get(j) ?? 1));
        }
        const w = wins.get(i) ?? 0;
        if (denom > 0) pi.set(i, w > 0 ? w / denom : 1e-12);
      }
    }
    normalize();
    likelihoodTrace.push(logLikelihood(validGames, pi));
    let maxChange = 0;
    for (const t of teams) {
      const a = Math.max(pi.get(t) ?? 1, 1e-300);
      const b = Math.max(prev.get(t) ?? 1, 1e-300);
      maxChange = Math.max(maxChange, Math.abs(Math.log(a / b)));
    }
    if (maxChange < tol) converged = true;
  }

  const strengths: Record<string, number> = {};
  for (const t of teams) strengths[t] = pi.get(t) ?? 1;
  return {
    strengths,
    passes,
    logLikelihood: likelihoodTrace[likelihoodTrace.length - 1] ?? 0,
    likelihoodTrace,
    converged,
  };
}

/** Classic synchronous Zermelo iteration. */
export function zermeloSync(
  games: GameResult[],
  tol = 1e-12,
  maxPasses = 50000,
): FitResult {
  return fitBradleyTerry(games, false, tol, maxPasses);
}

/**
 * Newman's alpha=0 scheme: asynchronous per-team updates with unit-product
 * normalization after each sweep.
 */
export function newmanAsyncAlpha0(
  games: GameResult[],
  tol = 1e-12,
  maxPasses = 50000,
): FitResult {
  return fitBradleyTerry(games, true, tol, maxPasses);
}

/** Run both fitters and report the gate-relevant comparison. */
export function compareFitters(
  games: GameResult[],
  tol = 1e-12,
  maxPasses = 50000,
): FitterComparison {
  const sync = zermeloSync(games, tol, maxPasses);
  const async = newmanAsyncAlpha0(games, tol, maxPasses);
  let maxLogRatioDiff = 0;
  for (const t of Object.keys(sync.strengths)) {
    const a = Math.max(sync.strengths[t] ?? 1, 1e-300);
    const b = Math.max(async.strengths[t] ?? 1, 1e-300);
    maxLogRatioDiff = Math.max(maxLogRatioDiff, Math.abs(Math.log(a / b)));
  }
  let asyncMonotone = true;
  for (let k = 1; k < async.likelihoodTrace.length; k++) {
    const prev = async.likelihoodTrace[k - 1] ?? Number.NEGATIVE_INFINITY;
    const cur = async.likelihoodTrace[k] ?? Number.NEGATIVE_INFINITY;
    if (cur < prev - 1e-12) {
      asyncMonotone = false;
      break;
    }
  }
  return {
    sync,
    async,
    maxLogRatioDiff,
    passRatio: async.passes > 0 ? sync.passes / async.passes : Number.NaN,
    asyncMonotone,
    identicalMles: maxLogRatioDiff < 1e-9,
  };
}

export const GSE_ZERMELO_ASYNC_ENABLED = false;
