import { describe, it, expect } from "vitest";
import {
  classifyRefreshFreshness,
  classifyPerSportRefreshFreshness,
  resolveFreshnessThresholds,
  REFRESH_WARN_AFTER_MINUTES,
  REFRESH_STALE_AFTER_MINUTES,
} from "@/lib/data-reliability/refresh-sla";

/**
 * Boundary tests for the shared Refresh SLA classifier. These pin the exact
 * cutoffs /api/health and Jarvis now share, so a future tweak to one threshold
 * can't silently change "healthy vs 503" without a failing test.
 */

const NOW = new Date("2026-06-17T12:00:00.000Z");

function minutesAgo(m: number): Date {
  return new Date(NOW.getTime() - m * 60 * 1000);
}

describe("classifyRefreshFreshness", () => {
  it("documents the expected thresholds (120m warn / 240m stale)", () => {
    expect(REFRESH_WARN_AFTER_MINUTES).toBe(120);
    expect(REFRESH_STALE_AFTER_MINUTES).toBe(240);
  });

  it("just under the warn threshold is ok", () => {
    const r = classifyRefreshFreshness(minutesAgo(REFRESH_WARN_AFTER_MINUTES - 1), NOW);
    expect(r.status).toBe("ok");
    expect(r.ageMinutes).toBe(119);
  });

  it("exactly at the warn threshold is still ok (boundary uses strict >)", () => {
    const r = classifyRefreshFreshness(minutesAgo(REFRESH_WARN_AFTER_MINUTES), NOW);
    expect(r.status).toBe("ok");
    expect(r.ageMinutes).toBe(120);
  });

  it("between warn and stale is warn", () => {
    const r = classifyRefreshFreshness(minutesAgo(180), NOW);
    expect(r.status).toBe("warn");
    expect(r.ageMinutes).toBe(180);
  });

  it("exactly at the stale threshold is still warn (boundary uses strict >)", () => {
    const r = classifyRefreshFreshness(minutesAgo(REFRESH_STALE_AFTER_MINUTES), NOW);
    expect(r.status).toBe("warn");
  });

  it("over the stale threshold is stale", () => {
    const r = classifyRefreshFreshness(minutesAgo(REFRESH_STALE_AFTER_MINUTES + 1), NOW);
    expect(r.status).toBe("stale");
    expect(r.ageMinutes).toBe(241);
  });

  it("null last-success is stale with null age (never-succeeded is never ok)", () => {
    const r = classifyRefreshFreshness(null, NOW);
    expect(r.status).toBe("stale");
    expect(r.ageMinutes).toBeNull();
  });
});

describe("resolveFreshnessThresholds", () => {
  it("falls back to the global SLA for an unregistered sport", () => {
    const t = resolveFreshnessThresholds("basketball_nba");
    expect(t.warnMinutes).toBe(REFRESH_WARN_AFTER_MINUTES);
    expect(t.staleMinutes).toBe(REFRESH_STALE_AFTER_MINUTES);
  });

  it("uses a registered per-sport override", () => {
    const t = resolveFreshnessThresholds("americanfootball_nfl", {
      "americanfootball_nfl": { warnMinutes: 30, staleMinutes: 60 },
    });
    expect(t.warnMinutes).toBe(30);
    expect(t.staleMinutes).toBe(60);
  });
});

describe("classifyPerSportRefreshFreshness", () => {
  it("treats an out-of-season sport as exempt (expected staleness)", () => {
    const r = classifyPerSportRefreshFreshness(
      "americanfootball_nfl",
      null,
      NOW,
      () => false, // out of season
    );
    expect(r.status).toBe("stale");
    expect(r.exempt).toBe(true);
    expect(r.sportKey).toBe("americanfootball_nfl");
  });

  it("does not exempt an out-of-season sport that overrides exempt off (contract: exempt only when OOS)", () => {
    // Defensive: even with a per-sport override, an out-of-season sport stays exempt.
    const r = classifyPerSportRefreshFreshness(
      "americanfootball_nfl",
      minutesAgo(10),
      NOW,
      () => false,
      { "americanfootball_nfl": { warnMinutes: 5, staleMinutes: 15 } },
    );
    expect(r.exempt).toBe(true);
    expect(r.status).toBe("stale");
  });

  it("applies the global SLA to an in-season sport with no override", () => {
    const r = classifyPerSportRefreshFreshness(
      "basketball_nba",
      minutesAgo(REFRESH_STALE_AFTER_MINUTES + 1),
      NOW,
      () => true,
    );
    expect(r.exempt).toBe(false);
    expect(r.status).toBe("stale");
  });

  it("applies a per-sport override when in season", () => {
    const r = classifyPerSportRefreshFreshness(
      "americanfootball_nfl",
      minutesAgo(45),
      NOW,
      () => true,
      { "americanfootball_nfl": { warnMinutes: 30, staleMinutes: 60 } },
    );
    // 45m > 30m warn and < 60m stale → "warn", not exempt, using the override.
    expect(r.exempt).toBe(false);
    expect(r.status).toBe("warn");
  });

  it("never-succeeded in season is a real stale (not exempt)", () => {
    const r = classifyPerSportRefreshFreshness(
      "basketball_nba",
      null,
      NOW,
      () => true,
    );
    expect(r.exempt).toBe(false);
    expect(r.status).toBe("stale");
    expect(r.ageMinutes).toBeNull();
  });
});
