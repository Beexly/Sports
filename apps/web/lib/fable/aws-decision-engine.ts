export const AWS_ACTION_TIERS = [
  "tier0_local_only",
  "tier1_local_validation",
  "tier2_read_only_discovery",
  "tier3_reversible_change",
  "tier4_cost_impacting_change",
  "tier5_destructive_production_security",
] as const;

export type AwsActionTier = (typeof AWS_ACTION_TIERS)[number];
export type AwsRiskLevel = "low" | "medium" | "high" | "critical";
export type AwsReversibility = "easy" | "planned" | "hard" | "destructive";

export type AwsActionKind =
  | "local_docs"
  | "local_validation"
  | "read_only_discovery"
  | "amplify_preview"
  | "deploy"
  | "paid_model_call"
  | "sagemaker_training"
  | "storage_or_partner_share"
  | "iam_change"
  | "dns_or_production_change"
  | "destructive_change";

export type AwsIamSignals = {
  readonly wildcardActions?: boolean;
  readonly wildcardResources?: boolean;
  readonly administratorAccess?: boolean;
  readonly broadPassRole?: boolean;
  readonly publicResource?: boolean;
};

export type AwsDecisionRequest = {
  readonly action: AwsActionKind;
  readonly userNeedClear?: boolean;
  readonly awsProfile?: string;
  readonly awsRegion?: string;
  readonly awsAccountId?: string;
  readonly estimatedMonthlyCostUsd?: number;
  readonly usesPaidService?: boolean;
  readonly mutatesAwsAccount?: boolean;
  readonly touchesProduction?: boolean;
  readonly touchesDns?: boolean;
  readonly destructive?: boolean;
  readonly storesDataInAws?: boolean;
  readonly sharesPartnerData?: boolean;
  readonly dataRightsKnown?: boolean;
  readonly hasDryRunCommand?: boolean;
  readonly hasRollbackPlan?: boolean;
  readonly hasCostSummary?: boolean;
  readonly hasOwnerApproval?: boolean;
  readonly hasFinalConfirmation?: boolean;
  readonly iam?: AwsIamSignals;
};

export type AwsDecisionEvaluation = {
  readonly actionTier: AwsActionTier;
  readonly blastRadius: AwsRiskLevel;
  readonly costRisk: AwsRiskLevel;
  readonly iamRisk: AwsRiskLevel;
  readonly dataRightsRisk: AwsRiskLevel;
  readonly productionRisk: AwsRiskLevel;
  readonly reversibility: AwsReversibility;
  readonly approvalRequired: boolean;
  readonly allowed: boolean;
  readonly allowedByDefault: boolean;
  readonly requiredDryRunCommand: boolean;
  readonly requiredRollbackField: boolean;
  readonly requiredOwnerDecision: boolean;
  readonly blockers: readonly string[];
};

function tierForAction(action: AwsActionKind): AwsActionTier {
  switch (action) {
    case "local_docs":
      return "tier0_local_only";
    case "local_validation":
    case "amplify_preview":
      return "tier1_local_validation";
    case "read_only_discovery":
      return "tier2_read_only_discovery";
    case "deploy":
    case "iam_change":
      return "tier3_reversible_change";
    case "paid_model_call":
    case "sagemaker_training":
    case "storage_or_partner_share":
      return "tier4_cost_impacting_change";
    case "dns_or_production_change":
    case "destructive_change":
      return "tier5_destructive_production_security";
    default:
      return assertNever(action);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled AWS action: ${String(value)}`);
}

function costValue(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : 0;
}

function maxRisk(risks: readonly AwsRiskLevel[]): AwsRiskLevel {
  const score: Record<AwsRiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };
  return risks.reduce<AwsRiskLevel>((highest, current) => (score[current] > score[highest] ? current : highest), "low");
}

function costRisk(request: AwsDecisionRequest): AwsRiskLevel {
  if (request.usesPaidService === true) return "high";
  const cost = costValue(request.estimatedMonthlyCostUsd);
  if (cost >= 100) return "high";
  if (cost > 0) return "medium";
  return "low";
}

function iamRisk(iam: AwsIamSignals | undefined): AwsRiskLevel {
  if (iam?.administratorAccess === true || iam?.broadPassRole === true || iam?.publicResource === true) {
    return "critical";
  }
  if (iam?.wildcardActions === true || iam?.wildcardResources === true) return "high";
  return "low";
}

function dataRightsRisk(request: AwsDecisionRequest): AwsRiskLevel {
  const movesData = request.storesDataInAws === true || request.sharesPartnerData === true;
  if (!movesData) return "low";
  if (request.dataRightsKnown !== true) return "critical";
  return request.sharesPartnerData === true ? "high" : "medium";
}

function productionRisk(request: AwsDecisionRequest): AwsRiskLevel {
  if (request.touchesDns === true || request.action === "dns_or_production_change") return "critical";
  if (request.touchesProduction === true) return "high";
  return "low";
}

function reversibility(request: AwsDecisionRequest, tier: AwsActionTier): AwsReversibility {
  if (request.destructive === true || tier === "tier5_destructive_production_security") return "destructive";
  if (tier === "tier4_cost_impacting_change") return "hard";
  if (tier === "tier3_reversible_change") return "planned";
  return "easy";
}

function needsApproval(tier: AwsActionTier): boolean {
  return tier === "tier3_reversible_change" || tier === "tier4_cost_impacting_change" || tier === "tier5_destructive_production_security";
}

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function buildBlockers(request: AwsDecisionRequest, tier: AwsActionTier): readonly string[] {
  const blockers: string[] = [];

  if (tier === "tier2_read_only_discovery") {
    if (request.userNeedClear !== true) blockers.push("Read-only AWS discovery requires a clear user need.");
    if (!hasText(request.awsProfile)) blockers.push("Read-only AWS discovery requires an explicit AWS profile.");
    if (!hasText(request.awsRegion)) blockers.push("Read-only AWS discovery requires an explicit AWS region.");
  }

  if (needsApproval(tier)) {
    if (!hasText(request.awsAccountId)) blockers.push("AWS change requires an account id.");
    if (!hasText(request.awsProfile)) blockers.push("AWS change requires a profile.");
    if (!hasText(request.awsRegion)) blockers.push("AWS change requires a region.");
    if (request.hasOwnerApproval !== true) blockers.push("AWS change requires owner approval.");
    if (request.hasFinalConfirmation !== true) blockers.push("AWS change requires final confirmation.");
    if (request.hasCostSummary !== true) blockers.push("AWS change requires a cost summary.");
    if (request.hasRollbackPlan !== true) blockers.push("AWS change requires a rollback plan.");
  }

  if (tier !== "tier0_local_only" && request.hasDryRunCommand !== true) {
    blockers.push("AWS action requires a dry-run, plan, synth, diff, or local validation command.");
  }
  if (request.usesPaidService === true) blockers.push("Paid AWS usage is blocked by default.");
  if (request.storesDataInAws === true && request.dataRightsKnown !== true) {
    blockers.push("AWS data storage requires known data rights.");
  }
  if (request.sharesPartnerData === true && request.dataRightsKnown !== true) {
    blockers.push("Partner data sharing requires known data rights.");
  }
  if (iamRisk(request.iam) === "critical" || iamRisk(request.iam) === "high") {
    blockers.push("IAM policy requires least-privilege review.");
  }
  if (productionRisk(request) === "critical") blockers.push("Production or DNS change is critical and blocked by default.");

  return blockers;
}

export function evaluateAwsDecision(request: AwsDecisionRequest): AwsDecisionEvaluation {
  const actionTier = tierForAction(request.action);
  const cost = costRisk(request);
  const iam = iamRisk(request.iam);
  const data = dataRightsRisk(request);
  const production = productionRisk(request);
  const blastRadius = maxRisk([cost, iam, data, production]);
  const approvalRequired = needsApproval(actionTier);
  const blockers = buildBlockers(request, actionTier);
  const allowedByDefault = actionTier === "tier0_local_only" || actionTier === "tier1_local_validation";

  return {
    actionTier,
    allowed: blockers.length === 0 && (allowedByDefault || approvalRequired || actionTier === "tier2_read_only_discovery"),
    allowedByDefault,
    approvalRequired,
    blastRadius,
    blockers,
    costRisk: cost,
    dataRightsRisk: data,
    iamRisk: iam,
    productionRisk: production,
    requiredDryRunCommand: actionTier !== "tier0_local_only",
    requiredOwnerDecision: approvalRequired,
    requiredRollbackField: approvalRequired,
    reversibility: reversibility(request, actionTier),
  };
}
