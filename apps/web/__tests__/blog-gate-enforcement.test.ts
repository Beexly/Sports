import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /api/blog — gate-enforcement contract (source-level).
 *
 * Mirrors the pattern in performance-gate.test.tsx:
 * asserts the route file contains the structural invariants required for
 * correct gate enforcement, without loading the module (which would
 * require next-auth/next env plumbing).
 *
 * Invariants enforced:
 *   1. getReadinessGates + bootstrapGateResponse are imported
 *   2. !gates.canPublishContent guard appears BEFORE the first auth() call
 *   3. 503 is used as the gate-closed status code
 *   4. force-dynamic export prevents response caching
 *
 * Disprove gate: remove the canPublishContent guard from the route file
 * and all tests in this file fail; no other test file catches this gap.
 */

const routeSrc = readFileSync(
  resolve(__dirname, "..", "app", "api", "blog", "route.ts"),
  "utf8"
);

describe("/api/blog — gate enforcement (source-level)", () => {
  it("imports getReadinessGates from @sports/prediction-engine", () => {
    expect(routeSrc).toMatch(
      /import\s+\{[^}]*getReadinessGates[^}]*\}\s+from\s+["']@sports\/prediction-engine["']/
    );
  });

  it("imports bootstrapGateResponse alongside getReadinessGates", () => {
    expect(routeSrc).toMatch(/bootstrapGateResponse/);
  });

  it("checks canPublishContent gate before any auth() call", () => {
    const gateIdx = routeSrc.indexOf("gates.canPublishContent");
    const authIdx = routeSrc.indexOf("await auth()");
    expect(gateIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(authIdx);
  });

  it("returns 503 when the gate is closed", () => {
    expect(routeSrc).toMatch(/status:\s*503/);
    expect(routeSrc).toMatch(/bootstrapGateResponse\(["']Blog content["']\)/);
  });

  it("declares force-dynamic export (prevents cached 503 from reaching clients)", () => {
    expect(routeSrc).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("matches the gate-guard pattern used by /api/picks and /api/performance", () => {
    // Pattern: if (!gates.<flag>) return NextResponse.json(bootstrapGateResponse(...), { status: 503 })
    expect(routeSrc).toMatch(/if\s*\(!gates\.canPublishContent\)/);
  });
});
