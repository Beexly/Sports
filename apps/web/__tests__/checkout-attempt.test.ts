import { afterEach, describe, expect, it } from "vitest";
import {
  CHECKOUT_ATTEMPT_TTL_MS,
  CHECKOUT_RECONCILE_MIN_AGE_MS,
  CHECKOUT_SESSION_MAX_LIFETIME_MS,
  CLAIMABLE_STATUSES,
  CheckoutAttemptIdError,
  CheckoutAttemptPersistenceError,
  CheckoutAttemptUnresolvedError,
  CheckoutIntentConflictError,
  bindCheckoutSessionToAttempt,
  claimCheckoutAttemptForStripeRequest,
  computeRequestFingerprint,
  currentCheckoutCommercialParams,
  currentCommercialTermsVersion,
  getOrCreateCheckoutAttempt,
  isValidCheckoutAttemptId,
  isValidClientIntentId,
  mintCheckoutAttemptId,
  recordCheckoutAttemptOutcome,
  stripeIdempotencyKeyForAttempt,
  type CheckoutAttemptDb,
  type CheckoutAttemptRecord,
  type CheckoutCommercialParams,
} from "@/lib/billing/checkout-attempt";

/**
 * Durable checkout attempt — unit tests for the server-authoritative
 * create-or-retrieve core, the audit-identity model (immutable
 * originalClientIntentId + releasable activeClientIntentId), the full
 * commercial fingerprint (directive 5.5), and the claim/outcome/bind state
 * machine (directive 5.3).
 *
 * The fake DB below ENFORCES the (userId, activeClientIntentId) compound
 * unique constraint exactly like Postgres (NULL active keys never collide,
 * real ones throw P2002), so the race tests exercise the actual convergence
 * mechanism — create + catch-P2002-then-fetch — not a mocked answer.
 */

type Row = CheckoutAttemptRecord & Record<string, unknown>;

function makeFakeDb(): CheckoutAttemptDb & { rows: Row[] } {
  const rows: Row[] = [];

  function matches(row: Row, where: Record<string, unknown>): boolean {
    for (const [key, cond] of Object.entries(where)) {
      const value = row[key];
      if (cond !== null && typeof cond === "object" && "in" in (cond as object)) {
        const list = (cond as { in: unknown[] }).in;
        if (!list.includes(value)) return false;
      } else if (value !== cond) {
        return false;
      }
    }
    return true;
  }

  return {
    rows,
    checkoutAttempt: {
      async create({ data }) {
        const row = { ...(data as unknown as Row) };
        if (row.activeClientIntentId != null) {
          const clash = rows.find(
            (r) =>
              r.userId === row.userId && r.activeClientIntentId === row.activeClientIntentId,
          );
          if (clash) {
            const err = new Error(
              "Unique constraint failed on (userId, activeClientIntentId)",
            );
            (err as Error & { code: string }).code = "P2002";
            throw err;
          }
        }
        rows.push(row);
        return { ...row };
      },
      async findUnique({ where }) {
        const key = where.userId_activeClientIntentId;
        const found = rows.find(
          (r) =>
            r.userId === key.userId && r.activeClientIntentId === key.activeClientIntentId,
        );
        return found ? { ...found } : null;
      },
      async updateMany({ where, data }) {
        let count = 0;
        for (const r of rows) {
          if (!matches(r, where)) continue;
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
    subjectEmail: "pro@example.com",
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

  it("typed error classes carry stable machine-readable kinds", () => {
    expect(new CheckoutAttemptIdError("x").kind).toBe("checkout_attempt_id");
    expect(new CheckoutIntentConflictError("x").kind).toBe("checkout_intent_conflict");
    expect(new CheckoutAttemptPersistenceError("x").kind).toBe("checkout_attempt_persistence");
  });
});

describe("request fingerprint (full canonical commercial request — 5.5)", () => {
  const base: CheckoutCommercialParams = {
    userId: "user_1",
    tier: "PRO",
    interval: "month",
    priceId: "price_1",
    currency: "usd",
    quantity: 1,
    trialTerms: null,
    promotionPolicy: "none",
    taxBehavior: "unspecified",
    termsVersion: "phase=FOUNDING;terms-consent=off",
    consentRequired: false,
    originClass: "app-default",
    metadataVersion: "1",
  };

  it("is deterministic and sha256-shaped", () => {
    const a = computeRequestFingerprint(base);
    expect(a).toBe(computeRequestFingerprint({ ...base }));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when ANY commercial component changes", () => {
    const a = computeRequestFingerprint(base);
    const variants: Partial<CheckoutCommercialParams>[] = [
      { tier: "ELITE" },
      { interval: "year" },
      { priceId: "price_2" },
      { currency: "eur" },
      { userId: "user_2" },
      { quantity: 2 },
      { trialTerms: { trialDays: 7 } },
      { promotionPolicy: "codes-allowed" },
      { taxBehavior: "automatic" },
      { termsVersion: "phase=PROVEN;terms-consent=off" },
      { consentRequired: true },
      { originClass: "embedded-partner" },
      { metadataVersion: "2" },
    ];
    for (const variant of variants) {
      expect(computeRequestFingerprint({ ...base, ...variant })).not.toBe(a);
    }
  });

  it("currency comparison is case-insensitive (canonicalized to lowercase)", () => {
    expect(computeRequestFingerprint({ ...base, currency: "USD" })).toBe(
      computeRequestFingerprint(base),
    );
  });

  it("currentCommercialTermsVersion reflects the pricing phase and consent flag", () => {
    expect(currentCommercialTermsVersion()).toMatch(/^phase=[A-Z]+;terms-consent=(on|off)$/);
  });

  describe("currentCheckoutCommercialParams mirrors today's actual session params", () => {
    const FLAG = "STRIPE_TERMS_CONSENT_ENABLED";
    const original = process.env[FLAG];
    afterEach(() => {
      if (original === undefined) delete process.env[FLAG];
      else process.env[FLAG] = original;
    });

    it("captures quantity 1, no trial, no promo codes, unspecified tax, metadata v1", () => {
      delete process.env[FLAG];
      const params = currentCheckoutCommercialParams({
        userId: "user_1",
        tier: "PRO",
        interval: "month",
        priceId: "price_1",
        currency: "usd",
      });
      expect(params.quantity).toBe(1);
      expect(params.trialTerms).toBeNull();
      expect(params.promotionPolicy).toBe("none");
      expect(params.taxBehavior).toBe("unspecified");
      expect(params.metadataVersion).toBe("1");
      expect(params.consentRequired).toBe(false);
      expect(params.originClass).toBe("app-default");
    });

    it("flipping the consent flag changes the fingerprint (terms are commercial)", () => {
      delete process.env[FLAG];
      const off = computeRequestFingerprint(
        currentCheckoutCommercialParams({
          userId: "u",
          tier: "PRO",
          interval: "month",
          priceId: "p",
          currency: "usd",
        }),
      );
      process.env[FLAG] = "true";
      const on = computeRequestFingerprint(
        currentCheckoutCommercialParams({
          userId: "u",
          tier: "PRO",
          interval: "month",
          priceId: "p",
          currency: "usd",
        }),
      );
      expect(on).not.toBe(off);
    });
  });
});

describe("stripe idempotency key", () => {
  it("derives durably from userId + attempt id", () => {
    expect(stripeIdempotencyKeyForAttempt("user_1", "ca_x")).toBe("gse-checkout-user_1-ca_x");
  });
});

describe("getOrCreateCheckoutAttempt", () => {
  it("creates ONE attempt with immutable audit identity and a persisted Stripe key", async () => {
    const db = makeFakeDb();
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    const second = await getOrCreateCheckoutAttempt(db, baseInput());

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.attempt.id).toBe(first.attempt.id);
    expect(db.rows).toHaveLength(1);
    expect(first.attempt.status).toBe("CREATED");
    expect(isValidCheckoutAttemptId(first.attempt.id)).toBe(true);
    // Audit identity: original === active at creation.
    expect(first.attempt.originalClientIntentId).toBe(INTENT);
    expect(first.attempt.activeClientIntentId).toBe(INTENT);
    // Retention snapshot columns.
    expect(first.attempt.subjectUserId).toBe("user_1");
    expect(first.attempt.subjectEmail).toBe("pro@example.com");
    // The idempotency key is persisted and matches its derivation.
    expect(first.attempt.stripeIdempotencyKey).toBe(
      stripeIdempotencyKeyForAttempt("user_1", first.attempt.id),
    );
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

  it("an EXPIRED attempt releases ONLY its active key — history stays traceable", async () => {
    const db = makeFakeDb();
    const past = new Date(Date.now() - 1000);
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    db.rows[0]!.expiresAt = past;

    const retry = await getOrCreateCheckoutAttempt(db, baseInput());

    expect(retry.reused).toBe(false);
    expect(retry.attempt.id).not.toBe(first.attempt.id);
    expect(db.rows).toHaveLength(2);
    // The dead row released the ACTIVE key under a terminal status but keeps
    // its ORIGINAL intent id forever (directive 5.4 — history never erased).
    const dead = db.rows.find((r) => r.id === first.attempt.id)!;
    expect(dead.status).toBe("EXPIRED");
    expect(dead.activeClientIntentId).toBeNull();
    expect(dead.originalClientIntentId).toBe(INTENT);
    // The fresh generation owns the intent id, a full TTL, and a FRESH key.
    expect(retry.attempt.activeClientIntentId).toBe(INTENT);
    expect(new Date(retry.attempt.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(retry.attempt.stripeIdempotencyKey).not.toBe(first.attempt.stripeIdempotencyKey);
  });

  it.each(["FAILED", "CANCELED"] as const)(
    "a %s attempt is likewise never reused (fresh attempt → fresh Stripe key)",
    async (terminal) => {
      const db = makeFakeDb();
      const first = await getOrCreateCheckoutAttempt(db, baseInput());
      db.rows[0]!.status = terminal;

      const retry = await getOrCreateCheckoutAttempt(db, baseInput());
      expect(retry.attempt.id).not.toBe(first.attempt.id);
      const dead = db.rows.find((r) => r.id === first.attempt.id)!;
      expect(dead.status).toBe(terminal);
      expect(dead.originalClientIntentId).toBe(INTENT); // audit identity intact
      expect(dead.activeClientIntentId).toBeNull();
    },
  );

  it("an AMBIGUOUS attempt is returned AS-IS — the retry reuses the same attempt and key", async () => {
    const db = makeFakeDb();
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    db.rows[0]!.status = "AMBIGUOUS";

    const retry = await getOrCreateCheckoutAttempt(db, baseInput());
    expect(retry.reused).toBe(true);
    expect(retry.attempt.id).toBe(first.attempt.id);
    expect(retry.attempt.status).toBe("AMBIGUOUS");
    expect(retry.attempt.stripeIdempotencyKey).toBe(first.attempt.stripeIdempotencyKey);
    expect(db.rows).toHaveLength(1); // NO fresh attempt until reconciliation proves absence
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
    expect(a.attempt.originalClientIntentId).toBeNull();
    expect(a.attempt.activeClientIntentId).toBeNull();
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

  it("FAILS CLOSED on a non-durable store: a sentinel create result throws, never succeeds silently", async () => {
    // The stub Prisma client returns { id: "stub" } instead of echoing the
    // row — that is a write that DID NOT HAPPEN. Directive 5.2: no Stripe
    // side effect may ever be built on top of it.
    const stubDb: CheckoutAttemptDb = {
      checkoutAttempt: {
        create: async () => ({ id: "stub" }),
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
      },
    };
    await expect(getOrCreateCheckoutAttempt(stubDb, baseInput())).rejects.toBeInstanceOf(
      CheckoutAttemptPersistenceError,
    );
    // Token-less path fails closed identically.
    await expect(
      getOrCreateCheckoutAttempt(stubDb, baseInput({ clientIntentId: null })),
    ).rejects.toBeInstanceOf(CheckoutAttemptPersistenceError);
  });
});

describe("claim / outcome / bind state machine (5.3)", () => {
  async function createdAttempt(db: ReturnType<typeof makeFakeDb>) {
    const { attempt } = await getOrCreateCheckoutAttempt(db, baseInput());
    return attempt;
  }

  it("exactly ONE of N concurrent claims wins the right to call Stripe", async () => {
    const db = makeFakeDb();
    const attempt = await createdAttempt(db);
    const claims = await Promise.all(
      Array.from({ length: 25 }, () => claimCheckoutAttemptForStripeRequest(db, attempt.id)),
    );
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(db.rows[0]!.status).toBe("REQUEST_IN_FLIGHT");
  });

  it("claimable statuses are exactly CREATED, AMBIGUOUS, SESSION_CREATED", async () => {
    expect([...CLAIMABLE_STATUSES].sort()).toEqual(["AMBIGUOUS", "CREATED", "SESSION_CREATED"]);
    const db = makeFakeDb();
    const attempt = await createdAttempt(db);
    for (const status of ["REQUEST_IN_FLIGHT", "COMPLETED", "FAILED", "EXPIRED", "CANCELED"]) {
      db.rows[0]!.status = status as CheckoutAttemptRecord["status"];
      expect(await claimCheckoutAttemptForStripeRequest(db, attempt.id)).toBe(false);
    }
    for (const status of CLAIMABLE_STATUSES) {
      db.rows[0]!.status = status;
      expect(await claimCheckoutAttemptForStripeRequest(db, attempt.id)).toBe(true);
      expect(db.rows[0]!.status).toBe("REQUEST_IN_FLIGHT");
    }
  });

  it("an AMBIGUOUS outcome keeps the attempt AND its active key (same Stripe key on retry)", async () => {
    const db = makeFakeDb();
    const attempt = await createdAttempt(db);
    await claimCheckoutAttemptForStripeRequest(db, attempt.id);
    await recordCheckoutAttemptOutcome(db, attempt.id, {
      status: "AMBIGUOUS",
      releasesActiveKey: false,
      outcomeClass: "AMBIGUOUS_NETWORK_OUTCOME",
      errorKind: "stripe_session_create_failed",
    });
    const row = db.rows[0]!;
    expect(row.status).toBe("AMBIGUOUS");
    expect(row.activeClientIntentId).toBe(INTENT);
    expect(row.lastOutcomeClass).toBe("AMBIGUOUS_NETWORK_OUTCOME");
    // The SAME attempt is what a retry converges on — same persisted key.
    const retry = await getOrCreateCheckoutAttempt(db, baseInput());
    expect(retry.attempt.id).toBe(attempt.id);
    expect(retry.attempt.stripeIdempotencyKey).toBe(attempt.stripeIdempotencyKey);
  });

  it("a terminal outcome releases the active key in the SAME update (no key squatting)", async () => {
    const db = makeFakeDb();
    const attempt = await createdAttempt(db);
    await claimCheckoutAttemptForStripeRequest(db, attempt.id);
    await recordCheckoutAttemptOutcome(db, attempt.id, {
      status: "FAILED",
      releasesActiveKey: true,
      outcomeClass: "CONFIGURATION_FAILURE",
      errorKind: "stripe_session_create_failed",
    });
    const row = db.rows[0]!;
    expect(row.status).toBe("FAILED");
    expect(row.activeClientIntentId).toBeNull();
    expect(row.originalClientIntentId).toBe(INTENT); // audit identity immutable
  });

  it("a RETRIABLE outcome returns the attempt to CREATED with its key intact", async () => {
    const db = makeFakeDb();
    const attempt = await createdAttempt(db);
    await claimCheckoutAttemptForStripeRequest(db, attempt.id);
    await recordCheckoutAttemptOutcome(db, attempt.id, {
      status: "CREATED",
      releasesActiveKey: false,
      outcomeClass: "RETRIABLE_NO_REQUEST_SENT",
      errorKind: "stripe_session_create_failed",
    });
    expect(db.rows[0]!.status).toBe("CREATED");
    expect(db.rows[0]!.activeClientIntentId).toBe(INTENT);
  });

  it("bind transitions REQUEST_IN_FLIGHT → SESSION_CREATED and never regresses other states", async () => {
    const db = makeFakeDb();
    const attempt = await createdAttempt(db);
    // Not claimed yet: bind must refuse (returns false).
    expect(await bindCheckoutSessionToAttempt(db, attempt.id, "cs_1", "cus_1")).toBe(false);
    await claimCheckoutAttemptForStripeRequest(db, attempt.id);
    expect(await bindCheckoutSessionToAttempt(db, attempt.id, "cs_1", "cus_1")).toBe(true);
    expect(db.rows[0]!.status).toBe("SESSION_CREATED");
    expect(db.rows[0]!.stripeSessionId).toBe("cs_1");
    // A COMPLETED attempt (webhook won the race) is never regressed by bind.
    db.rows[0]!.status = "COMPLETED";
    expect(await bindCheckoutSessionToAttempt(db, attempt.id, "cs_2", "cus_1")).toBe(false);
    expect(db.rows[0]!.status).toBe("COMPLETED");
    expect(db.rows[0]!.stripeSessionId).toBe("cs_1");
  });
});

describe("past-TTL unresolved attempts (directive 5.3 — never released on time alone)", () => {
  // Helper: create an attempt, then force it into `status` with `expiresAt`.
  async function seedPastTtl(
    db: ReturnType<typeof makeFakeDb>,
    status: string,
    expiresAgoMs: number,
    extra: Record<string, unknown> = {},
  ) {
    const first = await getOrCreateCheckoutAttempt(db, baseInput());
    Object.assign(db.rows[0]!, {
      status,
      expiresAt: new Date(Date.now() - expiresAgoMs),
      // Quiet long enough for the min-age reconcile guard (the row's last
      // write is far in the past, as it always is for a real past-TTL row).
      updatedAt: new Date(Date.now() - CHECKOUT_RECONCILE_MIN_AGE_MS - 60_000),
      ...extra,
    });
    return first.attempt;
  }

  it.each(["REQUEST_IN_FLIGHT", "AMBIGUOUS", "SESSION_CREATED"] as const)(
    "a past-TTL %s attempt WITHOUT a reconciler fails closed — no release, no fresh key",
    async (status) => {
      const db = makeFakeDb();
      const first = await seedPastTtl(db, status, 1000);
      await expect(getOrCreateCheckoutAttempt(db, baseInput())).rejects.toBeInstanceOf(
        CheckoutAttemptUnresolvedError,
      );
      // Nothing was released and no second generation exists.
      expect(db.rows).toHaveLength(1);
      expect(db.rows[0]!.activeClientIntentId).toBe(INTENT);
      expect(db.rows[0]!.status).toBe(status);
      expect(db.rows[0]!.stripeIdempotencyKey).toBe(first.stripeIdempotencyKey);
    },
  );

  it("a past-TTL AMBIGUOUS attempt is released only after reconciliation PROVES absence", async () => {
    const db = makeFakeDb();
    const first = await seedPastTtl(db, "AMBIGUOUS", 1000);
    let reconciledId: string | null = null;
    const retry = await getOrCreateCheckoutAttempt(
      db,
      baseInput({
        reconcileUnresolved: async (attempt: CheckoutAttemptRecord) => {
          reconciledId = attempt.id;
          // Simulate the repair proving the session absent at Stripe.
          await db.checkoutAttempt.updateMany({
            where: { id: attempt.id },
            data: {
              status: "FAILED",
              activeClientIntentId: null,
              lastErrorKind: "repair_proven_absent",
            },
          });
        },
      }),
    );
    expect(reconciledId).toBe(first.id);
    // Fresh generation with a FRESH Stripe key; history intact on the old row.
    expect(retry.reused).toBe(false);
    expect(retry.attempt.id).not.toBe(first.id);
    expect(retry.attempt.stripeIdempotencyKey).not.toBe(first.stripeIdempotencyKey);
    const dead = db.rows.find((r) => r.id === first.id)!;
    expect(dead.status).toBe("FAILED");
    expect(dead.originalClientIntentId).toBe(INTENT);
    expect(dead.activeClientIntentId).toBeNull();
  });

  it("a past-TTL attempt whose session is STILL OPEN is returned as-is — never a second payable session", async () => {
    const db = makeFakeDb();
    const first = await seedPastTtl(db, "AMBIGUOUS", 1000);
    const retry = await getOrCreateCheckoutAttempt(
      db,
      baseInput({
        reconcileUnresolved: async (attempt: CheckoutAttemptRecord) => {
          // Simulate the repair finding the session open and rebinding it.
          await db.checkoutAttempt.updateMany({
            where: { id: attempt.id },
            data: { status: "SESSION_CREATED", stripeSessionId: "cs_open" },
          });
        },
      }),
    );
    expect(retry.reused).toBe(true);
    expect(retry.attempt.id).toBe(first.id);
    expect(retry.attempt.status).toBe("SESSION_CREATED");
    expect(retry.attempt.stripeSessionId).toBe("cs_open");
    expect(db.rows).toHaveLength(1); // no fresh generation
  });

  it("reconciliation that cannot prove anything leaves the attempt held (fail closed)", async () => {
    const db = makeFakeDb();
    await seedPastTtl(db, "AMBIGUOUS", 1000);
    await expect(
      getOrCreateCheckoutAttempt(
        db,
        baseInput({
          reconcileUnresolved: async () => {
            /* Stripe consulted; nothing provable — row left untouched. */
          },
        }),
      ),
    ).rejects.toBeInstanceOf(CheckoutAttemptUnresolvedError);
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]!.activeClientIntentId).toBe(INTENT);
  });

  it("a row written to moments ago is NOT reconciled (min-age guard) — its request may still be mid-flight", async () => {
    const db = makeFakeDb();
    await seedPastTtl(db, "REQUEST_IN_FLIGHT", 1000, {
      updatedAt: new Date(Date.now() - 1000), // claimed just now
    });
    let reconcileCalled = false;
    await expect(
      getOrCreateCheckoutAttempt(
        db,
        baseInput({
          reconcileUnresolved: async () => {
            reconcileCalled = true;
          },
        }),
      ),
    ).rejects.toBeInstanceOf(CheckoutAttemptUnresolvedError);
    // Stripe was never consulted — a session-create may still be committing.
    expect(reconcileCalled).toBe(false);
    expect(db.rows[0]!.activeClientIntentId).toBe(INTENT);
  });

  it("a reconciler transport failure propagates — never treated as proof", async () => {
    const db = makeFakeDb();
    await seedPastTtl(db, "AMBIGUOUS", 1000);
    await expect(
      getOrCreateCheckoutAttempt(
        db,
        baseInput({
          reconcileUnresolved: async () => {
            throw new Error("stripe unreachable");
          },
        }),
      ),
    ).rejects.toThrow("stripe unreachable");
    expect(db.rows[0]!.activeClientIntentId).toBe(INTENT);
  });

  it("beyond expiresAt + session lifetime, elapsed time IS proof — released without Stripe", async () => {
    const db = makeFakeDb();
    const first = await seedPastTtl(
      db,
      "AMBIGUOUS",
      CHECKOUT_SESSION_MAX_LIFETIME_MS + 1000,
    );
    const retry = await getOrCreateCheckoutAttempt(db, baseInput());
    expect(retry.reused).toBe(false);
    expect(retry.attempt.id).not.toBe(first.id);
    const dead = db.rows.find((r) => r.id === first.id)!;
    expect(dead.status).toBe("EXPIRED");
    expect(dead.activeClientIntentId).toBeNull();
    expect(dead.originalClientIntentId).toBe(INTENT);
  });

  it("a past-TTL CREATED attempt never talked to Stripe — safe to release on time alone", async () => {
    const db = makeFakeDb();
    const first = await seedPastTtl(db, "CREATED", 1000);
    const retry = await getOrCreateCheckoutAttempt(db, baseInput());
    expect(retry.attempt.id).not.toBe(first.id);
    expect(db.rows.find((r) => r.id === first.id)!.status).toBe("EXPIRED");
  });

  it("a past-TTL COMPLETED attempt stays COMPLETED and is returned as-is", async () => {
    const db = makeFakeDb();
    const first = await seedPastTtl(db, "COMPLETED", 1000);
    const retry = await getOrCreateCheckoutAttempt(db, baseInput());
    expect(retry.reused).toBe(true);
    expect(retry.attempt.id).toBe(first.id);
    expect(retry.attempt.status).toBe("COMPLETED");
  });
});
