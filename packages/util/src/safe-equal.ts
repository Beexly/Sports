/**
 * Timing-safe secret comparison — pure Node crypto wrapper.
 *
 * Use for CRON_SECRET / bearer tokens. Do NOT use string === for secrets.
 * Monorepo SoT for HTTP: apps/web/lib/cron/authorize.ts (cronAuthError).
 * This module is the pure packet twin for unit tests and non-HTTP runners.
 */

import { timingSafeEqual } from "node:crypto";

/**
 * Compare two strings in constant time after equal-length check.
 * Length mismatch returns false without leaking which prefix matched
 * (length of expected is not secret for Bearer env tokens).
 */
export function safeEqualSecret(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (expected == null || expected.length === 0) return false;
  if (provided == null) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Compare full Authorization header value against `Bearer ${secret}`.
 * Matches monorepo cronAuthError buffer layout.
 */
export function safeEqualBearer(
  authorizationHeader: string | null | undefined,
  expectedSecret: string | null | undefined,
): boolean {
  if (expectedSecret == null || expectedSecret.length === 0) return false;
  const provided = Buffer.from(authorizationHeader ?? "");
  const expected = Buffer.from(`Bearer ${expectedSecret}`);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export type CronAuthCode =
  | "ok"
  | "cron_secret_unset"
  | "cron_unauthorized";

export function authorizeCronSecret(input: {
  providedSecret: string | null | undefined;
  expectedSecret: string | null | undefined;
}): { ok: boolean; code: CronAuthCode } {
  if (!input.expectedSecret) {
    return { ok: false, code: "cron_secret_unset" };
  }
  if (!safeEqualSecret(input.providedSecret, input.expectedSecret)) {
    return { ok: false, code: "cron_unauthorized" };
  }
  return { ok: true, code: "ok" };
}
