import type { ApiV1DurableFixtureReportArchive } from "./durable-fixture-report";
import type { ApiV1DisposableDbRehearsalValidation } from "./durable-rehearsal-plan";

export type ApiV1PromotionReadinessStatus =
  | "blocked"
  | "owner_approval_required"
  | "ready_for_disposable_rehearsal_review";

export type ApiV1PromotionGateStatus = "pass" | "blocked";

export type ApiV1PromotionGateId =
  | "fixture-report-ready"
  | "durable-conformance-ready"
  | "live-promotion-disabled"
  | "rehearsal-plan-clean"
  | "route-tree-absent"
  | "prisma-models-absent"
  | "migration-absent"
  | "env-vars-absent"
  | "provider-hooks-absent"
  | "owner-approval-recorded"
  | "disposable-target-approved"
  | "destroy-by-timestamp-recorded"
  | "rollback-evidence-recorded"
  | "raw-key-absence-proof-recorded";

export type ApiV1PromotionGate = {
  readonly id: ApiV1PromotionGateId;
  readonly status: ApiV1PromotionGateStatus;
  readonly category: "shadow_evidence" | "repo_boundary" | "owner_approval";
  readonly evidence: string;
  readonly blocker?: string;
};

export type ApiV1PromotionApprovalEvidence = {
  readonly ownerApprovalRecorded: boolean;
  readonly disposableTargetApproved: boolean;
  readonly destroyByTimestampRecorded: boolean;
  readonly rollbackEvidenceRecorded: boolean;
  readonly rawKeyAbsenceProofRecorded: boolean;
};

export type ApiV1PromotionReadinessInspection = {
  readonly routeTreeExists?: boolean;
  readonly prismaModelNames?: readonly string[];
  readonly migrationNames?: readonly string[];
  readonly envFilesText?: string;
  readonly sourceText?: string;
};

export type ApiV1PromotionReadinessInput = {
  readonly archive: ApiV1DurableFixtureReportArchive;
  readonly rehearsalValidation: ApiV1DisposableDbRehearsalValidation;
  readonly approvals?: Partial<ApiV1PromotionApprovalEvidence>;
  readonly inspection?: ApiV1PromotionReadinessInspection;
};

export type ApiV1PromotionReadinessReport = {
  readonly schemaVersion: "api-v1-promotion-readiness-v1";
  readonly status: ApiV1PromotionReadinessStatus;
  readonly livePromotionAllowed: false;
  readonly gates: readonly ApiV1PromotionGate[];
  readonly blockers: readonly string[];
  readonly nextActions: readonly string[];
  readonly shadowEvidenceReady: boolean;
  readonly ownerApprovalComplete: boolean;
};

const API_V1_MODEL_PATTERN = /^ApiV1/i;
const API_V1_ENV_PATTERN = /^(GSE_API_KEY|GSE_API_V1_|API_V1_)/im;
const PROVIDER_HOOK_FRAGMENTS = [
  ["@prisma", "client"].join("/"),
  ["packages", "db"].join("/"),
  ["process", "env"].join("."),
  ["fetch", "("].join(""),
] as const;

const DEFAULT_APPROVALS: ApiV1PromotionApprovalEvidence = {
  destroyByTimestampRecorded: false,
  disposableTargetApproved: false,
  ownerApprovalRecorded: false,
  rawKeyAbsenceProofRecorded: false,
  rollbackEvidenceRecorded: false,
};

function gate(input: {
  readonly id: ApiV1PromotionGateId;
  readonly category: ApiV1PromotionGate["category"];
  readonly passed: boolean;
  readonly evidence: string;
  readonly blocker: string;
}): ApiV1PromotionGate {
  return input.passed
    ? {
        category: input.category,
        evidence: input.evidence,
        id: input.id,
        status: "pass",
      }
    : {
        blocker: input.blocker,
        category: input.category,
        evidence: input.evidence,
        id: input.id,
        status: "blocked",
      };
}

function sourceHasProviderHooks(sourceText: string | undefined): boolean {
  if (sourceText === undefined) return false;
  return PROVIDER_HOOK_FRAGMENTS.some((fragment) => sourceText.includes(fragment));
}

function approvalEvidence(
  approvals: Partial<ApiV1PromotionApprovalEvidence> | undefined
): ApiV1PromotionApprovalEvidence {
  return {
    ...DEFAULT_APPROVALS,
    ...approvals,
  };
}

function nextActionsFor(gates: readonly ApiV1PromotionGate[]): readonly string[] {
  const blocked = new Set(gates.filter((entry) => entry.status === "blocked").map((entry) => entry.id));
  const actions: string[] = [];

  if (
    blocked.has("fixture-report-ready") ||
    blocked.has("durable-conformance-ready") ||
    blocked.has("rehearsal-plan-clean")
  ) {
    actions.push("Repair local shadow evidence before any disposable database rehearsal is discussed.");
  }
  if (
    blocked.has("route-tree-absent") ||
    blocked.has("prisma-models-absent") ||
    blocked.has("migration-absent") ||
    blocked.has("env-vars-absent") ||
    blocked.has("provider-hooks-absent")
  ) {
    actions.push("Remove accidental live API v1 surfaces or keep this work on a proposal-only branch.");
  }
  if (
    blocked.has("owner-approval-recorded") ||
    blocked.has("disposable-target-approved") ||
    blocked.has("destroy-by-timestamp-recorded") ||
    blocked.has("rollback-evidence-recorded") ||
    blocked.has("raw-key-absence-proof-recorded")
  ) {
    actions.push("Record owner-approved disposable rehearsal evidence before database-adjacent implementation.");
  }
  if (actions.length === 0) {
    actions.push("Prepare a reviewer packet for a disposable database rehearsal; live API promotion remains separately blocked.");
  }

  return actions;
}

export function evaluateApiV1PromotionReadiness(
  input: ApiV1PromotionReadinessInput
): ApiV1PromotionReadinessReport {
  const { archive, rehearsalValidation } = input;
  const inspection = input.inspection ?? {};
  const approvals = approvalEvidence(input.approvals);
  const prismaModelNames = inspection.prismaModelNames ?? [];
  const migrationNames = inspection.migrationNames ?? [];
  const hasApiV1EnvVars = inspection.envFilesText === undefined ? false : API_V1_ENV_PATTERN.test(inspection.envFilesText);
  const hasProviderHooks = sourceHasProviderHooks(inspection.sourceText);

  const gates: readonly ApiV1PromotionGate[] = [
    gate({
      blocker: "Tracked durable fixture report is not shadow-ready.",
      category: "shadow_evidence",
      evidence: `archive.status=${archive.status}; fixture.passed=${archive.fixture.passed}.`,
      id: "fixture-report-ready",
      passed: archive.status === "shadow_report_ready" && archive.fixture.passed,
    }),
    gate({
      blocker: "Durable conformance report is not passing.",
      category: "shadow_evidence",
      evidence: `conformance.passed=${archive.conformance.passed}; caseCount=${archive.conformance.caseCount}.`,
      id: "durable-conformance-ready",
      passed: archive.conformance.passed,
    }),
    gate({
      blocker: "Live promotion flag must remain disabled in this branch.",
      category: "shadow_evidence",
      evidence: `archive.livePromotionAllowed=${String(archive.livePromotionAllowed)}.`,
      id: "live-promotion-disabled",
      passed: archive.livePromotionAllowed === false,
    }),
    gate({
      blocker: "Disposable database rehearsal plan validation has blockers.",
      category: "shadow_evidence",
      evidence: `rehearsalValidation.ok=${rehearsalValidation.ok}; checkedSteps=${rehearsalValidation.checkedSteps.length}.`,
      id: "rehearsal-plan-clean",
      passed: rehearsalValidation.ok,
    }),
    gate({
      blocker: "API v1 route tree exists before promotion.",
      category: "repo_boundary",
      evidence: `routeTreeExists=${String(inspection.routeTreeExists ?? false)}.`,
      id: "route-tree-absent",
      passed: inspection.routeTreeExists !== true,
    }),
    gate({
      blocker: "API v1 Prisma models exist before promotion.",
      category: "repo_boundary",
      evidence: `apiV1ModelCount=${prismaModelNames.filter((name) => API_V1_MODEL_PATTERN.test(name)).length}.`,
      id: "prisma-models-absent",
      passed: prismaModelNames.every((name) => !API_V1_MODEL_PATTERN.test(name)),
    }),
    gate({
      blocker: "API v1 migration exists before promotion.",
      category: "repo_boundary",
      evidence: `apiV1MigrationCount=${migrationNames.filter((name) => /api[_-]?v1/i.test(name)).length}.`,
      id: "migration-absent",
      passed: migrationNames.every((name) => !/api[_-]?v1/i.test(name)),
    }),
    gate({
      blocker: "API v1 environment variables exist before promotion.",
      category: "repo_boundary",
      evidence: `apiV1EnvVarsPresent=${String(hasApiV1EnvVars)}.`,
      id: "env-vars-absent",
      passed: !hasApiV1EnvVars,
    }),
    gate({
      blocker: "API v1 source includes live storage, environment, or provider hooks.",
      category: "repo_boundary",
      evidence: `providerHooksPresent=${String(hasProviderHooks)}.`,
      id: "provider-hooks-absent",
      passed: !hasProviderHooks,
    }),
    gate({
      blocker: "Owner approval record is missing.",
      category: "owner_approval",
      evidence: `ownerApprovalRecorded=${String(approvals.ownerApprovalRecorded)}.`,
      id: "owner-approval-recorded",
      passed: approvals.ownerApprovalRecorded,
    }),
    gate({
      blocker: "Disposable target approval is missing.",
      category: "owner_approval",
      evidence: `disposableTargetApproved=${String(approvals.disposableTargetApproved)}.`,
      id: "disposable-target-approved",
      passed: approvals.disposableTargetApproved,
    }),
    gate({
      blocker: "Destroy-by timestamp record is missing.",
      category: "owner_approval",
      evidence: `destroyByTimestampRecorded=${String(approvals.destroyByTimestampRecorded)}.`,
      id: "destroy-by-timestamp-recorded",
      passed: approvals.destroyByTimestampRecorded,
    }),
    gate({
      blocker: "Rollback evidence record is missing.",
      category: "owner_approval",
      evidence: `rollbackEvidenceRecorded=${String(approvals.rollbackEvidenceRecorded)}.`,
      id: "rollback-evidence-recorded",
      passed: approvals.rollbackEvidenceRecorded,
    }),
    gate({
      blocker: "Raw-key absence proof is missing.",
      category: "owner_approval",
      evidence: `rawKeyAbsenceProofRecorded=${String(approvals.rawKeyAbsenceProofRecorded)}.`,
      id: "raw-key-absence-proof-recorded",
      passed: approvals.rawKeyAbsenceProofRecorded,
    }),
  ];

  const blockers = gates.flatMap((entry) => (entry.status === "blocked" ? [entry.blocker ?? `${entry.id} blocked.`] : []));
  const shadowEvidenceReady = gates
    .filter((entry) => entry.category !== "owner_approval")
    .every((entry) => entry.status === "pass");
  const ownerApprovalComplete = gates
    .filter((entry) => entry.category === "owner_approval")
    .every((entry) => entry.status === "pass");
  const status: ApiV1PromotionReadinessStatus = !shadowEvidenceReady
    ? "blocked"
    : ownerApprovalComplete
      ? "ready_for_disposable_rehearsal_review"
      : "owner_approval_required";

  return {
    blockers,
    gates,
    livePromotionAllowed: false,
    nextActions: nextActionsFor(gates),
    ownerApprovalComplete,
    schemaVersion: "api-v1-promotion-readiness-v1",
    shadowEvidenceReady,
    status,
  };
}
