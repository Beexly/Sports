import type { ApiV1PromotionGateId, ApiV1PromotionReadinessReport } from "./promotion-readiness";

export type ApiV1DisposableRehearsalPacketStatus = "blocked_by_readiness_matrix" | "owner_review_packet_ready";

export type ApiV1DisposableRehearsalPacketIntentId =
  | "record-owner-approval"
  | "prepare-disposable-target"
  | "review-future-schema-diff"
  | "seed-synthetic-fixture-data"
  | "run-durable-conformance"
  | "compare-fixture-report"
  | "capture-rollback-evidence"
  | "verify-post-rollback-cleanup";

export type ApiV1DisposableRehearsalPacketIntent = {
  readonly id: ApiV1DisposableRehearsalPacketIntentId;
  readonly executableNow: false;
  readonly purpose: string;
  readonly requiredBeforeExecution: readonly string[];
  readonly expectedEvidence: readonly string[];
  readonly forbiddenTargets: readonly string[];
};

export type ApiV1DisposableRehearsalPacketSection = {
  readonly id: "readiness" | "approval" | "target" | "evidence" | "rollback" | "post_rehearsal";
  readonly status: "ready" | "blocked";
  readonly summary: string;
  readonly requiredEvidence: readonly string[];
};

export type ApiV1DisposableRehearsalPacket = {
  readonly schemaVersion: "api-v1-disposable-rehearsal-packet-v1";
  readonly status: ApiV1DisposableRehearsalPacketStatus;
  readonly livePromotionAllowed: false;
  readonly commandsExecutableNow: false;
  readonly readinessStatus: ApiV1PromotionReadinessReport["status"];
  readonly blockedGateIds: readonly ApiV1PromotionGateId[];
  readonly blockers: readonly string[];
  readonly approvalBoundary: {
    readonly ownerApprovalRequired: true;
    readonly namedDisposableTargetRequired: true;
    readonly destroyByTimestampRequired: true;
    readonly rollbackEvidenceRequired: true;
    readonly rawKeyAbsenceProofRequired: true;
  };
  readonly sections: readonly ApiV1DisposableRehearsalPacketSection[];
  readonly commandIntents: readonly ApiV1DisposableRehearsalPacketIntent[];
  readonly nextActions: readonly string[];
};

const FORBIDDEN_TARGETS = [
  "production database",
  "shared staging database",
  "raw API key material",
  "partner billing or onboarding path",
  "provider account",
  "AWS account",
  "live API v1 route",
] as const;

function intent(input: {
  readonly id: ApiV1DisposableRehearsalPacketIntentId;
  readonly purpose: string;
  readonly requiredBeforeExecution: readonly string[];
  readonly expectedEvidence: readonly string[];
}): ApiV1DisposableRehearsalPacketIntent {
  return {
    executableNow: false,
    expectedEvidence: input.expectedEvidence,
    forbiddenTargets: FORBIDDEN_TARGETS,
    id: input.id,
    purpose: input.purpose,
    requiredBeforeExecution: input.requiredBeforeExecution,
  };
}

function packetStatus(readiness: ApiV1PromotionReadinessReport): ApiV1DisposableRehearsalPacketStatus {
  return readiness.status === "ready_for_disposable_rehearsal_review"
    ? "owner_review_packet_ready"
    : "blocked_by_readiness_matrix";
}

function readinessBlockedGateIds(readiness: ApiV1PromotionReadinessReport): readonly ApiV1PromotionGateId[] {
  return readiness.gates.filter((gate) => gate.status === "blocked").map((gate) => gate.id);
}

function sectionsFor(readiness: ApiV1PromotionReadinessReport): readonly ApiV1DisposableRehearsalPacketSection[] {
  const ready = readiness.status === "ready_for_disposable_rehearsal_review";
  const ownerReady = readiness.ownerApprovalComplete;
  const shadowReady = readiness.shadowEvidenceReady;

  return [
    {
      id: "readiness",
      requiredEvidence: ["promotion readiness matrix output", "passing shadow evidence gates", "passing repo boundary gates"],
      status: shadowReady ? "ready" : "blocked",
      summary: shadowReady
        ? "Shadow evidence and repo boundaries are ready for owner review."
        : "Shadow evidence or repo boundaries must be repaired before rehearsal review.",
    },
    {
      id: "approval",
      requiredEvidence: [
        "owner approval record",
        "approved rehearsal scope",
        "named disposable target",
        "destroy-by timestamp",
      ],
      status: ownerReady ? "ready" : "blocked",
      summary: ownerReady
        ? "Owner approval evidence is complete enough to review the rehearsal packet."
        : "Owner-only approval evidence is still missing.",
    },
    {
      id: "target",
      requiredEvidence: ["non-production target proof", "disposable target name", "destroy-by timestamp"],
      status: ready ? "ready" : "blocked",
      summary: ready
        ? "Target evidence can be reviewed, but this packet still does not execute commands."
        : "Target review is blocked until the readiness matrix reaches disposable rehearsal review.",
    },
    {
      id: "evidence",
      requiredEvidence: ["synthetic-only seed proof", "raw-key absence proof", "durable conformance report"],
      status: ready ? "ready" : "blocked",
      summary: ready
        ? "Evidence checklist is ready for a future disposable rehearsal ticket."
        : "Evidence checklist remains blocked until readiness and approvals are complete.",
    },
    {
      id: "rollback",
      requiredEvidence: ["pre-rollback row counts", "pre-rollback audit tip hash", "rollback transcript"],
      status: ready ? "ready" : "blocked",
      summary: ready
        ? "Rollback evidence requirements are explicit for reviewer signoff."
        : "Rollback evidence requirements are documented but not executable.",
    },
    {
      id: "post_rehearsal",
      requiredEvidence: ["post-rollback schema diff", "remaining API v1 table count", "focused API v1 test output"],
      status: ready ? "ready" : "blocked",
      summary: ready
        ? "Post-rehearsal cleanup proof is ready to attach to a future ticket."
        : "Post-rehearsal cleanup proof remains a future requirement.",
    },
  ];
}

function commandIntents(): readonly ApiV1DisposableRehearsalPacketIntent[] {
  return [
    intent({
      expectedEvidence: ["owner decision record", "scope-limited rehearsal ticket"],
      id: "record-owner-approval",
      purpose: "Record owner approval before any future disposable database rehearsal.",
      requiredBeforeExecution: ["owner approval", "named disposable target", "destroy-by timestamp"],
    }),
    intent({
      expectedEvidence: ["target name", "creation timestamp", "destroy-by timestamp"],
      id: "prepare-disposable-target",
      purpose: "Prepare a non-production disposable target for later review.",
      requiredBeforeExecution: ["owner approval", "proof target is not production"],
    }),
    intent({
      expectedEvidence: ["schema diff", "rollback review", "table dependency review"],
      id: "review-future-schema-diff",
      purpose: "Review future API v1 schema changes before any database action.",
      requiredBeforeExecution: ["future schema proposal", "rollback review"],
    }),
    intent({
      expectedEvidence: ["synthetic consumer count", "synthetic quota count", "synthetic audit count", "raw-key absence proof"],
      id: "seed-synthetic-fixture-data",
      purpose: "Seed only synthetic API v1 fixture rows in a future disposable target.",
      requiredBeforeExecution: ["synthetic-only seed proof", "raw-key absence proof"],
    }),
    intent({
      expectedEvidence: ["durable harness report", "adapter name", "case count"],
      id: "run-durable-conformance",
      purpose: "Run the durable adapter conformance suite against a future disposable adapter.",
      requiredBeforeExecution: ["disposable adapter proof", "passing local harness"],
    }),
    intent({
      expectedEvidence: ["fixture report archive", "operation count comparison", "blocker list"],
      id: "compare-fixture-report",
      purpose: "Compare future disposable adapter output to tracked local fixture evidence.",
      requiredBeforeExecution: ["tracked fixture report", "future disposable report"],
    }),
    intent({
      expectedEvidence: ["pre-rollback row counts", "pre-rollback audit tip hash", "rollback transcript"],
      id: "capture-rollback-evidence",
      purpose: "Capture rollback evidence on a future disposable target only.",
      requiredBeforeExecution: ["rollback plan review", "audit tip hash"],
    }),
    intent({
      expectedEvidence: ["post-rollback schema diff", "remaining API v1 table count", "focused API v1 test output"],
      id: "verify-post-rollback-cleanup",
      purpose: "Verify future rollback cleanup and rerun focused API v1 checks.",
      requiredBeforeExecution: ["rollback transcript", "post-rollback inspection"],
    }),
  ];
}

export function buildApiV1DisposableRehearsalPacket(
  readiness: ApiV1PromotionReadinessReport
): ApiV1DisposableRehearsalPacket {
  const blockedGateIds = readinessBlockedGateIds(readiness);
  const status = packetStatus(readiness);

  return {
    approvalBoundary: {
      destroyByTimestampRequired: true,
      namedDisposableTargetRequired: true,
      ownerApprovalRequired: true,
      rawKeyAbsenceProofRequired: true,
      rollbackEvidenceRequired: true,
    },
    blockedGateIds,
    blockers: readiness.blockers,
    commandIntents: commandIntents(),
    commandsExecutableNow: false,
    livePromotionAllowed: false,
    nextActions:
      status === "owner_review_packet_ready"
        ? ["Attach this packet to an owner-reviewed disposable rehearsal ticket; keep all commands non-executable until approval is explicit."]
        : readiness.nextActions,
    readinessStatus: readiness.status,
    schemaVersion: "api-v1-disposable-rehearsal-packet-v1",
    sections: sectionsFor(readiness),
    status,
  };
}
