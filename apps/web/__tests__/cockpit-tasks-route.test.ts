import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for /api/cockpit/tasks route handlers.
 *
 * Invariants pinned here (GSE-SEC-038):
 *  - GET: invalid `status` / `agent` query params → 400 (not 500 from Prisma)
 *  - POST: invalid `assignedAgent` / `riskLevel` / `complianceStatus` → 400
 *  - POST: omitted optional enum fields fall back to defaults
 *  - POST: valid payloads reach db.cockpitTask.create unchanged
 *
 * Mocks @lib/auth and @sports/db + consumeRateLimit so the tests exercise
 * the handler logic directly (mirrors push-subscribe-api.test.ts pattern).
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string; role?: string } } | null>>(),
  cockpitTaskFindMany: vi.fn(),
  cockpitTaskCreate: vi.fn(),
  consumeRateLimit: vi.fn(() => ({ ok: true, retryAfterSec: 0 })),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/api/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));
vi.mock("@sports/db", () => ({
  db: {
    cockpitTask: {
      findMany: mocks.cockpitTaskFindMany,
      create: mocks.cockpitTaskCreate,
    },
  },
}));

import { GET, POST } from "@/app/api/cockpit/tasks/route";

function adminRequest(method: string, path: string, body?: unknown): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  mocks.auth.mockReset();
  mocks.cockpitTaskFindMany.mockReset();
  mocks.cockpitTaskCreate.mockReset();
  mocks.consumeRateLimit.mockReset();
  mocks.consumeRateLimit.mockReturnValue({ ok: true, retryAfterSec: 0 });
  // Default admin session
  mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
});

describe("GET /api/cockpit/tasks — enum validation (GSE-SEC-038)", () => {
  it("rejects invalid status param with 400", async () => {
    const res = await GET(adminRequest("GET", "/api/cockpit/tasks?status=BOGUS"));
    expect(res.status).toBe(400);
    expect(mocks.cockpitTaskFindMany).not.toHaveBeenCalled();
  });

  it("rejects invalid agent param with 400", async () => {
    const res = await GET(adminRequest("GET", "/api/cockpit/tasks?agent=BOGUS"));
    expect(res.status).toBe(400);
    expect(mocks.cockpitTaskFindMany).not.toHaveBeenCalled();
  });

  it("accepts valid status param and delegates to findMany", async () => {
    mocks.cockpitTaskFindMany.mockResolvedValue([]);
    const res = await GET(adminRequest("GET", "/api/cockpit/tasks?status=NEW"));
    expect(res.status).toBe(200);
    expect(mocks.cockpitTaskFindMany).toHaveBeenCalledTimes(1);
    const call = mocks.cockpitTaskFindMany.mock.calls[0]!;
    expect(call[0].where.status).toBe("NEW");
  });

  it("accepts valid agent param and delegates to findMany", async () => {
    mocks.cockpitTaskFindMany.mockResolvedValue([]);
    const res = await GET(adminRequest("GET", "/api/cockpit/tasks?agent=SARAH"));
    expect(res.status).toBe(200);
    const call = mocks.cockpitTaskFindMany.mock.calls[0]!;
    expect(call[0].where.assignedAgent).toBe("SARAH");
  });

  it("passes no where filter when no params given", async () => {
    mocks.cockpitTaskFindMany.mockResolvedValue([]);
    const res = await GET(adminRequest("GET", "/api/cockpit/tasks"));
    expect(res.status).toBe(200);
    const call = mocks.cockpitTaskFindMany.mock.calls[0]!;
    expect(Object.keys(call[0].where)).toHaveLength(0);
  });
});

describe("POST /api/cockpit/tasks — enum validation (GSE-SEC-038)", () => {
  it("rejects invalid assignedAgent with 400", async () => {
    const res = await POST(
      adminRequest("POST", "/api/cockpit/tasks", {
        title: "Test task",
        description: "A test",
        assignedAgent: "BOGUS",
        source: "manual",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/assignedAgent/i);
    expect(mocks.cockpitTaskCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid riskLevel with 400", async () => {
    const res = await POST(
      adminRequest("POST", "/api/cockpit/tasks", {
        title: "Test task",
        description: "A test",
        assignedAgent: "JARVIS",
        source: "manual",
        riskLevel: "BOGUS",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/riskLevel/i);
    expect(mocks.cockpitTaskCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid complianceStatus with 400", async () => {
    const res = await POST(
      adminRequest("POST", "/api/cockpit/tasks", {
        title: "Test task",
        description: "A test",
        assignedAgent: "JARVIS",
        source: "manual",
        complianceStatus: "BOGUS",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/complianceStatus/i);
    expect(mocks.cockpitTaskCreate).not.toHaveBeenCalled();
  });

  it("creates task with valid body and delegates to db.create", async () => {
    mocks.cockpitTaskCreate.mockResolvedValue({ id: "task-1", title: "Test task" });
    const res = await POST(
      adminRequest("POST", "/api/cockpit/tasks", {
        title: "Test task",
        description: "A test",
        assignedAgent: "TAL",
        source: "manual",
        riskLevel: "HIGH",
        complianceStatus: "CLEAR",
        priority: 80,
      }),
    );
    expect(res.status).toBe(201);
    expect(mocks.cockpitTaskCreate).toHaveBeenCalledTimes(1);
    const call = mocks.cockpitTaskCreate.mock.calls[0]!;
    expect(call[0].data.assignedAgent).toBe("TAL");
    expect(call[0].data.riskLevel).toBe("HIGH");
    expect(call[0].data.complianceStatus).toBe("CLEAR");
    expect(call[0].data.priority).toBe(80);
  });

  it("uses defaults for omitted optional enum fields", async () => {
    mocks.cockpitTaskCreate.mockResolvedValue({ id: "task-1", title: "Test" });
    const res = await POST(
      adminRequest("POST", "/api/cockpit/tasks", {
        title: "Test task",
        description: "A test",
        assignedAgent: "AVA",
        source: "manual",
      }),
    );
    expect(res.status).toBe(201);
    const call = mocks.cockpitTaskCreate.mock.calls[0]!;
    expect(call[0].data.riskLevel).toBe("LOW");
    expect(call[0].data.complianceStatus).toBe("NOT_APPLICABLE");
    expect(call[0].data.priority).toBe(50);
  });

  it("rejects non-admin (403) before any validation", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "USER" } });
    const res = await POST(
      adminRequest("POST", "/api/cockpit/tasks", {
        title: "Test",
        description: "A test",
        assignedAgent: "BOGUS",
        source: "manual",
      }),
    );
    expect(res.status).toBe(403);
    expect(mocks.cockpitTaskCreate).not.toHaveBeenCalled();
  });
});
