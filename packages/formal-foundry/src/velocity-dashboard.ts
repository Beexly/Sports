/**
 * GSE Formal Foundry — Velocity Dashboard
 * Tracks safe iteration metrics.
 */

import type { VelocityMetrics } from "./types";

export const VelocityMetricsState: VelocityMetrics = {
  changesUnderProof: 0,
  ctiCaught: 0,
  incidentRateProtected: 0,
  averageProofLatencyMs: 0,
  lastProofDate: new Date().toISOString().slice(0, 10),
};

export function updateVelocity(change: {
  ctiCount?: number;
  latencyMs?: number;
}): void {
  VelocityMetricsState.changesUnderProof += 1;
  VelocityMetricsState.ctiCaught += change.ctiCount ?? 0;
  if (change.latencyMs !== undefined) {
    const n = VelocityMetricsState.changesUnderProof;
    VelocityMetricsState.averageProofLatencyMs =
      (VelocityMetricsState.averageProofLatencyMs * (n - 1) + change.latencyMs) / n;
  }
  VelocityMetricsState.lastProofDate = new Date().toISOString().slice(0, 10);
  console.table(VelocityMetricsState);
}

export function getVelocitySnapshot(): VelocityMetrics {
  return { ...VelocityMetricsState };
}
