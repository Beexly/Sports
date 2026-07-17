/**
 * The display-only-substantiated-results guard is REAL CODE (handoff §1):
 * a performance number missing any of the four statutory legs — coverage,
 * Wilson/CP lower bound, CLV backing, walk-forward provenance — must never
 * render. These tests pin every leg individually.
 */
import { describe, expect, it } from "vitest";

import {
  assertSubstantiated,
  DisplayGuardError,
  renderableMetricOrNull,
  type SubstantiatedMetric,
} from "@/lib/ledger/display-guard";

const VALID: SubstantiatedMetric = {
  label: "selective realized rate",
  value: 0.583,
  coverage: { fired: 112, eligible: 940 },
  lowerBound: { method: "wilson", value: 0.507 },
  clv: { meanBps: 141, settledCount: 112 },
  provenance: {
    walkForward: true,
    modelVersion: "v5.1.0",
    stampHash: "a".repeat(64),
    generatedAt: "2026-07-16T00:00:00.000Z",
  },
};

describe("display guard — every statutory leg is load-bearing", () => {
  it("accepts a fully substantiated metric", () => {
    expect(() => assertSubstantiated(VALID)).not.toThrow();
    expect(renderableMetricOrNull(VALID)).toBe(VALID);
  });

  const breakLeg = (name: string, mutate: (m: SubstantiatedMetric) => SubstantiatedMetric) => {
    it(`refuses to render without ${name}`, () => {
      const broken = mutate(VALID);
      expect(() => assertSubstantiated(broken)).toThrow(DisplayGuardError);
      expect(renderableMetricOrNull(broken)).toBeNull();
    });
  };

  breakLeg("a coverage denominator", (m) => ({ ...m, coverage: { fired: 5, eligible: 0 } }));
  breakLeg("coverage sanity (fired <= eligible)", (m) => ({ ...m, coverage: { fired: 50, eligible: 10 } }));
  breakLeg("a recognized lower-bound method", (m) => ({
    ...m,
    lowerBound: { method: "vibes" as unknown as "wilson", value: 0.5 },
  }));
  breakLeg("a finite lower bound", (m) => ({ ...m, lowerBound: { method: "wilson", value: Number.NaN } }));
  breakLeg("a lower bound within [0,1] (probability bounds cannot exceed 1)", (m) => ({
    ...m,
    lowerBound: { method: "wilson", value: 2 },
  }));
  breakLeg("a non-negative lower bound", (m) => ({
    ...m,
    lowerBound: { method: "clopper-pearson", value: -0.01 },
  }));
  breakLeg("CLV backing", (m) => ({ ...m, clv: { meanBps: Number.NaN, settledCount: 0 } }));
  breakLeg("settled plays behind the CLV", (m) => ({ ...m, clv: { meanBps: 120, settledCount: 0 } }));
  breakLeg("walk-forward provenance", (m) => ({
    ...m,
    provenance: { ...m.provenance, walkForward: false as unknown as true },
  }));
  breakLeg("a real stamp hash", (m) => ({
    ...m,
    provenance: { ...m.provenance, stampHash: "not-a-hash" },
  }));

  it("the error enumerates every missing leg at once", () => {
    const gutted = {
      ...VALID,
      coverage: { fired: -1, eligible: 0 },
      clv: { meanBps: Number.NaN, settledCount: 0 },
    };
    try {
      assertSubstantiated(gutted);
      expect.unreachable("guard must throw");
    } catch (err) {
      expect(err).toBeInstanceOf(DisplayGuardError);
      const guard = err as DisplayGuardError;
      expect(guard.missing.length).toBeGreaterThanOrEqual(2);
    }
  });
});
