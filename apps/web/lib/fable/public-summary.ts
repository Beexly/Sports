import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { evaluateAwsDecision } from "./aws-decision-engine";
import { validateAwsCostAndDeployGates } from "./aws-gates";
import { buildForensicDemoReport } from "./evidence/forensic-demo";
import {
  CLAIM_STATUSES,
  ClaimEvidenceLedgerSchema,
  type ClaimEvidenceEntry,
  type ForensicReportOutput,
} from "./evidence/schemas";
import {
  validateAwsDecisionEngineDefaults,
  validateAwsGateDefaults,
  validateClaimLedger,
  validateFableSourceRegistryEntries,
} from "./evidence/validators";
import { buildFableSourceRegistry, type FableSourceRegistryEntry } from "./source-registry";

type ClaimStatus = (typeof CLAIM_STATUSES)[number];
type RiskLevel = FableSourceRegistryEntry["risk_level"];

export type CountRow<Key extends string> = {
  readonly key: Key;
  readonly label: string;
  readonly count: number;
};

export type FablePublicSummary = {
  readonly generatedAt: string;
  readonly claimCount: number;
  readonly claimStatusCounts: readonly CountRow<ClaimStatus>[];
  readonly guardedClaimCount: number;
  readonly ownerDecisionClaimCount: number;
  readonly highRiskClaimCount: number;
  readonly sourceCount: number;
  readonly sourceRiskCounts: readonly CountRow<RiskLevel>[];
  readonly sourceOwnerDecisionCount: number;
  readonly sourceAwsStorageAllowedCount: number;
  readonly evidenceValidationOk: boolean;
  readonly validationIssueCount: number;
  readonly awsDeployDefaultAllowed: boolean;
  readonly awsPaidDefaultAllowed: boolean;
  readonly awsDecisionDefaultAllowed: boolean;
  readonly forensicDemo: ForensicReportOutput;
  readonly topOwnerGatedClaims: readonly Pick<
    ClaimEvidenceEntry,
    "claim_id" | "claim_type" | "status" | "next_action"
  >[];
};

const RISK_LABELS: Record<RiskLevel, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
  none: "None",
  unknown: "Unknown",
};

const STATUS_LABELS: Record<ClaimStatus, string> = {
  blocked: "Blocked",
  false: "False",
  "needs legal review": "Needs legal review",
  "needs owner decision": "Needs owner decision",
  "partially proven": "Partially proven",
  proven: "Proven",
  unsupported: "Unsupported",
};

const HIGH_RISK_CLAIM_TYPES = new Set<ClaimEvidenceEntry["claim_type"]>([
  "legal/data-source claim",
  "model-performance claim",
  "AWS capability claim",
  "AWS cost claim",
  "AWS security claim",
  "labeling/Ground Truth claim",
  "production-readiness claim",
  "competitive edge claim",
]);

function findRepoRoot(start = process.cwd()): string {
  const marker = join("docs", "fable", "evidence", "CLAIM_EVIDENCE_LEDGER.json");
  let current = resolve(start);

  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, marker))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return resolve(start);
}

function readJson(pathFromRoot: string, repoRoot: string): unknown {
  return JSON.parse(readFileSync(join(repoRoot, pathFromRoot), "utf8"));
}

function countByStatus(claims: readonly ClaimEvidenceEntry[]): readonly CountRow<ClaimStatus>[] {
  return CLAIM_STATUSES.map((status) => ({
    count: claims.filter((claim) => claim.status === status).length,
    key: status,
    label: STATUS_LABELS[status],
  }));
}

function countByRisk(sources: readonly FableSourceRegistryEntry[]): readonly CountRow<RiskLevel>[] {
  return (["none", "low", "medium", "high", "unknown"] as const).map((risk) => ({
    count: sources.filter((source) => source.risk_level === risk).length,
    key: risk,
    label: RISK_LABELS[risk],
  }));
}

export function loadFablePublicSummary(repoRoot = findRepoRoot()): FablePublicSummary {
  const ledgerRaw = readJson("docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.json", repoRoot);
  const ledger = ClaimEvidenceLedgerSchema.parse(ledgerRaw);
  const sourceRegistry = buildFableSourceRegistry();
  const forensicDemo = buildForensicDemoReport(
    readJson("docs/fable/demo/fixture-public-forensic.json", repoRoot)
  );

  const validationReports = [
    validateClaimLedger(ledgerRaw),
    validateFableSourceRegistryEntries(sourceRegistry),
    validateAwsGateDefaults(),
    validateAwsDecisionEngineDefaults(),
  ];
  const validationIssueCount = validationReports.reduce(
    (total, report) => total + report.issues.length,
    0
  );
  const deployDefault = validateAwsCostAndDeployGates({
    intent: "deploy",
    mutatesAwsAccount: true,
  });
  const paidDefault = validateAwsCostAndDeployGates({
    estimatedMonthlyCostUsd: 1,
    intent: "paid_resource",
  });
  const decisionDefault = evaluateAwsDecision({
    action: "paid_model_call",
    usesPaidService: true,
  });

  return {
    awsDecisionDefaultAllowed: decisionDefault.allowed,
    awsDeployDefaultAllowed: deployDefault.allowed,
    awsPaidDefaultAllowed: paidDefault.allowed,
    claimCount: ledger.claims.length,
    claimStatusCounts: countByStatus(ledger.claims),
    evidenceValidationOk: validationReports.every((report) => report.ok),
    forensicDemo,
    generatedAt: ledger.generated_at,
    guardedClaimCount: ledger.claims.filter((claim) =>
      claim.status === "blocked" || claim.status === "false" || claim.status === "unsupported"
    ).length,
    highRiskClaimCount: ledger.claims.filter((claim) => HIGH_RISK_CLAIM_TYPES.has(claim.claim_type)).length,
    ownerDecisionClaimCount: ledger.claims.filter((claim) => claim.owner_decision_needed).length,
    sourceAwsStorageAllowedCount: sourceRegistry.filter((source) => source.aws_storage_status === "allowed").length,
    sourceCount: sourceRegistry.length,
    sourceOwnerDecisionCount: sourceRegistry.filter((source) => source.owner_decision_needed).length,
    sourceRiskCounts: countByRisk(sourceRegistry),
    topOwnerGatedClaims: ledger.claims
      .filter((claim) => claim.owner_decision_needed)
      .slice(0, 4)
      .map((claim) => ({
        claim_id: claim.claim_id,
        claim_type: claim.claim_type,
        next_action: claim.next_action,
        status: claim.status,
      })),
    validationIssueCount,
  };
}
