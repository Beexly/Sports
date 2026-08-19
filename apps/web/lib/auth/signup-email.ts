import { sendAlertEmail } from "@/lib/watchlist/channels/email-channel";

type SignupEmailKind = "welcome" | "onboarding";

const SIGNUP_EMAIL_CONTENT: Record<SignupEmailKind, { subject: string; body: string }> = {
  welcome: {
    subject: "Welcome to Galaxy Sports Edge",
    body: "Hi,\n\nWelcome to Galaxy Sports Edge.\n\n— Galaxy Sports Edge",
  },
  onboarding: {
    subject: "Getting started with Galaxy Sports Edge",
    body: "Hi,\n\nYou're all set. Visit your dashboard to get started.\n\n— Galaxy Sports Edge",
  },
};

export async function sendSignupEmail(to: string, kind: SignupEmailKind): Promise<void> {
  const content = SIGNUP_EMAIL_CONTENT[kind];
  const result = await sendAlertEmail(to, content.subject, content.body);
  if (!result.sent && result.detail === "not_configured") {
    console.warn(`[signup-email] email channel not configured; skipped ${kind} email to ${to}.`);
    return;
  }
  if (!result.sent) {
    throw new Error(
      `Signup ${kind} email send failed (detail=${result.detail}, classification=${result.classification}).`,
    );
  }
}
