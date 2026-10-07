/**
 * Runtime redirect origin — the base URL third parties send users BACK to.
 *
 * Distinct from `lib/seo/site-url.ts` (`SITE_URL`), which is the canonical
 * public *identity* host for metadata/sitemap/JSON-LD and deliberately never
 * falls back to localhost. This module covers the other concern that module's
 * header calls out: Stripe checkout success/cancel URLs and the billing portal
 * return URL, which DO want `http://localhost:3000` while developing.
 *
 * The dev carve-out is intentional and preserved. The production hole is not:
 * with `NEXT_PUBLIC_APP_URL` unset or typo'd, checkout SUCCEEDS end to end — card
 * charged, webhook delivered, entitlement granted — and Stripe then redirects the
 * paying customer to `http://localhost:3000/dashboard?upgraded=true`, a
 * connection-refused page on their own machine. They conclude the payment failed
 * and charge back. Nothing throws and nothing is logged.
 *
 * So: keep the convenience, refuse the placeholder in production.
 */
import { requireProductionEnv } from "@/lib/config/require-env";

/** Base URL used for local development only. */
export const DEV_APP_URL = "http://localhost:3000";

/**
 * The absolute origin to build user-facing return URLs from, with any trailing
 * slash stripped so `${appUrl()}/dashboard` can never produce `//dashboard`.
 *
 * @throws {MissingProductionEnvError} in production when NEXT_PUBLIC_APP_URL is
 * unset or blank.
 */
export function requireAppUrl(): string {
  return requireProductionEnv(
    "NEXT_PUBLIC_APP_URL",
    DEV_APP_URL,
    "user-facing redirect URLs (Stripe checkout return, billing portal return)",
  ).replace(/\/$/, "");
}
