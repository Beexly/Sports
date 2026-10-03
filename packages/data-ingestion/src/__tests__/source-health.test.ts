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

  it("treats a source with no known-fresh timestamp as stale, not fresh (trailing failures)", () => {
    const h = assessSourceHealth({
      source: "odds-api",
      recentOutcomes: [false, false],
      lastSuccessAt: undefined,
      now: NOW,
    });
    expect(h.state).toBe("degraded");
    expect(h.stalenessMinutes).toBeNull();
    // Never succeeded + no timestamp => freshness is unproven, so NOT usable.
    expect(h.stale).toBe(true);
    expect(h.usable).toBe(false);
  });

  it("treats a source with zero call history and no timestamp as unusable", () => {
    const h = assessSourceHealth({
      source: "espn",
      recentOutcomes: [],
      lastSuccessAt: undefined,
      now: NOW,
    });
    expect(h.state).toBe("closed");
    expect(h.stalenessMinutes).toBeNull();
    expect(h.stale).toBe(true);
    expect(h.usable).toBe(false);
  });

  it("allows a source with no timestamp when its most recent call succeeded", () => {
    const h = assessSourceHealth({
      source: "kalshi",
      recentOutcomes: [false, true],
      lastSuccessAt: undefined,
      now: NOW,
    });
    // A fresh success is direct evidence of life even without a stored timestamp.
    expect(h.stale).toBe(false);
    expect(h.usable).toBe(true);
  });

  it("treats an unparseable last-success timestamp as not-provably-fresh", () => {
    const h = assessSourceHealth({
      source: "api-sports",
      recentOutcomes: [false],
      lastSuccessAt: "not-a-date",
      now: NOW,
    });
    expect(h.stalenessMinutes).toBeNull();
    expect(h.stale).toBe(true);
    expect(h.usable).toBe(false);
  });
});
