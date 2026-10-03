import { describe, expect, it } from "vitest";
import { defaultSleeperSeason, SLEEPER_SEASON_ROLLOVER_MONTH } from "./sleeper-season";

describe("defaultSleeperSeason", () => {
  it("uses the current calendar year during the NFL season (kickoff week 2026)", () => {
    expect(defaultSleeperSeason(new Date("2026-09-05T17:00:00Z"))).toBe("2026");
    expect(defaultSleeperSeason(new Date("2026-12-31T23:59:59Z"))).toBe("2026");
  });

  it("keeps the prior season through the January/February playoffs", () => {
    expect(defaultSleeperSeason(new Date("2027-01-15T12:00:00Z"))).toBe("2026");
    expect(defaultSleeperSeason(new Date("2027-02-28T12:00:00Z"))).toBe("2026");
  });

  it("rolls to the new season in March when Sleeper opens next-season leagues", () => {
    expect(SLEEPER_SEASON_ROLLOVER_MONTH).toBe(2);
    expect(defaultSleeperSeason(new Date("2027-03-01T00:00:00Z"))).toBe("2027");
  });

  it("never returns the hard-coded 2025 default for a 2026-season clock", () => {
    expect(defaultSleeperSeason(new Date("2026-09-10T00:00:00Z"))).not.toBe("2025");
  });
});
