import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getIsoWeekDateRange } from "@/lib/journal/week-data";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const source = fs.readFileSync(path.join(repoRoot, "apps/web/lib/journal/week-data.ts"), "utf8");

describe("Model Journal week data loader", () => {
  it("computes ISO week ranges in UTC", () => {
    const range = getIsoWeekDateRange(2026, 1);

    expect(range.start.toISOString()).toBe("2025-12-29T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });

  it("loads only settled canonical public picks for the requested week", () => {
    expect(source).toContain("loadModelJournalWeekData");
    expect(source).toContain("result: { in: [...SETTLED_RESULTS] }");
    expect(source).toContain("isPublished: true");
    expect(source).toContain("isBootstrap: false");
    expect(source).toContain('NOT: { modelVersion: SEED_MODEL_VERSION }');
    expect(source).toContain("settledAt:");
    expect(source).toContain("gte: start");
    expect(source).toContain("lt: end");
  });

  it("includes signal snapshots and public loss autopsies as draft evidence", () => {
    expect(source).toContain("signalSnapshot:");
    expect(source).toContain("eligibleForLearning");
    expect(source).toContain("db.lossAutopsy");
    expect(source).toContain('status: "PUBLISHED"');
    expect(source).toContain("isPublic: true");
    expect(source).toContain("whatWeLearned");
  });

  it("returns counts the Journal prompt can use without recomputing outcomes", () => {
    expect(source).toContain("settledPicks: evidencePicks.length");
    expect(source).toContain('wins: evidencePicks.filter((pick) => pick.result === "WIN").length');
    expect(source).toContain('losses: evidencePicks.filter((pick) => pick.result === "LOSS").length');
    expect(source).toContain('pushes: evidencePicks.filter((pick) => pick.result === "PUSH").length');
    expect(source).toContain("publicLossAutopsies: evidenceAutopsies.length");
  });
});
