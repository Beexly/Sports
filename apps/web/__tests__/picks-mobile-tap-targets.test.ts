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

  it("keeps visible picks-page controls mobile tappable", () => {
    const picksPageSrc = readComponent("app/picks/page.tsx");

    // Tap-target invariant is min-h-11 (44px); the radius/bg tokens follow the
    // unified dark theme (rounded-ds-sm / surface-*), not the legacy gray palette.
    expect(picksPageSrc).toContain("inline-flex min-h-11 items-center rounded-ds-sm border");
    expect(picksPageSrc).toContain("inline-flex min-h-11 items-center rounded-full");
    expect(picksPageSrc).toContain("inline-flex min-h-11 shrink-0 items-center justify-center");
    expect(picksPageSrc).toContain("min-h-11 rounded-ds-sm border border-surface-line bg-surface-sunken px-3 py-1.5 text-sm text-ion-1");
    expect(picksPageSrc).toContain("min-h-11 rounded-ds-sm border border-surface-line bg-surface-sunken px-3 py-1.5 text-sm font-medium");
  });
});
