import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  elite: vi.fn(),
  fantasy: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("@/lib/api-entitlement", () => ({
  requireEliteApiRateLimited: mocks.elite,
  requireFantasyApiRateLimited: mocks.fantasy,
}));
vi.mock("@/lib/fantasy/dfs-optimizer", () => ({ generateLineups: mocks.generate }));
vi.mock("@/lib/dfs/unified-slate", () => ({ getUnifiedDfsSlate: () => null }));
vi.mock("@/lib/fantasy/dfs-slate", () => ({ DFS_SLATE: [] }));

import { POST } from "@/app/api/dfs/lineups/route";

const req = (body: unknown) =>
  new Request("http://x/api/dfs/lineups", { method: "POST", body: JSON.stringify(body) });
const deny = () => NextResponse.json({ success: false, error: "insufficient_tier" }, { status: 403 });

describe("POST /api/dfs/lineups — Elite gate on the 150-max tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.elite.mockResolvedValue(null);
    mocks.fantasy.mockResolvedValue(null);
    mocks.generate.mockReturnValue({ lineups: [] });
  });

  it("21 lineups from a non-Elite caller: 403, and NO optimizer compute", async () => {
    mocks.elite.mockResolvedValue(deny());
    const res = await POST(req({ count: 21 }));
    expect(res.status).toBe(403);
    expect(mocks.elite).toHaveBeenCalledTimes(1);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("150 lineups from Elite: allowed", async () => {
    const res = await POST(req({ count: 150 }));
    expect(res.status).toBe(200);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.generate.mock.calls[0]![1]).toBe(150);
  });

  it("20 lineups uses the fantasy floor, not the Elite floor", async () => {
    await POST(req({ count: 20 }));
    expect(mocks.fantasy).toHaveBeenCalledTimes(1);
    expect(mocks.elite).not.toHaveBeenCalled();
  });

  it("20 lineups from a FREE caller: 403 from the fantasy floor", async () => {
    mocks.fantasy.mockResolvedValue(deny());
    const res = await POST(req({ count: 20 }));
    expect(res.status).toBe(403);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("151 is rejected even for Elite", async () => {
    const res = await POST(req({ count: 151 }));
    expect(res.status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("rejects missing or non-numeric counts", async () => {
    expect((await POST(req({}))).status).toBe(400);
    expect((await POST(req({ count: "abc" }))).status).toBe(400);
    expect((await POST(req({ count: 0 }))).status).toBe(400);
  });
});
