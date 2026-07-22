import { describe, expect, it } from "vitest";

import {
  classifyCapabilityTrust,
  detectCapabilityRisk,
  routeCapabilities,
} from "@/lib/opportunity-engine/capability-governor";
import { findCapabilitiesByName } from "@/lib/opportunity-engine/capability-inventory";

describe("NOVA capability governor", () => {
  it("loads no more than three inspected candidates and never auto-activates them", () => {
    const route = routeCapabilities("GSE_REPOSITORY_IMPLEMENTATION");
    expect(route.selected.length).toBeLessThanOrEqual(3);
    expect(route.selected.map((candidate) => candidate.entry.name)).toEqual([
      "Commit commands",
      "Engineering",
      "Code simplifier",
    ]);
    expect(route.selected.every((candidate) => candidate.disposition === "INSPECT_BEFORE_USE")).toBe(true);
    expect(route.selected.every((candidate) => candidate.executionAuthority === false)).toBe(true);
    expect(route.autoActivationAllowed).toBe(false);
    expect(route.externalActionsAllowed).toBe(false);
  });

  it("prefers bounded first-party or vendor-maintained tools over giant or autonomous bundles", () => {
    const local = routeCapabilities("LOCAL_CODING_CONTINUITY");
    expect(local.selected.map((candidate) => candidate.entry.name)).toEqual([
      "Commit commands",
      "Pr review toolkit",
      "Code simplifier",
    ]);
    expect(local.held.map((candidate) => candidate.entry.name)).toEqual(
      expect.arrayContaining(["Karpathy coder", "Ralph loop", "Self improving agent"]),
    );

    const ecc = findCapabilitiesByName("Ecc").find((entry) => entry.surface === "CLAUDE_PLUGIN");
    expect(ecc).toBeDefined();
    expect(detectCapabilityRisk(ecc!)).toEqual(expect.arrayContaining(["LARGE_BUNDLE", "MASSIVE_BUNDLE"]));
  });

  it("routes observability to a small competitive set rather than loading the whole telemetry catalog", () => {
    const route = routeCapabilities("NOVA_OBSERVABILITY");
    expect(route.selected.map((candidate) => candidate.entry.name)).toEqual([
      "Langfuse",
      "SigNoz",
      "Honeycomb",
    ]);
    expect(route.held.map((candidate) => candidate.entry.name)).toEqual(
      expect.arrayContaining(["Grafana Cloud MCP", "Grafana Assistant", "Posthog", "ClickHouse"]),
    );
  });

  it("uses official AWS candidates but still treats infrastructure work as permission-sensitive", () => {
    const route = routeCapabilities("AWS_ARCHITECTURE_AND_CREDITS");
    expect(route.selected.map((candidate) => candidate.entry.name)).toEqual([
      "AWS Startup Advisor",
      "Aws core",
      "Aws amplify",
    ]);
    for (const candidate of route.selected) {
      expect(candidate.trustTier).toBe("VENDOR_MAINTAINED");
      expect(candidate.riskFlags).toContain("DEPLOYMENT_OR_INFRASTRUCTURE");
      expect(candidate.executionAuthority).toBe(false);
    }
  });

  it("does not infer trust from a plugin name or captured author label alone", () => {
    const official = findCapabilitiesByName("Commit commands").find(
      (entry) => entry.surface === "CLAUDE_PLUGIN",
    );
    const thirdParty = findCapabilitiesByName("Karpathy coder").find(
      (entry) => entry.surface === "CLAUDE_PLUGIN",
    );
    const unknown = findCapabilitiesByName("Buildkite").find(
      (entry) => entry.surface === "CLAUDE_PLUGIN",
    );
    expect(classifyCapabilityTrust(official!)).toBe("PLATFORM_FIRST_PARTY");
    expect(classifyCapabilityTrust(thirdParty!)).toBe("THIRD_PARTY");
    expect(classifyCapabilityTrust(unknown!)).toBe("UNKNOWN_AUTHOR");

    const route = routeCapabilities("GSE_PR_REVIEW");
    expect(route.selected.every((candidate) => candidate.trustEvidence === "CAPTURED_AUTHOR_LABEL_ONLY")).toBe(true);
    expect(route.held.map((candidate) => candidate.entry.name)).toContain("Buildkite");
  });

  it("holds self-modifying and autonomous-loop candidates even when third-party candidates are allowed", () => {
    const route = routeCapabilities("LOCAL_CODING_CONTINUITY", {
      allowThirdPartyCandidates: true,
      maxSelected: 3,
    });
    const ralph = route.held.find((candidate) => candidate.entry.name === "Ralph loop");
    const selfImproving = route.held.find(
      (candidate) => candidate.entry.name === "Self improving agent",
    );
    expect(ralph?.riskFlags).toContain("AUTONOMOUS_LOOP");
    expect(selfImproving?.riskFlags).toContain("SELF_MODIFICATION");
    expect(ralph?.disposition).toBe("HOLD");
    expect(selfImproving?.disposition).toBe("HOLD");
  });
});
