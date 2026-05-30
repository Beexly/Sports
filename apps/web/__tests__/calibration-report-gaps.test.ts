/**
 * Gap coverage for loadPublicCalibrationReport in lib/calibration/report.ts.
 *
 * No existing test exercises this function. Branches covered:
 *   - !canExposePerformanceStats → gated path (meta.gated=true, DB not hit)
 *   - canExposePerformanceStats=true + sampleSize=0 → isCollecting=true
 *   - canExposePerformanceStats=true + sampleSize>0 → isCollecting=false
 *   - publicMessage: "Building calibration history..." vs "Calibration is computed from..."
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  canExposePerformanceStats: vi.fn<() => boolean>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findMany: mocks.pickFindMany },
  },
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({
    canExposePerformanceStats: mocks.canExposePerformanceStats(),
  }),
}));

import { loadPublicCalibrationReport } from "@/lib/calibration/report";

const NOW = new Date("2026-05-22T18:00:00.000Z");

function makePick(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "pick-1",
    confidence: 72,
    result: "WIN",
    pickType: "SPREAD",
    riskLevel: "STANDARD",
    game: { sport: { name: "NBA" }, dataQualityScore: 85 },
    modelVersion: "v5.1.0",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.pickFindMany.mockReset();
  mocks.canExposePerformanceStats.mockReset();
});

// ============================================================
// Gated path — canExposePerformanceStats = false
// ============================================================

describe("loadPublicCalibrationReport — gated path", () => {
  it("returns meta.gated=true when performance stats are not yet exposed", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(false);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.meta.gated).toBe(true);
    expect(report.meta.isSampleData).toBe(false);
  });

  it("does NOT query the DB when gated (performance stats off)", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(false);

    await loadPublicCalibrationReport(NOW);

    expect(mocks.pickFindMany).not.toHaveBeenCalled();
  });

  it("returns sampleSize=0 and isCollecting=true in gated state", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(false);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.sampleSize).toBe(0);
    expect(report.data.isCollecting).toBe(true);
  });

  it("gated publicMessage mentions 'calibration history'", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(false);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.publicMessage).toContain("calibration history");
  });

  it("updatedAt is serialized from the now param", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(false);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.updatedAt).toBe(NOW.toISOString());
  });
});

// ============================================================
// Ungated path — no settled picks yet (sampleSize = 0)
// ============================================================

describe("loadPublicCalibrationReport — ungated, no settled picks", () => {
  it("returns meta.gated=false when performance stats are exposed", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([]);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.meta.gated).toBe(false);
  });

  it("returns isCollecting=true when DB returns no settled picks", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([]);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.sampleSize).toBe(0);
    expect(report.data.isCollecting).toBe(true);
  });

  it("publicMessage still says 'Building calibration history' when no picks", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([]);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.publicMessage).toContain("calibration history");
  });

  it("queries DB when canExposePerformanceStats=true", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([]);

    await loadPublicCalibrationReport(NOW);

    expect(mocks.pickFindMany).toHaveBeenCalledOnce();
  });
});

// ============================================================
// Ungated path — with settled picks (sampleSize > 0)
// ============================================================

describe("loadPublicCalibrationReport — ungated, settled picks present", () => {
  it("returns isCollecting=false when settled picks are present", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([
      makePick({ id: "p-1", result: "WIN" }),
      makePick({ id: "p-2", result: "LOSS" }),
    ]);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.sampleSize).toBe(2);
    expect(report.data.isCollecting).toBe(false);
  });

  it("publicMessage says 'settled canonical picks' (not building)", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([
      makePick({ id: "p-1", result: "WIN" }),
    ]);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.publicMessage).toContain("settled canonical picks");
    expect(report.data.publicMessage).not.toContain("Building");
  });

  it("brierScore is a number (not null) when settled picks are present", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([
      makePick({ id: "p-1", confidence: 70, result: "WIN" }),
      makePick({ id: "p-2", confidence: 70, result: "LOSS" }),
    ]);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.brierScore).toBeTypeOf("number");
  });

  it("PENDING picks do not count toward sampleSize (null outcome excluded)", async () => {
    mocks.canExposePerformanceStats.mockReturnValue(true);
    mocks.pickFindMany.mockResolvedValue([
      makePick({ id: "p-pending", result: "PENDING" }),
    ]);

    const report = await loadPublicCalibrationReport(NOW);

    expect(report.data.sampleSize).toBe(0);
    expect(report.data.isCollecting).toBe(true);
  });
});
