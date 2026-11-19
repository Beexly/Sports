/**
 * Autonomous Workflow & Entity Governance Registry (`@sports/ops`).
 *
 * Keeps GSE (commercial high-frequency field lab) and GSI (biomedical/scientific
 * research division) entity metadata, workflow schedules, cost lanes, and hard
 * safety gates structured and machine-validated in one TypeScript module.
 *
 * NOTE: Public corporate identifiers only — never include personal emails,
 * street addresses, or personal phone numbers in runtime modules.
 */

export type AutonomousDomain = "gse" | "gsi" | "dual-use" | "platform";
export type CostLane = "free-local" | "ci-ubuntu" | "gcp-free-tier" | "openrouter-free";

export interface EntityGovernanceRecord {
  readonly operatingEntityName: string;
  readonly operatingEntityFilingId: string;
  readonly operatingJurisdiction: string;
  readonly nvidiaInceptionOrgId: string;
  readonly researchDivisionName: string;
  readonly researchDivisionFilingId: string;
  readonly researchDivisionStatus: string;
  readonly researchDivisionCureDeadline: string;
  readonly researchDivisionCureFeeUsd: number;
  readonly clinicalToSportsWeight: 0;
  readonly realMoneyStakeCleared: false;
}

export const ENTITY_GOVERNANCE_RECORD: EntityGovernanceRecord = {
  operatingEntityName: "GALAXY SPORTS NETWORK LLC",
  operatingEntityFilingId: "TX SOS #0806617184",
  operatingJurisdiction: "Kingwood, TX",
  nvidiaInceptionOrgId: "1086418431979798",
  researchDivisionName: "Galaxy Science Institute (GSI)",
  researchDivisionFilingId: "TX SOS #15043440630001",
  researchDivisionStatus: "NONPROFIT_CURE_PENDING_BEFORE_DEADLINE",
  researchDivisionCureDeadline: "2026-12-10",
  researchDivisionCureFeeUsd: 0,
  clinicalToSportsWeight: 0,
  realMoneyStakeCleared: false,
} as const;

export interface AutonomousWorkflowSpec {
  readonly id: string;
  readonly domain: AutonomousDomain;
  readonly workflowFile: string;
  readonly cadence: string;
  readonly costLane: CostLane;
  readonly maxPaidCostUsdPerRun: number;
  readonly failClosedGates: readonly string[];
  readonly autoPublishAllowed: false;
  readonly realMoneyStakeAllowed: false;
  readonly receiptPath: string;
}

export const AUTONOMOUS_WORKFLOW_REGISTRY: readonly AutonomousWorkflowSpec[] = [
  {
    id: "ci",
    domain: "platform",
    workflowFile: ".github/workflows/ci.yml",
    cadence: "push & pull_request",
    costLane: "ci-ubuntu",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["prisma-migrate-drift", "eslint-zero-warn", "tsc-noemit", "all-workspaces-test", "mind-node-test", "gap-closure-ledger"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "reconciliation/gap_closures.json",
  },
  {
    id: "gsi-frontier-bounds",
    domain: "gsi",
    workflowFile: ".github/workflows/gsi-frontier-bounds.yml",
    cadence: "push, pull_request & daily 14:35 UTC",
    costLane: "ci-ubuntu",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["cpp20-10of10-embedded", "static-sram-under-38400b", "dual-use-18of18", "ecosystem-consistency", "latex-submission-check"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "data/eval/gsi_upte_reproducible_benchmark_receipt_2026_11_19.json",
  },
  {
    id: "gse-site-wide-autonomous-fabric",
    domain: "dual-use",
    workflowFile: ".github/workflows/gse-site-wide-autonomous-fabric.yml",
    cadence: "cron 12 0,4,13,17,21 * * *",
    costLane: "openrouter-free",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["PUBLIC_PICKS_ENABLED=false", "DRAFT_ONLY_MODE=true", "REAL_MONEY_STAKE_CLEARED=false", "max-cost-usd=0.0"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "data/eval/ecosystem_consistency_receipt_2026_11_19.json",
  },
  {
    id: "gse-connected-5stage-gameday-orchestrator",
    domain: "gse",
    workflowFile: ".github/workflows/gse-connected-5stage-gameday-orchestrator.yml",
    cadence: "gameday schedule & workflow_dispatch",
    costLane: "free-local",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["stage1-injuries", "stage2-situational-80-rules", "stage3-jev-pbp", "stage4-cqr", "stage5-conjunction-pass"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "data/eval/w11_tnf_zero_surprise_preflight_receipt_2026_11_18.json",
  },
  {
    id: "daily-smoke",
    domain: "platform",
    workflowFile: ".github/workflows/daily-smoke.yml",
    cadence: "daily schedule",
    costLane: "ci-ubuntu",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["health-endpoints", "storefront-smoke"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "reports/smoke/latest.json",
  },
  {
    id: "external-cron",
    domain: "platform",
    workflowFile: ".github/workflows/external-cron.yml",
    cadence: "scheduled outside quiet window",
    costLane: "ci-ubuntu",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["bearer-cron-secret", "odds-api-governor-ceiling"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "data/eval/w11_tnf_zero_surprise_preflight_receipt_2026_11_18.json",
  },
  {
    id: "nova-convergence-inventory",
    domain: "platform",
    workflowFile: ".github/workflows/nova-convergence-inventory.yml",
    cadence: "push & schedule",
    costLane: "ci-ubuntu",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["nova-convergence-verify", "source-clearance-fail-closed"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "reports/nova/convergence/inventory.json",
  },
  {
    id: "gcp-path36-event-backbone",
    domain: "platform",
    workflowFile: "packages/ops/src/gcp-path36-runtime.ts",
    cadence: "event-driven scale-to-zero Cloud Run + Pub/Sub",
    costLane: "gcp-free-tier",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["scale-to-zero-only", "gke-deferred", "neon-primary-locked"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "docs/ops/GCP_PATH36_FOUNDATIONS_IMPLEMENTATION_RECORD_2026_11_19.md",
  },
  {
    id: "ecosystem-consistency-audit",
    domain: "dual-use",
    workflowFile: "scripts/ops/verify_ecosystem_consistency.py",
    cadence: "ci & pre-release gate",
    costLane: "free-local",
    maxPaidCostUsdPerRun: 0,
    failClosedGates: ["ledger-single-source", "zero-legacy-entity", "public-copy-clean", "safety-env-locked"],
    autoPublishAllowed: false,
    realMoneyStakeAllowed: false,
    receiptPath: "data/eval/ecosystem_consistency_receipt_2026_11_19.json",
  },
] as const;

export interface WorkflowRegistryValidationResult {
  readonly valid: boolean;
  readonly violations: readonly string[];
  readonly totalWorkflows: number;
}

export function validateAutonomousWorkflowRegistry(
  registry: readonly AutonomousWorkflowSpec[] = AUTONOMOUS_WORKFLOW_REGISTRY,
): WorkflowRegistryValidationResult {
  const violations: string[] = [];
  const seen = new Set<string>();

  for (const wf of registry) {
    if (seen.has(wf.id)) {
      violations.push(`Duplicate workflow id: ${wf.id}`);
    }
    seen.add(wf.id);
    if (wf.autoPublishAllowed !== false) {
      violations.push(`${wf.id}: autoPublishAllowed must be false`);
    }
    if (wf.realMoneyStakeAllowed !== false) {
      violations.push(`${wf.id}: realMoneyStakeAllowed must be false`);
    }
    if (wf.maxPaidCostUsdPerRun > 0) {
      violations.push(`${wf.id}: maxPaidCostUsdPerRun must remain 0 in autonomous registry`);
    }
    if (wf.failClosedGates.length === 0) {
      violations.push(`${wf.id}: failClosedGates must not be empty`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    totalWorkflows: registry.length,
  };
}

export function summarizeAutonomyCoverage(
  registry: readonly AutonomousWorkflowSpec[] = AUTONOMOUS_WORKFLOW_REGISTRY,
): {
  readonly total: number;
  readonly byDomain: Readonly<Record<AutonomousDomain, number>>;
  readonly allZeroPaidCost: boolean;
  readonly entity: EntityGovernanceRecord;
} {
  const byDomain: Record<AutonomousDomain, number> = {
    gse: 0,
    gsi: 0,
    "dual-use": 0,
    platform: 0,
  };
  for (const wf of registry) {
    byDomain[wf.domain] += 1;
  }
  return {
    total: registry.length,
    byDomain,
    allZeroPaidCost: registry.every((wf) => wf.maxPaidCostUsdPerRun === 0),
    entity: ENTITY_GOVERNANCE_RECORD,
  };
}
