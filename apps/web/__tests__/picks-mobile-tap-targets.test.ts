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

    expect(picksPageSrc).toContain("inline-flex min-h-11 items-center rounded-lg border");
    expect(picksPageSrc).toContain("inline-flex min-h-11 items-center rounded-full");
    expect(picksPageSrc).toContain("inline-flex min-h-11 shrink-0 items-center justify-center");
    expect(picksPageSrc).toContain("className=\"min-h-11 rounded-lg border");
    expect(picksPageSrc).toContain("className=\"min-h-11 rounded-lg bg-titanium");
  });

  /**
   * The conditional states carry the picks board's only upgrade doors: the
   * paywall-locked banner and the free-tier bottom CTA both route to /pricing,
   * and the bootstrap/stale state routes to /methodology and /vault. Those four
   * links were the last on the page still sized purely by `py-2` / `py-2.5`,
   * i.e. below the 44px touch floor the rest of the page already holds to.
   *
   * Asserted against the source, not the DOM, because PicksPage is an async
   * server component that fetches its own data. The RENDERED-class equivalents
   * for the /pricing path live in pricing-mobile-tap-targets.test.tsx.
   */
  it("keeps the /pricing upgrade CTAs in the locked and free-tier states tappable", () => {
    const picksPageSrc = readComponent("app/picks/page.tsx");

    expect(picksPageSrc).toContain(
      "mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-ultraviolet",
    );
    expect(picksPageSrc).toContain(
      "mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-ultraviolet",
    );
  });

  it("keeps the bootstrap/stale-state escape links tappable", () => {
    const picksPageSrc = readComponent("app/picks/page.tsx");

    expect(picksPageSrc).toContain(
      "inline-flex min-h-11 items-center justify-center rounded-lg border border-orbital-cyan/30",
    );
    expect(picksPageSrc).toContain(
      "inline-flex min-h-11 items-center justify-center rounded-lg border border-titanium bg-carbon",
    );
  });
});
