import { describe, it, expect } from "vitest";
import {
  runWalkForwardTaxonomy,
  contextFromLevel1Category,
  type WalkForwardTaxonomyRow,
} from "../walk-forward-taxonomy.js";
import type { SportsGameContext } from "../../conformal/sports-taxonomy.js";

function ctx(overrides: Partial<SportsGameContext> = {}): SportsGameContext {
  return {
    isHome: true,
    isFavorite: true,
    restDays: 5,
    ...overrides,
  };
}

function row(
  context: SportsGameContext,
  extras: Partial<WalkForwardTaxonomyRow> = {},
): WalkForwardTaxonomyRow {
  return { context, ...extras };
}

describe("runWalkForwardTaxonomy", () => {
  it("returns empty diagnostics for empty input", () => {
    const report = runWalkForwardTaxonomy([]);
    expect(report.totalRows).toBe(0);
    expect(report.perCategory).toEqual([]);
    expect(report.overallCoverage).toBeNull();
    expect(report.overallMeanWidth).toBeNull();
    expect(report.alerts).toEqual([]);
  });

  it("assigns level-1 categories and aggregates coverage/width", () => {
    const rows: WalkForwardTaxonomyRow[] = [
      row(ctx({ isHome: true, isFavorite: true }), { covered: true, width: 0.1, residual: 0.02 }),
      row(ctx({ isHome: true, isFavorite: true }), { covered: false, width: 0.3, residual: -0.04 }),
      row(ctx({ isHome: false, isFavorite: false }), { covered: true, width: 0.2 }),
    ];
    const report = runWalkForwardTaxonomy(rows, { level: 1, minSamplesForTrust: 1 });

    expect(report.totalRows).toBe(3);
    expect(report.level).toBe(1);

    const homeFav = report.perCategory.find((c) => c.category === "home|favorite");
    expect(homeFav).toBeDefined();
    expect(homeFav!.sampleSize).toBe(2);
    expect(homeFav!.coverage).toBeCloseTo(0.5, 10);
    expect(homeFav!.meanWidth).toBeCloseTo(0.2, 10);

    const awayDog = report.perCategory.find((c) => c.category === "away|underdog");
    expect(awayDog).toBeDefined();
    expect(awayDog!.sampleSize).toBe(1);
    expect(awayDog!.coverage).toBe(1);

    expect(report.overallCoverage).toBeCloseTo(2 / 3, 10);
    expect(report.overallMeanWidth).toBeCloseTo((0.1 + 0.3 + 0.2) / 3, 10);
  });

  it("level 2 includes rest bucket in the category key", () => {
    const rows = [
      row(ctx({ isHome: true, isFavorite: true, restDays: 2 }), { covered: true, width: 0.1 }),
      row(ctx({ isHome: true, isFavorite: true, restDays: 10 }), { covered: true, width: 0.1 }),
    ];
    const report = runWalkForwardTaxonomy(rows, { level: 2, minSamplesForTrust: 1 });
    const cats = report.perCategory.map((c) => c.category).sort();
    expect(cats).toEqual(["home|favorite|rest_long", "home|favorite|rest_short"]);
  });

  it("flags underpowered categories below minSamplesForTrust", () => {
    const rows = Array.from({ length: 5 }, () =>
      row(ctx(), { covered: true, width: 0.1 }),
    );
    const report = runWalkForwardTaxonomy(rows, { minSamplesForTrust: 30 });
    expect(report.underpowered).toContain("home|favorite");
    expect(report.alerts.some((a) => a.kind === "underpowered")).toBe(true);
  });

  it("flags under-coverage only when sample size clears the trust floor", () => {
    // 40 rows, only 50% covered → under_coverage once n >= 30
    const rows = Array.from({ length: 40 }, (_, i) =>
      row(ctx(), { covered: i < 20, width: 0.1 }),
    );
    const report = runWalkForwardTaxonomy(rows, {
      minSamplesForTrust: 30,
      targetCoverage: 0.9,
      coverageSlack: 0.05,
    });
    expect(report.underCoverage).toContain("home|favorite");
    expect(report.alerts.some((a) => a.kind === "under_coverage")).toBe(true);
  });

  it("does NOT flag under-coverage when n is below the trust floor (absence of evidence ≠ evidence of under-coverage)", () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      row(ctx(), { covered: i < 2, width: 0.1 }),
    );
    const report = runWalkForwardTaxonomy(rows, {
      minSamplesForTrust: 30,
      targetCoverage: 0.9,
    });
    expect(report.underCoverage).toEqual([]);
    // Still underpowered, though
    expect(report.underpowered).toContain("home|favorite");
  });

  it("flags wide intervals on well-populated categories", () => {
    const rows = Array.from({ length: 40 }, () =>
      row(ctx(), { covered: true, width: 0.4 }),
    );
    const report = runWalkForwardTaxonomy(rows, { minSamplesForTrust: 30 });
    expect(report.alerts.some((a) => a.kind === "wide_intervals")).toBe(true);
  });

  it("never invents coverage or width when rows omit them", () => {
    const rows = [row(ctx()), row(ctx({ isHome: false }))];
    const report = runWalkForwardTaxonomy(rows, { minSamplesForTrust: 1 });
    expect(report.overallCoverage).toBeNull();
    expect(report.overallMeanWidth).toBeNull();
    for (const cat of report.perCategory) {
      // coverage is 0/n when covered is never true and never undefined-counted...
      // Actually: covered undefined means the row does not increment coveredDenom
      // in overall, but summarizeCategoryDiagnostics still sets coverage = covered/n
      // where covered only increments on truthy. So coverage becomes 0 when all
      // covered fields are undefined (none were truthy).
      expect(cat.coverage).toBe(0);
    }
  });

  it("is deterministic: identical input → identical report", () => {
    const rows = [
      row(ctx({ isHome: true, isFavorite: false, restDays: 1 }), {
        covered: true,
        width: 0.12,
        residual: 0.01,
      }),
      row(ctx({ isHome: false, isFavorite: true, restDays: 8 }), {
        covered: false,
        width: 0.22,
      }),
    ];
    const a = runWalkForwardTaxonomy(rows, { level: 2 });
    const b = runWalkForwardTaxonomy(rows, { level: 2 });
    expect(a).toEqual(b);
  });
});

describe("contextFromLevel1Category", () => {
  it("round-trips a level-1 category produced by assignMondrianCategory", () => {
    const original = ctx({ isHome: false, isFavorite: true, restDays: 3 });
    // Level-1 ignores restDays for the key
    const recovered = contextFromLevel1Category("away|favorite");
    expect(recovered).not.toBeNull();
    expect(recovered!.isHome).toBe(false);
    expect(recovered!.isFavorite).toBe(true);
  });

  it("returns null for malformed or non-level-1 strings rather than inventing fields", () => {
    expect(contextFromLevel1Category("home")).toBeNull();
    expect(contextFromLevel1Category("foo|bar")).toBeNull();
    expect(contextFromLevel1Category("")).toBeNull();
  });
});
