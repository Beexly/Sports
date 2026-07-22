/**
 * GSE Formal Foundry — Velocity Dashboard
 * Tracks safe iteration metrics.
 *
 * Silent by design (fixed: `updateVelocity` used to `console.table` its
 * whole state as a side effect on every call — removed for the same reason
 * as safety-ledger.ts: this repo's dormant/lab-only packages do not narrate
 * themselves to the console as a side effect of normal operation; a caller
 * reads state via `getVelocitySnapshot()`).
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
}

export function getVelocitySnapshot(): VelocityMetrics {
  return { ...VelocityMetricsState };
}
