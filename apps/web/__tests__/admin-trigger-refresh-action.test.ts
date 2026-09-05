/**
 * SEC-01: the admin "Trigger Data Refresh" server action must be an
 * authenticated, rate-limited, session-derived-admin RPC — not the dead
 * unauthenticated self-fetch it replaced.
 *
 * Precedent for mocking: __tests__/moderation-actions.test.ts (mock "@/lib/auth").
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// The actor module reads the session through @/lib/auth; keep its real logic.
vi.mock("@/lib/auth/require-admin", () => ({
  isAdminSession: (session: { user?: { role?: string } } | null) =>
    session?.user?.role === "ADMIN",
}));

const mockConsume = vi.fn();
vi.mock("@/lib/api/rate-limit", () => ({
  consumeRateLimit: (...args: unknown[]) => mockConsume(...args),
}));

const mockExecute = vi.fn();
vi.mock("@/lib/admin/trigger-refresh", () => ({
  ADMIN_TRIGGER_REFRESH_RATE_KEY: "admin-trigger-refresh",
  ADMIN_TRIGGER_REFRESH_LIMIT: 10,
  ADMIN_TRIGGER_REFRESH_WINDOW_MS: 60_000,
  executeAdminRefresh: (...args: unknown[]) => mockExecute(...args),
}));

describe("triggerDataRefreshAction (SEC-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsume.mockReturnValue({ ok: true, retryAfterSec: 0 });
    mockExecute.mockResolvedValue({ ok: true, results: [] });
  });

  it("rejects an unauthenticated caller before touching the limiter or the fan-out", async () => {
    mockAuth.mockResolvedValue(null);
    const { triggerDataRefreshAction } = await import("@/lib/admin/trigger-refresh-action");
    await expect(triggerDataRefreshAction()).rejects.toThrow();
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("rejects a non-admin session before touching the limiter or the fan-out", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1", role: "USER", email: "u@x.com" } });
    const { triggerDataRefreshAction } = await import("@/lib/admin/trigger-refresh-action");
    await expect(triggerDataRefreshAction()).rejects.toThrow();
    expect(mockConsume).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("does not fan out when the per-admin rate limit is exhausted", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", email: "a@x.com" } });
    mockConsume.mockReturnValue({ ok: false, retryAfterSec: 30 });
    const { triggerDataRefreshAction } = await import("@/lib/admin/trigger-refresh-action");
    await expect(triggerDataRefreshAction()).resolves.toBe(false);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("enforces the shared admin rate-limit identity: same key, actor subjectId, 10/min", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", email: "a@x.com" } });
    const { triggerDataRefreshAction } = await import("@/lib/admin/trigger-refresh-action");
    await triggerDataRefreshAction();
    expect(mockConsume).toHaveBeenCalledWith("admin-trigger-refresh", "admin-1", 10, 60_000);
  });

  it("runs the shared fan-out for an admin within limits and reports the outcome", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", email: "a@x.com" } });
    mockExecute.mockResolvedValue({ ok: true, results: [{ sport: "NFL" }] });
    const { triggerDataRefreshAction } = await import("@/lib/admin/trigger-refresh-action");
    await expect(triggerDataRefreshAction()).resolves.toBe(true);
    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  it("propagates a failed fan-out as false", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN", email: "a@x.com" } });
    mockExecute.mockResolvedValue({ ok: false, status: 503, error: "THE_ODDS_API_KEY not configured" });
    const { triggerDataRefreshAction } = await import("@/lib/admin/trigger-refresh-action");
    await expect(triggerDataRefreshAction()).resolves.toBe(false);
  });
});

describe("SEC-01 page wiring", () => {
  it("the admin page no longer self-fetches the API without a cookie", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const pagePath = path.resolve(__dirname, "../app/admin/page.tsx");
    const src = fs.readFileSync(pagePath, "utf8");
    expect(src).not.toContain("/api/admin/trigger-refresh");
    expect(src).toContain("triggerDataRefreshAction");
  });
});
