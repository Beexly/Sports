import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  API_V1_DATABASE_SCHEMA_PROPOSAL,
  API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE,
  buildApiV1DormantDurableAdapterDryRun,
  validateApiV1DormantDurableAdapterInterface,
  type ApiV1DormantDurableAdapterInterface,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const apiV1RouteTree = path.join(repoRoot, "apps/web/app/api/v1");
const migrationsDir = path.join(repoRoot, "packages/db/prisma/migrations");
const prismaSchemaPath = path.join(repoRoot, "packages/db/prisma/schema.prisma");
const sourcePath = path.join(repoRoot, "apps/web/lib/api/v1/dormant-durable-adapter-interface.ts");

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function migrationNames(): string[] {
  return fs.readdirSync(migrationsDir).filter((entry) => {
    const migrationPath = path.join(migrationsDir, entry, "migration.sql");
    return fs.existsSync(migrationPath);
  });
}

function operation(name: string) {
  const found = API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.operations.find((plan) => plan.operation === name);
  if (found === undefined) throw new Error(`Missing ${name} operation.`);
  return found;
}

describe("API v1 dormant durable adapter interface", () => {
  it("maps each operation to the proposed database tables without creating a live adapter", () => {
    const tableMap = API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.tableMap;

    expect(tableMap).toEqual({
      ApiV1AuditEvent: "api_v1_audit_events",
      ApiV1Consumer: "api_v1_consumers",
      ApiV1QuotaMonth: "api_v1_quota_months",
    });
    expect(API_V1_DATABASE_SCHEMA_PROPOSAL.models.map((model) => [model.name, model.tableName])).toEqual([
      ["ApiV1Consumer", "api_v1_consumers"],
      ["ApiV1AuditEvent", "api_v1_audit_events"],
      ["ApiV1QuotaMonth", "api_v1_quota_months"],
    ]);
    expect(API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE).toMatchObject({
      envVarsIntroduced: [],
      executesSql: false,
      importsPrisma: false,
      migrationIncluded: false,
      readsEnvironment: false,
      routeExposed: false,
      status: "dormant_contract_only",
    });
  });

  it("defines resolve, consumer upsert, audit append, and quota-plus-audit operations", () => {
    expect(API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.operations.map((plan) => plan.operation)).toEqual([
      "resolve_consumer",
      "put_consumer",
      "append_audit_event",
      "record_quota_and_audit",
    ]);
    expect(operation("resolve_consumer")).toMatchObject({
      reads: ["api_v1_consumers"],
      transactionRequired: false,
      writes: [],
    });
    expect(operation("put_consumer")).toMatchObject({
      reads: ["api_v1_consumers"],
      transactionRequired: true,
      writes: ["api_v1_consumers"],
    });
  });

  it("keeps append_audit_event append-only and isolated to the audit table", () => {
    const appendAudit = operation("append_audit_event");

    expect(appendAudit.appendOnlyAudit).toBe(true);
    expect(appendAudit.reads).toEqual(["api_v1_audit_events"]);
    expect(appendAudit.writes).toEqual(["api_v1_audit_events"]);
    expect(appendAudit.commitOrder).toEqual(["api_v1_audit_events"]);
    expect(appendAudit.rollbackOrder).toEqual(["api_v1_audit_events"]);
    expect(appendAudit.invariant).toMatch(/append-only/);
  });

  it("requires quota and audit writes to share one transaction boundary", () => {
    const quotaAudit = operation("record_quota_and_audit");

    expect(quotaAudit.transactionRequired).toBe(true);
    expect(quotaAudit.reads).toEqual(["api_v1_consumers", "api_v1_quota_months", "api_v1_audit_events"]);
    expect(quotaAudit.writes).toEqual(["api_v1_quota_months", "api_v1_audit_events"]);
    expect(quotaAudit.commitOrder).toEqual(["api_v1_quota_months", "api_v1_audit_events"]);
    expect(quotaAudit.rollbackOrder).toEqual(["api_v1_audit_events", "api_v1_quota_months"]);
    expect(quotaAudit.steps.map((step) => step.action)).toEqual([
      "read",
      "read",
      "increment",
      "append",
      "commit",
      "rollback",
    ]);
  });

  it("validates cleanly against the current route-free, schema-free, migration-free repo state", () => {
    const report = validateApiV1DormantDurableAdapterInterface(API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE, {
      migrationNames: migrationNames(),
      moduleSourceText: read(sourcePath),
      prismaSchemaText: read(prismaSchemaPath),
      routeTreeExists: fs.existsSync(apiV1RouteTree),
    });

    expect(report.ok).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.checkedOperations).toEqual([
      "resolve_consumer",
      "put_consumer",
      "append_audit_event",
      "record_quota_and_audit",
    ]);
    expect(report.warnings.join(" ")).toMatch(/Owner approval/);
  });

  it("blocks route exposure, schema mutation, migration names, API env vars, live storage, and source boundary leaks", () => {
    const badPlan = {
      ...API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.promotionPlan,
      ownerApprovedForLiveUse: true,
      routeExposed: true,
      storage: "database_live" as const,
    };
    const report = validateApiV1DormantDurableAdapterInterface(API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE, {
      envFilesText: "API_V1_ENABLED=true\n",
      migrationNames: ["20260704000000_api_v1_live"],
      moduleSourceText: 'import { PrismaClient } from "@prisma/client"; process.env.API_V1_ENABLED; fetch("/");',
      prismaSchemaText: `${read(prismaSchemaPath)}\nmodel ApiV1Consumer { id String @id }`,
      promotionPlan: badPlan,
      routeTreeExists: true,
    });

    expect(report.ok).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "API v1 route tree exists; dormant durable adapter interface must stay route-free.",
        "API v1 environment variables are present; this interface must not add env configuration.",
        "Dormant adapter interface must not import Prisma client.",
        "Dormant adapter interface must not read environment variables.",
        "Dormant adapter interface must not make provider or network calls.",
        "Schema proposal: apps/web/app/api/v1 exists; this slice must remain route-free.",
        "Schema proposal: ApiV1Consumer already exists in Prisma schema; proposal slice must not mutate schema.prisma.",
        "Schema proposal: An API v1 migration exists; this slice is proposal-only and must not add migrations.",
        "Persistence promotion: Live database storage is blocked until owner approval and route exposure are explicitly approved.",
        "Persistence promotion: No API v1 route can be exposed in the shadow persistence slice.",
      ])
    );
  });

  it("blocks broken table maps and non-atomic quota/audit operation plans", () => {
    const brokenInterface: ApiV1DormantDurableAdapterInterface = {
      ...API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE,
      operations: API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.operations.map((plan) =>
        plan.operation === "record_quota_and_audit"
          ? {
              ...plan,
              commitOrder: ["api_v1_audit_events", "api_v1_quota_months"],
              reads: ["api_v1_quota_months", "api_v1_audit_events"],
              transactionRequired: false,
              writes: ["api_v1_audit_events"],
            }
          : plan
      ),
      tableMap: {
        ...API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.tableMap,
        ApiV1QuotaMonth: "api_v1_consumers",
      },
    };
    const report = validateApiV1DormantDurableAdapterInterface(brokenInterface);

    expect(report.ok).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "ApiV1QuotaMonth maps to api_v1_consumers but proposal maps to api_v1_quota_months.",
        "record_quota_and_audit must require a transaction.",
        "record_quota_and_audit must read api_v1_consumers before quota and audit writes.",
        "record_quota_and_audit must write api_v1_quota_months.",
        "record_quota_and_audit commit order must stage quota before audit.",
        "record_quota_and_audit rollback order must undo audit before quota.",
      ])
    );
  });

  it("builds a dry run that is explicitly non-executable", () => {
    const dryRun = buildApiV1DormantDurableAdapterDryRun();

    expect(dryRun).toMatchObject({
      adapterStatus: "dormant_contract_only",
      executable: false,
      status: "blocked_no_execution",
    });
    expect(dryRun.operations).toHaveLength(4);
    expect(dryRun.operations.every((entry) => entry.executable === false)).toBe(true);
    expect(dryRun.operations.find((entry) => entry.operation === "record_quota_and_audit")).toMatchObject({
      reads: ["api_v1_consumers", "api_v1_quota_months", "api_v1_audit_events"],
      writes: ["api_v1_quota_months", "api_v1_audit_events"],
    });
  });
});
