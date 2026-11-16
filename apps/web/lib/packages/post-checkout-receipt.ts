import { SITE_URL } from "@/lib/seo/site-url";

export interface PostCheckoutReceiptInput {
  readonly email: string | null | undefined;
  readonly packageSlug: string;
  readonly sessionId: string;
  readonly amountCents: number;
}

export interface PostCheckoutReceiptResult {
  readonly delivered: boolean;
  readonly channel: "resend" | "noop";
  readonly unlockUrl: string;
}

/**
 * Builds the buyer's direct unlock URL and best-effort sends an access receipt
 * when RESEND_API_KEY is configured. Never throws so Stripe webhook processing
 * stays reliable.
 */
export function buildPackageUnlockUrl(packageSlug: string, sessionId: string): string {
  const safeSlug = encodeURIComponent(packageSlug || "sunday-nfl-5pct-slate");
  const safeSession = encodeURIComponent(sessionId);
  return `${SITE_URL}/packages/${safeSlug}?session_id=${safeSession}`;
}

export async function sendPostCheckoutUnlockReceipt(
  input: PostCheckoutReceiptInput,
): Promise<PostCheckoutReceiptResult> {
  const unlockUrl = buildPackageUnlockUrl(input.packageSlug, input.sessionId);
  const email = (input.email ?? "").trim();
  const resendKey = (process.env.RESEND_API_KEY ?? "").trim();

  if (!email || !resendKey) {
    return { delivered: false, channel: "noop", unlockUrl };
  }

  const fromAddress = (process.env.EMAIL_FROM ?? "Galaxy Sports Edge <receipts@galaxysportsedge.com>").trim();
  const amountDollars = (Math.max(0, input.amountCents) / 100).toFixed(2);

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: `Your Galaxy Sports Edge Pack Is Unlocked (${input.packageSlug})`,
        text: [
          `Thank you for your Galaxy Sports Edge purchase ($${amountDollars}).`,
          "",
          `Open your unlocked Call-Sheet Tickets directly using your verified session link:`,
          unlockUrl,
          "",
          `If you sign in with this same email address (${email}), your account entitlements sync automatically across /picks, /board, and /fantasy/dfs.`,
        ].join("\n"),
      }),
    });
    return { delivered: resp.ok, channel: "resend", unlockUrl };
  } catch {
    return { delivered: false, channel: "resend", unlockUrl };
  }
}
