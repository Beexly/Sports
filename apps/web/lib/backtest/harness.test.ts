import { describe, expect, it } from "vitest";
import { computeCalibration } from "@/lib/calibration/compute";
import { groupCalibrationByModelVersion, type VersionedCalibrationSample } from "@/lib/calibration/model-version-report";
import { brierDecomposition, type CalibrationSample } from "@sports/prediction-engine";
import { runBacktestHarness, BACKTEST_HARNESS_VERSION, type BacktestPickInput } from "./harness";

/**
 * Fixture harness tests. Two obligations, per the mission:
 *   1. The harness's math must MATCH the existing calibration helpers'
 *      outputs when called directly on the same eligible sample — proving
 *      this module is glue, not a reimplementation.
 *   2. Insufficient sample must produce an HONEST ZERO (withheld derived
 *      fields, never a fabricated number), and an empty sample must not
 *      crash on divide-by-zero.
 */

const NOW = new Date("2026-07-17T12:00:00.000Z");

function pick(overrides: Partial<BacktestPickInput> & { id: string }): BacktestPickInput {
  return {
    confidence: 65,
    result: "WIN",
    modelVersion: "v5.1.0",
    sport: "NFL",
    pickType: "SPREAD",
    riskLevel: "MODERATE",
    ...overrides,
  };
}

/** A deterministic 24-row fixture spanning two model versions and both outcomes. */
function fixtureRows(): BacktestPickInput[] {
  const rows: BacktestPickInput[] = [];
  for (let i = 0; i < 24; i++) {
    const modelVersion = i % 2 === 0 ? "v5.1.0" : "v5.0.0";
    const confidence = 50 + (i % 5) * 10; // 50,60,70,80,90 repeating
    const result = i % 3 === 0 ? "LOSS" : i % 7 === 0 ? "PUSH" : "WIN";
    rows.push(pick({ id: `p${i}`, modelVersion, confidence, result }));
  }
  return rows;
}

describe("runBacktestHarness — reuse, not reimplementation", () => {
  it("calibration output matches computeCalibration() called directly on the same eligible sample", () => {
    const rows = fixtureRows();
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    expect(report.calibration).toEqual(computeCalibration(rows));
  });

  it("reliabilityDecomposition matches brierDecomposition() called directly on the same binary sample", () => {
    const rows = fixtureRows();
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });

    const expectedSamples: CalibrationSample[] = rows.flatMap((row): CalibrationSample[] => {
      if (row.result === "WIN") return [{ p: Math.max(0.01, Math.min(0.99, row.confidence / 100)), y: 1 }];
      if (row.result === "LOSS") return [{ p: Math.max(0.01, Math.min(0.99, row.confidence / 100)), y: 0 }];
      return [];
    });
    const expected = brierDecomposition(expectedSamples);

    expect(report.reliabilityDecomposition).toEqual(expected);
    // The climatology Brier score IS brierDecomposition's uncertainty term —
    // no separate math computes it.
    expect(report.climatology.climatologyBrierScore).toBe(expected.uncertainty);
    expect(report.climatology.modelBrierScore).toBe(expected.brier);
    expect(report.climatology.edgeOverClimatology).toBeCloseTo(expected.uncertainty - expected.brier, 10);
  });

  it("byModelVersion matches groupCalibrationByModelVersion() called directly, sorted by sample size", () => {
    const rows = fixtureRows();
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });

    const expectedSamples: VersionedCalibrationSample[] = rows.flatMap((row): VersionedCalibrationSample[] => {
      if (row.result === "WIN") return [{ modelVersion: row.modelVersion, probability: Math.max(0.01, Math.min(0.99, row.confidence / 100)), outcome: 1 }];
      if (row.result === "LOSS") return [{ modelVersion: row.modelVersion, probability: Math.max(0.01, Math.min(0.99, row.confidence / 100)), outcome: 0 }];
      return [];
    });
    const expected = groupCalibrationByModelVersion(expectedSamples);

    expect(report.byModelVersion).toHaveLength(expected.length);
    for (const group of expected) {
      const match = report.byModelVersion.find((g) => g.modelVersion === group.modelVersion);
      expect(match?.sampleSize).toBe(group.sampleSize);
      expect(match?.brier).toBe(group.brier);
    }
    // Sorted descending by sample size.
    for (let i = 1; i < report.byModelVersion.length; i++) {
      const prev = report.byModelVersion[i - 1];
      const cur = report.byModelVersion[i];
      expect(prev && cur ? prev.sampleSize >= cur.sampleSize : true).toBe(true);
    }
  });

  it("stamps deterministic provenance: same exact input + same `now` → identical hashes on repeat runs", () => {
    const rows = fixtureRows();
    const reportA = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    const reportB = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });

    expect(reportA.provenance.inputsHash).toBe(reportB.provenance.inputsHash);
    expect(reportA.provenance.outputHash).toBe(reportB.provenance.outputHash);
    expect(reportA.provenance.harnessVersion).toBe(BACKTEST_HARNESS_VERSION);
    expect(reportA.provenance.generatedAt).toBe(NOW.toISOString());
  });

  it("inputsHash is independent of input array order (sorted by id before hashing)", () => {
    const rows = fixtureRows();
    const reportA = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    const reportB = runBacktestHarness([...rows].reverse(), { now: NOW, minSampleSize: 5 });

    expect(reportA.provenance.inputsHash).toBe(reportB.provenance.inputsHash);
    // outputHash is NOT asserted equal here: computeCalibration/brierDecomposition
    // sum floats via Array#reduce, which is not strictly order-invariant at the
    // bit level. That is a property of the reused calibration math (unchanged by
    // this harness), not a determinism bug — see the "same exact input" test
    // above for the real determinism guarantee this module makes.
  });

  it("changes inputsHash when the input set changes", () => {
    const rows = fixtureRows();
    const base = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    const mutated = runBacktestHarness([...rows, pick({ id: "extra", result: "WIN" })], {
      now: NOW,
      minSampleSize: 5,
    });
    expect(mutated.provenance.inputsHash).not.toBe(base.provenance.inputsHash);
  });
});

describe("runBacktestHarness — honest zero", () => {
  it("returns status='empty' and never fabricates a score for zero picks", () => {
    const report = runBacktestHarness([], { now: NOW });
    expect(report.status).toBe("empty");
    expect(report.coverage.settledSampleSize).toBe(0);
    expect(report.coverage.sufficientSample).toBe(false);
    expect(report.reliabilityDecomposition).toBeNull();
    expect(report.climatology.modelBrierScore).toBeNull();
    expect(report.climatology.climatologyBrierScore).toBeNull();
    expect(report.climatology.modelBeatsClimatology).toBeNull();
    expect(report.byModelVersion).toEqual([]);
  });

  it("returns status='insufficient-sample' below the floor: raw counts stay, derived scores are withheld", () => {
    const rows: BacktestPickInput[] = [
      pick({ id: "a", result: "WIN", confidence: 90 }),
      pick({ id: "b", result: "LOSS", confidence: 80 }),
      pick({ id: "c", result: "WIN", confidence: 70 }),
    ];
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 100 });

    expect(report.status).toBe("insufficient-sample");
    // Raw coverage counts are factual and always visible.
    expect(report.coverage.settledSampleSize).toBe(3);
    expect(report.coverage.binarySampleSize).toBe(3);
    expect(report.coverage.sufficientSample).toBe(false);
    // Derived/publishable fields are honestly withheld, not fabricated off 3 picks.
    expect(report.reliabilityDecomposition).toBeNull();
    expect(report.climatology.modelBrierScore).toBeNull();
    expect(report.climatology.climatologyBrierScore).toBeNull();
    expect(report.climatology.edgeOverClimatology).toBeNull();
    expect(report.climatology.modelBeatsClimatology).toBeNull();
    expect(report.byModelVersion).toEqual([]);
    expect(report.note).toContain("3");
    expect(report.note).toContain("100");
  });

  it("crosses into status='ok' exactly at the floor", () => {
    const rows: BacktestPickInput[] = Array.from({ length: 10 }, (_, i) =>
      pick({ id: `r${i}`, result: i % 2 === 0 ? "WIN" : "LOSS", confidence: 60 }),
    );
    const below = runBacktestHarness(rows.slice(0, 9), { now: NOW, minSampleSize: 10 });
    const atFloor = runBacktestHarness(rows, { now: NOW, minSampleSize: 10 });

    expect(below.status).toBe("insufficient-sample");
    expect(atFloor.status).toBe("ok");
    expect(atFloor.reliabilityDecomposition).not.toBeNull();
    expect(atFloor.climatology.modelBrierScore).not.toBeNull();
  });

  it("excludes PENDING picks from every count and never counts them as settled", () => {
    const rows: BacktestPickInput[] = [
      pick({ id: "a", result: "WIN" }),
      pick({ id: "b", result: "PENDING" }),
      pick({ id: "c", result: "PENDING" }),
    ];
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 1 });
    expect(report.coverage.totalInput).toBe(3);
    expect(report.coverage.excludedPending).toBe(2);
    expect(report.coverage.settledSampleSize).toBe(1);
  });
});

describe("runBacktestHarness — unsettled/current-season exclusion", () => {
  it("excludes picks whose season is not strictly before currentSeason, and never excludes picks with no season", () => {
    const rows: BacktestPickInput[] = [
      pick({ id: "past1", season: 2024, result: "WIN" }),
      pick({ id: "past2", season: 2024, result: "LOSS" }),
      pick({ id: "live", season: 2026, result: "WIN" }), // in-progress season — must be excluded
      pick({ id: "noSeason", season: undefined, result: "WIN" }), // no season info — never excluded on season grounds
    ];
    const report = runBacktestHarness(rows, { now: NOW, currentSeason: 2026, minSampleSize: 1 });

    expect(report.coverage.excludedCurrentSeason).toBe(1);
    expect(report.coverage.totalInput).toBe(4);
    expect(report.coverage.settledSampleSize).toBe(3); // past1, past2, noSeason — not "live"
    expect(report.coverage.currentSeason).toBe(2026);
  });

  it("applies no season exclusion when currentSeason is omitted", () => {
    const rows: BacktestPickInput[] = [
      pick({ id: "a", season: 2026, result: "WIN" }),
      pick({ id: "b", season: 2024, result: "LOSS" }),
    ];
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 1 });
    expect(report.coverage.excludedCurrentSeason).toBe(0);
    expect(report.coverage.settledSampleSize).toBe(2);
    expect(report.coverage.currentSeason).toBeNull();
  });
});
