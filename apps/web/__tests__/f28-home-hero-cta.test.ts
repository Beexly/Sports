import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * F-28 (founder-delegated 2026-09-08, via orchestrator): the home hero's
 * primary CTA goes to /picks, secondary to /pricing. /board stays
 * reachable from the "Four doors" section but is no longer presented as a
 * competing "today" surface — copy only, no layout change.
 */
describe("F-28: home hero CTAs and board door copy", () => {
  const src = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");

  it("primary hero CTA links to /picks", () => {
    expect(src).toMatch(/href="\/picks" className="btn-primary/);
  });

  it("secondary hero CTA links to /pricing", () => {
    expect(src).toMatch(/href="\/pricing"/);
    expect(src).toMatch(/See pricing/);
  });

  it("the hero no longer sends visitors to /tools or /methodology as its CTAs", () => {
    expect(src).not.toMatch(/href="\/tools" className="btn-primary/);
    expect(src).not.toMatch(/Free calculators/);
    expect(src).not.toMatch(/How the engine works/);
  });

  it("the board door no longer claims 'today' as a competing surface", () => {
    expect(src).not.toMatch(/What's worth a play today, and what to pass\./);
  });
});
