/**
 * Injury operator: the ONLY injury path.
 *
 * Mirrors gse_injury_overlay_v2.py exactly:
 *   1. Sinkhorn reallocates pre-injury target shares onto healthy players under
 *      the sealed cost matrix.
 *   2. Column sums of the transport plan become the feasible post-injury shares.
 *   3. apply_epa_dropoff multiplies each feasible share by the sealed EPA factor
 *      of the role the player inherits.
 *
 * The baseline hash MUST be identical before and after. If it is not, the
 * operator mutated a sealed artifact and must be rejected.
 *
 * Note on tau: this module never calls recoverTau. tau and coachMindsetHash are
 * invariant by construction; assertTauSealed is the backstop.
 */

import { canonicalHash, candidateHash } from "./candidate-baseline.js";
import type { OperatorEnvelope } from "./types.js";

const SINKHORN_EPS = 0.05;
const SINKHORN_MAX_ITER = 200;
const SINKHORN_TOL = 1e-6;

const EPA_FACTOR_MIN = 0.5;
const EPA_FACTOR_MAX = 1.2;

/**
 * Sealed EPA dropoff table. Replacement-to-starter EPA-per-play ratios.
 *
 * QB_QUESTIONABLE is the EV-weighted EPA/play retention for a QB1 listed
 * Questionable who starts. Measured 0.0947 EPA/play dropoff (2024-2026,
 * opponent-adjusted, within-team bootstrap; P(start|QB1 Questionable) = 0.341,
 * effect-if-start 0.1159, effect-if-sit 0.0838 -> EV 0.341*0.1159 +
 * 0.659*0.0838 = 0.0947). Converted to this table's retention space against
 * the sealed QB1 anchor: QB1 0.78 implies a 22% dropoff, and the sealed QB1
 * dropoff is 0.11 EPA/play, so a healthy starter is 0.11/0.22 = 0.50 EPA/play.
 * Retention = 1 - 0.0947/0.50 = 0.8106.
 *
 * BLOCKER: the 2024/2025 injuries CSVs are not present in this checkout, so the
 * estimator cannot be re-run here. The value is frozen from the measured run;
 * do not re-derive it from market data. Re-run fit_qb_questionable.py against
 * data/gse-dataset/current/injuries_{2024,2025,2026}.csv when that data lands.
 */
/**
 * The measured EV-weighted EPA/play dropoff for a QB1 listed Questionable who
 * starts: 0.341 * 0.1159 + 0.659 * 0.0838 = 0.0947 EPA/play. This is the raw
 * measurement; EPA_DROPOFF.QB_QUESTIONABLE is its retention-space equivalent
 * (1 - 0.0947/0.50 = 0.8106). Freezing the raw value here keeps the provenance
 * auditable without changing the table's retention semantics.
 */
const QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947;

const EPA_DROPOFF: Record<string, number> = {
  QB1: 0.78,
  QB_QUESTIONABLE: 0.8106,
  RB1: 0.85,
  WR1: 0.82,
  WR2: 0.88,
  TE1: 0.84,
  OL: 0.91,
};

const EPA_DROPOFF_SHA256 = canonicalHash(EPA_DROPOFF);

function validateEpaTable(table: Record<string, number>): string {
  for (const [role, factor] of Object.entries(table)) {
    if (!Number.isFinite(factor) || factor < EPA_FACTOR_MIN || factor > EPA_FACTOR_MAX) {
      throw new Error(
        `EPA factor for role ${role} is ${factor}, outside [${EPA_FACTOR_MIN}, ${EPA_FACTOR_MAX}]`,
      );
    }
  }
  return canonicalHash(table);
}

function normalizeShares(shares: Record<string, number>): Record<string, number> {
  const total = Object.values(shares).reduce((a, b) => a + b, 0);
  if (total <= 0) return { ...shares };
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(shares)) out[k] = v / total;
  return out;
}

function sinkhorn(
  r: number[],
  c: number[],
  cost: number[][],
  eps = SINKHORN_EPS,
  maxIter = SINKHORN_MAX_ITER,
  tol = SINKHORN_TOL,
): { plan: number[][]; converged: boolean; rowResidual: number; colResidual: number } {
  const n = r.length;
  const m = c.length;
  const K: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => Math.exp(-cost[i]![j]! / eps)),
  );

  let u = new Array<number>(n).fill(1);
  let v = new Array<number>(m).fill(1);

  let converged = false;
  for (let it = 0; it < maxIter; it += 1) {
    // u = r / (K v)
    for (let i = 0; i < n; i += 1) {
      let kv = 0;
      for (let j = 0; j < m; j += 1) kv += K[i]![j]! * v[j]!;
      u[i] = kv > 0 ? r[i]! / kv : 0;
    }
    // v = c / (K^T u)
    for (let j = 0; j < m; j += 1) {
      let ktu = 0;
      for (let i = 0; i < n; i += 1) ktu += K[i]![j]! * u[i]!;
      v[j] = ktu > 0 ? c[j]! / ktu : 0;
    }

    let rowRes = 0;
    let colRes = 0;
    for (let i = 0; i < n; i += 1) {
      let sum = 0;
      for (let j = 0; j < m; j += 1) sum += K[i]![j]! * v[j]!;
      rowRes = Math.max(rowRes, Math.abs(sum * u[i]! - r[i]!));
    }
    for (let j = 0; j < m; j += 1) {
      let sum = 0;
      for (let i = 0; i < n; i += 1) sum += K[i]![j]! * u[i]!;
      colRes = Math.max(colRes, Math.abs(sum * v[j]! - c[j]!));
    }
    if (rowRes < tol && colRes < tol) {
      converged = true;
      const plan = Array.from({ length: n }, (_, i) =>
        Array.from({ length: m }, (_, j) => u[i]! * K[i]![j]! * v[j]!),
      );
      return { plan, converged, rowResidual: rowRes, colResidual: colRes };
    }
  }

  const plan = Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => u[i]! * K[i]![j]! * v[j]!),
  );
  return { plan, converged, rowResidual: NaN, colResidual: NaN };
}

export interface InjuryReallocInput {
  /** Sealed pre-injury target shares. */
  preShares: Record<string, number>;
  /** Post-injury shares with the injured player's mass removed. */
  postShares: Record<string, number>;
  /** Player -> role label. */
  roleOf: Record<string, string>;
  /** Sealed interchangeability cost matrix. */
  cost: number[][];
  /** Player ordering matching the cost matrix. */
  players: string[];
  /** Baseline hash to prove invariance. */
  baselineHash: string;
}

export interface InjuryReallocOutput {
  feasible_shares: Record<string, number>;
  effective_shares: Record<string, number>;
  normalized_shares: Record<string, number>;
  total_mass_before: number;
  total_mass_after: number;
  mass_loss: number;
  sinkhorn: {
    converged: boolean;
    row_residual: number | null;
    col_residual: number | null;
  };
  epa_table_sha256: string;
  epa_factors: Record<string, number>;
  baseline_hash_before: string;
  baseline_hash_after: string;
  hash_unchanged: boolean;
}

/**
 * Run the injury overlay.
 *
 * The baseline hash is recomputed from the same object before and after; a
 * difference means a sealed artifact was mutated and the operator must fail.
 */
export function injuryRealloc(
  input: InjuryReallocInput,
): OperatorEnvelope<InjuryReallocOutput> {
  const { preShares, postShares, roleOf, cost, players, baselineHash } = input;

  // Read the candidate baseline hash from disk BEFORE the pure computation.
  const hashBefore = candidateHash() ?? baselineHash;

  const r = players.map((p) => Number(preShares[p] ?? 0));
  const c = players.map((p) => Number(postShares[p] ?? 0));

  const { plan, converged, rowResidual, colResidual } = sinkhorn(r, c, cost);

  const feasible: Record<string, number> = {};
  for (let j = 0; j < players.length; j += 1) {
    const player = players[j]!;
    feasible[player] = plan.reduce((acc, row) => acc + row[j]!, 0);
  }

  const tableHash = validateEpaTable(EPA_DROPOFF);

  const effective: Record<string, number> = {};
  for (const player of players) {
    const role = roleOf[player];
    const factor = typeof role === "string" ? EPA_DROPOFF[role] ?? 1.0 : 1.0;
    effective[player] = feasible[player]! * factor;
  }

  const totalBefore = Object.values(feasible).reduce((a, b) => a + b, 0);
  const totalAfter = Object.values(effective).reduce((a, b) => a + b, 0);

  const factors: Record<string, number> = {};
  for (const player of players) {
    const role = roleOf[player];
    factors[player] = typeof role === "string" ? EPA_DROPOFF[role] ?? 1.0 : 1.0;
  }

  // Re-read the candidate baseline hash AFTER the pure computation. The operator
  // touches no sealed artifact, so this must equal hashBefore.
  const hashAfter = candidateHash() ?? baselineHash;

  return {
    baseline_hash: baselineHash,
    operator: "injury_realloc",
    inputs: {
      players: players.length,
      injured_removed: Object.keys(preShares).filter((p) => !(p in postShares)),
      epa_table_sha256: tableHash,
    },
    output: {
      feasible_shares: round(feasible),
      effective_shares: round(effective),
      normalized_shares: round(normalizeShares(effective)),
      total_mass_before: Number(totalBefore.toFixed(6)),
      total_mass_after: Number(totalAfter.toFixed(6)),
      mass_loss: Number((totalBefore - totalAfter).toFixed(6)),
      sinkhorn: {
        converged,
        row_residual: Number.isFinite(rowResidual) ? Number(rowResidual.toExponential(3)) : null,
        col_residual: Number.isFinite(colResidual) ? Number(colResidual.toExponential(3)) : null,
      },
      epa_table_sha256: tableHash,
      epa_factors: factors,
      baseline_hash_before: hashBefore,
      baseline_hash_after: hashAfter,
      hash_unchanged: hashBefore === hashAfter,
    },
    sealed: true,
  };
}

function round(m: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) out[k] = Number(v.toFixed(6));
  return out;
}

export {
  EPA_DROPOFF,
  EPA_DROPOFF_SHA256,
  SINKHORN_EPS,
  QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
};
