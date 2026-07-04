import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import fixture from "@/__fixtures__/api-v1/durable-fixture-simulator.json";
import {
  buildApiV1DurableFixtureReportArchive,
  createApiV1MockTransactionalPersistenceStore,
  hashApiV1Key,
  parseApiV1Credential,
  runApiV1DurableAdapterConformanceSuite,
  simulateApiV1DurableFixtureScenario,
  type ApiV1DurableAdapterConformanceFixture,
  type ApiV1DurableFixtureReportArchive,
  type ApiV1DurableFixtureScenario,
  type ApiV1ShadowConsumerRecord,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const archivePath = path.join(repoRoot, "docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json");
const sourcePath = path.join(repoRoot, "apps/web/lib/api/v1/durable-fixture-report.ts");
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

function buildArchive(): ApiV1DurableFixtureReportArchive {
  const fixtureReport = simulateApiV1DurableFixtureScenario(fixture as ApiV1DurableFixtureScenario);
  const conformanceReport = runApiV1DurableAdapterConformanceSuite({
    adapterName: "mock_transactional_store",
    createStore: createApiV1MockTransactionalPersistenceStore,
    fixture: conformanceFixture(),
  });

  return buildApiV1DurableFixtureReportArchive({
    conformanceReport,
    fixtureReport,
    generatedAt: NOW,
  });
}

describe("API v1 durable fixture report archive", () => {
  it("builds a shadow-ready archive while keeping live promotion blocked", () => {
    const archive = buildArchive();

    expect(archive.status).toBe("shadow_report_ready");
    expect(archive.livePromotionAllowed).toBe(false);
    expect(archive.fixture).toMatchObject({
      fixtureId: "api-v1-durable-local-synthetic-v1",
      operationCount: 5,
      passed: true,
    });
    expect(archive.conformance).toMatchObject({
      adapterName: "mock_transactional_store",
      caseCount: 5,
      passed: true,
      requiredBehaviorCount: 7,
    });
    expect(archive.checklist.every((item) => item.passed)).toBe(true);
    expect(archive.checklist.find((item) => item.id === "live-promotion-blocked")).toMatchObject({
      livePromotionBlocker: true,
      passed: true,
    });
  });

  it("matches the tracked JSON archive exactly", () => {
    const archive = buildArchive();
    const tracked = JSON.parse(fs.readFileSync(archivePath, "utf8")) as ApiV1DurableFixtureReportArchive;

    expect(tracked).toEqual(archive);
  });

  it("turns blocked when simulator or conformance evidence fails", () => {
    const archive = buildApiV1DurableFixtureReportArchive({
      conformanceReport: {
        adapterName: "mock_transactional_store",
        cases: [],
        passed: false,
        requiredBehaviors: [],
      },
      fixtureReport: {
        boundary: {
          databaseTouched: false,
          executable: false,
          providerCalled: false,
          routeExposed: false,
        },
        cases: [],
        fixtureId: "bad-fixture",
        operationCount: 0,
        passed: false,
        warnings: [],
      },
      generatedAt: NOW,
    });

    expect(archive.status).toBe("blocked");
    expect(archive.checklist.filter((item) => !item.passed).map((item) => item.id)).toEqual([
      "fixture-simulator-passed",
      "durable-harness-conformance-passed",
      "fixture-operation-coverage-present",
    ]);
  });

  it("records the next proof required before any live route discussion", () => {
    const archive = buildArchive();

    expect(archive.promotionBlockers).toEqual(
      expect.arrayContaining([
        "Owner approval for live API use is not present in this archive.",
        "No Prisma schema edit or migration exists for API v1 durable tables.",
        "No API v1 route tree exists.",
        "No disposable database rollback rehearsal has been recorded.",
      ])
    );
    expect(archive.nextRequiredProof.join(" ")).toMatch(/disposable database adapter/);
    expect(archive.nextRequiredProof.join(" ")).toMatch(/rollback rehearsal/);
  });

  it("keeps the report builder free of live-storage and network hooks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("@prisma/client");
    expect(source).not.toContain("packages/db");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("app/api/v1");
  });
});
