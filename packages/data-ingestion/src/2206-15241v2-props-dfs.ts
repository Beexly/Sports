/**
 * Benchmark Dataset for Precipitation Forecasting by Post-Processing the Numerical Weather Prediction
 *
 * arXiv:2206.15241v2 · lane:props_dfs · verdict:ADAPT · owner:Mimo
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow
 * and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Salary-cap-constrained lineup construction as a 0/1 knapsack (exactly k players, maximize projected
 * points under the cap), multi-source projection blending with normalized weights, and
 * ownership-leverage scoring that discounts projections by expected roster percentage.
 *
 * Improvement (wiring record): Build the stadium-weather post-processor for game-day features (kickoff wind speed/direction,
 * precipitation probability, temperature): pull NWS/NWP gridded forecasts (GFS/NAM) for stadium
 * coordinates, supervise with METAR station observations (the AWS analogue), train gradient boosting
 * on the curated feature set (graduate to U-Net/ConvLSTM only if justified), split-by-forecast-origin
 * discipline, CSI/Bias categorical verification; feed calibrated weather distributions into the totals
 * model — then fix the paper's open heavy-tail failure with a two-head model: occurrence classifier +
 * generalized-Pareto/quantile-regression extreme-value tail head, blended by predicted intensity.
 *
 * ACCEPTANCE GATE: ADAPT iff the post-processor improves on raw NWP (CSI +>=0.02 on precipitation occurrence,
 * wind-speed MAE - >=5%) on the held-out window AND the calibrated weather features improve the totals
 * model's log-loss/Brier vs raw-weather inputs; REJECT if post-processing adds no skill over raw NWP
 * at stadium scale.
 *
 * Ingest role: DFS lineup construction primitives (knapsack optimizer, projection blending, leverage scoring).
 * Live data: NO. Runs offline on stored snapshots / synthetic fixtures.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2206.15241v2" as const;
export const LANE = "props_dfs" as const;

/** Numeric acceptance gate, verbatim from the wiring record (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT iff the post-processor improves on raw NWP (CSI +>=0.02 on precipitation occurrence, wind-speed MAE - >=5%) on the held-out window AND the calibrated weather features improve the totals model's log-loss/Brier vs raw-weather inputs; REJECT if post-processing adds no skill over raw NWP at stadium scale.`;

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
