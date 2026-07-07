import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import fixture from "@/__fixtures__/api-v1/durable-fixture-simulator.json";
import {
  API_V1_DISPOSABLE_DB_REHEARSAL_PLAN,
  buildApiV1DisposableRehearsalPacket,
  buildApiV1DurableFixtureReportArchive,
  createApiV1MockTransactionalPersistenceStore,
  evaluateApiV1PromotionReadiness,
  hashApiV1Key,
  parseApiV1Credential,
  runApiV1DurableAdapterConformanceSuite,
  simulateApiV1DurableFixtureScenario,
  validateApiV1DisposableDbRehearsalPlan,
  type ApiV1DurableAdapterConformanceFixture,
  type ApiV1DurableFixtureReportArchive,
  type ApiV1DurableFixtureScenario,
  type ApiV1PromotionApprovalEvidence,
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const apiV1SourceDir = path.join(repoRoot, "apps/web/lib/api/v1");
const sourcePath = path.join(apiV1SourceDir, "disposable-rehearsal-packet.ts");
const apiV1RouteTree = path.join(repoRoot, "apps/web/app/api/v1");
const migrationsDir = path.join(repoRoot, "packages/db/prisma/migrations");
const RAW_KEY = "gse_v1_shadow_ABCDEFGHIJKLMNOP";
const OTHER_KEY = "gse_v1_shadow_QRSTUVWXYZabcdef";
const NOW = "2026-07-04T00:00:00.000Z";

function consumer(overrides: Partial<ApiV1ShadowConsumerRecord> = {}): ApiV1ShadowConsumerRecord {
  return {
    active: true,
    allowedOrigins: ["partner.gse.test"],
    consumerId: "consumer_1",
    displayName: "Partner Shadow Consumer",
    expiresAt: "2026-12-31T00:00:00.000Z",
    issuedAt: "2026-07-01T00:00:00.000Z",
    keyHash: hashApiV1Key(RAW_KEY),
    keyId: "gse_v1_shadow_consumer_1",
    monthlyQuota: 3,
    notes: "Local shadow contract only.",
    ownerApprovedForLiveUse: false,
    rotateAfter: "2026-08-01T00:00:00.000Z",
    scopes: ["evidence:read"],
    status: "shadow_active",
    usedThisMonth: 1,
    ...overrides,
  };
}

function conformanceFixture(): ApiV1DurableAdapterConformanceFixture {
  return {
    consumer: consumer(),
    invalidCredential: parseApiV1Credential({ authorization: `Bearer ${OTHER_KEY}` }),
    now: NOW,
    validCredential: parseApiV1Credential({ authorization: `Bearer ${RAW_KEY}` }),
  };
}

function buildArchive(overrides: Partial<ApiV1DurableFixtureReportArchive> = {}): ApiV1DurableFixtureReportArchive {
  const fixtureReport = simulateApiV1DurableFixtureScenario(fixture as ApiV1DurableFixtureScenario);
  const conformanceReport = runApiV1DurableAdapterConformanceSuite({
    adapterName: "mock_transactional_store",
    createStore: createApiV1MockTransactionalPersistenceStore,
    fixture: conformanceFixture(),
  });

  return {
    ...buildApiV1DurableFixtureReportArchive({
      conformanceReport,
      fixtureReport,
      generatedAt: NOW,
    }),
    ...overrides,
  };
}

function migrationNames(): string[] {
  return fs.readdirSync(migrationsDir).filter((entry) => {
    const migrationPath = path.join(migrationsDir, entry, "migration.sql");
    return fs.existsSync(migrationPath);
  });
}

function cleanRehearsalValidation() {
  return validateApiV1DisposableDbRehearsalPlan(API_V1_DISPOSABLE_DB_REHEARSAL_PLAN, {
    migrationNames: migrationNames(),
    routeTreeExists: fs.existsSync(apiV1RouteTree),
    sourceText: fs.readFileSync(path.join(apiV1SourceDir, "durable-rehearsal-plan.ts"), "utf8"),
  });
}

function readyApprovals(): ApiV1PromotionApprovalEvidence {
  return {
    destroyByTimestampRecorded: true,
    disposableTargetApproved: true,
    ownerApprovalRecorded: true,
    rawKeyAbsenceProofRecorded: true,
    rollbackEvidenceRecorded: true,
  };
}

describe("API v1 disposable rehearsal packet", () => {
  it("blocks the current repo state on missing owner approval evidence", () => {
    const readiness = evaluateApiV1PromotionReadiness({
      archive: buildArchive(),
      rehearsalValidation: cleanRehearsalValidation(),
      inspection: {
        migrationNames: migrationNames(),
        routeTreeExists: fs.existsSync(apiV1RouteTree),
      },
    });
    const packet = buildApiV1DisposableRehearsalPacket(readiness);

    expect(packet.schemaVersion).toBe("api-v1-disposable-rehearsal-packet-v1");
    expect(packet.status).toBe("blocked_by_readiness_matrix");
    expect(packet.readinessStatus).toBe("owner_approval_required");
    expect(packet.livePromotionAllowed).toBe(false);
    expect(packet.commandsExecutableNow).toBe(false);
    expect(packet.blockedGateIds).toEqual([
      "owner-approval-recorded",
      "disposable-target-approved",
      "destroy-by-timestamp-recorded",
      "rollback-evidence-recorded",
      "raw-key-absence-proof-recorded",
    ]);
    expect(packet.sections.find((section) => section.id === "approval")?.status).toBe("blocked");
    expect(packet.commandIntents.every((intent) => intent.executableNow === false)).toBe(true);
  });

  it("becomes owner-review-ready only after simulated approval evidence is complete", () => {
    const readiness = evaluateApiV1PromotionReadiness({
      approvals: readyApprovals(),
      archive: buildArchive(),
      rehearsalValidation: cleanRehearsalValidation(),
    });
    const packet = buildApiV1DisposableRehearsalPacket(readiness);

    expect(packet.status).toBe("owner_review_packet_ready");
    expect(packet.readinessStatus).toBe("ready_for_disposable_rehearsal_review");
    expect(packet.livePromotionAllowed).toBe(false);
    expect(packet.commandsExecutableNow).toBe(false);
    expect(packet.blockedGateIds).toEqual([]);
    expect(packet.sections.map((section) => section.status)).toEqual(["ready", "ready", "ready", "ready", "ready", "ready"]);
    expect(packet.nextActions).toEqual([
      "Attach this packet to an owner-reviewed disposable rehearsal ticket; keep all commands non-executable until approval is explicit.",
    ]);
  });

  it("carries shadow-evidence blockers forward when the readiness matrix fails", () => {
    const readiness = evaluateApiV1PromotionReadiness({
      approvals: readyApprovals(),
      archive: buildArchive({ status: "blocked" }),
      rehearsalValidation: cleanRehearsalValidation(),
    });
    const packet = buildApiV1DisposableRehearsalPacket(readiness);

    expect(packet.status).toBe("blocked_by_readiness_matrix");
    expect(packet.blockedGateIds).toContain("fixture-report-ready");
    expect(packet.blockers).toContain("Tracked durable fixture report is not shadow-ready.");
    expect(packet.sections.find((section) => section.id === "readiness")?.status).toBe("blocked");
  });

  it("defines evidence requirements without executable commands or forbidden targets", () => {
    const readiness = evaluateApiV1PromotionReadiness({
      approvals: readyApprovals(),
      archive: buildArchive(),
      rehearsalValidation: cleanRehearsalValidation(),
    });
    const packet = buildApiV1DisposableRehearsalPacket(readiness);

    expect(packet.approvalBoundary).toEqual({
      destroyByTimestampRequired: true,
      namedDisposableTargetRequired: true,
      ownerApprovalRequired: true,
      rawKeyAbsenceProofRequired: true,
      rollbackEvidenceRequired: true,
    });
    expect(packet.commandIntents.map((intent) => intent.id)).toEqual([
      "record-owner-approval",
      "prepare-disposable-target",
      "review-future-schema-diff",
      "seed-synthetic-fixture-data",
      "run-durable-conformance",
      "compare-fixture-report",
      "capture-rollback-evidence",
      "verify-post-rollback-cleanup",
    ]);
    expect(packet.commandIntents.flatMap((intent) => intent.expectedEvidence)).toEqual(
      expect.arrayContaining(["raw-key absence proof", "pre-rollback audit tip hash", "focused API v1 test output"])
    );
    expect(packet.commandIntents.flatMap((intent) => intent.forbiddenTargets)).toEqual(
      expect.arrayContaining(["production database", "raw API key material", "AWS account", "live API v1 route"])
    );
  });

  it("keeps the packet builder source free of live-storage and network hooks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("@prisma/client");
    expect(source).not.toContain("packages/db");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("app/api/v1");
  });
});
