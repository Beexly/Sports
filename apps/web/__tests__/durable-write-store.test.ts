import { describe, expect, it } from "vitest";
import {
  DURABLE_WRITE_CAPABILITIES,
  DurableWriteStoreUnavailableError,
  evaluateDurableWriteStore,
} from "@sports/db";

/**
 * Durable-write capability gate (directive 5.2 / section 14): the canonical
 * fail-closed guard called BEFORE any external side effect (Stripe customer/
 * session creation). The pure evaluator is tested exhaustively here; the
 * route-level behavior (typed 503, zero Stripe calls) is covered in
 * subscriptions-checkout-route.test.ts.
 */
describe("evaluateDurableWriteStore", () => {
  const REAL_URL = "postgresql://app:secret@db.internal:5432/app";

  it("allows a registered capability on a real, non-stub store", () => {
    const result = evaluateDurableWriteStore({
      capability: "stripe-checkout",
      stubModeActive: false,
      databaseUrl: REAL_URL,
    });
    expect(result).toEqual({ ok: true, capability: "stripe-checkout" });
  });

  it("fails closed when the stub Prisma client is active", () => {
    const result = evaluateDurableWriteStore({
      capability: "stripe-checkout",
      stubModeActive: true,
      databaseUrl: REAL_URL,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("stub_client_active");
  });

  it.each([undefined, "", "  ", "stub", "none", "changeme-later", "postgresql://dummy:dummy@x/y"])(
    "fails closed when DATABASE_URL is unset/sentinel (%j) — durability unknown",
    (url) => {
      const result = evaluateDurableWriteStore({
        capability: "stripe-checkout",
        stubModeActive: false,
        databaseUrl: url,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("database_url_not_durable");
    },
  );

  it("fails closed on an UNREGISTERED capability (never silently allow a protected write)", () => {
    const result = evaluateDurableWriteStore({
      capability: "some-new-surface",
      stubModeActive: false,
      databaseUrl: REAL_URL,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown_capability");
  });

  it("NEVER leaks the DATABASE_URL value into the denial detail", () => {
    // Obviously-fake placeholder credential (never a real secret): the
    // "placeholder" password and ".internal" host are exactly the shapes the
    // repo secret scanner classifies as non-credentials.
    const fakePassword = "fake-placeholder-password";
    const fakeHost = "db.example.internal";
    const secretUrl = "postgresql://user:fake-placeholder-password@db.example.internal:5432/prod";
    for (const input of [
      { capability: "stripe-checkout", stubModeActive: true, databaseUrl: secretUrl },
      { capability: "nope", stubModeActive: false, databaseUrl: secretUrl },
    ]) {
      const result = evaluateDurableWriteStore(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.detail).not.toContain(fakePassword);
        expect(result.detail).not.toContain(fakeHost);
      }
    }
  });

  it("registers stripe-checkout as a known capability", () => {
    expect(DURABLE_WRITE_CAPABILITIES).toContain("stripe-checkout");
  });
});

describe("DurableWriteStoreUnavailableError", () => {
  it("is typed for the route boundary: kind + 503 + capability + reason", () => {
    const err = new DurableWriteStoreUnavailableError(
      "stripe-checkout",
      "stub_client_active",
      "detail",
    );
    expect(err.kind).toBe("durable_write_store_unavailable");
    expect(err.httpStatus).toBe(503);
    expect(err.capability).toBe("stripe-checkout");
    expect(err.reason).toBe("stub_client_active");
    expect(err).toBeInstanceOf(Error);
  });
});
