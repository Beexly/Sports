/**
 * Production env guards — placeholders must never survive into production.
 *
 * Two launch blockers of the same shape, both invisible from the server:
 *
 * 1. `NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"` fed Stripe's
 *    success_url/cancel_url and the billing-portal return_url. With the variable
 *    unset or typo'd in the Vercel env, checkout SUCCEEDS — card charged, webhook
 *    delivered, entitlement granted — and Stripe then redirects the paying
 *    customer to `http://localhost:3000/dashboard?upgraded=true`: a
 *    connection-refused page on their own machine. They conclude the payment
 *    failed. Nothing throws and nothing is logged.
 *
 * 2. `GOOGLE_CLIENT_ID ?? "dev-noop"` registered an OAuth provider under a
 *    credential Google has never issued. The app boots green; the first user to
 *    click "Sign in with Google" gets "Error 401: invalid_client" on
 *    accounts.google.com. Nobody can create an account and nothing 500s here.
 *
 * Each guard is asserted in all three states that matter:
 *   production + unset  → fails LOUDLY, naming the variable
 *   production + set    → uses the real value
 *   non-production      → keeps the existing dev placeholder, unchanged
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  MissingProductionEnvError,
  requireProductionEnv,
  requireProductionEnvUnlessSkipped,
} from "@/lib/config/require-env";
import { DEV_APP_URL, requireAppUrl } from "@/lib/config/app-url";

const PROD_URL = "https://www.galaxysportsedge.com";

/** Set NODE_ENV/vars for one case; `vi.unstubAllEnvs` restores them after. */
function env(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
}

beforeEach(() => {
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("NEXT_PUBLIC_APP_URL — Stripe return URLs (Fix 2)", () => {
  it("THROWS in production when unset, instead of emitting a localhost redirect", () => {
    env({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: undefined });

    expect(() => requireAppUrl()).toThrow(MissingProductionEnvError);
    // The message must name the variable — this is the only signal an operator gets.
    expect(() => requireAppUrl()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("THROWS in production when set to whitespace (blank is not 'configured')", () => {
    env({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: "   " });

    expect(() => requireAppUrl()).toThrow(MissingProductionEnvError);
  });

  it("never returns a localhost URL in production, under any input", () => {
    for (const value of [undefined, "", "   "]) {
      env({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: value });
      let returned: string | null = null;
      try {
        returned = requireAppUrl();
      } catch {
        // expected
      }
      expect(returned, `requireAppUrl() returned ${returned} for input ${JSON.stringify(value)}`).toBeNull();
    }
  });

  it("returns the canonical www URL in production when the variable IS set", () => {
    env({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: PROD_URL });

    expect(requireAppUrl()).toBe(PROD_URL);
  });

  it("strips a trailing slash so `${appUrl}/dashboard` cannot become `//dashboard`", () => {
    env({ NODE_ENV: "production", NEXT_PUBLIC_APP_URL: `${PROD_URL}/` });

    expect(requireAppUrl()).toBe(PROD_URL);
    expect(`${requireAppUrl()}/dashboard?upgraded=true`).toBe(
      `${PROD_URL}/dashboard?upgraded=true`,
    );
  });

  it("keeps the localhost fallback outside production (dev ergonomics preserved)", () => {
    for (const nodeEnv of ["development", "test"]) {
      env({ NODE_ENV: nodeEnv, NEXT_PUBLIC_APP_URL: undefined });
      expect(requireAppUrl()).toBe(DEV_APP_URL);
    }
  });

  it("still prefers an explicit value outside production", () => {
    env({ NODE_ENV: "development", NEXT_PUBLIC_APP_URL: "http://127.0.0.1:4000" });

    expect(requireAppUrl()).toBe("http://127.0.0.1:4000");
  });
});

describe("Google OAuth credentials (Fix 3)", () => {
  const credential = (name: string): string =>
    requireProductionEnvUnlessSkipped(name, "dev-noop", "Google sign-in");

  it("THROWS in production when GOOGLE_CLIENT_ID is unset", () => {
    env({ NODE_ENV: "production", GOOGLE_CLIENT_ID: undefined, SKIP_ENV_VALIDATION: undefined });

    expect(() => credential("GOOGLE_CLIENT_ID")).toThrow(MissingProductionEnvError);
    expect(() => credential("GOOGLE_CLIENT_ID")).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("THROWS in production when GOOGLE_CLIENT_SECRET is unset", () => {
    env({ NODE_ENV: "production", GOOGLE_CLIENT_SECRET: undefined, SKIP_ENV_VALIDATION: undefined });

    expect(() => credential("GOOGLE_CLIENT_SECRET")).toThrow(MissingProductionEnvError);
  });

  it("never returns the 'dev-noop' placeholder in a serving production environment", () => {
    env({ NODE_ENV: "production", GOOGLE_CLIENT_ID: undefined, SKIP_ENV_VALIDATION: undefined });

    let returned: string | null = null;
    try {
      returned = credential("GOOGLE_CLIENT_ID");
    } catch {
      // expected
    }
    expect(returned).not.toBe("dev-noop");
    expect(returned).toBeNull();
  });

  it("uses the real credential in production when it IS set", () => {
    env({ NODE_ENV: "production", GOOGLE_CLIENT_ID: "1234.apps.googleusercontent.com" });

    expect(credential("GOOGLE_CLIENT_ID")).toBe("1234.apps.googleusercontent.com");
  });

  it("keeps the 'dev-noop' placeholder outside production", () => {
    for (const nodeEnv of ["development", "test"]) {
      env({ NODE_ENV: nodeEnv, GOOGLE_CLIENT_ID: undefined });
      expect(credential("GOOGLE_CLIENT_ID")).toBe("dev-noop");
    }
  });

  it("allows a credential-less CI BUILD via SKIP_ENV_VALIDATION, but says so loudly", () => {
    // .github/workflows/ci.yml builds with NODE_ENV=production, no Google vars,
    // and SKIP_ENV_VALIDATION=true. A build machine serves no users; a deploy
    // sets no such flag. The opt-out must be explicit and must never be silent.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    env({
      NODE_ENV: "production",
      GOOGLE_CLIENT_ID: undefined,
      SKIP_ENV_VALIDATION: "true",
    });

    expect(credential("GOOGLE_CLIENT_ID")).toBe("dev-noop");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(String(spy.mock.calls[0]?.[0])).toMatch(/GOOGLE_CLIENT_ID/);
  });

  it("does NOT honour SKIP_ENV_VALIDATION for request-time URL guards", () => {
    // The flag exists for a build with no credentials. Checkout runs per request,
    // so there is no legitimate reason to serve a localhost redirect to a
    // paying customer — the escape hatch must not reach this path.
    env({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: undefined,
      SKIP_ENV_VALIDATION: "true",
    });

    expect(() => requireAppUrl()).toThrow(MissingProductionEnvError);
  });
});

describe("lib/auth.ts wiring — the guard is actually connected", () => {
  // Helper-level tests above prove the CONTRACT; these prove auth.ts USES it.
  // Without this, reverting lib/auth.ts to `?? "dev-noop"` leaves every test green.
  afterEach(() => {
    vi.resetModules();
  });

  it("refuses to load in production without Google credentials", async () => {
    vi.resetModules();
    env({
      NODE_ENV: "production",
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      SKIP_ENV_VALIDATION: undefined,
    });

    await expect(import("@/lib/auth")).rejects.toThrow(/GOOGLE_CLIENT_ID/);
  });

  it("loads normally outside production with no Google credentials set", async () => {
    vi.resetModules();
    env({ NODE_ENV: "test", GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined });

    const mod = await import("@/lib/auth");
    expect(typeof mod.isAdminEmail).toBe("function");
  });

  it("loads in production once the credentials are supplied", async () => {
    vi.resetModules();
    env({
      NODE_ENV: "production",
      GOOGLE_CLIENT_ID: "1234.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "secret-value",
    });

    const mod = await import("@/lib/auth");
    expect(typeof mod.isAdminEmail).toBe("function");
  });
});

describe("requireProductionEnv — shared contract", () => {
  it("treats a blank value as unset in production", () => {
    env({ NODE_ENV: "production", SOME_VAR: "  " });

    expect(() => requireProductionEnv("SOME_VAR", "fallback", "thing")).toThrow(
      MissingProductionEnvError,
    );
  });

  it("trims a set value", () => {
    env({ NODE_ENV: "production", SOME_VAR: "  real-value  " });

    expect(requireProductionEnv("SOME_VAR", "fallback", "thing")).toBe("real-value");
  });

  it("carries the variable name on the error for actionable operator output", () => {
    env({ NODE_ENV: "production", SOME_VAR: undefined });

    try {
      requireProductionEnv("SOME_VAR", "fallback", "thing");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingProductionEnvError);
      expect((err as MissingProductionEnvError).variable).toBe("SOME_VAR");
    }
  });
});
