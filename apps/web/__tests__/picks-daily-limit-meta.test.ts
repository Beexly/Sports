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
 * /picks page: the member data-flow contract that used to live here (cookie
 * forwarding + direct handler calls) was retired with the page it guarded.
 * Commit 30a6fe52f replaced /picks with the static sealed Week 8 locked board;
 * the route and dashboard halves above still hold.
 */

const repoRoot = resolve(__dirname, "..");
const routeSrc = readFileSync(resolve(repoRoot, "app/api/picks/route.ts"), "utf8");
const dashboardSrc = readFileSync(resolve(repoRoot, "app/dashboard/page.tsx"), "utf8");

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
    // Assert the FREE branch this test is named for, not the premium constant.
    // The query now fetches 24 for premium and slices to 6 for display; the FREE
    // path is byte-identical (`dailyPickLimit ?? 1` in both the take and the
    // slice), so the paywall is intact. Pinning the premium fetch size made a
    // display-side change look like a gating regression.
    expect(dashboardSrc).toMatch(
      /take:\s*entitlements\.canSeePremiumPicks\s*\?\s*\d+\s*:\s*\(entitlements\.dailyPickLimit\s*\?\?\s*1\)/
    );
    // And the FREE limit must still bound what is actually rendered.
    expect(dashboardSrc).toMatch(
      /\.slice\(\s*0,\s*entitlements\.canSeePremiumPicks\s*\?\s*\d+\s*:\s*\(entitlements\.dailyPickLimit\s*\?\?\s*1\)\s*\)/
    );
  });

  it("gates confidence rendering on the canSeeConfidence entitlement", () => {
    expect(dashboardSrc).toMatch(/showConfidence=\{entitlements\.canSeeConfidence\}/);
    // The raw confidence readout must be inside the showConfidence branch, and it
    // is a score out of 100, never a percent (a percent reads as a win probability;
    // the >= 80 tail is measured inverted). Same rule as the pick card.
    expect(dashboardSrc).toMatch(/showConfidence\s*\?\s*\([\s\S]{0,300}\{pick\.confidence\}\/100/);
    expect(dashboardSrc).not.toMatch(/% conf/);
    expect(dashboardSrc).not.toMatch(/Confidence \$\{pick\.confidence\}%/);
  });

  it("loads entitlements through the canonical server-side helper", () => {
    expect(dashboardSrc).toMatch(/from\s+["']@\/lib\/entitlements["']/);
    expect(dashboardSrc).toMatch(/await getUserEntitlements\(user\.id\)/);
  });
});

// The "/picks page - member data flow" block was retired on 2026-11-03: the
// page no longer fetches picks at all (static sealed card, no session flow),
// so there is no cookie/direct-handler contract left to pin. /api/picks (above)
// and /dashboard (below) still carry their own halves.
