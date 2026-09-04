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

/**
 * Fire-and-forget owner notification. Resolves true only on confirmed send.
 *
 * WHY THIS LOGS. `false` used to be returned in total silence, and the sole
 * caller (`processSport`'s failure path) discards it — so a CONFIGURED but
 * BROKEN channel was completely undetectable. A rotated bot token (401), a
 * mistyped TELEGRAM_CHAT_ID (400 "chat not found"), a bot the owner blocked
 * (403), a rate limit (429) or a network timeout all looked identical to a
 * healthy send: ingestion failed, the failure was logged locally, and the phone
 * ping that is supposed to be the escalation simply never arrived. Nothing else
 * in the system watches this channel, so this function is the only place the
 * truth exists.
 *
 * The un-configured case (no token / no chat id) stays silent on purpose: that
 * is the documented ship-dark default, not a fault.
 *
 * NEVER log the request URL — it embeds TELEGRAM_BOT_TOKEN. Status codes and
 * exception messages only.
 */
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
    if (!res.ok) {
      console.warn(
        `[owner-alert] Telegram REJECTED the alert: HTTP ${res.status} ${res.statusText}. ` +
          "The owner was NOT notified — check TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID " +
          "(401 = bad token, 400 = bad chat id, 403 = bot blocked, 429 = rate limited).",
      );
    }
    return res.ok;
  } catch (err) {
    // Alerting must never take the pipeline down with it — but it must not be
    // invisible either.
    console.warn(
      `[owner-alert] Telegram send FAILED: ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}. ` +
        `The owner was NOT notified (timeout is ${ALERT_TIMEOUT_MS}ms).`,
    );
    return false;
  }
}
