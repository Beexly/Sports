import { test, expect } from "@playwright/test";

/**
 * Visual regression — public, anonymous-accessible pages only.
 *
 * WHY SCOPED THIS WAY: the actual gap identified (no automated visual-diff
 * check exists anywhere despite @playwright/test already being installed and
 * ui-audit/visual-qa/contrast/responsive existing only as manual, on-demand
 * commands) spans the whole app, including the ~30-route admin "cockpit"
 * surface. Cockpit is admin-gated (app/cockpit/layout.tsx: `session.user.role
 * !== "ADMIN"` redirects to /auth/signin), and playwright.config.ts's
 * webServer deliberately does NOT set DEV_FAKE_ADMIN — its own comment
 * explains why: that flag once entitled every e2e session as ELITE ADMIN,
 * silently gutting the anonymous-visitor paywall assertions, and was the
 * flag that legitimately blocked a production build for bypassing the
 * paywall (P7-07). Per AGENTS.md Law 9 (never weaken a guard to make a test
 * pass) and Law 3 (no frontend-only-paywall-adjacent shortcuts), this file
 * does not invent a new admin-auth bypass to reach cockpit routes. Extending
 * visual regression to cockpit needs a deliberate decision on how to safely
 * mint a test-only admin session — that's a founder call, not an overnight
 * unilateral one.
 *
 * What IS safely covered: the same three pages journey-anonymous.spec.ts
 * already proves return 200 with no DB (/  /board  /picks), using the exact
 * same safe, already-established anonymous posture — zero new auth surface,
 * zero new dependency (toHaveScreenshot ships in the already-installed
 * @playwright/test and uses pixelmatch internally).
 *
 * WHAT "board" AND "picks" ACTUALLY CAPTURE: both paths are listed in
 * AGE_GATED_PREFIXES (lib/age-verify/surface.ts) behind a permanent,
 * always-on middleware redirect ("there is deliberately no env flag: an
 * off-switch for the age gate is the thing a regulator asks about first") —
 * an anonymous browser with no gse_age_ok cookie is sent to /age-verify on
 * every real visit, in production exactly as here. So these two baselines
 * are honestly the age-attestation gate page, not board/picks content — that
 * is correct and worth guarding, since it's the actual first thing most
 * anonymous visitors to those paths see. It is not a stub-DB artifact.
 *
 * BASELINES: generated and visually inspected in this sandbox, Chromium
 * ("desktop" project) only. No WebKit binary is available here (see
 * /opt/pw-browsers: only a Chromium revision, no WebKit) and Playwright's
 * "mobile"/iPhone preset and "safari" project both require WebKit, so
 * neither has a baseline yet — either run will fail with a clear "no
 * baseline" error until generated in a WebKit-capable environment
 * (`npx playwright test visual-regression --project=mobile --project=safari
 * --update-snapshots`), rather than silently skipping or fabricating one.
 * CI does not currently invoke this suite (.github/workflows/ci.yml has no
 * playwright/e2e step) — it's a manual/on-demand check.
 */

const PUBLIC_PAGES: ReadonlyArray<{ path: string; name: string; maskHero?: boolean }> = [
  // Masked: the homepage's hero (<SignalCoreLazy /> inside
  // section.gw-nebula-deep) is a continuously-animated WebGL/canvas
  // background — a plain screenshot never "stabilizes" and times out
  // waiting for animation to settle. Masking it (not skipping the page) still
  // catches a real regression to everything else on the page (copy, layout,
  // the pricing/CTA section, footer) without asserting pixel-exactness over
  // content that is never pixel-identical by design.
  { path: "/", name: "homepage", maskHero: true },
  // Age-gated (AGE_GATED_PREFIXES) — an anonymous session with no
  // gse_age_ok cookie is always redirected to /age-verify here, so this
  // baseline is the attestation gate page, not board content. See header.
  { path: "/board", name: "board" },
  { path: "/picks", name: "picks" },
];

test.describe("visual regression — public pages", () => {
  for (const { path, name, maskHero } of PUBLIC_PAGES) {
    test(`${name} matches its committed baseline`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "networkidle" });
      // Same graceful-degradation posture as journey-anonymous.spec.ts: in an
      // environment with no database these can legitimately return something
      // other than 200 (e.g. a 503 from a failed-closed API) rather than
      // crash. A visual diff is only meaningful when the page actually
      // rendered a stable, real state — which for /board and /picks is the
      // permanent age-verification gate (see header comment), not a
      // transient error — so this only skips on an actual server error.
      test.skip((response?.status() ?? 0) >= 500, `${name} returned a server error in this environment`);

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: true,
        mask: maskHero ? [page.locator("section.gw-nebula-deep").first()] : undefined,
        // The masked region still runs a live WebGL animation loop underneath
        // the mask overlay; Playwright's own pre-comparison stability check
        // needs longer than the 5s default to settle on this page specifically.
        timeout: maskHero ? 30_000 : 5_000,
        // A small, documented tolerance — not zero — so non-deterministic
        // anti-aliasing/font-hinting noise between runs doesn't flake the
        // suite on pixel-identical-looking output. Any real layout regression
        // moves far more than this.
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
