"use client";

/**
 * Client-side PostHog initialisation (Next.js 14 App Router pattern).
 *
 * Mounted once in the root layout. Reads NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN.
 * When absent this is a silent no-op in production; in development it logs
 * a loud warning so misconfiguration is caught early.
 *
 * NOTE: instrumentation-client.ts is the simpler init path for Next.js ≥ 15.3.
 * This component is the correct alternative for Next.js 14.
 */

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogInit(): null {
  useEffect(() => {
    const token = process.env["NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"];
    if (!token) {
      if (process.env["NODE_ENV"] !== "production") {
        console.error(
          "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or " +
            "un-configured, this causes events to be silently missed. This error stops " +
            "appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
        );
      }
      return;
    }
    posthog.init(token, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: process.env["NODE_ENV"] === "development",
    });
  }, []);

  return null;
}
