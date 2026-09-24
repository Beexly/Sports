/**
 * arXiv 2009.01206v1: Identification of skill in an online game: The case of Fantasy Premier League
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Per-slate chalk index: player co-occurrence matrix from projected-ownership-weighted lineup fields, hierarchical cluster, ownership share of the top-3 clusters = template concentration ('chalk meter' in the weekly DFS packet); contrarian trigger: top-quartile concentration -> tilt GPP lineups to low-Jaccard constructions vs the template core; transfer-regret audit (fraction of same-salary-or-cheaper alternatives that outscored the pick) tracked weekly as a decision-quality KPI.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a per-slate chalk index: player co-occurrence matrix from projected-ownership-weighted lineup fields, hierarchical cluster, report the ownership share of the top-3 clusters = template concentration ('chalk meter' in the weekly DFS packet); contrarian trigger: top-quartile concentration -> tilt GPP lineups to low-Jaccard constructions vs the template core; transfer-regret audit: for every lineup swap/waiver recommendation compute the fraction of same-salary-or-cheaper alternatives that outscored the pick, tracked weekly as a decision-quality KPI.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADOPT the chalk-meter + contrarian tilt iff, on 2023-2025 backtest, template-fading lineups achieve >=10% higher ROI than template-following lineups on top-quartile-concentration slates (paired by slate, p<0.05), with no significant ROI loss on bottom-quartile slates. Otherwise REJECT.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: props_dfs | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */

export const ENABLED = false;

/** Jaccard similarity between two lineups (player sets). */
export function lineupJaccard(a: number[], b: number[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/**
 * Chalk index: ownership-weighted co-occurrence concentration.
 * ownership[i] = projected ownership of player i; lineups = candidate lineups.
 */
export function chalkIndex(ownership: number[], lineups: number[][]): number {
  // template concentration = mean pairwise Jaccard weighted by lineup ownership mass
  const masses = lineups.map((lu) => lu.reduce((s, p) => s + ownership[p]!, 0));
  const tot = masses.reduce((a, b) => a + b, 0);
  let s = 0;
  let wsum = 0;
  for (let i = 0; i < lineups.length; i++) {
    for (let j = i + 1; j < lineups.length; j++) {
      const w = masses[i]! * masses[j]!;
      s += w * lineupJaccard(lineups[i]!, lineups[j]!);
      wsum += w;
    }
  }
  return wsum === 0 ? 0 : s / wsum / Math.max(1e-9, tot);
}

/** Contrarian tilt: keep lineups with Jaccard vs template core below threshold. */
export function contrarianFilter(
  lineups: number[][],
  templateCore: number[],
  maxJaccard: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < lineups.length; i++) {
    if (lineupJaccard(lineups[i]!, templateCore) <= maxJaccard) out.push(i);
  }
  return out;
}
