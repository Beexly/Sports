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
    expect(pickCardSrc).toContain("grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2");
  });

  it("keeps the Edge / Confidence / Books stat row three-up at every width", () => {
    // Design pass: the stat row is short numerals under short labels, so it
    // fits three-up at 375px and stays column-aligned across cards. It used to
    // stack (grid-cols-1 sm:grid-cols-3); it is now the shared PickStatRow.
    const pickCardSrc = readComponent("components/picks/pick-card.tsx");
    const statSrc = readComponent("components/picks/pick-stat.tsx");

    expect(pickCardSrc).toContain("<PickStatRow>");
    expect(statSrc).toContain("grid grid-cols-3 gap-x-4");
  });

  it("keeps visible picks-page controls mobile tappable", () => {
    const picksPageSrc = readComponent("app/picks/page.tsx");

    expect(picksPageSrc).toContain("inline-flex min-h-11 items-center rounded-lg border");
    expect(picksPageSrc).toContain("inline-flex min-h-11 items-center rounded-full");
    expect(picksPageSrc).toContain("inline-flex min-h-11 shrink-0 items-center justify-center");
    expect(picksPageSrc).toContain("className=\"min-h-11 rounded-lg border");
    expect(picksPageSrc).toContain("className=\"min-h-11 rounded-lg bg-titanium");
  });
});
