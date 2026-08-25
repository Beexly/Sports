/**
 * The one place a fail-CLOSED entitlement downgrade becomes AUDIBLE.
 *
 * Deliberately its OWN module rather than an export of `lib/entitlements.ts`:
 * eleven test files mock `@/lib/entitlements` down to a single
 * `getUserEntitlements` double, and adding an export there would make every one
 * of them a maintenance hazard that fails only on the error path. Nothing mocks
 * this module, so the gates keep logging for real under test.
 */

/**
 * Record a fail-closed downgrade to FREE.
 *
 * Failing closed IS the correct posture and this helper never changes a verdict.
 * What it fixes is that the downgrade used to happen in TOTAL SILENCE at four
 * separate call sites, so an infrastructure fault (Postgres unreachable, Auth.js
 * throwing) was byte-for-byte indistinguishable from a genuine free-tier reader.
 * A DB outage therefore served the free surface to the entire paying membership
 * — 401s from the API gate, teaser boards from the page gate — with nothing at
 * all in the logs to explain the support wave.
 *
 * Logs the error name/message and the user id only — never an env var value, a
 * token, or a connection string.
 *
 * @param site  short call-site tag, e.g. "api-entitlement:gate"
 */
export function logEntitlementFailClosed(
  site: string,
  userId: string | undefined,
  error: unknown,
): void {
  const detail =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(
    `[entitlements] FAIL-CLOSED at ${site} — serving FREE because entitlements could ` +
      `not be resolved for user ${userId ?? "<unauthenticated>"}: ${detail}. ` +
      "A paying member may be seeing the free surface; this is infrastructure, not policy.",
  );
}
