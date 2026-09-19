import { describe, expect, it } from "vitest";
import {
  conformalQuantile,
  conformalQuantileRefused,
  cqrInterval,
  jackknifePlusTheoremCoverage,
  CQR_PRODUCT_NOTES,
} from "@/lib/calibration/cqr";

describe("CQR fail-closed quantile (no fake tightness)", () => {
  it("n=5 alpha=0.10 refuses — rank k=6 > n=5, qhat=+Inf", () => {
    const s = [0.1, 0.2, 0.3, 0.5, 0.8];
    const q = conformalQuantile(s, 0.1);
    expect(q).toBe(Number.POSITIVE_INFINITY);
    expect(conformalQuantileRefused(q)).toBe(true);
  });

  it("n=9 alpha=0.10 is finite — k=ceil(0.9*10)=9", () => {
    const s = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45];
    const q = conformalQuantile(s, 0.1);
    expect(Number.isFinite(q)).toBe(true);
    expect(q).toBeCloseTo(0.45, 10);
  });

  it("n=500 alpha=0.10 uses rank 451 (1-indexed)", () => {
    const s = Array.from({ length: 500 }, (_, i) => i / 500);
    const q = conformalQuantile(s, 0.1);
    // sorted[k-1] with k=ceil(0.9*501)=451 → index 450
    expect(q).toBeCloseTo(450 / 500, 10);
  });

  it("cqrInterval fail-closed when n=5 — infinite bands, not clamped residual", () => {
    const yCal = [1, 2, 3, 4, 5];
    const qLoCal = [0.5, 1.5, 2.5, 3.5, 4.5];
    const qHiCal = [1.5, 2.5, 3.5, 4.5, 5.5];
    const out = cqrInterval([10, 20], [12, 22], yCal, qLoCal, qHiCal, 0.1);
    expect(out.qhatInfinite).toBe(true);
    expect(out.status).toBe("fail_closed_insufficient_n");
    expect(out.lo.every((v) => v === Number.POSITIVE_INFINITY)).toBe(true);
    expect(out.hi.every((v) => v === Number.POSITIVE_INFINITY)).toBe(true);
  });

  it("cqrInterval expands when n is sufficient", () => {
    // 20 cal points all 0.5 inside their bands → residuals -0.5
    const yCal = Array.from({ length: 20 }, (_, i) => i + 1);
    const qLoCal = Array.from({ length: 20 }, (_, i) => i + 0.5);
    const qHiCal = Array.from({ length: 20 }, (_, i) => i + 1.5);
    const out = cqrInterval([10, 20], [12, 22], yCal, qLoCal, qHiCal, 0.1);
    expect(out.qhatInfinite).toBe(false);
    expect(out.status).toBe("ok");
    // all residuals -0.5 → qhat -0.5 → shrink by 0.5
    expect(out.qhat).toBeCloseTo(-0.5, 10);
    expect(out.lo[0]!).toBeCloseTo(10.5, 10);
  });

  it("Jackknife+ theorem floor is 1-2α, not 1-α", () => {
    expect(jackknifePlusTheoremCoverage(0.1)).toBeCloseTo(0.8, 10);
    expect(jackknifePlusTheoremCoverage(0.05)).toBeCloseTo(0.9, 10);
  });

  it("does not unlock PROVEN; bans clamping", () => {
    expect(CQR_PRODUCT_NOTES.unlocksProven).toBe(false);
    expect(CQR_PRODUCT_NOTES.defaultOff).toBe(true);
    expect(CQR_PRODUCT_NOTES.failClosed).toBe(true);
  });
});
