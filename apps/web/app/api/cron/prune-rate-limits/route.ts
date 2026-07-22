/**
 * Vercel cron — prune expired rate-limit counters (directive 4.1 retention).
 *
 * This route makes the 48h retention bound on `rate_limit_counters` ENFORCED
 * rather than merely documented: `pruneExpiredRateLimitCounters` previously
 * had zero production callers, so the table would have grown without bound
 * until an unscheduled ops step landed. The schedule is declared in
 * `vercel.json` at the repo root (daily, 06:30 UTC).
 *
 * Authorization + identity:
 *   - the request must carry `Authorization: Bearer <CRON_SECRET>` (verified
 *     constant-time by lib/cron/authorize) — 401 otherwise;
 *   - the prune runs under the governed SYSTEM principal
 *     "system:rate-limit-retention" scoped to "moderation:prune-rate-limits",
 *     resolved via resolveServiceActor with a CRON_BEARER credential context
 *     minted AT the point of verification (never from the request body);
 *   - an immutable ActorReceipt is persisted before the prune, so the
 *     retention sweep is attributable in the audit store.
 *
 * Fail-closed: stub DB, receipt failure, or store failure → 503. A failed
 * prune is safe to retry on the next scheduled run (DELETE below a cutoff is
 * idempotent).
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { db, isStubMode } from "@sports/db";
import { cronAuthError } from "@/lib/cron/authorize";
import { resolveServiceActor } from "@/lib/auth/actor";
import { persistActorReceipt } from "@/lib/auth/actor-receipt";
import {
  RATE_COUNTER_MAX_RETENTION_MS,
  pruneExpiredRateLimitCounters,
} from "@/lib/community/durable-rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  if (isStubMode()) {
    // No durable store — nothing to prune, and pretending success would mask
    // a misconfigured production deploy.
    return NextResponse.json(
      { error: "Durable database unavailable (stub mode); nothing pruned." },
      { status: 503 }
    );
  }

  const requestId = `cron-prune-rate-limits:${randomUUID()}`;
  const actor = resolveServiceActor({
    principalId: "system:rate-limit-retention",
    operation: "moderation:prune-rate-limits",
    verifiedCredentialContext: {
      method: "CRON_BEARER",
      verifiedBy: "lib/cron/authorize",
      verifiedAt: new Date(),
    },
    requestId,
  });

  try {
    const actorReceiptId = await persistActorReceipt(actor);
    await pruneExpiredRateLimitCounters(db);
    return NextResponse.json({
      ok: true,
      requestId,
      actorReceiptId,
      retentionMs: RATE_COUNTER_MAX_RETENTION_MS,
    });
  } catch {
    // Store/receipt failure — retryable on the next scheduled run; no
    // internal detail leaves the route.
    return NextResponse.json(
      { error: "Rate-limit retention prune failed; will retry on next run.", requestId },
      { status: 503 }
    );
  }
}
