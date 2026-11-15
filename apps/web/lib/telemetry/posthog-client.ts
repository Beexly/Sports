/**
 * PostHog client wiring (WP-5 telemetry).
 *
 * Uses posthog-js (not the raw /capture fetch) with:
 *  - person_profiles: "identified_only" (no anonymous person profiles)
 *  - US cloud host (project 516325)
 *  - token resolution + opt-out gating from lib/analytics/posthog-config
 *
 * The init is idempotent and strictly non-blocking: analytics must never
 * affect auth, checkout, or page rendering. Server-side renders are a no-op.
 */

import posthog from "posthog-js";
import {
  resolvePostHogToken,
  resolvePostHogHost,
  shouldInitPostHogClient,
} from "@/lib/analytics/posthog-config";

let initialized = false;

/** True once posthog-js has been initialised in this browser session. */
export function postHogClientInitialized(): boolean {
  return initialized;
}

/**
 * Initialise posthog-js exactly once. Returns true when analytics is live.
 * Safe to call from any client component effect; never throws.
 */
export function initPostHogClient(): boolean {
  if (typeof window === "undefined") return false;
  if (initialized) return true;

  const token = resolvePostHogToken({
    NEXT_PUBLIC_POSTHOG_KEY: process.env["NEXT_PUBLIC_POSTHOG_KEY"],
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: process.env["NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"],
  });
  const host = resolvePostHogHost(process.env["NEXT_PUBLIC_POSTHOG_HOST"]);
  if (!shouldInitPostHogClient(process.env["NEXT_PUBLIC_ANALYTICS_ENABLED"], token)) {
    return false;
  }

  try {
    posthog.init(token, {
      api_host: host,
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      // Respect explicit opt-out; never persist beyond the session choice.
      respect_dnt: true,
    });
    initialized = true;
    return true;
  } catch {
    // Observability is strictly non-blocking.
    return false;
  }
}

/** Capture an event only when the client is live; never throws. */
export function capturePostHogEvent(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  if (!initialized) return;
  try {
    posthog.capture(event, properties);
  } catch {
    // Non-blocking.
  }
}

/** Identify an authenticated user (creates the person profile). */
export function identifyPostHogUser(
  userId: string,
  traits: Record<string, unknown> = {},
): void {
  if (!initialized) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    // Non-blocking.
  }
}

/** Reset identity on sign-out so the next user is not merged. */
export function resetPostHogIdentity(): void {
  if (!initialized) return;
  try {
    posthog.reset();
  } catch {
    // Non-blocking.
  }
}