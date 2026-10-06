import { describe, expect, it } from "vitest";
import {
  blendProbability,
  receivingYardsPrior,
  anytimeTdPrior,
} from "./film-priors.js";
import { extractPlayerFilmFeatures } from "./player-film-features.js";
import { makeCorpus } from "./film-fixtures.js";

describe("blendProbability", () => {
  it("applies the blend law with weight pinned to 0", () => {
    // w=0 → output is exactly the base model probability
    expect(blendProbability(0.62, 0.9, 0)).toBeCloseTo(0.62, 10);
    expect(blendProbability(0.3, 0.05, 0)).toBeCloseTo(0.3, 10);
  });
});

describe("receivingYardsPrior", () => {
  it("produces a bounded, auditable prior labeled UNCALIBRATED", () => {
    const pf = extractPlayerFilmFeatures(makeCorpus(), "KC-WR1")!;
    const prior = receivingYardsPrior(pf, 62.5);
    expect(prior.market).toBe("receiving_yards_over");
    expect(prior.line).toBe(62.5);
    expect(prior.prior).toBeGreaterThanOrEqual(0.05);
    expect(prior.prior).toBeLessThanOrEqual(0.95);
    expect(prior.weight).toBe(0);
    expect(prior.calibration).toBe("UNCALIBRATED");
    // auditable components
    expect(Object.keys(prior.components)).toContain("targetShareTerm");
    expect(Object.keys(prior.components)).toContain("separationTerm");
    expect(Object.keys(prior.components)).toContain("depthTerm");
    expect(prior.n).toBe(12);
  });
});

describe("anytimeTdPrior", () => {
  it("produces a bounded TD prior with red-zone term", () => {
    const pf = extractPlayerFilmFeatures(makeCorpus(), "KC-WR1")!;
    const prior = anytimeTdPrior(pf);
    expect(prior.market).toBe("anytime_td");
    expect(prior.prior).toBeGreaterThanOrEqual(0.02);
    expect(prior.prior).toBeLessThanOrEqual(0.85);
    expect(prior.weight).toBe(0);
    expect(prior.calibration).toBe("UNCALIBRATED");
    expect(Object.keys(prior.components)).toContain("redZoneTerm");
  });
});
