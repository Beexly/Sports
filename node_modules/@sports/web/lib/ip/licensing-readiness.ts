import type { IpMetricCard } from "./metric-card";

export interface LicensingReadinessDecision {
  readonly ready: boolean;
  readonly blockers: readonly string[];
}

export function evaluateLicensingReadiness(metricCard: IpMetricCard): LicensingReadinessDecision {
  const blockers: string[] = [];
  if (metricCard.status !== "approved") blockers.push("Metric is not approved.");
  if (metricCard.sourceRights.length === 0) blockers.push("Metric has no source-rights envelopes.");
  if (metricCard.sourceRights.some((source) => !source.mayExposeDerived)) {
    blockers.push("At least one source blocks derived exposure.");
  }
  if (metricCard.publicExposure === "none") blockers.push("Metric has no approved public exposure.");
  return { blockers, ready: blockers.length === 0 };
}
