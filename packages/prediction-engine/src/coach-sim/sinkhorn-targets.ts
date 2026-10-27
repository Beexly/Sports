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
 *    and column sums recover c. New exports; nothing consumes them yet.
 *
 * Wiring layer 2 into the injury overlay would change production output and is a
 * deliberate, separate decision — not a silent swap.
 */

import { createHash } from "node:crypto";

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

export function allocateTargets(
  targets: EligibleTarget[],
  epsilon = 0.05,
): TargetAllocation[] {
  if (targets.length === 0) return [];

  const costs = targets.map((t) => {
    const shadowPenalty = (t.shadowRate ?? 0) * 2.0;
    const contractBoost = (t.contractMultiplier ?? 1.0) - 1.0;
    const roleBase = t.role === "WR1" ? 0.8 : t.role === "SLOT" ? 1.1 : 1.0;
    return roleBase + shadowPenalty - contractBoost;
  });

  // Softmax-style allocation (single-step approximation, NOT Sinkhorn).
  const weights = costs.map((c) => Math.exp(-c / epsilon));
  const total = weights.reduce((s, w) => s + w, 0);

  return targets.map((t, i) => ({
    playerId: t.playerId,
    share: weights[i]! / total,
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

export const SINKHORN_EPS = 0.05;
export const SINKHORN_MAX_ITER = 200;
export const SINKHORN_TOL = 1e-6;

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
// Sinkhorn — entropy-regularized optimal transport
// =========================================================================== //

export interface SinkhornInfo {
  readonly iterations: number;
  readonly rowResidual: number;
  readonly colResidual: number;
  readonly converged: boolean;
  readonly objective: number;
}

/**
 * Sinkhorn with convergence diagnostics.
 *
 * `r` = source marginal (pre-injury shares), `c` = target marginal (post-injury
 * shares), `C` = sealed cost matrix. Returns the transport plan `P` and info.
 *
 * Kernel K = exp(-C/eps), computed elementwise with an underflow guard at
 * -700 so a large cost cannot produce a denormal zero row.
 */
export function sinkhornWithInfo(
  r: readonly number[],
  c: readonly number[],
  C: readonly (readonly number[])[],
  eps: number = SINKHORN_EPS,
  maxIter: number = SINKHORN_MAX_ITER,
  tol: number = SINKHORN_TOL,
): { plan: number[][]; info: SinkhornInfo } {
  const n = r.length;
  const m = c.length;
  const firstRow = C[0];
  if (C.length !== n || firstRow === undefined || firstRow.length !== m) {
    throw new Error(
      `dimension mismatch: len(r)=${n}, len(c)=${m}, shape(C)=(${C.length},${firstRow?.length ?? 0})`,
    );
  }
  for (const v of r) if (v < 0) throw new Error("marginals r and c must be non-negative");
  for (const v of c) if (v < 0) throw new Error("marginals r and c must be non-negative");

  // K[i][j] = exp(max(-C[i][j]/eps, -700))
  const K: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = C[i]!;
    const kRow: number[] = new Array(m);
    for (let j = 0; j < m; j++) {
      kRow[j] = Math.exp(Math.max(-(row[j]!) / eps, -700.0));
    }
    K.push(kRow);
  }

  let u: number[] = new Array(n).fill(1.0 / n);
  let v: number[] = new Array(m).fill(1.0 / m);
  let iterations = 0;

  for (iterations = 1; iterations <= maxIter; iterations++) {
    const uNew: number[] = new Array(n);
    for (let i = 0; i < n; i++) {
      let kv = 0;
      const kRow = K[i]!;
      for (let j = 0; j < m; j++) kv += kRow[j]! * v[j]!;
      uNew[i] = r[i]! / Math.max(kv, 1e-12);
    }
    const vNew: number[] = new Array(m);
    for (let j = 0; j < m; j++) {
      let ktU = 0;
      for (let i = 0; i < n; i++) ktU += K[i]![j]! * uNew[i]!;
      vNew[j] = c[j]! / Math.max(ktU, 1e-12);
    }
    let du = 0;
    for (let i = 0; i < n; i++) du = Math.max(du, Math.abs(uNew[i]! - u[i]!));
    let dv = 0;
    for (let j = 0; j < m; j++) dv = Math.max(dv, Math.abs(vNew[j]! - v[j]!));
    u = uNew;
    v = vNew;
    if (du < tol && dv < tol) break;
  }

  const plan: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = new Array(m);
    for (let j = 0; j < m; j++) row[j] = u[i]! * K[i]![j]! * v[j]!;
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
      converged: rowResidual < 1e-4 && colResidual < 1e-4,
      objective,
    },
  };
}

/** Minimal Sinkhorn: returns just the transport plan. */
export function sinkhorn(
  r: readonly number[],
  c: readonly number[],
  C: readonly (readonly number[])[],
  eps: number = SINKHORN_EPS,
  maxIter: number = SINKHORN_MAX_ITER,
  tol: number = SINKHORN_TOL,
): number[][] {
  return sinkhornWithInfo(r, c, C, eps, maxIter, tol).plan;
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
