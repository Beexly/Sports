import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Server-side auth for /api/push/subscribe and /api/push/unsubscribe —
 * executed against the REAL route handlers (mocked session + db), not a
 * helper. Mirrors the pattern in __tests__/watchlist-api.test.ts.
 *
 * Invariants pinned here:
 *  - Both routes 401 with no session (CLAUDE.md rule #3: no frontend-only
 *    gating — auth is checked server-side before any DB read).
 *  - Both routes 400 on a malformed body.
 *  - subscribe is idempotent (upsert keyed on endpoint).
 *  - unsubscribe is scoped to the caller's own userId + idempotent.
 *  - A table_missing DB result degrades every route to an honest 503, not
 *    a 500.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  pushSubscriptionUpsert: vi.fn(),
  pushSubscriptionDeleteMany: vi.fn(),
}));

// P5-10 added a CSRF origin gate to /api/push/* routes. Tests must present a
// same-origin Origin header (or the CSRF guard returns 403 before auth/rate-
// limiting runs). Stub the app origin to match what the gate enforces.
const APP_ORIGIN = "https://sports.example.com";

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@sports/db", () => ({
  db: {
    pushSubscription: {
      upsert: mocks.pushSubscriptionUpsert,
      deleteMany: mocks.pushSubscriptionDeleteMany,
    },
  },
}));

import { POST as subscribeRoute } from "@/app/api/push/subscribe/route";
import { POST as unsubscribeRoute } from "@/app/api/push/unsubscribe/route";

function postRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // P5-10 CSRF gate: same-origin Origin header so the guard passes.
      origin: APP_ORIGIN,
    },
    body: JSON.stringify(body),
  });
}

function row(overrides: Partial<{ id: string; userId: string; endpoint: string; p256dh: string; auth: string; createdAt: Date }> = {}) {
  return {
    id: "push-1",
    userId: "user-1",
    endpoint: "https://push.example.com/abc",
    p256dh: "p256dh-key",
    auth: "auth-key",
    createdAt: new Date("2026-07-19T00:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.pushSubscriptionUpsert.mockReset();
  mocks.pushSubscriptionDeleteMany.mockReset();
  // P5-10 CSRF gate: the guard reads NEXT_PUBLIC_APP_URL to compare against
  // the request's Origin header. Stub it so the gate verifies same-origin.
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP_ORIGIN);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/push/subscribe", () => {
  it("unauth → 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await subscribeRoute(
      postRequest("/api/push/subscribe", {
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(mocks.pushSubscriptionUpsert).not.toHaveBeenCalled();
  });

  it("invalid body (missing keys) → 400", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await subscribeRoute(
      postRequest("/api/push/subscribe", { endpoint: "https://push.example.com/abc" }),
    );
    expect(res.status).toBe(400);
  });

  it("invalid body (non-URL endpoint) → 400", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await subscribeRoute(
      postRequest("/api/push/subscribe", {
        endpoint: "not-a-url",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("malformed JSON → 400", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await subscribeRoute(
      new Request("http://localhost/api/push/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // P5-10 CSRF gate: same-origin Origin header so the guard passes.
          origin: APP_ORIGIN,
        },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("happy path: upserts and returns 200", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.pushSubscriptionUpsert.mockResolvedValue(row());

    const res = await subscribeRoute(
      postRequest("/api/push/subscribe", {
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.endpoint).toBe("https://push.example.com/abc");
    expect(mocks.pushSubscriptionUpsert).toHaveBeenCalledWith({
      where: { endpoint: "https://push.example.com/abc" },
      create: {
        userId: "user-1",
        endpoint: "https://push.example.com/abc",
        p256dh: "p256dh-key",
        auth: "auth-key",
      },
      update: { userId: "user-1", p256dh: "p256dh-key", auth: "auth-key" },
    });
  });

  it("table_missing → honest 503, not 500", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.pushSubscriptionUpsert.mockRejectedValue({ code: "P2021" });

    const res = await subscribeRoute(
      postRequest("/api/push/subscribe", {
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.reason).toBe("table_missing");
  });
});

describe("POST /api/push/unsubscribe", () => {
  it("unauth → 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const res = await unsubscribeRoute(
      postRequest("/api/push/unsubscribe", { endpoint: "https://push.example.com/abc" }),
    );
    expect(res.status).toBe(401);
    expect(mocks.pushSubscriptionDeleteMany).not.toHaveBeenCalled();
  });

  it("invalid body → 400", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await unsubscribeRoute(postRequest("/api/push/unsubscribe", {}));
    expect(res.status).toBe(400);
  });

  it("happy path: deletes the caller's own row (200, deleted:true)", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.pushSubscriptionDeleteMany.mockResolvedValue({ count: 1 });

    const res = await unsubscribeRoute(
      postRequest("/api/push/unsubscribe", { endpoint: "https://push.example.com/abc" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted).toBe(true);
    expect(mocks.pushSubscriptionDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", endpoint: "https://push.example.com/abc" },
    });
  });

  it("idempotent: unsubscribing a nonexistent/non-owned endpoint is 200, deleted:false", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.pushSubscriptionDeleteMany.mockResolvedValue({ count: 0 });

    const res = await unsubscribeRoute(
      postRequest("/api/push/unsubscribe", { endpoint: "https://push.example.com/someone-elses" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.deleted).toBe(false);
  });

  it("table_missing → honest 503, not 500", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.pushSubscriptionDeleteMany.mockRejectedValue({ code: "P2021" });

    const res = await unsubscribeRoute(
      postRequest("/api/push/unsubscribe", { endpoint: "https://push.example.com/abc" }),
    );
    expect(res.status).toBe(503);
  });
});
