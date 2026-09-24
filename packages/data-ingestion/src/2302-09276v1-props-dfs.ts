/**
 * Transformer-Based Neural Marked Spatio Temporal Point Process Model for Football Match Events Analysis
 *
 * arXiv:2302.09276v1 · lane:props_dfs · verdict:ADAPT · owner:Motif-lab
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build the NFL neural drive point process: nflverse play-by-play 2018-2025; discretize each play into
 * marks (time-since-last-play, field zone in 20 zones: 5 downfield bands x 4 lateral thirds, play type
 * in 6-8 classes: run/short pass/deep pass/screen/turnover/penalty/kick); trailing-40-play history
 * (truncate at drive boundaries for the drive-score variant); transformer encoder -> history vector ->
 * dependent heads t->zone->play-type (scaled RMSE on seconds + cross-entropies); derive the 'drive
 * utilization score' (DUS) adapting HAS with NFL weights (explosive play = 10, successful play = 5,
 * failed play = 0; red-zone area weight 10) with exponential recency decay — a drive-level efficiency
 * metric using no scoring data for content ('most efficient drives that didn't score') and as a
 * WP-model feature — then replace the hand-chosen HAS weights and decay with learned parameters (fit
 * by maximizing DUS's correlation with held-out team offensive efficiency under CV) and run the
 * learned-excitation-kernel variant from ledger 0420 §14 on the same harness (head-to-head 'momentum'
 * formalisms).
 *
 * ACCEPTANCE GATE: ADOPT the NFL point-process model iff it beats the AR(2) baseline by >= 0.10 total loss AND the LSTM
 * baseline by >= 0.03 on the 2024 season holdout; ADOPT the DUS metric for content/features iff its
 * team-level correlation with offensive EPA/play is >= 0.70 on 2024; REJECT the whole approach if the
 * transformer fails to beat the LSTM baseline — the paper's core claim is the architecture win, and
 * without it there is no reason to carry the complexity.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2302.09276v1" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT the NFL point-process model iff it beats the AR(2) baseline by >= 0.10 total loss AND the LSTM baseline by >= 0.03 on the 2024 season holdout; ADOPT the DUS metric for content/features iff its team-level correlation with offensive EPA/play is >= 0.70 on 2024; REJECT the whole approach if the transformer fails to beat the LSTM baseline — the paper's core claim is the architecture win, and without it there is no reason to carry the complexity.`;

/** Disabled by default: additive utility only, never auto-wired into a live ingestion path. */
export const ENABLED = false as const;

export const CONFIG = {
  enabled: false,
  method: "salary-cap knapsack lineup construction",
} as const;
/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PlayerEntry {
  id: string;
  /** Integer salary cost. */
  salary: number;
  /** Projected fantasy points (>= 0). */
  proj: number;
}

function validPlayer(p: PlayerEntry): boolean {
  return (
    typeof p.id === "string" &&
    p.id.length > 0 &&
    Number.isInteger(p.salary) &&
    p.salary > 0 &&
    isFiniteNumber(p.proj) &&
    p.proj >= 0
  );
}

/**
 * 0/1 knapsack: pick exactly `slots` players maximizing projected points under the salary cap.
 * Returns null on malformed input or infeasible constraints.
 */
export function knapsackLineup(
  players: readonly PlayerEntry[],
  salaryCap: number,
  slots: number,
): { lineup: string[]; totalSalary: number; totalProj: number } | null {
  if (!Number.isInteger(salaryCap) || salaryCap <= 0) return null;
  if (!Number.isInteger(slots) || slots <= 0 || slots > players.length) return null;
  if (!players.every(validPlayer)) return null;
  type Cell = { proj: number; picks: number[] } | null;
  const dp: Cell[][] = Array.from({ length: slots + 1 }, () =>
    Array.from({ length: salaryCap + 1 }, () => null as Cell),
  );
  const row0 = dp[0];
  if (row0 === undefined) return null;
  row0[0] = { proj: 0, picks: [] };
  players.forEach((pl, idx) => {
    for (let k = slots; k >= 1; k--) {
      const prevRow = dp[k - 1];
      const curRow = dp[k];
      if (prevRow === undefined || curRow === undefined) continue;
      for (let c = salaryCap; c >= pl.salary; c--) {
        const prev = prevRow[c - pl.salary];
        if (prev === null || prev === undefined) continue;
        const cand: Cell = { proj: prev.proj + pl.proj, picks: [...prev.picks, idx] };
        const cur = curRow[c];
        if ((cur === null || cur === undefined) && cand.proj >= 0) curRow[c] = cand;
        else if (cur !== null && cur !== undefined && cand.proj > cur.proj) curRow[c] = cand;
      }
    }
  });
  const finalRow = dp[slots];
  if (finalRow === undefined) return null;
  let best: { proj: number; picks: number[] } | null = null;
  let bestCap = 0;
  for (let c = 0; c <= salaryCap; c++) {
    const cur = finalRow[c];
    if (cur !== null && cur !== undefined && (best === null || cur.proj > best.proj)) {
      best = cur;
      bestCap = c;
    }
  }
  if (best === null) return null;
  return {
    lineup: best.picks.map((i) => {
      const p = players[i];
      return p === undefined ? "" : p.id;
    }),
    totalSalary: bestCap,
    totalProj: best.proj,
  };
}

/** Blend multiple projection sources per player with normalized non-negative weights. */
export function blendProjections(
  sources: ReadonlyArray<readonly number[]>,
  weights: readonly number[],
): number[] | null {
  if (sources.length === 0 || sources.length !== weights.length) return null;
  if (!weights.every((w) => isFiniteNumber(w) && w >= 0)) return null;
  const first = sources[0];
  if (first === undefined) return null;
  const n = first.length;
  if (n === 0) return null;
  if (!sources.every((s) => s.length === n && s.every((v) => isFiniteNumber(v) && v >= 0))) return null;
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum <= 0) return null;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let s = 0; s < sources.length; s++) acc += (weights[s] ?? 0) * (sources[s]?.[i] ?? 0);
    out.push(acc / wSum);
  }
  return out;
}

/** Ownership leverage: projected points discounted by expected ownership share. */
export function leverageScore(proj: number, ownership: number): number | null {
  if (!isFiniteNumber(proj) || proj < 0) return null;
  if (!isFiniteNumber(ownership) || ownership < 0 || ownership > 1) return null;
  return proj * (1 - ownership);
}
