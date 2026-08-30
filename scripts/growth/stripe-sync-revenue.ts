#!/usr/bin/env node
/**
 * Stripe → RevenueEvent sync (Cash OS, R1) — pulls Stripe invoices and
 * subscription lifecycle events and writes them into the `revenue_event`
 * table (packages/db/prisma/schema.prisma) that apps/web/lib/growth/cash-os.ts
 * reads from.
 *
 * Uses the `stripe` npm package (already a dependency of apps/web — see
 * apps/web/lib/stripe.ts) rather than raw fetch, to match that existing
 * pattern in the repo.
 *
 * REQUIRES A REAL STRIPE_SECRET_KEY TO RUN. This script has NOT been executed
 * live in this environment (no key available) — it is written correctly and
 * completely but is UNTESTED against a real Stripe account. Verify against a
 * test-mode account before ever pointing it at live data.
 *
 * Safety:
 *   - `--test-mode` (or STRIPE_TEST_MODE=1) refuses to run unless
 *     STRIPE_SECRET_KEY looks like a Stripe TEST key (sk_test_...); this is a
 *     guard against accidentally running the "test mode" flag against a live
 *     key, not a separate credential — Stripe scopes test vs. live data by
 *     which kind of secret key you use, there is no separate endpoint.
 *   - NEVER logs a full customer/invoice/subscription object, a card, or a
 *     PAN. Stripe's API does not return raw PANs at all; the discipline here
 *     is to also never log the coarser objects that DO come back (e.g. an
 *     Invoice with a billing email) — only the handful of fields this script
 *     actually persists (ids, amounts, kind, timestamp) are ever logged.
 *   - Idempotent: `RevenueEvent.id` is derived deterministically from the
 *     Stripe event id (`stripe_evt_<eventId>`), inserted with
 *     `ON CONFLICT ("id") DO NOTHING` — re-running over the same window (or
 *     crashing mid-run and being retried) never double-writes a row.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... \
 *     DATABASE_URL=postgresql://... \
 *     node --loader tsx scripts/growth/stripe-sync-revenue.ts \
 *       --test-mode \
 *       [--since 2026-06-01] [--limit 100]
 *
 * Pulls (Stripe Events API, types listed below), maps each to a RevenueEvent
 * `kind`, and upserts. `invoice.payment_succeeded` classifies as `sub_start`
 * (first invoice on a subscription) or `sub_renew` (any later invoice) by
 * checking `invoice.billing_reason`. `customer.subscription.deleted` maps to
 * `sub_cancel` with amountCents=0 (cancellation itself has no charge).
 */

import Stripe from "stripe";
import pg from "pg";

const STRIPE_EVENT_TYPES = [
  "invoice.payment_succeeded",
  "customer.subscription.deleted",
] as const;

type SyncKind = "sub_start" | "sub_renew" | "sub_cancel";

interface ParsedArgs {
  testMode: boolean;
  since?: Date;
  limit: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { testMode: process.env["STRIPE_TEST_MODE"] === "1", limit: 100 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--test-mode") out.testMode = true;
    else if (arg === "--since" && argv[i + 1]) {
      out.since = new Date(argv[i + 1]!);
      i += 1;
    } else if (arg === "--limit" && argv[i + 1]) {
      out.limit = Number(argv[i + 1]);
      i += 1;
    }
  }
  return out;
}

/** Guard: `--test-mode` must be paired with an actual Stripe TEST secret key. */
function assertTestModeKeyMatches(testMode: boolean, secretKey: string): void {
  const looksTest = secretKey.startsWith("sk_test_") || secretKey.startsWith("rk_test_");
  if (testMode && !looksTest) {
    throw new Error(
      "--test-mode (or STRIPE_TEST_MODE=1) was set but STRIPE_SECRET_KEY does not " +
        "look like a Stripe TEST key (sk_test_/rk_test_ prefix). Refusing to run — " +
        "this guard exists so test-mode invocation can never touch live data.",
    );
  }
  if (!testMode && looksTest) {
    console.warn(
      "[stripe-sync-revenue] WARNING: STRIPE_SECRET_KEY looks like a TEST key but " +
        "--test-mode was not passed. Proceeding, but double-check this is intentional.",
    );
  }
}

function classifyInvoice(invoice: Stripe.Invoice): SyncKind {
  // billing_reason "subscription_create" is the very first invoice on a new
  // subscription; anything else recurring (subscription_cycle, ...update, a
  // manual invoice) is treated as a renewal.
  return invoice.billing_reason === "subscription_create" ? "sub_start" : "sub_renew";
}

/** Only the fields this script actually persists — never a raw Stripe object. */
function safeLogFields(kind: SyncKind, eventId: string, amountCents: number, at: Date): void {
  console.log(
    `[stripe-sync-revenue] ${kind} eventId=${eventId} amountCents=${amountCents} at=${at.toISOString()}`,
  );
}

async function upsertRevenueEvent(
  pool: pg.Pool,
  args: { stripeEventId: string; kind: SyncKind; amountCents: number; currency: string; userId: string | null; at: Date; meta: Record<string, unknown> },
): Promise<boolean> {
  const id = `stripe_evt_${args.stripeEventId}`;
  const res = await pool.query(
    `INSERT INTO "revenue_event" ("id", "at", "kind", "amountCents", "currency", "userId", "meta")
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT ("id") DO NOTHING`,
    [id, args.at, args.kind, args.amountCents, args.currency, args.userId, JSON.stringify(args.meta)],
  );
  return (res.rowCount ?? 0) > 0;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const secretKey = process.env["STRIPE_SECRET_KEY"];
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required (see script header for usage).");
  }
  assertTestModeKeyMatches(args.testMode, secretKey);

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20", typescript: true });
  const pool = new pg.Pool({ connectionString: databaseUrl });

  let written = 0;
  let skippedDuplicate = 0;
  let scanned = 0;

  try {
    for (const eventType of STRIPE_EVENT_TYPES) {
      let startingAfter: string | undefined;
      for (let page = 0; page < 50; page += 1) {
        const batch = await stripe.events.list({
          type: eventType,
          limit: Math.min(args.limit, 100),
          ...(args.since ? { created: { gte: Math.floor(args.since.getTime() / 1000) } } : {}),
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        });

        for (const event of batch.data) {
          scanned += 1;
          const at = new Date(event.created * 1000);

          if (event.type === "invoice.payment_succeeded") {
            const invoice = event.data.object as Stripe.Invoice;
            const kind = classifyInvoice(invoice);
            const amountCents = invoice.amount_paid ?? 0;
            const currency = invoice.currency ?? "usd";
            const userId =
              typeof invoice.subscription_details?.metadata?.["userId"] === "string"
                ? invoice.subscription_details.metadata["userId"]
                : null;
            const ok = await upsertRevenueEvent(pool, {
              stripeEventId: event.id,
              kind,
              amountCents,
              currency,
              userId,
              at,
              meta: { invoiceId: invoice.id, customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? null },
            });
            if (ok) {
              written += 1;
              safeLogFields(kind, event.id, amountCents, at);
            } else {
              skippedDuplicate += 1;
            }
          } else if (event.type === "customer.subscription.deleted") {
            const sub = event.data.object as Stripe.Subscription;
            const userId = typeof sub.metadata?.["userId"] === "string" ? sub.metadata["userId"] : null;
            const ok = await upsertRevenueEvent(pool, {
              stripeEventId: event.id,
              kind: "sub_cancel",
              amountCents: 0,
              currency: "usd",
              userId,
              at,
              meta: { subscriptionId: sub.id },
            });
            if (ok) {
              written += 1;
              safeLogFields("sub_cancel", event.id, 0, at);
            } else {
              skippedDuplicate += 1;
            }
          }
        }

        if (!batch.has_more || batch.data.length === 0) break;
        startingAfter = batch.data[batch.data.length - 1]!.id;
      }
    }
  } finally {
    await pool.end();
  }

  console.log(
    `[stripe-sync-revenue] done. scanned=${scanned} written=${written} skippedDuplicate=${skippedDuplicate} testMode=${args.testMode}`,
  );
}

main().catch((err) => {
  console.error(`[stripe-sync-revenue] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
