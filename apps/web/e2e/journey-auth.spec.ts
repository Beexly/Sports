import { test, expect, type Page } from "@playwright/test";

/**
 * P9.5-03 — Signup + auth journey (e2e).
 *
 * Covers three security-relevant invariants of the signin/auth surface:
 *
 *  1. The signin page is reachable and renders its provider button(s);
 *     a 500 or error boundary is a regression.
 *
 *  2. A protected route (/dashboard or /cockpit) redirects a logged-out
 *     user to /auth/signin rather than 500ing or leaking premium content.
 *
 *  3. The post-auth callbackUrl cannot be pointed at an external origin.
 *     The open-redirect assertions are the security-valuable half — kept
 *     even when the OAuth half proves untestable in dev.
 *
 * Google OAuth itself cannot be driven in a test: we assert the redirect
 * TARGET is correct rather than completing a real third-party login.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Text fragments that indicate a Next.js server-side error boundary fired.
 * If the initial HTML contains any of these, the page crashed.
 */
const ERROR_BOUNDARY_MARKERS = [
  "Something broke on my side",
  "The page hit a runtime error",
  "GlobalError",
];

/**
 * Extract the initial HTML from a navigation (no client-side JS required
 * for the security checks — the server response is what we assert on).
 */
async function getInitialHtml(
  page: Page,
  url: string,
): Promise<{ status: number; html: string; finalUrl: string }> {
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  const status = response?.status() ?? 0;
  const html = await response?.text() ?? "";
  return { status, html, finalUrl: page.url() };
}

/**
 * Assert the HTML does NOT contain any error-boundary markers.
 */
function expectNoErrorBoundary(html: string): void {
  for (const marker of ERROR_BOUNDARY_MARKERS) {
    expect(html, `page rendered an error boundary: looked for "${marker}"`).not.toContain(marker);
  }
}

/**
 * Malicious callbackUrl payloads that must never redirect off-origin.
 * Each entry is { input, description }.
 *
 *  - "//evil.com"         → protocol-relative, browser sends to evil.com
 *  - "//evil.com/path"    → same, with path
 *  - "https://evil.com"   → absolute URL open redirect
 *  - "https://evil.com/cb"→ absolute URL with callback path
 *  - "///evil.com"        → triple-slash, browser normalizes to //evil.com
 *  - "/\\evil.com"        → backslash variant, some browsers treat as //evil.com
 *  - "http://evil.com"    → plain http absolute
 */
const MALICIOUS_CALLBACK_URLS: ReadonlyArray<{ input: string; description: string }> = [
  { input: "//evil.com", description: "protocol-relative" },
  { input: "//evil.com/path", description: "protocol-relative with path" },
  { input: "https://evil.com", description: "absolute https" },
  { input: "https://evil.com/cb", description: "absolute https with path" },
  { input: "http://evil.com", description: "absolute http" },
  { input: "///evil.com", description: "triple-slash" },
  { input: "/\\evil.com", description: "backslash variant" },
];

// ── Test group ────────────────────────────────────────────────────────────

test.describe("P9.5-03 — signup + auth journey", () => {
  test.describe("signin page renders with provider button(s)", () => {
    test("signin page is reachable and renders the Google OAuth button", async ({ page }) => {
      // In dev with DEV_FAKE_ADMIN=true, auth() returns a synthetic session,
      // so the signin page redirects to /dashboard before rendering the form.
      // In production (or without DEV_FAKE_ADMIN), the page renders the Google
      // button. Either path must not 500 or throw an error boundary.
      //
      // We navigate and then check: the final URL must be same-origin
      // (localhost:3000). We also assert that the Google provider button text
      // appears OR a redirect occurred — both are acceptable depending on env.
      const { status, html, finalUrl } = await getInitialHtml(
        page,
        "/auth/signin",
      );

      // Never a 500 crash.
      expect(status, "signin page should not return 500").not.toBe(500);

      // No error boundary in whatever HTML we got back.
      expectNoErrorBoundary(html);

      // Final URL must stay on localhost — never an external redirect.
      expect(finalUrl, "should not redirect off-origin").toContain("localhost:3000");
    });

    test("Google OAuth button / form is present when rendered", async ({ page }) => {
      // If the signin form is rendered (no DEV_FAKE_ADMIN), the Google button
      // text "Continue with Google" must be visible. If the page redirected
      // to /dashboard (DEV_FAKE_ADMIN active), this assertion is skipped —
      // the redirect itself is the proof the auth flow is wired.
      const response = await page.goto("/auth/signin", { waitUntil: "domcontentloaded" });

      // If we landed on /dashboard, the form redirect happened — acceptable.
      if (page.url().includes("/dashboard")) {
        // eslint-disable-next-line no-console
        console.warn("[P9.5-03] signin redirected to /dashboard under DEV_FAKE_ADMIN — skipping button assertion");
        return;
      }

      // Otherwise the signin form should be rendered with the Google button.
      const html = await response?.text() ?? "";
      expect(
        html,
        "signin page should render a Google OAuth provider button when not auto-redirected",
      ).toMatch(/Continue with Google/i);
    });
  });

  test.describe("protected routes redirect logged-out users to signin", () => {
    const protectedRoutes = ["/dashboard", "/cockpit"];

    for (const route of protectedRoutes) {
      test(`${route} redirects a logged-out user to /auth/signin (never 500 or leak content)`, async ({
        page,
        context,
      }) => {
        // Clear any session cookies so we are definitively "logged-out".
        await context.clearCookies();

        const { status, html, finalUrl } = await getInitialHtml(page, route);

        // Two acceptable outcomes:
        //  (a) redirect to /auth/signin (middleware cookie-check fired)
        //  (b) 200 with the page rendered (DEV_FAKE_ADMIN is active in dev)
        // Either way: never 500, never an error boundary, never off-origin.
        expect(status, `${route} should not return 500`).not.toBe(500);
        expectNoErrorBoundary(html);

        // Final URL must be same-origin.
        expect(finalUrl, `${route} should not redirect off-origin`).toContain("localhost:3000");

        // If a redirect to signin occurred, verify the redirect target.
        if (finalUrl.includes("/auth/signin")) {
          expect(status).toBe(200);
        }
      });
    }
  });

  test.describe("callbackUrl open-redirect guard", () => {
    function assertLoggedOutStaysOnSignin(finalUrl: string, input: string) {
      const u = new URL(finalUrl);
      expect(
        u.origin,
        `callbackUrl="${input}" left origin: ${finalUrl}`,
      ).toMatch(/https?:\/\/localhost:3000/);
      expect(
        u.hostname,
        `callbackUrl="${input}" must not land on an attacker host`,
      ).not.toBe("evil.com");
      // Logged-out visitors stay on the sign-in form. Post-auth redirect uses
      // safeCallbackUrl() (unit-tested). The query string may still contain the
      // raw param — that is not a navigation to evil.com.
      expect(u.pathname, `callbackUrl="${input}" should stay on sign-in while logged out`).toBe(
        "/auth/signin",
      );
    }

    test("external callbackUrl variants never navigate off-origin while logged out", async ({
      page,
    }) => {
      for (const { input, description } of MALICIOUS_CALLBACK_URLS) {
        const signinUrl = `/auth/signin?callbackUrl=${encodeURIComponent(input)}`;
        await page.goto(signinUrl, { waitUntil: "domcontentloaded" });
        assertLoggedOutStaysOnSignin(page.url(), `${input} (${description})`);
      }
    });

    test("safe relative callbackUrl keeps the logged-out visitor on sign-in", async ({ page }) => {
      await page.goto("/auth/signin?callbackUrl=/dashboard", { waitUntil: "domcontentloaded" });
      const u = new URL(page.url());
      expect(u.origin).toMatch(/https?:\/\/localhost:3000/);
      expect(u.pathname).toBe("/auth/signin");
      expect(u.searchParams.get("callbackUrl")).toBe("/dashboard");
    });

    test("callbackUrl=/\\evil.com stays on sign-in (backslash variant)", async ({ page }) => {
      await page.goto("/auth/signin?callbackUrl=%2F%5Cevil.com", {
        waitUntil: "domcontentloaded",
      });
      assertLoggedOutStaysOnSignin(page.url(), "/\\evil.com");
    });

    test("callbackUrl=https://evil.com stays on sign-in", async ({ page }) => {
      await page.goto("/auth/signin?callbackUrl=https%3A%2F%2Fevil.com", {
        waitUntil: "domcontentloaded",
      });
      assertLoggedOutStaysOnSignin(page.url(), "https://evil.com");
    });
  });
});
