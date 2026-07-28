import { describe, it, expect } from "vitest";
import {
  restBucket,
  tier1Categories,
  tier2Intersections,
  assignMondrianCategory,
  parentCategory,
  summarizeCategoryDiagnostics,
  type SportsGameContext,
} from "../conformal/sports-taxonomy.js";

function ctx(overrides: Partial<SportsGameContext> = {}): SportsGameContext {
  return {
    isHome: true,
    isFavorite: true,
    restDays: 5,
    ...overrides,
  };
}

describe("restBucket", () => {
  it("<=3 days is rest_short", () => {
    expect(restBucket(0)).toBe("rest_short");
    expect(restBucket(3)).toBe("rest_short");
  });

  it("4-7 days is rest_normal", () => {
    expect(restBucket(4)).toBe("rest_normal");
    expect(restBucket(7)).toBe("rest_normal");
  });

  it(">7 days is rest_long", () => {
    expect(restBucket(8)).toBe("rest_long");
    expect(restBucket(30)).toBe("rest_long");
  });
});

describe("tier1Categories", () => {
  it("includes home/away, favorite/underdog, and rest bucket for a minimal context", () => {
    const cats = tier1Categories(ctx());
    expect(cats).toContain("home");
    expect(cats).toContain("favorite");
    expect(cats).toContain("rest_normal");
  });

  it("flips to away/underdog correctly", () => {
    const cats = tier1Categories(ctx({ isHome: false, isFavorite: false }));
    expect(cats).toContain("away");
    expect(cats).toContain("underdog");
  });

  it("includes optional tags only when present", () => {
    const minimal = tier1Categories(ctx());
    expect(minimal.some((c) => c.startsWith("pos:"))).toBe(false);
    expect(minimal).not.toContain("primetime");

    const withExtras = tier1Categories(
      ctx({ position: "QB", isPrimetime: true, isDivisional: true, extraTags: ["outdoor"] }),
    );
    expect(withExtras).toContain("pos:QB");
    expect(withExtras).toContain("primetime");
    expect(withExtras).toContain("divisional");
    expect(withExtras).toContain("outdoor");
  });

  it("isDivisional=false emits non_divisional, not silence", () => {
    const cats = tier1Categories(ctx({ isDivisional: false }));
    expect(cats).toContain("non_divisional");
  });
});

describe("tier2Intersections", () => {
  it("produces exactly the four documented pairwise/triple intersections", () => {
    const inter = tier2Intersections(ctx({ isHome: true, isFavorite: false, restDays: 2 }));
    expect(inter).toEqual([
      "home|underdog",
      "home|rest_short",
      "underdog|rest_short",
      "home|underdog|rest_short",
    ]);
  });
});

describe("assignMondrianCategory", () => {
  it("level 1 (default) joins home|fav only", () => {
    expect(assignMondrianCategory(ctx({ isHome: true, isFavorite: true }))).toBe("home|favorite");
  });

  it("level 2 includes the rest bucket", () => {
    expect(assignMondrianCategory(ctx({ isHome: false, isFavorite: true, restDays: 10 }), 2)).toBe(
      "away|favorite|rest_long",
    );
  });

  it("is a pure function of the context (same input -> same output)", () => {
    const c = ctx({ isHome: false, restDays: 1 });
    expect(assignMondrianCategory(c)).toBe(assignMondrianCategory(c));
  });
});

describe("parentCategory", () => {
  it("drops the last pipe-delimited segment", () => {
    expect(parentCategory("home|favorite|rest_long")).toBe("home|favorite");
    expect(parentCategory("home|favorite")).toBe("home");
  });

  it("returns null once there is nothing left to strip", () => {
    expect(parentCategory("home")).toBeNull();
    expect(parentCategory("")).toBeNull();
  });

  it("never infinite-loops: repeated application always terminates at null", () => {
    let cat: string | null = "home|favorite|rest_long|primetime";
    let steps = 0;
    while (cat !== null && steps < 100) {
      cat = parentCategory(cat);
      steps += 1;
    }
    expect(cat).toBeNull();
    expect(steps).toBeLessThan(100);
  });
});

describe("summarizeCategoryDiagnostics", () => {
  it("aggregates sample size, coverage, width, and residual per category", () => {
    const summary = summarizeCategoryDiagnostics([
      { category: "home|favorite", covered: true, width: 0.1, residual: 0.02 },
      { category: "home|favorite", covered: false, width: 0.3, residual: -0.05 },
      { category: "away|underdog", covered: true, width: 0.2 },
    ]);
    const home = summary.find((s) => s.category === "home|favorite")!;
    expect(home.sampleSize).toBe(2);
    expect(home.coverage).toBeCloseTo(0.5, 10);
    expect(home.meanWidth).toBeCloseTo(0.2, 10);
    expect(home.meanResidual).toBeCloseTo(-0.015, 10);

    const away = summary.find((s) => s.category === "away|underdog")!;
    expect(away.sampleSize).toBe(1);
    expect(away.coverage).toBe(1);
    expect(away.meanResidual).toBe(0); // no residual entries supplied
  });

  it("returns entries sorted lexicographically by category", () => {
    const summary = summarizeCategoryDiagnostics([
      { category: "zeta" },
      { category: "alpha" },
      { category: "mid" },
    ]);
    expect(summary.map((s) => s.category)).toEqual(["alpha", "mid", "zeta"]);
  });

  it("returns an empty array for empty input", () => {
    expect(summarizeCategoryDiagnostics([])).toEqual([]);
  });
});
