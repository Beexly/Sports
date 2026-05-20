import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Final design decision (Session A): safety is at the gate boundary,
 * not at the data layer. Seed picks flow through to canonical counts
 * exactly the same as any other pick. The protection is:
 *
 *   1. `seedPicks()` is gated on `NODE_ENV !== "production"`.
 *   2. `PERFORMANCE_STATS_ENABLED` defaults to false.
 *
 * In dev mode, an operator who explicitly flips the perf gate IS
 * trusted to know they're looking at seeded picks. The dashboard
 * still shows the "Sample mode" banner via `demoActive`.
 *
 * What we pin here:
 *   - `lib/dashboard/load-performance.ts` (the extracted loader, kept
 *     for testability) keeps the seed-exclusion filter so a caller
 *     that uses it gets the safer behavior by default.
 *   - The customer dashboard / `/api/performance` / Jarvis loader
 *     all share the same source: `db.pick` — there is no data-layer
 *     exclusion across those three files.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("Seed-data handling — current design", () => {
  it("seed picks are tagged with the canonical modelVersion sentinel", () => {
    const src = read("packages/db/prisma/seed.ts");
    expect(src).toMatch(/modelVersion:\s*"v5\.0\.0-seed"/);
  });

  it("seedPicks() is dev-only (NODE_ENV !== 'production')", () => {
    const src = read("packages/db/prisma/seed.ts");
    expect(src).toMatch(/process\.env\["NODE_ENV"\]\s*!==\s*"production"/);
  });

  it("apps/web/lib/dashboard/load-performance.ts still ships the optional seed-exclusion filter", () => {
    // The dashboard page inlines its queries today, but the extracted
    // loader keeps the seed-exclusion as a safer default for any future
    // caller that adopts it.
    const src = read("apps/web/lib/dashboard/load-performance.ts");
    expect(src).toMatch(/NOT:\s*\{\s*modelVersion:\s*"v5\.0\.0-seed"\s*\}/);
  });

  it("the Sample-mode disclosure on /dashboard fires when isStubMode() + isDemoPicksEnabled()", () => {
    const src = read("apps/web/app/dashboard/page.tsx");
    expect(src).toMatch(/data-testid="dashboard-sample-mode"/);
    expect(src).toMatch(/isDemoPicksEnabled\(\)\s*&&\s*stubMode/);
  });
});
