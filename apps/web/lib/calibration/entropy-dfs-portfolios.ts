/**
 * Entropy-targeted DFS portfolios — arXiv 2308.14339v3
 * ("Entropy-Based Strategies for Multi-Bracket Pools").
 *
 * ADDITIVE utility. Not wired into any optimizer path (wiring changes
 * generated lineups and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: estimate opponent entropy from real historical DK
 * ownership (replacing the known-opponent assumption); derive
 * salary-cap-constrained entropy families for NFL DFS; extend the objective
 * to expected profit with real payout structures (top-heavy vs flat):
 * calibrated GSE probabilities + estimated opponent entropy +
 * entropy-targeted selection.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff portfolio optimization
 * beats top-N selection on the DFS backtest: over a season of DK/NFL DFS
 * slates, entropy-targeted portfolios must show higher realized maximum
 * score (or simulated win rate vs historical fields) than the top-N-by-EV
 * baseline at equal entry counts.
 */

export interface DfsCandidate {
  readonly id: string;
  /** Player ids in the lineup. */
  readonly players: readonly string[];
  readonly salary: number;
  readonly projectedPoints: number;
}

/** Shannon entropy (nats) of a discrete distribution. */
export function shannonEntropy(probs: readonly number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}

/**
 * Opponent entropy estimate from historical ownership: entropy of the
 * field's lineup distribution, proxied by per-player ownership rates
 * (independent-player approximation).
 */
export function opponentEntropyFromOwnership(
  ownership: Readonly<Record<string, number>>,
): number {
  let h = 0;
  for (const p of Object.values(ownership)) {
    const q = Math.min(Math.max(p, 1e-9), 1 - 1e-9);
    h += -(q * Math.log(q) + (1 - q) * Math.log(1 - q));
  }
  return h;
}

/** Jaccard overlap of two lineups' player sets (1 = identical). */
export function lineupOverlap(
  a: readonly string[],
  b: readonly string[],
): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const p of sa) if (sb.has(p)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/**
 * Portfolio diversity: mean pairwise (1 - overlap) across selected
 * lineups. Higher = more entropic coverage of the slate.
 */
export function portfolioDiversity(lineups: ReadonlyArray<DfsCandidate>): number {
  const n = lineups.length;
  if (n < 2) return 0;
  let s = 0;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      s += 1 - lineupOverlap(lineups[i]!.players, lineups[j]!.players);
      pairs++;
    }
  }
  return s / pairs;
}

/**
 * Expected profit of one entry: E[payout(score)] - entryFee, with the
 * payout structure as (minScore -> payout) tiers. scoreCdf: P(score <= x).
 */
export function expectedProfit(
  scoreCdf: (x: number) => number,
  payoutTiers: ReadonlyArray<{ readonly minScore: number; readonly payout: number }>,
  entryFee: number,
  gridMax: number,
  gridN = 200,
): number {
  const dx = gridMax / gridN;
  let ev = 0;
  let prevCdf = scoreCdf(0);
  for (let i = 1; i <= gridN; i++) {
    const x = i * dx;
    const cdf = scoreCdf(x);
    const mass = Math.max(cdf - prevCdf, 0);
    prevCdf = cdf;
    let payout = 0;
    for (const t of payoutTiers) {
      if (x >= t.minScore) payout = t.payout;
    }
    ev += mass * payout;
  }
  return ev - entryFee;
}

/**
 * Greedy entropy-targeted portfolio: iteratively add the salary-valid
 * candidate maximizing marginal diversity (min overlap with selected),
 * subject to a mean-projection floor. Stops at k entries or exhaustion.
 */
export function greedyEntropyPortfolio(
  candidates: ReadonlyArray<DfsCandidate>,
  k: number,
  salaryCap: number,
  minAvgProjection: number,
): DfsCandidate[] {
  const valid = candidates.filter((c) => c.salary <= salaryCap);
  if (valid.length === 0 || k <= 0) return [];
  const selected: DfsCandidate[] = [];
  const remaining = [...valid];
  while (selected.length < k && remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i]!;
      const trial = [...selected, c];
      const avgProj =
        trial.reduce((a, x) => a + x.projectedPoints, 0) / trial.length;
      if (avgProj < minAvgProjection) continue;
      let minOverlap = 1;
      for (const s of selected) {
        minOverlap = Math.min(minOverlap, lineupOverlap(c.players, s.players));
      }
      const score = selected.length === 0 ? c.projectedPoints : 1 - minOverlap;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    selected.push(remaining.splice(bestIdx, 1)[0]!);
  }
  return selected;
}
