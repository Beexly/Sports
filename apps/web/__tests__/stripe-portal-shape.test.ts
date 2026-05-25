import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level contract for the Stripe customer portal route.
 *
 * Verifies auth enforcement, billing-account validation, and
 * Stripe API usage patterns without requiring live credentials.
 */

const root = resolve(__dirname, "..");
const src = readFileSync(
  resolve(root, "app/api/subscriptions/portal/route.ts"),
  "utf8"
);

describe("Stripe portal route — source contract", () => {
  it("imports auth() and calls it for every request", () => {
    expect(src).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(src).toMatch(/await\s+auth\(\)/);
  });

  it("returns 401 when session is missing", () => {
    expect(src).toMatch(/status:\s*401/);
  });

  it("looks up stripeCustomerId from subscription record", () => {
    expect(src).toMatch(/stripeCustomerId/);
    expect(src).toMatch(/subscription\.findUnique/);
  });

  it("returns 404 when no billing account is found", () => {
    expect(src).toMatch(/status:\s*404/);
  });

  it("calls createPortalSession — no inline Stripe API calls", () => {
    expect(src).toMatch(/createPortalSession/);
    expect(src).not.toMatch(/stripe\.billingPortal\.sessions\.create/);
  });

  it("uses NEXT_PUBLIC_APP_URL for the return URL", () => {
    expect(src).toMatch(/NEXT_PUBLIC_APP_URL/);
  });

  it("returns a URL in the JSON response", () => {
    expect(src).toMatch(/\{\s*url:/);
  });

  it("route handler has explicit Promise<NextResponse> return type", () => {
    expect(src).toMatch(/POST.*NextRequest.*Promise<NextResponse>/);
  });
});
