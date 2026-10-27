/**
 * Grok-2 Conformal Prediction Diagnostic & Sealed EPA Dropoff Table
 *
 * Conformal Diagnostic:
 *   Residual: r_i = sealedModelTotal_i - externalTotal_i
 *   Sorted absolute residuals: |r|_(1) <= |r|_(2) <= ... <= |r|_(n)
 *   Empirical quantile at level 1 - alpha: qHat = |r|_(ceil((1 - alpha) * (n + 1)))
 *   Conformal Prediction Interval: [sealedModelTotal - qHat, sealedModelTotal + qHat]
 *   Invariance: Diagnostic flag only. Never changes sealed ratings, rankings, or coachMindsetHash.
 *
 * Sealed EPA Dropoff Table:
 *   Lookup of expected-points-added residual when a player is removed.
 *   Locked into coachMindsetHash on the Tuesday seal at 04:00 CT.
 *   Injury adjustments redistribute strictly under sealed numbers with zero mid-week re-estimation.
 */

import { createHash } from 'crypto';

export type SealedEpaDropoffTable = Readonly<Record<string, number>>;

export interface ConformalPredictionInterval {
  readonly lower: number;
  readonly upper: number;
}

export interface ConformalDiagnosticResult {
  readonly gameId: string;
  readonly residual: number;
  readonly absResidual: number;
  readonly interval: ConformalPredictionInterval;
  readonly flagged: boolean;
  readonly reason?: string;
}

export function computeConformalQuantile(
  sortedAbsResiduals: readonly number[],
  alpha = 0.10,
): number {
  if (!sortedAbsResiduals || sortedAbsResiduals.length === 0) {
    throw new Error('sortedAbsResiduals must not be empty');
  }
  if (alpha <= 0 || alpha >= 1) {
    throw new Error('alpha must be between 0 and 1');
  }

  const n = sortedAbsResiduals.length;
  // 1-indexed order statistic index: ceil((1 - alpha) * (n + 1))
  const orderK = Math.ceil((1 - alpha) * (n + 1));
  // Clamp to valid array index [0, n - 1]
  const idx = Math.min(n - 1, Math.max(0, orderK - 1));
  const val = sortedAbsResiduals[idx];
  if (val === undefined) {
    throw new Error('Index out of bounds calculating conformal quantile');
  }
  return val;
}

export function buildConformalPredictionInterval(
  sealedModelTotal: number,
  qHat: number,
): ConformalPredictionInterval {
  return Object.freeze({
    lower: Number((sealedModelTotal - qHat).toFixed(4)),
    upper: Number((sealedModelTotal + qHat).toFixed(4)),
  });
}

export function evaluateConformalDiagnostic(input: {
  gameId: string;
  sealedModelTotal: number;
  externalTotal: number;
  qHat: number;
}): ConformalDiagnosticResult {
  const residual = Number((input.sealedModelTotal - input.externalTotal).toFixed(4));
  const absResidual = Number(Math.abs(residual).toFixed(4));
  const interval = buildConformalPredictionInterval(input.sealedModelTotal, input.qHat);
  const flagged = absResidual > input.qHat;

  return Object.freeze({
    gameId: input.gameId,
    residual,
    absResidual,
    interval,
    flagged,
    reason: flagged
      ? `Absolute residual ${absResidual} exceeds conformal quantile qHat=${input.qHat} (Interval: [${interval.lower}, ${interval.upper}])`
      : undefined,
  });
}

export function hashEpaDropoffTable(table: SealedEpaDropoffTable): string {
  const sortedKeys = Object.keys(table).sort();
  const canonicalPayload = sortedKeys.map((k) => `${k}:${(table[k] ?? 0).toFixed(4)}`).join('|');
  return createHash('sha256').update(canonicalPayload).digest('hex');
}

export interface EpaReallocationResult {
  readonly originalDropoff: number;
  readonly allocations: Readonly<Record<string, number>>;
  readonly tableHash: string;
}

export function reallocateEpaDropoff(input: {
  table: SealedEpaDropoffTable;
  inactivePlayerId: string;
  replacementDepthIds: readonly string[];
  depthWeights: readonly number[];
}): EpaReallocationResult {
  const originalDropoff = input.table[input.inactivePlayerId];
  if (originalDropoff === undefined) {
    throw new Error(`Player ${input.inactivePlayerId} not found in sealed EPA dropoff table`);
  }
  if (input.replacementDepthIds.length !== input.depthWeights.length) {
    throw new Error('replacementDepthIds and depthWeights length mismatch');
  }

  const totalWeight = input.depthWeights.reduce((a, b) => a + b, 0);
  const allocations: Record<string, number> = {};

  for (let i = 0; i < input.replacementDepthIds.length; i++) {
    const id = input.replacementDepthIds[i];
    const weight = input.depthWeights[i] ?? 0;
    if (id !== undefined) {
      const normWeight = totalWeight > 0 ? weight / totalWeight : 1 / input.replacementDepthIds.length;
      allocations[id] = Number((originalDropoff * normWeight).toFixed(4));
    }
  }

  return Object.freeze({
    originalDropoff,
    allocations: Object.freeze(allocations),
    tableHash: hashEpaDropoffTable(input.table),
  });
}
