/**
 * Fixed support pools for meta-training (arXiv 2011.14048v2).
 *
 * The paper asks whether support-set diversity is necessary for
 * meta-learning; the GSE adaptation fixes the meta-training episode
 * sampler to canonical per-team-season support pools: K games sampled once
 * and frozen (default weeks {2, 5, 9, 13, 16}), with query sets still
 * diverse. The improvement experiment builds archetype-optimized
 * designed-fixed pools: K games per team-season maximizing coverage of
 * opponent archetypes (elite offense, elite defense, balanced, weak).
 * Meta-train on fixed supports, evaluate under the full objective (random
 * supports) on held-out regimes, on both over-parameterized and small
 * tabular backbones.
 *
 * ACCEPTANCE GATE: ADOPT the fixed-support sampler iff it beats
 * random-support meta-training by >= 1pp accuracy on new-regime win
 * prediction (2023-2025 held-out regimes) with run-variance no worse.
 * REJECT if small tabular backbones show the Conv64 failure mode.
 *
 * Research-only module. Not wired into any live training path.
 */

export interface Game {
  id: string;
  team: string;
  season: number;
  week: number;
  /** Opponent archetype label, e.g. "elite-offense". */
  archetype: string;
}

/** Default canonical weeks for a fixed support pool. */
export const CANONICAL_WEEKS = [2, 5, 9, 13, 16] as const;

/**
 * Canonical fixed pool: the games from the canonical weeks for one
 * team-season, sampled once and frozen. Falls back to the nearest
 * available weeks when a canonical week is missing.
 */
export function canonicalPool(
  games: readonly Game[],
  team: string,
  season: number,
  weeks: readonly number[] = CANONICAL_WEEKS,
): Game[] {
  const ts = games.filter((g) => g.team === team && g.season === season);
  if (ts.length === 0) throw new Error("canonicalPool: no games for team-season");
  const byWeek = new Map<number, Game>();
  for (const g of ts) if (!byWeek.has(g.week)) byWeek.set(g.week, g);
  const pool: Game[] = [];
  for (const w of weeks) {
    if (byWeek.has(w)) {
      pool.push(byWeek.get(w) as Game);
      continue;
    }
    // Nearest available week not already taken.
    let best: Game | null = null;
    let bestD = Infinity;
    for (const [wk, g] of byWeek) {
      if (pool.includes(g)) continue;
      const d = Math.abs(wk - w);
      if (d < bestD) {
        bestD = d;
        best = g;
      }
    }
    if (best) pool.push(best);
  }
  return pool;
}

/**
 * Archetype coverage of a pool: fraction of distinct archetypes covered.
 */
export function archetypeCoverage(pool: readonly Game[], archetypes: readonly string[]): number {
  if (archetypes.length === 0) throw new Error("archetypeCoverage: no archetypes");
  const covered = new Set(pool.map((g) => g.archetype));
  return [...covered].filter((a) => archetypes.includes(a)).length / archetypes.length;
}

/**
 * Designed-fixed pool: greedy K-game selection maximizing archetype
 * coverage (ties broken by earliest week for determinism).
 */
export function designedPool(
  games: readonly Game[],
  team: string,
  season: number,
  k: number,
  archetypes: readonly string[],
): Game[] {
  if (k <= 0) throw new Error("designedPool: k must be positive");
  const ts = games
    .filter((g) => g.team === team && g.season === season)
    .sort((a, b) => a.week - b.week);
  if (ts.length === 0) throw new Error("designedPool: no games for team-season");
  const pool: Game[] = [];
  const covered = new Set<string>();
  const remaining = [...ts];
  while (pool.length < Math.min(k, ts.length) && remaining.length > 0) {
    let bestIdx = 0;
    let bestGain = -1;
    for (let i = 0; i < remaining.length; i++) {
      const g = remaining[i] as Game;
      const gain = covered.has(g.archetype) ? 0 : 1;
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = i;
      }
    }
    const [g] = remaining.splice(bestIdx, 1);
    pool.push(g as Game);
    covered.add((g as Game).archetype);
  }
  return pool;
}

export interface Episode {
  support: Game[];
  query: Game[];
}

/**
 * Sample a meta-training episode: support from the frozen fixed pool,
 * query sampled from the remaining team-season games (still diverse).
 */
export function sampleEpisode(
  fixedPool: readonly Game[],
  allGames: readonly Game[],
  querySize: number,
  rand: () => number = Math.random,
): Episode {
  const poolIds = new Set(fixedPool.map((g) => g.id));
  const rest = allGames.filter((g) => !poolIds.has(g.id));
  if (querySize > rest.length) throw new Error("sampleEpisode: not enough query games");
  const shuffled = [...rest];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as Game, shuffled[i] as Game];
  }
  return { support: [...fixedPool], query: shuffled.slice(0, querySize) };
}
