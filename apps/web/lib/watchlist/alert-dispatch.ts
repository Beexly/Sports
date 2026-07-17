/**
 * Watchlist — alert dispatch (the send seam).
 *
 * INERT BY DEFAULT. `dispatchWatchlistAlert` no-ops (zero I/O) unless
 * WATCHLIST_ALERTS_ENABLED=true — the founder flips that on once a real
 * channel is wired in (mirrors packages/ingestion-pipeline/src/line-archive.ts's
 * LINE_ARCHIVE_ENABLED doctrine). Every branch is failure-isolated: this
 * function never throws, so a broken alert path can never take down the
 * caller that fires it (mirrors packages/ingestion-pipeline/src/owner-alert.ts).
 *
 * Existing notification scaffolding audit (see STUDY FIRST in the task
 * brief): schema.prisma already defines an `Alert` model (userId, sport,
 * league, threshold, channel EMAIL|PUSH) but it is dead code — grep finds
 * zero call sites (`db.alert.*`) anywhere in this repo. The only *wired*
 * notification path is packages/ingestion-pipeline/src/owner-alert.ts, a
 * Telegram ping scoped to the FOUNDER's own phone for pipeline failures —
 * not a per-user channel and not reusable here. No SMTP/push client
 * dependency exists in package.json (no nodemailer/resend/@sendgrid/
 * web-push/twilio). Per the task brief this module does NOT add one; it is
 * the typed seam a real channel plugs into later — see the TODO below.
 *
 * Gating (ALL required, independent, fail-closed):
 *   1. WATCHLIST_ALERTS_ENABLED=true (global kill switch).
 *   2. GRADED-only doctrine (alert-eligibility.ts) — never an ungraded tip.
 *   3. The recipient's `Entitlements.canGetAlerts` — Elite-exclusive, per
 *      CLAUDE.md's tier table ("real-time email & push alerts").
 */

import { evaluateAlertEligibility, type GradedEventInput } from "./alert-eligibility";
import type { WatchlistEntityType } from "./types";

export interface WatchlistAlertPayload {
  readonly userId: string;
  readonly entityType: WatchlistEntityType;
  readonly entityId: string;
  readonly event: GradedEventInput;
  /** Plain-language, data-backed summary only — no fabricated stats
   *  (CLAUDE.md rule #2). Callers must derive this from the graded pick
   *  itself, never invent it. */
  readonly message: string;
}

export interface WatchlistAlertRecipient {
  readonly canGetAlerts: boolean;
}

export type WatchlistDispatchOutcome =
  | "disabled"
  | "not_graded"
  | "tier_ineligible"
  | "no_channel_wired";

export interface WatchlistDispatchResult {
  readonly sent: boolean;
  readonly outcome: WatchlistDispatchOutcome;
}

/** True iff WATCHLIST_ALERTS_ENABLED === "true". Default OFF — founder
 *  flips it on. Typed as a minimal record (not the full `NodeJS.ProcessEnv`)
 *  so tests can pass a bare `{ WATCHLIST_ALERTS_ENABLED: "true" }` without
 *  satisfying every other required env key. */
export function isWatchlistAlertsEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env["WATCHLIST_ALERTS_ENABLED"] === "true";
}

/**
 * HARD GATE — the only entry point production code should call to notify a
 * follower. Never throws. Returns `sent: false` for every reason short of
 * an actually-wired channel, since none exists yet (`no_channel_wired`) —
 * that is the honest, ships-dark state this function is in today.
 */
export async function dispatchWatchlistAlert(
  payload: WatchlistAlertPayload,
  recipient: WatchlistAlertRecipient,
): Promise<WatchlistDispatchResult> {
  try {
    const enabled = isWatchlistAlertsEnabled();
    const verdict = evaluateAlertEligibility({
      alertsEnabled: enabled,
      canGetAlerts: recipient.canGetAlerts,
      event: payload.event,
    });

    if (!verdict.eligible) {
      // "alerts_disabled" and the eligibility reasons share vocabulary by
      // design (both fail-closed) — map 1:1 rather than re-deriving.
      return { sent: false, outcome: verdict.reason === "alerts_disabled" ? "disabled" : verdict.reason };
    }

    // TODO(founder): wire a real email/push channel here. No SMTP/push
    // client is installed in this repo (see module doc comment) — do not
    // build one ad hoc in this function. When one is chosen (e.g. an
    // existing transactional-email provider already used elsewhere, or a
    // web-push integration), this is the single call site to route through.
    // Until then every eligible alert reaches here and honestly reports
    // "no_channel_wired" rather than pretending to have sent something.
    return { sent: false, outcome: "no_channel_wired" };
  } catch {
    // Never throw — a broken alert path must not block or fail the caller.
    return { sent: false, outcome: "disabled" };
  }
}
