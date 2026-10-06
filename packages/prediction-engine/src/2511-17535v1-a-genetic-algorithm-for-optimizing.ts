/**
 * arXiv:2511.17535v1 — A Genetic Algorithm for Optimizing Fantasy Football Trades with Playoff Biasing
 *
 * Genetic-algorithm fantasy trade analyzer: selection/crossover/mutation over roster configurations with
 * playoff-biasing fitness, plus a Monte Carlo upgrade showing which recommended trades stay positive under
 * projection uncertainty.
 *
 * Improvement: GSE ships a Trade Analyzer for season-long fantasy: a genetic algorithm over rosters and league-mate teams using GSE's own projections, with Monte Carlo upgrade showing which recommended trades stay positive under projection uncertainty.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT as a GSE season-long product feature only if: (a) backtested recommended-trade projected gains correlate with realized gains at r>=0.5, (b) interactive runtime <10s per league, and (c) the Monte Carlo upgrade shows >=70% of recommended trades keep g_a>0.
 */

/** A trade: players out and players in (ids). */
export interface Trade {
  out: string[];
  in: string[];
}

/** Fitness: projected gain with playoff-biasing (weeks 14-17 weighted up). */
export function tradeFitness(
  trade: Trade,
  proj: Map<string, number[]>, // player -> weekly projections
  playoffWeeks: ReadonlySet<number>,
  playoffBoost: number,
): number {
  const val = (ids: string[]): number => {
    let s = 0;
    for (const id of ids) {
      const w = proj.get(id) ?? [];
      w.forEach((p, wk) => {
        s += p * (playoffWeeks.has(wk) ? playoffBoost : 1);
      });
    }
    return s;
  };
  return val(trade.in) - val(trade.out);
}

/**
 * One GA generation: tournament selection, single-point crossover on the
 * player-id lists, and swap mutation. Deterministic via rng.
 */
export function gaGeneration(
  pop: readonly Trade[],
  fitness: (t: Trade) => number,
  rng: () => number,
  mutRate: number,
  pool: readonly string[],
): Trade[] {
  if (pop.length < 2) throw new Error("gaGeneration: population >= 2");
  const scored = pop.map((t) => ({ t, f: fitness(t) })).sort((a, b) => b.f - a.f);
  const select = (): Trade => {
    const a = scored[Math.floor(rng() * scored.length)]!;
    const b = scored[Math.floor(rng() * scored.length)]!;
    return (a.f >= b.f ? a : b).t;
  };
  const next: Trade[] = [scored[0]!.t]; // elitism
  while (next.length < pop.length) {
    const A = select();
    const B = select();
    const cut = Math.floor(rng() * 2);
    const child: Trade = {
      out: [...A.out.slice(0, cut), ...B.out.slice(cut)],
      in: [...A.in.slice(0, cut), ...B.in.slice(cut)],
    };
    const mutate = (ids: string[]): string[] =>
      ids.map((id) => (rng() < mutRate && pool.length > 0 ? pool[Math.floor(rng() * pool.length)]! : id));
    next.push({ out: mutate(child.out), in: mutate(child.in) });
  }
  return next;
}

/**
 * Monte Carlo positivity: fraction of projection-noise draws where the
 * trade's gain stays > 0 (the g_a > 0 upgrade).
 */
export function mcPositivity(
  trade: Trade,
  proj: Map<string, number[]>,
  projSd: Map<string, number[]>,
  draws: number,
  rng: () => number,
  playoffWeeks: ReadonlySet<number>,
  playoffBoost: number,
): number {
  if (draws <= 0) throw new Error("mcPositivity: draws > 0");
  let pos = 0;
  for (let d = 0; d < draws; d++) {
    const noisy = new Map<string, number[]>();
    for (const [id, w] of proj) {
      const sd = projSd.get(id) ?? w.map(() => 0);
      noisy.set(id, w.map((p, k) => {
        // Box-Muller
        const u1 = Math.max(1e-12, rng());
        const u2 = rng();
        return p + (sd[k] ?? 0) * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      }));
    }
    if (tradeFitness(trade, noisy, playoffWeeks, playoffBoost) > 0) pos++;
  }
  return pos / draws;
}
