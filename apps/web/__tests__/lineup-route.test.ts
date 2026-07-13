import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: vi.fn() }));
vi.mock("@/lib/tools/lineup-tools", () => ({ compareLineup: vi.fn() }));
vi.mock("@/lib/ingestion/player-stats", () => ({ currentNflSeason: () => 2025 }));

import { GET } from "@/app/api/tools/lineup/route";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";
import { compareLineup } from "@/lib/tools/lineup-tools";

const req = (qs = ""): Request => new Request(`http://x/api/tools/lineup${qs}`);

beforeEach(() => {
  (requirePremiumApiRateLimited as Mock).mockReset().mockResolvedValue(null);
  (compareLineup as Mock).mockReset().mockResolvedValue({ status: "ok", picks: [] });
});

describe("GET /api/tools/lineup", () => {
  it("returns the gate's denial when not entitled", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));
    expect((await GET(req("?players=p1"))).status).toBe(403);
    expect(compareLineup).not.toHaveBeenCalled();
  });

  it("400s without players", async () => {
    expect((await GET(req())).status).toBe(400);
    expect(compareLineup).not.toHaveBeenCalled();
  });

  it("parses players and defaults the season", async () => {
    expect((await GET(req("?players=p1,%20p2%20,,p3"))).status).toBe(200);
    expect(compareLineup).toHaveBeenCalledWith(2025, ["p1", "p2", "p3"]);
  });

  it("400s on an invalid season", async () => {
    expect((await GET(req("?players=p1&season=1700"))).status).toBe(400);
  });
});
