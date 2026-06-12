import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * PerformanceSummary bootstrap safety — public surface invariants.
 *
 * The owner blocker: PerformanceSummary had no isBootstrap flag, so a future
 * aggregation job could have written bootstrap-era stats that the public
 * /performance page would render as canonical. Two invariants close the hole:
 *
 *   1. SCHEMA: `PerformanceSummary.isBootstrap Boolean @default(true)` —
 *      a summary row is bootstrap unless the writer explicitly marks it
 *      canonical, mirroring Pick.isBootstrap.
 *   2. PUBLIC READ: the /performance page's summary query filters to
 *      `isBootstrap: false`, so bootstrap/synthetic stats can never surface
 *      publicly even if a future write forgets the flag (default = excluded).
 *
 * Source-level assertions, matching the established style of
 * performance-gate.test.tsx (the page query needs live Prisma otherwise).
 */

const repoRoot = resolve(__dirname, "..");

const schemaSrc = readFileSync(
  resolve(repoRoot, "..", "..", "packages", "db", "prisma", "schema.prisma"),
  "utf8"
);
const pageSrc = readFileSync(
  resolve(repoRoot, "app", "performance", "page.tsx"),
  "utf8"
);

function modelBlock(source: string, modelName: string): string {
  const match = source.match(
    new RegExp(`model\\s+${modelName}\\s+\\{[\\s\\S]*?\\n\\}`)
  );
  if (!match) throw new Error(`model ${modelName} not found in schema.prisma`);
  return match[0];
}

describe("PerformanceSummary schema — isBootstrap column", () => {
  const block = modelBlock(schemaSrc, "PerformanceSummary");

  it("declares isBootstrap as Boolean", () => {
    expect(block).toMatch(/isBootstrap\s+Boolean/);
  });

  it("defaults isBootstrap to TRUE so unmarked writes are excluded publicly by construction", () => {
    expect(block).toMatch(/isBootstrap\s+Boolean\s+@default\(true\)/);
  });

  it("indexes isBootstrap in the existing @@index style", () => {
    expect(block).toMatch(/@@index\(\[isBootstrap\]\)/);
  });

  it("mirrors the Pick model's bootstrap-safety convention", () => {
    const pick = modelBlock(schemaSrc, "Pick");
    expect(pick).toMatch(/isBootstrap\s+Boolean\s+@default\(true\)/);
  });
});

describe("public /performance read — excludes bootstrap summaries", () => {
  it("the performanceSummary query filters to isBootstrap: false", () => {
    expect(pageSrc).toMatch(
      /db\.performanceSummary\.findMany\(\{[\s\S]{0,500}?isBootstrap:\s*false/
    );
  });

  it("the filter lives inside a where clause (not a comment)", () => {
    expect(pageSrc).toMatch(/where:\s*\{\s*isBootstrap:\s*false\s*\}/);
  });

  it("the page never queries performanceSummary without the bootstrap filter", () => {
    const calls = pageSrc.match(/db\.performanceSummary\.findMany\(/g) ?? [];
    const filtered =
      pageSrc.match(
        /db\.performanceSummary\.findMany\(\{[\s\S]{0,500}?isBootstrap:\s*false/g
      ) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    expect(filtered.length).toBe(calls.length);
  });
});
