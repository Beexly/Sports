import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApi: vi.fn() }));
vi.mock("@/lib/intelligence/rush-schemes", () => ({ loadRushSchemes: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/intelligence/rush-schemes/route";
import { requirePremiumApi } from "@/lib/api-entitlement";
import { loadRushSchemes } from "@/lib/intelligence/rush-schemes";

const req = (qs = ""): Request => new Request(`http://x/api/intelligence/rush-schemes${qs}`);

beforeEach(() => {
  (requirePremiumApi as Mock).mockReset().mockResolvedValue(null);
  (loadRushSchemes as Mock).mockReset().mockResolvedValue({ status: "ok", players: [] });
});

describe("GET /api/intelligence/rush-schemes", () => {
  it("denies when not entitled", async () => {
    (requirePremiumApi as Mock).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));
    expect((await GET(req())).status).toBe(403);
    expect(loadRushSchemes).not.toHaveBeenCalled();
  });
  it("defaults the season", async () => {
    expect((await GET(req())).status).toBe(200);
    expect(loadRushSchemes).toHaveBeenCalledWith(2025);
  });
  it("400s on invalid season", async () => {
    expect((await GET(req("?season=1700"))).status).toBe(400);
  });
});
