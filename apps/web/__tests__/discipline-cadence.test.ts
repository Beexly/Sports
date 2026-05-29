import { describe, it, expect } from "vitest";
import { computeCadence } from "@/lib/discipline/cadence";

const NOW = new Date("2026-05-29T12:00:00Z");

describe("computeCadence", () => {
  it("returns three windows: 7-day, 30-day, 90-day", () => {
    const report = computeCadence({
      noBetEventTimestamps: [],
      autopsyGradedTimestamps: [],
      moduleCompletedTimestamps: [],
      now: NOW,
    });
    expect(report.windows.map((w) => w.label)).toEqual(["7-day", "30-day", "90-day"]);
  });

  it("counts events within 7-day window correctly", () => {
    const within = new Date("2026-05-25T12:00:00Z").toISOString(); // 4 days ago
    const outside = new Date("2026-05-15T12:00:00Z").toISOString(); // 14 days ago
    const report = computeCadence({
      noBetEventTimestamps: [within, outside],
      autopsyGradedTimestamps: [],
      moduleCompletedTimestamps: [],
      now: NOW,
    });
    const w7 = report.windows.find((w) => w.label === "7-day")!;
    expect(w7.noBetCredits).toBe(1);
    const w30 = report.windows.find((w) => w.label === "30-day")!;
    expect(w30.noBetCredits).toBe(2);
  });

  it("90-day window includes events 30-day excludes", () => {
    const within90 = new Date("2026-03-15T12:00:00Z").toISOString(); // 75 days ago
    const report = computeCadence({
      noBetEventTimestamps: [within90],
      autopsyGradedTimestamps: [],
      moduleCompletedTimestamps: [],
      now: NOW,
    });
    const w30 = report.windows.find((w) => w.label === "30-day")!;
    const w90 = report.windows.find((w) => w.label === "90-day")!;
    expect(w30.noBetCredits).toBe(0);
    expect(w90.noBetCredits).toBe(1);
  });

  it("ignores malformed timestamps gracefully", () => {
    const report = computeCadence({
      noBetEventTimestamps: ["not-a-date", "2026-05-28T10:00:00Z"],
      autopsyGradedTimestamps: [],
      moduleCompletedTimestamps: [],
      now: NOW,
    });
    expect(report.windows[0]?.noBetCredits).toBe(1);
  });

  it("counts each event category independently", () => {
    const recent = "2026-05-28T10:00:00Z";
    const report = computeCadence({
      noBetEventTimestamps: [recent],
      autopsyGradedTimestamps: [recent, recent],
      moduleCompletedTimestamps: [recent, recent, recent],
      now: NOW,
    });
    const w7 = report.windows[0]!;
    expect(w7.noBetCredits).toBe(1);
    expect(w7.autopsiesGraded).toBe(2);
    expect(w7.modulesCompleted).toBe(3);
  });

  it("is a pure function", () => {
    const input = {
      noBetEventTimestamps: ["2026-05-28T10:00:00Z"],
      autopsyGradedTimestamps: [],
      moduleCompletedTimestamps: [],
      now: NOW,
    };
    const a = computeCadence(input);
    const b = computeCadence(input);
    expect(a).toEqual(b);
  });
});
