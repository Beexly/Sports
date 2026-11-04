import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /picks - display-state + conversion contract (successor).
 *
 * The original file pinned the display states of the server-rendered teaser
 * page (outage / bootstrap gate / true-empty / locked-upgrade / loading), each
 * sliced by `between(pageSrc, ...)` markers at module scope. Commit 30a6fe52f
 * replaced that page with the static sealed Week 8 locked board, which renders
 * exactly ONE state: the sealed card. The fetch, outage, gate, and locked/
 * empty branches it guarded no longer exist anywhere in the render path, so
 * the module-scope slices threw and the whole file collected zero tests.
 *
 * The stale slices were retired here. What survives is re-pinned: the page
 * renders no runtime-fetch state machinery at all (the deletion is the
 * contract), the conversion path to the paid storefront, the secondary door
 * to the props watchlist, and the loading skeleton still using the house
 * component.
 */

const webRoot = resolve(__dirname, "..");
const pageSrc = readFileSync(resolve(webRoot, "app/picks/page.tsx"), "utf8");
const loadingSrc = readFileSync(resolve(webRoot, "app/picks/loading.tsx"), "utf8");

describe("/picks - static sealed rendering has no runtime-fetch states to regress", () => {
  it("renders no fetch-state branches at all (no fetchError / bootstrapState / outage state)", () => {
    expect(pageSrc).not.toMatch(/fetchError/);
    expect(pageSrc).not.toMatch(/bootstrapState/);
    expect(pageSrc).not.toMatch(/picks-outage-state/);
    expect(pageSrc).not.toMatch(/\bfetch\(/);
  });

  it("mounts no hardcoded pick fixtures - cards render only from the sealed card", () => {
    expect(pageSrc).not.toMatch(/picks\s*=\s*\[\s*\{/);
    expect(pageSrc).toMatch(/card\.main\.filter/);
    expect(pageSrc).toMatch(/<SealedTable rows=\{locked\} \/>/);
  });

  it("keeps the conversion path to the paid storefront", () => {
    expect(pageSrc).toMatch(/href="\/packages"/);
    expect(pageSrc).toMatch(/Galaxy Picks packs/);
  });

  it("keeps the secondary door to the props watchlist", () => {
    expect(pageSrc).toMatch(/href="\/props"/);
  });

  it("the loading route paints the house skeleton, not a blank frame", () => {
    expect(loadingSrc).toContain("ToolPageSkeleton");
    expect(loadingSrc).toMatch(/label=/);
  });
});