import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Adversarial contract: /api/blog must enforce the canPublishContent gate.
 *
 * The blog route was previously missing the readiness-gate check, meaning
 * blog posts would be served even when PUBLIC_BLOG_ENABLED=false. This test
 * pins the invariant so a refactor cannot accidentally remove it again.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/api/blog/route.ts"), "utf8");

describe("/api/blog route — readiness gate contract", () => {
  it("checks canPublishContent gate before returning blog data", () => {
    expect(src).toMatch(/canPublishContent/);
    const gateIdx = src.indexOf("canPublishContent");
    const dbIdx = src.indexOf("db.blogPost");
    expect(gateIdx).toBeGreaterThanOrEqual(0);
    expect(dbIdx).toBeGreaterThanOrEqual(0);
    expect(
      gateIdx,
      "canPublishContent check must appear before db.blogPost access"
    ).toBeLessThan(dbIdx);
  });

  it("uses getReadinessGates() from prediction-engine (not env directly)", () => {
    expect(src).toMatch(/getReadinessGates/);
    expect(src).toMatch(/from\s+["']@sports\/prediction-engine["']/);
  });

  it("returns 503 via bootstrapGateResponse when gate is closed", () => {
    expect(src).toMatch(/bootstrapGateResponse/);
    expect(src).toMatch(/status:\s*503/);
  });

  it("is force-dynamic (never cached at the CDN edge)", () => {
    expect(src).toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
  });

  it("gates full content behind canSeePremiumPicks (paywall)", () => {
    expect(src).toMatch(/canSeePremiumPicks/);
  });

  it("never returns full content in list view", () => {
    expect(src).toMatch(/content:\s*null/);
  });
});
