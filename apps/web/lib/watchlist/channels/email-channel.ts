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

export type EmailSendDetail = "sent" | "not_configured" | "send_failed";

export interface EmailSendResult {
  readonly sent: boolean;
  readonly detail: EmailSendDetail;
}

type EmailEnv = Record<string, string | undefined>;

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
 */
export async function sendAlertEmail(
  to: string,
  subject: string,
  body: string,
  env: EmailEnv = process.env,
): Promise<EmailSendResult> {
  try {
    if (!isEmailConfigured(env)) {
      return { sent: false, detail: "not_configured" };
    }

    const resend = new Resend(env["RESEND_API_KEY"] as string);
    const result = await resend.emails.send({
      from: env["ALERTS_EMAIL_FROM"] as string,
      to,
      subject,
      text: body,
    });

    // The Resend SDK reports delivery failures via `result.error` rather
    // than a thrown rejection — both paths must be treated as "not sent".
    if (result.error) {
      return { sent: false, detail: "send_failed" };
    }

    return { sent: true, detail: "sent" };
  } catch {
    return { sent: false, detail: "send_failed" };
  }
}
