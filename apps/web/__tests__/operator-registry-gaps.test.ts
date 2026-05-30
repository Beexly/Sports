/**
 * Targeted coverage for lib/cockpit/operator-registry functions not reached by
 * operator-registry.test.ts.
 *
 * The primary test covers: getOperator key normalization, assertPromoPublishAllowed
 * for DEMO and unknown operators, listPublicOperators (empty), isOperatorLicensedInState
 * false cases, and summarizeRegistry.
 *
 * This file covers:
 *   - getOperator("") → undefined (empty-string guard)
 *   - getOperator for all four demo keys
 *   - isPublishingPartner: DEMO → false, unknown → false
 *   - listCockpitOperators: returns all entries including all four keys
 *   - assertPromoPublishAllowed error message includes class name ("DEMO")
 *   - OPERATOR_REGISTRY entries: isReal=false, jurisdiction="US", licensedStates=[]
 */

import { describe, it, expect } from "vitest";
import {
  getOperator,
  isPublishingPartner,
  listCockpitOperators,
  assertPromoPublishAllowed,
  OPERATOR_REGISTRY,
  OperatorRegistryError,
} from "@/lib/cockpit/operator-registry";

// ============================================================
// getOperator — empty string guard
// ============================================================

describe("getOperator — empty string", () => {
  it("returns undefined for empty string (not just normalization)", () => {
    expect(getOperator("")).toBeUndefined();
  });

  it("returns undefined for whitespace-only string", () => {
    // Whitespace is not normalized to a valid key; the guard fires after toLower
    // but since " " has no registry entry, it returns undefined anyway
    expect(getOperator("   ")).toBeUndefined();
  });
});

// ============================================================
// getOperator — all four demo registry entries
// ============================================================

describe("getOperator — all demo entries are accessible", () => {
  it("resolves 'stellar'", () => {
    const op = getOperator("stellar");
    expect(op?.key).toBe("stellar");
    expect(op?.operatorClass).toBe("DEMO");
  });

  it("resolves 'comet'", () => {
    const op = getOperator("comet");
    expect(op?.key).toBe("comet");
    expect(op?.operatorClass).toBe("DEMO");
  });

  it("resolves 'nebula'", () => {
    const op = getOperator("nebula");
    expect(op?.key).toBe("nebula");
    expect(op?.operatorClass).toBe("DEMO");
  });

  it("resolves 'orbit'", () => {
    const op = getOperator("orbit");
    expect(op?.key).toBe("orbit");
    expect(op?.operatorClass).toBe("DEMO");
  });

  it("normalizes uppercase correctly for all four keys", () => {
    expect(getOperator("COMET")?.key).toBe("comet");
    expect(getOperator("NEBULA")?.key).toBe("nebula");
    expect(getOperator("ORBIT")?.key).toBe("orbit");
  });
});

// ============================================================
// isPublishingPartner — DEMO returns false, unknown returns false
// ============================================================

describe("isPublishingPartner", () => {
  it("returns false for a DEMO operator (stellar)", () => {
    expect(isPublishingPartner("stellar")).toBe(false);
  });

  it("returns false for a DEMO operator (comet)", () => {
    expect(isPublishingPartner("comet")).toBe(false);
  });

  it("returns false for an unknown key", () => {
    expect(isPublishingPartner("draftkings")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isPublishingPartner("")).toBe(false);
  });

  it("is false for all four current demo entries", () => {
    for (const entry of OPERATOR_REGISTRY) {
      expect(isPublishingPartner(entry.key)).toBe(false);
    }
  });
});

// ============================================================
// listCockpitOperators — returns all entries (internal view)
// ============================================================

describe("listCockpitOperators", () => {
  it("returns all 4 entries (includes demo operators unlike listPublicOperators)", () => {
    const ops = listCockpitOperators();
    expect(ops).toHaveLength(4);
  });

  it("includes all four demo operator keys", () => {
    const keys = listCockpitOperators().map((op) => op.key);
    expect(keys).toContain("stellar");
    expect(keys).toContain("comet");
    expect(keys).toContain("nebula");
    expect(keys).toContain("orbit");
  });

  it("every entry has required registry fields", () => {
    for (const op of listCockpitOperators()) {
      expect(typeof op.key).toBe("string");
      expect(typeof op.displayName).toBe("string");
      expect(typeof op.operatorClass).toBe("string");
      expect(Array.isArray(op.licensedStates)).toBe(true);
      expect(typeof op.jurisdiction).toBe("string");
    }
  });
});

// ============================================================
// assertPromoPublishAllowed — error message includes class name
// ============================================================

describe("assertPromoPublishAllowed — DEMO class error message", () => {
  it("error message includes 'DEMO' class name", () => {
    let caught: OperatorRegistryError | null = null;
    try {
      assertPromoPublishAllowed("stellar");
    } catch (e) {
      caught = e as OperatorRegistryError;
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toContain("DEMO");
    expect(caught?.message).toContain("APPROVED_PARTNER");
  });

  it("error name is OperatorRegistryError for DEMO operators", () => {
    let caught: OperatorRegistryError | null = null;
    try {
      assertPromoPublishAllowed("comet");
    } catch (e) {
      caught = e as OperatorRegistryError;
    }
    expect(caught?.name).toBe("OperatorRegistryError");
  });
});

// ============================================================
// OPERATOR_REGISTRY — shape invariants
// ============================================================

describe("OPERATOR_REGISTRY — shape invariants", () => {
  it("all entries are demo (isReal=false)", () => {
    expect(OPERATOR_REGISTRY.every((op) => op.isReal === false)).toBe(true);
  });

  it("all entries have jurisdiction US", () => {
    expect(OPERATOR_REGISTRY.every((op) => op.jurisdiction === "US")).toBe(true);
  });

  it("all entries have empty licensedStates (no state licensing in demo mode)", () => {
    expect(OPERATOR_REGISTRY.every((op) => op.licensedStates.length === 0)).toBe(true);
  });

  it("all entries have non-empty reviewer fields", () => {
    expect(OPERATOR_REGISTRY.every((op) => op.reviewer.length > 0)).toBe(true);
  });
});
