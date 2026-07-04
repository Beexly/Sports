import {
  API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE,
  validateApiV1DormantDurableAdapterInterface,
  type ApiV1DormantDurableAdapterInterface,
  type ApiV1DurableAdapterOperation,
  type ApiV1DurableAdapterOperationPlan,
  type ApiV1DurableAdapterTableName,
} from "./dormant-durable-adapter-interface";

export type ApiV1DurableFixtureResult = "committed" | "rolled_back" | "read_only";

export type ApiV1DurableFixtureTableCounts = Readonly<Record<ApiV1DurableAdapterTableName, number>>;

export type ApiV1DurableFixtureOperation = {
  readonly id: string;
  readonly operation: ApiV1DurableAdapterOperation;
  readonly result: ApiV1DurableFixtureResult;
  readonly observedReads: readonly ApiV1DurableAdapterTableName[];
  readonly observedWrites: readonly ApiV1DurableAdapterTableName[];
  readonly observedCommitOrder: readonly ApiV1DurableAdapterTableName[];
  readonly observedRollbackOrder: readonly ApiV1DurableAdapterTableName[];
  readonly before: ApiV1DurableFixtureTableCounts;
  readonly after: ApiV1DurableFixtureTableCounts;
  readonly notes: readonly string[];
};

export type ApiV1DurableFixtureScenario = {
  readonly schemaVersion: "api-v1-durable-fixture-simulator-v1";
  readonly fixtureId: string;
  readonly source: "local_synthetic_fixture";
  readonly routeExposed: false;
  readonly databaseTouched: false;
  readonly providerCalled: false;
  readonly operations: readonly ApiV1DurableFixtureOperation[];
};

export type ApiV1DurableFixtureSimulationCase = {
  readonly id: string;
  readonly operation: ApiV1DurableAdapterOperation;
  readonly passed: boolean;
  readonly blockers: readonly string[];
  readonly observations: readonly string[];
};

export type ApiV1DurableFixtureSimulationReport = {
  readonly fixtureId: string;
  readonly passed: boolean;
  readonly operationCount: number;
  readonly boundary: {
    readonly routeExposed: false;
    readonly databaseTouched: false;
    readonly providerCalled: false;
    readonly executable: false;
  };
  readonly cases: readonly ApiV1DurableFixtureSimulationCase[];
  readonly warnings: readonly string[];
};

const TABLES: readonly ApiV1DurableAdapterTableName[] = [
  "api_v1_consumers",
  "api_v1_audit_events",
  "api_v1_quota_months",
];

function sameSequence(
  left: readonly ApiV1DurableAdapterTableName[],
  right: readonly ApiV1DurableAdapterTableName[]
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function findPlan(
  interfaceSpec: ApiV1DormantDurableAdapterInterface,
  operation: ApiV1DurableAdapterOperation
): ApiV1DurableAdapterOperationPlan | null {
  return interfaceSpec.operations.find((plan) => plan.operation === operation) ?? null;
}

function countFor(counts: ApiV1DurableFixtureTableCounts, table: ApiV1DurableAdapterTableName): number {
  return counts[table];
}

function unchangedTables(
  before: ApiV1DurableFixtureTableCounts,
  after: ApiV1DurableFixtureTableCounts,
  excluded: readonly ApiV1DurableAdapterTableName[]
): readonly ApiV1DurableAdapterTableName[] {
  return TABLES.filter((table) => !excluded.includes(table) && countFor(before, table) === countFor(after, table));
}

function changedTables(
  before: ApiV1DurableFixtureTableCounts,
  after: ApiV1DurableFixtureTableCounts
): readonly ApiV1DurableAdapterTableName[] {
  return TABLES.filter((table) => countFor(before, table) !== countFor(after, table));
}

function tableCountsMatch(
  left: ApiV1DurableFixtureTableCounts,
  right: ApiV1DurableFixtureTableCounts
): boolean {
  return TABLES.every((table) => countFor(left, table) === countFor(right, table));
}

function validateScenarioBoundary(scenario: ApiV1DurableFixtureScenario, blockers: string[]): void {
  if (scenario.schemaVersion !== "api-v1-durable-fixture-simulator-v1") {
    blockers.push("Fixture schemaVersion must be api-v1-durable-fixture-simulator-v1.");
  }
  if (scenario.source !== "local_synthetic_fixture") {
    blockers.push("Fixture source must be local_synthetic_fixture.");
  }
  if (scenario.routeExposed) blockers.push("Fixture simulator must not expose an API v1 route.");
  if (scenario.databaseTouched) blockers.push("Fixture simulator must not touch a database.");
  if (scenario.providerCalled) blockers.push("Fixture simulator must not call a provider.");
}

function validateOperationAgainstPlan(
  fixtureOperation: ApiV1DurableFixtureOperation,
  plan: ApiV1DurableAdapterOperationPlan
): ApiV1DurableFixtureSimulationCase {
  const blockers: string[] = [];
  const observations: string[] = [];

  if (!sameSequence(fixtureOperation.observedReads, plan.reads)) {
    blockers.push(`${fixtureOperation.id} observed reads do not match the dormant operation plan.`);
  }
  if (!sameSequence(fixtureOperation.observedWrites, plan.writes)) {
    blockers.push(`${fixtureOperation.id} observed writes do not match the dormant operation plan.`);
  }

  if (!plan.transactionRequired && fixtureOperation.result !== "read_only") {
    blockers.push(`${fixtureOperation.id} should be read_only because the plan does not require a transaction.`);
  }
  if (plan.transactionRequired && fixtureOperation.result === "read_only") {
    blockers.push(`${fixtureOperation.id} cannot be read_only because the plan requires a transaction.`);
  }

  if (fixtureOperation.result === "committed" && !sameSequence(fixtureOperation.observedCommitOrder, plan.commitOrder)) {
    blockers.push(`${fixtureOperation.id} commit order does not match the dormant operation plan.`);
  }
  if (fixtureOperation.result === "rolled_back" && !sameSequence(fixtureOperation.observedRollbackOrder, plan.rollbackOrder)) {
    blockers.push(`${fixtureOperation.id} rollback order does not match the dormant operation plan.`);
  }
  if (fixtureOperation.result === "read_only" && !tableCountsMatch(fixtureOperation.before, fixtureOperation.after)) {
    blockers.push(`${fixtureOperation.id} changed table counts during a read-only operation.`);
  }
  if (fixtureOperation.result === "rolled_back" && !tableCountsMatch(fixtureOperation.before, fixtureOperation.after)) {
    blockers.push(`${fixtureOperation.id} leaked table-count changes after rollback.`);
  }

  const changed = changedTables(fixtureOperation.before, fixtureOperation.after);
  if (changed.some((table) => !plan.writes.includes(table))) {
    blockers.push(`${fixtureOperation.id} changed a table that is not declared as a write table.`);
  }
  if (fixtureOperation.result === "committed" && plan.operation === "append_audit_event") {
    const beforeAudit = countFor(fixtureOperation.before, "api_v1_audit_events");
    const afterAudit = countFor(fixtureOperation.after, "api_v1_audit_events");
    if (afterAudit !== beforeAudit + 1) {
      blockers.push(`${fixtureOperation.id} must append exactly one audit event.`);
    }
  }
  if (fixtureOperation.result === "committed" && plan.operation === "record_quota_and_audit") {
    const beforeAudit = countFor(fixtureOperation.before, "api_v1_audit_events");
    const afterAudit = countFor(fixtureOperation.after, "api_v1_audit_events");
    const beforeQuotaRows = countFor(fixtureOperation.before, "api_v1_quota_months");
    const afterQuotaRows = countFor(fixtureOperation.after, "api_v1_quota_months");
    if (afterAudit !== beforeAudit + 1) {
      blockers.push(`${fixtureOperation.id} must append exactly one quota/audit event.`);
    }
    if (afterQuotaRows < beforeQuotaRows) {
      blockers.push(`${fixtureOperation.id} must not delete quota rows while recording quota and audit.`);
    }
  }

  observations.push(
    `reads=${fixtureOperation.observedReads.join(",") || "none"}`,
    `writes=${fixtureOperation.observedWrites.join(",") || "none"}`,
    `changed=${changed.join(",") || "none"}`,
    `unchangedOutsideWrites=${unchangedTables(fixtureOperation.before, fixtureOperation.after, plan.writes).join(",") || "none"}`
  );

  return {
    blockers,
    id: fixtureOperation.id,
    observations,
    operation: fixtureOperation.operation,
    passed: blockers.length === 0,
  };
}

export function simulateApiV1DurableFixtureScenario(
  scenario: ApiV1DurableFixtureScenario,
  interfaceSpec: ApiV1DormantDurableAdapterInterface = API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE
): ApiV1DurableFixtureSimulationReport {
  const boundaryBlockers: string[] = [];
  validateScenarioBoundary(scenario, boundaryBlockers);

  const interfaceReport = validateApiV1DormantDurableAdapterInterface(interfaceSpec);
  const cases: ApiV1DurableFixtureSimulationCase[] = [];

  if (boundaryBlockers.length > 0) {
    cases.push({
      blockers: boundaryBlockers,
      id: `${scenario.fixtureId}:boundary`,
      observations: [],
      operation: "resolve_consumer",
      passed: false,
    });
  }

  for (const fixtureOperation of scenario.operations) {
    const plan = findPlan(interfaceSpec, fixtureOperation.operation);
    if (plan === null) {
      cases.push({
        blockers: [`${fixtureOperation.id} has no matching dormant operation plan.`],
        id: fixtureOperation.id,
        observations: [],
        operation: fixtureOperation.operation,
        passed: false,
      });
      continue;
    }
    cases.push(validateOperationAgainstPlan(fixtureOperation, plan));
  }

  if (!interfaceReport.ok) {
    cases.push({
      blockers: interfaceReport.blockers,
      id: `${scenario.fixtureId}:interface`,
      observations: interfaceReport.checkedOperations,
      operation: "resolve_consumer",
      passed: false,
    });
  }

  return {
    boundary: {
      databaseTouched: false,
      executable: false,
      providerCalled: false,
      routeExposed: false,
    },
    cases,
    fixtureId: scenario.fixtureId,
    operationCount: scenario.operations.length,
    passed: cases.every((entry) => entry.passed),
    warnings: interfaceReport.warnings,
  };
}
