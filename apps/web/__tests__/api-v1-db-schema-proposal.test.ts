import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  API_V1_DATABASE_SCHEMA_PROPOSAL,
  validateApiV1DatabaseSchemaProposal,
  type ApiV1DatabaseSchemaProposal,
  type ApiV1ProposedField,
  type ApiV1ProposedModel,
  type ApiV1ProposedModelName,
} from "@/lib/api/v1";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const prismaSchemaPath = path.join(repoRoot, "packages/db/prisma/schema.prisma");
const migrationsDir = path.join(repoRoot, "packages/db/prisma/migrations");
const apiV1RouteTree = path.join(repoRoot, "apps/web/app/api/v1");
const schemaProposalDoc = path.join(repoRoot, "docs/api/API_V1_DATABASE_SCHEMA_PROPOSAL.md");
const schemaPrBodyDoc = path.join(repoRoot, "docs/api/API_V1_DATABASE_SCHEMA_PR_BODY.md");

function read(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function migrationNames(): string[] {
  return fs.readdirSync(migrationsDir).filter((entry) => {
    const migrationPath = path.join(migrationsDir, entry, "migration.sql");
    return fs.existsSync(migrationPath);
  });
}

function model(name: ApiV1ProposedModelName): ApiV1ProposedModel {
  const found = API_V1_DATABASE_SCHEMA_PROPOSAL.models.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`Missing ${name} proposal.`);
  return found;
}

function field(fields: readonly ApiV1ProposedField[], name: string): ApiV1ProposedField {
  const found = fields.find((candidate) => candidate.name === name);
  if (found === undefined) throw new Error(`Missing ${name} field.`);
  return found;
}

describe("API v1 database schema proposal", () => {
  it("validates as proposal-only against the current repository state", () => {
    const report = validateApiV1DatabaseSchemaProposal(API_V1_DATABASE_SCHEMA_PROPOSAL, {
      migrationNames: migrationNames(),
      prismaSchemaText: read(prismaSchemaPath),
      routeTreeExists: fs.existsSync(apiV1RouteTree),
    });

    expect(report.ok).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.checkedModels).toEqual(["ApiV1Consumer", "ApiV1AuditEvent", "ApiV1QuotaMonth"]);
  });

  it("defines the three future tables without creating them in Prisma yet", () => {
    const schema = read(prismaSchemaPath);
    const tableNames = API_V1_DATABASE_SCHEMA_PROPOSAL.models.map((entry) => entry.tableName);

    expect(tableNames).toEqual(["api_v1_consumers", "api_v1_audit_events", "api_v1_quota_months"]);
    expect(schema).not.toContain("model ApiV1Consumer ");
    expect(schema).not.toContain("model ApiV1AuditEvent ");
    expect(schema).not.toContain("model ApiV1QuotaMonth ");
    expect(migrationNames().filter((name) => /api[_-]?v1/i.test(name))).toEqual([]);
    expect(fs.existsSync(apiV1RouteTree)).toBe(false);
    expect(API_V1_DATABASE_SCHEMA_PROPOSAL.envVarsIntroduced).toEqual([]);
    expect(API_V1_DATABASE_SCHEMA_PROPOSAL.applyCommand).toBeNull();
    expect(API_V1_DATABASE_SCHEMA_PROPOSAL.migrationDirectoryName).toBeNull();
  });

  it("keeps the consumer registry hash-only and approval-gated", () => {
    const consumer = model("ApiV1Consumer");
    const keyHash = field(consumer.fields, "keyHash");
    const liveApproval = field(consumer.fields, "ownerApprovedForLiveUse");

    expect(consumer.tableName).toBe("api_v1_consumers");
    expect(keyHash.storagePolicy).toBe("hash_only");
    expect(keyHash.dbNativeType).toBe("Char(64)");
    expect(consumer.fields.map((entry) => entry.name).join(" ")).not.toMatch(/raw|plain|secret/i);
    expect(liveApproval.defaultValue).toBe("false");
    expect(consumer.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fields: ["keyHash"], name: "api_v1_consumers_keyHash_key", unique: true }),
        expect.objectContaining({ fields: ["keyId"], name: "api_v1_consumers_keyId_key", unique: true }),
      ])
    );
  });

  it("keeps audit persistence append-only and hash-chain ready", () => {
    const audit = model("ApiV1AuditEvent");
    const fieldNames = audit.fields.map((entry) => entry.name);

    expect(audit.tableName).toBe("api_v1_audit_events");
    expect(fieldNames).toEqual(
      expect.arrayContaining(["eventId", "sequence", "previousHash", "payloadHash", "hash"])
    );
    expect(field(audit.fields, "payloadHash").dbNativeType).toBe("Char(64)");
    expect(field(audit.fields, "previousHash").dbNativeType).toBe("Char(64)");
    expect(field(audit.fields, "hash").dbNativeType).toBe("Char(64)");
    expect(audit.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fields: ["sequence"], unique: true }),
        expect.objectContaining({ fields: ["hash"], unique: true }),
      ])
    );
  });

  it("separates monthly quota counters from immutable audit events", () => {
    const quota = model("ApiV1QuotaMonth");

    expect(quota.tableName).toBe("api_v1_quota_months");
    expect(field(quota.fields, "used").storagePolicy).toBe("counter_only");
    expect(field(quota.fields, "monthlyQuota").storagePolicy).toBe("counter_only");
    expect(quota.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fields: ["consumerId", "month"],
          name: "api_v1_quota_months_consumerId_month_key",
          unique: true,
        }),
      ])
    );
  });

  it("blocks repo states that would turn this proposal into a live schema slice", () => {
    const report = validateApiV1DatabaseSchemaProposal(API_V1_DATABASE_SCHEMA_PROPOSAL, {
      migrationNames: ["20260704000000_api_v1_live"],
      prismaSchemaText: `${read(prismaSchemaPath)}\nmodel ApiV1Consumer { id String @id }`,
      routeTreeExists: true,
    });

    expect(report.ok).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "apps/web/app/api/v1 exists; this slice must remain route-free.",
        "ApiV1Consumer already exists in Prisma schema; proposal slice must not mutate schema.prisma.",
        "An API v1 migration exists; this slice is proposal-only and must not add migrations.",
      ])
    );
  });

  it("blocks raw-key-looking fields and non-64-character hash fields", () => {
    const consumer = model("ApiV1Consumer");
    const badField: ApiV1ProposedField = {
      name: "rawApiKey",
      nullable: false,
      prismaType: "String",
      purpose: "Forbidden raw key storage.",
      storagePolicy: "metadata_only",
    };
    const badHashField: ApiV1ProposedField = {
      name: "keyHash",
      nullable: false,
      prismaType: "String",
      purpose: "Broken hash storage.",
      storagePolicy: "hash_only",
    };
    const badProposal: ApiV1DatabaseSchemaProposal = {
      ...API_V1_DATABASE_SCHEMA_PROPOSAL,
      models: [
        {
          ...consumer,
          fields: [...consumer.fields.filter((entry) => entry.name !== "keyHash"), badField, badHashField],
        },
        model("ApiV1AuditEvent"),
        model("ApiV1QuotaMonth"),
      ],
    };

    const report = validateApiV1DatabaseSchemaProposal(badProposal);

    expect(report.ok).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "ApiV1Consumer.rawApiKey looks like raw key storage.",
        "ApiV1Consumer.keyHash must be a 64-character hash field.",
      ])
    );
  });

  it("documents rollback before any future migration exists", () => {
    const rollbackSql = API_V1_DATABASE_SCHEMA_PROPOSAL.rollbackSqlDraft;
    const rollbackText = API_V1_DATABASE_SCHEMA_PROPOSAL.rollbackSteps.map((step) => step.action).join("\n");
    const docs = `${read(schemaProposalDoc)}\n${read(schemaPrBodyDoc)}`;

    expect(API_V1_DATABASE_SCHEMA_PROPOSAL.rollbackSteps).toHaveLength(5);
    expect(rollbackSql).toEqual([
      'DROP TABLE IF EXISTS "api_v1_quota_months";',
      'DROP TABLE IF EXISTS "api_v1_audit_events";',
      'DROP TABLE IF EXISTS "api_v1_consumers";',
    ]);
    expect(rollbackText).toMatch(/memory shadow adapter/);
    expect(docs).toContain("proposal-only");
    expect(docs).toContain("No `packages/db/prisma/schema.prisma` edit.");
    expect(docs).toContain("No `apps/web/app/api/v1` route.");
  });
});
