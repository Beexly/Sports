import { describe, it, expect } from "vitest";
import {
  CAPABILITY_REGISTRY,
  getAllCapabilities,
  getCapabilitiesByStatus,
  getCapabilitiesByCategory,
  getCapability,
  computeWiringScore,
  getWiringLabel,
  type CapabilityCategory,
  type CapabilityStatus,
} from "@/lib/jarvis/capability-registry";

/**
 * Capability registry contract.
 *
 * The registry is the single source of architecture truth for the Jarvis
 * Intelligence OS. These tests pin the honesty rules: no capability may
 * claim autonomy (ACTIVE / canExecute) until it truly runs autonomously
 * in this repo, and every entry must carry complete governance metadata.
 */

const VALID_STATUSES: ReadonlySet<CapabilityStatus> = new Set([
  "NOT_WIRED",
  "DESIGNED",
  "MANUAL",
  "DRAFT_ONLY",
  "ACTIVE",
]);

const ALL_CATEGORIES: readonly CapabilityCategory[] = [
  "INTELLIGENCE_CORE",
  "PLATFORM_OPERATIONS",
  "GROWTH_REVENUE",
  "AI_INFRASTRUCTURE",
];

describe("capability registry structure", () => {
  it("registers exactly 16 capabilities", () => {
    expect(CAPABILITY_REGISTRY.length).toBe(16);
  });

  it("has globally unique ids", () => {
    const ids = CAPABILITY_REGISTRY.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every capability has a valid status and category", () => {
    for (const c of CAPABILITY_REGISTRY) {
      expect(VALID_STATUSES.has(c.status), `${c.id} status`).toBe(true);
      expect(ALL_CATEGORIES.includes(c.category), `${c.id} category`).toBe(true);
    }
  });

  it("covers all four categories", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(
        getCapabilitiesByCategory(cat).length,
        `${cat} should have at least one capability`
      ).toBeGreaterThan(0);
    }
  });

  it("every capability carries complete governance metadata", () => {
    for (const c of CAPABILITY_REGISTRY) {
      expect(c.name.length, `${c.id} name`).toBeGreaterThan(0);
      expect(c.mission.length, `${c.id} mission`).toBeGreaterThan(0);
      expect(c.currentTruth.length, `${c.id} currentTruth`).toBeGreaterThan(0);
      expect(c.nextAction.length, `${c.id} nextAction`).toBeGreaterThan(0);
      expect(c.inputs.length, `${c.id} inputs`).toBeGreaterThan(0);
      expect(c.outputs.length, `${c.id} outputs`).toBeGreaterThan(0);
      expect(c.allowedActions.length, `${c.id} allowedActions`).toBeGreaterThan(0);
      expect(c.forbiddenActions.length, `${c.id} forbiddenActions`).toBeGreaterThan(0);
    }
  });
});

describe("capability registry trust rules", () => {
  it("no capability is ACTIVE — nothing in this repo runs autonomously", () => {
    expect(getCapabilitiesByStatus("ACTIVE").length).toBe(0);
  });

  it("no capability can execute autonomously (canExecute is false everywhere)", () => {
    for (const c of CAPABILITY_REGISTRY) {
      expect(c.canExecute, `${c.id} must not claim execution ability`).toBe(false);
    }
  });

  it("NOT_WIRED capabilities claim no abilities and no proof source", () => {
    for (const c of getCapabilitiesByStatus("NOT_WIRED")) {
      expect(c.proofSource, `${c.id} proofSource`).toBeNull();
      expect(c.canAnswer, `${c.id} canAnswer`).toBe(false);
      expect(c.canRecommend, `${c.id} canRecommend`).toBe(false);
    }
  });

  it("capabilities that can answer have a proof source to verify against", () => {
    for (const c of CAPABILITY_REGISTRY.filter((x) => x.canAnswer)) {
      expect(c.proofSource, `${c.id} should point at a verifiable surface`).not.toBeNull();
    }
  });
});

describe("registry accessors", () => {
  it("getAllCapabilities returns the full registry", () => {
    expect(getAllCapabilities()).toBe(CAPABILITY_REGISTRY);
  });

  it("getCapability resolves known ids and returns undefined for unknown ones", () => {
    expect(getCapability("picks-intelligence")?.name).toBe("Picks Intelligence");
    expect(getCapability("does-not-exist")).toBeUndefined();
  });

  it("getCapabilitiesByStatus partitions the registry completely", () => {
    const total = Array.from(VALID_STATUSES).reduce(
      (sum, s) => sum + getCapabilitiesByStatus(s).length,
      0
    );
    expect(total).toBe(CAPABILITY_REGISTRY.length);
  });
});

describe("wiring score", () => {
  it("is bounded 0–100", () => {
    const score = computeWiringScore();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("matches the documented status weights (ACTIVE=4 … NOT_WIRED=0)", () => {
    const weights: Record<CapabilityStatus, number> = {
      ACTIVE: 4,
      DRAFT_ONLY: 3,
      MANUAL: 2,
      DESIGNED: 1,
      NOT_WIRED: 0,
    };
    const expected = Math.round(
      (CAPABILITY_REGISTRY.reduce((sum, c) => sum + weights[c.status], 0) /
        (CAPABILITY_REGISTRY.length * 4)) *
        100
    );
    expect(computeWiringScore()).toBe(expected);
  });

  it("cannot reach the Operational band while nothing is ACTIVE", () => {
    // With zero ACTIVE capabilities the max per-capability weight is 3,
    // capping the score at 75 — below the 80 "Operational" threshold.
    expect(computeWiringScore()).toBeLessThan(80);
  });

  it("labels every band", () => {
    expect(getWiringLabel(85)).toBe("Operational");
    expect(getWiringLabel(60)).toBe("Building");
    expect(getWiringLabel(40)).toBe("Early Stage");
    expect(getWiringLabel(10)).toBe("Foundation");
  });
});
