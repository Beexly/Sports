import { describe, expect, it } from "vitest";
import {
  analyzeNarrative,
  narrativeEdgeAdjustment,
  DEFAULT_NARRATIVE_EDGE_CAP,
  type NarrativeTextItem,
} from "../narrative-signal.js";

const NOW = new Date("2026-06-03T00:00:00Z");
const now = () => NOW;

const item = (over: Partial<NarrativeTextItem> & { text: string }): NarrativeTextItem => ({
  source: "reddit:r/nfl",
  athleteId: "nfl-ajbrown",
  publishedAt: "2026-06-03T00:00:00Z",
  ...over,
});

describe("analyzeNarrative", () => {
  it("reads a positive narrative (contract incentive + milestone) as a tailwind", () => {
    const signal = analyzeNarrative(
      [
        item({ text: "AJ Brown is in a contract year and chasing the franchise record" }),
        item({ source: "rss:espn", text: "He needs 120 yards for a career-high season" }),
      ],
      { now },
    );
    expect(signal).not.toBeNull();
    expect(signal!.direction).toBeGreaterThan(0);
    expect(signal!.themes.map((t) => t.theme)).toEqual(
      expect.arrayContaining(["contract_incentive", "milestone_chase"]),
    );
    const adj = narrativeEdgeAdjustment(signal);
    expect(adj).toBeGreaterThan(0);
    expect(adj).toBeLessThanOrEqual(DEFAULT_NARRATIVE_EDGE_CAP);
  });

  it("reads a negative narrative (frustration / benching) as a headwind", () => {
    const signal = analyzeNarrative(
      [item({ text: "Reportedly frustrated and wants out after being benched" })],
      { now },
    );
    expect(signal!.direction).toBeLessThan(0);
    expect(narrativeEdgeAdjustment(signal)).toBeLessThan(0);
  });

  it("returns null and a zero nudge when nothing triggers a theme", () => {
    expect(analyzeNarrative([item({ text: "had a quiet day at practice" })], { now })).toBeNull();
    expect(narrativeEdgeAdjustment(null)).toBe(0);
  });

  it("never exceeds the hard cap, even with overwhelming signal", () => {
    const flood = Array.from({ length: 50 }, (_, i) =>
      item({ source: `reddit:r/nfl#${i % 5}`, text: "motivated, something to prove, contract year incentives" }),
    );
    const adj = narrativeEdgeAdjustment(analyzeNarrative(flood, { now }));
    expect(adj).toBeGreaterThan(0);
    expect(adj).toBeLessThanOrEqual(DEFAULT_NARRATIVE_EDGE_CAP);
  });

  it("decays older items via recency half-life", () => {
    const recent = analyzeNarrative([item({ text: "contract year", publishedAt: "2026-06-03T00:00:00Z" })], { now, halfLifeDays: 7 });
    const old = analyzeNarrative([item({ text: "contract year", publishedAt: "2026-05-20T00:00:00Z" })], { now, halfLifeDays: 7 });
    const recentHeat = recent!.themes[0]?.heat ?? 0;
    const oldHeat = old!.themes[0]?.heat ?? 0;
    expect(oldHeat).toBeLessThan(recentHeat);
    expect(oldHeat).toBeCloseTo(recentHeat * 0.25, 2); // 14 days = two 7-day half-lives
  });
});
