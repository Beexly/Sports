import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Lineup tools read the central Galaxy Index (mocked) and project it into
 * start/sit + trade tiers — no independent model, so they can't contradict it.
 */

vi.mock("@/lib/scoring/player-composite", () => ({ loadPlayerCompositeScores: vi.fn() }));

import { compareLineup, startSitRecommendation, tradeTier } from "@/lib/tools/lineup-tools";
import { loadPlayerCompositeScores } from "@/lib/scoring/player-composite";

beforeEach(() => (loadPlayerCompositeScores as Mock).mockReset());

describe("pure tiers", () => {
  it("maps score → start/sit", () => {
    expect(startSitRecommendation(72)).toBe("start");
    expect(startSitRecommendation(50)).toBe("flex");
    expect(startSitRecommendation(30)).toBe("sit");
  });
  it("maps score → trade tier", () => {
    expect(tradeTier(75)).toBe("elite");
    expect(tradeTier(60)).toBe("high");
    expect(tradeTier(48)).toBe("mid");
    expect(tradeTier(30)).toBe("depth");
  });
});

describe("compareLineup", () => {
  it("ranks the requested players by the central score and tracks missing ids", async () => {
    (loadPlayerCompositeScores as Mock).mockResolvedValue({
      status: "ok",
      top: [
        { playerId: "p1", name: "Alpha", position: "RB", team: "KC", score: 72, drivers: [] },
        { playerId: "p2", name: "Bravo", position: "WR", team: "SF", score: 40, drivers: [] },
        { playerId: "p9", name: "Other", position: "TE", team: "BUF", score: 55, drivers: [] },
      ],
    });

    const r = await compareLineup(2024, ["p2", "p1", "pX"]);
    expect(r.status).toBe("ok");
    expect(r.picks.map((p) => p.playerId)).toEqual(["p1", "p2"]); // sorted by score desc
    expect(r.picks[0]!.recommendation).toBe("start"); // 72
    expect(r.picks[0]!.tradeTier).toBe("elite");
    expect(r.picks[1]!.recommendation).toBe("sit"); // 40
    expect(r.missing).toEqual(["pX"]);
  });

  it("returns no-data when the central score isn't loaded", async () => {
    (loadPlayerCompositeScores as Mock).mockResolvedValue({ status: "no-data", top: [] });
    expect((await compareLineup(2024, ["p1"])).status).toBe("no-data");
  });
});
