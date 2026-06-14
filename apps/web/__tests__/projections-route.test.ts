import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApi: vi.fn() }));
vi.mock("@/lib/projections/player-projections", () => ({ loadPlayerProjections: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/projections/route";
import { requirePremiumApi } from "@/lib/api-entitlement";
import { loadPlayerProjections } from "@/lib/projections/player-projections";

function req(qs = ""): Request {
  return new Request(`http://x/api/projections${qs}`);
}

beforeEach(() => {
  (requirePremiumApi as Mock).mockReset().mockResolvedValue(null); // granted by default
  (loadPlayerProjections as Mock).mockReset().mockResolvedValue({
    status: "ok", targetSeason: 2026, top: [], playerCount: 0,
    backtest: { sampleSize: 0, mae: 0, bias: 0, naiveMae: 0, skillVsNaive: 0 },
  });
});

describe("GET /api/projections", () => {
  it("returns the gate's denial response when not entitled", async () => {
    (requirePremiumApi as Mock).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));
    const res = await GET(req());
    expect(res.status).toBe(403);
    expect(loadPlayerProjections).not.toHaveBeenCalled();
  });

  it("defaults to projecting next season (currentNflSeason + 1)", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(loadPlayerProjections).toHaveBeenCalledWith(2026); // 2025 + 1
  });

  it("400s on an invalid season override", async () => {
    const res = await GET(req("?season=1700"));
    expect(res.status).toBe(400);
    expect(loadPlayerProjections).not.toHaveBeenCalled();
  });
});
