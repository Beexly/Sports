/**
 * Sinkhorn-Knopp target reallocation for the Coach-First simulator.
 * Pure Class A. No OddsInput, no market tokens.
 *
 * Two layers live in this file, and they are NOT the same algorithm:
 *
 * 1. `allocateTargets` — the pre-existing single-step softmax over per-player
 *    scalar costs. It is what production currently calls from
 *    `locked-projection.applyInjuryOverlay`. Despite this file's original header
 *    claiming a "cost matrix C_ij", it builds no matrix and enforces no
 *    marginals. Left in place so existing call sites and their pinned numbers do
 *    not move.
 *
 * 2. `sinkhorn` / `sinkhornWithInfo` / `roleCostMatrix` / `applyEpaDropoff` —
 *    the real entropy-regularized optimal transport, ported verbatim from the
 *    ledger reference `gse_injury_overlay_v2.py`. This moves a source marginal r
 *    onto a target marginal c through a sealed cost matrix, so row sums recover r
 *    and column sums recover c.
 *
 * `sinkhornTargetAllocation` bridges the two: it feeds Sinkhorn the survivors'
 * raw base shares (r) and the coach cost model's allocation (c) through the role
 * cost matrix, and returns the plan's column marginal as the allocation. It is
 * what `locked-projection.applyInjuryOverlay` now runs. Because the solver's
 * column marginal is pinned to c, the published allocation numbers do not move;
 * what changes is that the redistribution is computed as an explicit transport
 * with enforced marginals and an auditable plan rather than an implicit softmax
 * normalization.
 *
 * `allocateTargets` remains the engine for the sealed Tuesday baseline lock,
 * whose published allocation numbers predate the transport wiring. The two share
 * `targetCosts`, so they cannot disagree about what a target is worth.
 */

import { createHash } from "node:crypto";

import {
  SINKHORN_EPS,
  SINKHORN_MAX_ITER,
  SINKHORN_TOL,
  sinkhorn,
  sinkhornWithInfo,
  type SinkhornInfo,
  type SinkhornScaling,
} from "./sinkhorn.js";

// One source of truth for the transport math. The pure solver lives in
// ./sinkhorn.ts; these re-exports keep every existing import resolving.
export {
  SINKHORN_EPS,
  SINKHORN_MAX_ITER,
  SINKHORN_TOL,
  sinkhorn,
  sinkhornWithInfo,
  type SinkhornInfo,
  type SinkhornScaling,
} from "./sinkhorn.js";

export interface EligibleTarget {
  playerId: string;
  role: "WR1" | "WR2" | "SLOT" | "TE" | "RB";
  baseShare: number;
  shadowRate?: number; // 0-1, higher = more covered
  contractMultiplier?: number; // >1 if near bonus threshold
}

export interface TargetAllocation {
  playerId: string;
  share: number;
  cost: number;
}

/**
 * The one cost model both allocation engines charge. Role base cost, plus a
 * shadow-coverage penalty, minus a near-bonus contract boost. Extracted so the
 * softmax engine and the Sinkhorn engine cannot drift apart on what a target is
 * worth.
 */
function targetCosts(targets: readonly EligibleTarget[]): number[] {
  return targets.map((t) => {
    const shadowPenalty = (t.shadowRate ?? 0) * 2.0;
    const contractBoost = (t.contractMultiplier ?? 1.0) - 1.0;
    const roleBase = t.role === "WR1" ? 0.8 : t.role === "SLOT" ? 1.1 : 1.0;
    return roleBase + shadowPenalty - contractBoost;
  });
}

export function allocateTargets(
  targets: EligibleTarget[],
  epsilon = 0.05,
): TargetAllocation[] {
  if (targets.length === 0) return [];

  const costs = targetCosts(targets);

  // Softmax-style allocation (single-step approximation, NOT Sinkhorn).
  const weights = costs.map((c) => Math.exp(-c / epsilon));
  const total = weights.reduce((s, w) => s + w, 0);

  return targets.map((t, i) => ({
    playerId: t.playerId,
    share: weights[i]! / total,
    cost: costs[i]!,
  }));
}

/**
 * Sinkhorn allocation over an active target set — the transport engine the
 * injury overlay runs.
 *
 * Two marginals are handed to the solver:
 *
 *   r = each survivor's raw base share, normalized over the active set. This is
 *       the supply marginal: where the targets physically sit before role cost
 *       is priced in.
 *   c = the coach cost model's allocation over those same survivors (the same
 *       softmax the legacy engine produced). This is the demand marginal: where
 *       targets should land once role base, shadow coverage, and contract
 *       proximity are priced.
 *
 * The sealed role-interchangeability matrix is the cost C. The solver's column
 * marginal IS the allocation, so the shares returned here match the legacy
 * softmax numbers to solver tolerance — what changes is that the redistribution
 * is now an explicit entropy-regularized transport with enforced marginals and
 * a plan that can be audited cell by cell. That is the whole reason to run
 * Sinkhorn instead of normalizing a softmax: the flow, not just the total, is
 * accountable.
 *
 * Degenerate sets fall back without pretending to transport:
 *   - empty      -> []
 *   - one player -> that player takes the whole marginal
 *   - zero total base share -> uniform supply marginal (a data anomaly, not a
 *     reason to divide by zero)
 */
export function sinkhornTargetAllocation(
  targets: readonly EligibleTarget[],
  epsilon = SINKHORN_EPS,
): TargetAllocation[] {
  if (targets.length === 0) return [];

  const costs = targetCosts(targets);
  const n = targets.length;

  if (n === 1) {
    return [{ playerId: targets[0]!.playerId, share: 1, cost: costs[0]! }];
  }

  const activeTotal = targets.reduce((s, t) => s + t.baseShare, 0);
  const baseShares = targets.map((t) => t.baseShare);
  const r =
    activeTotal > 0
      ? baseShares.map((b) => b / activeTotal)
      : baseShares.map(() => 1 / n);

  const weights = costs.map((c) => Math.exp(-c / epsilon));
  const weightTotal = weights.reduce((s, w) => s + w, 0);
  const c =
    weightTotal > 0 ? weights.map((w) => w / weightTotal) : baseShares.map(() => 1 / n);

  const playerIds = targets.map((t) => t.playerId);
  const roleOf: Record<string, string> = Object.fromEntries(
    targets.map((t) => [t.playerId, t.role]),
  );
  const C = roleCostMatrix(playerIds, roleOf);
  const plan = sinkhorn(r, c, C, epsilon);

  // The allocation is the plan's column marginal: how much target share each
  // survivor ends up holding after the transport. Equals c up to solver tol.
  const shares: number[] = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const planRow = plan[i]!;
    for (let j = 0; j < n; j++) shares[j] = shares[j]! + planRow[j]!;
  }

  return targets.map((t, i) => ({
    playerId: t.playerId,
    share: shares[i]!,
    cost: costs[i]!,
  }));
}

export function applyShadowHaircut(
  allocation: TargetAllocation[],
  shadows: Array<{ wr: string; shadowRate: number }>,
): TargetAllocation[] {
  return allocation.map((a) => {
    const shadow = shadows.find((s) => s.wr === a.playerId);
    if (!shadow || shadow.shadowRate < 0.55) return a;
    return { ...a, share: a.share * (1 - shadow.shadowRate * 0.3) };
  });
}

// =========================================================================== //
// Sealed artifacts — ported verbatim from gse_injury_overlay_v2.py
// =========================================================================== //

/** Bounds every EPA factor must satisfy. Outside this range is a data error. */
export const EPA_FACTOR_MIN = 0.5;
export const EPA_FACTOR_MAX = 1.2;

/**
 * Sealed EPA dropoff table. Each entry is the ratio of replacement to starter
 * EPA-per-play for that role. Sealed at Tuesday 04:00 CT; never re-estimated
 * mid-week.
 */
export const EPA_DROPOFF: Readonly<Record<string, number>> = Object.freeze({
  QB1: 0.78,
  RB1: 0.85,
  WR1: 0.82,
  WR2: 0.88,
  TE1: 0.84,
  OL: 0.91,
});

// Sinkhorn constants live in ./sinkhorn.ts and are re-exported above.

/** Stable JSON with sorted keys and no whitespace, for hashing. */
function canonicalJson(obj: Record<string, number>): string {
  const keys = Object.keys(obj).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${JSON.stringify(obj[k]!)}`)
    .join(",");
  return `{${body}}`;
}

/** SHA-256 over the canonical form of a table. Deterministic within this codebase. */
export function canonicalHash(obj: Record<string, number>): string {
  return createHash("sha256").update(canonicalJson(obj), "utf8").digest("hex");
}

/** Hash of the sealed EPA table as written at the Tuesday baseline. */
export const EPA_DROPOFF_SHA256 = canonicalHash({ ...EPA_DROPOFF });

/**
 * Validate a sealed EPA table and return its SHA-256.
 * Throws if any factor is non-numeric, non-finite, or outside [lo, hi], or if
 * `expectedHash` is supplied and does not match.
 */
export function validateEpaTable(
  table: Readonly<Record<string, number>>,
  expectedHash?: string,
  lo: number = EPA_FACTOR_MIN,
  hi: number = EPA_FACTOR_MAX,
): string {
  for (const [role, factor] of Object.entries(table)) {
    if (typeof factor !== "number" || !Number.isFinite(factor)) {
      throw new Error(`EPA factor for role ${JSON.stringify(role)} is not a finite number: ${String(factor)}`);
    }
    if (factor < lo || factor > hi) {
      throw new Error(
        `EPA factor for role ${JSON.stringify(role)} = ${factor} is outside the sealed bounds [${lo}, ${hi}]`,
      );
    }
  }
  const digest = canonicalHash({ ...table });
  if (expectedHash !== undefined && digest !== expectedHash) {
    throw new Error(
      `EPA table hash mismatch: sealed table was modified mid-week (expected ${expectedHash}, got ${digest})`,
    );
  }
  return digest;
}

/**
 * Multiply each post-Sinkhorn share by the sealed EPA factor of the role that
 * player inherits. A player whose role is absent from `roleOf` or from `table`
 * keeps its share unchanged (factor 1.0).
 */
export function applyEpaDropoff(
  shares: Readonly<Record<string, number>>,
  roleOf: Readonly<Record<string, string>>,
  table: Readonly<Record<string, number>> = EPA_DROPOFF,
  lo: number = EPA_FACTOR_MIN,
  hi: number = EPA_FACTOR_MAX,
  validateTable = true,
): Record<string, number> {
  if (validateTable) validateEpaTable(table, undefined, lo, hi);

  const out: Record<string, number> = {};
  for (const [player, share] of Object.entries(shares)) {
    const role = roleOf[player];
    const factor = role !== undefined ? (table[role] ?? 1.0) : 1.0;
    if (factor < lo || factor > hi) {
      throw new Error(
        `applied EPA factor ${factor} for player ${JSON.stringify(player)} is outside [${lo}, ${hi}]`,
      );
    }
    out[player] = share * factor;
  }
  return out;
}

// =========================================================================== //
// Sinkhorn — the pure solver now lives in ./sinkhorn.ts and is re-exported at
// the top of this file. Only the target-allocation bridge and the role cost
// matrix remain here, so the transport math cannot drift between two copies.
// =========================================================================== //

/**
 * Log-domain Sinkhorn (Schmitzer, arXiv:1610.06519).
 *
 * Iterates the dual potentials instead of the scaling factors. The kernel is
 * never formed, so a small epsilon does not overflow u and v.
 *
 *   psi = -C_ij + beta_j
 *   alpha_i = eps * log(r_i) - eps * logsumexp_j(psi / eps)
 *
 * Not called by allocateTargets or sinkhorn. Swapping it into the injury
 * overlay changes how sharp the plan is, and that is a re-seal, not a
 * mid-week edit. Epsilon-scaling is not in this function.
 */
export function sinkhornLogDomain(
  r: readonly number[],
  c: readonly number[],
  C: readonly (readonly number[])[],
  eps: number = SINKHORN_EPS,
  maxIter: number = SINKHORN_MAX_ITER,
  tol: number = 1e-9,
): { plan: number[][]; info: SinkhornInfo } {
  const n = r.length;
  const m = c.length;
  const firstRow = C[0];
  if (eps <= 0) throw new Error("epsilon must be positive");
  if (C.length !== n || firstRow === undefined || firstRow.length !== m) {
    throw new Error(
      `dimension mismatch: len(r)=${n}, len(c)=${m}, shape(C)=(${C.length},${firstRow?.length ?? 0})`,
    );
  }
  for (const v of r) if (v < 0) throw new Error("marginals r and c must be non-negative");
  for (const v of c) if (v < 0) throw new Error("marginals r and c must be non-negative");

  const alpha = new Array<number>(n).fill(0);
  const beta = new Array<number>(m).fill(0);
  let iterations = 0;

  const lse = (values: readonly number[]): number => {
    let max = -Infinity;
    for (const v of values) if (v > max) max = v;
    if (!Number.isFinite(max)) return -Infinity;
    let sum = 0;
    for (const v of values) sum += Math.exp((v - max) / eps);
    return max / eps + Math.log(sum);
  };

  for (iterations = 1; iterations <= maxIter; iterations++) {
    const nextAlpha = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      const psi: number[] = new Array(m);
      const row = C[i]!;
      for (let j = 0; j < m; j++) psi[j] = -(row[j]!) + beta[j]!;
      const ri = r[i]!;
      nextAlpha[i] = ri <= 0 ? -1e6 : eps * Math.log(ri) - eps * lse(psi);
    }
    const nextBeta = new Array<number>(m);
    for (let j = 0; j < m; j++) {
      const psi: number[] = new Array(n);
      for (let i = 0; i < n; i++) psi[i] = -(C[i]![j]!) + nextAlpha[i]!;
      const cj = c[j]!;
      nextBeta[j] = cj <= 0 ? -1e6 : eps * Math.log(cj) - eps * lse(psi);
    }
    let shift = 0;
    for (let i = 0; i < n; i++) shift = Math.max(shift, Math.abs(nextAlpha[i]! - alpha[i]!));
    for (let j = 0; j < m; j++) shift = Math.max(shift, Math.abs(nextBeta[j]! - beta[j]!));
    for (let i = 0; i < n; i++) alpha[i] = nextAlpha[i]!;
    for (let j = 0; j < m; j++) beta[j] = nextBeta[j]!;
    if (shift < tol) break;
  }

  const plan: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = new Array(m);
    for (let j = 0; j < m; j++) {
      row[j] = Math.exp((alpha[i]! + beta[j]! - C[i]![j]!) / eps);
    }
    plan.push(row);
  }

  let rowResidual = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < m; j++) sum += plan[i]![j]!;
    rowResidual = Math.max(rowResidual, Math.abs(sum - r[i]!));
  }
  let colResidual = 0;
  for (let j = 0; j < m; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += plan[i]![j]!;
    colResidual = Math.max(colResidual, Math.abs(sum - c[j]!));
  }
  let objective = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) objective += plan[i]![j]! * C[i]![j]!;

  return {
    plan,
    info: {
      iterations,
      rowResidual,
      colResidual,
      converged: rowResidual < 1e-6 && colResidual < 1e-6,
      objective,
    },
  };
}

/**
 * Build a sealed interchangeability cost matrix from role labels.
 *
 * Lower cost = cheaper to move target share. Two players sharing an exact role
 * are cheapest; same position group (WR1/WR2 -> WR) is intermediate; different
 * position groups are most expensive.
 */
export function roleCostMatrix(
  roles: readonly string[],
  roleOf: Readonly<Record<string, string>>,
  sameRoleCost = 0.0,
  samePositionCost = 0.35,
  crossPositionCost = 1.0,
): number[][] {
  const position = (role: string): string =>
    role.replace(/[^a-zA-Z]/g, "").toUpperCase();

  const players = Object.keys(roleOf);
  const setA = new Set(players);
  const setB = new Set(roles);
  if (setA.size !== setB.size || [...setA].some((p) => !setB.has(p))) {
    throw new Error("roles and roleOf keys must describe the same players");
  }

  const C: number[][] = [];
  for (let i = 0; i < roles.length; i++) {
    const row: number[] = [];
    const ri = roleOf[roles[i]!]!;
    for (let j = 0; j < roles.length; j++) {
      const rj = roleOf[roles[j]!]!;
      if (i === j) row.push(0.0);
      else if (ri === rj) row.push(sameRoleCost);
      else if (position(ri) === position(rj)) row.push(samePositionCost);
      else row.push(crossPositionCost);
    }
    C.push(row);
  }
  return C;
}
