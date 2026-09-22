/**
 * Cycle-enrichment diagnostic for rating-model overconfidence in hierarchy
 *
 * Research port: arXiv:2508.19848
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure quarterly rating-model diagnostic from the paper: count observed
 * 3-cycles (rock-paper-scissors results A→B→C→A) in the season's win graph
 * and compare against the rating-implied expected cycle count under the
 * fitted win probabilities. Positive enrichment (|z| > 2) means the ratings
 * are overconfident in hierarchy — transitive where the results are not.
 * The standing-check rule (adopt if |z|>2 in >=3 of the last 6 seasons) is
 * evaluated by the operator on real seasons; this module computes the z
 * statistic per season from game results + rating-implied probabilities.
 *
 * ACCEPTANCE GATE: ADOPT as a standing quarterly check if |z|>2 in >=3 of
 * the last 6 seasons; REJECT as a standing diagnostic if |z|<=2 consistently.
 */

export interface RatedGame {
  home: string;
  away: string;
  /** did the home team win */
  homeWon: boolean;
  /** rating-implied P(home wins), in (0,1) */
  pHome: number;
}

export interface CycleEnrichment {
  teams: number;
  triples: number;
  observedCycles: number;
  expectedCycles: number;
  variance: number;
  z: number;
  enriched: boolean;
}

function teamIndex(games: RatedGame[]): { teams: string[]; idx: Map<string, number> } {
  const set = new Set<string>();
  for (const g of games) {
    set.add(g.home);
    set.add(g.away);
  }
  const teams = [...set].sort();
  return { teams, idx: new Map(teams.map((t, i) => [t, i])) };
}

/**
 * Build the directed win adjacency (i beats j) and the rating-implied
 * P(i beats j) matrix from game results.
 */
export function buildWinGraph(games: RatedGame[]): { beats: boolean[][]; pBeats: number[][] } {
  const { teams, idx } = teamIndex(games);
  const n = teams.length;
  const beats: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const pBeats: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0.5));
  for (const g of games) {
    const h = idx.get(g.home);
    const a = idx.get(g.away);
    if (h === undefined || a === undefined) continue;
    const p = Math.min(0.999, Math.max(0.001, g.pHome));
    const bRow = beats[h];
    const pRow = pBeats[h];
    const bRowA = beats[a];
    const pRowA = pBeats[a];
    if (!bRow || !pRow || !bRowA || !pRowA) continue;
    if (g.homeWon) {
      bRow[a] = true;
      pRow[a] = p;
      pRowA[h] = 1 - p;
    } else {
      bRowA[h] = true;
      pRow[a] = 1 - p;
      pRowA[h] = p;
    }
  }
  return { beats, pBeats };
}

/**
 * Cycle enrichment: for every unordered triple, the observed indicator of a
 * directed 3-cycle vs the rating-implied probability of a 3-cycle in either
 * direction. z uses the Poisson-binomial variance of the expectation.
 */
export function cycleEnrichment(games: RatedGame[]): CycleEnrichment {
  const { beats, pBeats } = buildWinGraph(games);
  const n = beats.length;
  let observed = 0;
  let expected = 0;
  let variance = 0;
  let triples = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        triples++;
        const cyc =
          (beats[i]?.[j] && beats[j]?.[k] && beats[k]?.[i]) ||
          (beats[i]?.[k] && beats[k]?.[j] && beats[j]?.[i]);
        if (cyc) observed++;
        const p =
          (pBeats[i]?.[j] ?? 0.5) * (pBeats[j]?.[k] ?? 0.5) * (pBeats[k]?.[i] ?? 0.5) +
          (pBeats[i]?.[k] ?? 0.5) * (pBeats[k]?.[j] ?? 0.5) * (pBeats[j]?.[i] ?? 0.5);
        expected += p;
        variance += p * (1 - p);
      }
    }
  }
  const z = variance > 0 ? (observed - expected) / Math.sqrt(variance) : 0;
  return {
    teams: n,
    triples,
    observedCycles: observed,
    expectedCycles: expected,
    variance,
    z,
    enriched: Math.abs(z) > 2,
  };
}

/**
 * Standing-check rule: adopt the diagnostic if |z|>2 in >=3 of the last 6
 * seasons' worth of z statistics.
 */
export function standingCheckAdopt(zStats: number[]): boolean {
  const recent = zStats.slice(-6);
  return recent.filter((z) => Math.abs(z) > 2).length >= 3;
}

export const GSE_CYCLE_ENRICHMENT_ENABLED = false;
