import { describe, it, expect } from "vitest";
import {
  classifyRefreshFreshness,
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
