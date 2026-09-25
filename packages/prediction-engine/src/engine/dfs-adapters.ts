/**
 * DFS adapters — wires cluster-salary, dominance-pruning, ip-portfolio,
 * and payout-framework real exported functions into the engine.
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
    "packages/prediction-engine/src/dfs/cluster-salary-screen.ts#flagUndervalued",
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
    "packages/prediction-engine/src/dfs/cluster-salary-screen.ts#teammateDifferential",
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
    let dominated = false;
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      if (points[j] >= points[i] && salaries[j] <= salaries[i] && (points[j] > points[i] || salaries[j] < salaries[i])) {
        dominated = true;
        break;
      }
    }
    if (!dominated) paretoCount++;
  }
  return obs("dfs:pareto", paretoCount, 0.85,
    "packages/prediction-engine/src/dfs/dominance-pruning.ts#paretoFilter",
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
    "packages/prediction-engine/src/dfs/ip-portfolio.ts#shrinkVariance",
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
    "packages/prediction-engine/src/dfs/ip-portfolio.ts#stackBonus",
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
  const topShare = total > 0 ? shares[0] / total : 0;
  return obs("dfs:power-law", Number(topShare.toFixed(4)), 0.8,
    "packages/prediction-engine/src/dfs/payout-framework.ts#powerLawShares",
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
