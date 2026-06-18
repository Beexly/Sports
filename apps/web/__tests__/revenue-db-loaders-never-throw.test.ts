/**
 * Never-throw / honest-degradation tests for DB-backed revenue loaders and
 * the go-live readiness aggregator.
 *
 * All DB reads are mocked to throw so we can assert that each loader:
 *   - NEVER throws / rejects itself
 *   - Degrades to the honest-empty shape (null counts, "unavailable"/"unknown"
 *     data modes) rather than fabricated zeros or fake "ready" statuses
 *   - Reports env-var PRESENCE accurately without leaking values
 *
 * No real DB or network involved.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Shared DB mock ────────────────────────────────────────────────────────────

const mockDb = {
  newsletterSubscriber: {
    count: vi.fn<() => Promise<number>>(),
    upsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  },
  askGalaxySubmission: {
    count: vi.fn<() => Promise<number>>(),
    groupBy: vi.fn<(args: unknown) => Promise<unknown[]>>(),
    create: vi.fn<(args: unknown) => Promise<unknown>>(),
  },
  pick: {
    count: vi.fn<(args?: unknown) => Promise<number>>(),
  },
  $queryRaw: vi.fn<() => Promise<unknown>>(),
};

vi.mock("@sports/db", () => ({
  db: mockDb,
}));

// ── revenue-loader ────────────────────────────────────────────────────────────

describe("loadRevenueState — never-throw, honest degradation", () => {
  const ORIG_ENV = { ...process.env };

  afterEach(() => {
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIG_ENV)) delete process.env[key];
    }
    Object.assign(process.env, ORIG_ENV);
    vi.resetModules();
  });

  it("returns dataMode='unavailable' when STRIPE_SECRET_KEY is absent (never throws)", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    const { loadRevenueState } = await import("../lib/revenue/revenue-loader");
    const state = await loadRevenueState(new Date("2026-06-18T00:00:00Z"));

    expect(state.dataMode).toBe("unavailable");
    expect(state.subscriptions.paidSubscribers).toBeNull();
    expect(state.subscriptions.mrr).toBeNull();
    expect(state.subscriptions.arr).toBeNull();
    expect(typeof state.note).toBe("string");
    expect(state.note.length).toBeGreaterThan(0);
  });

  it("always returns lanes and activation list regardless of Stripe state", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    const { loadRevenueState } = await import("../lib/revenue/revenue-loader");
    const state = await loadRevenueState();

    expect(state.lanes.length).toBeGreaterThan(0);
    expect(state.activation.length).toBeGreaterThan(0);
  });

  it("loadedAtIso is an ISO timestamp string", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    const { loadRevenueState } = await import("../lib/revenue/revenue-loader");
    const now = new Date("2026-06-18T12:00:00Z");
    const state = await loadRevenueState(now);

    expect(state.loadedAtIso).toBe(now.toISOString());
  });

  it("activation items report only env-var presence (never the key value)", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    process.env["DATABASE_URL"] = "some-connection-string";
    const { loadRevenueState } = await import("../lib/revenue/revenue-loader");
    const state = await loadRevenueState();

    for (const item of state.activation) {
      // key is the env var name — a plain string
      expect(typeof item.key).toBe("string");
      // present is a boolean — not the actual value
      expect(typeof item.present).toBe("boolean");
      // why is a human-readable explanation — not the key value
      expect(typeof item.why).toBe("string");
    }

    const dbItem = state.activation.find((a) => a.key === "DATABASE_URL");
    expect(dbItem).toBeDefined();
    expect(dbItem!.present).toBe(true);
    // The actual connection string must NOT appear in the activation output
    expect(JSON.stringify(state.activation)).not.toContain("some-connection-string");
  });

  it("env-var absent → present=false, env-var set → present=true", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    process.env["THE_ODDS_API_KEY"] = "test-key";
    const { loadRevenueState } = await import("../lib/revenue/revenue-loader");
    const state = await loadRevenueState();

    const anthropicItem = state.activation.find((a) => a.key === "ANTHROPIC_API_KEY");
    expect(anthropicItem?.present).toBe(false);

    const oddsItem = state.activation.find((a) => a.key === "THE_ODDS_API_KEY");
    expect(oddsItem?.present).toBe(true);
  });

  it("all lanes have required fields (priority, name, status, ownerAgent, nextAction)", async () => {
    delete process.env["STRIPE_SECRET_KEY"];
    const { loadRevenueState } = await import("../lib/revenue/revenue-loader");
    const state = await loadRevenueState();

    const VALID_STATUSES = ["not_started", "scaffolding", "in_progress", "active", "paused"];
    for (const lane of state.lanes) {
      expect(typeof lane.priority).toBe("number");
      expect(lane.priority).toBeGreaterThanOrEqual(1);
      expect(typeof lane.name).toBe("string");
      expect(VALID_STATUSES).toContain(lane.status);
      expect(typeof lane.ownerAgent).toBe("string");
      expect(typeof lane.nextAction).toBe("string");
    }
  });
});

// ── customer-proof loader ─────────────────────────────────────────────────────

describe("loadCustomerProofState — never-throw, honest degradation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns dataMode='unavailable' when all DB reads throw (never throws)", async () => {
    mockDb.newsletterSubscriber.count.mockRejectedValue(new Error("DB down"));
    mockDb.askGalaxySubmission.count.mockRejectedValue(new Error("DB down"));
    mockDb.askGalaxySubmission.groupBy.mockRejectedValue(new Error("DB down"));

    vi.resetModules();
    const { loadCustomerProofState } = await import("../lib/revenue/customer-proof");
    const state = await loadCustomerProofState(new Date("2026-06-18T00:00:00Z"));

    expect(state.dataMode).toBe("unavailable");
    expect(state.emailSignups).toBeNull();
    expect(state.askGalaxyTotal).toBeNull();
    expect(state.classification).toBeNull();
  });

  it("emailSignups and askGalaxyTotal are null (not 0) when DB throws", async () => {
    mockDb.newsletterSubscriber.count.mockRejectedValue(new Error("DB error"));
    mockDb.askGalaxySubmission.count.mockRejectedValue(new Error("DB error"));
    mockDb.askGalaxySubmission.groupBy.mockRejectedValue(new Error("DB error"));

    vi.resetModules();
    const { loadCustomerProofState } = await import("../lib/revenue/customer-proof");
    const state = await loadCustomerProofState();

    // null = unknown, NOT 0 (0 would be a fabricated fact)
    expect(state.emailSignups).toBeNull();
    expect(state.askGalaxyTotal).toBeNull();
  });

  it("funnel contains both db and analytics stage kinds", async () => {
    mockDb.newsletterSubscriber.count.mockResolvedValue(5);
    mockDb.askGalaxySubmission.count.mockResolvedValue(3);
    mockDb.askGalaxySubmission.groupBy.mockResolvedValue([]);

    vi.resetModules();
    const { loadCustomerProofState } = await import("../lib/revenue/customer-proof");
    const state = await loadCustomerProofState();

    const kinds = state.funnel.map((s) => s.kind);
    expect(kinds).toContain("db");
    expect(kinds).toContain("analytics");
  });

  it("dataMode='live' only when all three DB reads succeed", async () => {
    mockDb.newsletterSubscriber.count.mockResolvedValue(10);
    mockDb.askGalaxySubmission.count.mockResolvedValue(7);
    mockDb.askGalaxySubmission.groupBy.mockResolvedValue([]);

    vi.resetModules();
    const { loadCustomerProofState } = await import("../lib/revenue/customer-proof");
    const state = await loadCustomerProofState();

    expect(state.dataMode).toBe("live");
    expect(state.emailSignups).toBe(10);
    expect(state.askGalaxyTotal).toBe(7);
  });

  it("dataMode='partial' when only some DB reads succeed", async () => {
    mockDb.newsletterSubscriber.count.mockResolvedValue(5);
    mockDb.askGalaxySubmission.count.mockRejectedValue(new Error("DB error"));
    mockDb.askGalaxySubmission.groupBy.mockRejectedValue(new Error("DB error"));

    vi.resetModules();
    const { loadCustomerProofState } = await import("../lib/revenue/customer-proof");
    const state = await loadCustomerProofState();

    expect(state.dataMode).toBe("partial");
    expect(state.emailSignups).toBe(5);
    expect(state.askGalaxyTotal).toBeNull();
    expect(state.classification).toBeNull();
  });

  it("loadedAtIso matches the injected now timestamp", async () => {
    mockDb.newsletterSubscriber.count.mockResolvedValue(0);
    mockDb.askGalaxySubmission.count.mockResolvedValue(0);
    mockDb.askGalaxySubmission.groupBy.mockResolvedValue([]);

    vi.resetModules();
    const { loadCustomerProofState } = await import("../lib/revenue/customer-proof");
    const now = new Date("2026-06-18T08:00:00Z");
    const state = await loadCustomerProofState(now);

    expect(state.loadedAtIso).toBe(now.toISOString());
  });
});

// ── go-live readiness aggregator ──────────────────────────────────────────────

describe("loadGoLiveReadiness — never-throw, honest degradation", () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in ORIG_ENV)) delete process.env[key];
    }
    Object.assign(process.env, ORIG_ENV);
    vi.resetModules();
  });

  it("never throws even when DB is completely unreachable", async () => {
    process.env["DATABASE_URL"] = "postgresql://bad-host/bad-db";
    mockDb.$queryRaw.mockRejectedValue(new Error("Connection refused"));
    mockDb.pick.count.mockRejectedValue(new Error("Connection refused"));

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    await expect(loadGoLiveReadiness()).resolves.toBeDefined();
  });

  it("DB-unreachable → 'unknown' status for db_reachable check, not 'ready'", async () => {
    process.env["DATABASE_URL"] = "postgresql://bad-host/bad-db";
    mockDb.$queryRaw.mockRejectedValue(new Error("Connection refused"));
    mockDb.pick.count.mockRejectedValue(new Error("Connection refused"));

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const readiness = await loadGoLiveReadiness();

    const allChecks = readiness.groups.flatMap((g) => g.checks);
    const dbReachCheck = allChecks.find((c) => c.id === "infra_db_reachable");
    expect(dbReachCheck).toBeDefined();
    // An unreachable DB with DATABASE_URL set must be "unknown", never "ready"
    expect(dbReachCheck!.status).toBe("unknown");
    expect(dbReachCheck!.status).not.toBe("ready");
  });

  it("DATABASE_URL absent → db check is action_needed (not unknown, not ready)", async () => {
    delete process.env["DATABASE_URL"];

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const readiness = await loadGoLiveReadiness();

    const allChecks = readiness.groups.flatMap((g) => g.checks);
    // infra_database_url check
    const dbUrlCheck = allChecks.find((c) => c.id === "infra_database_url");
    expect(dbUrlCheck).toBeDefined();
    expect(dbUrlCheck!.status).toBe("action_needed");

    // infra_db_reachable check (db probe)
    const dbReachCheck = allChecks.find((c) => c.id === "infra_db_reachable");
    expect(dbReachCheck).toBeDefined();
    expect(dbReachCheck!.status).toBe("action_needed");
  });

  it("returns groups, totalCount, readyCount, and blocking arrays always", async () => {
    delete process.env["DATABASE_URL"];
    delete process.env["STRIPE_SECRET_KEY"];

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const readiness = await loadGoLiveReadiness();

    expect(Array.isArray(readiness.groups)).toBe(true);
    expect(readiness.groups.length).toBeGreaterThan(0);
    expect(typeof readiness.totalCount).toBe("number");
    expect(typeof readiness.readyCount).toBe("number");
    expect(Array.isArray(readiness.blocking)).toBe(true);
    // blocking IDs are a subset of action_needed checks
    const allChecks = readiness.groups.flatMap((g) => g.checks);
    const actionNeededIds = allChecks
      .filter((c) => c.status === "action_needed")
      .map((c) => c.id);
    for (const id of readiness.blocking) {
      expect(actionNeededIds).toContain(id);
    }
  });

  it("totalCount == sum of all checks across groups", async () => {
    delete process.env["DATABASE_URL"];

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const readiness = await loadGoLiveReadiness();

    const countFromGroups = readiness.groups.reduce(
      (n, g) => n + g.checks.length,
      0
    );
    expect(readiness.totalCount).toBe(countFromGroups);
  });

  it("readyCount matches actual number of 'ready' checks", async () => {
    delete process.env["DATABASE_URL"];

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const readiness = await loadGoLiveReadiness();

    const allChecks = readiness.groups.flatMap((g) => g.checks);
    const actualReadyCount = allChecks.filter((c) => c.status === "ready").length;
    expect(readiness.readyCount).toBe(actualReadyCount);
  });

  it("env-var presence is reported as boolean, never exposes the key value", async () => {
    process.env["STRIPE_SECRET_KEY"] = "sk_test_secret_value_never_leak";

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const readiness = await loadGoLiveReadiness();

    const serialized = JSON.stringify(readiness);
    expect(serialized).not.toContain("sk_test_secret_value_never_leak");

    // The check status should be "ready" since key is present
    const allChecks = readiness.groups.flatMap((g) => g.checks);
    const stripeCheck = allChecks.find((c) => c.id === "billing_stripe_secret");
    expect(stripeCheck?.status).toBe("ready");
  });

  it("loadedAtIso matches the injected now timestamp", async () => {
    delete process.env["DATABASE_URL"];
    mockDb.$queryRaw.mockResolvedValue([]);

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const now = new Date("2026-06-18T10:00:00Z");
    const readiness = await loadGoLiveReadiness(now);

    expect(readiness.loadedAtIso).toBe(now.toISOString());
  });

  it("every check has id, label, status, detail fields", async () => {
    delete process.env["DATABASE_URL"];

    vi.resetModules();
    const { loadGoLiveReadiness } = await import("../lib/go-live/readiness");
    const readiness = await loadGoLiveReadiness();

    const allChecks = readiness.groups.flatMap((g) => g.checks);
    expect(allChecks.length).toBeGreaterThan(0);
    for (const check of allChecks) {
      expect(typeof check.id).toBe("string");
      expect(check.id.length).toBeGreaterThan(0);
      expect(typeof check.label).toBe("string");
      expect(["ready", "action_needed", "unknown"]).toContain(check.status);
      expect(typeof check.detail).toBe("string");
      expect(check.detail.length).toBeGreaterThan(0);
      // ownerAction is string or null
      expect(
        check.ownerAction === null || typeof check.ownerAction === "string"
      ).toBe(true);
    }
  });
});
