import { describe, expect, it } from "vitest";
import { STADIUM_COORDINATES, travelMiles } from "../stadium-coordinates-c33";

describe("stadium coordinates (OSM Nominatim, venue-level)", () => {
  it("carries all 32 teams", () => {
    expect(Object.keys(STADIUM_COORDINATES)).toHaveLength(32);
  });

  it("every row names the Nominatim query that produced it", () => {
    for (const [team, s] of Object.entries(STADIUM_COORDINATES)) {
      expect(s.source, team).toContain("nominatim.openstreetmap.org/search?q=");
      expect(s.lat, team).toBeGreaterThan(24);
      expect(s.lat, team).toBeLessThan(49);
      expect(s.lon, team).toBeLessThan(-66);
      expect(s.lon, team).toBeGreaterThan(-125);
    }
  });

  it("BAL to CIN is the measured 423 miles", () => {
    expect(travelMiles("BAL", "CIN")).toBe(423);
  });

  it("is symmetric and bounded", () => {
    expect(travelMiles("CIN", "BAL")).toBe(travelMiles("BAL", "CIN"));
    expect(travelMiles("SEA", "MIA") as number).toBeGreaterThan(2500);
    expect(travelMiles("NYG", "NYJ") as number).toBeLessThan(25);
  });

  it("returns null for an unknown team instead of inventing a distance", () => {
    expect(travelMiles("XXX", "BAL")).toBeNull();
  });
});
