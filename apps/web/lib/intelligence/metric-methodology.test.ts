import { describe, it, expect } from "vitest";
import {
  METRIC_METHODOLOGY,
  metricsByCategory,
  methodologySummary,
  stabilityRank,
} from "./metric-methodology";

const STABILITIES = ["anchor", "signal", "noisy"];
const CATEGORIES = ["passing", "receiving", "rushing", "usage", "availability", "baseball"];
const STATUSES = ["live", "queued"];

describe("metric methodology", () => {
  it("gives every metric the full four-part read with no blanks", () => {
    for (const m of METRIC_METHODOLOGY) {
      for (const field of [m.name, m.whatItIs, m.howWeRead, m.commonMistake, m.ourEdge]) {
        expect(field.trim().length, m.key).toBeGreaterThan(0);
      }
      expect(STABILITIES).toContain(m.stability);
      expect(CATEGORIES).toContain(m.category);
      expect(STATUSES).toContain(m.status);
    }
  });

  it("groups every metric by category with no empty groups", () => {
    const groups = metricsByCategory();
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    expect(groups.flatMap((g) => g.items)).toHaveLength(METRIC_METHODOLOGY.length);
  });

  it("keeps baseball metrics honestly queued until a source is verified", () => {
    const baseball = METRIC_METHODOLOGY.filter((m) => m.category === "baseball");
    expect(baseball.length).toBeGreaterThan(0);
    expect(baseball.every((m) => m.status === "queued")).toBe(true);
  });

  it("summarizes live vs queued and anchor counts", () => {
    const s = methodologySummary();
    expect(s.live + s.queued).toBe(s.total);
    expect(s.anchors).toBeGreaterThan(0);
    expect(s.total).toBe(METRIC_METHODOLOGY.length);
  });

  it("orders stability anchor → signal → noisy", () => {
    expect(stabilityRank("anchor")).toBeLessThan(stabilityRank("signal"));
    expect(stabilityRank("signal")).toBeLessThan(stabilityRank("noisy"));
  });
});
