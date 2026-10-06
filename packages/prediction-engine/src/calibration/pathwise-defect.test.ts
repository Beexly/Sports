import { describe, expect, it } from "vitest";
import {
  calibrationHistoryWithholds,
  equalWidthEce,
  readFit,
  residualSumOfSquares,
  screenCalibrationBlindSpots,
  studentTTwoSidedP,
  type BinaryRow,
} from "./pathwise-defect";

function periodicHonest(n = 200): BinaryRow[] {
  const rows: BinaryRow[] = [];
  let a = 0;
  let b = 0;
  for (let i = 0; i < n; i++) {
    const stratum = i % 2 === 0 ? "A" : "B";
    const k = stratum === "A" ? a++ : b++;
    const y = k % 20 < 11 ? 1 : 0;
    rows.push({ p: 0.55, y, stratum, path: i });
  }
  return rows;
}

describe("pathwise-defect", () => {
  it("stays quiet on a sample whose slices match the pooled rate", () => {
    const screen = screenCalibrationBlindSpots(periodicHonest());
    expect(screen.ece).toBeCloseTo(0, 10);
    expect(screen.pooledGap).toBeCloseTo(0, 10);
    expect(screen.flags).toEqual([]);
  });

  it("flags a stratum break that pooled ECE cannot see", () => {
    const rows: BinaryRow[] = [];
    let a = 0;
    let b = 0;
    for (let i = 0; i < 200; i++) {
      const stratum = i % 2 === 0 ? "A" : "B";
      const k = stratum === "A" ? a++ : b++;
      const y = (stratum === "A" ? k % 10 < 7 : k % 10 < 4) ? 1 : 0;
      rows.push({ p: 0.55, y, stratum, path: i });
    }
    const screen = screenCalibrationBlindSpots(rows);
    expect(screen.ece).toBeCloseTo(0, 10);
    expect(screen.pooledGap).toBeCloseTo(0, 10);
    expect(screen.flags).toEqual(["AGGREGATE_ECE_BLIND_TO_STRATUM"]);
    const byId = Object.fromEntries(screen.strata.map((slice) => [slice.id, slice.gap]));
    expect(byId.A).toBeCloseTo(-0.15, 10);
    expect(byId.B).toBeCloseTo(0.15, 10);
  });

  it("flags a path break whose halves cancel in the pool", () => {
    const rows: BinaryRow[] = [];
    for (let i = 0; i < 200; i++) {
      rows.push({ p: 0.5, y: i < 100 ? 1 : 0, stratum: "all", path: i });
    }
    const screen = screenCalibrationBlindSpots(rows);
    expect(screen.ece).toBeCloseTo(0, 10);
    expect(screen.pooledGap).toBeCloseTo(0, 10);
    expect(equalWidthEce(rows.map((row) => row.p), rows.map((row) => row.y))).toBe(0);
    expect(screen.flags).toEqual(["AGGREGATE_ECE_BLIND_TO_PATH"]);
    expect(screen.path[0]?.gap).toBeCloseTo(-0.5, 10);
    expect(screen.path[1]?.gap).toBeCloseTo(0.5, 10);
  });

  it("flags an upper-tail miss that a 10-bin ECE dilutes under the ceiling", () => {
    const rows: BinaryRow[] = [];
    for (let i = 0; i < 900; i++) rows.push({ p: 0.5, y: i % 2 === 0 ? 1 : 0, stratum: "all", path: i });
    for (let i = 0; i < 100; i++) rows.push({ p: 0.9, y: i < 70 ? 1 : 0, stratum: "all", path: 900 + i });
    const screen = screenCalibrationBlindSpots(rows);
    expect(screen.ece).toBeCloseTo(0.02, 10);
    expect(screen.ece).toBeLessThanOrEqual(0.03);
    expect(screen.flags).toEqual(["TAIL_EXCESS_HIDDEN_BY_ECE"]);
    expect(screen.tail?.n).toBe(100);
    expect(screen.tail?.gap).toBeCloseTo(0.2, 10);
  });

  it("squares residuals before summing, so an imperfect line does not report R^2 of 1", () => {
    const ys = [1, 2, 3, 5];
    const fitted = [0.8, 2.1, 3.4, 4.7];
    const summedThenSquared = ys.reduce((s, y, i) => s + (y - (fitted[i] as number)), 0) ** 2;
    expect(summedThenSquared).toBeCloseTo(0, 10);
    expect(residualSumOfSquares(ys, fitted)).toBeCloseTo(0.3, 10);
  });

  it("splits when R^2 is moderate and the slope test is not", () => {
    const read = correlatedRead(12, 0.5);
    expect(read.rSquared).toBeGreaterThan(0.2);
    expect(read.pValue).toBeGreaterThan(0.05);
    expect(read.split).toBe(true);
  });

  it("splits when a huge sample makes a tiny slope significant", () => {
    const read = correlatedRead(900, 0.1);
    expect(read.rSquared).toBeLessThan(0.02);
    expect(read.pValue).toBeLessThan(0.05);
    expect(read.split).toBe(true);
  });

  it("does not split when R^2 and the slope test agree", () => {
    const strong = readFit([1, 2, 3, 4, 5, 6], [2, 4, 6, 8, 10, 12]);
    expect(strong.rSquared).toBeCloseTo(1, 10);
    expect(strong.pValue).toBe(0);
    expect(strong.split).toBe(false);
    const noise = correlatedRead(40, 0);
    expect(noise.rSquared).toBeCloseTo(0, 8);
    expect(noise.pValue).toBeGreaterThan(0.05);
    expect(noise.split).toBe(false);
  });

  it("matches the df=10 two-sided 5% critical value", () => {
    const p = studentTTwoSidedP(2.228138851986274, 10);
    expect(p).toBeGreaterThan(0.049);
    expect(p).toBeLessThan(0.051);
  });

  it("withholds only when a readable history actually shows a hidden slice", () => {
    expect(calibrationHistoryWithholds(undefined)).toBe(false);
    expect(calibrationHistoryWithholds([])).toBe(false);
    const tiny = Array.from({ length: 8 }, (_, i) => ({
      p: 0.5,
      y: (i < 4 ? 1 : 0) as 0 | 1,
      stratum: "all",
      path: i,
    }));
    expect(calibrationHistoryWithholds(tiny)).toBe(false);
    const broken = Array.from({ length: 200 }, (_, i) => ({
      p: 0.5,
      y: (i < 100 ? 1 : 0) as 0 | 1,
      stratum: "all",
      path: i,
    }));
    expect(calibrationHistoryWithholds(broken)).toBe(true);
    expect(calibrationHistoryWithholds([{ p: 1.4, y: 1, stratum: "all", path: 0 }])).toBe(true);
  });

  it("rejects empty, misaligned, and out-of-range input", () => {
    expect(() => screenCalibrationBlindSpots([])).toThrow(/empty/);
    expect(() => screenCalibrationBlindSpots([{ p: 1.2, y: 1, stratum: "A", path: 0 }])).toThrow(/\[0,1\]/);
    expect(() => readFit([1, 2], [1, 2])).toThrow(/at least 3/);
    expect(() => studentTTwoSidedP(0, 0)).toThrow(/df/);
  });
});

function correlatedRead(n: number, r: number) {
  const v1 = Array.from({ length: n }, (_, i) => i - (n - 1) / 2);
  const alt = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 1 : -1));
  let ss = 0;
  let dot = 0;
  for (let i = 0; i < n; i++) {
    ss += (v1[i] as number) * (v1[i] as number);
    dot += (v1[i] as number) * (alt[i] as number);
  }
  const v2 = alt.map((value, i) => value - (dot / ss) * (v1[i] as number));
  const z1 = unit(v1);
  const z2 = unit(v2);
  const ys = z1.map((x, i) => r * x + Math.sqrt(1 - r * r) * (z2[i] as number));
  return readFit(z1, ys);
}

function unit(xs: readonly number[]): number[] {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  let ss = 0;
  for (const x of xs) ss += (x - m) * (x - m);
  const scale = Math.sqrt(ss / xs.length);
  return xs.map((x) => (x - m) / scale);
}
