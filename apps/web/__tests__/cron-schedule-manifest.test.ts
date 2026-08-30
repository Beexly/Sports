/**
 * Cron manifest parser + drift guard.
 *
 * `expectedMaxGapMinutes` powers scheduler-liveness's thresholds — a wrong
 * gap silently mis-tunes when "dead" fires. The drift guard reads the real
 * vercel.json so a cron can never be added/edited there without this
 * manifest (and therefore liveness assessment) noticing.
 */
import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  CRON_MANIFEST,
  cronEntry,
  expectedMaxGapMinutes,
  findCronEntry,
} from "@/lib/ops/cron-schedule-manifest";

describe("expectedMaxGapMinutes", () => {
  it("every-N-minutes: gap equals N (including day wrap-around)", () => {
    expect(expectedMaxGapMinutes("*/15 * * * *")).toBe(15);
    expect(expectedMaxGapMinutes("*/30 * * * *")).toBe(30);
  });

  it("every-N-hours at a fixed minute: gap equals N hours in minutes", () => {
    expect(expectedMaxGapMinutes("0 */2 * * *")).toBe(120);
    expect(expectedMaxGapMinutes("40 */6 * * *")).toBe(360);
  });

  it("comma list within the hour: gap is the largest inter-firing distance, wrap included", () => {
    // Fires at :02, :17, :32, :47 every hour → 15m apart, wrap 02+ (60-47)=15m too.
    expect(expectedMaxGapMinutes("2,17,32,47 * * * *")).toBe(15);
  });

  it("hourly at a fixed minute: gap is exactly 60", () => {
    expect(expectedMaxGapMinutes("20 * * * *")).toBe(60);
  });

  it("multiple comma-separated minutes on an hour list: largest real gap, not naive wrap", () => {
    // 15 */3 * * * → fires at :15 every 3rd hour (0,3,6,...,21). Gap is 3h = 180m.
    expect(expectedMaxGapMinutes("15 */3 * * *")).toBe(180);
  });

  it("once-daily: gap is 24h in minutes", () => {
    expect(expectedMaxGapMinutes("0 11 * * *")).toBe(1440);
  });

  it("returns null for day-of-month/month/day-of-week restricted schedules", () => {
    expect(expectedMaxGapMinutes("0 0 1 * *")).toBeNull();
    expect(expectedMaxGapMinutes("0 0 * * 1")).toBeNull();
    expect(expectedMaxGapMinutes("0 0 * 6 *")).toBeNull();
  });

  it("returns null for malformed or non-5-field expressions", () => {
    expect(expectedMaxGapMinutes("not a cron")).toBeNull();
    expect(expectedMaxGapMinutes("* * * *")).toBeNull();
    expect(expectedMaxGapMinutes("")).toBeNull();
  });

  it("returns null for out-of-range values rather than guessing", () => {
    expect(expectedMaxGapMinutes("99 * * * *")).toBeNull();
    expect(expectedMaxGapMinutes("0 25 * * *")).toBeNull();
  });
});

describe("cronEntry", () => {
  it("derives expectedMaxGapMinutes from the schedule", () => {
    const entry = cronEntry("/api/cron/refresh-odds", "*/15 * * * *");
    expect(entry).toEqual({
      path: "/api/cron/refresh-odds",
      schedule: "*/15 * * * *",
      expectedMaxGapMinutes: 15,
    });
  });
});

describe("findCronEntry", () => {
  it("finds a declared cron by path", () => {
    expect(findCronEntry("/api/cron/free-spine-health")?.expectedMaxGapMinutes).toBe(120);
  });

  it("returns null for an undeclared path", () => {
    expect(findCronEntry("/api/cron/does-not-exist")).toBeNull();
  });
});

describe("CRON_MANIFEST vs vercel.json (drift guard)", () => {
  it("matches every cron path + schedule declared in vercel.json, in order", () => {
    const repoRoot = path.resolve(__dirname, "..", "..", "..");
    const vercelJsonPath = path.join(repoRoot, "vercel.json");
    const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, "utf8")) as {
      crons: ReadonlyArray<{ path: string; schedule: string }>;
    };

    const declared = vercelJson.crons.map((c) => ({ path: c.path, schedule: c.schedule }));
    const manifested = CRON_MANIFEST.map((c) => ({ path: c.path, schedule: c.schedule }));

    expect(manifested).toEqual(declared);
  });
});
