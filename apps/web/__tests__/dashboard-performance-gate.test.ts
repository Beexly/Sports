import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Customer Dashboard Performance Gate — source-level invariant.
 *
 * /dashboard previously computed a 14-day win rate from raw pick rows,
 * which would let bootstrap-era picks leak onto the customer surface and
 * would bypass the readiness gate. This test asserts that:
 *
 *   1. /dashboard imports getReadinessGates AND
 *      evaluatePublicPerformancePolicy.
 *   2. /dashboard renders a "collecting" message when the policy blocks
 *      performance, identified by the data-testid the tests can target.
 *   3. /dashboard's pick counts filter on isBootstrap=false somewhere in
 *      the file (catches a regression that drops the bootstrap filter).
 *   4. /api/picks/daily-slate gates recentRecord on canExposePerformanceStats.
 */

const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

describe("Customer dashboard performance gate", () => {
  it("imports both readiness gates and public-performance policy", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/getReadinessGates/);
    expect(src).toMatch(/evaluatePublicPerformancePolicy/);
  });

  it("renders the 'collecting' message when the policy blocks performance", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/dashboard-performance-collecting/);
  });

  it("filters at least one canonical count by isBootstrap=false", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/isBootstrap:\s*false/);
  });

  it("daily-slate API gates recentRecord on canExposePerformanceStats", () => {
    const src = read("app/api/picks/daily-slate/route.ts");
    expect(src).toMatch(/canExposePerformanceStats/);
    expect(src).toMatch(/recentRecord/);
    // The current minimal stub uses a ternary; the historical full
    // implementation used `if (gates.canExposePerformanceStats && ...) { recentRecord = ... }`.
    // Either shape is fine — we only require that the gate gate-controls
    // the value of recentRecord on the wire.
    const stubShape =
      /recentRecord\s*:\s*[^,;]*canExposePerformanceStats[^,;]*\?[^:]*:\s*undefined/m.test(src);
    const fullShape =
      /if\s*\([^)]*canExposePerformanceStats[^)]*\)[^{]*\{[^}]*recentRecord\s*=/m.test(src) ||
      /if\s*\([^)]*recentSettled[^)]*&&[^)]*canExposePerformanceStats[^)]*\)/m.test(src);
    expect(
      stubShape || fullShape,
      "recentRecord must be gated by canExposePerformanceStats (ternary stub OR if-guard)"
    ).toBe(true);
  });

  it("performance API short-circuits with bootstrapGateResponse when gate is closed", () => {
    const src = read("app/api/performance/route.ts");
    expect(src).toMatch(/canExposePerformanceStats/);
    expect(src).toMatch(/bootstrapGateResponse/);
  });

  it("performance API returns 503 status with the bootstrapGateResponse", () => {
    const src = read("app/api/performance/route.ts");
    // Verify the response carries status 503, not just the body.
    expect(/bootstrapGateResponse\([^)]*\)[^{]*,\s*\{\s*status:\s*503/.test(src)).toBe(true);
  });

  it("performance API only queries the DB AFTER the gate check", () => {
    const src = read("app/api/performance/route.ts");
    const gateIdx = src.indexOf("canExposePerformanceStats");
    const dbIdx = src.indexOf("db.pick");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(dbIdx).toBeGreaterThan(-1);
    expect(
      gateIdx < dbIdx,
      "Gate check must precede any db.pick query so the gate-off branch never hits the DB"
    ).toBe(true);
  });

  it("performance API filters isBootstrap=false when the gate is open", () => {
    const src = read("app/api/performance/route.ts");
    expect(src).toMatch(/isBootstrap:\s*false/);
  });

  it("performance API filters isPublished=true when the gate is open", () => {
    const src = read("app/api/performance/route.ts");
    expect(src).toMatch(/isPublished:\s*true/);
  });

  it("picks API returns 503 when canExposePublicPicks gate is off", () => {
    const src = read("app/api/picks/route.ts");
    expect(src).toMatch(/canExposePublicPicks/);
    expect(/bootstrapGateResponse\([^)]*\)[^{]*,\s*\{\s*status:\s*503/.test(src)).toBe(true);
  });

  it("picks API filters isBootstrap=false (no bootstrap on public picks)", () => {
    const src = read("app/api/picks/route.ts");
    expect(src).toMatch(/isBootstrap:\s*false/);
  });

  it("/dashboard renders the responsible-risk disclosure component", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/import\s+\{\s*RiskDisclosure\s*\}/);
    expect(src).toMatch(/<RiskDisclosure[^>]*includePastPerformance/);
  });

  it("/performance still renders the responsible-risk disclosure component", () => {
    const src = read("app/performance/page.tsx");
    expect(src).toMatch(/RiskDisclosure/);
  });

  it("/dashboard uses a 14-day window (matches the public-performance policy default)", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/subDays\([^,]+,\s*14\)/);
  });

  it("/dashboard imports RiskDisclosure from the shared component (no inline disclaimer)", () => {
    const src = read("app/dashboard/page.tsx");
    // Catch the regression where a future contributor writes the
    // disclaimer inline instead of using the shared component. Inline
    // disclaimers drift out of sync with the trust-claims registry.
    const inlineDisclaimerCount = (src.match(/Past performance does not guarantee/g) ?? []).length;
    // The publicMessage from the policy already contains the
    // disclaimer; that's one occurrence. Anything more = inlined copy.
    expect(inlineDisclaimerCount).toBeLessThanOrEqual(0);
  });
});
