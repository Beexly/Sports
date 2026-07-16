import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: vi.fn() }));
vi.mock("@/lib/intelligence/team-ratings", () => ({ loadTeamRatings: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/intelligence/team-ratings/route";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { loadTeamRatings } from "@/lib/intelligence/team-ratings";

const req = (qs = ""): Request => new Request(`http://x/api/intelligence/team-ratings${qs}`);

beforeEach(() => {
  (requirePremiumApiRateLimited as Mock).mockReset().mockResolvedValue(null);
  (loadTeamRatings as Mock).mockReset().mockResolvedValue({ status: "ok", season: 2025, ratings: [] });
});

describe("GET /api/intelligence/team-ratings", () => {
  it("returns the gate's denial when not entitled", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));
    expect((await GET(req())).status).toBe(403);
    expect(loadTeamRatings).not.toHaveBeenCalled();
  });

  it("defaults to the current season and returns the ratings", async () => {
    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(loadTeamRatings).toHaveBeenCalledWith(2025);
  });

  it("400s on an invalid season override", async () => {
    expect((await GET(req("?season=1700"))).status).toBe(400);
    expect(loadTeamRatings).not.toHaveBeenCalled();
  });
});
