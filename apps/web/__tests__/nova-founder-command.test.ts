import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOUNDER_OPERATING_POLICY,
  FOUNDER_OPEN_WORK_STATES,
  FOUNDER_WORK_LANES,
  type FounderWorkAuthority,
} from "@/lib/opportunity-engine/founder-command";

describe("NOVA Founder OS domain contracts (S4)", () => {
  it("exports exactly the three FounderWorkAuthority values from the freeze §5.3", () => {
    const values: readonly FounderWorkAuthority[] = ["AGENT_INTERNAL", "OWNER_ONLY", "AGENT_THEN_OWNER"];
    for (const value of values) {
      const roundTrip: FounderWorkAuthority = value;
      expect(roundTrip).toBe(value);
    }
  });

  it("lists every FounderWorkLane exactly once", () => {
    expect(new Set(FOUNDER_WORK_LANES).size).toBe(FOUNDER_WORK_LANES.length);
    expect(FOUNDER_WORK_LANES).toEqual([
      "CAPABILITY_GOVERNANCE",
      "SOURCE_INTELLIGENCE",
      "REVENUE_OPPORTUNITY",
      "CREDIT_LIFECYCLE",
      "SETTLEMENT_ANOMALY",
      "CONTROL_PLANE_ECONOMICS",
    ]);
  });

  it("treats RESOLVED and DISMISSED as the only non-open work states", () => {
    expect(FOUNDER_OPEN_WORK_STATES.has("RESOLVED")).toBe(false);
    expect(FOUNDER_OPEN_WORK_STATES.has("DISMISSED")).toBe(false);
    expect(FOUNDER_OPEN_WORK_STATES.has("NEW")).toBe(true);
    expect(FOUNDER_OPEN_WORK_STATES.has("TRIAGED")).toBe(true);
    expect(FOUNDER_OPEN_WORK_STATES.has("AGENT_HANDLING")).toBe(true);
    expect(FOUNDER_OPEN_WORK_STATES.has("AWAITING_OWNER")).toBe(true);
  });

  it("defaults the inherently money-bearing lanes to OWNER_ONLY outright", () => {
    const policy = DEFAULT_FOUNDER_OPERATING_POLICY;
    expect(policy.laneDefaultAuthority.CREDIT_LIFECYCLE).toBe("OWNER_ONLY");
    expect(policy.laneDefaultAuthority.SETTLEMENT_ANOMALY).toBe("OWNER_ONLY");
  });

  it("lets CONTROL_PLANE_ECONOMICS start at AGENT_INTERNAL so transient infra events stay agent-loggable", () => {
    // Deterministic/money control-plane events still escalate per-item via
    // classifyFounderWork's signals (see nova-founder-work-seed.test.ts) —
    // this default only covers the lane's baseline.
    expect(DEFAULT_FOUNDER_OPERATING_POLICY.laneDefaultAuthority.CONTROL_PLANE_ECONOMICS).toBe(
      "AGENT_INTERNAL",
    );
  });

  it("never grants automatic spend, publish, resolve, dismiss, or a second dashboard", () => {
    const policy = DEFAULT_FOUNDER_OPERATING_POLICY;
    expect(policy.autoResolveAllowed).toBe(false);
    expect(policy.autoDismissAllowed).toBe(false);
    expect(policy.automaticSpendAllowed).toBe(false);
    expect(policy.automaticPublishAllowed).toBe(false);
    expect(policy.secondDashboardAllowed).toBe(false);
  });

  it("is frozen (no accidental runtime mutation of shared policy state)", () => {
    expect(Object.isFrozen(DEFAULT_FOUNDER_OPERATING_POLICY)).toBe(true);
    expect(Object.isFrozen(DEFAULT_FOUNDER_OPERATING_POLICY.laneDefaultAuthority)).toBe(true);
  });
});
