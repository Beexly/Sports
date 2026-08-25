import { describe, expect, it } from "vitest";
import {
  ADOT_SEP_METHOD_TAG,
  TIGHT_SEP_MAX,
  bucketSep,
  fitAdotSepCatchPriors,
  posteriorAdotSepCatch,
} from "../props-hb-adot-sep.js";

describe("bucketSep", () => {
  it("splits at 2 yards, not a pooled catch process", () => {
    expect(bucketSep(1.2)).toBe("tight");
    expect(bucketSep(TIGHT_SEP_MAX)).toBe("open");
    expect(bucketSep(3.1)).toBe("open");
    expect(ADOT_SEP_METHOD_TAG).toBe("props_hb_adot_sep_v1");
  });
});

describe("fitAdotSepCatchPriors", () => {
  it("fits open-short separately from tight-deep", () => {
    const samples = [
      { targets: 8, receptions: 7, airYards: 16, avgSeparation: 3.2 },
      { targets: 7, receptions: 3, airYards: 14, avgSeparation: 3.0 },
      { targets: 9, receptions: 8, airYards: 18, avgSeparation: 2.8 },
      { targets: 6, receptions: 2, airYards: 12, avgSeparation: 2.9 },
      { targets: 10, receptions: 4, airYards: 20, avgSeparation: 3.5 },
      { targets: 6, receptions: 1, airYards: 90, avgSeparation: 0.8 },
      { targets: 7, receptions: 5, airYards: 105, avgSeparation: 0.9 },
      { targets: 8, receptions: 0, airYards: 120, avgSeparation: 1.1 },
      { targets: 9, receptions: 2, airYards: 140, avgSeparation: 0.6 },
      { targets: 5, receptions: 4, airYards: 80, avgSeparation: 1.0 },
    ];
    const fits = fitAdotSepCatchPriors(samples);
    expect(fits.length).toBeGreaterThan(0);
    const cells = new Set(fits.map((f) => f.cell));
    expect(cells.has("short_open") || cells.has("deep_tight")).toBe(true);
    const posts = posteriorAdotSepCatch(fits, samples);
    expect(posts.length).toBe(fits.length);
  });

  it("refuses negative separation", () => {
    expect(() =>
      fitAdotSepCatchPriors([{ targets: 4, receptions: 2, airYards: 8, avgSeparation: -1 }]),
    ).toThrow(RangeError);
  });
});
