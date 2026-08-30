export const AWS_GATE_KEYS = [
  "FABLE_AWS_ALLOW_EXPERIMENTS",
  "FABLE_AWS_ALLOW_DEPLOY",
  "FABLE_AWS_ALLOW_PAID_RESOURCES",
  "FABLE_AWS_MAX_MONTHLY_COST_USD",
] as const;

export type AwsGateIntent = "experiment" | "deploy" | "paid_resource";

export type AwsGateRequest = {
  readonly intent: AwsGateIntent;
  readonly estimatedMonthlyCostUsd?: number;
  readonly mutatesAwsAccount?: boolean;
};

export type AwsGateEnvironment = Readonly<Record<string, string | undefined>>;

export type AwsGateValidation = {
  readonly allowed: boolean;
  readonly intent: AwsGateIntent;
  readonly estimatedMonthlyCostUsd: number;
  readonly maxMonthlyCostUsd: number;
  readonly experimentsAllowed: boolean;
  readonly deployAllowed: boolean;
  readonly paidResourcesAllowed: boolean;
  readonly blockers: readonly string[];
};

function parseBoolean(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

function parseNonNegativeNumber(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function costValue(value: number | undefined): number {
  if (value === undefined) return 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function validateAwsCostAndDeployGates(
  request: AwsGateRequest,
  env: AwsGateEnvironment = {}
): AwsGateValidation {
  const experimentsAllowed = parseBoolean(env.FABLE_AWS_ALLOW_EXPERIMENTS);
  const deployAllowed = parseBoolean(env.FABLE_AWS_ALLOW_DEPLOY);
  const paidResourcesAllowed = parseBoolean(env.FABLE_AWS_ALLOW_PAID_RESOURCES);
  const maxMonthlyCostUsd = parseNonNegativeNumber(env.FABLE_AWS_MAX_MONTHLY_COST_USD);
  const estimatedMonthlyCostUsd = costValue(request.estimatedMonthlyCostUsd);
  const blockers: string[] = [];

  if (!experimentsAllowed) blockers.push("FABLE_AWS_ALLOW_EXPERIMENTS is not enabled.");
  if (request.intent === "deploy" && !deployAllowed) {
    blockers.push("FABLE_AWS_ALLOW_DEPLOY is not enabled.");
  }
  if (request.intent === "paid_resource" && !paidResourcesAllowed) {
    blockers.push("FABLE_AWS_ALLOW_PAID_RESOURCES is not enabled.");
  }
  if (request.mutatesAwsAccount === true && !deployAllowed) {
    blockers.push("AWS account mutation requires FABLE_AWS_ALLOW_DEPLOY.");
  }
  if (estimatedMonthlyCostUsd > 0 && !paidResourcesAllowed) {
    blockers.push("Estimated paid usage requires FABLE_AWS_ALLOW_PAID_RESOURCES.");
  }
  if (estimatedMonthlyCostUsd > maxMonthlyCostUsd) {
    blockers.push("Estimated monthly cost exceeds FABLE_AWS_MAX_MONTHLY_COST_USD.");
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    deployAllowed,
    estimatedMonthlyCostUsd,
    experimentsAllowed,
    intent: request.intent,
    maxMonthlyCostUsd,
    paidResourcesAllowed,
  };
}
