import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { playerRushProfile: { findMany: mocks.findMany } } }));

import { loadRushSchemes } from "@/lib/intelligence/rush-schemes";

beforeEach(() => mocks.findMany.mockReset());

describe("loadRushSchemes", () => {
  it("classifies power vs zone leans and ranks by volume", async () => {
    mocks.findMany.mockResolvedValue([
      { gsisId: "p1", playerName: "Power", team: "KC", runs: 200, guardRuns: 110, tackleRuns: 50, endRuns: 40, leftRuns: 60, middleRuns: 80, rightRuns: 60, epaPerRun: 0.05 },
      { gsisId: "p2", playerName: "Zone", team: "SF", runs: 180, guardRuns: 50, tackleRuns: 50, endRuns: 80, leftRuns: 70, middleRuns: 40, rightRuns: 70, epaPerRun: 0.08 },
    ]);
    const r = await loadRushSchemes(2024);
    expect(r.status).toBe("ok");
    expect(r.players[0]!.playerName).toBe("Power"); // more runs ranks first
    expect(r.players[0]!.scheme).toBe("interior/power");
    expect(r.players.find((p) => p.gsisId === "p2")!.scheme).toBe("outside/zone");
  });

  it("returns no-data when empty, and is stub-safe on null", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect((await loadRushSchemes(2024)).status).toBe("no-data");
    mocks.findMany.mockResolvedValue(null);
    expect((await loadRushSchemes(2024)).status).toBe("no-data");
  });
});
