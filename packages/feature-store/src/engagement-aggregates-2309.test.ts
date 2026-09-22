import { describe, expect, it } from "vitest";
import { aggregateEngagement, CHURN_WINDOW_DAYS, GSE_CHURN_TRANSFORMER_ENABLED } from "./engagement-aggregates-2309.js";

const NOW = Date.parse("2026-09-22T12:00:00Z");
const DAY = 86_400_000;

describe("engagement aggregates", () => {
  it("aggregates a trailing-30d window per user", () => {
    const events = [
      { userId: "u1", ts: NOW - DAY, kind: "pageview" as const },
      { userId: "u1", ts: NOW - 2 * DAY, kind: "pageview" as const },
      { userId: "u1", ts: NOW - DAY, kind: "x_engagement" as const },
      { userId: "u2", ts: NOW - DAY, kind: "pageview" as const },
      { userId: "u1", ts: NOW - 40 * DAY, kind: "pageview" as const }, // outside window
    ];
    const a = aggregateEngagement(events, "u1", NOW);
    expect(a.pageviews).toBe(2);
    expect(a.xEngagements).toBe(1);
    expect(a.windowDays).toBe(CHURN_WINDOW_DAYS);
    expect(a.activeDays).toBe(2);
  });
  it("returns zeros for a user with no events", () => {
    const a = aggregateEngagement([], "ghost", NOW);
    expect(a.pageviews).toBe(0);
    expect(a.activeDays).toBe(0);
  });
  it("excludes future events", () => {
    const a = aggregateEngagement([{ userId: "u1", ts: NOW + DAY, kind: "pageview" as const }], "u1", NOW);
    expect(a.pageviews).toBe(0);
  });
  it("keeps the transformer lane off until the AUC gate clears", () => {
    expect(GSE_CHURN_TRANSFORMER_ENABLED).toBe(false);
  });
  it("handles empty input", () => {
    const a = aggregateEngagement([], "u1", NOW);
    expect(a.pageviews).toBe(0);
    expect(a.activeDays).toBe(0);
    expect(a.userId).toBe("u1");
  });
  it("handles edge inputs", () => {
    // events for other users do not leak in
    const a = aggregateEngagement([{ userId: "u2", ts: NOW, kind: "pageview" as const }], "u1", NOW);
    expect(a.pageviews).toBe(0);
    // same-day duplicates count once for activeDays
    const b = aggregateEngagement([
      { userId: "u1", ts: NOW, kind: "pageview" as const },
      { userId: "u1", ts: NOW + 1000, kind: "pageview" as const },
    ], "u1", NOW + 2000);
    expect(b.pageviews).toBe(2);
    expect(b.activeDays).toBe(1);
  });
});

