import { describe, expect, it } from "vitest";
import { extractRouteComboFeatures } from "./route-combo-features.js";
import { makeCorpus } from "./film-fixtures.js";

describe("extractRouteComboFeatures", () => {
  it("finds recurring combos per formation with results", () => {
    const plays = makeCorpus();
    const feats = extractRouteComboFeatures(plays, { minN: 2 });
    expect(feats.length).toBeGreaterThan(0);
    for (const f of feats) {
      expect(f.coverageShell).toBe("unknown");
      expect(f.n).toBeGreaterThanOrEqual(2);
      expect(f.share).toBeGreaterThan(0);
      expect(f.share).toBeLessThanOrEqual(1);
      expect(f.provenance.source).toBe("film");
      expect(f.provenance.weight).toBe(0);
      expect(f.provenance.calibration).toBe("UNCALIBRATED");
    }
    // corpus has avg result yards 4..15
    expect(feats[0]!.avgResultYards).not.toBeNull();
  });

  it("keeps the same combo distinct across formations", () => {
    const plays = makeCorpus();
    const feats = extractRouteComboFeatures(plays, { minN: 2 });
    const formations = new Set(feats.map((f) => f.formation));
    expect(formations.size).toBeGreaterThan(1);
  });

  it("returns empty when below minimum samples", () => {
    const feats = extractRouteComboFeatures(makeCorpus(), { minN: 100 });
    expect(feats).toEqual([]);
  });
});
