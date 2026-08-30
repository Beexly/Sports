/**
 * Owner alerting — a free Telegram ping when the data pipeline fails.
 *
 * The cockpit surfaces ingestion failures, but only when the owner looks at
 * it. This pushes the failure to his phone the minute it happens, using
 * Telegram's free bot API (no Twilio bill, no email deliverability fight).
 *
 * Fail-safe by construction:
 *   - Complete no-op unless BOTH TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are
 *     set (ships dark; zero behavior change until the owner creates a bot via
 *     @BotFather and sets the two env vars).
 *   - NEVER throws and never blocks the pipeline: alerting failures are
 *     swallowed after a short timeout. A broken alert channel must not break
 *     ingestion itself.
 *   - Sends plain text only. No secrets, no user data — just the same error
 *     string the ingestion run already stores.
 */

const ALERT_TIMEOUT_MS = 5_000;

export function ownerAlertsConfigured(): boolean {
  return Boolean(
    process.env["TELEGRAM_BOT_TOKEN"] && process.env["TELEGRAM_CHAT_ID"],
  );
}

/** Fire-and-forget owner notification. Resolves true only on confirmed send. */
export async function notifyOwner(message: string): Promise<boolean> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !chatId) return false;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message.slice(0, 3800), // Telegram caps at 4096; leave headroom
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
      },
    );
    return res.ok;
  } catch {
    // Alerting must never take the pipeline down with it.
    return false;
  }
}
