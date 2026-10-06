/**
 * Regression guard: the public copy on /stats and /stats/proof must never outrun
 * the canonical performance gate.
 *
 * The defect this pins: the loader fed `computeProofArchive` the RAW config flag
 * (`getReadinessGates().canExposePerformanceStats`, i.e. env performanceStatsEnabled)
 * while the canonical surface /api/ops/public-surface-truth resolves an effective
 * gate that also requires calibration eligibility GREEN + published. With the flag
 * on and eligibility RED, /stats printed "calibration report: publishing" while the
 * truth surface reported published:false, canExposePerformanceStats:false.
 *
 * The loader now reads `resolveEffectivePerformanceGate()` — the same resolver the
 * truth surface uses — so the two surfaces cannot disagree.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const effectiveGate = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    pick: { count: vi.fn(async () => 2294) },
    ingestionRun: { findFirst: vi.fn(async () => ({ completedAt: new Date("2026-09-11T00:30:00.000Z") })) },
  },
  isStubMode: () => false,
}));

vi.mock("@/lib/ops/effective-performance-gate", () => ({
  resolveEffectivePerformanceGate: (...args: unknown[]) => effectiveGate(...args),
}));

vi.mock("@/lib/statking/product", () => ({
  loadCoverage: () => ({ coverage_by_data_type: {} }),
}));

import { loadKingStandard } from "@/lib/statking/king-standard-loader";

function proofBasis(result: Awaited<ReturnType<typeof loadKingStandard>>): string {
  const dim = result.dimensions.proofArchive as { basis?: string };
  return dim.basis ?? "";
}

describe("king-standard loader — public copy cannot outrun the canonical gate", () => {
  beforeEach(() => {
    effectiveGate.mockReset();
  });

  it("says collecting — never publishing — when the effective gate is RED/unpublished", async () => {
    effectiveGate.mockResolvedValue({
      canExposePerformanceStats: false,
      calibrationPublished: false,
      eligibilityStatus: "RED",
      operatorHint: "Eligibility RED: do not publish performance claims.",
    });

    const result = await loadKingStandard(new Date("2026-09-11T01:00:00.000Z"));
    const basis = proofBasis(result);

    expect(effectiveGate).toHaveBeenCalled();
    expect(basis).toContain("2294 settled/graded canonical picks");
    expect(basis).toContain("collecting");
    expect(basis).not.toContain("publishing");
  });

  it("says publishing only when the effective gate is published AND exposing", async () => {
    effectiveGate.mockResolvedValue({
      canExposePerformanceStats: true,
      calibrationPublished: true,
      eligibilityStatus: "GREEN",
      operatorHint: "",
    });

    const result = await loadKingStandard(new Date("2026-09-11T01:00:00.000Z"));

    expect(proofBasis(result)).toContain("publishing");
  });
});
