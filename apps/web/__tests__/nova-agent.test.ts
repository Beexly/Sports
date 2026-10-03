import { describe, expect, it } from "vitest";
import { classifyFounderWork } from "@/lib/opportunity-engine/nova-agent";
import { DEFAULT_FOUNDER_OPERATING_POLICY } from "@/lib/opportunity-engine/founder-command";

const BASE_INPUT = {
  lane: "CAPABILITY_GOVERNANCE" as const,
  requiresOwnerDecision: false,
  involvesMoney: false,
  involvesExternalAction: false,
  evidenceIsFailClosed: false,
};

describe("NOVA Founder OS agent classification (S4, read-only)", () => {
  it("starts from the lane default when no escalation signal fires", () => {
    const result = classifyFounderWork(BASE_INPUT);
    expect(result.authority).toBe("AGENT_INTERNAL");
    expect(result.agentCanLogOnly).toBe(true);
    expect(result.ownerMustDecide).toBe(false);
    expect(result.executionAuthority).toBe(false);
  });

  it("escalates AGENT_INTERNAL to AGENT_THEN_OWNER when the item requires an owner decision", () => {
    const result = classifyFounderWork({ ...BASE_INPUT, requiresOwnerDecision: true });
    expect(result.authority).toBe("AGENT_THEN_OWNER");
    expect(result.agentCanLogOnly).toBe(false);
    expect(result.ownerMustDecide).toBe(true);
  });

  it("escalates all the way to OWNER_ONLY for money-bearing items", () => {
    const result = classifyFounderWork({ ...BASE_INPUT, involvesMoney: true });
    expect(result.authority).toBe("OWNER_ONLY");
  });

  it("escalates to OWNER_ONLY when resolving the item needs an external action", () => {
    const result = classifyFounderWork({ ...BASE_INPUT, involvesExternalAction: true });
    expect(result.authority).toBe("OWNER_ONLY");
  });

  it("never de-escalates a lane whose default is already OWNER_ONLY", () => {
    const result = classifyFounderWork({
      lane: "SETTLEMENT_ANOMALY",
      requiresOwnerDecision: false,
      involvesMoney: false,
      involvesExternalAction: false,
      evidenceIsFailClosed: false,
    });
    expect(result.authority).toBe("OWNER_ONLY");
  });

  it("cannot be escalated back down to AGENT_INTERNAL by any combination of false flags", () => {
    // Exhaustive over every boolean combination for a REVENUE_OPPORTUNITY item
    // (lane default AGENT_THEN_OWNER): no combination should ever land back
    // on AGENT_INTERNAL, since AGENT_THEN_OWNER already requires the owner.
    for (const requiresOwnerDecision of [false, true]) {
      for (const involvesMoney of [false, true]) {
        for (const involvesExternalAction of [false, true]) {
          for (const evidenceIsFailClosed of [false, true]) {
            const result = classifyFounderWork({
              lane: "REVENUE_OPPORTUNITY",
              requiresOwnerDecision,
              involvesMoney,
              involvesExternalAction,
              evidenceIsFailClosed,
            });
            expect(result.authority).not.toBe("AGENT_INTERNAL");
          }
        }
      }
    }
  });

  it("records a human-readable reason for every escalation", () => {
    const result = classifyFounderWork({ ...BASE_INPUT, involvesMoney: true });
    expect(result.reasons.length).toBeGreaterThan(1);
    expect(result.reasons.some((reason) => reason.toLowerCase().includes("money"))).toBe(true);
  });

  it("accepts an explicit policy override rather than only the frozen default", () => {
    const customPolicy = {
      ...DEFAULT_FOUNDER_OPERATING_POLICY,
      laneDefaultAuthority: {
        ...DEFAULT_FOUNDER_OPERATING_POLICY.laneDefaultAuthority,
        CAPABILITY_GOVERNANCE: "OWNER_ONLY" as const,
      },
    };
    const result = classifyFounderWork(BASE_INPUT, customPolicy);
    expect(result.authority).toBe("OWNER_ONLY");
  });
});
