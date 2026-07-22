import { describe, expect, it } from "vitest";
import {
  CHECKOUT_ATTEMPT_TTL_MS,
  CheckoutAttemptIdError,
  CheckoutIntentConflictError,
  computeRequestFingerprint,
  currentCommercialTermsVersion,
  getOrCreateCheckoutAttempt,
  isValidCheckoutAttemptId,
  isValidClientIntentId,
  mintCheckoutAttemptId,
  stripeIdempotencyKeyForAttempt,
  type CheckoutAttemptDb,
  type CheckoutAttemptRecord,
} from "@/lib/billing/checkout-attempt";

/**
 * Durable checkout attempt — unit tests for the server-authoritative
 * create-or-retrieve core (Phase 1P, replacing PR #156's useRef token).
 *
 * The fake DB below ENFORCES the (userId, clientIntentId) compound unique
 * constraint exactly like Postgres (NULL intent ids never collide, real ones
 * throw P2002), so the race tests exercise the actual convergence mechanism —
 * create + catch-P2002-then-fetch — not a mocked answer.
 */

type Row = CheckoutAttemptRecord & Record<string, unknown>;

function makeFakeDb(): CheckoutAttemptDb & { rows: Row[] } {
  const rows: Row[] = [];
  return {
    rows,
    checkoutAttempt: {
      async create({ data }) {
        const row = { ...(data as unknown as Row) };
        if (row.clientIntentId != null) {
          const clash = rows.find(
            (r) => r.userId === row.userId && r.clientIntentId === row.clientIntentId,
          );
          if (clash) {
            const err = new Error("Unique constraint failed on (userId, clientIntentId)");
            (err as Error & { code: string }).code = "P2002";
            throw err;
          }
        }
        rows.push(row);
        return { ...row };
      },
      async findUnique({ where }) {
        const key = where.userId_clientIntentId;
        const found = rows.find(
          (r) => r.userId === key.userId && r.clientIntentId === key.clientIntentId,
        );
        return found ? { ...found } : null;
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const r of rows) {
          const w = where as { id?: string; clientIntentId?: string };
          if (w.id !== undefined && r.id !== w.id) continue;
          if (w.clientIntentId !== undefined && r.clientIntentId !== w.clientIntentId) continue;
          Object.assign(r, data);
          count++;
        }
        return { count };
      },
    },
  };
}

const INTENT = "a1b2c3d4-e5f6-4a8b-9c0d-112233445566";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user_1",
    clientIntentId: INTENT,
    customerId: "cus_1",
    tier: "PRO",
    interval: "month",
    priceId: "price_pro_monthly",
    currency: "usd",
    requestFingerprint: "f".repeat(64),
    ...overrides,
  } as Parameters<typeof getOrCreateCheckoutAttempt>[1];
}

describe("identifier validation", () => {
  it("accepts a browser crypto.randomUUID as a clientIntentId", () => {
    expect(isValidClientIntentId(INTENT)).toBe(true);
  });

  it("rejects non-UUID clientIntentIds", () => {
    for (const bad of ["", "abc", "user_1", `${INTENT}x`, "ca_" + INTENT]) {
      expect(isValidClientIntentId(bad)).toBe(false);
    }
  });

  it("minted attempt ids validate; foreign strings do not", () => {
    const id = mintCheckoutAttemptId();
    expect(isValidCheckoutAttemptId(id)).toBe(true);
    for (const bad of ["", "stub", INTENT, "ca_not-a-uuid", "cln0000000000000000000000"]) {
      expect(isValidCheckoutAttemptId(bad)).toBe(false);
    }
  });

  it("typed error class carries a stable machine-readable kind", () => {
    expect(new CheckoutAttemptIdError("x").kind).toBe("checkout_attempt_id");
    expect(new CheckoutIntentConflictError("x").kind).toBe("checkout_intent_conflict");
  });
});

describe("request fingerprint", () => {
  const base = {
    userId: "user_1",
    tier: "PRO",
    interval: "month",
    priceId: "price_1",
    currency: "usd",
    termsVersion: "phase=FOUNDING;terms-consent=off",
  };

  it("is deterministic and sha256-shaped", () => {
    const a = computeRequestFingerprint(base);
    expect(a).toBe(computeRequestFingerprint({ ...base }));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when ANY commercial component changes", () => {
    const a = computeRequestFingerprint(base);
    expect(computeRequestFingerprint({ ...base, tier: "ELITE" })).not.toBe(a);
    expect(computeRequestFingerprint({ ...base, interval: "year" })).not.toBe(a);
    expect(computeRequestFingerprint({ ...base, priceId: "price_2" })).not.toBe(a);
    expect(computeRequestFingerprint({ ...base, currency: "eur" })).not.toBe(a);
    expect(computeRequestFingerprint({ ...base, userId: "user_2" })).not.toBe(a);
    expect(
      computeRequestFingerprint({ ...base, termsVersion: "phase=PROVEN;terms-consent=off" }),
    ).not.toBe(a);
  });

  it("currency comparison is case-insensitive (canonicalized to lowercase)", () => {
    expect(computeRequestFingerprint({ ...base, currency: "USD" })).toBe(
      computeRequestFingerprint(base),
    );
  });

  it("currentCommercialTermsVersion reflects the pricing phase and consent flag", () => {
    expect(currentCommercialTermsVersion()).toMatch(/^phase=[A-Z]+;terms-consent=(on|off)$/);
  });
});

describe("stripe idempotency key", () => {
  it("derives durably from userId + attempt id", () => {
    expect(stripeIdempotencyKeyForAttempt("user_1", "ca_x")).toBe("gse-checkout-user_1-ca_x");
  });
});

describe("getOrCreateCheckoutAttempt", () => {
  it("creates ONE attempt and returns it verbatim on an idempotent retry", async () => {
    const db = makeFakeDb();
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    const second = await getOrCreateCheckoutAttempt(db, baseInput());

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.attempt.id).toBe(first.attempt.id);
    expect(db.rows).toHaveLength(1);
    expect(first.attempt.status).toBe("CREATED");
    expect(isValidCheckoutAttemptId(first.attempt.id)).toBe(true);
  });

  it("RACE: two concurrent creates with the same (user, intent, fingerprint) converge on ONE row", async () => {
    const db = makeFakeDb();
    const [a, b] = await Promise.all([
      getOrCreateCheckoutAttempt(db, baseInput()),
      getOrCreateCheckoutAttempt(db, baseInput()),
    ]);

    expect(db.rows).toHaveLength(1);
    expect(a.attempt.id).toBe(b.attempt.id);
    // Exactly one of the two actually created the row.
    expect([a.reused, b.reused].filter(Boolean)).toHaveLength(1);
  });

  it("same intent + DIFFERENT fingerprint throws CheckoutIntentConflictError", async () => {
    const db = makeFakeDb();
    await getOrCreateCheckoutAttempt(db, baseInput());
    await expect(
      getOrCreateCheckoutAttempt(db, baseInput({ requestFingerprint: "0".repeat(64) })),
    ).rejects.toBeInstanceOf(CheckoutIntentConflictError);
    expect(db.rows).toHaveLength(1); // nothing extra was created
  });

  it("an EXPIRED attempt is released and a FRESH attempt (new id) is created", async () => {
    const db = makeFakeDb();
    const past = new Date(Date.now() - 1000);
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    db.rows[0]!.expiresAt = past;

    const retry = await getOrCreateCheckoutAttempt(db, baseInput());

    expect(retry.reused).toBe(false);
    expect(retry.attempt.id).not.toBe(first.attempt.id);
    expect(db.rows).toHaveLength(2);
    // The dead row kept its audit trail but released the intent id.
    const dead = db.rows.find((r) => r.id === first.attempt.id)!;
    expect(dead.status).toBe("EXPIRED");
    expect(dead.clientIntentId).toBeNull();
    // The fresh row owns the intent id and a full TTL.
    expect(retry.attempt.clientIntentId).toBe(INTENT);
    expect(new Date(retry.attempt.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("a FAILED attempt is likewise never reused (fresh attempt → fresh Stripe key)", async () => {
    const db = makeFakeDb();
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    db.rows[0]!.status = "FAILED";

    const retry = await getOrCreateCheckoutAttempt(db, baseInput());
    expect(retry.attempt.id).not.toBe(first.attempt.id);
    expect(db.rows.find((r) => r.id === first.attempt.id)!.status).toBe("FAILED");
  });

  it("a COMPLETED attempt is returned as-is so the caller can refuse a new session", async () => {
    const db = makeFakeDb();
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    db.rows[0]!.status = "COMPLETED";
    db.rows[0]!.stripeSubscriptionId = "sub_1";

    const retry = await getOrCreateCheckoutAttempt(db, baseInput());
    expect(retry.reused).toBe(true);
    expect(retry.attempt.id).toBe(first.attempt.id);
    expect(retry.attempt.status).toBe("COMPLETED");
  });

  it("token-less requests each mint their OWN attempt (never collide)", async () => {
    const db = makeFakeDb();
    const a = await getOrCreateCheckoutAttempt(db, baseInput({ clientIntentId: null }));
    const b = await getOrCreateCheckoutAttempt(db, baseInput({ clientIntentId: null }));
    expect(a.attempt.id).not.toBe(b.attempt.id);
    expect(db.rows).toHaveLength(2);
  });

  it("rejects a malformed clientIntentId with the typed error before touching the DB", async () => {
    const db = makeFakeDb();
    await expect(
      getOrCreateCheckoutAttempt(db, baseInput({ clientIntentId: "not-a-uuid" })),
    ).rejects.toBeInstanceOf(CheckoutAttemptIdError);
    expect(db.rows).toHaveLength(0);
  });

  it("sets expiresAt ~24h out (Stripe idempotency window)", async () => {
    const db = makeFakeDb();
    const now = new Date("2026-07-22T12:00:00Z");
    const { attempt } = await getOrCreateCheckoutAttempt(db, { ...baseInput(), now });
    expect(new Date(attempt.expiresAt).getTime()).toBe(now.getTime() + CHECKOUT_ATTEMPT_TTL_MS);
    expect(CHECKOUT_ATTEMPT_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("survives the stub DB client (sentinel create result) by overlaying the written data", async () => {
    const stubDb: CheckoutAttemptDb = {
      checkoutAttempt: {
        create: async () => ({ id: "stub" }),
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
      },
    };
    const { attempt } = await getOrCreateCheckoutAttempt(stubDb, baseInput());
    expect(isValidCheckoutAttemptId(attempt.id)).toBe(true);
    expect(attempt.priceId).toBe("price_pro_monthly");
  });
});
