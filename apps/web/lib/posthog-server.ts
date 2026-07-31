import { PostHog } from "posthog-node";

/**
 * Returns a per-request PostHog Node client configured for short-lived
 * serverless/edge handlers (flushAt 1, flushInterval 0). Callers must
 * `await client.flush()` before returning so enqueued events are sent
 * before the handler tears down.
 *
 * Returns null when NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is absent: in
 * development this logs loudly so misconfiguration is caught early; in
 * production it is a silent no-op so a missing env var never breaks the app.
 */
export function getPostHogClient(): PostHog | null {
  const token = process.env["NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"];
  if (!token) {
    if (process.env["NODE_ENV"] !== "production") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or " +
          "un-configured, this causes events to be silently missed. This error stops " +
          "appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
      );
    }
    return null;
  }
  return new PostHog(token, {
    host: process.env["NEXT_PUBLIC_POSTHOG_HOST"] ?? "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}
