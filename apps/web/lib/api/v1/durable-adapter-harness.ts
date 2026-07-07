import type { ApiV1AuditEvent } from "./audit-ledger";
import type { ApiV1ShadowConsumerRecord } from "./consumer-registry";
import {
  createApiV1MemoryPersistenceStore,
  type ApiV1AuditAppendInput,
  type ApiV1PersistenceAdapterKind,
  type ApiV1PersistenceSnapshot,
  type ApiV1QuotaAuditInput,
  type ApiV1QuotaAuditResult,
  type ApiV1ShadowPersistenceStore,
} from "./persistence";
import type { ApiV1ParsedCredential } from "./types";

export type ApiV1DurableAdapterFactoryInput = {
  readonly consumers?: readonly ApiV1ShadowConsumerRecord[];
  readonly auditLedger?: readonly ApiV1AuditEvent[];
};

export type ApiV1DurableAdapterFactory = (
  input?: ApiV1DurableAdapterFactoryInput
) => ApiV1ShadowPersistenceStore;

export type ApiV1DurableAdapterConformanceFixture = {
  readonly consumer: ApiV1ShadowConsumerRecord;
  readonly validCredential: ApiV1ParsedCredential;
  readonly invalidCredential: ApiV1ParsedCredential;
  readonly now: string;
};

export type ApiV1DurableAdapterConformanceCase = {
  readonly name: string;
  readonly passed: boolean;
  readonly observations: readonly string[];
  readonly error: string | null;
};

export type ApiV1DurableAdapterConformanceReport = {
  readonly adapterName: string;
  readonly passed: boolean;
  readonly cases: readonly ApiV1DurableAdapterConformanceCase[];
  readonly requiredBehaviors: readonly string[];
};

export type ApiV1PersistenceSummary = {
  readonly consumerCount: number;
  readonly auditEventCount: number;
  readonly auditTipHash: string | null;
  readonly totalUsedThisMonth: number;
};

export type ApiV1MockTransactionOperation =
  | "append_audit_event"
  | "put_consumer"
  | "record_quota_and_audit";

export type ApiV1MockTransactionStatus = "committed" | "rolled_back";

export type ApiV1MockTransactionRecord = {
  readonly sequence: number;
  readonly operation: ApiV1MockTransactionOperation;
  readonly status: ApiV1MockTransactionStatus;
  readonly reason: string | null;
  readonly before: ApiV1PersistenceSummary;
  readonly staged: ApiV1PersistenceSummary;
  readonly after: ApiV1PersistenceSummary;
};

export type ApiV1MockTransactionalPersistenceStore = ApiV1ShadowPersistenceStore & {
  readonly kind: "planned_durable_store";
  readonly transactionMode: "mocked_atomic";
  readonly injectNextCommitFailure: (reason: string) => void;
  readonly transactionLog: () => readonly ApiV1MockTransactionRecord[];
};

const REQUIRED_BEHAVIORS = [
  "validates the seeded consumer registry and audit ledger",
  "increments quota usage exactly once on allowed requests",
  "appends one allow audit event for allowed requests",
  "appends one deny audit event for rejected requests",
  "does not increment quota usage for rejected requests",
  "records quota exhaustion as a denial with consumer context",
  "preserves a valid hash-chained audit ledger",
] as const;

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function quotaAuditInput(input: {
  readonly credential: ApiV1ParsedCredential;
  readonly eventId: string;
  readonly now: string;
}): ApiV1QuotaAuditInput {
  return {
    credential: input.credential,
    eventId: input.eventId,
    occurredAt: input.now,
    payload: {
      decision: "allow",
      endpointId: "evidence.record.read",
      reasonCodes: [],
      sourceIds: ["nflverse"],
    },
    now: input.now,
  };
}

function summarize(snapshot: ApiV1PersistenceSnapshot): ApiV1PersistenceSummary {
  return {
    auditEventCount: snapshot.auditLedger.length,
    auditTipHash: snapshot.auditReport.tipHash,
    consumerCount: snapshot.consumers.length,
    totalUsedThisMonth: snapshot.consumers.reduce((total, consumer) => total + consumer.usedThisMonth, 0),
  };
}

function withAdapterKind(
  snapshot: ApiV1PersistenceSnapshot,
  adapterKind: ApiV1PersistenceAdapterKind
): ApiV1PersistenceSnapshot {
  return {
    ...snapshot,
    adapterKind,
  };
}

function withResultAdapterKind(
  result: ApiV1QuotaAuditResult,
  adapterKind: ApiV1PersistenceAdapterKind
): ApiV1QuotaAuditResult {
  return {
    ...result,
    snapshot: withAdapterKind(result.snapshot, adapterKind),
  };
}

function runCase(
  name: string,
  evaluate: () => readonly string[]
): ApiV1DurableAdapterConformanceCase {
  try {
    return {
      error: null,
      name,
      observations: evaluate(),
      passed: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      name,
      observations: [],
      passed: false,
    };
  }
}

export function runApiV1DurableAdapterConformanceSuite(input: {
  readonly adapterName: string;
  readonly createStore: ApiV1DurableAdapterFactory;
  readonly fixture: ApiV1DurableAdapterConformanceFixture;
}): ApiV1DurableAdapterConformanceReport {
  const { adapterName, createStore, fixture } = input;

  const cases = [
    runCase("seeded state validates", () => {
      const store = createStore({ consumers: [fixture.consumer] });
      const snapshot = store.snapshot();
      requireCondition(snapshot.registryReport.ok, "Registry report must be valid.");
      requireCondition(snapshot.auditReport.valid, "Audit report must be valid.");
      requireCondition(snapshot.consumers.length === 1, "Exactly one seeded consumer should exist.");
      return [`adapter=${snapshot.adapterKind}`, `consumers=${snapshot.consumers.length}`];
    }),
    runCase("allowed request increments quota and appends allow audit", () => {
      const store = createStore({ consumers: [fixture.consumer] });
      const beforeUsed = store.listConsumers()[0]?.usedThisMonth ?? -1;
      const result = store.recordQuotaAndAudit(
        quotaAuditInput({ credential: fixture.validCredential, eventId: "evt_conformance_allow", now: fixture.now })
      );
      if (!result.ok) throw new Error(`Allowed request should pass: ${result.code}`);
      requireCondition(result.consumer.usedThisMonth === beforeUsed + 1, "Usage must increment exactly once.");
      requireCondition(result.auditEvent.type === "request_allowed", "Allow request must append request_allowed.");
      requireCondition(result.snapshot.auditLedger.length === 1, "Exactly one audit event should be present.");
      requireCondition(result.snapshot.auditReport.valid, "Audit chain must remain valid.");
      return [`used=${result.consumer.usedThisMonth}`, `quotaAfter=${result.quotaRemainingAfter}`];
    }),
    runCase("unknown credential appends deny without usage increment", () => {
      const store = createStore({ consumers: [fixture.consumer] });
      const beforeUsed = store.listConsumers()[0]?.usedThisMonth ?? -1;
      const result = store.recordQuotaAndAudit(
        quotaAuditInput({ credential: fixture.invalidCredential, eventId: "evt_conformance_deny", now: fixture.now })
      );
      requireCondition(!result.ok, "Unknown credential should fail closed.");
      requireCondition(result.auditEvent.type === "request_denied", "Denied request must append request_denied.");
      requireCondition(store.listConsumers()[0]?.usedThisMonth === beforeUsed, "Denied request must not use quota.");
      requireCondition(result.snapshot.auditLedger.length === 1, "Denied request should still be audited.");
      return [`code=${result.ok ? "unexpected-ok" : result.code}`, `used=${beforeUsed}`];
    }),
    runCase("quota exhaustion denies with consumer context", () => {
      const exhausted = {
        ...fixture.consumer,
        usedThisMonth: fixture.consumer.monthlyQuota,
      };
      const store = createStore({ consumers: [exhausted] });
      const result = store.recordQuotaAndAudit(
        quotaAuditInput({ credential: fixture.validCredential, eventId: "evt_conformance_quota", now: fixture.now })
      );
      requireCondition(!result.ok, "Exhausted quota should fail closed.");
      requireCondition(result.consumer?.consumerId === fixture.consumer.consumerId, "Quota denial should keep consumer.");
      requireCondition(result.auditEvent.payload.consumerId === fixture.consumer.consumerId, "Audit must name consumer.");
      requireCondition(result.auditEvent.payload.reasonCodes.includes("quota-exhausted"), "Audit must include quota code.");
      return [`code=${result.ok ? "unexpected-ok" : result.code}`, `quota=${result.quotaRemainingAfter}`];
    }),
    runCase("hash chain remains valid across multiple writes", () => {
      const generous = {
        ...fixture.consumer,
        monthlyQuota: Math.max(fixture.consumer.monthlyQuota, fixture.consumer.usedThisMonth + 3),
      };
      const store = createStore({ consumers: [generous] });
      store.recordQuotaAndAudit(
        quotaAuditInput({ credential: fixture.validCredential, eventId: "evt_conformance_chain_1", now: fixture.now })
      );
      const result = store.recordQuotaAndAudit(
        quotaAuditInput({ credential: fixture.validCredential, eventId: "evt_conformance_chain_2", now: fixture.now })
      );
      requireCondition(result.snapshot.auditReport.valid, "Audit ledger must verify after two writes.");
      requireCondition(result.snapshot.auditLedger.length === 2, "Two writes should produce two audit events.");
      requireCondition(
        result.snapshot.auditLedger[1]?.previousHash === result.snapshot.auditLedger[0]?.hash,
        "Second event must point at first event hash."
      );
      return [`events=${result.snapshot.auditLedger.length}`, `tip=${result.snapshot.auditReport.tipHash ?? "none"}`];
    }),
  ];

  return {
    adapterName,
    cases,
    passed: cases.every((entry) => entry.passed),
    requiredBehaviors: REQUIRED_BEHAVIORS,
  };
}

export function createApiV1MockTransactionalPersistenceStore(
  input: ApiV1DurableAdapterFactoryInput = {}
): ApiV1MockTransactionalPersistenceStore {
  const kind = "planned_durable_store" as const;
  let committed = createApiV1MemoryPersistenceStore(input);
  let nextCommitFailure: string | null = null;
  const transactions: ApiV1MockTransactionRecord[] = [];

  function snapshot(): ApiV1PersistenceSnapshot {
    return withAdapterKind(committed.snapshot(), kind);
  }

  function workingStore(): ApiV1ShadowPersistenceStore {
    return createApiV1MemoryPersistenceStore({
      auditLedger: committed.readAuditLedger(),
      consumers: committed.listConsumers(),
    });
  }

  function replaceCommitted(working: ApiV1ShadowPersistenceStore): void {
    committed = createApiV1MemoryPersistenceStore({
      auditLedger: working.readAuditLedger(),
      consumers: working.listConsumers(),
    });
  }

  function completeTransaction(
    operation: ApiV1MockTransactionOperation,
    before: ApiV1PersistenceSummary,
    working: ApiV1ShadowPersistenceStore
  ): void {
    const staged = summarize(working.snapshot());
    const failure = nextCommitFailure;
    nextCommitFailure = null;

    if (failure !== null) {
      transactions.push({
        after: before,
        before,
        operation,
        reason: failure,
        sequence: transactions.length + 1,
        staged,
        status: "rolled_back",
      });
      throw new Error(`API v1 mock transaction rolled back: ${failure}`);
    }

    replaceCommitted(working);
    transactions.push({
      after: summarize(committed.snapshot()),
      before,
      operation,
      reason: null,
      sequence: transactions.length + 1,
      staged,
      status: "committed",
    });
  }

  return {
    appendAuditEvent: (event: ApiV1AuditAppendInput): ApiV1PersistenceSnapshot => {
      const before = summarize(committed.snapshot());
      const working = workingStore();
      working.appendAuditEvent(event);
      completeTransaction("append_audit_event", before, working);
      return snapshot();
    },
    injectNextCommitFailure: (reason: string): void => {
      nextCommitFailure = reason.trim().length === 0 ? "unspecified commit failure" : reason;
    },
    kind,
    listConsumers: () => committed.listConsumers(),
    putConsumer: (consumer: ApiV1ShadowConsumerRecord): ApiV1PersistenceSnapshot => {
      const before = summarize(committed.snapshot());
      const working = workingStore();
      working.putConsumer(consumer);
      completeTransaction("put_consumer", before, working);
      return snapshot();
    },
    readAuditLedger: () => committed.readAuditLedger(),
    recordQuotaAndAudit: (record: ApiV1QuotaAuditInput): ApiV1QuotaAuditResult => {
      const before = summarize(committed.snapshot());
      const working = workingStore();
      const result = working.recordQuotaAndAudit(record);
      completeTransaction("record_quota_and_audit", before, working);
      return withResultAdapterKind(result, kind);
    },
    resolveConsumer: (credential: ApiV1ParsedCredential, now?: string) => committed.resolveConsumer(credential, now),
    snapshot,
    transactionLog: () => transactions.map((transaction) => ({ ...transaction })),
    transactionMode: "mocked_atomic",
  };
}
