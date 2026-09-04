/**
 * Optional waitlist welcome email via existing Resend channel.
 * Opt-in: WAITLIST_WELCOME_EMAIL=true + RESEND_API_KEY + ALERTS_EMAIL_FROM.
 * Never throws; never blocks lead durability.
 *
 * OPT-OUT IS NOT DECORATION — it is a promise already made at consent time.
 * The waitlist checkbox the lead ticks (`WAITLIST_COPY.consentLabel`, in
 * lib/gse/waitlist-copy.ts) reads "I can unsubscribe from non-essential
 * messages anytime." Until this email carried a route back out, the ONLY
 * message the list ever sends offered the recipient no way to exercise that.
 * The body below therefore names a real, staffed channel — SUPPORT_EMAIL from
 * lib/brand.ts, the same inbox the rest of the brand publishes — so the
 * consent promise has something behind it.
 *
 * KNOWN GAP, deliberately not papered over here: there is still no self-serve
 * one-click unsubscribe, no `List-Unsubscribe` header (sendAlertEmail takes
 * only to/subject/text), and no suppression state on the stored lead
 * (`StoredWaitlistLead` in lib/gse/waitlist-store.ts carries reviewStatus and
 * nothing else). Opt-out is therefore an operator-handled request today, not
 * an automated one. Building the self-serve path means a store change and is
 * an owner decision — see the audit's OWNER DECISIONS list.
 */
import { SUPPORT_EMAIL } from "@/lib/brand";
import {
  isEmailConfigured,
  sendAlertEmail,
  type EmailSendResult,
} from "@/lib/watchlist/channels/email-channel";

type Env = Record<string, string | undefined>;

export function isWaitlistWelcomeEmailEnabled(env: Env = process.env): boolean {
  return env["WAITLIST_WELCOME_EMAIL"] === "true" && isEmailConfigured(env);
}

export interface WaitlistWelcomeEmail {
  readonly subject: string;
  readonly body: string;
}

/**
 * Pure body builder — exported so the opt-out line can be asserted at RUNTIME.
 *
 * apps/web/tsconfig.json excludes `**\/*.test.ts`, so a type-level assertion in
 * a test file is never typechecked. The disclosure tests call this function and
 * read the returned string instead.
 */
export function buildWaitlistWelcomeEmail(name?: string): WaitlistWelcomeEmail {
  const trimmed = name?.trim();
  const greet = trimmed ? `Hi ${trimmed},` : "Hi,";
  return {
    subject: "You're on the Galaxy Sports Edge founding list",
    body: `${greet}

Thanks for joining the Galaxy Sports Edge founding waitlist.

We ship complete surfaces or keep them dark — no half-built public promises.
You'll hear from us when something operator-reviewed is ready (newsletter,
podcast, board readiness). Until then, explore methodology, contests (free
paper skill), and proof tools at https://www.galaxysportsedge.com

You are receiving this because you asked to join the founding waitlist at
galaxysportsedge.com. To unsubscribe and be removed from this list, reply to
this email or write to ${SUPPORT_EMAIL} and we will take you off it. You will
not be sent anything else in the meantime.

— Galaxy Sports Edge
We detect. You decide.
`,
  };
}

export async function sendWaitlistWelcomeEmail(
  to: string,
  opts: { name?: string; env?: Env } = {},
): Promise<EmailSendResult> {
  const env = opts.env ?? process.env;
  if (!isWaitlistWelcomeEmailEnabled(env)) {
    return { sent: false, detail: "not_configured", classification: "not_configured" };
  }
  const { subject, body } = buildWaitlistWelcomeEmail(opts.name);
  return sendAlertEmail(to, subject, body, env);
}
