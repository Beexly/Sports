import { createHmac } from "node:crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Route-level test for the crypto webhook — the money logic the adversarial
 * rounds hardened but that had NO automated test (audit finding #1). Uses REAL
 * HMAC signatures + the real grant/verify pure functions, mocking only the DB
 * transaction and Stripe. Covers: bad signature, delayed/resolved -> manual
 * review, confirmed-missing-metadata -> loud no-grant, first grant cancels a
 * prior live Stripe sub, and a REPLAY recovering the sub-to-cancel from the
 * ledger (the crash-window double-bill fix).
 */

const SECRET = "test-webhook-secret";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { $transaction: mocks.transaction },
  Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" } },
}));
vi.mock("@/lib/stripe", () => ({ stripe: { subscriptions: { cancel: mocks.cancel } } }));

import { POST } from "@/app/api/webhooks/coinbase-commerce/route";

function signed(eventObj: unknown): Request {
  const body = JSON.stringify({ event: eventObj });
  const sig = createHmac("sha256", SECRET).update(body, "utf8").digest("hex");
  return new Request("http://x/api/webhooks/coinbase-commerce", {
    method: "POST",
    body,
    headers: { "x-cc-webhook-signature": sig },
  });
}

const confirmed = (over: Record<string, unknown> = {}) => ({
  type: "charge:confirmed",
  data: { code: "CH1", metadata: { userId: "u1", tier: "PRO" }, ...over },
});

beforeEach(() => {
  process.env["COINBASE_COMMERCE_WEBHOOK_SECRET"] = SECRET;
  mocks.transaction.mockReset();
  mocks.cancel.mockReset();
});

describe("coinbase-commerce webhook POST", () => {
  it("rejects a bad signature with 401", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ event: confirmed() }),
      headers: { "x-cc-webhook-signature": "deadbeef" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("routes charge:delayed to manual review, no grant", async () => {
    const res = await POST(signed({ type: "charge:delayed", data: { code: "CHd" } }));
    const body = await res.json();
    expect(body).toMatchObject({ received: true, granted: false, review: true });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("routes charge:resolved to manual review, no grant (under/over-payment safe)", async () => {
    const res = await POST(signed({ type: "charge:resolved", data: { code: "CHr" } }));
    expect(await res.json()).toMatchObject({ received: true, granted: false, review: true });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("confirmed charge with missing metadata -> granted:false, no transaction", async () => {
    const res = await POST(signed({ type: "charge:confirmed", data: { code: "CHx" } }));
    expect(await res.json()).toMatchObject({ received: true, granted: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("first grant with a prior LIVE Stripe sub grants AND cancels the Stripe sub", async () => {
    const upsert = vi.fn();
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        subscription: {
          findUnique: vi.fn().mockResolvedValue({
            currentPeriodEnd: null,
            stripeSubscriptionId: "sub_live",
            paymentProvider: "STRIPE",
          }),
          upsert,
        },
        commerceCharge: { create: vi.fn().mockResolvedValue({}), findUnique: vi.fn() },
      }),
    );
    const res = await POST(signed(confirmed()));
    expect(await res.json()).toMatchObject({ received: true, granted: true });
    expect(upsert).toHaveBeenCalledOnce();
    expect(mocks.cancel).toHaveBeenCalledWith("sub_live");
  });

  it("REPLAY (P2002) grants nothing but recovers + cancels the ledger's stripeSubToCancel", async () => {
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        subscription: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() },
        commerceCharge: {
          create: vi.fn().mockRejectedValue({ code: "P2002" }),
          findUnique: vi.fn().mockResolvedValue({ stripeSubToCancel: "sub_orphaned" }),
        },
      }),
    );
    const res = await POST(signed(confirmed()));
    expect(await res.json()).toMatchObject({ received: true, granted: false, duplicate: true });
    // The crash-window fix: even on a replay, the orphaned Stripe sub is cancelled.
    expect(mocks.cancel).toHaveBeenCalledWith("sub_orphaned");
  });
});
