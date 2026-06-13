"use client";

/**
 * Client-side Sentry initialisation.
 *
 * Mounted once in the root layout. Reads NEXT_PUBLIC_SENTRY_DSN.
 * When absent this is a clean no-op — no console noise, no network calls.
 *
 * We cannot use sentry.client.config.ts for auto-pickup without withSentryConfig
 * (the webpack plugin), so this component is the client init path instead.
 */

import { useEffect } from "react";
import { initObservability } from "@/lib/observability/sentry";

export function SentryClientInit(): null {
  useEffect(() => {
    initObservability();
  }, []);

  return null;
}
