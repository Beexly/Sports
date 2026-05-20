import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /picks demo-mode disclosure contract.
 *
 * Session A renders a sample-data banner on /picks when the dev
 * stub+demo flags are active. The banner clearly communicates:
 *   - These are not live picks
 *   - They never settle (never inflate win-rate)
 *   - No claim is published from them
 *
 * Pin the source-level contract so a future refactor doesn't strip
 * the disclosure.
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

describe("/picks demo-mode disclosure", () => {
  it("renders a sample-data banner when demoActive is true", () => {
    expect(pageSrc).toMatch(/demoActive/);
    expect(pageSrc).toMatch(/data-testid="sample-data-banner-picks"/);
  });

  it("banner uses ARIA role=status with aria-live for assistive tech", () => {
    expect(pageSrc).toMatch(/role="status"/);
    expect(pageSrc).toMatch(/aria-live="polite"/);
  });

  it("banner copy is brand-safe (no banned phrases)", () => {
    expect(pageSrc).not.toMatch(/guaranteed|risk-free|sure thing|easy money/i);
  });

  it("banner clearly says picks never settle / never count toward win-rate", () => {
    expect(pageSrc).toMatch(/never settle/i);
    expect(pageSrc).toMatch(/never count|win-rate|verified record/i);
  });

  it("demoActive gates on isStubMode + isDemoPicksEnabled", () => {
    expect(pageSrc).toMatch(/isStubMode\(\)\s*&&\s*isDemoPicksEnabled\(\)/);
  });
});
