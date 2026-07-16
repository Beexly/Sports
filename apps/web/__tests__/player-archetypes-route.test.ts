import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: vi.fn() }));
vi.mock("@/lib/intelligence/player-archetypes", () => ({ loadPlayerArchetypes: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/intelligence/player-archetypes/route";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadPlayerArchetypes } from "@/lib/intelligence/player-archetypes";

const req = (qs = ""): Request => new Request(`http://x/api/intelligence/player-archetypes${qs}`);

beforeEach(() => {
  (requirePremiumApiRateLimited as Mock).mockReset().mockResolvedValue(null);
  (loadPlayerArchetypes as Mock).mockReset().mockResolvedValue({ status: "ok", season: 2025, players: [] });
});

describe("GET /api/intelligence/player-archetypes", () => {
  it("returns the gate's denial when not entitled", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));
    expect((await GET(req())).status).toBe(403);
    expect(loadPlayerArchetypes).not.toHaveBeenCalled();
  });

  it("defaults to the current season", async () => {
    expect((await GET(req())).status).toBe(200);
    expect(loadPlayerArchetypes).toHaveBeenCalledWith(2025);
  });

  it("400s on an invalid season", async () => {
    expect((await GET(req("?season=1700"))).status).toBe(400);
    expect(loadPlayerArchetypes).not.toHaveBeenCalled();
  });
});
