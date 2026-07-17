import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { brierDecomposition, type CalibrationSample } from "@sports/prediction-engine";
import { runBacktestHarness, type BacktestPickInput } from "@/lib/backtest/harness";
import { buildModelBeatsClimatologyInstrument } from "../build";

/**
 * Every fixture here runs through the REAL `runBacktestHarness` — never a
 * hand-built `BacktestHarnessReport` — so these tests prove the instrument
 * builder against the harness's actual behavior, including its edge cases.
 */

const NOW = new Date("2026-07-17T12:00:00.000Z");

function sha256(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function pick(overrides: Partial<BacktestPickInput> & { id: string }): BacktestPickInput {
  return {
    confidence: 65,
    result: "WIN",
    modelVersion: "v5.1.0",
    ...overrides,
  };
}

describe("buildModelBeatsClimatologyInstrument", () => {
  it("UNTESTED when the harness has zero settled picks", () => {
    const report = runBacktestHarness([], { now: NOW, minSampleSize: 5 });
    const instrument = buildModelBeatsClimatologyInstrument(report, sha256);

    expect(instrument.status).toBe("UNTESTED");
    expect(instrument.sampleSize).toBe(0);
    expect(instrument.modelBrierScore).toBeNull();
    expect(instrument.climatologyBrierScore).toBeNull();
    expect(instrument.edgeOverClimatology).toBeNull();
    expect(instrument.instrumentId).toBe("instrument:model-beats-climatology");
    expect(instrument.hypothesis).toBe("MODEL_BEATS_CLIMATOLOGY");
    expect(instrument.sourceReportHash).toBe(report.provenance.outputHash);
  });

  it("INSUFFICIENT_SAMPLE when settled count is below the honest-zero floor", () => {
    const rows: BacktestPickInput[] = [
      pick({ id: "p1", result: "WIN" }),
      pick({ id: "p2", result: "LOSS" }),
    ];
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 100 });
    const instrument = buildModelBeatsClimatologyInstrument(report, sha256);

    expect(instrument.status).toBe("INSUFFICIENT_SAMPLE");
    expect(instrument.modelBrierScore).toBeNull();
    expect(instrument.climatologyBrierScore).toBeNull();
    expect(instrument.edgeOverClimatology).toBeNull();
  });

  it("INSUFFICIENT_SAMPLE on the all-PUSH edge case (settled floor cleared, zero binary samples)", () => {
    const rows: BacktestPickInput[] = Array.from({ length: 10 }, (_, i) => pick({ id: `p${i}`, result: "PUSH" }));
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });

    // The harness's own top-level status reads "ok" here (settledSampleSize
    // clears the floor) even though climatology is withheld — proving the
    // instrument must read the climatology field itself, not the coarser status.
    expect(report.status).toBe("ok");
    expect(report.climatology.modelBeatsClimatology).toBeNull();

    const instrument = buildModelBeatsClimatologyInstrument(report, sha256);
    expect(instrument.status).toBe("INSUFFICIENT_SAMPLE");
    expect(instrument.sampleSize).toBe(0);
  });

  it("SUPPORTED with exact Brier numbers when the model beats climatology on a real sample", () => {
    // A constant confidence can never beat climatology (it is only ever
    // matched by it, at best) — beating the base-rate baseline requires
    // confidence that actually CORRELATES with the outcome. High confidence
    // on wins, low confidence on losses, split 50/50 so the base rate itself
    // carries no information.
    const rows: BacktestPickInput[] = Array.from({ length: 20 }, (_, i) =>
      pick({ id: `p${i}`, confidence: i % 2 === 0 ? 90 : 10, result: i % 2 === 0 ? "WIN" : "LOSS" }),
    );
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    const instrument = buildModelBeatsClimatologyInstrument(report, sha256);

    const expectedSamples: CalibrationSample[] = rows.map((row) => ({
      p: Math.max(0.01, Math.min(0.99, row.confidence / 100)),
      y: row.result === "WIN" ? 1 : 0,
    }));
    const expected = brierDecomposition(expectedSamples);

    expect(report.climatology.modelBeatsClimatology).toBe(true);
    expect(instrument.status).toBe("SUPPORTED");
    expect(instrument.sampleSize).toBe(20);
    expect(instrument.modelBrierScore).toBe(expected.brier);
    expect(instrument.climatologyBrierScore).toBe(expected.uncertainty);
  });

  it("NOT_SUPPORTED when the model does not beat climatology on a real sample", () => {
    // Confidently WRONG: high confidence on losses, low confidence on wins,
    // same 50/50 base rate as the SUPPORTED fixture above — isolating the
    // direction of correlation as the only thing that differs.
    const rows: BacktestPickInput[] = Array.from({ length: 20 }, (_, i) =>
      pick({ id: `p${i}`, confidence: i % 2 === 0 ? 90 : 10, result: i % 2 === 0 ? "LOSS" : "WIN" }),
    );
    const report = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    const instrument = buildModelBeatsClimatologyInstrument(report, sha256);

    expect(report.climatology.modelBeatsClimatology).toBe(false);
    expect(instrument.status).toBe("NOT_SUPPORTED");
  });

  it("instrumentId is stable across two different reports for the same hypothesis kind", () => {
    const reportA = runBacktestHarness([pick({ id: "a", result: "WIN" })], { now: NOW, minSampleSize: 1000 });
    const reportB = runBacktestHarness(
      Array.from({ length: 5 }, (_, i) => pick({ id: `b${i}`, result: "LOSS" })),
      { now: NOW, minSampleSize: 5 },
    );

    const instrumentA = buildModelBeatsClimatologyInstrument(reportA, sha256);
    const instrumentB = buildModelBeatsClimatologyInstrument(reportB, sha256);

    expect(instrumentA.instrumentId).toBe(instrumentB.instrumentId);
  });

  it("digest is identical for identical inputs and changes when the report's numbers change", () => {
    const rows: BacktestPickInput[] = Array.from({ length: 10 }, (_, i) => pick({ id: `p${i}`, result: i % 2 === 0 ? "WIN" : "LOSS" }));
    const reportA = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    const reportB = runBacktestHarness(rows, { now: NOW, minSampleSize: 5 });
    const instrumentA = buildModelBeatsClimatologyInstrument(reportA, sha256);
    const instrumentB = buildModelBeatsClimatologyInstrument(reportB, sha256);
    expect(instrumentA.digest).toBe(instrumentB.digest);

    const changedRows = [...rows.slice(0, -1), pick({ id: "p9", result: "WIN" })];
    const reportC = runBacktestHarness(changedRows, { now: NOW, minSampleSize: 5 });
    const instrumentC = buildModelBeatsClimatologyInstrument(reportC, sha256);
    expect(instrumentC.digest).not.toBe(instrumentA.digest);
  });
});
