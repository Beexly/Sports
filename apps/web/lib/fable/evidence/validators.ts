import { validateAwsCostAndDeployGates } from "../aws-gates";
import type { FableSourceRegistryEntry } from "../source-registry";
import { ClaimEvidenceLedgerSchema, type ClaimEvidenceLedger } from "./schemas";

export type EvidenceValidationIssue = {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: "error" | "warning";
};

export type EvidenceValidationReport = {
  readonly ok: boolean;
  readonly issues: readonly EvidenceValidationIssue[];
};

const HIGH_RISK_CLAIM_TYPES: readonly string[] = [
  "legal/data-source claim",
  "model-performance claim",
  "AWS capability claim",
  "AWS cost claim",
  "AWS security claim",
  "labeling/Ground Truth claim",
  "production-readiness claim",
  "competitive edge claim",
] as const;

const REQUIRED_INDEX_LINKS = [
  "docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.md",
  "docs/fable/REPO_REALITY_MAP.md",
  "docs/fable/VALIDATION_REPORT.md",
  "docs/fable/aws/AWS_SERVICE_SCORECARD.md",
  "docs/fable/DATA_LEGAL_BOUNDARIES.md",
  "docs/fable/TESTING_GUIDE.md",
  "docs/fable/CODEX_FINAL_REPORT.md",
  "docs/fable/CLAUDE_HANDOFF.md",
] as const;

function error(code: string, path: string, message: string): EvidenceValidationIssue {
  return { code, message, path, severity: "error" };
}

function report(issues: readonly EvidenceValidationIssue[]): EvidenceValidationReport {
  return { issues, ok: issues.length === 0 };
}

export function validateClaimLedger(raw: unknown): EvidenceValidationReport {
  const parsed = ClaimEvidenceLedgerSchema.safeParse(raw);
  if (!parsed.success) {
    return report([
      error("ledger-schema", "docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.json", parsed.error.message),
    ]);
  }

  return validateParsedClaimLedger(parsed.data);
}

function validateParsedClaimLedger(ledger: ClaimEvidenceLedger): EvidenceValidationReport {
  const issues: EvidenceValidationIssue[] = [];

  ledger.claims.forEach((claim, index) => {
    const path = `claims.${index}.${claim.claim_id}`;
    if (HIGH_RISK_CLAIM_TYPES.includes(claim.claim_type) && claim.status.length === 0) {
      issues.push(error("high-risk-status", path, "High-risk claim has no status."));
    }
    if (claim.status === "proven" && claim.evidence_files.length === 0) {
      issues.push(error("proven-without-evidence", path, "Proven claim needs evidence_files."));
    }
    if (claim.status === "proven" && claim.claim_type === "legal/data-source claim") {
      const hasRightsEvidence = claim.evidence_files.some((filePath) =>
        filePath.includes("source-rights-registry") || filePath.includes("DATA_LEGAL_BOUNDARIES")
      );
      if (!hasRightsEvidence && claim.legal_review_marker === undefined) {
        issues.push(error("legal-proven-without-marker", path, "Legal claim needs source-rights evidence or legal marker."));
      }
    }
  });

  return report(issues);
}

export function validateFableSourceRegistryEntries(
  entries: readonly FableSourceRegistryEntry[]
): EvidenceValidationReport {
  const issues: EvidenceValidationIssue[] = [];

  entries.forEach((entry) => {
    const path = `source.${entry.source_id}`;
    if (entry.last_reviewed.trim().length === 0) {
      issues.push(error("source-last-reviewed", path, "Source entry must include last_reviewed."));
    }
    if (entry.commercial_use_status === "unknown" || entry.storage_status === "unknown") {
      issues.push(error("source-unknown-allowed", path, "Unknown use status cannot be treated as allowed."));
    }
    if (entry.redistribution_status === "allowed" && entry.commercial_use_status !== "allowed") {
      issues.push(error("source-redistribution", path, "Redistribution cannot exceed commercial-use status."));
    }
  });

  return report(issues);
}

export function validateAwsGateDefaults(): EvidenceValidationReport {
  const deploy = validateAwsCostAndDeployGates({ intent: "deploy", mutatesAwsAccount: true });
  const paid = validateAwsCostAndDeployGates({ estimatedMonthlyCostUsd: 1, intent: "paid_resource" });
  const issues: EvidenceValidationIssue[] = [];

  if (deploy.allowed) issues.push(error("aws-deploy-default", "aws.deploy", "Deploy must default off."));
  if (paid.allowed) issues.push(error("aws-paid-default", "aws.paid", "Paid resources must default off."));
  if (!paid.blockers.includes("Estimated monthly cost exceeds FABLE_AWS_MAX_MONTHLY_COST_USD.")) {
    issues.push(error("aws-spend-ceiling", "aws.cost", "Missing spend ceiling must block paid estimates."));
  }

  return report(issues);
}

export function validateGithubVisibility(indexText: string, rootReadmeText: string): EvidenceValidationReport {
  const issues: EvidenceValidationIssue[] = [];

  if (!rootReadmeText.includes("docs/fable/README.md")) {
    issues.push(error("root-readme-fable-link", "README.md", "Root README must link to docs/fable/README.md."));
  }
  REQUIRED_INDEX_LINKS.forEach((docPath) => {
    if (!indexText.includes(docPath)) {
      issues.push(error("fable-index-link", "docs/fable/INDEX.md", `Missing ${docPath}.`));
    }
  });

  return report(issues);
}
