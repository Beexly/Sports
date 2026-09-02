#!/usr/bin/env npx tsx
/**
 * Elite alert channels — operator smoke (no database, no invented data).
 *
 * The graded-pick alert path (apps/web/lib/watchlist/alert-dispatch.ts) had unit
 * tests but nothing an operator could run before a slate to prove that Resend
 * and Web Push are actually configured in the environment they are about to
 * rely on. This script:
 *
 *   1. Reports the three gates exactly as the dispatcher evaluates them:
 *      WATCHLIST_ALERTS_ENABLED, email channel configured, web-push configured.
 *   2. With `--send --to you@example.com`, sends ONE email through the real
 *      channel with a body that says it is a smoke test. Never sends without
 *      both flags; never touches push subscriptions (those live in the DB and
 *      belong to real users).
 *
 * Run:
 *   npm run ops:alert-smoke
 *   npm run ops:alert-smoke -- --send --to you@example.com
 *   (env comes from the shell; never paste secrets into the command line of a
 *    shared terminal — export them first)
 *
 * Exit 0 when every channel the founder has turned on is configured; exit 1
 * when WATCHLIST_ALERTS_ENABLED=true but no channel can deliver, or when a
 * requested send fails.
 */
import { isWatchlistAlertsEnabled } from "../../apps/web/lib/watchlist/alert-dispatch";
import { isEmailConfigured, sendAlertEmail } from "../../apps/web/lib/watchlist/channels/email-channel";
import { isWebPushConfigured } from "../../apps/web/lib/watchlist/channels/web-push-channel";

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const toIdx = args.indexOf("--to");
  const to = toIdx >= 0 ? args[toIdx + 1] : undefined;

  const enabled = isWatchlistAlertsEnabled();
  const email = isEmailConfigured();
  const push = isWebPushConfigured();

  console.log("[alert-smoke] WATCHLIST_ALERTS_ENABLED:", enabled ? "true (alerts dispatch)" : "not true (dispatcher returns outcome=disabled)");
  console.log("[alert-smoke] email channel (RESEND_API_KEY + ALERTS_EMAIL_FROM):", email ? "configured" : "NOT configured (channel no-ops with detail=not_configured)");
  console.log("[alert-smoke] web push (VAPID_PRIVATE_KEY + VAPID_SUBJECT + NEXT_PUBLIC_VAPID_PUBLIC_KEY):", push ? "configured" : "NOT configured (channel no-ops with detail=not_configured)");

  let exitCode = 0;
  if (enabled && !email && !push) {
    console.log("[alert-smoke] FAIL: alerts are enabled but neither channel can deliver; Elite alerts would queue as retryable and never arrive.");
    exitCode = 1;
  } else if (!enabled) {
    console.log("[alert-smoke] alerts are off; nothing is delivered regardless of channel config (founder flips WATCHLIST_ALERTS_ENABLED=true).");
  }

  if (send) {
    if (!to || !to.includes("@")) {
      console.log("[alert-smoke] --send requires --to <email>");
      return 1;
    }
    if (!email) {
      console.log("[alert-smoke] --send requested but the email channel is not configured; nothing sent.");
      return 1;
    }
    const stamp = new Date().toISOString();
    const result = await sendAlertEmail(
      to,
      "Galaxy Sports Edge alert channel smoke test",
      `This is an operator smoke test of the graded-pick alert email channel sent at ${stamp}. ` +
        "It carries no pick, no result and no statistic. If you received it, the Resend channel is live.",
    );
    console.log("[alert-smoke] send result:", JSON.stringify(result));
    if (!result.sent) exitCode = 1;
  }

  return exitCode;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error("[alert-smoke] failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
