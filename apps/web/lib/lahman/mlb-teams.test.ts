import { describe, it, expect, beforeEach } from "vitest";
import { buildMlbTeams, loadLahmanMlbTeams, resetLahmanMlbCacheForTests } from "./mlb-teams";

const CSV = `yearID,lgID,teamID,franchID,divID,G,W,L,R,RA,name
2022,NL,ATL,ATL,E,162,101,61,789,632,Atlanta Braves
2023,NL,ATL,ATL,E,162,104,58,947,715,Atlanta Braves
2023,AL,BAL,BAL,E,162,101,61,807,712,Baltimore Orioles`;

function ok(body: string): Response {
  return { ok: true, status: 200, text: async () => body } as unknown as Response;
}

beforeEach(() => resetLahmanMlbCacheForTests());

describe("buildMlbTeams", () => {
  it("selects the latest season and ranks by run differential", () => {
    const { season, teams } = buildMlbTeams(
      CSV.split("\n").slice(1).map((line) => {
        const [yearID, lgID, teamID, franchID, divID, G, W, L, R, RA, name] = line.split(",");
        return { yearID, lgID, teamID, franchID, divID, G, W, L, R, RA, name } as Record<string, string>;
      }),
    );
    expect(season).toBe(2023);
    expect(teams).toHaveLength(2);
    expect(teams[0]?.team).toBe("Atlanta Braves");
    expect(teams[0]?.runDiff).toBe(232);
    expect(teams[1]?.team).toBe("Baltimore Orioles");
  });

  it("computes a Pythagorean win expectation between 0 and 1, higher for a better run diff", () => {
    const { teams } = buildMlbTeams([
      { yearID: "2023", name: "Good", W: "100", L: "62", R: "900", RA: "650" },
      { yearID: "2023", name: "Bad", W: "70", L: "92", R: "650", RA: "850" },
    ]);
    const good = teams.find((t) => t.team === "Good")!;
    const bad = teams.find((t) => t.team === "Bad")!;
    expect(good.pythagWinPct).toBeGreaterThan(bad.pythagWinPct);
    expect(good.pythagWinPct).toBeGreaterThan(0);
    expect(good.pythagWinPct).toBeLessThan(1);
    expect(good.luck).toBeCloseTo(good.winPct - good.pythagWinPct, 3);
  });

  it("returns an empty result for no rows", () => {
    expect(buildMlbTeams([])).toEqual({ season: 0, teams: [] });
  });
});

describe("loadLahmanMlbTeams", () => {
  it("loads live from the first reachable mirror", async () => {
    const r = await loadLahmanMlbTeams({ fetcher: async () => ok(CSV) });
    expect(r.status).toBe("live");
    expect(r.season).toBe(2023);
    expect(r.teams).toHaveLength(2);
    expect(r.canPublishPicks).toBe(false);
    expect(r.servedBy).toContain("jsdelivr"); // primary host tried first
    expect(r.attribution).toContain("Lahman");
  });

  it("degrades to source-error when every mirror fails", async () => {
    const r = await loadLahmanMlbTeams({ fetcher: async () => { throw new Error("blocked"); } });
    expect(r.status).toBe("source-error");
    expect(r.teams).toEqual([]);
    expect(r.servedBy).toBeNull();
  });

  it("rejects an HTML error page served as 200", async () => {
    const r = await loadLahmanMlbTeams({ fetcher: async () => ok("<!DOCTYPE html><html>nope</html>") });
    expect(r.status).toBe("source-error");
  });
});
