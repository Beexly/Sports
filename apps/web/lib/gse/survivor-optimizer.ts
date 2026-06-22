/**
 * GSE Survivor / Pool Optimizer — pick one team to win each week, never reuse a
 * team, survive while they keep winning. The discipline competitors (TeamRankings'
 * PoolGenius) charge for: don't burn your strongest future team on an easy early
 * week. Transparent, explainable heuristic. Pure, dependency-free, tested.
 *
 * Companion doc: docs/research/GSE_2026_REMAINING_MODELS.md
 */

export interface SurvivorOption {
  readonly team: string;
  /** Win probability for this team this week (0..1). */
  readonly winProb: number;
}

export interface SurvivorWeek {
  readonly week: number;
  readonly options: readonly SurvivorOption[];
}

export interface SurvivorPick {
  readonly week: number;
  readonly team: string;
  readonly winProb: number;
  /** Why this team over the alternatives. */
  readonly reason: string;
}

export interface SurvivorPlan {
  readonly picks: readonly SurvivorPick[];
  /** Product of chosen weekly win probabilities — survival probability of the path. */
  readonly survivalProbability: number;
}

export interface SurvivorOptions {
  /**
   * Future-equity weight (0..1). Higher = more willing to save a strong team for
   * a future week where it is even stronger. 0 = pure greedy (always best now).
   */
  readonly futureEquity: number;
  /** How many future weeks to consider when valuing a team's reserve worth. */
  readonly lookahead: number;
}

/**
 * Plan a survivor path with future-equity awareness. Each week, among the teams
 * still available, pick the one maximising `winProb_now − futureEquity · max(0,
 * bestFutureProb − winProb_now)` — i.e. prefer a solid pick now and SAVE a team
 * that is much stronger in an upcoming week. Greedy and explainable (a full DP is
 * exponential in entries); the reason for each pick is returned.
 */
export function planSurvivor(weeks: readonly SurvivorWeek[], opts: SurvivorOptions): SurvivorPlan {
  const lambda = Math.max(0, Math.min(1, opts.futureEquity));
  const used = new Set<string>();
  const picks: SurvivorPick[] = [];
  let survival = 1;

  for (let w = 0; w < weeks.length; w++) {
    const week = weeks[w]!;
    const avail = week.options.filter((o) => !used.has(o.team));
    if (avail.length === 0) break; // no eligible team left — path ends

    // Best future win prob for each team within the lookahead window.
    const bestFuture = new Map<string, number>();
    for (let f = w + 1; f <= Math.min(weeks.length - 1, w + opts.lookahead); f++) {
      for (const o of weeks[f]!.options) {
        if (used.has(o.team)) continue;
        bestFuture.set(o.team, Math.max(bestFuture.get(o.team) ?? 0, o.winProb));
      }
    }

    let best: SurvivorOption | null = null;
    let bestScore = -Infinity;
    let bestReserve = 0;
    for (const o of avail) {
      const reserve = Math.max(0, (bestFuture.get(o.team) ?? 0) - o.winProb);
      const score = o.winProb - lambda * reserve;
      if (score > bestScore) {
        bestScore = score;
        best = o;
        bestReserve = reserve;
      }
    }
    if (!best) break;

    used.add(best.team);
    survival *= best.winProb;
    const reason =
      bestReserve > 0.01
        ? `solid now (${(best.winProb * 100).toFixed(0)}%); stronger future teams reserved`
        : `highest available win probability (${(best.winProb * 100).toFixed(0)}%)`;
    picks.push({ week: week.week, team: best.team, winProb: best.winProb, reason });
  }

  return { picks, survivalProbability: survival };
}
