import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: vi.fn() }));
vi.mock("@/lib/intelligence/player-movers", () => ({ loadPlayerMovers: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/intelligence/player-movers/route";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadPlayerMovers } from "@/lib/intelligence/player-movers";

const req = (qs = ""): Request => new Request(`http://x/api/intelligence/player-movers${qs}`);

beforeEach(() => {
  (requirePremiumApiRateLimited as Mock).mockReset().mockResolvedValue(null);
  (loadPlayerMovers as Mock).mockReset().mockResolvedValue({ status: "ok", season: 2025, risers: [], fallers: [] });
});

describe("GET /api/intelligence/player-movers", () => {
  it("returns the gate's denial when not entitled", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));
    expect((await GET(req())).status).toBe(403);
    expect(loadPlayerMovers).not.toHaveBeenCalled();
  });

  it("defaults to current season + a 4-game window", async () => {
    expect((await GET(req())).status).toBe(200);
    expect(loadPlayerMovers).toHaveBeenCalledWith(2025, 4);
  });

  it("clamps recentN into 2..8", async () => {
    await GET(req("?recentN=99"));
    expect(loadPlayerMovers).toHaveBeenCalledWith(2025, 8);
  });

  it("400s on an invalid season", async () => {
    expect((await GET(req("?season=1700"))).status).toBe(400);
  });
});
