/**
 * PostHog client configuration — pure resolution + gating helpers.
 *
 * Extracted from components/observability/PostHogClientInit.tsx so the token
 * precedence, host default and init gate are unit-testable without a DOM.
 *
 * GATING DECISION (documented per the telemetry wiring task):
 * The legacy layout gate `shouldRenderPostHogAnalytics` requires
 * NEXT_PUBLIC_ANALYTICS_ENABLED === "true". That flag is unset by default in
 * this repo, which would leave PostHog dead by default even though a safe,
 * founder-provided NEXT_PUBLIC project token is embedded below. PostHog is
 * cookieless-capable and configured with person_profiles: "identified_only",
 * so the client init gate defaults ON whenever a token resolves, while still
 * honouring an EXPLICIT opt-out (NEXT_PUBLIC_ANALYTICS_ENABLED === "false").
 * The legacy `shouldRenderPostHogAnalytics` is intentionally left unchanged
 * (other providers and existing regression tests depend on its semantics).
 */

/**
 * Founder-provided default project token (PostHog project 516325, US cloud).
 * Safe to embed: NEXT_PUBLIC project API keys are write-only capture keys,
 * designed to be shipped in browser bundles.
 */
export const POSTHOG_FALLBACK_PROJECT_TOKEN =
  "phc_AohQmcGuJoe7FxGD4y4wqWoyGBoMoiaJDRxsaBMuyP2k";

export const POSTHOG_DEFAULT_HOST = "https://us.i.posthog.com";

function trimmed(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Token precedence: NEXT_PUBLIC_POSTHOG_KEY, then
 * NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, then the embedded fallback. Blank or
 * whitespace-only env values are treated as absent (never emit "undefined").
 */
export function resolvePostHogToken(env: {
  NEXT_PUBLIC_POSTHOG_KEY?: string | undefined;
  NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?: string | undefined;
}): string {
  return (
    trimmed(env.NEXT_PUBLIC_POSTHOG_KEY) ??
    trimmed(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) ??
    POSTHOG_FALLBACK_PROJECT_TOKEN
  );
}

/** Host override with the US-cloud default; trailing slashes are stripped. */
export function resolvePostHogHost(host: string | undefined): string {
  return (trimmed(host) ?? POSTHOG_DEFAULT_HOST).replace(/\/+$/, "");
}

/**
 * Whether the PostHog client should initialise.
 * - No (blank) token => never init.
 * - Explicit master opt-out ("false") => never init.
 * - Otherwise (flag unset, "true", or anything else) => init when a token
 *   resolves. Defaults ON with a token, unlike the legacy layout gate.
 */
export function shouldInitPostHogClient(
  analyticsEnabled: string | undefined,
  resolvedToken: string | undefined,
): boolean {
  if (!trimmed(resolvedToken)) return false;
  if (trimmed(analyticsEnabled)?.toLowerCase() === "false") return false;
  return true;
}

const AUTOMATED_CLIENT_UA_RE =
  /googlebot|bingbot|oai-searchbot|chatgpt-user|gptbot|perplexitybot|claudebot|claude-searchbot|headlesschrome|playwright|puppeteer|lighthouse|sentryuptimebot|uptimerobot|pingdom|curl\/|python-requests/i;

/**
 * Suppress PostHog capture for automated search/AI crawlers and headless QA
 * harnesses so opening crawlability never burns PostHog event or replay quota.
 */
export function isAutomatedCrawlerOrHeadlessClient(
  userAgent: string | undefined,
  webdriver?: boolean,
): boolean {
  if (webdriver === true) return true;
  const ua = trimmed(userAgent);
  if (!ua) return false;
  return AUTOMATED_CLIENT_UA_RE.test(ua);
}

/**
 * Build zero-waste PostHog init options: keeps session replay, dead-click
 * capture, and heatmaps off by default unless explicitly opted in, and enforces
 * client-side rate limiting.
 */
export function buildPostHogZeroWasteInitOptions(
  host: string,
  env: { NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED?: string | undefined } = {},
) {
  const replayEnabled =
    trimmed(env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED)?.toLowerCase() === "true";
  return {
    api_host: host,
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only" as const,
    capture_pageview: true,
    capture_pageleave: true,
    // Prevent dynamic remote <script> injection on Mobile Safari / ITP blockers.
    disable_external_dependency_loading: true,
    disable_session_recording: !replayEnabled,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    rate_limiting: {
      events_per_second: 10,
      events_burst_limit: 50,
    },
    // Respect explicit opt-out; never persist beyond the session choice.
    respect_dnt: true,
  };
}