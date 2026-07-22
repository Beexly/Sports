/**
 * Settlement outbox worker — hardened two-layer state machine tests
 * (directive section 6: 6.4 delivery rows, 6.5 lease fencing + attempt cap,
 * 6.6 frozen payload + materialized recipients, 6.7 honest errors,
 * 6.8 latency percentiles, 6.9 expired-subscription removal).
 *
 * Uses an in-memory fake of the structural SettlementOutboxDb surface so
 * the claim/lease/backoff machine is exercised end to end (multiple drains,
 * races, crash recovery) without a real database. The real-Postgres
 * concurrency proof lives in scripts/integration/settlement-outbox-acceptance.mjs.
 */

import { describe, expect, it } from "vitest";
import {
  drainSettlementOutbox,
  getSettlementOutboxHealth,
  latencyPercentiles,
  computeNextAttemptAt,
  OUTBOX_MAX_ATTEMPTS,
  TERMINAL_DELIVERY_STATUSES,
  type OutboxDeps,
} from "./worker";

// ── In-memory fake db over the structural surface ─────────────────────────

type Row = Record<string, unknown>;

function matches(row: Row, where: Record<string, unknown>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === "OR") {
      const ors = cond as Array<Record<string, unknown>>;
      if (!ors.some((c) => matches(row, c))) return false;
      continue;
    }
    const value = row[key];
    if (cond !== null && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as Record<string, unknown>;
      if ("in" in c && !(c["in"] as unknown[]).includes(value)) return false;
      if ("lt" in c && !(value instanceof Date && value < (c["lt"] as Date))) return false;
      if ("lte" in c && !(value instanceof Date && value <= (c["lte"] as Date))) return false;
      continue;
    }
    if (cond instanceof Date && value instanceof Date) {
      if (cond.getTime() !== value.getTime()) return false;
      continue;
    }
    if (value !== cond) return false;
  }
  return true;
}

function applyData(row: Row, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date) &&
      !Array.isArray(value) &&
      "increment" in (value as Row)
    ) {
      row[key] = (row[key] as number) + ((value as Row)["increment"] as number);
    } else {
      row[key] = value;
    }
  }
}

function makeTable(rows: Row[], uniqueKeys: string[] = []) {
  return {
    rows,
    findMany: async (args: {
      where: Record<string, unknown>;
      orderBy?: Record<string, unknown>;
      take?: number;
      select?: Record<string, unknown>;
    }) => {
      let out = rows.filter((r) => matches(r, args.where));
      if (args.orderBy) {
        const [k, dir] = Object.entries(args.orderBy)[0] as [string, string];
        out = [...out].sort((a, b) => {
          const av = a[k] as Date | number;
          const bv = b[k] as Date | number;
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return dir === "asc" ? cmp : -cmp;
        });
      }
      if (args.take !== undefined) out = out.slice(0, args.take);
      return out;
    },
    updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (const row of rows) {
        if (matches(row, args.where)) {
          applyData(row, args.data);
          count++;
        }
      }
      return { count };
    },
    createMany: async (args: { data: Row[]; skipDuplicates: boolean }) => {
      let count = 0;
      for (const incoming of args.data) {
        const dupe = uniqueKeys.some((k) => rows.some((existing) => existing[k] === incoming[k]));
        if (dupe && args.skipDuplicates) continue;
        if (dupe) throw new Error(`unique violation on ${uniqueKeys.join(",")}`);
        rows.push({
          id: `row-${rows.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date(),
          ...incoming,
        });
        count++;
      }
      return { count };
    },
    count: async (args: { where: Record<string, unknown> }) =>
      rows.filter((r) => matches(r, args.where)).length,
    deleteMany: async (args: { where: Record<string, unknown> }) => {
      let count = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if (matches(rows[i] as Row, args.where)) {
          rows.splice(i, 1);
          count++;
        }
      }
      return { count };
    },
  };
}

interface FakeDbSeed {
  events?: Row[];
  deliveries?: Row[];
  picks?: Row[];
  watchlists?: Row[];
  users?: Row[];
  subscriptions?: Row[];
}

function makeDb(seed: FakeDbSeed) {
  const events = makeTable(seed.events ?? []);
  const deliveries = makeTable(seed.deliveries ?? [], ["idempotencyKey"]);
  const picks = seed.picks ?? [];
  const watchlists = makeTable(seed.watchlists ?? []);
  const users = makeTable(seed.users ?? []);
  const subscriptions = makeTable(seed.subscriptions ?? []);
  return {
    pickSettlementEvent: events,
    pickSettlementDelivery: deliveries,
    pick: {
      findUnique: async (args: { where: { id: string } }) =>
        (picks.find((p) => p["id"] === args.where.id) as Row | undefined) ?? null,
    },
    watchlist: watchlists,
    user: users,
    pushSubscription: subscriptions,
    _tables: { events, deliveries, watchlists, users, subscriptions },
  };
}

const NOW = new Date("2026-07-22T18:00:00.000Z");
const SETTLED_AT = new Date("2026-07-22T17:55:00.000Z");

function decisiveEvent(overrides: Row = {}): Row {
  return {
    id: "evt-1",
    pickId: "pick-1",
    gameId: "game-1",
    result: "WIN",
    settledAt: SETTLED_AT,
    status: "PENDING",
    payload: null,
    createdAt: new Date("2026-07-22T17:56:00.000Z"),
    ...overrides,
  };
}

function pickRow(): Row {
  return {
    id: "pick-1",
    pickType: "SPREAD",
    selection: "Lakers -3.5",
    game: {
      id: "game-1",
      homeTeamId: "team-home",
      awayTeamId: "team-away",
      homeTeamName: "Lakers",
      awayTeamName: "Celtics",
      sport: { key: "basketball_nba" },
    },
  };
}

function eliteDeps(overrides: Partial<OutboxDeps> = {}): Partial<OutboxDeps> {
  return {
    getEntitlements: async () => ({ canGetAlerts: true }),
    sendPush: async () => ({ sent: true, detail: "sent", classification: "sent" }),
    sendEmail: async () => ({ sent: true, detail: "sent", classification: "sent" }),
    pushConfigured: () => true,
    emailConfigured: () => true,
    alertsEnabled: () => true,
    leaseOwner: "worker:test",
    random: () => 0,
    ...overrides,
  };
}

function seedFollowerWorld(extra: FakeDbSeed = {}) {
  return makeDb({
    events: [decisiveEvent()],
    picks: [pickRow()],
    watchlists: [{ id: "w-1", userId: "user-1", entityType: "TEAM", entityId: "team-home" }],
    users: [{ id: "user-1", email: "elite@example.com", emailVerified: new Date("2026-01-01") }],
    subscriptions: [
      { id: "sub-1", userId: "user-1", endpoint: "https://push/1", p256dh: "k", auth: "a" },
    ],
    ...extra,
  });
}

describe("expansion (6.4/6.6)", () => {
  it("freezes the payload and materializes one delivery per channel destination", async () => {
    const db = makeDb({
      events: [decisiveEvent()],
      picks: [pickRow()],
      watchlists: [{ id: "w-1", userId: "user-1", entityType: "TEAM", entityId: "team-home" }],
      users: [{ id: "user-1", email: "elite@example.com", emailVerified: new Date() }],
      subscriptions: [
        { id: "sub-1", userId: "user-1", endpoint: "e1", p256dh: "k", auth: "a" },
        { id: "sub-2", userId: "user-1", endpoint: "e2", p256dh: "k", auth: "a" },
      ],
    });
    const summary = await drainSettlementOutbox(db, eliteDeps(), NOW);

    expect(summary.expandedEvents).toBe(1);
    const event = db._tables.events.rows[0] as Row;
    expect(["EXPANDED", "DELIVERED"]).toContain(event["status"]);
    const payload = event["payload"] as Row;
    expect(payload["selection"]).toBe("Lakers -3.5");
    expect(payload["result"]).toBe("WIN");
    expect(payload["schemaVersion"]).toBe(1);
    expect(event["recipientsMaterializedAt"]).toBeInstanceOf(Date);

    // 2 push destinations + 1 email destination = 3 delivery rows.
    const deliveries = db._tables.deliveries.rows;
    expect(deliveries).toHaveLength(3);
    const keys = deliveries.map((d) => d["idempotencyKey"]);
    expect(new Set(keys).size).toBe(3);
    expect(deliveries.filter((d) => d["channel"] === "push")).toHaveLength(2);
    expect(deliveries.filter((d) => d["channel"] === "email")).toHaveLength(1);
    // No raw email address on any delivery row.
    for (const d of deliveries) {
      expect(String(d["destinationId"])).not.toContain("@");
    }
  });

  it("expansion is idempotent: a second drain adds no duplicate delivery rows", async () => {
    const db = seedFollowerWorld();
    await drainSettlementOutbox(
      db,
      eliteDeps({
        sendPush: async () => ({ sent: false, detail: "send_failed", classification: "retryable" }),
      }),
      NOW,
    );
    const countAfterFirst = db._tables.deliveries.rows.length;
    // Force the event back to PENDING to simulate a crashed expander retry.
    (db._tables.events.rows[0] as Row)["status"] = "PENDING";
    await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(db._tables.deliveries.rows.length).toBe(countAfterFirst);
  });

  it("a VOID settlement completes with zero deliveries — receipts, not alerts", async () => {
    const db = makeDb({ events: [decisiveEvent({ result: "VOID" })], picks: [pickRow()] });
    const summary = await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(summary.expandedEvents).toBe(1);
    expect(db._tables.deliveries.rows).toHaveLength(0);
    const event = db._tables.events.rows[0] as Row;
    expect(event["status"]).toBe("DELIVERED");
    expect(event["completedAt"]).toBeInstanceOf(Date);
  });

  it("tier-ineligible followers get honest SUPPRESSED terminal rows, never sends", async () => {
    const db = seedFollowerWorld();
    let sends = 0;
    const summary = await drainSettlementOutbox(
      db,
      eliteDeps({
        getEntitlements: async () => ({ canGetAlerts: false }),
        sendPush: async () => {
          sends++;
          return { sent: true, detail: "sent", classification: "sent" };
        },
      }),
      NOW,
    );
    expect(sends).toBe(0);
    expect(summary.suppressed).toBeGreaterThan(0);
    for (const d of db._tables.deliveries.rows) {
      expect(d["status"]).toBe("SUPPRESSED");
      expect(d["lastErrorCode"]).toBe("tier_ineligible");
    }
  });

  it("no verified email / no push subscription is recorded as NO_RECIPIENT, not a failure", async () => {
    const db = makeDb({
      events: [decisiveEvent()],
      picks: [pickRow()],
      watchlists: [{ id: "w-1", userId: "user-1", entityType: "TEAM", entityId: "team-home" }],
      users: [{ id: "user-1", email: "unverified@example.com", emailVerified: null }],
      subscriptions: [],
    });
    const summary = await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(summary.noRecipient).toBe(2);
    const statuses = db._tables.deliveries.rows.map((d) => d["status"]);
    expect(statuses).toEqual(["NO_RECIPIENT", "NO_RECIPIENT"]);
  });

  it("a user who follows AFTER expansion never receives the historical alert", async () => {
    const db = seedFollowerWorld();
    await drainSettlementOutbox(db, eliteDeps(), NOW);
    const before = db._tables.deliveries.rows.length;
    // Late follower appears after materialization.
    db._tables.watchlists.rows.push({
      id: "w-late",
      userId: "user-late",
      entityType: "TEAM",
      entityId: "team-home",
    });
    db._tables.users.rows.push({
      id: "user-late",
      email: "late@example.com",
      emailVerified: new Date(),
    });
    await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(db._tables.deliveries.rows.length).toBe(before);
  });
});

describe("delivery + lease fencing (6.5)", () => {
  it("claim → send → DELIVERED with latency captured; success is terminal and never re-claimed", async () => {
    const db = seedFollowerWorld();
    const summary = await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(summary.delivered).toBe(2); // 1 push + 1 email
    expect(summary.latency.p50).not.toBeNull();

    let resent = 0;
    const again = await drainSettlementOutbox(
      db,
      eliteDeps({
        sendPush: async () => {
          resent++;
          return { sent: true, detail: "sent", classification: "sent" };
        },
        sendEmail: async () => {
          resent++;
          return { sent: true, detail: "sent", classification: "sent" };
        },
      }),
      new Date(NOW.getTime() + 60_000),
    );
    expect(resent).toBe(0);
    expect(again.delivered).toBe(0);
    for (const d of db._tables.deliveries.rows) {
      expect(d["status"]).toBe("DELIVERED");
      expect(d["latencyMs"]).toBeGreaterThanOrEqual(0);
    }
  });

  it("partial failure retries ONLY the failed delivery — the delivered recipient is never resent", async () => {
    const db = seedFollowerWorld();
    await drainSettlementOutbox(
      db,
      eliteDeps({
        sendPush: async () => ({
          sent: false,
          detail: "send_failed",
          classification: "retryable",
          statusCode: 503,
        }),
      }),
      NOW,
    );
    const emailRow = db._tables.deliveries.rows.find((d) => d["channel"] === "email") as Row;
    const pushRow = db._tables.deliveries.rows.find((d) => d["channel"] === "push") as Row;
    expect(emailRow["status"]).toBe("DELIVERED");
    expect(pushRow["status"]).toBe("RETRYABLE_FAILED");
    expect(pushRow["nextAttemptAt"]).toBeInstanceOf(Date);

    // Retry pass after backoff: push retried, email untouched.
    let emailResends = 0;
    const later = new Date((pushRow["nextAttemptAt"] as Date).getTime() + 1000);
    const summary = await drainSettlementOutbox(
      db,
      eliteDeps({
        sendEmail: async () => {
          emailResends++;
          return { sent: true, detail: "sent", classification: "sent" };
        },
      }),
      later,
    );
    expect(emailResends).toBe(0);
    expect(summary.delivered).toBe(1);
    expect(pushRow["status"]).toBe("DELIVERED");
  });

  it("the attempt cap is a true invariant: a retryable failure at the cap dead-letters", async () => {
    const db = seedFollowerWorld();
    const failingDeps = eliteDeps({
      sendPush: async () => ({
        sent: false,
        detail: "send_failed",
        classification: "retryable",
        statusCode: 500,
      }),
      sendEmail: async () => ({ sent: false, detail: "send_failed", classification: "retryable" }),
    });
    let cursor = NOW;
    for (let i = 0; i < OUTBOX_MAX_ATTEMPTS + 3; i++) {
      await drainSettlementOutbox(db, failingDeps, cursor);
      cursor = new Date(cursor.getTime() + 2 * 60 * 60 * 1000);
    }
    for (const d of db._tables.deliveries.rows) {
      expect(d["status"]).toBe("DEAD_LETTER");
      expect(d["attemptCount"]).toBe(OUTBOX_MAX_ATTEMPTS);
    }
  });

  it("stale CLAIMED below the cap → RETRYABLE_FAILED with backoff; AT the cap → DEAD_LETTER, never PENDING", async () => {
    const staleLease = new Date(NOW.getTime() - 60_000);
    const db = makeDb({
      events: [
        decisiveEvent({
          id: "evt-1",
          status: "EXPANDED",
          payload: {
            schemaVersion: 1,
            selection: "X",
            result: "WIN",
            homeTeam: { id: "t", name: "T" },
            awayTeam: { id: null, name: "A" },
          },
        }),
      ],
      deliveries: [
        {
          id: "d-below",
          eventId: "evt-1",
          userId: "u",
          channel: "email",
          destinationId: "h",
          idempotencyKey: "k1",
          status: "CLAIMED",
          attemptCount: 2,
          claimVersion: 2,
          leaseToken: "tok-dead",
          leaseOwner: "worker:crashed",
          leaseExpiresAt: staleLease,
          attemptHistory: [],
          createdAt: NOW,
        },
        {
          id: "d-cap",
          eventId: "evt-1",
          userId: "u",
          channel: "push",
          destinationId: "s",
          idempotencyKey: "k2",
          status: "CLAIMED",
          attemptCount: OUTBOX_MAX_ATTEMPTS,
          claimVersion: 5,
          leaseToken: "tok-dead2",
          leaseOwner: "worker:crashed",
          leaseExpiresAt: staleLease,
          attemptHistory: [],
          createdAt: NOW,
        },
      ],
    });
    const summary = await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(summary.reclaimedStale).toBe(1);
    expect(summary.deadLetteredStale).toBe(1);
    const below = db._tables.deliveries.rows.find((d) => d["id"] === "d-below") as Row;
    const cap = db._tables.deliveries.rows.find((d) => d["id"] === "d-cap") as Row;
    expect(cap["status"]).toBe("DEAD_LETTER");
    expect(cap["lastErrorCode"]).toBe("stale_claim_at_attempt_cap");
    // The below-cap row was recovered (and possibly retried later — but
    // never silently reset to PENDING).
    expect(below["status"]).not.toBe("PENDING");
    expect(["RETRYABLE_FAILED", "DELIVERED", "PERMANENT_FAILED"]).toContain(below["status"]);
  });

  it("a stale worker cannot overwrite a newer claimant's result (token-scoped writes)", async () => {
    // Simulate: the claim succeeds, but before the result is recorded a
    // competing recovery re-leases the row (leaseToken changes) — the
    // original result write must match zero rows and count as lostLease.
    const db = seedFollowerWorld();
    const rawUpdateMany = db.pickSettlementDelivery.updateMany;
    let firstClaimDone = false;
    db.pickSettlementDelivery.updateMany = async (args) => {
      const res = await rawUpdateMany(args);
      if (!firstClaimDone && (args.data as Row)["status"] === "CLAIMED" && res.count === 1) {
        firstClaimDone = true;
        const claimedRow = db._tables.deliveries.rows.find(
          (d) => d["status"] === "CLAIMED",
        ) as Row;
        claimedRow["leaseToken"] = "stolen-by-newer-claimant";
      }
      return res;
    };
    const summary = await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(summary.lostLease).toBeGreaterThanOrEqual(1);
    const stolen = db._tables.deliveries.rows.find(
      (d) => d["leaseToken"] === "stolen-by-newer-claimant",
    ) as Row;
    // The stolen row keeps the newer claimant's lease — the stale worker
    // did NOT record its outcome over it.
    expect(stolen["status"]).toBe("CLAIMED");
  });

  it("an expired push subscription (410) is removed and the delivery is PERMANENT_FAILED (6.9)", async () => {
    const db = seedFollowerWorld();
    const summary = await drainSettlementOutbox(
      db,
      eliteDeps({
        sendPush: async () => ({
          sent: false,
          detail: "send_failed",
          classification: "expired",
          statusCode: 410,
        }),
      }),
      NOW,
    );
    expect(summary.permanentFailed).toBe(1);
    expect(db._tables.subscriptions.rows).toHaveLength(0); // removed
    const pushRow = db._tables.deliveries.rows.find((d) => d["channel"] === "push") as Row;
    expect(pushRow["status"]).toBe("PERMANENT_FAILED");
    expect(pushRow["lastErrorCode"]).toBe("subscription_expired");
  });
});

describe("parent completion (6.4)", () => {
  it("the parent event completes ONLY when every child delivery is terminal", async () => {
    const db = seedFollowerWorld();
    // First drain with a failing push: email DELIVERED, push RETRYABLE.
    await drainSettlementOutbox(
      db,
      eliteDeps({
        sendPush: async () => ({
          sent: false,
          detail: "send_failed",
          classification: "retryable",
          statusCode: 500,
        }),
      }),
      NOW,
    );
    const event = db._tables.events.rows[0] as Row;
    expect(event["status"]).toBe("EXPANDED"); // NOT complete — child pending retry
    expect(event["completedAt"]).toBeUndefined();

    // Retry succeeds → all children terminal → parent completes.
    const pushRow = db._tables.deliveries.rows.find((d) => d["channel"] === "push") as Row;
    const later = new Date((pushRow["nextAttemptAt"] as Date).getTime() + 1000);
    const summary = await drainSettlementOutbox(db, eliteDeps(), later);
    expect(summary.completedEvents).toBe(1);
    expect(event["status"]).toBe("DELIVERED");
    expect(event["completedAt"]).toBeInstanceOf(Date);
  });

  it("terminal statuses cover every honest end state", () => {
    expect([...TERMINAL_DELIVERY_STATUSES]).toEqual([
      "DELIVERED",
      "SUPPRESSED",
      "NO_RECIPIENT",
      "PERMANENT_FAILED",
      "DEAD_LETTER",
    ]);
  });
});

describe("honest drain health (6.7)", () => {
  it("a drain-level explosion never throws and is surfaced in errors, not swallowed", async () => {
    const db = seedFollowerWorld();
    db.pickSettlementEvent.findMany = async () => {
      throw new Error("db exploded");
    };
    const summary = await drainSettlementOutbox(db, eliteDeps(), NOW);
    expect(summary.errors.length).toBeGreaterThan(0);
    expect(summary.errors.join(" ")).toContain("db exploded");
  });

  it("health reports dead letters as not-ok and old pendings as degraded", async () => {
    const db = makeDb({
      events: [decisiveEvent({ createdAt: new Date(NOW.getTime() - 12 * 60 * 60 * 1000) })],
      deliveries: [
        {
          id: "d-1",
          eventId: "evt-1",
          userId: "u",
          channel: "push",
          destinationId: "s",
          idempotencyKey: "k",
          status: "DEAD_LETTER",
          attemptCount: 5,
          claimVersion: 5,
          attemptHistory: [],
          createdAt: NOW,
        },
      ],
    });
    const health = await getSettlementOutboxHealth(db, NOW);
    expect(health.ok).toBe(false);
    expect(health.degraded).toBe(true);
    expect(health.deliveryCounts["DEAD_LETTER"]).toBe(1);
    expect(health.oldestPendingAgeMs).toBeGreaterThan(6 * 60 * 60 * 1000);
    expect(health.reasons.length).toBeGreaterThan(0);
  });

  it("a broken health query returns ok:false — absent evidence is never green", async () => {
    const health = await getSettlementOutboxHealth(
      {
        pickSettlementDelivery: {
          count: async () => {
            throw new Error("no table");
          },
        },
        pickSettlementEvent: { count: async () => 0, findMany: async () => [] },
      },
      NOW,
    );
    expect(health.ok).toBe(false);
    expect(health.reasons.join(" ")).toContain("no table");
  });
});

describe("latency + backoff primitives (6.5/6.8)", () => {
  it("latencyPercentiles is honest on empty input (nulls, not zeros)", () => {
    expect(latencyPercentiles([])).toEqual({ p50: null, p95: null, p99: null });
  });

  it("latencyPercentiles nearest-rank over a known sample", () => {
    const samples = Array.from({ length: 100 }, (_, i) => i + 1);
    const p = latencyPercentiles(samples);
    expect(p.p50).toBe(50);
    expect(p.p95).toBe(95);
    expect(p.p99).toBe(99);
  });

  it("backoff grows exponentially with jitter and caps at 60 minutes", () => {
    const base = new Date("2026-07-22T00:00:00Z");
    const a1 = computeNextAttemptAt(1, base, () => 0).getTime() - base.getTime();
    const a2 = computeNextAttemptAt(2, base, () => 0).getTime() - base.getTime();
    const a10 = computeNextAttemptAt(10, base, () => 0).getTime() - base.getTime();
    expect(a1).toBe(60_000);
    expect(a2).toBe(2 * 60_000);
    expect(a10).toBe(60 * 60_000); // capped
    const jittered = computeNextAttemptAt(1, base, () => 0.999).getTime() - base.getTime();
    expect(jittered).toBeGreaterThan(a1);
    expect(jittered).toBeLessThanOrEqual(a1 + 30_000);
  });
});

describe("append-only doctrine", () => {
  it("the drain NEVER deletes outbox events or delivery rows — only expired push subscriptions", async () => {
    const db = seedFollowerWorld();
    const eventCount = db._tables.events.rows.length;
    await drainSettlementOutbox(
      db,
      eliteDeps({
        sendPush: async () => ({
          sent: false,
          detail: "send_failed",
          classification: "expired",
          statusCode: 410,
        }),
        sendEmail: async () => ({ sent: false, detail: "send_failed", classification: "retryable" }),
      }),
      NOW,
    );
    expect(db._tables.events.rows.length).toBe(eventCount);
    expect(db._tables.deliveries.rows.length).toBeGreaterThan(0);
  });
});
