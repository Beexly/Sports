/**
 * DFS adapters — salary, Pareto, shrinkage and payout signals as Observations.
 *
 * HONESTY NOTE (SURF-16 provenance audit): every adapter below computes its
 * value INLINE in this file. The old header claimed each adapter "wires
 * cluster-salary, dominance-pruning, ip-portfolio, and payout-framework real
 * exported functions", but this file's only engine import was
 * `import type { Observation, ... }` — erased at compile time — so no such
 * call site existed. Those claims were deleted. Each adapter now carries
 * `engine-inline:dfs-adapters#<fn>`, naming the function that actually
 * produced the number.
 */

import type { Observation, FailClosedResult, AdapterResult } from "./universal-adapter.js";

const NOW = (): string => new Date().toISOString();

function obs(source: string, value: number | string | boolean | null, confidence: number, provenance: string, family: string, raw: Record<string, unknown>): Observation {
  return { source, asOf: NOW(), value, confidence, provenance, family, raw };
}

function fail(source: string, reason: string): FailClosedResult {
  return { failClosed: true, reason, source };
}

// ── dfs/cluster-salary-screen.ts ───────────────────────────────────────────

export function flagUndervaluedAdapter(
  projectedPoints: number | null | undefined,
  salary: number | null | undefined,
  positionAvgPts: number | null | undefined,
  positionAvgSalary: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(projectedPoints) || !Number.isFinite(salary) || (salary ?? 0) === 0) {
    return fail("dfs:undervalued", "missing player data");
  }
  const ptsPerDollar = (projectedPoints ?? 0) / ((salary ?? 1) / 1000);
  const posPtsPerDollar = (positionAvgPts ?? 15) / ((positionAvgSalary ?? 5000) / 1000);
  const valueRatio = ptsPerDollar / Math.max(0.1, posPtsPerDollar);
  return obs("dfs:undervalued", Number(valueRatio.toFixed(3)), 0.82,
    "engine-inline:dfs-adapters#flagUndervaluedAdapter",
    "FANTASY_DFS", { valueRatio: Number(valueRatio.toFixed(3)), ptsPerDollar: Number(ptsPerDollar.toFixed(3)), isUndervalued: valueRatio > 1.15 });
}

export function teammateDifferentialAdapter(
  toRoleRate: number | null | undefined,
  offRoleRate: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(toRoleRate) || !Number.isFinite(offRoleRate)) {
    return fail("dfs:teammate-diff", "missing role data");
  }
  const diff = (toRoleRate ?? 0) - (offRoleRate ?? 0);
  return obs("dfs:teammate-diff", Number(diff.toFixed(4)), 0.78,
    "engine-inline:dfs-adapters#teammateDifferentialAdapter",
    "FANTASY_DFS", { differential: Number(diff.toFixed(4)), toRoleRate, offRoleRate });
}

// ── dfs/dominance-pruning.ts ────────────────────────────────────────────────

export function paretoFilterAdapter(
  points: readonly number[] | null | undefined,
  salaries: readonly number[] | null | undefined,
): AdapterResult {
  if (!points || !salaries || points.length === 0 || points.length !== salaries.length) {
    return fail("dfs:pareto", "missing player data");
  }
  // Count Pareto-optimal players (no other player has more points AND less salary)
  let paretoCount = 0;
  for (let i = 0; i < points.length; i++) {
    const pi = points[i] as number;
    const si = salaries[i] as number;
    let dominated = false;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const pj = points[j] as number;
      const sj = salaries[j] as number;
      if (pj >= pi && sj <= si && (pj > pi || sj < si)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) paretoCount++;
  }
  return obs("dfs:pareto", paretoCount, 0.85,
    "engine-inline:dfs-adapters#paretoFilterAdapter",
    "FANTASY_DFS", { paretoCount, totalPlayers: points.length });
}

// ── dfs/ip-portfolio.ts ─────────────────────────────────────────────────────

export function shrinkVarianceAdapter(
  rawVar: number | null | undefined,
  priorVar: number | null | undefined,
  nObs: number | null | undefined,
  priorWeight: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(rawVar) || !Number.isFinite(priorVar)) {
    return fail("dfs:shrink-var", "missing variance data");
  }
  const n = nObs ?? 1;
  const w = priorWeight ?? 10;
  const shrunk = ((n * (rawVar ?? 0)) + (w * (priorVar ?? 10))) / (n + w);
  return obs("dfs:shrink-var", Number(shrunk.toFixed(4)), 0.82,
    "engine-inline:dfs-adapters#shrinkVarianceAdapter",
    "FANTASY_DFS", { shrunk: Number(shrunk.toFixed(4)), rawVar, priorVar, nObs: n, priorWeight: w });
}

export function stackBonusAdapter(
  playerCount: number | null | undefined,
  correlation: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(playerCount)) {
    return fail("dfs:stack-bonus", "missing stack data");
  }
  const bonus = ((playerCount ?? 0) - 1) * (correlation ?? 0.3) * 0.5;
  return obs("dfs:stack-bonus", Number(bonus.toFixed(3)), 0.75,
    "engine-inline:dfs-adapters#stackBonusAdapter",
    "FANTASY_DFS", { bonus: Number(bonus.toFixed(3)), playerCount, correlation });
}

// ── dfs/payout-framework.ts ─────────────────────────────────────────────────

export function powerLawSharesAdapter(
  nPaid: number | null | undefined,
  alpha: number | null | undefined,
): AdapterResult {
  if (!Number.isFinite(nPaid) || (nPaid ?? 0) === 0) {
    return fail("dfs:power-law", "missing payout data");
  }
  const a = alpha ?? 1.5;
  const n = nPaid ?? 1;
  // Power law: share_i ∝ i^(-alpha)
  const shares: number[] = [];
  let total = 0;
  for (let i = 1; i <= n; i++) {
    const s = Math.pow(i, -a);
    shares.push(s);
    total += s;
  }
  const firstShare = shares[0] as number;
  const topShare = total > 0 ? firstShare / total : 0;
  return obs("dfs:power-law", Number(topShare.toFixed(4)), 0.8,
    "engine-inline:dfs-adapters#powerLawSharesAdapter",
    "FANTASY_DFS", { topShare: Number(topShare.toFixed(4)), nPaid: n, alpha: a });
}

// ── export all ──────────────────────────────────────────────────────────────

export const DFS_ADAPTERS = {
  flagUndervalued: flagUndervaluedAdapter,
  teammateDifferential: teammateDifferentialAdapter,
  paretoFilter: paretoFilterAdapter,
  shrinkVariance: shrinkVarianceAdapter,
  stackBonus: stackBonusAdapter,
  powerLawShares: powerLawSharesAdapter,
} as const;
