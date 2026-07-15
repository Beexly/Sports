import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  FANTASY_BASELINE_MODULES,
  FANTASY_BASELINE_SOURCES,
  fantasyBaselineSummary,
} from "@/lib/fantasy/competitive-baseline";
import { isPublicFantasyToolPath } from "@/lib/fantasy/public-gate";

const repoRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(repoRoot, rel), "utf8");
}

describe("Fantasy competitive baseline", () => {
  it("maps the LineStar and Fantasy Guru / Elite baseline into explicit product modules", () => {
    expect(FANTASY_BASELINE_SOURCES.map((source) => source.name)).toEqual([
      "LineStar",
      "Fantasy Guru / Elite Sports",
    ]);
    expect(FANTASY_BASELINE_MODULES.length).toBeGreaterThanOrEqual(16);

    for (const key of [
      "daily-dashboard",
      "projections",
      "dfs-optimizer",
      "multi-lineup-manager",
      "ownership",
      "value-plays",
      "breaking-news-injuries",
      "props-ev",
      "rankings-cheatsheets",
      "analysis-strategy",
      "community-support",
      "multi-sport",
    ]) {
      expect(FANTASY_BASELINE_MODULES.some((module) => module.key === key)).toBe(true);
    }
  });

  it("keeps baseline statuses honest about live proof versus gated data", () => {
    const summary = fantasyBaselineSummary();

    expect(summary["live-proof"]).toBeGreaterThan(0);
    expect(summary["csv-import-ready"]).toBeGreaterThan(0);
    expect(summary["gated-data"]).toBeGreaterThan(0);
    expect(FANTASY_BASELINE_MODULES.some((module) => module.currentTruth.includes("gated"))).toBe(true);
    expect(FANTASY_BASELINE_MODULES.some((module) => module.currentTruth.includes("No public projection claims"))).toBe(true);
  });

  it("keeps the baseline as an internal contract instead of public product discovery", () => {
    const page = read("app/fantasy/baseline/page.tsx");
    const fantasy = read("app/fantasy/page.tsx");

    expect(page).toMatch(/LineStar plus Elite Sports is the floor/);
    expect(page).toMatch(/FANTASY_BASELINE_MODULES/);
    expect(isPublicFantasyToolPath("/fantasy/baseline")).toBe(true);
    expect(fantasy).not.toMatch(/href="\/fantasy\/baseline"/);
  });

  it("does not convert gated features into fake live claims", () => {
    const combined = [
      read("app/fantasy/baseline/page.tsx"),
      read("app/fantasy/page.tsx"),
      read("lib/fantasy/competitive-baseline.ts"),
    ].join("\n");

    expect(combined.toLowerCase()).not.toContain("guaranteed");
    expect(combined).not.toMatch(/100% win/i);
    expect(combined).toMatch(/No simulated salaries/);
    expect(combined).toMatch(/No public projection claims/);
  });
});
