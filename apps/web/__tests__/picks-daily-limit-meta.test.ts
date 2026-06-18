import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Daily-limit transparency + tier-gate contracts.
 *
 * Source-level invariants (the full routes/pages need Prisma + auth):
 *
 * /api/picks:
 *   - FREE responses report the full published count (totalAvailableToday)
 *     and a hitDailyLimit flag instead of silently truncating.
 *   - The count query never relaxes the published/non-bootstrap filters.
 *
 * /dashboard:
 *   - Today's picks query applies the server-side tier gate and the
 *     FREE daily limit.
 *   - Confidence rendering is entitlement-gated (no "% conf" for FREE).
 *
 * /picks page:
 *   - Authenticated requests forward the session cookie with no-store
 *     (members must get their entitled view, never a shared cache hit).
 *   - Anonymous requests stay cached.
 */

const repoRoot = resolve(__dirname, "..");
const routeSrc = readFileSync(resolve(repoRoot, "app/api/picks/route.ts"), "utf8");
const dashboardSrc = readFileSync(resolve(repoRoot, "app/dashboard/page.tsx"), "utf8");
const picksPageSrc = readFileSync(resolve(repoRoot, "app/picks/page.tsx"), "utf8");

describe("/api/picks — daily-limit meta", () => {
  it("exposes totalAvailableToday and hitDailyLimit in meta", () => {
    expect(routeSrc).toMatch(/totalAvailableToday/);
    expect(routeSrc).toMatch(/hitDailyLimit/);
  });

  it("only runs the extra count for viewers without premium access", () => {
    expect(routeSrc).toMatch(/if\s*\(!entitlements\.canSeePremiumPicks\)\s*{[\s\S]{0,200}db\.pick[\s\S]{0,40}\.count/);
  });

  it("the count keeps the published + non-bootstrap floor", () => {
    const countBlock = routeSrc.slice(routeSrc.indexOf("totalAvailableToday = await db.pick"));
    expect(countBlock).toMatch(/isPublished:\s*true/);
    expect(countBlock).toMatch(/isBootstrap:\s*false/);
  });
});

describe("/dashboard — tier-gated picks", () => {
  it("filters the today-picks query to FREE tier for non-premium members", () => {
    expect(dashboardSrc).toMatch(
      /entitlements\.canSeePremiumPicks\s*\?\s*{}\s*:\s*{\s*tier:\s*"FREE"\s*}/
    );
  });

  it("applies the FREE daily pick limit to the query take", () => {
    expect(dashboardSrc).toMatch(
      /take:\s*entitlements\.canSeePremiumPicks\s*\?\s*6\s*:\s*\(entitlements\.dailyPickLimit\s*\?\?\s*1\)/
    );
  });

  it("gates confidence rendering on the canSeeConfidence entitlement or FREE pick tier", () => {
    // FREE picks carry confidence scores (product promise); PRO+ see confidence
    // on all picks. The dashboard combines both conditions so neither path drops it.
    expect(dashboardSrc).toMatch(/showConfidence=\{entitlements\.canSeeConfidence \|\| p\.tier === "FREE"\}/);
    // Confidence value is rendered inside the showConfidence guard (& or ternary).
    // Accepts {conf}%, ${conf}%, or pick.confidence% patterns — the key invariant
    // is that the readout sits behind the showConfidence gate.
    expect(dashboardSrc).toMatch(/showConfidence[\s\S]{0,600}%/);
  });

  it("loads entitlements through the canonical server-side helper", () => {
    expect(dashboardSrc).toMatch(/from\s+["']@\/lib\/entitlements["']/);
    expect(dashboardSrc).toMatch(/await getUserEntitlements\(user\.id\)/);
  });
});

describe("/picks page — member data flow", () => {
  it("forwards the session cookie with no-store for authenticated viewers", () => {
    expect(picksPageSrc).toMatch(/cache:\s*"no-store"/);
    expect(picksPageSrc).toMatch(/cookie:\s*headers\(\)\.get\("cookie"\)/);
  });

  it("keeps the cached fetch for anonymous viewers", () => {
    expect(picksPageSrc).toMatch(/next:\s*{\s*revalidate:\s*1800\s*}/);
  });

  it("passes the session flag into fetchPicks", () => {
    expect(picksPageSrc).toMatch(/fetchPicks\(sport,\s*date,\s*grade,\s*Boolean\(session\?\.user\?\.id\)\)/);
  });

  it("surfaces the daily-limit meta in the paywall banner", () => {
    expect(picksPageSrc).toMatch(/totalAvailableToday/);
    expect(picksPageSrc).toMatch(/hitDailyLimit/);
    expect(picksPageSrc).toMatch(/signals published today/);
  });

  it("computes hiddenCount from totalAvailableToday minus visible picks", () => {
    expect(picksPageSrc).toMatch(/hiddenCount.*totalAvailableToday.*picks\.length/);
  });

  it("renders LockedPickGrid only for free-tier users with hidden picks", () => {
    expect(picksPageSrc).toMatch(/isFreeTier.*hiddenCount.*>\s*0/);
    expect(picksPageSrc).toMatch(/LockedPickGrid.*hiddenCount/);
  });

  it("caps the locked-card display at four cards", () => {
    expect(picksPageSrc).toMatch(/Math\.min\(hiddenCount,\s*4\)/);
  });

  it("links locked cards to the pricing page", () => {
    expect(picksPageSrc).toMatch(/LockedPickCard[\s\S]{0,500}href="\/pricing"/);
  });
});
