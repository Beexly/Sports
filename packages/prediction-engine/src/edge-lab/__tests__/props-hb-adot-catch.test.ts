import { describe, expect, it } from "vitest";
import {
  ADOT_CATCH_METHOD_TAG,
  bucketAdot,
  fitAdotCatchPriors,
  posteriorAdotCatch,
  probOverReceptionsByAdot,
} from "../props-hb-adot-catch.js";

const MIXED = [
  { targets: 10, receptions: 10, airYards: 18 },
  { targets: 10, receptions: 3, airYards: 22 },
  { targets: 9, receptions: 8, airYards: 27 },
  { targets: 8, receptions: 2, airYards: 16 },
  { targets: 11, receptions: 9, airYards: 30 },
  { targets: 8, receptions: 4, airYards: 20 },
  { targets: 8, receptions: 6, airYards: 168 },
  { targets: 8, receptions: 0, airYards: 176 },
  { targets: 9, receptions: 5, airYards: 180 },
  { targets: 7, receptions: 1, airYards: 154 },
  { targets: 10, receptions: 4, airYards: 210 },
  { targets: 6, receptions: 0, airYards: 132 },
];

describe("bucketAdot", () => {
  it("splits short / intermediate / deep at 5 and 15", () => {
    expect(bucketAdot(2)).toBe("short");
    expect(bucketAdot(5)).toBe("intermediate");
    expect(bucketAdot(15)).toBe("intermediate");
    expect(bucketAdot(18)).toBe("deep");
    expect(ADOT_CATCH_METHOD_TAG).toBe("props_hb_adot_catch_v1");
  });
});

describe("fitAdotCatchPriors", () => {
  it("fits separate short and deep priors so a go-route is not a screen", () => {
    const fits = fitAdotCatchPriors(MIXED);
    const names = fits.map((f) => f.bucket);
    expect(names).toContain("short");
    expect(names).toContain("deep");
    const short = fits.find((f) => f.bucket === "short")!;
    const deep = fits.find((f) => f.bucket === "deep")!;
    expect(short.prior.alpha / (short.prior.alpha + short.prior.beta)).toBeGreaterThan(
      deep.prior.alpha / (deep.prior.alpha + deep.prior.beta),
    );
  });

  it("rejects 0-target rows", () => {
    expect(() => fitAdotCatchPriors([{ targets: 0, receptions: 0, airYards: 0 }])).toThrow(RangeError);
  });
});

describe("probOverReceptionsByAdot", () => {
  it("is 0 when next-game targets are 0", () => {
    const fits = fitAdotCatchPriors(MIXED);
    const posts = posteriorAdotCatch(fits, MIXED);
    expect(probOverReceptionsByAdot(posts, 0, 4.5)).toBe(0);
  });

  it("is higher at a 3.5 line than at 8.5 for 10 targets", () => {
    const fits = fitAdotCatchPriors(MIXED);
    const posts = posteriorAdotCatch(fits, MIXED);
    const low = probOverReceptionsByAdot(posts, 10, 3.5);
    const high = probOverReceptionsByAdot(posts, 10, 8.5);
    expect(low).toBeGreaterThan(high);
    expect(low).toBeGreaterThan(0.2);
  });
});
