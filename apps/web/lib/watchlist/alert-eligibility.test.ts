import { describe, it, expect } from "vitest";
import {
  isGradedEvent,
  evaluateAlertEligibility,
  isAlertEligible,
  type GradedEventInput,
} from "./alert-eligibility";

const gradedWin: GradedEventInput = {
  pickResult: "WIN",
  settledAt: new Date("2026-07-16T20:00:00.000Z"),
};
const gradedLoss: GradedEventInput = {
  pickResult: "LOSS",
  settledAt: new Date("2026-07-16T20:00:00.000Z"),
};
const gradedPush: GradedEventInput = {
  pickResult: "PUSH",
  settledAt: new Date("2026-07-16T20:00:00.000Z"),
};
const gradedVoid: GradedEventInput = {
  pickResult: "VOID",
  settledAt: new Date("2026-07-16T20:00:00.000Z"),
};
// The planted ungraded event: a live/PENDING pick that must NEVER alert,
// no matter how the other gates are configured.
const ungradedPending: GradedEventInput = { pickResult: "PENDING", settledAt: null };

describe("isGradedEvent — the graded-only doctrine primitive", () => {
  it("WIN/LOSS/PUSH/VOID with a settledAt timestamp are graded", () => {
    expect(isGradedEvent(gradedWin)).toBe(true);
    expect(isGradedEvent(gradedLoss)).toBe(true);
    expect(isGradedEvent(gradedPush)).toBe(true);
    expect(isGradedEvent(gradedVoid)).toBe(true);
  });

  it("PENDING is never graded, even if a settledAt is somehow present", () => {
    expect(isGradedEvent(ungradedPending)).toBe(false);
    expect(
      isGradedEvent({ pickResult: "PENDING", settledAt: new Date("2026-07-16T20:00:00.000Z") }),
    ).toBe(false);
  });

  it("a non-PENDING result missing settledAt is NOT graded (belt-and-suspenders)", () => {
    expect(isGradedEvent({ pickResult: "WIN", settledAt: null })).toBe(false);
    expect(isGradedEvent({ pickResult: "WIN", settledAt: undefined })).toBe(false);
  });
});

describe("evaluateAlertEligibility / isAlertEligible — combined gate", () => {
  it("eligible only when alerts are enabled, the tier can get alerts, AND the event is graded", () => {
    const verdict = evaluateAlertEligibility({
      alertsEnabled: true,
      canGetAlerts: true,
      event: gradedWin,
    });
    expect(verdict).toEqual({ eligible: true });
    expect(isAlertEligible({ alertsEnabled: true, canGetAlerts: true, event: gradedWin })).toBe(
      true,
    );
  });

  it("PLANTED UNGRADED EVENT: must NOT alert even with alerts enabled and an Elite (canGetAlerts) recipient", () => {
    const verdict = evaluateAlertEligibility({
      alertsEnabled: true,
      canGetAlerts: true,
      event: ungradedPending,
    });
    expect(verdict).toEqual({ eligible: false, reason: "not_graded" });
    expect(
      isAlertEligible({ alertsEnabled: true, canGetAlerts: true, event: ungradedPending }),
    ).toBe(false);
  });

  it("the global kill switch (WATCHLIST_ALERTS_ENABLED) blocks even a graded, Elite-eligible event", () => {
    const verdict = evaluateAlertEligibility({
      alertsEnabled: false,
      canGetAlerts: true,
      event: gradedWin,
    });
    expect(verdict).toEqual({ eligible: false, reason: "alerts_disabled" });
  });

  it("a non-Elite recipient (canGetAlerts=false) is blocked even for a graded event with alerts on", () => {
    const verdict = evaluateAlertEligibility({
      alertsEnabled: true,
      canGetAlerts: false,
      event: gradedWin,
    });
    expect(verdict).toEqual({ eligible: false, reason: "tier_ineligible" });
  });

  it("every graded result type (WIN/LOSS/PUSH/VOID) is eligible under a fully-open gate", () => {
    for (const event of [gradedWin, gradedLoss, gradedPush, gradedVoid]) {
      expect(isAlertEligible({ alertsEnabled: true, canGetAlerts: true, event })).toBe(true);
    }
  });

  it("no combination of flags can make an ungraded event eligible", () => {
    for (const alertsEnabled of [true, false]) {
      for (const canGetAlerts of [true, false]) {
        expect(isAlertEligible({ alertsEnabled, canGetAlerts, event: ungradedPending })).toBe(
          false,
        );
      }
    }
  });
});
