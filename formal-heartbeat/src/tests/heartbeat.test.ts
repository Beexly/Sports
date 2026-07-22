import { describe, expect, it } from "vitest";
import { makeEProcessConfig } from "../e-process.js";
import { projectWindow } from "../projection.js";
import { checkState, runHeartbeat, type InvariantName } from "../heartbeat.js";
import type { AbstractState } from "../abstract-state.js";
import type { ObservedWindow } from "../events.js";

/** A clean, spec-conformant window: an ambiguous hold stays HELD, budget in bounds. */
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
          status: "AMBIGUOUS",
          reservationState: "HELD", // held until trusted resolution -> conformant
          heldMinorUnits: 1,
        },
      ],
    },
    {
      invocationId: "inv-B",
      requestFingerprint: "fp-b",
      owner: "worker-2",
      attempts: [
        {
          attemptId: "att-B1",
          ordinal: 0,
          providerRequested: "openai:gpt",
          providerUsed: "openai:gpt",
          modelRequested: "gpt-y",
          modelResolved: "gpt-y",
          status: "SUCCEEDED",
          reservationState: "RECONCILED",
          heldMinorUnits: 1,
        },
      ],
    },
  ],
};

const cleanState = projectWindow(CLEAN_WINDOW);

describe("Formal Heartbeat — a clean window passes and does not burn budget", () => {
  it("no violations, budget not exhausted, wealth stays low", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.01 });
    const result = runHeartbeat([cleanState], cfg);
    expect(result.pass).toBe(true);
    expect(result.totalViolations).toBe(0);
    expect(result.budgetExhausted).toBe(false);
    // all-clean stream only lowers wealth
    expect(result.budgetWealth).toBeLessThan(1);
    // 9 invariants checked over 1 state (7 spec-derived + 2 batch1-ext runtime)
    expect(result.totalChecks).toBe(9);
  });

  it("stays clean over a long window of many clean states", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.01 });
    const window = Array.from({ length: 50 }, () => cleanState);
    const result = runHeartbeat(window, cfg);
    expect(result.pass).toBe(true);
    expect(result.budgetExhausted).toBe(false);
  });
});

// --------------------------------------------------------------------------
// Synthetic invariant violations — each must be DETECTED (not enforced).
// --------------------------------------------------------------------------

function mutate(base: AbstractState, patch: Partial<AbstractState>): AbstractState {
  return { ...base, ...patch };
}

describe("Formal Heartbeat — detects each synthetic invariant violation", () => {
  const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 });

  it("detects AmbiguousExposureHeldUntilTrustedResolution: ambiguous hold released without trusted actor", () => {
    // att-A1 is Ambiguous; force it RELEASED with a clean-failure reason (no trusted resolution).
    const bad = mutate(cleanState, {
      state: { ...cleanState.state, "att-A1": "RELEASED" },
      releaseReason: { ...cleanState.releaseReason, "att-A1": "CleanFailure" },
    });
    const report = checkState(bad, 0);
    const v = report.violations.find(
      (c) => c.invariant === "AmbiguousExposureHeldUntilTrustedResolution",
    );
    expect(v).toBeDefined();
    expect(v?.detail).toContain("att-A1");
  });

  it("detects ReservedNeverExceedsBudgetWindowCap and AvailableBudgetNeverNegative", () => {
    const bad = mutate(cleanState, { reserved: 99 });
    const names = checkState(bad, 0).violations.map((c) => c.invariant);
    expect(names).toContain<InvariantName>("ReservedNeverExceedsBudgetWindowCap");
    expect(names).toContain<InvariantName>("AvailableBudgetNeverNegative");
    expect(names).toContain<InvariantName>("BaseLedgerNeverExceedsBalance");
  });

  it("detects NoDispatchWithoutExposureHold: dispatched but REFUSED", () => {
    const bad = mutate(cleanState, {
      dispatched: { ...cleanState.dispatched, "att-B1": true },
      state: { ...cleanState.state, "att-B1": "REFUSED" },
    });
    const v = checkState(bad, 0).violations.find(
      (c) => c.invariant === "NoDispatchWithoutExposureHold",
    );
    expect(v).toBeDefined();
    expect(v?.detail).toContain("att-B1");
  });

  it("detects BaseNeverOverAdmit: more committed holds than the cap allows", () => {
    // 4 committed holds * cost 1 > VerifiedBalance 3
    const bad = mutate(cleanState, {
      attempts: ["c1", "c2", "c3", "c4"],
      state: { c1: "HELD", c2: "HELD", c3: "HELD", c4: "SETTLED" },
      requestCost: 1,
      verifiedBalance: 3,
    });
    const v = checkState(bad, 0).violations.find(
      (c) => c.invariant === "BaseNeverOverAdmit",
    );
    expect(v).toBeDefined();
  });

  it("detects BaseAmbiguousAttemptStopsFallback: pending attempt under a frozen invocation", () => {
    const bad = mutate(cleanState, {
      invocationStatus: { ...cleanState.invocationStatus, "inv-A": "Ambiguous" },
      attempts: [...cleanState.attempts, "att-A2"],
      attemptOf: { ...cleanState.attemptOf, "att-A2": "inv-A" },
      attemptOutcome: { ...cleanState.attemptOutcome, "att-A2": "Pending" },
    });
    const v = checkState(bad, 0).violations.find(
      (c) => c.invariant === "BaseAmbiguousAttemptStopsFallback",
    );
    expect(v).toBeDefined();
    expect(v?.detail).toContain("att-A2");
  });
});

describe("Formal Heartbeat — violations drive the e-process toward reject (anytime-valid)", () => {
  it("a window full of violating states exhausts the SLO error budget", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 });
    // A state that violates the budget-cap invariants on every check.
    const violating = mutate(cleanState, { reserved: 1000 });
    const window = Array.from({ length: 20 }, () => violating);
    const result = runHeartbeat(window, cfg);
    expect(result.totalViolations).toBeGreaterThan(0);
    expect(result.budgetExhausted).toBe(true);
    expect(result.budgetWealth).toBeGreaterThanOrEqual(1 / cfg.alpha);
  });

  it("budget burn is monotonic: more violating states never lowers wealth or un-rejects", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.01 });
    const violating = mutate(cleanState, { reserved: 1000 });
    let prevWealth = 1;
    let everRejected = false;
    let budget = undefined as ReturnType<typeof runHeartbeat>["budget"] | undefined;
    for (let n = 1; n <= 15; n++) {
      const result = runHeartbeat([violating], cfg, budget);
      budget = result.budget;
      expect(result.budgetWealth).toBeGreaterThanOrEqual(prevWealth - 1e-9);
      prevWealth = result.budgetWealth;
      everRejected = everRejected || result.budgetExhausted;
      if (everRejected) expect(result.budgetExhausted).toBe(true); // sticky
    }
    expect(everRejected).toBe(true);
  });

  it("is monitoring-only: the input states are never mutated by a heartbeat run", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.05 });
    const snapshot = JSON.stringify(cleanState);
    runHeartbeat([cleanState, cleanState], cfg);
    expect(JSON.stringify(cleanState)).toBe(snapshot);
  });
});

// --------------------------------------------------------------------------
// EXTENSION invariant 1: NoSelfApproval
// (founder-command.ts FounderQueueDecision owner-vs-agent split +
//  PR #175 autonomy-ladder owner-only boundary)
// --------------------------------------------------------------------------

/** A window whose authority decision has a DISTINCT approver and grantee
 *  (an OWNER deciding on an agent's work item — the healthy case). */
const CLEAN_AUTHORITY_WINDOW: ObservedWindow = {
  ...CLEAN_WINDOW,
  authorityDecisions: [
    {
      decisionId: "dec-1",
      workItemId: "wi-1",
      decisionKind: "APPROVED",
      approverActorType: "OWNER",
      approverSubjectId: "owner:garrett",
      granteeSubjectId: "agent:nova",
    },
    {
      // ASSIGNED_TO_AGENT by owner to a different agent — still fine.
      decisionId: "dec-2",
      workItemId: "wi-2",
      decisionKind: "ASSIGNED_TO_AGENT",
      approverActorType: "OWNER",
      approverSubjectId: "owner:garrett",
      granteeSubjectId: "agent:jarvis",
      actionKind: "PRODUCTION_DEPLOY",
    },
  ],
};

describe("Formal Heartbeat — NoSelfApproval", () => {
  it("a window whose grants all have distinct approver/grantee passes", () => {
    const s = projectWindow(CLEAN_AUTHORITY_WINDOW);
    const v = checkState(s, 0).violations.find((c) => c.invariant === "NoSelfApproval");
    expect(v).toBeUndefined();
  });

  it("a non-conferring self-referential decision (ACKNOWLEDGED) is NOT flagged", () => {
    // ACKNOWLEDGED is not an authority grant, so approver == grantee is benign.
    const s = projectWindow({
      ...CLEAN_WINDOW,
      authorityDecisions: [
        {
          decisionId: "ack-1",
          workItemId: "wi-9",
          decisionKind: "ACKNOWLEDGED",
          approverActorType: "OWNER",
          approverSubjectId: "owner:garrett",
          granteeSubjectId: "owner:garrett",
        },
      ],
    });
    const v = checkState(s, 0).violations.find((c) => c.invariant === "NoSelfApproval");
    expect(v).toBeUndefined();
  });

  it("detects a self-approval: approver identity equals grantee on an APPROVED grant", () => {
    const s = projectWindow({
      ...CLEAN_WINDOW,
      authorityDecisions: [
        {
          decisionId: "dec-self",
          workItemId: "wi-self",
          decisionKind: "APPROVED",
          approverActorType: "SYSTEM",
          approverSubjectId: "agent:nova",
          granteeSubjectId: "agent:nova", // self-approval
          actionKind: "BILLING_CHANGE",
        },
      ],
    });
    const v = checkState(s, 0).violations.find((c) => c.invariant === "NoSelfApproval");
    expect(v).toBeDefined();
    expect(v?.detail).toContain("dec-self");
    expect(v?.detail).toContain("agent:nova");
    expect(v?.detail).toContain("self-approval");
  });

  it("a window of self-approvals drives the e-process toward reject", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.1 });
    const bad = projectWindow({
      ...CLEAN_WINDOW,
      authorityDecisions: [
        {
          decisionId: "dec-self",
          workItemId: "wi-self",
          decisionKind: "AUTONOMY_GRANT",
          approverActorType: "SYSTEM",
          approverSubjectId: "agent:nova",
          granteeSubjectId: "agent:nova",
        },
      ],
    });
    const window = Array.from({ length: 40 }, () => bad);
    const result = runHeartbeat(window, cfg);
    expect(result.totalViolations).toBeGreaterThanOrEqual(40);
    expect(result.budgetExhausted).toBe(true);
  });
});

// --------------------------------------------------------------------------
// EXTENSION invariant 2: OutboxDeliveryFailureCannotBecomeDelivered
// (settlement-outbox worker.ts delivery state machine, PR #161)
// --------------------------------------------------------------------------

/** A window with two well-behaved deliveries: one fails terminally and STAYS
 *  failed; one is delivered cleanly. Neither violates the invariant. */
const CLEAN_DELIVERY_WINDOW: ObservedWindow = {
  ...CLEAN_WINDOW,
  deliveryObservations: [
    { deliveryId: "evt1:u1:push:d1", status: "PENDING", sequence: 0 },
    { deliveryId: "evt1:u1:push:d1", status: "CLAIMED", sequence: 1 },
    { deliveryId: "evt1:u1:push:d1", status: "PERMANENT_FAILED", sequence: 2 },
    { deliveryId: "evt1:u2:email:d2", status: "PENDING", sequence: 0 },
    { deliveryId: "evt1:u2:email:d2", status: "CLAIMED", sequence: 1 },
    { deliveryId: "evt1:u2:email:d2", status: "DELIVERED", sequence: 2 },
  ],
};

describe("Formal Heartbeat — OutboxDeliveryFailureCannotBecomeDelivered", () => {
  it("a window where failed deliveries stay failed passes", () => {
    const s = projectWindow(CLEAN_DELIVERY_WINDOW);
    const v = checkState(s, 0).violations.find(
      (c) => c.invariant === "OutboxDeliveryFailureCannotBecomeDelivered",
    );
    expect(v).toBeUndefined();
  });

  it("DELIVERED then a later PERMANENT_FAILED for a DIFFERENT subject is not a violation", () => {
    // Ordering matters per-subject: this exercises that grouping is per delivery.
    const s = projectWindow({
      ...CLEAN_WINDOW,
      deliveryObservations: [
        { deliveryId: "a", status: "DELIVERED", sequence: 5 },
        { deliveryId: "b", status: "PERMANENT_FAILED", sequence: 9 },
      ],
    });
    const v = checkState(s, 0).violations.find(
      (c) => c.invariant === "OutboxDeliveryFailureCannotBecomeDelivered",
    );
    expect(v).toBeUndefined();
  });

  it("detects a terminal-failure → DELIVERED transition for one subject", () => {
    const s = projectWindow({
      ...CLEAN_WINDOW,
      deliveryObservations: [
        { deliveryId: "evt1:u1:push:d1", status: "CLAIMED", sequence: 0 },
        { deliveryId: "evt1:u1:push:d1", status: "DEAD_LETTER", sequence: 1 },
        { deliveryId: "evt1:u1:push:d1", status: "DELIVERED", sequence: 2 },
      ],
    });
    const v = checkState(s, 0).violations.find(
      (c) => c.invariant === "OutboxDeliveryFailureCannotBecomeDelivered",
    );
    expect(v).toBeDefined();
    expect(v?.detail).toContain("evt1:u1:push:d1");
    expect(v?.detail).toContain("DEAD_LETTER");
    expect(v?.detail).toContain("DELIVERED");
  });

  it("detection is order-driven: it uses `sequence`, not observation array order", () => {
    // Feed the DELIVERED row BEFORE the failure row in the array, but the
    // failure has a LOWER sequence — still a violation once ordered.
    const s = projectWindow({
      ...CLEAN_WINDOW,
      deliveryObservations: [
        { deliveryId: "x", status: "DELIVERED", sequence: 3 },
        { deliveryId: "x", status: "PERMANENT_FAILED", sequence: 1 },
      ],
    });
    const v = checkState(s, 0).violations.find(
      (c) => c.invariant === "OutboxDeliveryFailureCannotBecomeDelivered",
    );
    expect(v).toBeDefined();
    expect(v?.detail).toContain("PERMANENT_FAILED");
  });

  it("a window of failure→delivered subjects drives the e-process toward reject", () => {
    const cfg = makeEProcessConfig({ nullRate: 0.05, alpha: 0.1 });
    const bad = projectWindow({
      ...CLEAN_WINDOW,
      deliveryObservations: [
        { deliveryId: "d", status: "DEAD_LETTER", sequence: 0 },
        { deliveryId: "d", status: "DELIVERED", sequence: 1 },
      ],
    });
    const window = Array.from({ length: 40 }, () => bad);
    const result = runHeartbeat(window, cfg);
    expect(result.totalViolations).toBeGreaterThanOrEqual(40);
    expect(result.budgetExhausted).toBe(true);
  });
});
