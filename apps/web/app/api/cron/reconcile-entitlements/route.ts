/**
 * Vercel cron — reconcile Stripe → DB subscription entitlements.
 *
 * The Stripe webhook is the primary writer of entitlement; this is the
 * self-healing BACKSTOP. A missed / failed webhook delivery (we saw real
 * `customer.subscription.created` 500s in production) leaves a paying customer
 * with no access and no automatic recovery. This route periodically pulls
 * authoritative Stripe state and repairs the DB — granting missed upgrades and,
 * only on POSITIVE confirmation, downgrading stale paid rows. See
 * `lib/billing/reconcile-entitlements.ts` for the fail-safe guarantees.
 *
 * Schedule is declared in `vercel.json` at the repo root ("0 8 * * *" — DAILY).
 * The existing crons all run once/day (Vercel Hobby's minimum interval), so this
 * backstop matches that cadence and can never break a Hobby deploy. Immediacy is
 * already covered by the on-demand post-checkout reconcile (`reconcileUserEntitlement`);
 * this scheduled pass is the slower, self-healing safety net.
 *
 * Authentication: Vercel invokes the route with
 *   Authorization: Bearer <CRON_SECRET>
 * via the shared `cronAuthError` helper — a public call without the right token
 * returns 401 (or 500 if CRON_SECRET is unset), exactly like every other cron.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { reconcileEntitlements } from "@/lib/billing/reconcile-entitlements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";
export const maxDuration = 300; // Vercel hobby/pro cron caps at 5 min

export async function GET(request: Request): Promise<NextResponse> {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const summary = await reconcileEntitlements();

  return NextResponse.json({
    // `ok` reflects a clean pass: any Stripe/DB error means some checks were
    // skipped fail-safe (nothing wrongly revoked) and the operator should look.
    ok: summary.errors === 0,
    checked: summary.checked,
    granted: summary.granted,
    downgraded: summary.downgraded,
    errors: summary.errors,
    listReliable: summary.listReliable,
  });
}
