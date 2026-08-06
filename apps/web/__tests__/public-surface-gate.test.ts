import { afterEach, describe, expect, it } from "vitest";
import { isContestsPublic, isStatsPublic } from "@/lib/launch/public-surface-gate";

const KEYS = ["STATS_PUBLIC", "CONTESTS_PUBLIC"] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("isStatsPublic", () => {
  it("defaults dark", () => {
    delete process.env.STATS_PUBLIC;
    expect(isStatsPublic()).toBe(false);
  });
  it("opt-in true", () => {
    process.env.STATS_PUBLIC = "true";
    expect(isStatsPublic()).toBe(true);
  });
  it("rejects falsey", () => {
    process.env.STATS_PUBLIC = "false";
    expect(isStatsPublic()).toBe(false);
  });
});

describe("isContestsPublic", () => {
  it("defaults public (complete free paper product)", () => {
    delete process.env.CONTESTS_PUBLIC;
    expect(isContestsPublic()).toBe(true);
  });
  it("emergency dark", () => {
    process.env.CONTESTS_PUBLIC = "false";
    expect(isContestsPublic()).toBe(false);
  });
});
