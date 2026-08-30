/**
 * Track A (exactly-once runtime handoff 2026-07-22) — pure unit tests for the
 * SRQC projection stub (the seed of α). No database: the projection is a pure
 * fold over synthetic, CTI-shaped ledger-event windows.
 *
 * The load-bearing property here is CTI detectability: a window in which two
 * attempts are concurrently PENDING on the SAME invocation must project to
 * `pendingCountClass === "GE2"` — it must NOT be silently normalized to a
 * clean state. That two-Pending shape is exactly inductive CTI #1 for
 * InvocationClaim (`AtMostOnePendingPerInvocation`); the whole reason this
 * projection surface exists is so a future certificate can WITNESS it if the
 * runtime ever produced it.
 */
import { describe, it, expect } from "vitest";
import {
  projectWindow,
  admitUnderSRQC,
  evaluateSrqcAdmissionForLab,
  resolveSrqcModeFromEnv,
  type ProjectableEvent,
} from "@/lib/ai-control-plane/srqc-projection";

function started(invocationId: string, attemptId: string): ProjectableEvent {
  return {
    eventType: "ATTEMPT_STARTED",
    source: "ai_attempt",
    sourceId: attemptId,
    payload: { invocationId, attemptId, status: "DISPATCHED" },
  };
}

function attemptFailed(invocationId: string, attemptId: string): ProjectableEvent {
  return {
    eventType: "ATTEMPT_FAILED",
    source: "ai_attempt",
    sourceId: attemptId,
    payload: { invocationId, attemptId, status: "FAILED" },
  };
}

function finalized(
  invocationId: string,
  eventType:
    | "FINALIZED_SUCCESS"
    | "FINALIZED_FAILED"
    | "FINALIZED_AMBIGUOUS"
    | "FINALIZED_BUDGET_BLOCKED"
    | "FINALIZED_POLICY_BLOCKED",
): ProjectableEvent {
  return {
    eventType,
    source: "ai_invocation",
    sourceId: invocationId,
    payload: { invocationId },
  };
}

function finalizedSuccess(
  invocationId: string,
  attemptId?: string,
): ProjectableEvent {
  return {
    eventType: "FINALIZED_SUCCESS",
    source: "ai_invocation",
    sourceId: invocationId,
    payload: attemptId ? { invocationId, attemptId } : { invocationId },
  };
}

describe("SRQC projection stub (seed of α)", () => {
  it("an invocation with no attempts projects to ZERO pending, OPEN claim", () => {
    const states = projectWindow([]);
    expect(states).toHaveLength(0);
  });

  it("a single started, not-yet-terminal attempt → ONE pending, exposure HELD", () => {
    const states = projectWindow([started("inv-1", "att-1")]);
    expect(states).toHaveLength(1);
    expect(states[0]!.pendingCountClass).toBe("ONE");
    expect(states[0]!.claimPhase).toBe("OPEN");
    expect(states[0]!.exposurePhase).toBe("HELD");
  });

  it("a started attempt that then fails → ZERO pending", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      attemptFailed("inv-1", "att-1"),
    ]);
    expect(states[0]!.pendingCountClass).toBe("ZERO");
  });

  it("CTI #1: two attempts concurrently pending on ONE invocation → GE2 (must be detectable, not normalized)", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      started("inv-1", "att-2"), // second attempt started before the first resolved
    ]);
    expect(states).toHaveLength(1);
    expect(states[0]!.pendingCountClass).toBe("GE2");
  });

  it("sequential attempts (first resolves before second starts) is the LEGAL shape → never GE2", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      attemptFailed("inv-1", "att-1"),
      started("inv-1", "att-2"),
    ]);
    expect(states[0]!.pendingCountClass).toBe("ONE"); // att-2 pending, att-1 done
  });

  it("an AMBIGUOUS finalize projects to a held-until-trusted exposure and a terminal claim", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      finalized("inv-1", "FINALIZED_AMBIGUOUS"),
    ]);
    expect(states[0]!.claimPhase).toBe("TERMINAL");
    expect(states[0]!.exposurePhase).toBe("AMBIGUOUS_HELD");
  });

  it("a clean success finalize releases the abstract exposure", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      attemptFailed("inv-1", "att-1"),
      finalized("inv-1", "FINALIZED_SUCCESS"),
    ]);
    expect(states[0]!.claimPhase).toBe("TERMINAL");
    expect(states[0]!.exposurePhase).toBe("NONE");
  });

  it("events for different invocations are projected independently", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      started("inv-2", "att-2"),
      started("inv-2", "att-3"), // inv-2 has two pending; inv-1 has one
    ]);
    const byId = new Map(states.map((s) => [s.invocationId, s]));
    expect(byId.get("inv-1")!.pendingCountClass).toBe("ONE");
    expect(byId.get("inv-2")!.pendingCountClass).toBe("GE2");
  });

  it("admitUnderSRQC always ADMITs but surfaces a GE2 window as a violation (detection-only)", () => {
    const clean = admitUnderSRQC([started("inv-1", "att-1")]);
    expect(clean.decision).toBe("ADMIT");
    expect(clean.violations).toHaveLength(0);

    const cti = admitUnderSRQC([
      started("inv-1", "att-1"),
      started("inv-1", "att-2"),
    ]);
    expect(cti.decision).toBe("ADMIT"); // stub never refuses — no behavior change
    expect(cti.violations).toHaveLength(1);
    expect(cti.violations[0]!.pendingCountClass).toBe("GE2");
  });

  it("F5: a FINALIZED_FAILED (the REAL emitted failure event name) is terminal → claim TERMINAL, ZERO pending", () => {
    // control-store.ts's finalizeFailure emits `'FINALIZED_' || status` with
    // status=FAILED, so the real event name is FINALIZED_FAILED (not
    // FINALIZED_FAILURE). A window of ATTEMPT_STARTED + FINALIZED_FAILED for a
    // failed-then-terminalized attempt must project TERMINAL / ZERO, not be
    // left OPEN because the projection failed to recognize the event name.
    const states = projectWindow([
      started("inv-1", "att-1"),
      attemptFailed("inv-1", "att-1"),
      finalized("inv-1", "FINALIZED_FAILED"),
    ]);
    expect(states).toHaveLength(1);
    expect(states[0]!.claimPhase).toBe("TERMINAL");
    expect(states[0]!.pendingCountClass).toBe("ZERO");
    expect(states[0]!.exposurePhase).toBe("NONE");
  });

  it("F5: FINALIZED_FAILED with the winning attempt never separately failed → still TERMINAL", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      finalized("inv-1", "FINALIZED_FAILED"),
    ]);
    expect(states[0]!.claimPhase).toBe("TERMINAL");
  });

  it("F2: FINALIZED_SUCCESS closes its winning attempt (payload.attemptId) → ZERO pending, TERMINAL", () => {
    // The success path emits ATTEMPT_STARTED then FINALIZED_SUCCESS for the
    // WINNING attempt — no ATTEMPT_FAILED for it. The projection must read the
    // attemptId from the FINALIZED_SUCCESS payload and close that attempt, so
    // a settled success reports ZERO pending (not a spurious ONE).
    const states = projectWindow([
      started("inv-1", "att-1"),
      finalizedSuccess("inv-1", "att-1"),
    ]);
    expect(states).toHaveLength(1);
    expect(states[0]!.pendingCountClass).toBe("ZERO");
    expect(states[0]!.claimPhase).toBe("TERMINAL");
    expect(states[0]!.exposurePhase).toBe("NONE");
  });

  it("F2: FINALIZED_SUCCESS with NO attemptId in payload degrades gracefully (does not crash; claim TERMINAL)", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      finalizedSuccess("inv-1"), // older payload without attemptId
    ]);
    expect(states[0]!.claimPhase).toBe("TERMINAL");
    // Winning attempt cannot be closed without its id — this legacy shape
    // still reports the attempt pending, but must not throw.
    expect(states[0]!.pendingCountClass).toBe("ONE");
  });

  it("a rejected fingerprint is carried as hasRejectedFp (RejectedImpliesBound: only ever on a bound id)", () => {
    const states = projectWindow([
      started("inv-1", "att-1"),
      {
        eventType: "ATTEMPT_STARTED",
        source: "ai_attempt",
        sourceId: "att-1",
        payload: { invocationId: "inv-1", attemptId: "att-1", rejectedFingerprint: true },
      },
    ]);
    expect(states[0]!.hasRejectedFp).toBe(true);
    expect(states[0]!.fingerprintBound).toBe(true); // the id is bound the moment any event exists
  });
});

describe("M5 SHADOW/ENFORCE admission modes", () => {
  const geTwoWindow: readonly ProjectableEvent[] = [
    started("inv-1", "att-1"),
    started("inv-1", "att-2"), // two concurrently pending → GE2 violation
  ];
  const cleanWindow: readonly ProjectableEvent[] = [
    started("inv-1", "att-1"),
  ];

  it("SHADOW + a GE2 window → ADMIT with the violation surfaced (shadow NEVER refuses)", () => {
    const result = admitUnderSRQC(geTwoWindow, "SHADOW");
    expect(result.decision).toBe("ADMIT");
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]!.pendingCountClass).toBe("GE2");
  });

  it("ENFORCE + a GE2 window → REFUSE", () => {
    const result = admitUnderSRQC(geTwoWindow, "ENFORCE");
    expect(result.decision).toBe("REFUSE");
    expect(result.violations).toHaveLength(1);
  });

  it("ENFORCE + a clean window → ADMIT (nothing to refuse)", () => {
    const result = admitUnderSRQC(cleanWindow, "ENFORCE");
    expect(result.decision).toBe("ADMIT");
    expect(result.violations).toHaveLength(0);
  });

  it("default call (no mode arg) behaves as SHADOW: ADMIT even with a violation — existing callers unaffected", () => {
    const withMode = admitUnderSRQC(geTwoWindow, "SHADOW");
    const withoutMode = admitUnderSRQC(geTwoWindow);
    expect(withoutMode.decision).toBe("ADMIT");
    expect(withoutMode.violations).toHaveLength(1);
    // Byte-identical decision to an explicit SHADOW call.
    expect(withoutMode.decision).toBe(withMode.decision);
  });
});

describe("M5 lab wiring (the ONE place ENFORCE is reachable)", () => {
  const geTwoWindow: readonly ProjectableEvent[] = [
    started("inv-1", "att-1"),
    started("inv-1", "att-2"),
  ];

  it("resolveSrqcModeFromEnv is ENFORCE only when SRQC_ENFORCE === '1'", () => {
    expect(resolveSrqcModeFromEnv({ SRQC_ENFORCE: "1" })).toBe("ENFORCE");
    expect(resolveSrqcModeFromEnv({})).toBe("SHADOW"); // unset → SHADOW
    expect(resolveSrqcModeFromEnv({ SRQC_ENFORCE: "0" })).toBe("SHADOW");
    expect(resolveSrqcModeFromEnv({ SRQC_ENFORCE: "true" })).toBe("SHADOW");
    expect(resolveSrqcModeFromEnv({ SRQC_ENFORCE: "" })).toBe("SHADOW");
  });

  it("lab helper REFUSES a GE2 window only when SRQC_ENFORCE=1; ADMITs (shadow) otherwise", () => {
    expect(
      evaluateSrqcAdmissionForLab(geTwoWindow, { SRQC_ENFORCE: "1" }).decision,
    ).toBe("REFUSE");
    expect(
      evaluateSrqcAdmissionForLab(geTwoWindow, {}).decision,
    ).toBe("ADMIT");
    expect(
      evaluateSrqcAdmissionForLab(geTwoWindow, { SRQC_ENFORCE: "0" }).decision,
    ).toBe("ADMIT");
  });
});
