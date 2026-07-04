import type { ApiV1MockTransactionOperation } from "./durable-adapter-harness";
import {
  API_V1_DATABASE_SCHEMA_PROPOSAL,
  validateApiV1DatabaseSchemaProposal,
  type ApiV1DatabaseSchemaProposal,
  type ApiV1ProposedModelName,
} from "./schema-proposal";
import {
  validateApiV1PersistencePromotionPlan,
  type ApiV1PersistencePromotionPlan,
} from "./persistence";

export type ApiV1DormantDurableAdapterStatus = "dormant_contract_only";

export type ApiV1DurableAdapterOperation = "resolve_consumer" | ApiV1MockTransactionOperation;

export type ApiV1DurableAdapterTableName =
  | "api_v1_consumers"
  | "api_v1_audit_events"
  | "api_v1_quota_months";

export type ApiV1DurableAdapterStepAction =
  | "read"
  | "upsert"
  | "append"
  | "increment"
  | "commit"
  | "rollback";

export type ApiV1DurableAdapterOperationStep = {
  readonly order: number;
  readonly action: ApiV1DurableAdapterStepAction;
  readonly table: ApiV1DurableAdapterTableName | null;
  readonly intent: string;
};

export type ApiV1DurableAdapterOperationPlan = {
  readonly operation: ApiV1DurableAdapterOperation;
  readonly transactionRequired: boolean;
  readonly reads: readonly ApiV1DurableAdapterTableName[];
  readonly writes: readonly ApiV1DurableAdapterTableName[];
  readonly commitOrder: readonly ApiV1DurableAdapterTableName[];
  readonly rollbackOrder: readonly ApiV1DurableAdapterTableName[];
  readonly appendOnlyAudit: boolean;
  readonly invariant: string;
  readonly steps: readonly ApiV1DurableAdapterOperationStep[];
};

export type ApiV1DormantDurableAdapterInterface = {
  readonly status: ApiV1DormantDurableAdapterStatus;
  readonly generatedFor: "api_v1_planned_durable_store";
  readonly routeExposed: false;
  readonly importsPrisma: false;
  readonly executesSql: false;
  readonly readsEnvironment: false;
  readonly migrationIncluded: false;
  readonly envVarsIntroduced: readonly [];
  readonly tableMap: Readonly<Record<ApiV1ProposedModelName, ApiV1DurableAdapterTableName>>;
  readonly operations: readonly ApiV1DurableAdapterOperationPlan[];
  readonly promotionPlan: ApiV1PersistencePromotionPlan;
};

export type ApiV1DormantDurableAdapterInspection = {
  readonly routeTreeExists?: boolean;
  readonly prismaSchemaText?: string;
  readonly migrationNames?: readonly string[];
  readonly envFilesText?: string;
  readonly moduleSourceText?: string;
  readonly promotionPlan?: ApiV1PersistencePromotionPlan;
};

export type ApiV1DormantDurableAdapterValidation = {
  readonly ok: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly checkedOperations: readonly ApiV1DurableAdapterOperation[];
};

export type ApiV1DormantDurableAdapterDryRunOperation = {
  readonly operation: ApiV1DurableAdapterOperation;
  readonly executable: false;
  readonly status: "mapped_not_executed";
  readonly reads: readonly ApiV1DurableAdapterTableName[];
  readonly writes: readonly ApiV1DurableAdapterTableName[];
  readonly boundary: string;
};

export type ApiV1DormantDurableAdapterDryRun = {
  readonly status: "blocked_no_execution";
  readonly adapterStatus: ApiV1DormantDurableAdapterStatus;
  readonly executable: false;
  readonly operations: readonly ApiV1DormantDurableAdapterDryRunOperation[];
};

const API_V1_DURABLE_TABLE_MAP = {
  ApiV1AuditEvent: "api_v1_audit_events",
  ApiV1Consumer: "api_v1_consumers",
  ApiV1QuotaMonth: "api_v1_quota_months",
} as const satisfies Readonly<Record<ApiV1ProposedModelName, ApiV1DurableAdapterTableName>>;

const API_V1_DORMANT_PROMOTION_PLAN: ApiV1PersistencePromotionPlan = {
  appendOnlyAudit: true,
  deniedResponsesLeakPayload: false,
  hashesOnly: true,
  migrationIncluded: false,
  openApiGeneratedInCi: true,
  ownerApprovedForLiveUse: false,
  quotaAndAuditSameTransaction: true,
  rawKeysStored: false,
  rollbackPlan:
    "Keep the memory shadow adapter as fallback, stop future writers, export counts and audit tip hash, and drop proposed tables in dependency order only if a later migration is approved.",
  routeExposed: false,
  storage: "database_planned",
};

const OPERATION_PLANS: readonly ApiV1DurableAdapterOperationPlan[] = [
  {
    appendOnlyAudit: true,
    commitOrder: [],
    invariant: "Consumer resolution reads the hashed credential registry and never writes state.",
    operation: "resolve_consumer",
    reads: [API_V1_DURABLE_TABLE_MAP.ApiV1Consumer],
    rollbackOrder: [],
    steps: [
      {
        action: "read",
        intent: "Resolve a presented key hash against the durable consumer registry.",
        order: 1,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1Consumer,
      },
    ],
    transactionRequired: false,
    writes: [],
  },
  {
    appendOnlyAudit: true,
    commitOrder: [API_V1_DURABLE_TABLE_MAP.ApiV1Consumer],
    invariant: "Consumer upserts store hashes and metadata only; raw key material is outside the contract.",
    operation: "put_consumer",
    reads: [API_V1_DURABLE_TABLE_MAP.ApiV1Consumer],
    rollbackOrder: [API_V1_DURABLE_TABLE_MAP.ApiV1Consumer],
    steps: [
      {
        action: "read",
        intent: "Check for an existing consumer id, key id, or key hash collision.",
        order: 1,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1Consumer,
      },
      {
        action: "upsert",
        intent: "Stage the consumer record with hash-only credential storage.",
        order: 2,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1Consumer,
      },
      {
        action: "commit",
        intent: "Commit the staged registry mutation as one durable write.",
        order: 3,
        table: null,
      },
    ],
    transactionRequired: true,
    writes: [API_V1_DURABLE_TABLE_MAP.ApiV1Consumer],
  },
  {
    appendOnlyAudit: true,
    commitOrder: [API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent],
    invariant: "Audit writes are append-only and preserve event id, sequence, payload hash, previous hash, and event hash.",
    operation: "append_audit_event",
    reads: [API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent],
    rollbackOrder: [API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent],
    steps: [
      {
        action: "read",
        intent: "Read the current audit tip hash and next sequence.",
        order: 1,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent,
      },
      {
        action: "append",
        intent: "Stage one immutable audit event linked to the previous tip hash.",
        order: 2,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent,
      },
      {
        action: "commit",
        intent: "Commit the staged audit append without modifying previous events.",
        order: 3,
        table: null,
      },
    ],
    transactionRequired: true,
    writes: [API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent],
  },
  {
    appendOnlyAudit: true,
    commitOrder: [API_V1_DURABLE_TABLE_MAP.ApiV1QuotaMonth, API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent],
    invariant: "Quota increment and audit append must succeed or roll back together.",
    operation: "record_quota_and_audit",
    reads: [
      API_V1_DURABLE_TABLE_MAP.ApiV1Consumer,
      API_V1_DURABLE_TABLE_MAP.ApiV1QuotaMonth,
      API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent,
    ],
    rollbackOrder: [API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent, API_V1_DURABLE_TABLE_MAP.ApiV1QuotaMonth],
    steps: [
      {
        action: "read",
        intent: "Resolve consumer status, scopes, expiry, rotation, and owner approval flags.",
        order: 1,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1Consumer,
      },
      {
        action: "read",
        intent: "Load the UTC month quota row for the resolved consumer.",
        order: 2,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1QuotaMonth,
      },
      {
        action: "increment",
        intent: "Stage the quota counter update only when the request is allowed.",
        order: 3,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1QuotaMonth,
      },
      {
        action: "append",
        intent: "Stage the allow, deny, or quota audit event with the post-decision quota state.",
        order: 4,
        table: API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent,
      },
      {
        action: "commit",
        intent: "Commit quota and audit together.",
        order: 5,
        table: null,
      },
      {
        action: "rollback",
        intent: "Discard both staged mutations if either write cannot commit.",
        order: 6,
        table: null,
      },
    ],
    transactionRequired: true,
    writes: [API_V1_DURABLE_TABLE_MAP.ApiV1QuotaMonth, API_V1_DURABLE_TABLE_MAP.ApiV1AuditEvent],
  },
];

export const API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE: ApiV1DormantDurableAdapterInterface = {
  envVarsIntroduced: [],
  executesSql: false,
  generatedFor: "api_v1_planned_durable_store",
  importsPrisma: false,
  migrationIncluded: false,
  operations: OPERATION_PLANS,
  promotionPlan: API_V1_DORMANT_PROMOTION_PLAN,
  readsEnvironment: false,
  routeExposed: false,
  status: "dormant_contract_only",
  tableMap: API_V1_DURABLE_TABLE_MAP,
};

function proposalTableFor(
  proposal: ApiV1DatabaseSchemaProposal,
  modelName: ApiV1ProposedModelName
): string | null {
  return proposal.models.find((model) => model.name === modelName)?.tableName ?? null;
}

function operation(
  interfaceSpec: ApiV1DormantDurableAdapterInterface,
  name: ApiV1DurableAdapterOperation
): ApiV1DurableAdapterOperationPlan | null {
  return interfaceSpec.operations.find((plan) => plan.operation === name) ?? null;
}

function hasOperation(
  interfaceSpec: ApiV1DormantDurableAdapterInterface,
  name: ApiV1DurableAdapterOperation
): boolean {
  return operation(interfaceSpec, name) !== null;
}

function containsApiV1Env(text: string): boolean {
  return /^(GSE_API_KEY|GSE_API_V1_|API_V1_)/im.test(text);
}

function validateModuleBoundary(sourceText: string, blockers: string[]): void {
  const forbiddenFragments = [
    { fragment: ["@prisma", "client"].join("/"), message: "Dormant adapter interface must not import Prisma client." },
    { fragment: ["packages", "db"].join("/"), message: "Dormant adapter interface must not import the database package." },
    { fragment: ["process", "env"].join("."), message: "Dormant adapter interface must not read environment variables." },
    { fragment: ["app", "api", "v1"].join("/"), message: "Dormant adapter interface must not bind to a route tree." },
    { fragment: ["fetch", "("].join(""), message: "Dormant adapter interface must not make provider or network calls." },
  ] as const;

  for (const entry of forbiddenFragments) {
    if (sourceText.includes(entry.fragment)) blockers.push(entry.message);
  }
}

export function validateApiV1DormantDurableAdapterInterface(
  interfaceSpec: ApiV1DormantDurableAdapterInterface = API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE,
  inspection: ApiV1DormantDurableAdapterInspection = {},
  proposal: ApiV1DatabaseSchemaProposal = API_V1_DATABASE_SCHEMA_PROPOSAL
): ApiV1DormantDurableAdapterValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (interfaceSpec.status !== "dormant_contract_only") {
    blockers.push("Durable adapter interface must remain dormant_contract_only.");
  }
  if (interfaceSpec.routeExposed) blockers.push("Dormant adapter interface must not expose routes.");
  if (interfaceSpec.importsPrisma) blockers.push("Dormant adapter interface must not import Prisma.");
  if (interfaceSpec.executesSql) blockers.push("Dormant adapter interface must not execute SQL.");
  if (interfaceSpec.readsEnvironment) blockers.push("Dormant adapter interface must not read environment variables.");
  if (interfaceSpec.migrationIncluded) blockers.push("Dormant adapter interface must not include migrations.");
  if (interfaceSpec.envVarsIntroduced.length > 0) {
    blockers.push("Dormant adapter interface must not introduce API v1 environment variables.");
  }

  for (const modelName of Object.keys(interfaceSpec.tableMap) as ApiV1ProposedModelName[]) {
    const proposedTable = proposalTableFor(proposal, modelName);
    if (proposedTable !== interfaceSpec.tableMap[modelName]) {
      blockers.push(`${modelName} maps to ${interfaceSpec.tableMap[modelName]} but proposal maps to ${proposedTable ?? "missing"}.`);
    }
  }

  const requiredOperations: readonly ApiV1DurableAdapterOperation[] = [
    "resolve_consumer",
    "put_consumer",
    "append_audit_event",
    "record_quota_and_audit",
  ];
  for (const required of requiredOperations) {
    if (!hasOperation(interfaceSpec, required)) blockers.push(`${required} operation plan is required.`);
  }

  const appendAudit = operation(interfaceSpec, "append_audit_event");
  if (appendAudit !== null) {
    if (!appendAudit.appendOnlyAudit) blockers.push("append_audit_event must be append-only.");
    if (!appendAudit.writes.includes(interfaceSpec.tableMap.ApiV1AuditEvent)) {
      blockers.push("append_audit_event must write api_v1_audit_events.");
    }
    if (appendAudit.writes.some((table) => table !== interfaceSpec.tableMap.ApiV1AuditEvent)) {
      blockers.push("append_audit_event must not write non-audit tables.");
    }
  }

  const quotaAudit = operation(interfaceSpec, "record_quota_and_audit");
  if (quotaAudit !== null) {
    if (!quotaAudit.transactionRequired) {
      blockers.push("record_quota_and_audit must require a transaction.");
    }
    if (!quotaAudit.reads.includes(interfaceSpec.tableMap.ApiV1Consumer)) {
      blockers.push("record_quota_and_audit must read api_v1_consumers before quota and audit writes.");
    }
    if (!quotaAudit.writes.includes(interfaceSpec.tableMap.ApiV1QuotaMonth)) {
      blockers.push("record_quota_and_audit must write api_v1_quota_months.");
    }
    if (!quotaAudit.writes.includes(interfaceSpec.tableMap.ApiV1AuditEvent)) {
      blockers.push("record_quota_and_audit must write api_v1_audit_events.");
    }
    if (
      quotaAudit.commitOrder.join(">") !==
      [interfaceSpec.tableMap.ApiV1QuotaMonth, interfaceSpec.tableMap.ApiV1AuditEvent].join(">")
    ) {
      blockers.push("record_quota_and_audit commit order must stage quota before audit.");
    }
    if (
      quotaAudit.rollbackOrder.join(">") !==
      [interfaceSpec.tableMap.ApiV1AuditEvent, interfaceSpec.tableMap.ApiV1QuotaMonth].join(">")
    ) {
      blockers.push("record_quota_and_audit rollback order must undo audit before quota.");
    }
  }

  if (inspection.routeTreeExists) {
    blockers.push("API v1 route tree exists; dormant durable adapter interface must stay route-free.");
  }
  if (inspection.envFilesText !== undefined && containsApiV1Env(inspection.envFilesText)) {
    blockers.push("API v1 environment variables are present; this interface must not add env configuration.");
  }
  if (inspection.moduleSourceText !== undefined) {
    validateModuleBoundary(inspection.moduleSourceText, blockers);
  }

  const schemaReport = validateApiV1DatabaseSchemaProposal(proposal, {
    migrationNames: inspection.migrationNames,
    prismaSchemaText: inspection.prismaSchemaText,
    routeTreeExists: inspection.routeTreeExists,
  });
  blockers.push(...schemaReport.blockers.map((blocker) => `Schema proposal: ${blocker}`));
  warnings.push(...schemaReport.warnings.map((warning) => `Schema proposal: ${warning}`));

  const promotionReport = validateApiV1PersistencePromotionPlan(inspection.promotionPlan ?? interfaceSpec.promotionPlan);
  blockers.push(...promotionReport.blockers.map((blocker) => `Persistence promotion: ${blocker}`));
  warnings.push(...promotionReport.warnings.map((warning) => `Persistence promotion: ${warning}`));

  return {
    blockers,
    checkedOperations: interfaceSpec.operations.map((plan) => plan.operation),
    ok: blockers.length === 0,
    warnings,
  };
}

export function buildApiV1DormantDurableAdapterDryRun(
  interfaceSpec: ApiV1DormantDurableAdapterInterface = API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE
): ApiV1DormantDurableAdapterDryRun {
  return {
    adapterStatus: interfaceSpec.status,
    executable: false,
    operations: interfaceSpec.operations.map((plan) => ({
      boundary: "Contract mapped to proposed tables only; no Prisma client, SQL execution, route exposure, or provider call.",
      executable: false,
      operation: plan.operation,
      reads: plan.reads,
      status: "mapped_not_executed",
      writes: plan.writes,
    })),
    status: "blocked_no_execution",
  };
}
