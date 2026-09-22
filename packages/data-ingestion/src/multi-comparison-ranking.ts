/**
 * Ranking with multiple types of pairwise comparisons
 *
 * arXiv:2206.13580v2 · lane:team_ratings · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build the multimodal team-strength EM: per-drive team-facet matchup outcomes (rushing EPA>0
 * winner, dropback EPA>0 winner, turnover winner, special-teams winner, penalty-yardage winner —
 * each logistic-residualized on pre-drive score differential to kill the game-script confound),
 * MAP-EM with logistic prior per season + rolling 8-week windows; outputs = team strengths s_u (a
 * new power rating) + valence vector q_t (which facets carry most strength information — itself
 * publishable); blend s_u into the engine as an additional strength prior — then make valence
 * time-varying and matchup-dependent (hierarchical q_{t,week}) with an offense/defense split
 * (separate lambda^O_u, lambda^D_u).
 *
 * ACCEPTANCE GATE: ADOPT as an engine input iff across 2016-2023: (a) log-loss on game winners >=2% better than
 * unimodal Bradley-Terry, OR (b) ATS hit rate beats the EPA-ranking baseline by >=1.5 points with
 * the same sign in >=6 of 8 seasons; REJECT if neither holds or q_t signs flip on >2 of 5 facets
 * year-to-year.
 *
 * Ingest role: feature builder (BT with multiple comparison types: W/L, spread-cover, EPA-win).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2206.13580v2" as const;
export const LANE = "team_ratings" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT as an engine input iff across 2016-2023: (a) log-loss on game winners >=2% better than
 * unimodal Bradley-Terry, OR (b) ATS hit rate beats the EPA-ranking baseline by >=1.5 points with
 * the same sign in >=6 of 8 seasons; REJECT if neither holds or q_t signs flip on >2 of 5 facets
 * year-to-year.`;

export const CONFIG = {
  enabled: false,
  comparisonTypes: ["win-loss", "spread-cover", "epa-win"],
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type CompType = "win-loss" | "spread-cover" | "epa-win";

export interface MultiComp {
  readonly home: string;
  readonly away: string;
  readonly type: CompType;
  readonly homeWin: boolean;
}

export function isMultiComp(x: unknown): x is MultiComp {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["home"] === "string" &&
    typeof o["away"] === "string" &&
    ["win-loss", "spread-cover", "epa-win"].includes(o["type"] as string) &&
    typeof o["homeWin"] === "boolean"
  );
}

/** Per-type win matrices. */
export function multiWinMatrices(
  games: readonly unknown[],
  teams: readonly string[],
): Record<CompType, number[][]> | null {
  if (teams.length === 0) return null;
  const idx = new Map(teams.map((t, i) => [t, i]));
  const n = teams.length;
  const mk = (): number[][] => Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const out: Record<CompType, number[][]> = { "win-loss": mk(), "spread-cover": mk(), "epa-win": mk() };
  for (const g of games) {
    if (!isMultiComp(g)) continue;
    const i = idx.get(g.home);
    const j = idx.get(g.away);
    if (i === undefined || j === undefined) return null;
    const M = out[g.type];
    const row = M[g.homeWin ? i : j];
    const col = g.homeWin ? j : i;
    if (row) row[col] = (row[col] ?? 0) + 1;
  }
  return out;
}

/** Combine type matrices with weights into one BT matrix. */
export function combineMatrices(
  mats: Record<CompType, number[][]>,
  weights: Record<CompType, number>,
): number[][] | null {
  const types = Object.keys(mats) as CompType[];
  const n = mats["win-loss"].length;
  if (!types.every((t) => mats[t].length === n)) return null;
  const wSum = types.reduce((s, t) => s + (weights[t] ?? 0), 0);
  if (!isFiniteNumber(wSum) || wSum <= 0) return null;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (const t of types) {
    const w = (weights[t] ?? 0) / wSum;
    const M = mats[t];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const row = out[i];
      if (row) row[j] = (row[j] ?? 0) + w * (M[i]?.[j] ?? 0);
    }
  }
  return out;
}

/** MLE-BT via simple gradient ascent on log-strengths (small systems). */
export function btMLE(W: readonly number[][], iters = 500, lr = 0.1): number[] | null {
  const n = W.length;
  if (n === 0 || !W.every((r) => r.length === n && r.every((v) => isFiniteNumber(v) && v >= 0))) return null;
  const theta = new Array<number>(n).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const wij = W[i]?.[j] ?? 0;
        const wji = W[j]?.[i] ?? 0;
        const tot = wij + wji;
        if (tot === 0) continue;
        const p = 1 / (1 + Math.exp(-((theta[i] ?? 0) - (theta[j] ?? 0))));
        grad[i] = (grad[i] ?? 0) + (wij - tot * p);
      }
    }
    for (let i = 0; i < n; i++) theta[i] = (theta[i] ?? 0) + lr * (grad[i] ?? 0);
    const m = theta.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < n; i++) theta[i] = (theta[i] ?? 0) - m;
  }
  return theta;
}
