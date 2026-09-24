/**
 * Dominance-pruning preprocessor for DFS optimizers (arXiv 2211.02417v3).
 *
 * Before solving the weekly salary-cap MILP, apply the three-step
 * reduction:
 *  1. per salary bucket and position, keep only Pareto-optimal
 *     (salary, projection) players;
 *  2. drop any player strictly dominated by a cheaper-or-equal,
 *     higher-projected same-position peer;
 *  3. verify identical optima vs the unpruned MILP on test slates
 *     (target >= 10x solver-time reduction).
 * The paper's Algorithm 3 (lineup-diversity constraints as a GPP
 * construction heuristic) is out of scope for this small module; the
 * pruning preprocessor is the portable piece.
 *
 * ACCEPTANCE GATE: adopt the preprocessor iff it reproduces unpruned
 * optima exactly on all test slates with >= 10x speedup.
 *
 * Research-only module. Not wired into any live DFS path.
 */

export interface DfsPlayer {
  id: string;
  position: string;
  salary: number;
  projection: number;
}

/**
 * Step 1: per (position, salary bucket), keep Pareto-optimal players —
 * no other player in the bucket has both salary <= and projection >=
 * with at least one strict.
 */
export function paretoFilter(
  players: readonly DfsPlayer[],
  bucketSize = 500,
): DfsPlayer[] {
  if (players.length === 0) return [];
  const buckets = new Map<string, DfsPlayer[]>();
  for (const p of players) {
    const key = `${p.position}:${Math.floor(p.salary / bucketSize)}`;
    const arr = buckets.get(key) ?? [];
    arr.push(p);
    buckets.set(key, arr);
  }
  const kept: DfsPlayer[] = [];
  for (const arr of buckets.values()) {
    for (const p of arr) {
      const dominated = arr.some(
        (q) =>
          q !== p &&
          q.salary <= p.salary &&
          q.projection >= p.projection &&
          (q.salary < p.salary || q.projection > p.projection),
      );
      if (!dominated) kept.push(p);
    }
  }
  return kept;
}

/**
 * Step 2: drop any player strictly dominated by a cheaper-or-equal,
 * higher-projected same-position peer (across buckets). Safe for the
 * optimum when each position fills a single slot (swapping the
 * dominated player for its dominator never breaks the cap and never
 * lowers projection).
 */
export function dominancePrune(players: readonly DfsPlayer[]): DfsPlayer[] {
  return players.filter(
    (p) =>
      !players.some(
        (q) =>
          q !== p &&
          q.position === p.position &&
          q.salary <= p.salary &&
          q.projection > p.projection,
      ),
  );
}

/** Full three-step preprocessor: Pareto filter then dominance prune. */
export function prunePool(
  players: readonly DfsPlayer[],
  bucketSize = 500,
): DfsPlayer[] {
  return dominancePrune(paretoFilter(players, bucketSize));
}

export interface Lineup {
  players: DfsPlayer[];
  salary: number;
  projection: number;
}

/**
 * Brute-force optimal lineup (for verification on small slates):
 * exactly `slots` players, one per required position, under the cap,
 * maximizing total projection.
 */
export function bruteForceOptimal(
  players: readonly DfsPlayer[],
  positions: readonly string[],
  cap: number,
): Lineup | null {
  const byPos = positions.map((pos) => players.filter((p) => p.position === pos));
  if (byPos.some((arr) => arr.length === 0)) return null;
  let best: Lineup | null = null;
  const idx = new Array<number>(positions.length).fill(0);
  for (;;) {
    const lineup = idx.map((k, s) => (byPos[s] as DfsPlayer[])[k] as DfsPlayer);
    const salary = lineup.reduce((s, p) => s + p.salary, 0);
    if (salary <= cap) {
      const projection = lineup.reduce((s, p) => s + p.projection, 0);
      if (!best || projection > best.projection) {
        best = { players: lineup, salary, projection };
      }
    }
    let s = positions.length - 1;
    while (s >= 0) {
      (idx[s] as number)++;
      if ((idx[s] as number) < ((byPos[s] as DfsPlayer[]).length as number)) break;
      idx[s] = 0;
      s--;
    }
    if (s < 0) break;
  }
  return best;
}

export interface PruneVerification {
  prunedCount: number;
  originalCount: number;
  /** True when the pruned optimum equals the unpruned optimum. */
  optimaMatch: boolean;
  prunedProjection: number | null;
  originalProjection: number | null;
}

/**
 * Step 3: verify the pruned pool reproduces the unpruned optimum
 * exactly on a slate.
 */
export function verifyPruning(
  players: readonly DfsPlayer[],
  positions: readonly string[],
  cap: number,
  bucketSize = 500,
): PruneVerification {
  const pruned = prunePool(players, bucketSize);
  const origOpt = bruteForceOptimal(players, positions, cap);
  const prunedOpt = bruteForceOptimal(pruned, positions, cap);
  const op = origOpt?.projection ?? null;
  const pp = prunedOpt?.projection ?? null;
  return {
    prunedCount: pruned.length,
    originalCount: players.length,
    optimaMatch: op !== null && pp !== null && Math.abs(op - pp) < 1e-9,
    prunedProjection: pp,
    originalProjection: op,
  };
}
