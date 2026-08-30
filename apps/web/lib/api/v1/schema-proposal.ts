import { API_V1_CONSUMER_STATUSES } from "./consumer-registry";
import { API_V1_SCOPES } from "./types";

export type ApiV1SchemaProposalStatus = "proposal_only";

export type ApiV1ProposedModelName = "ApiV1Consumer" | "ApiV1AuditEvent" | "ApiV1QuotaMonth";

export type ApiV1StoragePolicy =
  | "hash_only"
  | "metadata_only"
  | "append_only"
  | "counter_only"
  | "derived_state";

export type ApiV1ProposedField = {
  readonly name: string;
  readonly prismaType: string;
  readonly nullable: boolean;
  readonly storagePolicy: ApiV1StoragePolicy;
  readonly purpose: string;
  readonly defaultValue?: string;
  readonly dbNativeType?: string;
};

export type ApiV1ProposedIndex = {
  readonly name: string;
  readonly fields: readonly string[];
  readonly unique: boolean;
  readonly purpose: string;
};

export type ApiV1ProposedModel = {
  readonly name: ApiV1ProposedModelName;
  readonly tableName: string;
  readonly purpose: string;
  readonly fields: readonly ApiV1ProposedField[];
  readonly indexes: readonly ApiV1ProposedIndex[];
  readonly prismaModelDraft: string;
};

export type ApiV1RollbackStep = {
  readonly order: number;
  readonly action: string;
  readonly verification: string;
};

export type ApiV1DatabaseSchemaProposal = {
  readonly status: ApiV1SchemaProposalStatus;
  readonly generatedFor: "api_v1_shadow_persistence";
  readonly routeExposed: false;
  readonly envVarsIntroduced: readonly [];
  readonly migrationDirectoryName: null;
  readonly applyCommand: null;
  readonly ownerApprovalRequiredBeforeMigration: true;
  readonly allowedScopes: typeof API_V1_SCOPES;
  readonly allowedConsumerStatuses: typeof API_V1_CONSUMER_STATUSES;
  readonly models: readonly ApiV1ProposedModel[];
  readonly rollbackSteps: readonly ApiV1RollbackStep[];
  readonly rollbackSqlDraft: readonly string[];
};

export type ApiV1SchemaProposalInspection = {
  readonly prismaSchemaText?: string;
  readonly migrationNames?: readonly string[];
  readonly routeTreeExists?: boolean;
};

export type ApiV1SchemaProposalValidation = {
  readonly ok: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly checkedModels: readonly ApiV1ProposedModelName[];
};

const HASH_FIELD_NAMES = new Set(["keyHash", "payloadHash", "previousHash", "hash"]);
const REQUIRED_AUDIT_FIELDS = ["eventId", "sequence", "previousHash", "payloadHash", "hash"] as const;
const FORBIDDEN_RAW_KEY_FIELD_PATTERN = /(^|[^a-z])(raw|secret|token|plain)(api)?key/i;

function field(
  name: string,
  prismaType: string,
  storagePolicy: ApiV1StoragePolicy,
  purpose: string,
  options: {
    readonly nullable?: boolean;
    readonly defaultValue?: string;
    readonly dbNativeType?: string;
  } = {}
): ApiV1ProposedField {
  return {
    name,
    nullable: options.nullable ?? false,
    prismaType,
    purpose,
    storagePolicy,
    ...(options.defaultValue === undefined ? {} : { defaultValue: options.defaultValue }),
    ...(options.dbNativeType === undefined ? {} : { dbNativeType: options.dbNativeType }),
  };
}

function index(name: string, fields: readonly string[], unique: boolean, purpose: string): ApiV1ProposedIndex {
  return { fields, name, purpose, unique };
}

export const API_V1_DATABASE_SCHEMA_PROPOSAL: ApiV1DatabaseSchemaProposal = {
  allowedConsumerStatuses: API_V1_CONSUMER_STATUSES,
  allowedScopes: API_V1_SCOPES,
  applyCommand: null,
  envVarsIntroduced: [],
  generatedFor: "api_v1_shadow_persistence",
  migrationDirectoryName: null,
  models: [
    {
      fields: [
        field("id", "String", "metadata_only", "Internal database primary key.", { defaultValue: "cuid()" }),
        field("consumerId", "String", "metadata_only", "Stable public-safe consumer id."),
        field("displayName", "String", "metadata_only", "Operator-readable partner or integration label."),
        field("keyId", "String", "metadata_only", "Public-safe key handle used in audit events."),
        field("keyHash", "String", "hash_only", "SHA-256 hash of the API key; never raw key material.", {
          dbNativeType: "Char(64)",
        }),
        field("status", "String", "derived_state", "One of the API v1 shadow consumer statuses."),
        field("active", "Boolean", "derived_state", "Fast active-state mirror; runtime still validates status."),
        field("scopes", "String[]", "metadata_only", "Granted API v1 scopes.", { defaultValue: "[]" }),
        field("allowedOrigins", "String[]", "metadata_only", "Exact allowed origins; empty means no origin allowlist.", {
          defaultValue: "[]",
        }),
        field("monthlyQuota", "Int", "counter_only", "Configured monthly request allowance."),
        field("ownerApprovedForLiveUse", "Boolean", "derived_state", "Must remain false until owner promotion.", {
          defaultValue: "false",
        }),
        field("issuedAt", "DateTime", "metadata_only", "Credential issuance time."),
        field("expiresAt", "DateTime", "metadata_only", "Optional credential expiry time.", { nullable: true }),
        field("rotateAfter", "DateTime", "metadata_only", "Optional rotation warning threshold.", { nullable: true }),
        field("revokedAt", "DateTime", "metadata_only", "Optional revocation timestamp.", { nullable: true }),
        field("notes", "String", "metadata_only", "Internal operator notes.", { defaultValue: "\"\"" }),
        field("createdAt", "DateTime", "metadata_only", "Row creation time.", { defaultValue: "now()" }),
        field("updatedAt", "DateTime", "metadata_only", "Row update time."),
      ],
      indexes: [
        index("api_v1_consumers_consumerId_key", ["consumerId"], true, "Resolve consumer records by stable id."),
        index("api_v1_consumers_keyId_key", ["keyId"], true, "Prevent key handle collision."),
        index("api_v1_consumers_keyHash_key", ["keyHash"], true, "Resolve hashed credentials without raw keys."),
        index("api_v1_consumers_status_idx", ["status"], false, "Review active/suspended/revoked populations."),
      ],
      name: "ApiV1Consumer",
      prismaModelDraft: `model ApiV1Consumer {
  id                      String   @id @default(cuid())
  consumerId              String   @unique
  displayName             String
  keyId                   String   @unique
  keyHash                 String   @unique @db.Char(64)
  status                  String
  active                  Boolean
  scopes                  String[] @default([])
  allowedOrigins          String[] @default([])
  monthlyQuota            Int
  ownerApprovedForLiveUse Boolean  @default(false)
  issuedAt                DateTime
  expiresAt               DateTime?
  rotateAfter             DateTime?
  revokedAt               DateTime?
  notes                   String   @default("")
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  quotaMonths ApiV1QuotaMonth[]

  @@index([status])
  @@map("api_v1_consumers")
}`,
      purpose: "Durable consumer registry without raw API key material.",
      tableName: "api_v1_consumers",
    },
    {
      fields: [
        field("id", "String", "metadata_only", "Internal database primary key.", { defaultValue: "cuid()" }),
        field("eventId", "String", "append_only", "External audit event id."),
        field("sequence", "BigInt", "append_only", "Strictly increasing append-only sequence."),
        field("type", "String", "append_only", "API v1 audit event type."),
        field("occurredAt", "DateTime", "append_only", "Decision timestamp from the adapter."),
        field("consumerId", "String", "append_only", "Consumer id when known.", { nullable: true }),
        field("keyId", "String", "append_only", "Key handle when known.", { nullable: true }),
        field("endpointId", "String", "append_only", "Endpoint contract id when applicable.", { nullable: true }),
        field("decision", "String", "append_only", "allow, deny, or record."),
        field("reasonCodes", "String[]", "append_only", "Sorted reason codes committed by payloadHash.", {
          defaultValue: "[]",
        }),
        field("sourceIds", "String[]", "append_only", "Sorted source ids committed by payloadHash.", {
          defaultValue: "[]",
        }),
        field("quotaRemaining", "Int", "append_only", "Remaining quota after decision when known.", {
          nullable: true,
        }),
        field("payloadHash", "String", "hash_only", "Canonical payload SHA-256.", { dbNativeType: "Char(64)" }),
        field("previousHash", "String", "hash_only", "Previous audit event hash.", {
          dbNativeType: "Char(64)",
          nullable: true,
        }),
        field("hash", "String", "hash_only", "Audit event SHA-256.", { dbNativeType: "Char(64)" }),
        field("createdAt", "DateTime", "metadata_only", "Database insert time.", { defaultValue: "now()" }),
      ],
      indexes: [
        index("api_v1_audit_events_eventId_key", ["eventId"], true, "Prevent duplicate audit event ids."),
        index("api_v1_audit_events_sequence_key", ["sequence"], true, "Make sequence append order unique."),
        index("api_v1_audit_events_hash_key", ["hash"], true, "Keep audit event hashes unique."),
        index("api_v1_audit_events_consumerId_occurredAt_idx", ["consumerId", "occurredAt"], false, "Review consumer decisions over time."),
        index("api_v1_audit_events_type_occurredAt_idx", ["type", "occurredAt"], false, "Review allow, deny, quota, and record events."),
      ],
      name: "ApiV1AuditEvent",
      prismaModelDraft: `model ApiV1AuditEvent {
  id             String   @id @default(cuid())
  eventId        String   @unique
  sequence       BigInt   @unique
  type           String
  occurredAt     DateTime
  consumerId     String?
  keyId          String?
  endpointId     String?
  decision       String
  reasonCodes    String[] @default([])
  sourceIds      String[] @default([])
  quotaRemaining Int?
  payloadHash    String   @db.Char(64)
  previousHash   String?  @db.Char(64)
  hash           String   @unique @db.Char(64)
  createdAt      DateTime @default(now())

  @@index([consumerId, occurredAt])
  @@index([type, occurredAt])
  @@map("api_v1_audit_events")
}`,
      purpose: "Append-only hash-chain audit table for allow, deny, quota, registration, rotation, and scope events.",
      tableName: "api_v1_audit_events",
    },
    {
      fields: [
        field("id", "String", "metadata_only", "Internal database primary key.", { defaultValue: "cuid()" }),
        field("consumerId", "String", "counter_only", "Consumer id receiving quota."),
        field("keyId", "String", "counter_only", "Key handle active for the quota month."),
        field("month", "String", "counter_only", "UTC YYYY-MM quota bucket."),
        field("monthlyQuota", "Int", "counter_only", "Monthly allowance for this bucket."),
        field("used", "Int", "counter_only", "Committed request count for this bucket.", { defaultValue: "0" }),
        field("createdAt", "DateTime", "metadata_only", "Row creation time.", { defaultValue: "now()" }),
        field("updatedAt", "DateTime", "metadata_only", "Row update time."),
      ],
      indexes: [
        index("api_v1_quota_months_consumerId_month_key", ["consumerId", "month"], true, "One quota row per consumer per UTC month."),
        index("api_v1_quota_months_keyId_month_idx", ["keyId", "month"], false, "Audit key rotation impact by month."),
      ],
      name: "ApiV1QuotaMonth",
      prismaModelDraft: `model ApiV1QuotaMonth {
  id           String        @id @default(cuid())
  consumerId   String
  keyId        String
  month        String
  monthlyQuota Int
  used         Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  consumer     ApiV1Consumer @relation(fields: [consumerId], references: [consumerId], onDelete: Restrict, onUpdate: Cascade)

  @@unique([consumerId, month])
  @@index([keyId, month])
  @@map("api_v1_quota_months")
}`,
      purpose: "Transactional quota counter separated from the immutable audit ledger.",
      tableName: "api_v1_quota_months",
    },
  ],
  ownerApprovalRequiredBeforeMigration: true,
  rollbackSqlDraft: [
    'DROP TABLE IF EXISTS "api_v1_quota_months";',
    'DROP TABLE IF EXISTS "api_v1_audit_events";',
    'DROP TABLE IF EXISTS "api_v1_consumers";',
  ],
  rollbackSteps: [
    {
      action: "Keep API v1 route exposure disabled and keep the memory shadow adapter as the only executable adapter.",
      order: 1,
      verification: "Confirm apps/web/app/api/v1 does not exist and the OpenAPI draft still has x-gse-live-routes-exposed=false.",
    },
    {
      action: "If a future migration was applied, stop API writers before touching quota or audit tables.",
      order: 2,
      verification: "Confirm no request path can call a durable adapter while rollback is in progress.",
    },
    {
      action: "Export row counts and audit tip hash before rollback for reconciliation.",
      order: 3,
      verification: "Record consumer count, quota month count, audit event count, and audit tip hash in the incident note.",
    },
    {
      action: "Drop proposed tables in dependency order: quota months, audit events, consumers.",
      order: 4,
      verification: "Run a schema diff against the pre-migration schema and confirm proposed api_v1 tables are absent.",
    },
    {
      action: "Run API v1 shadow seam tests and guardrails before re-opening any promotion discussion.",
      order: 5,
      verification: "Focused API v1 tests, typecheck, lint, guardrails, and git diff check pass.",
    },
  ],
  routeExposed: false,
  status: "proposal_only",
};

export function validateApiV1DatabaseSchemaProposal(
  proposal: ApiV1DatabaseSchemaProposal = API_V1_DATABASE_SCHEMA_PROPOSAL,
  inspection: ApiV1SchemaProposalInspection = {}
): ApiV1SchemaProposalValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checkedModels = proposal.models.map((model) => model.name);

  if (proposal.status !== "proposal_only") blockers.push("Schema work must remain proposal_only.");
  if (proposal.routeExposed) blockers.push("API v1 route exposure is forbidden in the schema proposal slice.");
  if (proposal.envVarsIntroduced.length > 0) blockers.push("Schema proposal must not introduce environment variables.");
  if (proposal.migrationDirectoryName !== null) blockers.push("Schema proposal must not create a Prisma migration directory.");
  if (proposal.applyCommand !== null) blockers.push("Schema proposal must not include an apply command.");
  if (!proposal.ownerApprovalRequiredBeforeMigration) {
    blockers.push("Owner approval must be required before any future migration.");
  }

  if (inspection.routeTreeExists) blockers.push("apps/web/app/api/v1 exists; this slice must remain route-free.");

  for (const model of proposal.models) {
    if (inspection.prismaSchemaText?.includes(`model ${model.name} `)) {
      blockers.push(`${model.name} already exists in Prisma schema; proposal slice must not mutate schema.prisma.`);
    }
    for (const fieldSpec of model.fields) {
      if (FORBIDDEN_RAW_KEY_FIELD_PATTERN.test(fieldSpec.name)) {
        blockers.push(`${model.name}.${fieldSpec.name} looks like raw key storage.`);
      }
      if (HASH_FIELD_NAMES.has(fieldSpec.name) && fieldSpec.dbNativeType !== "Char(64)") {
        blockers.push(`${model.name}.${fieldSpec.name} must be a 64-character hash field.`);
      }
    }
  }

  const migrationNames = inspection.migrationNames ?? [];
  if (migrationNames.some((name) => /api[_-]?v1/i.test(name))) {
    blockers.push("An API v1 migration exists; this slice is proposal-only and must not add migrations.");
  }

  const consumer = proposal.models.find((model) => model.name === "ApiV1Consumer");
  const audit = proposal.models.find((model) => model.name === "ApiV1AuditEvent");
  const quota = proposal.models.find((model) => model.name === "ApiV1QuotaMonth");
  if (consumer === undefined) blockers.push("ApiV1Consumer proposal is required.");
  if (audit === undefined) blockers.push("ApiV1AuditEvent proposal is required.");
  if (quota === undefined) blockers.push("ApiV1QuotaMonth proposal is required.");

  const consumerIndexNames = consumer?.indexes.map((entry) => entry.name) ?? [];
  if (!consumerIndexNames.includes("api_v1_consumers_keyHash_key")) {
    blockers.push("Consumer proposal must include a unique keyHash index.");
  }

  const auditFieldNames = new Set(audit?.fields.map((entry) => entry.name) ?? []);
  for (const requiredField of REQUIRED_AUDIT_FIELDS) {
    if (!auditFieldNames.has(requiredField)) blockers.push(`Audit proposal is missing ${requiredField}.`);
  }
  if (!audit?.indexes.some((entry) => entry.unique && entry.fields.length === 1 && entry.fields[0] === "sequence")) {
    blockers.push("Audit proposal must make sequence unique.");
  }

  if (!quota?.indexes.some((entry) => entry.unique && entry.fields.join(":") === "consumerId:month")) {
    blockers.push("Quota proposal must make consumerId + month unique.");
  }

  if (proposal.rollbackSteps.length < 5) warnings.push("Rollback plan should keep at least five ordered steps.");
  if (!proposal.rollbackSqlDraft.some((line) => line.includes('"api_v1_quota_months"'))) {
    blockers.push("Rollback SQL must drop quota months first.");
  }
  if (!proposal.rollbackSqlDraft.some((line) => line.includes('"api_v1_consumers"'))) {
    blockers.push("Rollback SQL must drop consumers last.");
  }

  return {
    blockers,
    checkedModels,
    ok: blockers.length === 0,
    warnings,
  };
}
