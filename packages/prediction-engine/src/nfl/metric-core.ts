export type MetricDirection = "UP" | "DOWN" | "NEUTRAL";
export type MetricLifecycleStatus = "DESIGN" | "SHADOW" | "BACKTESTING" | "REVIEW_READY" | "APPROVED";
export type MetricUncertaintyBand = "LOW" | "MEDIUM" | "HIGH";
export type MetricSourceStatus = "allowed" | "restricted" | "unknown" | "blocked";

export interface MetricDriver {
  readonly name: string;
  readonly contribution: number;
  readonly direction: MetricDirection;
  readonly explanation: string;
}

export interface MetricSourcePolicy {
  readonly sourceId: string;
  readonly status: MetricSourceStatus;
  readonly allowedForModeling: boolean;
  readonly attributionRequired?: string;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function normalizeClamped(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

export function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function weightedMean(values: readonly { readonly value: number; readonly weight: number }[]): number {
  const valid = values.filter((entry) => Number.isFinite(entry.value) && entry.weight > 0);
  const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return 0;
  return valid.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / totalWeight;
}

export function sourcePoliciesAllowed(policies: readonly MetricSourcePolicy[]): boolean {
  return policies.length > 0 && policies.every((policy) => policy.allowedForModeling && policy.status === "allowed");
}

export function uncertaintyFromEvidence(input: {
  readonly sampleSize?: number;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
  readonly proxyCount?: number;
}): MetricUncertaintyBand {
  const sampleSize = input.sampleSize ?? 0;
  const proxyCount = input.proxyCount ?? 0;
  if (!sourcePoliciesAllowed(input.sourcePolicy) || sampleSize < 50 || proxyCount > 2) return "HIGH";
  if (sampleSize < 250 || proxyCount > 0) return "MEDIUM";
  return "LOW";
}

export function sortedDrivers(drivers: readonly MetricDriver[]): readonly MetricDriver[] {
  return [...drivers].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
}
