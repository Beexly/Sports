import { describe, expect, it } from "vitest";
import {
  POSTHOG_DEFAULT_HOST,
  POSTHOG_FALLBACK_PROJECT_TOKEN,
  resolvePostHogHost,
  resolvePostHogToken,
  shouldInitPostHogClient,
} from "@/lib/analytics/posthog-config";

// Telemetry wiring: PostHog token precedence, host default and the init gate.
// The gate defaults ON when a token resolves (the embedded founder token is a
// safe NEXT_PUBLIC capture key) but honours an explicit "false" opt-out. The
// legacy shouldRenderPostHogAnalytics keeps its stricter master-flag semantics
// (covered by analytics-provider-gating.test.ts).
describe("resolvePostHogToken", () => {
  it("prefers NEXT_PUBLIC_POSTHOG_KEY over the project-token alias", () => {
    expect(
      resolvePostHogToken({
        NEXT_PUBLIC_POSTHOG_KEY: "phc_primary",
        NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_alias",
      }),
    ).toBe("phc_primary");
  });

  it("falls back to NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN when the key is absent", () => {
    expect(
      resolvePostHogToken({ NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "phc_alias" }),
    ).toBe("phc_alias");
  });

  it("falls back to the embedded project token when no env is set", () => {
    expect(resolvePostHogToken({})).toBe(POSTHOG_FALLBACK_PROJECT_TOKEN);
    expect(POSTHOG_FALLBACK_PROJECT_TOKEN).toMatch(/^phc_/);
  });

  it("treats blank/whitespace env values as absent, never as a token", () => {
    expect(
      resolvePostHogToken({
        NEXT_PUBLIC_POSTHOG_KEY: "   ",
        NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "",
      }),
    ).toBe(POSTHOG_FALLBACK_PROJECT_TOKEN);
  });

  it("trims surrounding whitespace from a configured key", () => {
    expect(resolvePostHogToken({ NEXT_PUBLIC_POSTHOG_KEY: "  phc_x  " })).toBe("phc_x");
  });
});

describe("resolvePostHogHost", () => {
  it("defaults to US cloud", () => {
    expect(resolvePostHogHost(undefined)).toBe(POSTHOG_DEFAULT_HOST);
    expect(resolvePostHogHost("  ")).toBe(POSTHOG_DEFAULT_HOST);
    expect(POSTHOG_DEFAULT_HOST).toBe("https://us.i.posthog.com");
  });

  it("honours an override and strips trailing slashes", () => {
    expect(resolvePostHogHost("https://eu.i.posthog.com/")).toBe("https://eu.i.posthog.com");
    expect(resolvePostHogHost("https://ph.example.com///")).toBe("https://ph.example.com");
  });
});

describe("shouldInitPostHogClient", () => {
  it("defaults ON when a token resolves and the master flag is unset", () => {
    expect(shouldInitPostHogClient(undefined, "phc_token")).toBe(true);
    expect(shouldInitPostHogClient("true", "phc_token")).toBe(true);
  });

  it("honours an explicit opt-out even with a valid token", () => {
    expect(shouldInitPostHogClient("false", "phc_token")).toBe(false);
    expect(shouldInitPostHogClient("FALSE", "phc_token")).toBe(false);
    expect(shouldInitPostHogClient(" false ", "phc_token")).toBe(false);
  });

  it("never inits without a usable token, regardless of the flag", () => {
    expect(shouldInitPostHogClient("true", undefined)).toBe(false);
    expect(shouldInitPostHogClient(undefined, "")).toBe(false);
    expect(shouldInitPostHogClient(undefined, "   ")).toBe(false);
  });
});