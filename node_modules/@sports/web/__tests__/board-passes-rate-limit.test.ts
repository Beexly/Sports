import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardPassesPayload } from "@/lib/board/passes";

/**
 * /api/board/passes — cost control (LQ6). No data policy change: the
 * payload itself is already fail-closed (lib/board/passes.ts). This is
 * about a public, anonymous, DB-heavy route with no limiter, siblings
 * /api/board/state, /api/picks, /api/daily-slate all carry one.
 */

const mocks = vi.hoisted(() => ({
  loadBoardPasses: vi.fn<() => Promise<BoardPassesPayload>>(),
  resetRateLimits: vi.fn(),
}));

vi.mock("@/lib/board/passes", () => ({ loadBoardPasses: mocks.loadBoardPasses }));

import { GET } from "@/app/api/board/passes/route";
import { resetRateLimits } from "@/lib/api/rate-limit";

function emptyPayload(): BoardPassesPayload {
  return { data: { date: "2026-08-23", passes: [] }, meta: { isSampleData: false } };
}

function req(ip: string): Request {
  return new Request("http://localhost/api/board/passes", { headers: { "x-real-ip": ip } });
}

describe("GET /api/board/passes — rate limit", () => {
  beforeEach(() => {
    mocks.loadBoardPasses.mockReset().mockResolvedValue(emptyPayload());
    resetRateLimits(); // module-global limiter — deterministic across tests
  });

  it("allows 60 requests from one IP (not 429ed)", async () => {
    for (let i = 0; i < 60; i += 1) {
      const res = await GET(req("203.0.113.7") as unknown as Parameters<typeof GET>[0]);
      expect(res.status).toBe(200);
    }
  });

  it("429s the 61st request from the same IP, with a Retry-After header, and never calls loadBoardPasses for it", async () => {
    for (let i = 0; i < 60; i += 1) {
      await GET(req("203.0.113.7") as unknown as Parameters<typeof GET>[0]);
    }
    mocks.loadBoardPasses.mockClear();
    const blocked = await GET(req("203.0.113.7") as unknown as Parameters<typeof GET>[0]);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(mocks.loadBoardPasses).not.toHaveBeenCalled();
  });

  it("a different IP is unaffected by another IP's exhausted budget", async () => {
    for (let i = 0; i < 60; i += 1) {
      await GET(req("203.0.113.7") as unknown as Parameters<typeof GET>[0]);
    }
    const res = await GET(req("203.0.113.8") as unknown as Parameters<typeof GET>[0]);
    expect(res.status).toBe(200);
  });
});
