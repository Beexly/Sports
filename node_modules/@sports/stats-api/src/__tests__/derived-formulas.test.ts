import { describe, expect, it } from "vitest";
import {
  restDays,
  rollingMean,
  successRateRoll,
  selfClvFromArchive,
} from "../formulas/derived.js";

describe("derived formulas", () => {
  it("restDays computes finite days", () => {
    const r = restDays(0, 3 * 86_400_000);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(3);
    expect(r.licenseSpdx).toBe("CC-BY-4.0");
  });

  it("restDays refuses inverted window", () => {
    const r = restDays(1000, 500);
    expect(r.ok).toBe(false);
    expect(r.refuseCode).toBe("invalid_schedule_window");
  });

  it("rollingMean refuses below n floor", () => {
    const r = rollingMean([1, 2, 3], 8);
    expect(r.ok).toBe(false);
    expect(r.refuseCode).toBe("n_below_floor");
  });

  it("rollingMean computes mean when n ok", () => {
    const vals = Array.from({ length: 10 }, (_, i) => i + 1);
    const r = rollingMean(vals, 8);
    expect(r.ok).toBe(true);
    expect(r.n).toBe(8);
    expect(r.value).toBeCloseTo((3 + 4 + 5 + 6 + 7 + 8 + 9 + 10) / 8, 5);
  });

  it("successRateRoll refuses thin sample", () => {
    const r = successRateRoll([1, 1], [2, 2], 4);
    expect(r.ok).toBe(false);
  });

  it("successRateRoll computes rate", () => {
    const succ = Array(10).fill(1);
    const att = Array(10).fill(3);
    const r = successRateRoll(succ, att, 10);
    expect(r.ok).toBe(true);
    expect(r.value).toBeCloseTo(1 / 3, 5);
  });

  it("selfClv refuses invalid odds", () => {
    expect(selfClvFromArchive(0.5, 2).ok).toBe(false);
    expect(selfClvFromArchive(2, 1).ok).toBe(false);
  });

  it("selfClv positive when close longer", () => {
    const r = selfClvFromArchive(1.9, 2.1);
    expect(r.ok).toBe(true);
    expect(r.value).toBeGreaterThan(0);
  });
});
