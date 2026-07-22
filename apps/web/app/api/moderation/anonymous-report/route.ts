/**
 * POST /api/moderation/anonymous-report — the ONLY entry point for anonymous
 * moderation reports (directive 4.1).
 *
 * Anonymous reporting is deliberately NOT a "use server" action: the rate-limit
 * key must be derived from trusted request facts by this route's server, never
 * accepted from the caller. All policy lives in
 * lib/community/anonymous-report-handler.ts (decision ladder documented there);
 * this file wires the production dependencies exactly once:
 *   - env            → process.env (feature gate ANONYMOUS_MODERATION_REPORTS_ENABLED,
 *                      secret MODERATION_REPORT_HMAC_SECRET — env only, no literals);
 *   - limiter        → atomic Postgres-backed DurableRateLimiter over @sports/db.
 *                      Stub DB → null → 503 in EVERY environment: the stub
 *                      client silently no-ops writes, so "accepting" a report
 *                      there would both skip rate limiting and drop the report
 *                      while pretending success. (The in-memory limiter exists
 *                      for tests/dev harnesses only and is refused in
 *                      production by the handler and by its own constructor.)
 *   - persistReport  → moderation_reports insert with reporterUserId ALWAYS null.
 */
import { db, isStubMode } from "@sports/db";

import {
  createAnonymousReportHandler,
  type AnonymousReportPersistInput,
} from "@/lib/community/anonymous-report-handler";
import {
  PostgresDurableRateLimiter,
  type DurableRateLimiter,
} from "@/lib/community/durable-rate-limiter";

export const dynamic = "force-dynamic";

function resolveLimiter(): DurableRateLimiter | null {
  if (isStubMode()) {
    // No durable store (and no durable report persistence either) → the
    // handler fails closed with 503 rather than pretending to accept.
    return null;
  }
  return new PostgresDurableRateLimiter(db);
}

async function persistReport(input: AnonymousReportPersistInput): Promise<void> {
  await db.moderationReport.create({
    data: {
      reporterUserId: null,
      reporterActorType: null,
      targetUserId: input.targetUserId,
      contentRef: input.contentRef,
      surface: input.surface,
      reason: input.reason,
      notes: input.notes,
      status: "OPEN",
    },
  });
}

export const POST = createAnonymousReportHandler({
  env: process.env,
  resolveLimiter,
  persistReport,
});
