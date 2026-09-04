/**
 * The one place a fail-CLOSED entitlement downgrade becomes AUDIBLE.
 *
 * Deliberately its OWN module rather than an export of `lib/entitlements.ts`:
 * eleven test files mock `@/lib/entitlements` down to a single
 * `getUserEntitlements` double, and adding an export there would make every one
 * of them a maintenance hazard that fails only on the error path. Nothing mocks
 * this module, so the gates keep logging for real under test.
 */

import { redactErrorDetail, sanitizeLogField } from "@/lib/log-safety";

/**
 * How long one call site stays quiet after it has spoken.
 *
 * The faults this helper reports are by their nature per-REQUEST: a database
 * that cannot be reached fails every gate on every page load for as long as the
 * outage lasts. Logging each one turns a single infrastructure fault into
 * thousands of identical records a minute — the operator pays to store them,
 * and the signal that matters (whatever ELSE breaks during the outage) is
 * buried in them. So the first downgrade at a site prints immediately, and the
 * next line from that site carries the count of everything suppressed in
 * between: the outage stays visible and its scale is still reported, at one
 * line a minute per site instead of one per request.
 *
 * Throttling is keyed on the site AND the redacted error text, never the site
 * alone. Collapsing a repeat of the SAME fault is the point; swallowing a
 * DIFFERENT one because it landed at the same call site within the minute would
 * recreate the exact problem this module exists to fix — a second failure mode
 * hidden inside the first. A fault whose text varies per occurrence therefore
 * defeats the throttle and prints every time, which is the safe direction to
 * fail: no worse than logging without a throttle at all.
 */
const THROTTLE_WINDOW_MS = 60_000;

type SiteThrottleState = {
  /** When this site+fault last actually printed. */
  emittedAt: number;
  /** Downgrades swallowed since then — reported on the next printed line. */
  suppressed: number;
};

const throttleBySite = new Map<string, SiteThrottleState>();

/**
 * How long a spent entry is kept before it is swept.
 *
 * Generous on purpose: an entry whose window has just elapsed still holds the
 * suppressed count that its NEXT printed line is supposed to report, so
 * evicting at exactly one window would silently drop the number. Ten windows
 * is long past the point where that count is still interesting.
 */
const THROTTLE_RETENTION_MS = THROTTLE_WINDOW_MS * 10;

/**
 * Hard ceiling on distinct keys, as a backstop to the sweep.
 *
 * Keying on the fault text is what stops a second failure mode hiding behind
 * the first — but it also means a fault whose text varies per occurrence (one
 * carrying a request id, say) mints a new key every time. Unbounded, that is a
 * slow leak for the life of a warm server process. The sweep handles the
 * ordinary case; this catches a burst that outruns it.
 */
const MAX_THROTTLE_KEYS = 500;

/**
 * Drop spent entries. Runs only when a line is actually printed, so the cost
 * is paid once per emitted log rather than once per suppressed request.
 */
function sweepThrottle(now: number): void {
  for (const [key, state] of throttleBySite) {
    if (now - state.emittedAt >= THROTTLE_RETENTION_MS) throttleBySite.delete(key);
  }
  // A Map iterates in insertion order and every emit re-inserts, so the oldest
  // keys are the least recently printed.
  let excess = throttleBySite.size - MAX_THROTTLE_KEYS;
  if (excess <= 0) return;
  for (const key of throttleBySite.keys()) {
    if (excess-- <= 0) break;
    throttleBySite.delete(key);
  }
}

/**
 * Drop the throttle state. Tests only: each case must start from silence, or a
 * neighbouring case's log would suppress the one under assertion.
 */
export function resetEntitlementFailClosedThrottle(): void {
  throttleBySite.clear();
}

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
 * Logs the error name/message and the user id only — and the message goes
 * through `redactErrorDetail` first, because a Prisma fault is exactly the kind
 * of error that carries the datasource URL or the database host:port in its
 * text. Never an env var value, a token, or a connection string.
 *
 * @param site  short call-site tag, e.g. "api-entitlement:gate"
 */
export function logEntitlementFailClosed(
  site: string,
  userId: string | undefined,
  error: unknown,
): void {
  const key = sanitizeLogField(site, 64);
  const detail = redactErrorDetail(error);
  // Site + fault. The user id is deliberately NOT part of the key: during an
  // outage every request carries a different one, which would defeat the
  // throttle completely.
  const throttleKey = `${key}::${detail.slice(0, 160)}`;
  const now = Date.now();
  const state = throttleBySite.get(throttleKey);

  if (state && now - state.emittedAt < THROTTLE_WINDOW_MS) {
    state.suppressed += 1;
    return;
  }

  const suppressed = state?.suppressed ?? 0;
  // Delete before re-inserting so this key moves to the back of the insertion
  // order, which is what makes the size cap evict least-recently-printed.
  throttleBySite.delete(throttleKey);
  sweepThrottle(now);
  throttleBySite.set(throttleKey, { emittedAt: now, suppressed: 0 });

  const who = sanitizeLogField(userId ?? "<unauthenticated>", 64);
  const backlog =
    suppressed > 0
      ? ` ${suppressed} further identical downgrade${suppressed === 1 ? "" : "s"} at this ` +
        `site ${suppressed === 1 ? "was" : "were"} suppressed in the preceding ` +
        `${Math.round(THROTTLE_WINDOW_MS / 1000)}s.`
      : "";

  console.error(
    `[entitlements] FAIL-CLOSED at ${key} — serving FREE because entitlements could ` +
      `not be resolved for user ${who}: ${detail}. ` +
      "A paying member may be seeing the free surface; this is infrastructure, not policy." +
      backlog,
  );
}
