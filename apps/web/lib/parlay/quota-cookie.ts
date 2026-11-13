/**
 * Parlay X-Ray quota cookie — SERVER-ONLY signing/verification.
 *
 * The quota state (lib/parlay/quota.ts) travels in an httpOnly cookie so an
 * anonymous browser keeps its 1 free X-Ray + 3 email-unlocked X-Rays across
 * requests. The payload is HMAC-SHA256 signed: a client can delete the cookie
 * (which resets the free allowance — inherent to per-browser quotas) but
 * cannot edit the counter without the secret.
 *
 * Secret resolution mirrors lib/api/public-form-rate-limit.ts's pepper
 * fallback chain; the constant below is a local-dev fallback only.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import {
  initialQuotaState,
  parseQuotaState,
  serializeQuotaState,
  type XrayQuotaState,
} from "./quota";

export const XRAY_QUOTA_COOKIE = "pmri_xray_quota";
export const XRAY_QUOTA_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function cookieSecret(): string {
  return (
    process.env.PARLAY_MRI_COOKIE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "parlay-mri-local-dev-secret"
  );
}

function hmacPayload(payload: string): string {
  return createHmac("sha256", cookieSecret()).update(payload).digest("base64url");
}

/** state → "base64url(json).base64url(hmac)" */
export function signQuotaState(state: XrayQuotaState): string {
  const payload = Buffer.from(serializeQuotaState(state), "utf8").toString("base64url");
  return `${payload}.${hmacPayload(payload)}`;
}

/** Verify signature, then parse. Any failure → fresh initial state. */
export function verifyQuotaCookie(value: string | null | undefined): XrayQuotaState {
  if (!value) return initialQuotaState();
  const dot = value.lastIndexOf(".");
  if (dot <= 0 || dot === value.length - 1) return initialQuotaState();
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = hmacPayload(payload);
  const a = Buffer.from(signature, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return initialQuotaState();
  try {
    return parseQuotaState(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return initialQuotaState();
  }
}

/** Read + verify the quota cookie from a plain Request (no next/headers needed). */
export function readQuotaStateFromRequest(req: Request): XrayQuotaState {
  const header = req.headers.get("cookie");
  if (!header) return initialQuotaState();
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === XRAY_QUOTA_COOKIE) {
      let raw = part.slice(eq + 1).trim();
      try {
        raw = decodeURIComponent(raw);
      } catch {
        // keep raw value; verification will fail closed
      }
      return verifyQuotaCookie(raw);
    }
  }
  return initialQuotaState();
}

export const xrayQuotaCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: XRAY_QUOTA_COOKIE_MAX_AGE_SECONDS,
};