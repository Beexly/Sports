import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import edgeFixture from "@/__fixtures__/api-v1/durable-fixture-edge-cases.json";
import fixture from "@/__fixtures__/api-v1/durable-fixture-simulator.json";
import {
  API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE,
  simulateApiV1DurableFixtureScenario,
  type ApiV1DurableFixtureScenario,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const sourcePath = path.join(repoRoot, "apps/web/lib/api/v1/durable-fixture-simulator.ts");
const apiV1RouteTree = path.join(repoRoot, "apps/web/app/api/v1");

const scenario = fixture as ApiV1DurableFixtureScenario;
const edgeScenario = edgeFixture as ApiV1DurableFixtureScenario;

describe("API v1 durable fixture simulator", () => {
  it("replays the local synthetic fixture against the dormant operation plans", () => {
    const report = simulateApiV1DurableFixtureScenario(scenario);

    expect(report.passed).toBe(true);
    expect(report.operationCount).toBe(5);
    expect(report.boundary).toEqual({
      databaseTouched: false,
      executable: false,
      providerCalled: false,
      routeExposed: false,
    });
    expect(report.cases.map((entry) => entry.passed)).toEqual([true, true, true, true, true]);
    expect(report.cases.map((entry) => entry.operation)).toEqual([
      "resolve_consumer",
      "put_consumer",
      "append_audit_event",
      "record_quota_and_audit",
      "record_quota_and_audit",
    ]);
  });

  it("keeps the fixture local, synthetic, route-free, provider-free, and database-free", () => {
    expect(scenario).toMatchObject({
      databaseTouched: false,
      fixtureId: "api-v1-durable-local-synthetic-v1",
      providerCalled: false,
      routeExposed: false,
      schemaVersion: "api-v1-durable-fixture-simulator-v1",
      source: "local_synthetic_fixture",
    });
    expect(fs.existsSync(apiV1RouteTree)).toBe(false);
  });

  it("replays edge-case fixtures for suspended, expired, quota-exhausted, and malformed-audit cases", () => {
    const report = simulateApiV1DurableFixtureScenario(edgeScenario);

    expect(report.passed).toBe(true);
    expect(report.fixtureId).toBe("api-v1-durable-edge-synthetic-v1");
    expect(report.operationCount).toBe(4);
    expect(report.cases.map((entry) => entry.id)).toEqual([
      "resolve-suspended-consumer",
      "resolve-expired-key",
      "record-quota-exhaustion-denial",
      "append-malformed-audit-chain-rollback",
    ]);
    expect(report.cases.every((entry) => entry.passed)).toBe(true);
  });

  it("detects read/write drift against the dormant interface", () => {
    const drifted: ApiV1DurableFixtureScenario = {
      ...scenario,
      operations: scenario.operations.map((operation) =>
        operation.id === "record-quota-and-audit-commit"
          ? {
              ...operation,
              observedWrites: ["api_v1_audit_events"],
            }
          : operation
      ),
    };
    const report = simulateApiV1DurableFixtureScenario(drifted);

    expect(report.passed).toBe(false);
    expect(report.cases.find((entry) => entry.id === "record-quota-and-audit-commit")?.blockers).toEqual(
      expect.arrayContaining([
        "record-quota-and-audit-commit observed writes do not match the dormant operation plan.",
      ])
    );
  });

  it("detects rollback leakage and bad rollback order", () => {
    const badRollback: ApiV1DurableFixtureScenario = {
      ...scenario,
      operations: scenario.operations.map((operation) =>
        operation.id === "record-quota-and-audit-rollback"
          ? {
              ...operation,
              after: {
                ...operation.after,
                api_v1_audit_events: operation.after.api_v1_audit_events + 1,
              },
              observedRollbackOrder: ["api_v1_quota_months", "api_v1_audit_events"],
            }
          : operation
      ),
    };
    const report = simulateApiV1DurableFixtureScenario(badRollback);

    expect(report.passed).toBe(false);
    expect(report.cases.find((entry) => entry.id === "record-quota-and-audit-rollback")?.blockers).toEqual(
      expect.arrayContaining([
        "record-quota-and-audit-rollback rollback order does not match the dormant operation plan.",
        "record-quota-and-audit-rollback leaked table-count changes after rollback.",
      ])
    );
  });

  it("detects boundary violations before operation replay is considered clean", () => {
    const badBoundary = {
      ...scenario,
      databaseTouched: true,
      providerCalled: true,
      routeExposed: true,
    } as unknown as ApiV1DurableFixtureScenario;
    const report = simulateApiV1DurableFixtureScenario(badBoundary);

    expect(report.passed).toBe(false);
    expect(report.cases[0]?.id).toBe("api-v1-durable-local-synthetic-v1:boundary");
    expect(report.cases[0]?.blockers).toEqual(
      expect.arrayContaining([
        "Fixture simulator must not expose an API v1 route.",
        "Fixture simulator must not touch a database.",
        "Fixture simulator must not call a provider.",
      ])
    );
  });

  it("detects drift in the underlying dormant interface", () => {
    const brokenInterface = {
      ...API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE,
      operations: API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.operations.filter(
        (operation) => operation.operation !== "append_audit_event"
      ),
    };
    const report = simulateApiV1DurableFixtureScenario(scenario, brokenInterface);

    expect(report.passed).toBe(false);
    expect(report.cases.find((entry) => entry.id.endsWith(":interface"))?.blockers).toEqual(
      expect.arrayContaining(["append_audit_event operation plan is required."])
    );
  });

  it("keeps simulator source free of live-storage and network hooks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("@prisma/client");
    expect(source).not.toContain("packages/db");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("app/api/v1");
  });
});
