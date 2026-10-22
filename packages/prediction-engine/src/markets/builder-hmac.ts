/**
 * Builder HMAC headers.
 *
 * The unlicensed builder-signing-sdk was not copied. The same construction
 * is in the MIT py-sdk at
 * packages/polymarket-sdks/py-sdk/src/polymarket/_internal/hmac.py:
 * sign timestamp + method + path + body with the urlsafe-base64 secret.
 * Publish stays off. This does not place an order.
 */

import { createHmac } from "node:crypto";

export function builderHmacSignature(
  secret: string,
  timestamp: number,
  method: string,
  path: string,
  body?: string,
): string {
  if (!secret) throw new Error("builder secret is required");
  if (!Number.isInteger(timestamp) || timestamp < 0) throw new Error("timestamp must be a non-negative integer");
  const message = `${timestamp}${method}${path}${body ?? ""}`;
  const padded = secret + "=".repeat((4 - (secret.length % 4)) % 4);
  const raw = Buffer.from(padded, "base64url");
  return createHmac("sha256", raw).update(message).digest("base64").replace(/\+/g, "-").replace(/\//g, "_");
}
