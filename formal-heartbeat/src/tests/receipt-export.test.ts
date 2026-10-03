import { describe, expect, it } from "vitest";
import { makeEProcessConfig } from "../e-process.js";
import { projectWindow } from "../projection.js";
import { runHeartbeat } from "../heartbeat.js";
import type { ObservedWindow } from "../events.js";
import {
  InMemoryHeartbeatReceiptReader,
  toFormalHeartbeatReceipt,
  type FormalHeartbeatReceipt,
  type HeartbeatReceiptReader,
} from "../receipt-export.js";

const CLEAN_WINDOW: ObservedWindow = {
  verifiedBalanceMinorUnits: 3,
  requestCostMinorUnits: 1,
  trustedActors: ["ops-oncall"],
  invocations: [
    {
      invocationId: "inv-A",
      requestFingerprint: "fp-a",
      owner: "worker-1",
      attempts: [
        {
          attemptId: "att-A1",
          ordinal: 0,
          providerRequested: "anthropic:claude",
          providerUsed: "anthropic:claude",
          modelRequested: "claude-x",
          modelResolved: "claude-x",
          status: "SUCCEEDED",
          reservationState: "RECONCILED",
          heldMinorUnits: 1,
        },
      ],
    },
  ],
};

describe("receipt-export — read seam round-trips and is empty-safe", () => {
  it("returns null before any receipt is recorded", () => {
    const reader: HeartbeatReceiptReader = new InMemoryHeartbeatReceiptReader();
    expect(reader.latest()).toBeNull();
  });

  it("round-trips a receipt built from a clean heartbeat result", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 });
    const result = runHeartbeat([projectWindow(CLEAN_WINDOW)], cfg);
    const receipt = toFormalHeartbeatReceipt(result, {
      receiptId: "rcpt-1",
      generatedAtIso: "2026-07-22T00:00:00.000Z",
    });

    const store = new InMemoryHeartbeatReceiptReader();
    expect(store.latest()).toBeNull();
    store.record(receipt);

    const got = store.latest();
    expect(got).not.toBeNull();
    expect(got).toEqual(receipt);
    expect(got?.receiptId).toBe("rcpt-1");
    expect(got?.pass).toBe(true);
    expect(got?.totalViolations).toBe(0);
    expect(got?.violatedInvariants).toEqual([]);
    // 9 invariants over 1 clean state.
    expect(got?.totalChecks).toBe(9);
    expect(got?.observationCount).toBe(9);
    expect(got?.invariantsChecked).toContain("NoSelfApproval");
    expect(got?.invariantsChecked).toContain("OutboxDeliveryFailureCannotBecomeDelivered");
    expect(got?.budgetExhausted).toBe(false);
  });

  it("a later record() replaces the latest receipt (most-recent wins)", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 });
    const clean = toFormalHeartbeatReceipt(
      runHeartbeat([projectWindow(CLEAN_WINDOW)], cfg),
      { receiptId: "rcpt-clean", generatedAtIso: "2026-07-22T00:00:00.000Z" },
    );

    // A window with a self-approval → a receipt that reports the violation.
    const violatingResult = runHeartbeat(
      [
        projectWindow({
          ...CLEAN_WINDOW,
          authorityDecisions: [
            {
              decisionId: "dec-self",
              workItemId: "wi",
              decisionKind: "APPROVED",
              approverActorType: "SYSTEM",
              approverSubjectId: "agent:nova",
              granteeSubjectId: "agent:nova",
            },
          ],
        }),
      ],
      cfg,
    );
    const violating = toFormalHeartbeatReceipt(violatingResult, {
      receiptId: "rcpt-bad",
      generatedAtIso: "2026-07-22T01:00:00.000Z",
    });

    const store = new InMemoryHeartbeatReceiptReader();
    store.record(clean);
    expect(store.latest()?.receiptId).toBe("rcpt-clean");
    store.record(violating);
    const got: FormalHeartbeatReceipt | null = store.latest();
    expect(got?.receiptId).toBe("rcpt-bad");
    expect(got?.pass).toBe(false);
    expect(got?.violatedInvariants).toEqual(["NoSelfApproval"]);
  });
});
