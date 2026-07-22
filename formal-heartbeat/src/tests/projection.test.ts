import { describe, expect, it } from "vitest";
import { emitConstInit, projectWindow } from "../projection.js";
import type { ObservedWindow } from "../events.js";

/**
 * A realistic window of observed control-plane records exercising every branch:
 *  - inv-A: dispatched attempt whose provider outcome is Ambiguous, credit HELD
 *  - inv-B: clean Succeeded attempt, credit reconciled (SETTLED), plus a
 *           rejected conflicting fingerprint
 *  - inv-C: Failed attempt, credit RELEASED as a clean failure
 */
const WINDOW: ObservedWindow = {
  verifiedBalanceMinorUnits: 3,
  requestCostMinorUnits: 1,
  trustedActors: ["ops-oncall"],
  invocations: [
    {
      invocationId: "inv-A",
      requestFingerprint: "fp-alpha",
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
          reservationState: "HELD",
          heldMinorUnits: 1,
        },
      ],
    },
    {
      invocationId: "inv-B",
      requestFingerprint: "fp-bravo",
      owner: null,
      rejectedFingerprints: ["fp-conflict"],
      attempts: [
        {
          attemptId: "att-B1",
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
    {
      invocationId: "inv-C",
      requestFingerprint: "fp-gamma",
      owner: "worker-2",
      attempts: [
        {
          attemptId: "att-C1",
          ordinal: 0,
          providerRequested: "openai:gpt",
          providerUsed: "openai:gpt",
          modelRequested: "gpt-y",
          modelResolved: "gpt-y",
          status: "FAILED",
          reservationState: "RELEASED",
          heldMinorUnits: 1,
        },
      ],
    },
  ],
};

describe("projectWindow — maps real records onto the spec variables", () => {
  const s = projectWindow(WINDOW);

  it("projects attempt outcomes per the AiAttemptSummary.status mapping", () => {
    expect(s.attemptOutcome["att-A1"]).toBe("Ambiguous"); // AMBIGUOUS
    expect(s.attemptOutcome["att-B1"]).toBe("Succeeded");
    expect(s.attemptOutcome["att-C1"]).toBe("Failed");
  });

  it("projects credit reservation states (RECONCILED -> SETTLED)", () => {
    expect(s.state["att-A1"]).toBe("HELD");
    expect(s.state["att-B1"]).toBe("SETTLED");
    expect(s.state["att-C1"]).toBe("RELEASED");
  });

  it("computes reserved as HELD+SETTLED holds and admittedCount as ever-admitted", () => {
    // HELD (A1) + SETTLED (B1) = 2 held; C1 RELEASED does not count toward reserved
    expect(s.reserved).toBe(2);
    // A1 HELD, B1 SETTLED, C1 RELEASED are all "ever admitted"
    expect(s.admittedCount).toBe(3);
  });

  it("derives invocationStatus (Ambiguous freezes, Succeeded terminal, Failed open)", () => {
    expect(s.invocationStatus["inv-A"]).toBe("Ambiguous");
    expect(s.invocationStatus["inv-B"]).toBe("Terminal");
    expect(s.invocationStatus["inv-C"]).toBe("Open");
  });

  it("projects claim ownership and the NoOwner sentinel", () => {
    expect(s.claimOwner["inv-A"]).toBe("worker-1");
    expect(s.claimOwner["inv-B"]).toBe("NoOwner");
  });

  it("projects rejectedRequests pairs", () => {
    expect(s.rejectedRequests).toContainEqual(["inv-B", "fp-conflict"]);
  });

  it("infers releaseReason (clean failure) for a Failed+RELEASED attempt", () => {
    expect(s.releaseReason["att-C1"]).toBe("CleanFailure");
    expect(s.releaseBy["att-C1"]).toBe("NoOwner");
  });

  it("marks dispatched from providerUsed != null", () => {
    expect(s.dispatched["att-A1"]).toBe(true);
  });

  it("collects deterministic, sorted universe sets", () => {
    expect(s.invocations).toEqual(["inv-A", "inv-B", "inv-C"]);
    expect(s.attempts).toEqual(["att-A1", "att-B1", "att-C1"]);
    expect(s.actors).toContain("ops-oncall");
    expect([...s.actors]).toEqual([...s.actors].sort());
  });

  it("carries the budget-window constants", () => {
    expect(s.verifiedBalance).toBe(3);
    expect(s.requestCost).toBe(1);
    expect(s.trustedActors).toEqual(["ops-oncall"]);
  });
});

describe("projectWindow — trusted ambiguous release", () => {
  it("marks a trusted-actor ambiguous resolution with TrustedAmbiguousResolution", () => {
    const w: ObservedWindow = {
      verifiedBalanceMinorUnits: 2,
      requestCostMinorUnits: 1,
      trustedActors: ["ops-oncall"],
      invocations: [
        {
          invocationId: "inv-X",
          requestFingerprint: "fp-x",
          owner: "worker-9",
          attempts: [
            {
              attemptId: "att-X1",
              ordinal: 0,
              providerRequested: "anthropic:claude",
              providerUsed: "anthropic:claude",
              modelRequested: "claude-x",
              modelResolved: "claude-x",
              status: "TIMEOUT", // -> Ambiguous
              reservationState: "RELEASED",
              releasedByActor: "ops-oncall",
            },
          ],
        },
      ],
    };
    const s = projectWindow(w);
    expect(s.attemptOutcome["att-X1"]).toBe("Ambiguous");
    expect(s.state["att-X1"]).toBe("RELEASED");
    expect(s.releaseReason["att-X1"]).toBe("TrustedAmbiguousResolution");
    expect(s.releaseBy["att-X1"]).toBe("ops-oncall");
  });
});

describe("projectWindow — extension observation streams", () => {
  it("defaults the extension streams to empty arrays when absent", () => {
    const s = projectWindow(WINDOW);
    expect(s.authorityDecisions).toEqual([]);
    expect(s.deliveryObservations).toEqual([]);
  });

  it("projects authority decisions 1:1, sorted by decisionId, actionKind defaulting null", () => {
    const s = projectWindow({
      ...WINDOW,
      authorityDecisions: [
        {
          decisionId: "dec-b",
          workItemId: "wi-2",
          decisionKind: "ASSIGNED_TO_AGENT",
          approverActorType: "OWNER",
          approverSubjectId: "owner:g",
          granteeSubjectId: "agent:x",
          actionKind: "PRODUCTION_DEPLOY",
        },
        {
          decisionId: "dec-a",
          workItemId: "wi-1",
          decisionKind: "APPROVED",
          approverActorType: "OWNER",
          approverSubjectId: "owner:g",
          granteeSubjectId: "agent:y",
        },
      ],
    });
    expect(s.authorityDecisions.map((d) => d.decisionId)).toEqual(["dec-a", "dec-b"]);
    expect(s.authorityDecisions[0]?.approver).toBe("owner:g");
    expect(s.authorityDecisions[0]?.grantee).toBe("agent:y");
    expect(s.authorityDecisions[0]?.actionKind).toBeNull();
    expect(s.authorityDecisions[1]?.actionKind).toBe("PRODUCTION_DEPLOY");
  });

  it("projects delivery observations sorted by (deliveryId, sequence)", () => {
    const s = projectWindow({
      ...WINDOW,
      deliveryObservations: [
        { deliveryId: "d2", status: "DELIVERED", sequence: 1 },
        { deliveryId: "d1", status: "CLAIMED", sequence: 1 },
        { deliveryId: "d1", status: "PENDING", sequence: 0 },
      ],
    });
    expect(
      s.deliveryObservations.map((o) => `${o.deliveryId}@${o.sequence}`),
    ).toEqual(["d1@0", "d1@1", "d2@1"]);
  });

  it("is deterministic on the extension streams (same input -> equal output)", () => {
    const w: ObservedWindow = {
      ...WINDOW,
      authorityDecisions: [
        {
          decisionId: "dec-a",
          workItemId: "wi-1",
          decisionKind: "APPROVED",
          approverActorType: "OWNER",
          approverSubjectId: "owner:g",
          granteeSubjectId: "agent:y",
        },
      ],
      deliveryObservations: [{ deliveryId: "d1", status: "DELIVERED", sequence: 0 }],
    };
    expect(JSON.stringify(projectWindow(w))).toBe(JSON.stringify(projectWindow(w)));
  });
});

describe("emitConstInit — deterministic, valid TLA+ ConstInit fragment", () => {
  it("projecting twice yields byte-identical ConstInit output", () => {
    const a = emitConstInit(projectWindow(WINDOW));
    const b = emitConstInit(projectWindow(WINDOW));
    expect(a).toBe(b);
  });

  it("emits CONSTANTS, a ConstInit operator, a legend, and all 12 spec variables", () => {
    const out = emitConstInit(projectWindow(WINDOW));
    expect(out).toContain("CONSTANTS");
    expect(out).toContain("ConstInit ==");
    expect(out).toContain("LEGEND");
    for (const v of [
      "claimOwner",
      "invocationFp",
      "dispatched",
      "attemptOf",
      "attemptOutcome",
      "invocationStatus",
      "rejectedRequests",
      "reserved",
      "state",
      "admittedCount",
      "releaseReason",
      "releaseBy",
    ]) {
      expect(out).toContain(`/\\ ${v} =`);
    }
  });

  it("renames observed ids to symbolic TLA+ model values and keeps sentinels as strings", () => {
    const out = emitConstInit(projectWindow(WINDOW));
    expect(out).toContain("Invocations = {inv1, inv2, inv3}");
    expect(out).toContain("Attempts = {att1, att2, att3}");
    expect(out).toContain('"NoOwner"'); // inv-B has no owner
    expect(out).toMatch(/TrustedActors = \{act\d\}/);
    // budget constants rendered as integers
    expect(out).toContain("VerifiedBalance = 3");
    expect(out).toContain("RequestCost = 1");
  });

  it("renders function-literal DOMAIN keys as symbolic model values, never raw ids", () => {
    const out = emitConstInit(projectWindow(WINDOW));
    // Raw observed ids (with hyphens) are invalid TLA+ identifiers and must
    // never appear as a function-literal key `<id> :>` (regression guard).
    expect(out).not.toMatch(/inv-[A-Z]\s*:>/);
    expect(out).not.toMatch(/att-[A-Z0-9]+\s*:>/);
    // Symbolic keys DO appear.
    expect(out).toMatch(/att1 :> /);
    expect(out).toMatch(/inv1 :> /);
  });

  it("handles an empty window without producing invalid TLA+", () => {
    const empty = projectWindow({
      verifiedBalanceMinorUnits: 0,
      requestCostMinorUnits: 1,
      trustedActors: [],
      invocations: [],
    });
    const out = emitConstInit(empty);
    expect(out).toContain("Invocations = {}");
    expect(out).toContain("[ x \\in {} |-> FALSE ]"); // empty function literal
  });
});
