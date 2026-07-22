/**
 * Vercel cron — deliver settlement notifications from the outbox.
 *
 * The delivery half of the Phase 1E transactional outbox: settlement
 * (packages/ingestion-pipeline/src/settle-sport.ts) appends one durable
 * PickSettlementEvent per settled pick IN THE SAME TRANSACTION as the
 * pick's PENDING→result update; this route drains those events and fans
 * out to watchlist followers through the real channels (Web Push + email —
 * see apps/web/lib/watchlist/channels/). Sending happens strictly outside
 * any settlement transaction, and a crash here can never lose an alert
 * (the event row survives and is re-claimed) or duplicate a settlement
 * (events are unique per pick).
 *
 * Lives in apps/web — not the ingestion pipeline — because every channel
 * dependency (entitlements, push subscription store, watchlist matching,
 * resend/web-push SDKs) is a web-app module, and the workspace dependency
 * edge only points apps/web → packages/*. See
 * apps/web/lib/settlement-outbox/worker.ts for the claim/retry state
 * machine and its rationale.
 *
 * Schedule is declared in `vercel.json` (runs right after settle-picks so
 * alerts land promptly, and hourly-independent re-runs pick up retries).
 * Authentication: Authorization: Bearer <CRON_SECRET>, same as every cron.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { drainSettlementOutbox } from "@/lib/settlement-outbox/worker";
import { notifyWatchlistFollowersForGradedPick } from "@/lib/watchlist/settlement-hook";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function GET(request: Request) {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const startedAt = Date.now();
  const summary = await drainSettlementOutbox(db, notifyWatchlistFollowersForGradedPick);

  return NextResponse.json({
    ok: true,
    elapsedMs: Date.now() - startedAt,
    ...summary,
  });
}
