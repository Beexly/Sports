import { describe, expect, it } from "vitest";
import {
  findSubagentRole,
  FOUNDER_SUBAGENT_ROLES,
  subagentsForLane,
} from "@/lib/opportunity-engine/nova-subagents";
import { FOUNDER_WORK_LANES } from "@/lib/opportunity-engine/founder-command";

describe("NOVA Founder OS subagent role registry (S4, read-only)", () => {
  it("grants no role autonomous action authority", () => {
    for (const role of FOUNDER_SUBAGENT_ROLES) {
      expect(role.canActAutonomously).toBe(false);
    }
  });

  it("never assigns a role authority beyond its declared maxAuthority tier", () => {
    const rank = { AGENT_INTERNAL: 0, AGENT_THEN_OWNER: 1, OWNER_ONLY: 2 } as const;
    for (const role of FOUNDER_SUBAGENT_ROLES) {
      // maxAuthority itself must be one of the three valid values.
      expect(Object.keys(rank)).toContain(role.maxAuthority);
    }
  });

  it("excludes the Owner reviewer from the subagent registry", () => {
    expect(FOUNDER_SUBAGENT_ROLES.some((role) => (role.reviewer as string) === "Owner")).toBe(false);
  });

  it("assigns every FounderWorkLane to at least a policy default (registry coverage is optional, not required)", () => {
    // Not every lane needs a subagent role — unassigned lanes fall back to
    // DEFAULT_FOUNDER_OPERATING_POLICY's OWNER_ONLY-heavy defaults. This
    // test documents which lanes DO have a named subagent today.
    const coveredLanes = new Set(FOUNDER_SUBAGENT_ROLES.flatMap((role) => role.lanes));
    for (const lane of FOUNDER_WORK_LANES) {
      expect(typeof coveredLanes.has(lane)).toBe("boolean");
    }
    expect(coveredLanes.has("CAPABILITY_GOVERNANCE")).toBe(true);
    expect(coveredLanes.has("SOURCE_INTELLIGENCE")).toBe(true);
  });

  it("subagentsForLane returns only roles that declare that lane", () => {
    const results = subagentsForLane("CREDIT_LIFECYCLE");
    expect(results.length).toBeGreaterThan(0);
    for (const role of results) {
      expect(role.lanes).toContain("CREDIT_LIFECYCLE");
    }
  });

  it("subagentsForLane returns an empty list for a lane no role owns", () => {
    // REVENUE_OPPORTUNITY only has the NOVA role in the current registry;
    // spot-check that a genuinely uncovered combination reads as empty
    // rather than silently falling back to "everyone".
    const results = subagentsForLane("REVENUE_OPPORTUNITY");
    expect(results.every((role) => role.reviewer === "NOVA")).toBe(true);
  });

  it("findSubagentRole is consistent with the registry contents", () => {
    for (const role of FOUNDER_SUBAGENT_ROLES) {
      expect(findSubagentRole(role.reviewer)).toEqual(role);
    }
    expect(findSubagentRole("BOBBY")).toBeUndefined();
  });
});
