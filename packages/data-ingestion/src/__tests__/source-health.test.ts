import { describe, expect, it } from "vitest";
import { assessSourceHealth } from "../source-health";

const NOW = "2026-06-03T18:00:00Z";

describe("assessSourceHealth", () => {
  it("is closed and usable when recent and succeeding", () => {
    const h = assessSourceHealth({
      source: "odds-api",
      recentOutcomes: [true, true, true],
      lastSuccessAt: "2026-06-03T17:58:00Z",
      now: NOW,
    });
    expect(h.state).toBe("closed");
    expect(h.usable).toBe(true);
    expect(h.stalenessMinutes).toBe(2);
  });

  it("trips OPEN and becomes unusable after consecutive failures", () => {
    const h = assessSourceHealth({
      source: "espn",
      recentOutcomes: [true, false, false, false],
      lastSuccessAt: "2026-06-03T17:55:00Z",
      now: NOW,
    });
    expect(h.consecutiveFailures).toBe(3);
    expect(h.state).toBe("open");
    expect(h.usable).toBe(false);
  });

  it("is degraded (still usable) on an isolated failure", () => {
    const h = assessSourceHealth({
      source: "kalshi",
      recentOutcomes: [false, true, true],
      lastSuccessAt: "2026-06-03T17:59:00Z",
      now: NOW,
    });
    expect(h.state).toBe("degraded");
    expect(h.usable).toBe(true);
  });

  it("marks a stale source unusable even while succeeding", () => {
    const h = assessSourceHealth({
      source: "api-sports",
      recentOutcomes: [true, true],
      lastSuccessAt: "2026-06-03T17:00:00Z", // 60 min ago
      now: NOW,
    });
    expect(h.stale).toBe(true);
    expect(h.usable).toBe(false);
  });
});
