/**
 * Optional waitlist welcome email via existing Resend channel.
 * Opt-in: WAITLIST_WELCOME_EMAIL=true + RESEND_API_KEY + ALERTS_EMAIL_FROM.
 * Never throws; never blocks lead durability.
 */
import {
  isEmailConfigured,
  sendAlertEmail,
  type EmailSendResult,
} from "@/lib/watchlist/channels/email-channel";

type Env = Record<string, string | undefined>;

export function isWaitlistWelcomeEmailEnabled(env: Env = process.env): boolean {
  return env["WAITLIST_WELCOME_EMAIL"] === "true" && isEmailConfigured(env);
}

export async function sendWaitlistWelcomeEmail(
  to: string,
  opts: { name?: string; env?: Env } = {},
): Promise<EmailSendResult> {
  const env = opts.env ?? process.env;
  if (!isWaitlistWelcomeEmailEnabled(env)) {
    return { sent: false, detail: "not_configured", classification: "not_configured" };
  }
  const name = opts.name?.trim();
  const greet = name ? `Hi ${name},` : "Hi,";
  const subject = "You're on the Galaxy Sports Edge founding list";
  const body = `${greet}

Thanks for joining the Galaxy Sports Edge founding waitlist.

We ship complete surfaces or keep them dark — no half-built public promises.
You'll hear from us when something operator-reviewed is ready (newsletter,
podcast, board readiness). Until then, explore methodology, contests (free
paper skill), and proof tools at https://www.galaxysportsedge.com

— Galaxy Sports Edge
We detect. You decide.
`;
  return sendAlertEmail(to, subject, body, env);
}
