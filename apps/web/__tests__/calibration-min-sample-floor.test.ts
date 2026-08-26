import { describe, it, expect } from "vitest";
import { computeCalibration, type CalibrationPickInput } from "@/lib/calibration/compute";

/**
 * Min-sample publish floor for the public calibration buckets.
 *
 * `computeCalibration` always computes a bucket's `observedWinRate` (proposals,
 * discrimination, and Brier use it internally), but a thin bucket — e.g. 2
 * settled picks reading "100%" — must never render a win-rate number on a public
 * surface. `sufficientSample` is the flag every public renderer (homepage curve,
 * /calibration ProofExplorer, /performance CalibrationPanel, /observatory
 * reliability diagram, /proof) gates on. This is the same class of guard
 * `/api/performance` already enforces, applied per confidence bucket.
 */

function picks(confidence: number, count: number): CalibrationPickInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p-${confidence}-${i}`,
    confidence,
    // settled (WIN/LOSS count toward sampleSize); the alternation is irrelevant
    // to the floor, which is about sample size, not the rate itself.
    result: i % 2 === 0 ? "WIN" : "LOSS",
  }));
}

describe("calibration min-sample floor (sufficientSample)", () => {
  it("marks a >=30-settled bucket publishable and a <30 bucket NOT publishable", () => {
    // 70-79 bucket: 35 settled → publishable. 80-89 bucket: 5 settled → withheld.
    const report = computeCalibration([...picks(75, 35), ...picks(85, 5)]);
    const b70 = report.buckets.find((b) => b.label === "70-79");
    const b80 = report.buckets.find((b) => b.label === "80-89");
    expect(b70?.sampleSize).toBe(35);
    expect(b70?.sufficientSample).toBe(true);
    expect(b80?.sampleSize).toBe(5);
    expect(b80?.sufficientSample).toBe(false);
  });

  it("a bucket exactly at the floor (30 settled) is publishable", () => {
    const report = computeCalibration(picks(65, 30));
    const b = report.buckets.find((x) => x.label === "60-69");
    expect(b?.sampleSize).toBe(30);
    expect(b?.sufficientSample).toBe(true);
  });

  it("empty buckets are never publishable", () => {
    const report = computeCalibration([]);
    expect(report.buckets.length).toBeGreaterThan(0);
    expect(report.buckets.every((b) => b.sufficientSample === false)).toBe(true);
  });

  it("counts DECIDED picks against the floor, not pushes padding the population", () => {
    // 25 decided (13W/12L) + 5 pushes = 30 rows. The bucket clears a 30-row
    // population but rests on only 25 real outcomes, so it must NOT publish.
    const rows: CalibrationPickInput[] = [
      ...Array.from({ length: 25 }, (_, i) => ({
        id: `d-${i}`,
        confidence: 75,
        result: (i % 2 === 0 ? "WIN" : "LOSS") as CalibrationPickInput["result"],
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `p-${i}`,
        confidence: 75,
        result: "PUSH" as CalibrationPickInput["result"],
      })),
    ];

    const report = computeCalibration(rows);
    const b = report.buckets.find((x) => x.label === "70-79");

    expect(b?.sampleSize).toBe(30); // population reaches the floor...
    expect(b?.wins).toBe(13);
    expect(b?.losses).toBe(12);
    expect(b?.pushes).toBe(5);
    expect(b?.sufficientSample).toBe(false); // ...but 25 decided does not.
  });

  it("publishes once DECIDED picks reach the floor even with pushes alongside", () => {
    const rows: CalibrationPickInput[] = [
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `d-${i}`,
        confidence: 75,
        result: (i % 2 === 0 ? "WIN" : "LOSS") as CalibrationPickInput["result"],
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `p-${i}`,
        confidence: 75,
        result: "PUSH" as CalibrationPickInput["result"],
      })),
    ];

    const report = computeCalibration(rows);
    const b = report.buckets.find((x) => x.label === "70-79");

    expect(b?.sampleSize).toBe(35);
    expect((b?.wins ?? 0) + (b?.losses ?? 0)).toBe(30);
    expect(b?.sufficientSample).toBe(true);
  });

  it("a bucket of nothing but pushes is never publishable", () => {
    const report = computeCalibration(
      Array.from({ length: 40 }, (_, i) => ({
        id: `p-${i}`,
        confidence: 75,
        result: "PUSH" as CalibrationPickInput["result"],
      }))
    );
    const b = report.buckets.find((x) => x.label === "70-79");

    expect(b?.sampleSize).toBe(40);
    expect(b?.sufficientSample).toBe(false);
    // No decided outcomes means no drift evidence — delta must not fabricate one.
    expect(b?.delta).toBe(0);
  });

  it("a thin bucket below the floor never publishes a 100%-from-2-picks rate", () => {
    // 2 settled wins in one band → observedWinRate would be 1.0; the floor must
    // mark it not publishable so no renderer shows "100%".
    const report = computeCalibration([
      { id: "w1", confidence: 95, result: "WIN" },
      { id: "w2", confidence: 95, result: "WIN" },
    ]);
    const b = report.buckets.find((x) => x.label === "90-100");
    expect(b?.sampleSize).toBe(2);
    expect(b?.observedWinRate).toBe(1); // computed internally...
    expect(b?.sufficientSample).toBe(false); // ...but never publishable.
  });
});
