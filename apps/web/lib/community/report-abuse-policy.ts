/**
 * Moderation-report abuse policy — quota dimensions, server-derived source
 * fingerprints, and payload dedup (directive 4.1).
 *
 * TRUST MODEL
 * -----------
 * The rate-limit key for ANONYMOUS reports is derived SERVER-SIDE from
 * trusted request facts (the platform-set client IP), HMAC'd with the server
 * secret MODERATION_REPORT_HMAC_SECRET. The client cannot supply, choose, or
 * rotate its own fingerprint: the request contract has no fingerprint field
 * and unknown fields are rejected. The raw IP is used ONLY as HMAC input in
 * memory — it is never persisted, never logged, and never part of any stored
 * key (rate_limit_counters stores only the HMAC digest).
 *
 * QUOTA DIMENSIONS (all durable, all atomic — see durable-rate-limiter.ts)
 * -----------------------------------------------------------------------
 *   1. per-source   — ANONYMOUS_REPORT_LIMITS.perSourcePerHour per HMAC'd
 *                     source fingerprint (primary anti-flood).
 *   2. per-target   — perTargetPerHour per reported user id, across ALL
 *                     sources (anti-brigading: N sources cannot bury one user).
 *   3. payload-dedup— payloadDedupPerDay per (source, canonical payload):
 *                     the same source resubmitting an identical report is
 *                     deduplicated for 24h. Scoped per-source on purpose so
 *                     independent corroborating reports from other sources are
 *                     NOT suppressed.
 *   4. global       — globalPerHour across the whole surface (blast-radius
 *                     ceiling for distributed floods).
 * Checks run in that order and each check consumes only its own counter. A
 * request denied at dimension N has still consumed dimensions 1..N-1 for this
 * window — acceptable, because only over-quota traffic ever reaches a denial.
 *
 * AUTHENTICATED reports also get a smaller per-user abuse limit
 * (AUTHENTICATED_REPORT_LIMITS.perUserPerHour) keyed by the TRUSTED session
 * subject id (directive 4.1.9).
 *
 * RETENTION / PRIVACY
 * -------------------
 * Counters expire with their windows and are pruned within
 * RATE_COUNTER_MAX_RETENTION_MS (48h) — see durable-rate-limiter.ts. No stored
 * dimension can be reversed to an IP without the server secret.
 */
import { createHmac } from "node:crypto";

import type { DurableRateLimiter } from "./durable-rate-limiter";

/** Thrown when any report quota is exceeded. Maps to HTTP 429. */
export class ReportRateLimitedError extends Error {
  readonly code = "REPORT_RATE_LIMITED" as const;
  constructor(
    /** Milliseconds until the exhausted window resets. */
    readonly retryAfterMs: number,
    message = "Too many reports from this source. Try again later."
  ) {
    super(message);
    this.name = "ReportRateLimitedError";
  }
}

export const ANONYMOUS_REPORT_LIMITS = {
  perSourcePerHour: 5,
  perTargetPerHour: 10,
  globalPerHour: 120,
  payloadDedupPerDay: 1,
} as const;

export const AUTHENTICATED_REPORT_LIMITS = {
  /** Smaller per-user abuse cap for authenticated reports (directive 4.1.9). */
  perUserPerHour: 10,
} as const;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Minimum acceptable HMAC secret length; shorter is a config failure. */
export const MIN_HMAC_SECRET_LENGTH = 16;

/**
 * HMAC-SHA256 of the platform-observed source IP under the server secret.
 * Deliberately excludes attacker-controlled headers (user-agent etc.): mixing
 * them in would let a single source rotate fingerprints. v1 prefix allows
 * future rotation of the derivation without colliding buckets.
 */
export function deriveAnonymousSourceFingerprint(sourceIp: string, secret: string): string {
  return createHmac("sha256", secret).update(`anon-report-source:v1:${sourceIp}`).digest("hex");
}

export interface AnonymousReportPayload {
  readonly targetUserId: string;
  readonly contentRef: string;
  readonly surface: string;
  readonly reason: string;
  readonly notes: string | null;
}

/**
 * Canonical dedup key for one (source, payload) pair. NUL-joined so field
 * boundaries cannot be forged by embedding delimiters in values.
 */
export function derivePayloadDedupKey(
  sourceFingerprint: string,
  payload: AnonymousReportPayload,
  secret: string
): string {
  const canonical = [
    sourceFingerprint,
    payload.targetUserId,
    payload.contentRef,
    payload.surface,
    payload.reason,
    (payload.notes ?? "").trim(),
  ].join("\u0000");
  return createHmac("sha256", secret).update(`anon-report-payload:v1:${canonical}`).digest("hex");
}

export interface AnonymousReportQuotaInput {
  readonly sourceFingerprint: string;
  readonly targetUserId: string;
  readonly payloadDedupKey: string;
  readonly now?: Date;
}

/**
 * Enforces all four anonymous-report quota dimensions. Throws
 * ReportRateLimitedError on the first exceeded dimension;
 * RateLimitStoreUnavailableError propagates from the limiter (fail closed).
 */
export async function checkAnonymousReportQuotas(
  limiter: DurableRateLimiter,
  input: AnonymousReportQuotaInput
): Promise<void> {
  const now = input.now ?? new Date();
  const checks = [
    {
      scope: "anon-report:source",
      key: input.sourceFingerprint,
      limit: ANONYMOUS_REPORT_LIMITS.perSourcePerHour,
      windowMs: HOUR_MS,
    },
    {
      scope: "anon-report:target",
      key: input.targetUserId,
      limit: ANONYMOUS_REPORT_LIMITS.perTargetPerHour,
      windowMs: HOUR_MS,
    },
    {
      scope: "anon-report:payload",
      key: input.payloadDedupKey,
      limit: ANONYMOUS_REPORT_LIMITS.payloadDedupPerDay,
      windowMs: DAY_MS,
    },
    {
      scope: "anon-report:global",
      key: "global",
      limit: ANONYMOUS_REPORT_LIMITS.globalPerHour,
      windowMs: HOUR_MS,
    },
  ] as const;

  for (const check of checks) {
    const decision = await limiter.consume({ ...check, now });
    if (!decision.allowed) {
      // Deliberately generic message: which dimension tripped is not disclosed
      // to an anonymous caller (it would help an attacker tune a flood).
      throw new ReportRateLimitedError(decision.retryAfterMs);
    }
  }
}

/**
 * Smaller per-user abuse limit for AUTHENTICATED reports, keyed by the trusted
 * session subject id (never a caller-supplied id). Same fail-closed contract.
 */
export async function checkAuthenticatedReportQuota(
  limiter: DurableRateLimiter,
  subjectId: string,
  now?: Date
): Promise<void> {
  const decision = await limiter.consume({
    scope: "auth-report:user",
    key: subjectId,
    limit: AUTHENTICATED_REPORT_LIMITS.perUserPerHour,
    windowMs: HOUR_MS,
    now: now ?? new Date(),
  });
  if (!decision.allowed) {
    throw new ReportRateLimitedError(
      decision.retryAfterMs,
      "You are filing reports too quickly. Try again later."
    );
  }
}
