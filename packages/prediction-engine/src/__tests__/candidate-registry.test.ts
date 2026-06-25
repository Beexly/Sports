import { describe, it, expect } from "vitest";
import {
  CANDIDATE_REGISTRY,
  MAX_FAMILY_SIZE,
  candidateById,
  assertBoundedFamily,
  type SignalCandidate,
} from "../candidate-registry.js";

describe("candidate registry", () => {
  it("is bounded, unique, and pre-registered (every candidate has a registration date)", () => {
    expect(() => assertBoundedFamily()).not.toThrow();
    expect(CANDIDATE_REGISTRY.length).toBeLessThanOrEqual(MAX_FAMILY_SIZE);
    const ids = new Set(CANDIDATE_REGISTRY.map((c) => c.id));
    expect(ids.size).toBe(CANDIDATE_REGISTRY.length);
    for (const c of CANDIDATE_REGISTRY) {
      expect(c.registeredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.nullHypothesis.length).toBeGreaterThan(0);
    }
  });

  it("looks candidates up by id", () => {
    expect(candidateById("home-dog-bounce")?.family).toBe("situational-ats");
    expect(candidateById("does-not-exist")).toBeUndefined();
  });

  it("rejects an over-cap family (FDR honesty requires a fixed m)", () => {
    const tooMany: SignalCandidate[] = Array.from({ length: MAX_FAMILY_SIZE + 1 }, (_, i) => ({
      id: `c${i}`,
      family: "totals",
      description: "x",
      nullHypothesis: "y",
      registeredOn: "2026-06-25",
    }));
    expect(() => assertBoundedFamily(tooMany)).toThrow(/exceeds MAX_FAMILY_SIZE/);
  });

  it("rejects duplicate ids", () => {
    const dup: SignalCandidate[] = [
      { id: "x", family: "pace", description: "a", nullHypothesis: "b", registeredOn: "2026-06-25" },
      { id: "x", family: "pace", description: "c", nullHypothesis: "d", registeredOn: "2026-06-25" },
    ];
    expect(() => assertBoundedFamily(dup)).toThrow(/Duplicate candidate id/);
  });
});
