import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import fixture from "@/__fixtures__/api-v1/durable-fixture-simulator.json";
import {
  API_V1_DISPOSABLE_DB_REHEARSAL_PLAN,
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
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const apiV1SourceDir = path.join(repoRoot, "apps/web/lib/api/v1");
const sourcePath = path.join(apiV1SourceDir, "promotion-readiness.ts");
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

describe("API v1 promotion readiness matrix", () => {
  it("marks current shadow evidence ready while keeping owner approval gates blocked", () => {
    const report = evaluateApiV1PromotionReadiness({
      archive: buildArchive(),
      rehearsalValidation: cleanRehearsalValidation(),
      inspection: {
        migrationNames: migrationNames(),
        routeTreeExists: fs.existsSync(apiV1RouteTree),
        sourceText: fs.readFileSync(sourcePath, "utf8"),
      },
    });

    expect(report.schemaVersion).toBe("api-v1-promotion-readiness-v1");
    expect(report.status).toBe("owner_approval_required");
    expect(report.livePromotionAllowed).toBe(false);
    expect(report.shadowEvidenceReady).toBe(true);
    expect(report.ownerApprovalComplete).toBe(false);
    expect(report.gates.filter((entry) => entry.category !== "owner_approval").every((entry) => entry.status === "pass")).toBe(true);
    expect(report.gates.filter((entry) => entry.category === "owner_approval").map((entry) => entry.status)).toEqual([
      "blocked",
      "blocked",
      "blocked",
      "blocked",
      "blocked",
    ]);
    expect(report.nextActions).toContain(
      "Record owner-approved disposable rehearsal evidence before database-adjacent implementation."
    );
  });

  it("blocks accidental live route, model, migration, env, and provider surfaces", () => {
    const report = evaluateApiV1PromotionReadiness({
      archive: buildArchive(),
      rehearsalValidation: cleanRehearsalValidation(),
      inspection: {
        envFilesText: "API_V1_DATABASE_URL=postgres://example.invalid\n",
        migrationNames: ["20260704000000_api_v1_rehearsal"],
        prismaModelNames: ["ApiV1Consumer"],
        routeTreeExists: true,
        sourceText: 'import { PrismaClient } from "@prisma/client"; process.env.API_V1_DATABASE_URL; fetch("/");',
      },
    });

    expect(report.status).toBe("blocked");
    expect(report.shadowEvidenceReady).toBe(false);
    expect(report.gates.filter((entry) => entry.category === "repo_boundary" && entry.status === "blocked").map((entry) => entry.id)).toEqual([
      "route-tree-absent",
      "prisma-models-absent",
      "migration-absent",
      "env-vars-absent",
      "provider-hooks-absent",
    ]);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "API v1 route tree exists before promotion.",
        "API v1 Prisma models exist before promotion.",
        "API v1 migration exists before promotion.",
        "API v1 environment variables exist before promotion.",
        "API v1 source includes live storage, environment, or provider hooks.",
      ])
    );
  });

  it("blocks failed shadow evidence before owner approvals matter", () => {
    const report = evaluateApiV1PromotionReadiness({
      approvals: {
        destroyByTimestampRecorded: true,
        disposableTargetApproved: true,
        ownerApprovalRecorded: true,
        rawKeyAbsenceProofRecorded: true,
        rollbackEvidenceRecorded: true,
      },
      archive: buildArchive({
        conformance: {
          adapterName: "mock_transactional_store",
          caseCount: 0,
          passed: false,
          requiredBehaviorCount: 7,
        },
        status: "blocked",
      }),
      rehearsalValidation: cleanRehearsalValidation(),
    });

    expect(report.status).toBe("blocked");
    expect(report.ownerApprovalComplete).toBe(true);
    expect(report.gates.find((entry) => entry.id === "fixture-report-ready")?.status).toBe("blocked");
    expect(report.gates.find((entry) => entry.id === "durable-conformance-ready")?.status).toBe("blocked");
    expect(report.nextActions).toContain("Repair local shadow evidence before any disposable database rehearsal is discussed.");
  });

  it("can become ready for disposable rehearsal review without allowing live promotion", () => {
    const report = evaluateApiV1PromotionReadiness({
      approvals: {
        destroyByTimestampRecorded: true,
        disposableTargetApproved: true,
        ownerApprovalRecorded: true,
        rawKeyAbsenceProofRecorded: true,
        rollbackEvidenceRecorded: true,
      },
      archive: buildArchive(),
      rehearsalValidation: cleanRehearsalValidation(),
    });

    expect(report.status).toBe("ready_for_disposable_rehearsal_review");
    expect(report.livePromotionAllowed).toBe(false);
    expect(report.ownerApprovalComplete).toBe(true);
    expect(report.nextActions).toEqual([
      "Prepare a reviewer packet for a disposable database rehearsal; live API promotion remains separately blocked.",
    ]);
  });

  it("keeps the readiness evaluator source free of live-storage and network hooks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("@prisma/client");
    expect(source).not.toContain("packages/db");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("app/api/v1");
  });
});
