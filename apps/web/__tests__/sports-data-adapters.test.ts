import { describe, expect, it } from "vitest";
import {
  getNFLVenue,
  isArtificialTurf,
  isHighAltitude,
  isIndoor,
  NFL_VENUES,
} from "../lib/sports-data/nfl-venues";

describe("NFL_VENUES static table", () => {
  it("has all 32 team abbreviations", () => {
    expect(NFL_VENUES.length).toBe(32);
  });

  it("getNFLVenue returns a venue for each team", () => {
    for (const v of NFL_VENUES) {
      expect(getNFLVenue(v.teamAbbr)).toBeDefined();
    }
  });

  it("returns undefined for unknown team", () => {
    expect(getNFLVenue("XYZ")).toBeUndefined();
  });

  it("Denver has high altitude", () => {
    const den = getNFLVenue("DEN");
    expect(den).toBeDefined();
    expect(isHighAltitude(den!)).toBe(true);
  });

  it("Green Bay has grass and open roof", () => {
    const gb = getNFLVenue("GB");
    expect(gb?.surface).toBe("grass");
    expect(gb?.roof).toBe("open");
  });

  it("Detroit has dome", () => {
    const det = getNFLVenue("DET");
    expect(isIndoor(det!)).toBe(true);
  });

  it("isArtificialTurf returns false for grass", () => {
    const gb = getNFLVenue("GB");
    expect(isArtificialTurf(gb!)).toBe(false);
  });

  it("isArtificialTurf returns true for turf/fieldturf", () => {
    const dal = getNFLVenue("DAL");
    expect(isArtificialTurf(dal!)).toBe(true);
  });

  it("all venues have valid surface type", () => {
    const validSurfaces = ["grass", "turf", "fieldturf", "astroturf", "unknown"];
    for (const v of NFL_VENUES) {
      expect(validSurfaces).toContain(v.surface);
    }
  });

  it("all venues have positive altitude", () => {
    for (const v of NFL_VENUES) {
      expect(v.altitudeFeet).toBeGreaterThanOrEqual(0);
    }
  });
});
