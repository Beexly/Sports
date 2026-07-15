import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("public picks data-quality floor", () => {
  it("sets the public pick data-quality floor to the board publish threshold", () => {
    const src = read("lib/public-picks-quality.ts");

    expect(src).toMatch(/MIN_PUBLIC_PICK_DATA_QUALITY_SCORE\s*=\s*70/);
  });

  it("filters /api/picks by game data quality before mapping public payloads", () => {
    const src = read("app/api/picks/route.ts");

    expect(src).toMatch(/MIN_PUBLIC_PICK_DATA_QUALITY_SCORE/);
    expect(src).toMatch(/dataQualityScore:\s*\{\s*gte:\s*MIN_PUBLIC_PICK_DATA_QUALITY_SCORE\s*\}/);
    expect(src.indexOf("game: gameFilter")).toBeLessThan(src.indexOf("picks.flatMap"));
  });

  it("applies the same floor to daily-slate public pick counts", () => {
    const src = read("app/api/picks/daily-slate/route.ts");

    expect(src).toMatch(/MIN_PUBLIC_PICK_DATA_QUALITY_SCORE/);
    const baseWhere = src.indexOf("const baseWhere");
    const floor = src.indexOf("dataQualityScore: { gte: MIN_PUBLIC_PICK_DATA_QUALITY_SCORE }", baseWhere);
    const firstCount = src.indexOf("db.pick.count", baseWhere);
    expect(baseWhere).toBeGreaterThan(-1);
    expect(floor).toBeGreaterThan(baseWhere);
    expect(floor).toBeLessThan(firstCount);
  });
});
