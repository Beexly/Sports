import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: vi.fn() }));
vi.mock("@/lib/scoring/player-composite", () => ({ loadPlayerCompositeScores: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/scoring/player-index/route";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadPlayerCompositeScores } from "@/lib/scoring/player-composite";

const req = (qs = ""): Request => new Request(`http://x/api/scoring/player-index${qs}`);

beforeEach(() => {
  (requirePremiumApiRateLimited as Mock).mockReset().mockResolvedValue(null);
  (loadPlayerCompositeScores as Mock).mockReset().mockResolvedValue({ status: "ok", season: 2025, top: [], playerCount: 0 });
});

describe("GET /api/scoring/player-index", () => {
  it("returns the gate's denial when not entitled", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));
    expect((await GET(req())).status).toBe(403);
    expect(loadPlayerCompositeScores).not.toHaveBeenCalled();
  });

  it("defaults to the current season and returns the index", async () => {
    expect((await GET(req())).status).toBe(200);
    expect(loadPlayerCompositeScores).toHaveBeenCalledWith(2025);
  });

  it("400s on an invalid season override", async () => {
    expect((await GET(req("?season=1700"))).status).toBe(400);
    expect(loadPlayerCompositeScores).not.toHaveBeenCalled();
  });
});
