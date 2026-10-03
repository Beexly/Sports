import { describe, expect, it } from "vitest";
import {
  sportKeyToPowerIndexLeague,
  lookupTeamFpi,
  defaultPowerIndexSeason,
} from "../espn-powerindex-client.js";

describe("espn-powerindex-client", () => {
  it("maps sport keys", () => {
    expect(sportKeyToPowerIndexLeague("americanfootball_nfl")).toBe("nfl");
    expect(sportKeyToPowerIndexLeague("americanfootball_ncaaf")).toBe("ncaaf");
    expect(sportKeyToPowerIndexLeague("basketball_nba")).toBe("nba");
    expect(sportKeyToPowerIndexLeague("soccer_epl")).toBeNull();
  });

  it("lookupTeamFpi is exact-only (no fuzzy polarity risk)", () => {
    const map = new Map<string, number>([
      ["dallas cowboys", 8.2],
      ["dal", 8.2],
      ["kansas city chiefs", 12.1],
    ]);
    expect(lookupTeamFpi(map, "Dallas Cowboys")).toBeCloseTo(8.2, 5);
    expect(lookupTeamFpi(map, "DAL")).toBeCloseTo(8.2, 5);
    // Substring must NOT match — would risk wrong FPI
    expect(lookupTeamFpi(map, "Dallas")).toBeNull();
    expect(lookupTeamFpi(map, "Cowboys")).toBeNull();
    expect(lookupTeamFpi(map, "unknown team")).toBeNull();
  });

  it("defaultPowerIndexSeason uses prior year early calendar", () => {
    expect(defaultPowerIndexSeason(new Date("2026-03-01T00:00:00Z"))).toBe(
      2025,
    );
    expect(defaultPowerIndexSeason(new Date("2026-09-01T00:00:00Z"))).toBe(
      2026,
    );
  });
});
