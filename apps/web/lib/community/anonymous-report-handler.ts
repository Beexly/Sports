/**
 * Anonymous moderation report — route-handler core (directive 4.1).
 *
 * WHY A ROUTE HANDLER, NOT A SERVER ACTION
 * ----------------------------------------
 * `fileAnonymousReport` used to be a network-invokable "use server" action
 * that trusted a caller-supplied `clientFingerprint` for rate limiting — a
 * caller could rotate fingerprints at will, and the in-memory limiter reset on
 * every cold start. Anonymous reporting is now OFF the RPC surface entirely:
 * this dedicated handler derives the rate-limit key server-side from trusted
 * request facts and enforces durable, atomic, cross-instance quotas.
 *
 * DECISION LADDER (each step fails closed)
 * ----------------------------------------
 *   1. Feature gate     — ANONYMOUS_MODERATION_REPORTS_ENABLED !== "true"
 *                         → 404 (default OFF; existence not advertised).
 *   2. Body validation  — strict schema; unknown fields (including any
 *                         client-supplied fingerprint) → 400.
 *   3. Source identity  — deployment-aware, fail closed:
 *                         on Vercel (VERCEL env set) the platform OVERWRITES
 *                         x-real-ip / x-forwarded-for, so x-real-ip (else the
 *                         XFF first hop) is trusted; OFF Vercel those headers
 *                         follow append semantics (the first hop is
 *                         attacker-supplied), so NOTHING is trusted unless ops
 *                         explicitly names the proxy-set header via
 *                         MODERATION_REPORT_TRUSTED_IP_HEADER (for
 *                         x-forwarded-for the LAST hop — the one appended by
 *                         the nearest trusted proxy — is used).
 *                         No derivable trusted source → 400 (an unattributable
 *                         anonymous report cannot be rate-limited).
 *   4. Server secret    — MODERATION_REPORT_HMAC_SECRET missing/short → 503
 *                         (config failure; never a hardcoded fallback).
 *   5. Durable limiter  — none available → 503; in production a non-durable
 *                         (in-memory) limiter is REJECTED → 503, never a
 *                         silent fallback.
 *   6. Quotas           — per-source / per-target / payload-dedup / global
 *                         → 429 with Retry-After; store failure → 503.
 *   7. Persist          — reporterUserId is ALWAYS null; raw IP is never
 *                         persisted or logged. Failure → 503.
 *   8. Success          — 202 { accepted: true }; the report id is NOT
 *                         disclosed to the anonymous caller.
 *
 * The exported factory takes injected deps so tests can drive every branch;
 * the route file wires the production deps exactly once.
 */
import { NextResponse } from "next/server";
import { ModerationReasonCode } from "@prisma/client";
import { z } from "zod";

import type { DurableRateLimiter } from "./durable-rate-limiter";
import { RateLimitStoreUnavailableError } from "./durable-rate-limiter";
import {
  MIN_HMAC_SECRET_LENGTH,
  ReportRateLimitedError,
  checkAnonymousReportQuotas,
  deriveAnonymousSourceFingerprint,
  derivePayloadDedupKey,
} from "./report-abuse-policy";

// ─── Request contract ─────────────────────────────────────────────────────────

/**
 * Strict: unknown fields are rejected, so a client-supplied fingerprint (or
 * any other identity claim) is a 400, not a silently ignored hint.
 */
const anonymousReportBodySchema = z
  .object({
    targetUserId: z.string().min(1).max(200),
    contentRef: z.string().min(1).max(500),
    surface: z.string().min(1).max(120),
    reason: z.nativeEnum(ModerationReasonCode),
    notes: z.string().max(2000).optional(),
  })
  .strict();

export type AnonymousReportBody = z.infer<typeof anonymousReportBodySchema>;

export interface AnonymousReportPersistInput {
  readonly targetUserId: string;
  readonly contentRef: string;
  readonly surface: string;
  readonly reason: ModerationReasonCode;
  readonly notes: string | null;
}

export interface AnonymousReportHandlerDeps {
  /** Environment view (process.env in production wiring). */
  readonly env: Readonly<Record<string, string | undefined>>;
  /**
   * Resolves the durable limiter, or null when no durable store is available
   * (stub DB). Null → 503. In production a returned limiter with
   * durable=false is also rejected (belt and braces).
   */
  readonly resolveLimiter: () => DurableRateLimiter | null;
  /** Persists the report row. reporterUserId is fixed to null by the caller. */
  readonly persistReport: (input: AnonymousReportPersistInput) => Promise<void>;
  /** Injectable clock for deterministic window tests. */
  readonly now?: () => Date;
}

// ─── Source-identity derivation (trusted request facts only) ──────────────────

/**
 * Platform-observed client IP — the deployment assumption is ENFORCED, not
 * assumed (previously a comment said "revisit if self-hosting"; now the code
 * does):
 *
 *   - ON VERCEL (`VERCEL` env var set, as the platform always does): the edge
 *     OVERWRITES `x-real-ip` and `x-forwarded-for`, so `x-real-ip` (else the
 *     XFF FIRST hop) is platform truth and cannot be client-spoofed.
 *   - OFF VERCEL: standard proxies APPEND to `x-forwarded-for`, which makes
 *     the first hop attacker-supplied (one source could rotate fingerprints
 *     per request and bypass the per-source quota). Therefore NO header is
 *     trusted unless ops explicitly declares which header their own proxy
 *     sets, via `MODERATION_REPORT_TRUSTED_IP_HEADER`:
 *       - `x-forwarded-for` → the LAST hop is used (the value appended by the
 *         nearest trusted proxy);
 *       - any other named header (e.g. `x-real-ip` overwritten by nginx) →
 *         its value verbatim.
 *     Unconfigured self-hosting returns null → the route fails closed (400)
 *     instead of silently weakening the primary anti-flood dimension.
 *
 * Nothing here ever reads a client-declared fingerprint.
 */
export function deriveTrustedSourceIp(
  request: Request,
  env: Readonly<Record<string, string | undefined>>
): string | null {
  const onVercel = Boolean(env["VERCEL"]?.trim());
  if (onVercel) {
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp) return realIp;
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const firstHop = forwarded.split(",")[0]?.trim();
      if (firstHop) return firstHop;
    }
    return null;
  }

  // Off-Vercel: only a header the operator explicitly vouches for.
  const trustedHeaderName = env["MODERATION_REPORT_TRUSTED_IP_HEADER"]?.trim().toLowerCase();
  if (!trustedHeaderName) return null;
  const value = request.headers.get(trustedHeaderName);
  if (!value) return null;
  if (trustedHeaderName === "x-forwarded-for") {
    // Append semantics: the LAST hop is the one the trusted proxy added.
    const hops = value.split(",");
    const lastHop = hops[hops.length - 1]?.trim();
    return lastHop || null;
  }
  const verbatim = value.trim();
  return verbatim || null;
}

// ─── Handler factory ──────────────────────────────────────────────────────────

function json(status: number, body: Record<string, unknown>, headers?: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

export function createAnonymousReportHandler(
  deps: AnonymousReportHandlerDeps
): (request: Request) => Promise<Response> {
  return async function handleAnonymousReport(request: Request): Promise<Response> {
    // 1. Feature gate — default OFF, exact-match opt-in.
    if (deps.env["ANONYMOUS_MODERATION_REPORTS_ENABLED"] !== "true") {
      return json(404, { error: "Not found." });
    }

    // 2. Strict body validation.
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return json(400, { error: "Request body must be JSON." });
    }
    const parsed = anonymousReportBodySchema.safeParse(raw);
    if (!parsed.success) {
      return json(400, { error: "Invalid report payload." });
    }
    const body = parsed.data;

    // 3. Server-derived source identity (never caller-supplied).
    const sourceIp = deriveTrustedSourceIp(request, deps.env);
    if (!sourceIp) {
      // Unattributable anonymous traffic cannot be rate-limited → fail closed.
      return json(400, { error: "Request source could not be determined." });
    }

    // 4. Server secret — env only, never a literal fallback.
    const secret = deps.env["MODERATION_REPORT_HMAC_SECRET"];
    if (!secret || secret.length < MIN_HMAC_SECRET_LENGTH) {
      return json(503, { error: "Anonymous reporting is temporarily unavailable." });
    }

    // 5. Durable limiter — fail closed, never in-memory in production.
    const limiter = deps.resolveLimiter();
    const isProduction = deps.env["NODE_ENV"] === "production";
    if (!limiter || (isProduction && !limiter.durable)) {
      return json(503, { error: "Anonymous reporting is temporarily unavailable." });
    }

    // 6. Quotas (atomic, durable, cross-instance).
    const now = deps.now ? deps.now() : new Date();
    const sourceFingerprint = deriveAnonymousSourceFingerprint(sourceIp, secret);
    const payloadDedupKey = derivePayloadDedupKey(
      sourceFingerprint,
      {
        targetUserId: body.targetUserId,
        contentRef: body.contentRef,
        surface: body.surface,
        reason: body.reason,
        notes: body.notes ?? null,
      },
      secret
    );
    try {
      await checkAnonymousReportQuotas(limiter, {
        sourceFingerprint,
        targetUserId: body.targetUserId,
        payloadDedupKey,
        now,
      });
    } catch (err) {
      if (err instanceof ReportRateLimitedError) {
        return json(
          429,
          { error: "Too many reports. Try again later." },
          { "Retry-After": String(Math.max(1, Math.ceil(err.retryAfterMs / 1000))) }
        );
      }
      if (err instanceof RateLimitStoreUnavailableError) {
        return json(503, { error: "Anonymous reporting is temporarily unavailable." });
      }
      throw err;
    }

    // 7. Persist — reporter identity is ALWAYS null on this path.
    try {
      await deps.persistReport({
        targetUserId: body.targetUserId,
        contentRef: body.contentRef,
        surface: body.surface,
        reason: body.reason,
        notes: body.notes ?? null,
      });
    } catch {
      // No cause detail to the anonymous caller; nothing sensitive logged.
      return json(503, { error: "Anonymous reporting is temporarily unavailable." });
    }

    // 8. Accepted — no report id disclosed.
    return json(202, { accepted: true });
  };
}
