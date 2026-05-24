import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Adversarial contract: /api/picks must enforce server-side gating.
 *
 * Non-negotiable invariants:
 *  1. canExposePublicPicks gate is checked before any DB query.
 *  2. Premium picks are never returned to users where
 *     canSeePremiumPicks is false (free-tier users see tier:"FREE" only).
 *  3. Bootstrap-era picks (isBootstrap=true) are never exposed publicly.
 *  4. Auth and entitlements are resolved server-side (not client-side).
 *
 * This test exists to prevent a refactor from silently removing the
 * tier-filter or skipping the readiness gate.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(
  resolve(repoRoot, "app/api/picks/route.ts"),
  "utf8"
);

describe("/api/picks route — server-side paywall contract", () => {
  it("checks canExposePublicPicks gate before returning picks data", () => {
    expect(src).toMatch(/canExposePublicPicks/);
    // The gate must be checked before the db.pick.findMany call
    const gateIdx = src.indexOf("canExposePublicPicks");
    const dbIdx = src.indexOf("db.pick.findMany");
    expect(gateIdx).toBeGreaterThanOrEqual(0);
    expect(dbIdx).toBeGreaterThanOrEqual(0);
    expect(
      gateIdx,
      "canExposePublicPicks check must appear before db.pick.findMany"
    ).toBeLessThan(dbIdx);
  });

  it("never exposes bootstrap picks (isBootstrap filter is always applied)", () => {
    // isBootstrap: false must appear in the db query to fence off bootstrap data
    expect(src).toMatch(/isBootstrap\s*:\s*false/);
  });

  it("applies tier:'FREE' filter for users without canSeePremiumPicks", () => {
    // Server-side tier gate: when canSeePremiumPicks is false, only FREE picks
    // are returned. The conditional must reference both canSeePremiumPicks and
    // tier: "FREE".
    expect(src).toMatch(/canSeePremiumPicks/);
    expect(src).toMatch(/tier\s*:\s*["']FREE["']/);
  });

  it("resolves entitlements server-side via getUserEntitlements", () => {
    // Entitlements must be fetched server-side, not passed from the client
    expect(src).toMatch(/getUserEntitlements/);
    expect(src).toMatch(/from\s+["']@\/lib\/entitlements["']/);
  });

  it("uses getReadinessGates() from prediction-engine (not env directly)", () => {
    // Readiness gates are the single source of truth — never bypass via raw env
    expect(src).toMatch(/getReadinessGates/);
    expect(src).toMatch(/from\s+["']@sports\/prediction-engine["']/);
  });

  it("is force-dynamic (never cached at the CDN edge)", () => {
    expect(src).toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
  });
});
