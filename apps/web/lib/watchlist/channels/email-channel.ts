/**
 * Email channel — transactional email via Resend, for watchlist alerts.
 * Half of the Elite "real-time email & push alerts" feature (see CLAUDE.md's
 * tier table); the other half is channels/web-push-channel.ts.
 *
 * Fail-isolated by construction, mirroring the try/catch discipline in
 * apps/web/lib/watchlist/alert-dispatch.ts and
 * packages/ingestion-pipeline/src/owner-alert.ts: `sendAlertEmail` NEVER
 * throws. It honestly no-ops with `{ sent: false, detail: "not_configured" }`
 * when `RESEND_API_KEY` / `ALERTS_EMAIL_FROM` are not both set — so a
 * partially-configured deploy degrades gracefully instead of crashing the
 * caller's fan-out.
 */

import { Resend } from "resend";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { absoluteUrl } from "@/lib/seo/site-url";

export type EmailSendDetail = "sent" | "not_configured" | "send_failed";

/** Honest failure taxonomy (hardening 6.9). Resend validation errors
 *  (rejected address, bad payload) are permanent; everything else —
 *  rate limits, 5xx, network exceptions — is retryable. */
export type EmailSendClassification =
  | "sent"
  | "not_configured"
  | "retryable"
  | "permanent";

export interface EmailSendResult {
  readonly sent: boolean;
  readonly detail: EmailSendDetail;
  readonly classification: EmailSendClassification;
  readonly errorName?: string;
}

const PERMANENT_RESEND_ERROR_NAMES = new Set([
  "validation_error",
  "invalid_to_address",
  "invalid_from_address",
]);

type EmailEnv = Record<string, string | undefined>;

/**
 * OPT-OUT (RFC 2369 List-Unsubscribe + a visible footer).
 *
 * Legal posture, stated precisely: a graded-result alert to a paying
 * subscriber who opted in by following an entity is plausibly a
 * transactional/relationship message under 16 CFR 316.3, which is EXEMPT
 * from CAN-SPAM's opt-out requirement — so the pre-fix absence of any
 * opt-out was very likely not a per-se violation. The real costs were:
 *   (a) Gmail/Yahoo bulk-sender guidance expects List-Unsubscribe, and its
 *       absence is a deliverability negative for every alert we send; and
 *   (b) an Elite member who wanted PUSH-ONLY had no way to stop email short
 *       of unverifying their address or cancelling — an unstoppable alert.
 *
 * What is advertised is only what can actually be honored for THAT
 * recipient (see the per-context routes below):
 *   - a `mailto:` route to the real support inbox (a human acts on it), and
 *   - for a graded alert, an `https:` route to /watchlist, where
 *     unfollowing genuinely stops these alerts (the outbox materializes
 *     recipients from follows). Where no self-service route exists, none
 *     is advertised.
 *
 * DELIBERATELY ABSENT: `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
 * (RFC 8058). One-click requires the sender to actually honor a POST, and
 * there is no per-user notification-preference store to record the opt-out
 * in — adding one is a schema change. Advertising one-click we cannot honor
 * would be a false promise to both the mailbox provider and the subscriber,
 * and a non-functional one-click endpoint HURTS deliverability rather than
 * helping it. The header is a one-line addition the day the preference
 * model lands; until then this module claims only what it can deliver,
 * matching the same never-claim-an-unsent-send doctrine as `sent: false`.
 *
 * WHY THIS IS PER-CONTEXT AND NOT ONE FIXED FOOTER: `sendAlertEmail` is not
 * used by the alert path alone — lib/gse/waitlist-welcome-email.ts routes
 * through it too. Stamping "you follow this team" onto a waitlist welcome
 * would be fabricated copy (CLAUDE.md rule #2) pointing at an unsubscribe
 * route that does nothing for that recipient. So the opt-out is selected by
 * an explicit context: adding a new caller means picking one, and there is
 * no way to send through this module with no opt-out at all.
 */

/** Which relationship the message is being sent under. Determines the
 *  footer wording and the unsubscribe routes advertised — both of which
 *  must be true for THIS recipient, not merely true somewhere. */
export type EmailOptOutContext = "watchlist-alert" | "waitlist";

interface OptOutRoutes {
  /** RFC 2369 https route: a page where this recipient can actually stop
   *  these messages. `null` when no self-service route exists (mailto is
   *  then the only honest advertisement). */
  readonly manageUrl: string | null;
  readonly mailtoSubject: string;
  readonly footerLines: readonly string[];
}

function optOutRoutes(context: EmailOptOutContext): OptOutRoutes {
  if (context === "waitlist") {
    // No self-service unsubscribe surface exists for the founding-list
    // leads, so none is advertised. The mailto is real: a human at
    // SUPPORT_EMAIL removes the lead.
    return {
      manageUrl: null,
      mailtoSubject: "Unsubscribe from the Galaxy Sports Edge founding list",
      footerLines: [
        "You're receiving this because you joined the Galaxy Sports Edge founding waitlist.",
        `To be removed, email ${SUPPORT_EMAIL} with "unsubscribe" and we'll take you off the list.`,
      ],
    };
  }
  // Watchlist graded alert. Every claim here is one the product honors
  // today: unfollowing really does remove the member from the next
  // expansion's recipient set, and support really can remove follows on
  // their behalf. It deliberately does NOT promise an email-only opt-out —
  // there is no per-channel preference store yet (schema change).
  const manageUrl = absoluteUrl("/watchlist");
  return {
    manageUrl,
    mailtoSubject: "Unsubscribe from graded alerts",
    footerLines: [
      "You're receiving this because you follow this team on Galaxy Sports Edge",
      "and your plan includes graded alerts.",
      `To unsubscribe, stop following the team: ${manageUrl}`,
      `Need a hand? Email ${SUPPORT_EMAIL} with "unsubscribe" and we'll remove your follows for you.`,
    ],
  };
}

/** RFC 2369 headers for one email. Exported for direct testing. Routes are
 *  listed most-preferred-first: the https route is the one that genuinely
 *  self-serves, the mailto is the human backstop. */
export function alertEmailUnsubscribeHeaders(
  context: EmailOptOutContext = "watchlist-alert",
): Record<string, string> {
  const { manageUrl, mailtoSubject } = optOutRoutes(context);
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(mailtoSubject)}`;
  const routes = manageUrl ? [`<${manageUrl}>`, `<${mailto}>`] : [`<${mailto}>`];
  return { "List-Unsubscribe": routes.join(", ") };
}

/** Appends the visible opt-out footer. The caller's body is preserved
 *  verbatim — the footer is added, never substituted (a header alone is
 *  invisible in most mail clients). */
export function withUnsubscribeFooter(
  body: string,
  context: EmailOptOutContext = "watchlist-alert",
): string {
  return [body, "", "—", ...optOutRoutes(context).footerLines].join("\n");
}

/** True only when both Resend env vars are set. Exported so
 *  alert-dispatch.ts can distinguish "not configured at all" from "no
 *  verified email on file for this recipient" without re-deriving the
 *  same two-var check. */
export function isEmailConfigured(env: EmailEnv = process.env): boolean {
  return Boolean(env["RESEND_API_KEY"] && env["ALERTS_EMAIL_FROM"]);
}

/**
 * Sends one plain-text transactional email. Never throws — every failure
 * (missing config, an SDK-reported send error, a network exception)
 * resolves to `sent: false` with an honest `detail`.
 *
 * Opt-out (headers + footer) is applied HERE, at the single choke point
 * every alert email passes through, never at the call sites: a caller that
 * forgets is exactly the silent-omission failure mode this closes.
 */
export async function sendAlertEmail(
  to: string,
  subject: string,
  body: string,
  env: EmailEnv = process.env,
  /** The relationship this message is sent under — picks the footer copy
   *  and the unsubscribe routes. Defaults to the watchlist graded alert,
   *  this module's own channel; every other caller must say so explicitly. */
  optOutContext: EmailOptOutContext = "watchlist-alert",
): Promise<EmailSendResult> {
  try {
    if (!isEmailConfigured(env)) {
      return { sent: false, detail: "not_configured", classification: "not_configured" };
    }

    const resend = new Resend(env["RESEND_API_KEY"] as string);
    const result = await resend.emails.send({
      from: env["ALERTS_EMAIL_FROM"] as string,
      to,
      subject,
      text: withUnsubscribeFooter(body, optOutContext),
      headers: alertEmailUnsubscribeHeaders(optOutContext),
    });

    // The Resend SDK reports delivery failures via `result.error` rather
    // than a thrown rejection — both paths must be treated as "not sent".
    if (result.error) {
      const errorName = result.error.name ?? "unknown";
      return {
        sent: false,
        detail: "send_failed",
        classification: PERMANENT_RESEND_ERROR_NAMES.has(errorName) ? "permanent" : "retryable",
        errorName,
      };
    }

    return { sent: true, detail: "sent", classification: "sent" };
  } catch {
    return { sent: false, detail: "send_failed", classification: "retryable" };
  }
}
