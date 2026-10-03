export type FeatureContractStatus = "OK" | "WARN" | "BLOCK";
export type FeatureSourceStatus = "allowed" | "restricted" | "unknown";

export interface FeatureSourcePolicy {
  readonly sourceId: string;
  readonly status: FeatureSourceStatus;
  readonly allowedForModeling: boolean;
}

export interface GseFeatureValue {
  readonly key: string;
  readonly value: number;
  readonly quality?: number;
  readonly ageMinutes?: number;
  readonly required?: boolean;
  readonly sourcePolicy?: FeatureSourcePolicy;
}

export interface FeatureContractInput {
  readonly features: readonly GseFeatureValue[];
  readonly requiredFeatureKeys?: readonly string[];
  readonly maxAgeMinutes?: number;
}

export interface FeatureContractDriver {
  readonly name: string;
  readonly impact: number;
  readonly explanation: string;
}

export interface FeatureContractResult {
  readonly status: FeatureContractStatus;
  readonly featureHealth: number;
  readonly missingRequired: readonly string[];
  readonly staleFeatures: readonly string[];
  readonly staleRequired: readonly string[];
  readonly blockedSources: readonly string[];
  readonly drivers: readonly FeatureContractDriver[];
}

export function evaluateFeatureContract(input: FeatureContractInput): FeatureContractResult {
  const maxAgeMinutes = Math.max(1, input.maxAgeMinutes ?? 120);
  const byKey = new Map(input.features.map((feature) => [feature.key, feature]));
  const requiredKeys = new Set([
    ...input.features.filter((feature) => feature.required).map((feature) => feature.key),
    ...(input.requiredFeatureKeys ?? []),
  ]);

  const missingRequired = [...requiredKeys].filter((key) => !byKey.has(key));
  const staleFeatures = input.features
    .filter((feature) => (feature.ageMinutes ?? 0) > maxAgeMinutes)
    .map((feature) => feature.key);
  const staleRequired = staleFeatures.filter((key) => requiredKeys.has(key));
  const blockedSources = input.features
    .filter((feature) => {
      const policy = feature.sourcePolicy;
      return policy !== undefined && (!policy.allowedForModeling || policy.status !== "allowed");
    })
    .map((feature) => feature.key);

  const validQualities = input.features
    .map((feature) => clamp01(feature.quality ?? 1))
    .filter((quality) => Number.isFinite(quality));
  const averageQuality =
    validQualities.length > 0
      ? validQualities.reduce((sum, quality) => sum + quality, 0) / validQualities.length
      : 0;

  const missingPenalty = missingRequired.length * 35;
  const stalePenalty = staleFeatures.length * 12;
  const sourcePenalty = blockedSources.length * 45;
  const featureHealth = clampScore(averageQuality * 100 - missingPenalty - stalePenalty - sourcePenalty);

  const drivers: FeatureContractDriver[] = [
    {
      explanation: `Average feature quality is ${round2(averageQuality * 100)} before penalties.`,
      impact: round2(averageQuality * 100),
      name: "feature_quality",
    },
  ];
  if (missingRequired.length > 0) {
    drivers.push({
      explanation: `Missing required features: ${missingRequired.join(", ")}.`,
      impact: -missingPenalty,
      name: "missing_required_features",
    });
  }
  if (staleFeatures.length > 0) {
    drivers.push({
      explanation: `Stale features over ${maxAgeMinutes} minutes: ${staleFeatures.join(", ")}.`,
      impact: -stalePenalty,
      name: "stale_features",
    });
  }
  if (blockedSources.length > 0) {
    drivers.push({
      explanation: `Source policy blocks modeling for: ${blockedSources.join(", ")}.`,
      impact: -sourcePenalty,
      name: "source_policy_blocks",
    });
  }

  const status: FeatureContractStatus =
    missingRequired.length > 0 || staleRequired.length > 0 || blockedSources.length > 0
      ? "BLOCK"
      : staleFeatures.length > 0 || featureHealth < 70
        ? "WARN"
        : "OK";

  return {
    blockedSources,
    drivers,
    featureHealth: round2(featureHealth),
    missingRequired,
    staleRequired,
    staleFeatures,
    status,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
