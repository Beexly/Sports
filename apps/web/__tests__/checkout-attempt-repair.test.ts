import { describe, expect, it } from "vitest";
import {
  REPAIR_MIN_AGE_MS,
  repairUnresolvedCheckoutAttempts,
  type CheckoutAttemptRepairDb,
  type CheckoutSessionLookup,
  type RepairSessionView,
} from "@/lib/billing/checkout-attempt-repair";
import { CHECKOUT_SESSION_MAX_LIFETIME_MS } from "@/lib/billing/checkout-attempt";

/**
 * Checkout-attempt repair job (directive 5.3 / 5.6) — the DURABLE
 * reconciliation pathway for session-created-but-DB-bind-failed,
 * completed-but-sync-lagging, ambiguous-outcome, and missed-expiry attempts.
 *
 * Core safety property under test: an attempt's intent key is released (so a
 * fresh Stripe idempotency key may ever be minted) ONLY after Stripe has been
 * queried by the attempt's own idempotent metadata and the original session
 * is PROVEN absent or expired.
 */

const NOW = new Date("2026-07-22T12:00:00Z");
const OLD = new Date(NOW.getTime() - REPAIR_MIN_AGE_MS - 60_000);
const INTENT = "a1b2c3d4-e5f6-4a8b-9c0d-112233445566";

type Row = Record<string, unknown>;

function attemptRow(overrides: Row = {}): Row {
  return {
    id: "ca_11111111-2222-4333-8444-555566667777",
    originalClientIntentId: INTENT,
    activeClientIntentId: INTENT,
    userId: "user_1",
    subjectUserId: "user_1",
    customerId: "cus_1",
    status: "AMBIGUOUS",
    stripeSessionId: null,
    stripeSubscriptionId: null,
    createdAt: OLD,
    updatedAt: OLD,
    expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
    ...overrides,
  };
}

function makeDb(rows: Row[]): CheckoutAttemptRepairDb & { rows: Row[] } {
  function matches(row: Row, where: Record<string, unknown>): boolean {
    for (const [key, cond] of Object.entries(where)) {
      const value = row[key];
      if (cond !== null && typeof cond === "object" && "in" in (cond as object)) {
        if (!(cond as { in: unknown[] }).in.includes(value)) return false;
      } else if (cond !== null && typeof cond === "object" && "lt" in (cond as object)) {
        const bound = (cond as { lt: Date }).lt;
        if (!(value instanceof Date) || value.getTime() >= bound.getTime()) return false;
      } else if (value !== cond) {
        return false;
      }
    }
    return true;
  }
  return {
    rows,
    checkoutAttempt: {
      async findMany(args) {
        const where = (args as { where: Record<string, unknown> }).where;
        return rows.filter((r) => matches(r, where)).map((r) => ({ ...r }));
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

function lookup(config: {
  listed?: RepairSessionView[];
  retrieved?: Record<string, RepairSessionView | null>;
  listError?: Error;
}): CheckoutSessionLookup {
  return {
    async listSessionsByCustomerSince() {
      if (config.listError) throw config.listError;
      return config.listed ?? [];
    },
    async retrieveSession(sessionId) {
      if (config.retrieved && sessionId in config.retrieved) {
        return config.retrieved[sessionId] ?? null;
      }
      return null;
    },
  };
}

function session(overrides: Partial<RepairSessionView> = {}): RepairSessionView {
  return {
    id: "cs_1",
    status: "open",
    metadataAttemptId: "ca_11111111-2222-4333-8444-555566667777",
    subscriptionId: null,
    ...overrides,
  };
}

describe("repairUnresolvedCheckoutAttempts", () => {
  it("REPAIRS a session-created-but-DB-bind-failed attempt: open session found by metadata → SESSION_CREATED", async () => {
    const db = makeDb([attemptRow({ status: "REQUEST_IN_FLIGHT" })]);
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({ listed: [session()] }) },
      { now: NOW },
    );
    expect(report.rebound).toBe(1);
    expect(db.rows[0]!["status"]).toBe("SESSION_CREATED");
    expect(db.rows[0]!["stripeSessionId"]).toBe("cs_1");
    expect(db.rows[0]!["activeClientIntentId"]).toBe(INTENT); // key retained — session is live
  });

  it("CONVERGES a completed-but-sync-lagging attempt: complete session → COMPLETED + subscription id", async () => {
    const db = makeDb([attemptRow({ status: "AMBIGUOUS" })]);
    const report = await repairUnresolvedCheckoutAttempts(
      {
        db,
        stripeSessions: lookup({
          listed: [session({ status: "complete", subscriptionId: "sub_9" })],
        }),
      },
      { now: NOW },
    );
    expect(report.completed).toBe(1);
    expect(db.rows[0]!["status"]).toBe("COMPLETED");
    expect(db.rows[0]!["stripeSubscriptionId"]).toBe("sub_9");
    expect(db.rows[0]!["completedAt"]).toBeInstanceOf(Date);
  });

  it("resolves an expired session: EXPIRED, active key released, original intent kept", async () => {
    const db = makeDb([attemptRow({ status: "AMBIGUOUS" })]);
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({ listed: [session({ status: "expired" })] }) },
      { now: NOW },
    );
    expect(report.expired).toBe(1);
    expect(db.rows[0]!["status"]).toBe("EXPIRED");
    expect(db.rows[0]!["activeClientIntentId"]).toBeNull();
    expect(db.rows[0]!["originalClientIntentId"]).toBe(INTENT);
  });

  it("releases the key ONLY on PROOF of absence: empty complete list → FAILED + released", async () => {
    const db = makeDb([attemptRow({ status: "AMBIGUOUS" })]);
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({ listed: [] }) },
      { now: NOW },
    );
    expect(report.provenAbsent).toBe(1);
    expect(db.rows[0]!["status"]).toBe("FAILED");
    expect(db.rows[0]!["activeClientIntentId"]).toBeNull();
    expect(db.rows[0]!["lastErrorKind"]).toBe("repair_proven_absent");
  });

  it("a session for a DIFFERENT attempt is not ours — still proof of absence for this one", async () => {
    const db = makeDb([attemptRow()]);
    const report = await repairUnresolvedCheckoutAttempts(
      {
        db,
        stripeSessions: lookup({
          listed: [session({ metadataAttemptId: "ca_99999999-8888-4777-8666-555544443333" })],
        }),
      },
      { now: NOW },
    );
    expect(report.provenAbsent).toBe(1);
  });

  it("FAILS CLOSED on a lookup error: attempt left untouched for the next pass", async () => {
    const db = makeDb([attemptRow()]);
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({ listError: new Error("stripe down") }) },
      { now: NOW },
    );
    expect(report.errors).toBe(1);
    expect(db.rows[0]!["status"]).toBe("AMBIGUOUS");
    expect(db.rows[0]!["activeClientIntentId"]).toBe(INTENT);
  });

  it("leaves YOUNG unresolved attempts alone (their request may still be running)", async () => {
    const young = attemptRow({ updatedAt: new Date(NOW.getTime() - 1000) });
    const db = makeDb([young]);
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({ listed: [] }) },
      { now: NOW },
    );
    expect(report.scanned).toBe(0);
    expect(db.rows[0]!["status"]).toBe("AMBIGUOUS");
  });

  it("uses the FAST PATH for a bound session id (missed webhook): retrieve → converge", async () => {
    const db = makeDb([
      attemptRow({
        status: "SESSION_CREATED",
        stripeSessionId: "cs_bound",
        expiresAt: new Date(NOW.getTime() - 1000), // past TTL → drift scan picks it up
      }),
    ]);
    const report = await repairUnresolvedCheckoutAttempts(
      {
        db,
        stripeSessions: lookup({
          retrieved: { cs_bound: session({ id: "cs_bound", status: "expired" }) },
        }),
      },
      { now: NOW },
    );
    expect(report.expired).toBe(1);
    expect(db.rows[0]!["status"]).toBe("EXPIRED");
    expect(db.rows[0]!["activeClientIntentId"]).toBeNull();
  });

  it("no customer id: EXPIRED only past expiresAt + a FULL session lifetime (time is proof only then)", async () => {
    // Past TTL but a session minted late in the attempt's life could STILL be
    // open — elapsed time alone is not proof yet (directive 5.3).
    const pastTtlOnly = attemptRow({
      customerId: null,
      expiresAt: new Date(NOW.getTime() - 1000),
    });
    // Past TTL + full session lifetime: every session this attempt could have
    // created has itself died — time IS proof now.
    const beyondAnySession = attemptRow({
      id: "ca_22222222-3333-4444-8555-666677778888",
      activeClientIntentId: null,
      originalClientIntentId: null,
      customerId: null,
      expiresAt: new Date(NOW.getTime() - CHECKOUT_SESSION_MAX_LIFETIME_MS - 1000),
    });
    // Within TTL: wait, do not guess.
    const fresh = attemptRow({
      id: "ca_33333333-4444-4555-8666-777788889999",
      activeClientIntentId: null,
      originalClientIntentId: null,
      customerId: null,
    });
    const db = makeDb([pastTtlOnly, beyondAnySession, fresh]);
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({}) },
      { now: NOW },
    );
    expect(report.expired).toBe(1);
    expect(report.unresolved).toBe(2);
    expect(db.rows[0]!["status"]).toBe("AMBIGUOUS"); // held — a session may still be payable
    expect(db.rows[0]!["activeClientIntentId"]).toBe(INTENT);
    expect(db.rows[1]!["status"]).toBe("EXPIRED");
    expect(db.rows[1]!["activeClientIntentId"]).toBeNull();
    expect(db.rows[2]!["status"]).toBe("AMBIGUOUS");
  });

  it("a correctly bound, STILL-OPEN session past attempt TTL is counted openPastTtl and left untouched", async () => {
    const row = attemptRow({
      status: "SESSION_CREATED",
      stripeSessionId: "cs_bound",
      expiresAt: new Date(NOW.getTime() - 1000),
    });
    const db = makeDb([row]);
    const report = await repairUnresolvedCheckoutAttempts(
      {
        db,
        stripeSessions: lookup({
          retrieved: { cs_bound: session({ id: "cs_bound", status: "open" }) },
        }),
      },
      { now: NOW },
    );
    // NOT counted as a repair success — nothing was repaired.
    expect(report.rebound).toBe(0);
    expect(report.openPastTtl).toBe(1);
    expect(db.rows[0]!["status"]).toBe("SESSION_CREATED");
    expect(db.rows[0]!["stripeSessionId"]).toBe("cs_bound");
    expect(db.rows[0]!["activeClientIntentId"]).toBe(INTENT); // key retained — session payable
  });

  it("a bound session Stripe reports missing with NO metadata match converges FAILED (no infinite rescan)", async () => {
    const row = attemptRow({
      status: "SESSION_CREATED",
      stripeSessionId: "cs_ghost", // retrieveSession → null (resource_missing)
      expiresAt: new Date(NOW.getTime() - 1000),
    });
    const db = makeDb([row]);
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({ listed: [] }) },
      { now: NOW },
    );
    expect(report.provenAbsent).toBe(1);
    expect(db.rows[0]!["status"]).toBe("FAILED");
    expect(db.rows[0]!["activeClientIntentId"]).toBeNull();
    expect(db.rows[0]!["lastErrorKind"]).toBe("repair_proven_absent");
  });

  it("counts a concurrently-advanced row as raced, never as a fake success", async () => {
    const row = attemptRow({ status: "AMBIGUOUS" });
    const db = makeDb([row]);
    // Between the scan and the update another writer completes the attempt.
    const innerUpdateMany = db.checkoutAttempt.updateMany.bind(db.checkoutAttempt);
    db.checkoutAttempt.updateMany = async (args) => {
      row["status"] = "COMPLETED"; // webhook won the race
      return innerUpdateMany(args);
    };
    const report = await repairUnresolvedCheckoutAttempts(
      { db, stripeSessions: lookup({ listed: [] }) },
      { now: NOW },
    );
    expect(report.provenAbsent).toBe(0);
    expect(report.raced).toBe(1);
    expect(db.rows[0]!["status"]).toBe("COMPLETED");
  });

  it("surfaces unresolved attempts to the DURABLE owner queue (directive 5.3)", async () => {
    const held = attemptRow({
      customerId: null,
      expiresAt: new Date(NOW.getTime() - 1000), // past TTL, within session lifetime
    });
    const errored = attemptRow({
      id: "ca_44444444-5555-4666-8777-888899990000",
      activeClientIntentId: null,
      originalClientIntentId: null,
    });
    const db = makeDb([held, errored]);
    const surfaced: Array<{ attemptId: string; status: string; reason: string }> = [];
    const report = await repairUnresolvedCheckoutAttempts(
      {
        db,
        stripeSessions: {
          async listSessionsByCustomerSince(customerId) {
            if (customerId === "cus_1") throw new Error("stripe down");
            return [];
          },
          async retrieveSession() {
            return null;
          },
        },
        ownerQueue: {
          async surfaceUnresolvedAttempt(entry) {
            surfaced.push(entry);
          },
        },
      },
      { now: NOW },
    );
    expect(report.unresolved).toBe(1);
    expect(report.errors).toBe(1);
    expect(surfaced).toHaveLength(2);
    expect(surfaced.map((s) => s.attemptId).sort()).toEqual(
      [held["id"], errored["id"]].map(String).sort(),
    );
  });

  it("an owner-queue write failure never aborts or masks the pass", async () => {
    const held = attemptRow({
      customerId: null,
      expiresAt: new Date(NOW.getTime() - 1000),
    });
    const db = makeDb([held]);
    const report = await repairUnresolvedCheckoutAttempts(
      {
        db,
        stripeSessions: lookup({}),
        ownerQueue: {
          async surfaceUnresolvedAttempt() {
            throw new Error("queue down");
          },
        },
      },
      { now: NOW },
    );
    expect(report.unresolved).toBe(1);
    expect(db.rows[0]!["status"]).toBe("AMBIGUOUS"); // reconciliation state unaffected
  });
});
