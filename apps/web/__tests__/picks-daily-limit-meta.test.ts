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
    // The raw "% conf" readout must be inside the showConfidence branch.
    expect(dashboardSrc).toMatch(/showConfidence\s*\?\s*\([\s\S]{0,200}% conf/);
  });

  it("loads entitlements through the canonical server-side helper", () => {
    expect(dashboardSrc).toMatch(/from\s+["']@\/lib\/entitlements["']/);
    expect(dashboardSrc).toMatch(/await getUserEntitlements\(user\.id\)/);
  });
});

describe("/picks page — member data flow", () => {
  it("forwards the session cookie for authenticated viewers via direct handler call", () => {
    // The page calls the route handlers' GET directly (no self-fetch HTTP
    // round-trip), forwarding the request cookie so auth() inside the handler
    // resolves the same session the page component sees.
    expect(picksPageSrc).toMatch(/cookie\s*=\s*h\.get\("cookie"\)/);
    expect(picksPageSrc).toContain("getPicks");
    expect(picksPageSrc).toContain("getDailySlate");
    // No raw fetch() to the app's own origin remains.
    expect(picksPageSrc).not.toMatch(/await\s+fetch\(url/);
  });

  it("calls the route handlers directly instead of self-fetching", () => {
    // P16-04: the page imports and invokes the route GET handlers rather than
    // making HTTPS round-trips to its own origin during SSR.
    expect(picksPageSrc).toMatch(/import.*GET as getPicks.*from.*api\/picks\/route/);
    expect(picksPageSrc).toMatch(/import.*GET as getDailySlate.*from.*api\/picks\/daily-slate\/route/);
    expect(picksPageSrc).toContain("await getPicks(req)");
    expect(picksPageSrc).toContain("await getDailySlate(req)");
  });

  it("passes the session flag into fetchPicks", () => {
    expect(picksPageSrc).toMatch(/fetchPicks\(sport,\s*date,\s*grade,\s*Boolean\(session\?\.user\?\.id\)\)/);
  });

  it("surfaces the daily-limit meta in the paywall banner", () => {
    expect(picksPageSrc).toMatch(/totalAvailableToday/);
    expect(picksPageSrc).toMatch(/hitDailyLimit/);
    // Date-aware published-count copy (was "published today" — now selected-date
    // aware so the date picker / ?date= can't make the banner lie).
    expect(picksPageSrc).toMatch(/picks published for this date/);
  });
});
