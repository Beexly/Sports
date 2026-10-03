/**
 * Stakeless-probability features for group-stage pricing — arXiv 2204.08276v8
 * ("Tournament schedules and incentives in a double round-robin tournament
 * with four teams").
 *
 * ADDITIVE utility. Not wired into any pricing path (wiring changes priced
 * markets and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: ex-ante p_stakeless_weak and p_stakeless_strong per game
 * from the paper's Poisson-simulation recipe with team strengths, interacted
 * with rotation/news signals; separate conditional outcome models fit on
 * historical dead rubbers; extend to a continuous incentive gradient
 * (prize-money / rank movement at stake).
 *
 * Definitions: a team is STRONGLY stakeless for a game when its final rank
 * is invariant to that game's outcome; WEAKLY stakeless when its
 * reward-tier membership (e.g. top-k qualification) is invariant.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff stakeless status predicts
 * outcomes: weakly/strongly stakeless games show a statistically significant
 * shift in goal/point distributions or favorite cover rates vs matched
 * non-stakeless games in historical group-stage data.
 */

export interface GroupFixture {
  readonly home: string;
  readonly away: string;
}

export interface TeamAttackDefense {
  readonly attack: number;
  readonly defense: number;
}

/** Seeded RNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Knuth Poisson sampler. */
export function poissonSample(lambda: number, rand: () => number): number {
  const l = Math.exp(-Math.max(lambda, 1e-9));
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > l);
  return k - 1;
}

/** Simulate one fixture's goals from team strengths (home advantage baked in). */
export function simulateFixture(
  home: TeamAttackDefense,
  away: TeamAttackDefense,
  homeAdvantage: number,
  rand: () => number,
): { readonly homeGoals: number; readonly awayGoals: number } {
  const homeLambda = Math.exp(home.attack - away.defense + homeAdvantage);
  const awayLambda = Math.exp(away.attack - home.defense);
  return {
    homeGoals: poissonSample(homeLambda, rand),
    awayGoals: poissonSample(awayLambda, rand),
  };
}

export interface SimulatedTable {
  readonly points: Readonly<Record<string, number>>;
  readonly rank: Readonly<Record<string, number>>;
}

/** Points table from fixture results; rank 1 = most points (ties: id order). */
export function tableFromResults(
  fixtures: readonly GroupFixture[],
  results: ReadonlyArray<{ readonly homeGoals: number; readonly awayGoals: number }>,
  startingPoints: Readonly<Record<string, number>> = {},
): SimulatedTable {
  const points: Record<string, number> = { ...startingPoints };
  for (let i = 0; i < fixtures.length; i++) {
    const f = fixtures[i]!;
    const r = results[i]!;
    points[f.home] = points[f.home] ?? 0;
    points[f.away] = points[f.away] ?? 0;
    if (r.homeGoals > r.awayGoals) points[f.home]! += 3;
    else if (r.homeGoals < r.awayGoals) points[f.away]! += 3;
    else {
      points[f.home]! += 1;
      points[f.away]! += 1;
    }
  }
  const ranked = Object.keys(points).sort(
    (a, b) => points[b]! - points[a]! || (a < b ? -1 : 1),
  );
  const rank: Record<string, number> = {};
  ranked.forEach((t, i) => {
    rank[t] = i + 1;
  });
  return { points, rank };
}

/**
 * Ex-ante stakeless probabilities for one game: simulate the remaining
 * fixtures sims times; within each simulation, force the target game to
 * each of {home win, draw, away win} and check whether the team's final
 * rank (strong) or top-k membership (weak) is invariant.
 */
export function stakelessProbabilities(
  targetGameIndex: number,
  fixtures: readonly GroupFixture[],
  strengths: Readonly<Record<string, TeamAttackDefense>>,
  startingPoints: Readonly<Record<string, number>>,
  topK: number,
  sims: number,
  seed = 1,
  homeAdvantage = 0.25,
): { readonly pStakelessStrong: number; readonly pStakelessWeak: number } {
  if (sims <= 0 || targetGameIndex < 0 || targetGameIndex >= fixtures.length) {
    return { pStakelessStrong: 0, pStakelessWeak: 0 };
  }
  const target = fixtures[targetGameIndex]!;
  const others = fixtures.filter((_, i) => i !== targetGameIndex);
  const forced: ReadonlyArray<{ readonly homeGoals: number; readonly awayGoals: number }>[] = [
    [{ homeGoals: 2, awayGoals: 0 }],
    [{ homeGoals: 1, awayGoals: 1 }],
    [{ homeGoals: 0, awayGoals: 2 }],
  ];
  let strong = 0;
  let weak = 0;
  const rand = mulberry32(seed);
  for (let s = 0; s < sims; s++) {
    const otherResults = others.map((f) =>
      simulateFixture(strengths[f.home]!, strengths[f.away]!, homeAdvantage, rand),
    );
    const ranks: number[] = [];
    const tiers: boolean[] = [];
    for (const force of forced) {
      const results: { readonly homeGoals: number; readonly awayGoals: number }[] = [];
      let oi = 0;
      for (let i = 0; i < fixtures.length; i++) {
        results.push(i === targetGameIndex ? force[0]! : otherResults[oi++]!);
      }
      const table = tableFromResults(fixtures, results, startingPoints);
      ranks.push(table.rank[target.home]!);
      tiers.push(table.rank[target.home]! <= topK);
    }
    if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) strong++;
    if (tiers[0] === tiers[1] && tiers[1] === tiers[2]) weak++;
  }
  return { pStakelessStrong: strong / sims, pStakelessWeak: weak / sims };
}

/**
 * Continuous incentive gradient: expected rank movement at stake for the
 * home team = E[rank | home win] - E[rank | home loss] over simulations.
 * Larger values mean more is riding on the game.
 */
export function incentiveGradient(
  targetGameIndex: number,
  fixtures: readonly GroupFixture[],
  strengths: Readonly<Record<string, TeamAttackDefense>>,
  startingPoints: Readonly<Record<string, number>>,
  sims: number,
  seed = 1,
  homeAdvantage = 0.25,
): number {
  if (sims <= 0 || targetGameIndex < 0 || targetGameIndex >= fixtures.length) {
    return 0;
  }
  const target = fixtures[targetGameIndex]!;
  const others = fixtures.filter((_, i) => i !== targetGameIndex);
  const rand = mulberry32(seed);
  let winRankSum = 0;
  let lossRankSum = 0;
  for (let s = 0; s < sims; s++) {
    const otherResults = others.map((f) =>
      simulateFixture(strengths[f.home]!, strengths[f.away]!, homeAdvantage, rand),
    );
    const build = (hg: number, ag: number) => {
      const results: { readonly homeGoals: number; readonly awayGoals: number }[] = [];
      let oi = 0;
      for (let i = 0; i < fixtures.length; i++) {
        results.push(
          i === targetGameIndex ? { homeGoals: hg, awayGoals: ag } : otherResults[oi++]!,
        );
      }
      return tableFromResults(fixtures, results, startingPoints).rank[target.home]!;
    };
    winRankSum += build(2, 0);
    lossRankSum += build(0, 2);
  }
  return lossRankSum / sims - winRankSum / sims;
}
