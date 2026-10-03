/**
 * Push subscriptions — request input validation.
 *
 * Pure module (zod schemas only — no DB, no auth), mirroring
 * apps/web/lib/watchlist/validation.ts's shape. The shape validated here is
 * exactly what the browser's `PushSubscription.toJSON()` produces:
 * `{ endpoint, keys: { p256dh, auth } }` — the W3C Push API's standard
 * subscription JSON, unchanged, never re-derived.
 */

import { z } from "zod";

// Push service endpoints (FCM/Mozilla/etc.) are long opaque URLs; 2048 is
// generous headroom without being unbounded input.
const ENDPOINT_MAX_LEN = 2048;
// p256dh/auth are base64url-encoded key material — bounded well above any
// real browser's output (p256dh ~87 chars, auth ~22 chars) without being
// unbounded.
const KEY_MAX_LEN = 512;

export const PushSubscriptionInputSchema = z.object({
  endpoint: z.string().trim().url("endpoint must be a valid URL").max(ENDPOINT_MAX_LEN),
  keys: z.object({
    p256dh: z.string().trim().min(1, "keys.p256dh is required").max(KEY_MAX_LEN),
    auth: z.string().trim().min(1, "keys.auth is required").max(KEY_MAX_LEN),
  }),
});

export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInputSchema>;

export const PushUnsubscribeInputSchema = z.object({
  endpoint: z.string().trim().url("endpoint must be a valid URL").max(ENDPOINT_MAX_LEN),
});

export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeInputSchema>;

export interface ValidationOk<T> {
  readonly success: true;
  readonly data: T;
}
export interface ValidationErr {
  readonly success: false;
  readonly errors: string[];
}

function toErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`);
}

/** Parses + validates an untrusted request body into a push subscription.
 *  Never throws — always returns a discriminated result. */
export function parsePushSubscriptionInput(
  body: unknown,
): ValidationOk<PushSubscriptionInput> | ValidationErr {
  const result = PushSubscriptionInputSchema.safeParse(body);
  if (!result.success) return { success: false, errors: toErrors(result.error) };
  return { success: true, data: result.data };
}

/** Parses + validates an untrusted unsubscribe request body. Never throws. */
export function parsePushUnsubscribeInput(
  body: unknown,
): ValidationOk<PushUnsubscribeInput> | ValidationErr {
  const result = PushUnsubscribeInputSchema.safeParse(body);
  if (!result.success) return { success: false, errors: toErrors(result.error) };
  return { success: true, data: result.data };
}
