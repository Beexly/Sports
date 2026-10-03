/**
 * Watchlist — alert dispatch (the send seam).
 *
 * INERT BY DEFAULT. `dispatchWatchlistAlert` no-ops (zero I/O) unless
 * WATCHLIST_ALERTS_ENABLED=true — the founder flips that on (mirrors
 * packages/ingestion-pipeline/src/line-archive.ts's LINE_ARCHIVE_ENABLED
 * doctrine). Every branch is failure-isolated: this function never throws,
 * so a broken alert path can never take down the caller that fires it
 * (mirrors packages/ingestion-pipeline/src/owner-alert.ts).
 *
 * Two real channels are wired here:
 *   - Web Push (channels/web-push-channel.ts) — fans out to EVERY stored
 *     PushSubscription for the recipient (apps/web/lib/push/subscription-db.ts),
 *     each device isolated from the others.
 *   - Email (channels/email-channel.ts) — one send, ONLY to a verified
 *     email address. An unverified email is treated exactly like no email:
 *     this module never sends to an address the user hasn't confirmed.
 * Both channels independently no-op honestly when their env vars are
 * unset (see each module's `isXConfigured`) — this function never claims
 * `sent: true` for a channel that actually didn't send.
 *
 * Gating (ALL required, independent, fail-closed, unchanged from before
 * real channels existed):
 *   1. WATCHLIST_ALERTS_ENABLED=true (global kill switch).
 *   2. GRADED-only doctrine (alert-eligibility.ts) — never an ungraded tip.
 *   3. The recipient's `Entitlements.canGetAlerts` — Elite-exclusive, per
 *      CLAUDE.md's tier table ("real-time email & push alerts").
 * None of these gates change: a channel failure or absence past this point
 * only affects whether the eligible alert was actually delivered, never
 * whether it was allowed to be attempted.
 */

import { evaluateAlertEligibility, type GradedEventInput } from "./alert-eligibility";
import type { WatchlistEntityType } from "./types";
import { listPushSubscriptionsForUser } from "@/lib/push/subscription-db";
import {
  isWebPushConfigured,
  sendWebPushAlert,
  type WebPushSendDetail,
} from "./channels/web-push-channel";
import { isEmailConfigured, sendAlertEmail, type EmailSendDetail } from "./channels/email-channel";

export interface WatchlistAlertPayload {
  readonly userId: string;
  readonly entityType: WatchlistEntityType;
  readonly entityId: string;
  readonly event: GradedEventInput;
  /** Plain-language, data-backed summary only — no fabricated stats
   *  (CLAUDE.md rule #2). Callers must derive this from the graded pick
   *  itself, never invent it. Used as both the push notification body and
   *  the email body. */
  readonly message: string;
}

export interface WatchlistAlertRecipient {
  readonly canGetAlerts: boolean;
  /** The recipient's email address, but ONLY when NextAuth has stamped
   *  `emailVerified` on the User row. Pass `null`/`undefined` for an
   *  unverified or missing address — the email channel then honestly
   *  no-ops rather than mailing an unconfirmed inbox. */
  readonly verifiedEmail?: string | null;
}

export type WatchlistDispatchOutcome =
  | "disabled"
  | "not_graded"
  | "tier_ineligible"
  | "dispatched"
  | "no_channel_wired"
  | "no_recipients"
  | "delivery_failed";

export interface WatchlistChannelOutcome {
  readonly channel: "push" | "email";
  readonly sent: boolean;
  readonly detail: WebPushSendDetail | EmailSendDetail | "no_subscriptions" | "no_verified_email" | "lookup_failed";
}

export interface WatchlistDispatchResult {
  /** True iff at least one channel actually delivered. */
  readonly sent: boolean;
  readonly outcome: WatchlistDispatchOutcome;
  /** Per-channel detail — one entry per push subscription attempted, plus
   *  one entry for email. Empty when the alert never became eligible. */
  readonly channels: readonly WatchlistChannelOutcome[];
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

function buildPushPayload(payload: WatchlistAlertPayload): { title: string; body: string } {
  return { title: "GalaxySportsEdge — pick graded", body: payload.message };
}

function buildEmailSubject(): string {
  return "GalaxySportsEdge — your watchlist pick graded";
}

/**
 * Derives the honest overall outcome from the per-channel attempts. Only
 * called once we know nothing actually sent (`anySent === false`):
 *   - Neither channel is configured at all → the pre-channel-wiring
 *     "no_channel_wired" state, preserved verbatim for anyone still
 *     matching on it.
 *   - At least one channel is configured, but this recipient had nothing
 *     to send to (no subscriptions, no verified email) → "no_recipients".
 *   - At least one channel is configured AND had a real recipient, but the
 *     send itself failed → "delivery_failed".
 */
function deriveFailureOutcome(
  channels: readonly WatchlistChannelOutcome[],
  pushConfigured: boolean,
  emailConfigured: boolean,
): WatchlistDispatchOutcome {
  if (!pushConfigured && !emailConfigured) return "no_channel_wired";
  const anyAttemptedSend = channels.some(
    (c) => c.detail === "send_failed",
  );
  return anyAttemptedSend ? "delivery_failed" : "no_recipients";
}

/**
 * HARD GATE — the only entry point production code should call to notify a
 * follower. Never throws. `dbArg` is the Prisma-shaped db handle (accepted
 * as `unknown`, same defensive-cast doctrine as
 * apps/web/lib/push/subscription-db.ts) used to look up the recipient's
 * stored push subscriptions; it is not touched at all unless the alert is
 * already eligible, so an ineligible call performs zero I/O exactly as
 * before real channels existed.
 */
export async function dispatchWatchlistAlert(
  dbArg: unknown,
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
      return {
        sent: false,
        outcome: verdict.reason === "alerts_disabled" ? "disabled" : verdict.reason,
        channels: [],
      };
    }

    const channels: WatchlistChannelOutcome[] = [];

    // ── Push: fan out to every stored subscription, each isolated ──
    const subsResult = await listPushSubscriptionsForUser(dbArg, payload.userId);
    const subscriptions = subsResult.ok ? subsResult.data : [];
    if (subscriptions.length === 0) {
      channels.push({
        channel: "push",
        sent: false,
        detail: subsResult.ok ? "no_subscriptions" : "lookup_failed",
      });
    } else {
      const pushPayload = buildPushPayload(payload);
      for (const subscription of subscriptions) {
        // Each device's send is independently caught by sendWebPushAlert
        // itself (it never throws) — one dead/expired subscription must
        // never stop the rest of this user's devices from being notified.
        const result = await sendWebPushAlert(subscription, pushPayload);
        channels.push({ channel: "push", sent: result.sent, detail: result.detail });
      }
    }

    // ── Email: one send, only to a verified address ──
    if (recipient.verifiedEmail) {
      const result = await sendAlertEmail(
        recipient.verifiedEmail,
        buildEmailSubject(),
        payload.message,
      );
      channels.push({ channel: "email", sent: result.sent, detail: result.detail });
    } else {
      channels.push({ channel: "email", sent: false, detail: "no_verified_email" });
    }

    const sent = channels.some((c) => c.sent);
    const outcome: WatchlistDispatchOutcome = sent
      ? "dispatched"
      : deriveFailureOutcome(channels, isWebPushConfigured(), isEmailConfigured());

    return { sent, outcome, channels };
  } catch {
    // Never throw — a broken alert path must not block or fail the caller.
    return { sent: false, outcome: "disabled", channels: [] };
  }
}
