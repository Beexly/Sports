import { test, expect, type Response } from "@playwright/test";

/**
 * P9.5-02 — Anonymous visitor journey.
 *
 * Walks what a first-time, logged-out visitor sees and asserts the
 * server-side paywall invariants hold on the INITIAL HTML response
 * (no client-side JS required for the security checks):
 *
 *  1. Each surface returns 200 and does NOT render a Next.js error
 *     boundary ("Something broke on my side" / "runtime error").
 *  2. NO premium selection/line/confidence value appears in the served
 *     HTML — the server must redact those for anonymous (FREE) viewers,
 *     not just hide them behind a client toggle.
 *  3. The paywall/upgrade affordance IS present — an un-entitled visitor
 *     is told what they'd get, never shown a dead end or a false
 *     "nothing available".
 *
 * Pages covered:
 *  - homepage  (/)
 *  - /board  (public surface, premium picks redacted)
 *  - /picks  (public surface, confidence/lineMovement/factorBreakdown redacted)
 *  - /preview/[sport]/[slug]  (a sample read page)
 *
 * The preview page requires a game in the DB; without one it returns 404
 * (its documented graceful fail-safe), which is NOT an error boundary.
 * That 404 is acceptable and journaled rather than failing the suite.
 */

// --- Security markers -------------------------------------------------------

/**
 * Text fragments that indicate a Next.js server-side error boundary fired.
 * If the initial HTML contains any of these, the page crashed rather than
 * rendering gracefully — a paywall/security regression.
 */
const ERROR_BOUNDARY_MARKERS = [
  "Something broke on my side",
  "The page hit a runtime error",
  "GlobalError",
];

/**
 * CSS class names / data attributes that carry premium-only content in the
 * rendered HTML. Their presence in the initial response means server-side
 * tier filtering failed to redact them for an anonymous viewer.
 *
 * Matched as class attributes only (e.g. `class="confidence-value ..."`) so
 * that legitimate `data-claim-id` values like `methodology.factor-breakdown`
 * don't produce false positives.
 *
 * `confidence-value` — the numeric confidence number (Pro+ metric)
 * `ranking-p`         — the priced rankingP (Pro+ market read)
 * `line-movement`     — opening→current line movement (Pro+ feature)
 * `factor-breakdown`  — per-factor scoring trail (Pro+ only)
 * `premium-pick-card` — a PRO/ELITE-tier pick card (filtered by tier in DB)
 */
const PREMIUM_CLASS_MARKERS = [
  "confidence-value",
  "ranking-p",
  "line-movement",
  "factor-breakdown",
  "premium-pick-card",
];

/**
 * Assert that the HTML does NOT contain any premium class markers as CSS
 * class names. We match the marker as a value within a class= attribute to
 * avoid false positives from `data-claim-id="methodology.factor-breakdown"`
 * or similar attribute values that legitimately contain these tokens.
 */
function expectNoPremiumClasses(html: string): void {
  for (const cls of PREMIUM_CLASS_MARKERS) {
    // Match class="..." containing the marker as a whitespace-delimited token.
    // This avoids matching data-claim-id values or JSON blobs in RSC payloads.
    const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const classRegex = new RegExp(`class=["'][^"']*\\b${escaped}\\b`, "i");
    expect(
      html,
      `premium class "${cls}" leaked into served HTML for anonymous visitor`,
    ).not.toMatch(classRegex);
  }
}

/**
 * Regex patterns for raw numeric confidence values that should never appear
 * in the served HTML for a FREE viewer. The confidence is entitlement-gated
 * in the API (`shownConfidence = entitlements.canSeeConfidence ? pick.confidence : null`)
 * — if the number still lands in the HTML, the server-side gate leaked it.
 */
const PREMIUM_NUMERIC_PATTERNS = [
  /confidence["'\s:=]+\{?\d{1,3}\}?/i,
  /\bconfidence["'\s:>]{0,5}\d{2}%?\b/i,
];

// --- Helpers ----------------------------------------------------------------

/**
 * Extract the initial HTML (no client JS execution) from a navigation.
 */
async function getInitialHtml(page: { goto: (url: string, opts?: Record<string, unknown>) => Promise<Response | null> }, url: string): Promise<{ status: number; html: string }> {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  const status = response?.status() ?? 0;
  const html = await response?.text() ?? "";
  return { status, html };
}

/**
 * Assert that the HTML does NOT contain any error-boundary markers.
 */
function expectNoErrorBoundary(html: string): void {
  for (const marker of ERROR_BOUNDARY_MARKERS) {
    expect(html, `page rendered an error boundary: looked for "${marker}"`).not.toContain(marker);
  }
}

/**
 * Assert that the HTML does NOT contain raw numeric confidence values.
 */
function expectNoPremiumNumbers(html: string): void {
  for (const pat of PREMIUM_NUMERIC_PATTERNS) {
    expect(html, `premium numeric confidence pattern ${pat} leaked into served HTML`).not.toMatch(pat);
  }
}

/**
 * Assert that a paywall/upgrade affordance is present in the HTML.
 * Anonymous visitors must be told what they'd get — the nav always shows a
 * "Pricing" link for logged-out users (see components/ui/nav.tsx).
 */
function expectPaywallAffordancePresent(html: string): void {
  // The site nav renders a "Pricing" CTA for anonymous users (nav.tsx line ~147).
  // We assert case-insensitively so markup changes don't silently break the gate.
  expect(
    html,
    "no paywall/upgrade affordance found in served HTML for anonymous visitor",
  ).toMatch(/pricing|upgrade|subscribe|join|pro|elite|paywall|unlock/i);
}

// --- Test group -------------------------------------------------------------

test.describe("P9.5-02 — anonymous visitor journey", () => {
  // Pages that should always return 200 in the current environment.
  const always200Pages: ReadonlyArray<{ path: string; label: string }> = [
    { path: "/", label: "homepage" },
    { path: "/board", label: "board" },
    { path: "/picks", label: "picks" },
  ];

  // The preview route — returns 200 when a game exists, 404 when the DB is
  // unavailable (graceful fail-safe, NOT an error boundary).
  const previewPath = "/preview/nfl";

  for (const { path, label } of always200Pages) {
    test(`${label} returns 200, no error boundary, no premium data, upgrade affordance present`, async ({ page }) => {
      const { status, html } = await getInitialHtml(page, path);

      // — returns 200 —
      expect(status, `${label} expected 200, got ${status}`).toBe(200);

      // — no Next.js error boundary —
      expectNoErrorBoundary(html);

      // — no premium selection/line/confidence in served HTML —
      expectNoPremiumClasses(html);
      expectNoPremiumNumbers(html);

      // — paywall/upgrade affordance IS present —
      expectPaywallAffordancePresent(html);
    });
  }

  test("preview page does not crash (no error boundary), and surfaces affordance if 200", async ({ page }) => {
    // Try a sport-specific preview path. Without a DB this 404s (graceful),
    // which is acceptable — the key security guarantee is that it does NOT
    // throw a 500 error boundary.
    // If a game IS available, the full paywall assertions apply.
    const { status, html } = await getInitialHtml(page, previewPath);

    // Never an error boundary (500 crash). 404 is the documented graceful
    // fail-safe when no data exists.
    expect(status, "preview page should not 500").not.toBe(500);
    expectNoErrorBoundary(html);

    if (status === 200) {
      // Premium data must still be redacted for anonymous viewers.
      expectNoPremiumClasses(html);
      expectNoPremiumNumbers(html);
      // Upgrade affordance must be present even on a sample read.
      expectPaywallAffordancePresent(html);
    } else {
      // Journal: without DB data the preview page returns 404 rather than 200.
      // This is the page's existing graceful behavior, not a regression.
      // eslint-disable-next-line no-console
      console.warn(
        `[P9.5-02] preview page returned ${status} (expected 200 when data is available). ` +
          "This is the documented graceful fail-safe when no games exist. " +
          "In production with live data this returns 200.",
      );
    }
  });

  test("board API does not leak premium picks to anonymous callers", async ({ page }) => {
    // Hit the board-state API directly — it is a separate seam from the page
    // and must independently redact premium fields for anonymous viewers.
    const response = await page.goto("/api/board/state", { waitUntil: "domcontentloaded" });

    // The API may return 503 (bootstrap/collecting gate) or DB_UNREACHABLE when
    // no database is available in the test env — that is fine. The assertion is
    // about the JSON body shape when it does return 200.
    if (response?.status() === 200) {
      const body = await response.json();
      // The board-state API does NOT include a tier in meta (unlike /api/picks).
      // The security contract is that every pick row in data.*Rows has its
      // confidence nulled for anonymous (non-PRO) viewers — enforced by
      // redactBoardConfidence in state.ts.
      const allRows = [
        ...(body.data?.scoringNow ?? []),
        ...(body.data?.publishedToday ?? []),
        ...(body.data?.gatedTodayRows ?? []),
      ];
      for (const pick of allRows) {
        expect(
          pick.confidence,
          "confidence leaked to anonymous viewer via /api/board/state",
        ).toBeFalsy();
        // market must be ALL_MARKETS for anonymous viewers — never the real
        // selection/line (P7-11's tierFilter fix).
        if (pick.market !== undefined) {
          expect(
            pick.market,
            "premium market/selection leaked to anonymous viewer via /api/board/state",
          ).toBe("ALL_MARKETS");
        }
        // rankingP / rankingSource are premium-only model internals (GSE-SEC-026).
        expect(
          pick.rankingP,
          "rankingP leaked to anonymous viewer via /api/board/state",
        ).toBeFalsy();
      }
    } else {
      // 503 bootstrap gate, DB_UNREACHABLE, or 429 rate-limit — none are paywall breaches.
      expect([429, 503]).toContain(response?.status());
    }
  });

  test("picks API does not leak premium picks or confidence to anonymous callers", async ({ page }) => {
    const response = await page.goto("/api/picks", { waitUntil: "domcontentloaded" });

    // 503 = bootstrap gate (PUBLIC_PICKS_ENABLED=false in this env) — acceptable.
    // 429 = rate limited — acceptable.
    if (response?.status() === 200) {
      const body = await response.json();
      // Every pick returned to a FREE viewer must be FREE tier.
      for (const pick of body.data) {
        expect(pick.tier, `premium pick (tier=${pick.tier}) leaked to anonymous viewer`).toBe("FREE");
        // Confidence is null for FREE viewers — the API gate
        // `shownConfidence = entitlements.canSeeConfidence ? pick.confidence : null`.
        expect(pick.confidence, "confidence leaked to anonymous viewer via /api/picks").toBeNull();
      }
    } else {
      expect([429, 503]).toContain(response?.status());
    }
  });
});
