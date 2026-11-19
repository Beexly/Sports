import { describe, expect, it } from "vitest";
import {
  POSTHOG_DEFAULT_HOST,
  POSTHOG_FALLBACK_PROJECT_TOKEN,
  buildPostHogZeroWasteInitOptions,
  isAutomatedCrawlerOrHeadlessClient,
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

describe("zero-waste PostHog crawler and replay guards", () => {
  it("suppresses PostHog capture for search/AI bots and headless browsers", () => {
    expect(isAutomatedCrawlerOrHeadlessClient("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isAutomatedCrawlerOrHeadlessClient("Mozilla/5.0 (compatible; OAI-SearchBot/1.0)")).toBe(true);
    expect(isAutomatedCrawlerOrHeadlessClient("PerplexityBot/1.0")).toBe(true);
    expect(isAutomatedCrawlerOrHeadlessClient("Mozilla/5.0 HeadlessChrome/128.0")).toBe(true);
    expect(isAutomatedCrawlerOrHeadlessClient("Mozilla/5.0 Safari/605.1.15", true)).toBe(true);
    expect(
      isAutomatedCrawlerOrHeadlessClient(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0",
        false,
      ),
    ).toBe(false);
  });

  it("keeps session replay and heatmaps disabled by default while rate-limiting events", () => {
    const opts = buildPostHogZeroWasteInitOptions("https://us.i.posthog.com", {});
    expect(opts.disable_session_recording).toBe(true);
    expect(opts.capture_dead_clicks).toBe(false);
    expect(opts.capture_heatmaps).toBe(false);
    expect(opts.person_profiles).toBe("identified_only");
    expect(opts.rate_limiting).toEqual({ events_per_second: 10, events_burst_limit: 50 });

    const replayOn = buildPostHogZeroWasteInitOptions("https://us.i.posthog.com", {
      NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED: "true",
    });
    expect(replayOn.disable_session_recording).toBe(false);
  });
});