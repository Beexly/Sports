import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = resolve(__dirname, "..");

function readComponent(path: string): string {
  return readFileSync(resolve(webRoot, path), "utf8");
}

describe("picks mobile ergonomics", () => {
  it("keeps the evidence trigger, drawer close, and upgrade link at least 44px tall", () => {
    const drawerSrc = readComponent("components/picks/evidence-audit-drawer.tsx");

    expect(drawerSrc).toContain("inline-flex min-h-11 w-full");
    expect(drawerSrc).toContain("inline-flex min-h-11 min-w-11");
    expect(drawerSrc).toContain("inline-flex min-h-11 items-center justify-center");
  });

  it("uses mobile-first stacking where pick-card content is likely to squeeze", () => {
    const pickCardSrc = readComponent("components/picks/pick-card.tsx");

    expect(pickCardSrc).toContain("flex flex-col items-start gap-2 sm:flex-row");
    expect(pickCardSrc).toContain("mt-1.5 flex flex-col gap-3 sm:flex-row");
    expect(pickCardSrc).toContain("grid grid-cols-1 gap-3 sm:grid-cols-3");
    expect(pickCardSrc).toContain("grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2");
  });

  it("keeps the sealed-board page's customer links mobile tappable", () => {
    const picksPageSrc = readComponent("app/picks/page.tsx");
    const linkClassMatches = [...picksPageSrc.matchAll(/<Link[^>]*className="([^"]+)"/g)];

    expect(linkClassMatches.length).toBeGreaterThanOrEqual(5);
    for (const m of linkClassMatches) {
      expect(m[1]).toContain("min-h-11");
    }
  });

  /**
   * The sealed record is a wide table (Play / Model win prob / Market prob /
   * Edge / Read / Status). On a 375px screen the only honest way to keep every
   * column reachable is a horizontal-scroll wrapper: the table must never
   * crush its columns to fit. The wrapper lives in the SealedTable component
   * the page renders.
   */
  it("keeps the sealed record readable on narrow screens (horizontal-scroll wrapper)", () => {
    const sealedTableSrc = readComponent("components/week8/sealed-table.tsx");

    expect(sealedTableSrc).toContain("overflow-x-auto");
    expect(sealedTableSrc).toContain("min-w-[760px]");
  });

  it("mounts the standard nav and footer so the route keeps house chrome ergonomics", () => {
    const picksPageSrc = readComponent("app/picks/page.tsx");

    expect(picksPageSrc).toMatch(/<Nav \/>/);
    expect(picksPageSrc).toMatch(/<Footer \/>/);
  });
});
