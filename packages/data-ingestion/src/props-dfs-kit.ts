/**
 * Shared props/DFS primitives for the `props_dfs` research lane.
 *
 * WHY THIS FILE EXISTS (consolidation, 2026-09-26)
 * The eleven `*props-dfs.ts` research modules in this package each carried a
 * byte-for-byte copy of the same three primitives (knapsackLineup,
 * blendProjections, leverageScore) plus an identical CONFIG. Their research
 * content — paper title, improvement narrative, ACCEPTANCE_GATE thresholds and
 * ARXIV_ID — differs per file and is NOT duplicated here.
 *
 * Each of those eleven modules keeps its own header and metadata and re-exports
 * from this kit, so every existing `import * as mod from "./<paper>-props-dfs"`
 * in the paired test files continues to resolve the same three symbols.
 *
 * NOTHING else imports these modules. The props/DFS surface that production
 * actually uses is `packages/prediction-engine/src/props-dfs/`, which is a
 * separate directory and is untouched by this change.
 */

/** Numeric guard: rejects NaN, Infinity, and non-numbers. */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export const CONFIG = {
  enabled: false,
  method: "salary-cap knapsack lineup construction",
} as const;

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
