import { describe, it, expect } from "vitest";
import {
  isOffSeasonNoop,
  offSeasonNoopResponse,
} from "@/lib/cron/off-season-noop";

describe("isOffSeasonNoop", () => {
  it("returns true when no sport requested and zero in season", () => {
    expect(isOffSeasonNoop({ requestedSport: null, getInSeason: () => [] })).toBe(true);
  });

  it("returns false when a sport is explicitly requested (manual backfill)", () => {
    expect(
      isOffSeasonNoop({
        requestedSport: "americanfootball_nfl",
        getInSeason: () => [],
      }),
    ).toBe(false);
  });

  it("returns false when at least one sport is in season", () => {
    expect(
      isOffSeasonNoop({
        requestedSport: null,
        getInSeason: () => [{ key: "basketball_nba" }],
      }),
    ).toBe(false);
  });
});

describe("offSeasonNoopResponse", () => {
  it("produces a machine-readable off-season envelope", () => {
    const r = offSeasonNoopResponse(null);
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe("off-season-noop");
    expect(r.refreshed).toBe(false);
    expect(r.requestedSport).toBeNull();
    expect(typeof r.reason).toBe("string");
  });

  it("echoes an explicitly requested sport", () => {
    const r = offSeasonNoopResponse("icehockey_nhl");
    expect(r.requestedSport).toBe("icehockey_nhl");
  });
});
