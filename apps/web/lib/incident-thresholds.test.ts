import { describe, expect, it } from "vitest";
import { evaluateIncidentSignals } from "./incident-thresholds";

describe("incident thresholds", () => {
  it("raises a p0 signal when onboarding failure rate exceeds 5 percent", () => {
    expect(
      evaluateIncidentSignals({
        onboardingFailureRate: 0.051,
        repairTasks: [],
      }),
    ).toEqual([
      {
        key: "onboarding_failure_rate",
        severity: "p0",
        message:
          "Vault onboarding repair rate is 5.1%, above the 5.0% incident threshold.",
      },
    ]);
  });

  it("raises a p0 signal when p0 repair tasks exist", () => {
    expect(
      evaluateIncidentSignals({
        onboardingFailureRate: 0,
        repairTasks: [
          {
            source: "provider_heartbeat",
            severity: "p0",
            title: "Check provider",
            entityKey: "stripe_webhook",
            reason: "stale",
          },
        ],
      }),
    ).toEqual([
      {
        key: "p0_repair_tasks",
        severity: "p0",
        message: "1 p0 repair task(s) require operator review.",
      },
    ]);
  });

  it("raises a p1 signal for stale proof surfaces", () => {
    expect(
      evaluateIncidentSignals({
        onboardingFailureRate: 0,
        repairTasks: [
          {
            source: "proof_surface_freshness",
            severity: "p1",
            title: "Refresh Loss Room",
            entityKey: "loss-room",
            reason: "stale",
          },
        ],
      }),
    ).toEqual([
      {
        key: "proof_surface_staleness",
        severity: "p1",
        message: "1 proof surface(s) are past the freshness window.",
      },
    ]);
  });

  it("stays quiet when thresholds are not crossed", () => {
    expect(
      evaluateIncidentSignals({
        onboardingFailureRate: 0.05,
        repairTasks: [],
      }),
    ).toEqual([]);
  });
});
