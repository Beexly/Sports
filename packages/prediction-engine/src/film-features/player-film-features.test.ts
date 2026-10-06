import { describe, expect, it } from "vitest";
import {
  extractPlayerFilmFeatures,
  extractAllPlayerFilmFeatures,
} from "./player-film-features.js";
import { makeCorpus, makePlay } from "./film-fixtures.js";

describe("extractPlayerFilmFeatures", () => {
  it("extracts route mix, separation, and depth for a known player", () => {
    const plays = makeCorpus();
    const f = extractPlayerFilmFeatures(plays, "KC-WR1");
    expect(f).not.toBeNull();
    expect(f!.playerId).toBe("KC-WR1");
    expect(f!.nPlays).toBe(12);
    expect(f!.nRoutes).toBe(12);
    // route mix sums to 1
    const total = Object.values(f!.routeMix).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 3);
    // each of the 4 routes appears 3 times → 0.25 each
    expect(f!.routeMix["go"]).toBeCloseTo(0.25, 3);
    // separation from fixtures: 3 at break, 4 at catch, 90° breaks
    expect(f!.avgSepAtBreakYd).toBe(3);
    expect(f!.avgSepAtCatchYd).toBe(4);
    expect(f!.avgBreakAngleDeg).toBe(90);
    // avg depth: 8..19
    expect(f!.avgDepthYards).toBeCloseTo(13.5, 1);
  });

  it("computes red-zone route share from yard-line data", () => {
    const plays = makeCorpus();
    const f = extractPlayerFilmFeatures(plays, "KC-WR1");
    // yardLineOwn = 20,25,...,75 → none >= 80
    expect(f!.redZoneRouteShare).toBe(0);
  });

  it("returns null for a player never in the identity map", () => {
    const plays = makeCorpus();
    expect(extractPlayerFilmFeatures(plays, "NE-WR9")).toBeNull();
  });

  it("returns null when no player map exists (no guessing)", () => {
    const plays = [makePlay({ receivers: [] })];
    expect(extractPlayerFilmFeatures(plays, "KC-WR1")).toBeNull();
  });

  it("stamps provenance: film source, weight 0, UNCALIBRATED", () => {
    const plays = makeCorpus();
    const f = extractPlayerFilmFeatures(plays, "KC-WR1");
    expect(f!.provenance.source).toBe("film");
    expect(f!.provenance.weight).toBe(0);
    expect(f!.provenance.calibration).toBe("UNCALIBRATED");
    expect(f!.provenance.plays).toBe(12);
  });

  it("extracts all players and sorts by play count", () => {
    const plays = makeCorpus();
    const all = extractAllPlayerFilmFeatures(plays);
    expect(all.map((f) => f.playerId).sort()).toEqual(["KC-WR1", "KC-WR2"]);
  });
});
