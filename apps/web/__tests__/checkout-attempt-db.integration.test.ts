// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import {
  CheckoutIntentConflictError,
  claimCheckoutAttemptForStripeRequest,
  getOrCreateCheckoutAttempt,
  type CheckoutAttemptDb,
} from "@/lib/billing/checkout-attempt";

/**
 * REAL-POSTGRES integration proof for the durable checkout attempt
 * (directive 5.8 acceptance):
 *
 *   - 100 concurrent same-intent requests produce ONE active attempt and
 *     ONE claim winner (the DB unique constraint, not a mock, arbitrates);
 *   - same intent + changed fingerprint → conflict (409 at the route);
 *   - terminal history stays traceable (immutable originalClientIntentId);
 *   - the migration's CHECK constraints actually reject contract violations;
 *   - user deletion DETACHES (SET NULL) — the audit row survives.
 *
 * GATED: runs only when CHECKOUT_ATTEMPT_DB_TEST_URL points at a disposable
 * Postgres carrying the branch schema + migration (see
 * packages/db/prisma/migrations/20260722130000_add_checkout_attempt).
 * Run: scripts/dev/disposable-postgres.sh (adapted port), then
 *   CHECKOUT_ATTEMPT_DB_TEST_URL=postgresql://postgres@127.0.0.1:<port>/sports_test \
 *   npx vitest run __tests__/checkout-attempt-db.integration.test.ts
 * NEVER a live/production database; never live-mode Stripe anything (this
 * suite touches no Stripe API at all).
 */

const DB_URL = process.env["CHECKOUT_ATTEMPT_DB_TEST_URL"];

describe.runIf(Boolean(DB_URL))("CheckoutAttempt on real Postgres", () => {
  let prisma: PrismaClient;
  let dbc: CheckoutAttemptDb;
  const stamp = Date.now();
  const userId = `user_it_${stamp}`;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: DB_URL });
    dbc = prisma as unknown as CheckoutAttemptDb;
    await prisma.user.create({
      data: { id: userId, email: `checkout-it-${stamp}@example.com` },
    });
  });

  afterAll(async () => {
    await prisma.checkoutAttempt.deleteMany({ where: { subjectUserId: { contains: `_it_` } } });
    await prisma.user.deleteMany({ where: { email: { contains: "checkout-it-" } } });
    await prisma.$disconnect();
  });

  function input(intent: string | null, fingerprint = "f".repeat(64)) {
    return {
      userId,
      clientIntentId: intent,
      subjectEmail: `checkout-it-${stamp}@example.com`,
      customerId: "cus_it_1",
      tier: "PRO",
      interval: "month",
      priceId: "price_it_pro_monthly",
      currency: "usd",
      requestFingerprint: fingerprint,
    };
  }

  it("100 CONCURRENT same-intent requests converge on ONE active attempt and ONE claim winner", async () => {
    const intent = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 100 }, () => getOrCreateCheckoutAttempt(dbc, input(intent))),
    );

    const ids = new Set(results.map((r) => r.attempt.id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => !r.reused)).toHaveLength(1);

    const rows = await prisma.checkoutAttempt.findMany({
      where: { userId, activeClientIntentId: intent },
    });
    expect(rows).toHaveLength(1);

    // Claim arbitration: 100 concurrent claims, exactly ONE Stripe caller.
    const attemptId = [...ids][0]!;
    const claims = await Promise.all(
      Array.from({ length: 100 }, () => claimCheckoutAttemptForStripeRequest(dbc, attemptId)),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    const claimed = await prisma.checkoutAttempt.findUnique({ where: { id: attemptId } });
    expect(claimed?.status).toBe("REQUEST_IN_FLIGHT");
  }, 60_000);

  it("same intent + CHANGED fingerprint conflicts instead of reusing the key", async () => {
    const intent = randomUUID();
    await getOrCreateCheckoutAttempt(dbc, input(intent));
    await expect(
      getOrCreateCheckoutAttempt(dbc, input(intent, "0".repeat(64))),
    ).rejects.toBeInstanceOf(CheckoutIntentConflictError);
  });

  it("terminal history stays traceable: the released generation keeps its original intent id", async () => {
    const intent = randomUUID();
    const first = await getOrCreateCheckoutAttempt(dbc, input(intent));
    // Force the first generation dead (past TTL).
    await prisma.checkoutAttempt.update({
      where: { id: first.attempt.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const second = await getOrCreateCheckoutAttempt(dbc, input(intent));
    expect(second.attempt.id).not.toBe(first.attempt.id);

    const dead = await prisma.checkoutAttempt.findUnique({ where: { id: first.attempt.id } });
    expect(dead?.status).toBe("EXPIRED");
    expect(dead?.originalClientIntentId).toBe(intent); // audit identity immutable
    expect(dead?.activeClientIntentId).toBeNull();
    const live = await prisma.checkoutAttempt.findUnique({ where: { id: second.attempt.id } });
    expect(live?.activeClientIntentId).toBe(intent);
    expect(live?.stripeIdempotencyKey).not.toBe(dead?.stripeIdempotencyKey);
  });

  it("CHECK constraints reject contract violations at the DB layer", async () => {
    const intent = randomUUID();
    const { attempt } = await getOrCreateCheckoutAttempt(dbc, input(intent));

    // A terminal FAILED row may not keep its active key.
    await expect(
      prisma.checkoutAttempt.update({
        where: { id: attempt.id },
        data: { status: "FAILED" }, // active key still set → CHECK violation
      }),
    ).rejects.toThrow();

    // The active key may never point at a DIFFERENT intent than the original.
    await expect(
      prisma.checkoutAttempt.update({
        where: { id: attempt.id },
        data: { activeClientIntentId: randomUUID() },
      }),
    ).rejects.toThrow();

    // COMPLETED requires a completion timestamp.
    await expect(
      prisma.checkoutAttempt.update({
        where: { id: attempt.id },
        data: { status: "COMPLETED" },
      }),
    ).rejects.toThrow();

    // The legal transition (release + terminal in ONE update) succeeds.
    await prisma.checkoutAttempt.update({
      where: { id: attempt.id },
      data: { status: "FAILED", activeClientIntentId: null },
    });
  });

  it("RETENTION: deleting the user DETACHES the attempt (SET NULL), never deletes it", async () => {
    const doomedId = `user_it_doomed_${stamp}`;
    await prisma.user.create({
      data: { id: doomedId, email: `checkout-it-doomed-${stamp}@example.com` },
    });
    const intent = randomUUID();
    const { attempt } = await getOrCreateCheckoutAttempt(dbc, {
      ...input(intent),
      userId: doomedId,
    });

    await prisma.user.delete({ where: { id: doomedId } });

    const survivor = await prisma.checkoutAttempt.findUnique({ where: { id: attempt.id } });
    expect(survivor).not.toBeNull();
    expect(survivor?.userId).toBeNull(); // FK detached
    expect(survivor?.subjectUserId).toBe(doomedId); // immutable snapshot intact
    expect(survivor?.subjectEmail).toContain("checkout-it-"); // subject stays identifiable
  });
});

describe.runIf(!DB_URL)("CheckoutAttempt on real Postgres (skipped)", () => {
  it("is skipped without CHECKOUT_ATTEMPT_DB_TEST_URL (documented gate, not silent absence)", () => {
    expect(DB_URL).toBeUndefined();
  });
});
