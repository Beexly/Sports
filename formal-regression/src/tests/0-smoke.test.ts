import { describe, expect, it } from "vitest";
import { createPgControlStore } from "../../../../../wt/pr163/apps/web/lib/ai-control-plane/control-store";
import { createPgCreditAuthorizationPort } from "../../../../../wt/prd/apps/web/lib/ai-control-plane/credit-admission";
import { InMemoryControlSql } from "../adapters/in-memory-control-sql";
import { InMemoryCreditLedgerDb } from "../adapters/in-memory-credit-ledger";
import { FixtureCreditSnapshotStore, FIXTURE_SCOPE } from "../adapters/fixture-credit-snapshot-store";

describe("smoke: real modules import and basic happy path works", () => {
  it("claimInvocation acquires then finalizes via the REAL control-store.ts", async () => {
    const sql = new InMemoryControlSql();
    const store = createPgControlStore(sql);
    const now = new Date("2026-07-22T00:00:00.000Z");
    const outcome = await store.claimInvocation({
      invocationId: "inv-1",
      requestId: "req-1",
      taskClass: "task",
      surface: "s",
      entity: "e",
      dataClass: "d",
      costMode: "c",
      envClass: "prod",
      envClassSource: "x",
      policyVersion: "v1",
      actorType: "user",
      actorSubjectId: "u1",
      requestFingerprint: "fp1",
      ownerToken: "owner-1",
      leaseMs: 30_000,
      now,
    });
    expect(outcome.kind).toBe("ACQUIRED");
  });

  it("authorize() admits via the REAL credit-admission.ts", async () => {
    const now = new Date("2026-07-22T00:00:00.000Z");
    const ledger = new InMemoryCreditLedgerDb();
    const port = createPgCreditAuthorizationPort(ledger);
    const store = new FixtureCreditSnapshotStore("grant-1", 100, now);
    const decision = await port.authorize({
      store,
      scope: FIXTURE_SCOPE,
      worstCaseMinorUnits: 2,
      worstCaseCurrency: "USD",
      now,
      expiresAt: new Date(now.getTime() + 60_000),
      idFactory: () => "resv-1",
    });
    expect(decision.admitted).toBe(true);
  });
});
