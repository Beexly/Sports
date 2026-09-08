import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * C-240. `.claude/rules/nextjs-caching.md` rule 2 says every entitlement- or
 * pick-touching API route must return through `jsonNoStore`, INCLUDING its error
 * and gate responses — "a cacheable error is exactly as dangerous as a cacheable
 * success". Measured on this branch, 51 of 61 such routes returned bare
 * `NextResponse.json`, and nothing enforced the rule.
 *
 * That count is itself a correction. The first pass of this detector looked only
 * for the session-tier helpers and reported 39 of 44; widening it to the B2B key
 * scope and the readiness gate - which are how the /api/v1 and /api/performance
 * surfaces decide who sees what - exposed twelve more, including the two routes
 * this file was written to protect. A guard is only as honest as its detector.
 *
 * `export const dynamic = "force-dynamic"` is not a substitute and the rule file
 * says why: it governs Next's own render cache and "promises nothing about an
 * intermediary". For a body that varies by viewer from a single URL, a
 * URL-keyed shared cache is a paywall bypass at the edge (CLAUDE.md rule 3),
 * not merely stale data.
 *
 * SIX ROUTES WERE FIXED, not all of them, and the split was deliberate. The six
 * are the ones where a shared cache could actually bleed: /api/board/state is
 * PUBLIC and viewer-varying, /api/blog carries the paid article body (and had no
 * `dynamic` at all), /api/picks/[id]/audit serves FREE-summary and PRO-forensic
 * bodies from one URL, /api/v1/probabilities and /api/v1/signals vary by API-key
 * scope, and /api/performance carries the 503 kill-switch that the founder will
 * flip. The remaining routes are PRO-gated and fail closed to 401/403 for an
 * unentitled caller, so the exposure is materially smaller — but it is not zero,
 * and converting forty-five files blind on launch day is its own risk.
 *
 * So this is a RATCHET rather than a green-field assertion. The known-remaining
 * list can only shrink: fixing a route without removing it here fails, and
 * adding a NEW offending route fails. It makes the debt explicit and stops it
 * growing, which is the honest thing to do when the sweep itself is too large to
 * verify in one sitting.
 */

const API_DIR = join(__dirname, "..", "app", "api");

/** Signals that a route reads entitlements or the gated data behind them. */
const ENTITLEMENT_MARKERS = [
  "getUserEntitlements",
  "requirePremiumApi",
  "requireFantasyApi",
  "gateApi",
  "loadBoardState",
  "@/lib/entitlements",
  "@/lib/api-entitlement",
  // The B2B surface gates on key SCOPE rather than a session tier, and the
  // performance surface on the readiness gate. Both decide who sees what, so
  // both belong here — the first draft of this list missed all three and
  // silently excused them.
  "resolveB2bKeyScope",
  "canExposePerformanceStats",
];

/**
 * Routes still returning bare NextResponse.json, captured 2026-09-08. This list
 * is allowed to SHRINK and nothing else.
 */
const KNOWN_REMAINING = new Set([
  "admin/dashboard/route.ts",
  "brief/route.ts",
  "clv/route.ts",
  "cockpit/content/[id]/review/route.ts",
  "cockpit/content/[id]/route.ts",
  "cockpit/content/route.ts",
  "cockpit/readiness/route.ts",
  "cron/calibration-metrics/route.ts",
  "cron/generate-drafts/route.ts",
  "dev/state/route.ts",
  "dfs/salaries/route.ts",
  "intelligence/clv-calibration/route.ts",
  "intelligence/expected-points/route.ts",
  "intelligence/opportunity-transfer/route.ts",
  "intelligence/player-archetypes/route.ts",
  "intelligence/player-model/route.ts",
  "intelligence/player-movers/route.ts",
  "intelligence/predictiveness/route.ts",
  "intelligence/qb-consensus/route.ts",
  "intelligence/qb-forward/route.ts",
  "intelligence/receiving-opportunity/route.ts",
  "intelligence/roster-advice/route.ts",
  "intelligence/route-rate/route.ts",
  "intelligence/rush-schemes/route.ts",
  "intelligence/rushing-contact/route.ts",
  "intelligence/rushing-efficiency/route.ts",
  "intelligence/scoring-zone/route.ts",
  "intelligence/sleeper-trending/route.ts",
  "intelligence/team-environment/route.ts",
  "intelligence/team-ratings/route.ts",
  "nflverse/birthday-usage-trend/route.ts",
  "nflverse/combine/route.ts",
  "nflverse/edge-signals/route.ts",
  "nflverse/expected-metrics/route.ts",
  "nflverse/injuries/route.ts",
  "nflverse/next-gen-stats/route.ts",
  "nflverse/player-lab/route.ts",
  "nflverse/pressure-coverage/route.ts",
  "nflverse/qb-age-rb-trend/route.ts",
  "nflverse/qbr/route.ts",
  "nflverse/snap-share/route.ts",
  "nflverse/usage-pulse/route.ts",
  "ops/daily-truth/route.ts",
  "ops/public-surface-truth/route.ts",
  "picks/[id]/explain/route.ts",
  "projections/route.ts",
  "room/[gameId]/model-court/route.ts",
  "scoring/player-index/route.ts",
  "tools/lineup/route.ts",
  "watchlist/follow/route.ts",
  "watchlist/route.ts",
]);

/** The six fixed here — they must stay fixed. */
const MUST_STAY_CLEAN = [
  "board/state/route.ts",
  "blog/route.ts",
  "picks/[id]/audit/route.ts",
  "v1/probabilities/route.ts",
  "v1/signals/route.ts",
  "performance/route.ts",
];

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routeFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

const sensitiveRoutes = routeFiles(API_DIR)
  .map((file) => ({ rel: relative(API_DIR, file), src: readFileSync(file, "utf8") }))
  .filter(({ src }) => ENTITLEMENT_MARKERS.some((m) => src.includes(m)));

describe("entitlement-touching API routes do not leak through a shared cache", () => {
  it("finds the routes to check", () => {
    // A guard on the guard: a renamed helper would otherwise empty the set and
    // make every assertion below vacuously true.
    expect(sensitiveRoutes.length).toBeGreaterThanOrEqual(61);
  });

  it.each(MUST_STAY_CLEAN)("%s returns every response through jsonNoStore", (rel) => {
    const route = sensitiveRoutes.find((r) => r.rel === rel);
    expect(route, `${rel} is no longer detected as entitlement-touching`).toBeDefined();
    expect(route!.src).toContain("jsonNoStore");
    expect(
      route!.src.includes("NextResponse.json("),
      `${rel} still has a bare NextResponse.json — a cached error is as dangerous as a cached success`,
    ).toBe(false);
  });

  it("never adds a NEW route that returns bare NextResponse.json", () => {
    const offenders = sensitiveRoutes
      .filter(({ src }) => src.includes("NextResponse.json("))
      .map(({ rel }) => rel);
    const added = offenders.filter((r) => !KNOWN_REMAINING.has(r));
    expect(
      added,
      "new entitlement-touching route(s) returning bare NextResponse.json — use jsonNoStore " +
        "(.claude/rules/nextjs-caching.md rule 2)",
    ).toEqual([]);
  });

  it("shrinks the known-remaining list when a route is fixed", () => {
    // Fixing a route without removing it here would let the list rot into a
    // permanent excuse. This fails the moment an entry stops being true.
    const offenders = new Set(
      sensitiveRoutes.filter(({ src }) => src.includes("NextResponse.json(")).map((r) => r.rel),
    );
    const staleEntries = [...KNOWN_REMAINING].filter((r) => !offenders.has(r));
    expect(
      staleEntries,
      "these routes are fixed — remove them from KNOWN_REMAINING so the ratchet keeps its teeth",
    ).toEqual([]);
  });

  it("keeps the debt strictly bounded", () => {
    // The number recorded when the ratchet was installed. It may fall; it may
    // never rise.
    expect(KNOWN_REMAINING.size).toBeLessThanOrEqual(51);
  });
});
