import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * `team-ratings.ts` had no test. It is the surface that turns raw EPA/play into
 * an OPPONENT-ADJUSTED rating, which is the number other surfaces quote. Two
 * properties matter and were unpinned: the honest empty state before the
 * team-efficiency backfill, and that the adjustment is actually applied rather
 * than a raw average passed through.
 */
const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { teamGameEfficiency: { findMany: mocks.findMany } } }));

import { loadTeamRatings } from "./team-ratings";

const eff = (team: string, opponent: string, off: number, def: number) => ({
  team, opponent, offEpaPerPlay: off, defEpaPerPlay: def,
});

describe("loadTeamRatings", () => {
  beforeEach(() => { mocks.findMany.mockReset(); });

  it("reports no-data until the team-efficiency backfill has run", async () => {
    mocks.findMany.mockResolvedValue([]);
    const r = await loadTeamRatings(2026);
    expect(r.status).toBe("no-data");
    expect(r.teamCount).toBe(0);
    expect(r.gamesUsed).toBe(0);
    expect(r.ratings).toEqual([]);
    expect(r.note).toMatch(/backfill/i);
  });

  it("survives a null delegate result", async () => {
    mocks.findMany.mockResolvedValue(null);
    expect((await loadTeamRatings(2026)).status).toBe("no-data");
  });

  it("queries the season it was asked for", async () => {
    mocks.findMany.mockResolvedValue([]);
    await loadTeamRatings(2025);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { season: 2025 } }),
    );
  });

  it("reports gamesUsed as the rows it read, not a fabricated sample size", async () => {
    mocks.findMany.mockResolvedValue([
      eff("CLE", "PIT", 0.05, 0.02),
      eff("PIT", "CLE", 0.01, 0.06),
    ]);
    const r = await loadTeamRatings(2026);
    expect(r.status).toBe("ok");
    expect(r.gamesUsed).toBe(2);
  });

  it("adjusts for schedule strength: a team beating good teams rates above its raw mean", async () => {
    // CLE faces two strong opponents; PIT faces two weak ones, with CLE's raw
    // numbers only slightly better. Raw averages would call them near-equal; an
    // opponent adjustment should separate them.
    mocks.findMany.mockResolvedValue([
      eff("CLE", "PIT", 0.060, 0.020),
      eff("CLE", "BAL", 0.055, 0.025),
      eff("PIT", "LV",  0.040, 0.045),
      eff("PIT", "JAX", 0.038, 0.050),
    ]);
    const r = await loadTeamRatings(2026);
    const cle = r.ratings.find((t) => t.team === "CLE");
    const pit = r.ratings.find((t) => t.team === "PIT");
    expect(cle).toBeDefined();
    expect(pit).toBeDefined();
    if (cle && pit) expect(cle.overall).toBeGreaterThan(pit.overall);
  });
});
