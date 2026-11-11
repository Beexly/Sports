import { describe, it, expect } from "vitest";
import evidence from "../../research/research-evidence.json";
import { loadRegistry } from "../../research/registry.js";
import { resolveProjectionWiring } from "../../research/projection-params.js";
import { SHIPPED_PROJECTION_PARAMETERS } from "../../research/shipped-params.js";

/**
 * Guards the baked constants against the evidence they came from.
 *
 * The literals in shipped-params.ts exist because this package cannot import JSON. That
 * creates a drift risk: regenerate the evidence and the constants silently go stale, and
 * the live projection would keep using yesterday's numbers. This test is the alarm.
 */
describe("shipped projection parameters", () => {
  it("match what the evidence resolves to today", () => {
    const registry = loadRegistry(evidence as unknown as Parameters<typeof loadRegistry>[0]);
    const resolved = resolveProjectionWiring(registry, 0.5).parameters;

    expect(SHIPPED_PROJECTION_PARAMETERS.regressionGames).toBeCloseTo(
      resolved.regressionGames as number,
      10,
    );
    expect(SHIPPED_PROJECTION_PARAMETERS.leaguePriorPpr).toBeCloseTo(
      resolved.leaguePriorPpr as number,
      10,
    );
    expect(SHIPPED_PROJECTION_PARAMETERS.recencyWeights).toEqual(resolved.recencyWeights);
    expect(SHIPPED_PROJECTION_PARAMETERS.source).toBe(resolved.source);
  });

  it("records a provenance label naming the evidence count", () => {
    expect(SHIPPED_PROJECTION_PARAMETERS.source).toMatch(/^research\(\d+\)$/);
  });
});
