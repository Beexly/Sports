import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /picks demo-mode contract (successor).
 *
 * HISTORY: the original file pinned the sample-data banner the teaser page
 * rendered under the dev stub+demo flags. Commit 30a6fe52f replaced that page
 * with the static sealed Week 8 locked board, which has no demo/stub path at
 * all, so the banner contract was retired with the page. The /api/picks
 * containsSeedData contract below is unchanged (the route is retained), and
 * the page-side block now pins the absence instead.
 */

const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

const apiSrc = read("app/api/picks/route.ts");
const pageSrc = read("app/picks/page.tsx");

describe("/api/picks containsSeedData flag", () => {
  it("computes containsSeedData by checking modelVersion === 'v5.0.0-seed'", () => {
    expect(apiSrc).toMatch(/containsSeedData/);
    expect(apiSrc).toMatch(/modelVersion === "v5\.0\.0-seed"/);
  });

  it("includes containsSeedData in the response meta", () => {
    expect(apiSrc).toMatch(/meta:\s*\{[\s\S]{0,500}containsSeedData[\s\S]{0,100}\}/);
  });
});

describe("/picks demo-mode has no home on the sealed page", () => {
  it("the sealed page carries no stub/demo/sample machinery (nothing to disclose)", () => {
    // The page renders only the sealed card; there is no demo path left to
    // disclose. (Absence pinned here and again in picks-page-policy-gate.)
    expect(pageSrc).not.toMatch(/isStubMode/);
    expect(pageSrc).not.toMatch(/demoActive/);
    expect(pageSrc).not.toMatch(/sample-data-banner/);
  });
});
