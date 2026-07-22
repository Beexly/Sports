/**
 * Web Push channel — free, no-vendor-account transport for watchlist
 * alerts (VAPID, Web Push protocol / RFC 8291). Half of the Elite
 * "real-time email & push alerts" feature (see CLAUDE.md's tier table);
 * the other half is channels/email-channel.ts.
 *
 * Fail-isolated by construction, mirroring the try/catch discipline in
 * apps/web/lib/watchlist/alert-dispatch.ts and
 * packages/ingestion-pipeline/src/owner-alert.ts: `sendWebPushAlert` NEVER
 * throws. It honestly no-ops with `{ sent: false, detail: "not_configured" }`
 * when `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
 * are not all set — so a partially-configured deploy degrades gracefully
 * instead of crashing the caller's fan-out.
 *
 * The public VAPID key is intentionally read from the `NEXT_PUBLIC_*` env
 * var: it is the SAME value the client subscribes with
 * (apps/web/lib/push/use-push-subscription.ts) and the server signs with —
 * they must always match or every push send fails with an auth error. A
 * `NEXT_PUBLIC_` var is still a normal server-side env var at runtime (the
 * prefix only additionally inlines it into the client bundle), so reading
 * it here is correct, not a client/server mixup.
 */

import webPush from "web-push";

export interface WebPushSubscriptionInput {
  readonly endpoint: string;
  readonly p256dh: string;
  readonly auth: string;
}

export interface WebPushAlertPayload {
  readonly title: string;
  readonly body: string;
  /** Optional deep link the service worker opens on notification click. */
  readonly url?: string;
}

export type WebPushSendDetail = "sent" | "not_configured" | "send_failed";

export interface WebPushSendResult {
  readonly sent: boolean;
  readonly detail: WebPushSendDetail;
}

type PushEnv = Record<string, string | undefined>;

/** True only when every VAPID env var this channel needs is set. Exported
 *  so alert-dispatch.ts can distinguish "not configured at all" from
 *  "configured but this recipient has no subscriptions" without
 *  re-deriving the same three-var check. */
export function isWebPushConfigured(env: PushEnv = process.env): boolean {
  return Boolean(
    env["VAPID_PRIVATE_KEY"] && env["VAPID_SUBJECT"] && env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"],
  );
}

/**
 * Sends one Web Push notification to one stored subscription. Never
 * throws — every failure (missing config, an expired/invalid subscription,
 * a push-service error) resolves to `sent: false` with an honest `detail`.
 */
export async function sendWebPushAlert(
  subscription: WebPushSubscriptionInput,
  payload: WebPushAlertPayload,
  env: PushEnv = process.env,
): Promise<WebPushSendResult> {
  try {
    if (!isWebPushConfigured(env)) {
      return { sent: false, detail: "not_configured" };
    }

    webPush.setVapidDetails(
      env["VAPID_SUBJECT"] as string,
      env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"] as string,
      env["VAPID_PRIVATE_KEY"] as string,
    );

    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );

    return { sent: true, detail: "sent" };
  } catch {
    // Covers: push-service rejection (expired/invalid subscription, 4xx/5xx),
    // network failure, or a malformed subscription. The caller (dispatch
    // fan-out) treats every non-sent subscription the same way — it never
    // blocks the rest of the fan-out or the settlement job that triggered it.
    return { sent: false, detail: "send_failed" };
  }
}
