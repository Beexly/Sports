import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Team ratings loader: maps persisted team-game efficiency into the
 * opponent-adjustment engine and returns ranked ratings. Only the DB is mocked
 * (real prediction-engine adjustment).
 */

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { teamGameEfficiency: { findMany: mocks.findMany } } }));

import { loadTeamRatings } from "@/lib/intelligence/team-ratings";

beforeEach(() => mocks.findMany.mockReset());

describe("loadTeamRatings", () => {
  it("computes opponent-adjusted ratings and ranks the better team first", async () => {
    // A and B both play weak W: A scores big and allows nothing, B does neither.
    // The shared opponent breaks the symmetry so the adjustment has signal.
    mocks.findMany.mockResolvedValue([
      { team: "A", opponent: "W", offEpaPerPlay: 0.3, defEpaPerPlay: 0.0 },
      { team: "W", opponent: "A", offEpaPerPlay: 0.0, defEpaPerPlay: 0.3 },
      { team: "B", opponent: "W", offEpaPerPlay: 0.0, defEpaPerPlay: 0.1 },
      { team: "W", opponent: "B", offEpaPerPlay: 0.1, defEpaPerPlay: 0.0 },
    ]);
    const r = await loadTeamRatings(2024);
    expect(r.status).toBe("ok");
    expect(r.teamCount).toBe(3); // A, B, W
    expect(r.gamesUsed).toBe(4);
    expect(r.ratings[0]!.team).toBe("A"); // best offense + defense → ranked first
    const A = r.ratings.find((x) => x.team === "A")!;
    const B = r.ratings.find((x) => x.team === "B")!;
    expect(A.overall).toBeGreaterThan(B.overall);
  });

  it("returns no-data when nothing is loaded, and is stub-safe on null", async () => {
    mocks.findMany.mockResolvedValue([]);
    expect((await loadTeamRatings(2024)).status).toBe("no-data");
    mocks.findMany.mockResolvedValue(null);
    expect((await loadTeamRatings(2024)).status).toBe("no-data");
  });
});
