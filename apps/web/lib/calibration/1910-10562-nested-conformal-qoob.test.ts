import { describe, expect, it } from "vitest";

import {
  ENABLED,
  conformalQuantile,
  crossConformalInterval,
  intervalMethodForN,
  nestedSetInterval,
  qoobCalibrate,
  qoobInterval,
} from "@/lib/calibration/1910-10562-nested-conformal-qoob";

describe("nested conformal + QOOB", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("conformalQuantile uses the finite-sample rank", () => {
    const s = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    expect(conformalQuantile(s, 0.1)).toBe(1.0); // ceil(0.9*11)=10 -> 1.0
    expect(conformalQuantile([], 0.1)).toBe(Number.POSITIVE_INFINITY);
  });

  it("nested-set interval covers at the nominal rate on iid data", () => {
    let st = 999;
    const rnd = () => {
      st = (st * 1103515245 + 12345) & 0x7fffffff;
      return st / 0x7fffffff;
    };
    const calib = Array.from({ length: 400 }, () => Math.abs(rnd() * 4 - 2));
    const test = Array.from({ length: 2000 }, () => rnd() * 4 - 2);
    const { lo, hi } = nestedSetInterval(0, calib, 0.1);
    const cov = test.filter((y) => y >= lo && y <= hi).length / test.length;
    expect(cov).toBeGreaterThan(0.87);
    expect(cov).toBeLessThan(0.93);
  });

  it("cross-conformal pools out-of-fold residuals", () => {
    const xs = [1, 2, 3, 4, 5, 6];
    const ys = [1.1, 2.2, 2.9, 4.1, 5.0, 6.2];
    const folds = [0, 1, 2].map((k) => ({
      predict: (x: number) => x + 0.1 * k,
      heldOut: [k * 2, k * 2 + 1],
    }));
    const res = crossConformalInterval(xs, ys, folds, (x) => x, 3.5, 0.2);
    expect(res.nCal).toBe(6);
    expect(res.hi).toBeGreaterThan(res.lo);
  });

  it("QOOB calibration expands bands to hit coverage", () => {
    const oobLo = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49];
    const oobHi = oobLo.map((l) => l + 2); // too narrow
    const ys = [39, 44, 41, 46, 43, 48, 45, 50, 42, 47];
    const { expansion, coverage } = qoobCalibrate(oobLo, oobHi, ys, 0.2);
    expect(expansion).toBeGreaterThan(0);
    expect(coverage).toBeGreaterThanOrEqual(0.7);
    const band = qoobInterval(44, 46, expansion);
    expect(band.lo).toBeLessThan(44);
    expect(band.hi).toBeGreaterThan(46);
  });

  it("hands off to split-CQR at n_cal >= 200", () => {
    expect(intervalMethodForN(30)).toBe("qoob");
    expect(intervalMethodForN(199)).toBe("qoob");
    expect(intervalMethodForN(200)).toBe("split-cqr");
  });
});
