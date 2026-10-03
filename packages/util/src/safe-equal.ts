/**
 * Timing-safe secret comparison — pure Node crypto wrapper.
 *
 * Use for CRON_SECRET / bearer tokens. Do NOT use string === for secrets.
 * Monorepo SoT for HTTP: apps/web/lib/cron/authorize.ts (cronAuthError).
 * This module is the pure packet twin for unit tests and non-HTTP runners.
 *
 * Dual-secret: accept primary OR previous during rotation (CRON_SECRET +
 * CRON_SECRET_PREVIOUS). Either match authorizes; both unset → refuse.
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

/**
 * Dual-secret bearer: true if header matches primary OR previous (rotation).
 * Empty previous is ignored. Empty primary with only previous still accepts previous.
 */
export function safeEqualBearerDual(
  authorizationHeader: string | null | undefined,
  primarySecret: string | null | undefined,
  previousSecret?: string | null | undefined,
): boolean {
  if (safeEqualBearer(authorizationHeader, primarySecret)) return true;
  if (
    previousSecret != null &&
    previousSecret.length > 0 &&
    safeEqualBearer(authorizationHeader, previousSecret)
  ) {
    return true;
  }
  return false;
}

export type CronAuthCode =
  | "ok"
  | "cron_secret_unset"
  | "cron_unauthorized";

export type CronAuthMatched = "primary" | "previous" | null;

export interface AuthorizeCronSecretInput {
  readonly providedSecret: string | null | undefined;
  /** Primary env: CRON_SECRET */
  readonly expectedSecret: string | null | undefined;
  /**
   * Optional rotation twin: CRON_SECRET_PREVIOUS.
   * When set, either primary or previous authorizes (timing-safe on each).
   */
  readonly previousSecret?: string | null | undefined;
}

export interface AuthorizeCronSecretResult {
  readonly ok: boolean;
  readonly code: CronAuthCode;
  /** Which secret matched when ok — null when refused. */
  readonly matched: CronAuthMatched;
}

/**
 * Pure cron secret check — dual-secret aware.
 * Refuse-default when neither primary nor previous is configured.
 */
export function authorizeCronSecret(
  input: AuthorizeCronSecretInput,
): AuthorizeCronSecretResult {
  const primary = input.expectedSecret;
  const previous = input.previousSecret;
  const hasPrimary = primary != null && primary.length > 0;
  const hasPrevious = previous != null && previous.length > 0;

  if (!hasPrimary && !hasPrevious) {
    return { ok: false, code: "cron_secret_unset", matched: null };
  }

  if (hasPrimary && safeEqualSecret(input.providedSecret, primary)) {
    return { ok: true, code: "ok", matched: "primary" };
  }
  if (hasPrevious && safeEqualSecret(input.providedSecret, previous)) {
    return { ok: true, code: "ok", matched: "previous" };
  }
  return { ok: false, code: "cron_unauthorized", matched: null };
}

/**
 * Extract raw secret from Authorization: Bearer <token> header.
 * Returns null when missing/malformed (never throws).
 */
export function extractBearerSecret(
  authorizationHeader: string | null | undefined,
): string | null {
  if (authorizationHeader == null || !authorizationHeader.trim()) return null;
  const m = /^Bearer\s+(\S+)\s*$/i.exec(authorizationHeader.trim());
  return m?.[1] ?? null;
}
