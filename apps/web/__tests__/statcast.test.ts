import { describe, expect, it } from "vitest";
import {
  findBatter,
  findPitcher,
  loadStatcastBatters,
  loadStatcastPitchers,
  loadSprintSpeed,
} from "@/lib/statcast";

const BATTER_CSV = `player_name,team,pa,evl,ev50,launch_angle,hard_hit_percent,barrel_percent,barrel_pa_percent,xba,xslg,xwoba,sprint_speed,bolts
"Aaron Judge","NYY",704,95.2,108.1,14.2,62.3,18.5,9.8,.312,.654,.430,26.8,12
"Jose Ramirez","CLE",693,88.1,102.3,12.8,48.1,10.2,5.1,.278,.498,.372,27.9,28
`;

const PITCHER_CSV = `player_name,team,bf,evl,ev50,launch_angle,hard_hit_percent,barrel_percent,xba,xslg,xwoba
"Gerrit Cole","NYY",812,88.5,101.2,12.1,42.3,8.1,.241,.401,.312
"Spencer Strider","ATL",756,87.2,100.1,11.5,39.8,7.2,.228,.385,.298
`;

const SPRINT_CSV = `player_name,team,sprint_speed,bolts
"Trea Turner","PHI",30.2,45
"Bobby Witt Jr.","KCR",30.1,42
`;

function mockFetch(csv: string) {
  return async (_url: string, _init?: RequestInit) =>
    new Response(csv, {
      status: 200,
      headers: { "content-type": "text/csv" },
    });
}

function mockFail() {
  return async (_url: string, _init?: RequestInit) =>
    new Response("Not Found", { status: 404 });
}

describe("statcast loader", () => {
  it("parses batter leaderboard CSV into typed lines", async () => {
    const result = await loadStatcastBatters(2025, mockFetch(BATTER_CSV));
    expect(result.status).toBe("live");
    expect(result.sourceRows).toBe(2);
    expect(result.rows).toHaveLength(2);

    const judge = result.rows[0];
    expect(judge.playerName).toBe("Aaron Judge");
    expect(judge.team).toBe("NYY");
    expect(judge.ev).toBe(95.2);
    expect(judge.ev50).toBe(108.1);
    expect(judge.hardHitPct).toBe(62.3);
    expect(judge.barrelPct).toBe(18.5);
    expect(judge.xwoba).toBe(0.43);
    expect(judge.sprintSpeed).toBe(26.8);
  });

  it("parses pitcher leaderboard CSV into typed lines", async () => {
    const result = await loadStatcastPitchers(2025, mockFetch(PITCHER_CSV));
    expect(result.status).toBe("live");
    expect(result.rows).toHaveLength(2);
    const cole = result.rows[0];
    expect(cole.playerName).toBe("Gerrit Cole");
    expect(cole.hardHitPct).toBe(42.3);
    expect(cole.xwoba).toBe(0.312);
  });

  it("parses sprint speed CSV", async () => {
    const result = await loadSprintSpeed(2025, mockFetch(SPRINT_CSV));
    expect(result.status).toBe("live");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].sprintSpeed).toBe(30.2);
    expect(result.rows[0].bolts).toBe(45);
  });

  it("returns source-error on fetch failure", async () => {
    const result = await loadStatcastBatters(2025, mockFail());
    expect(result.status).toBe("source-error");
    expect(result.rows).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });

  it("findBatter matches by exact name", async () => {
    const result = await loadStatcastBatters(2025, mockFetch(BATTER_CSV));
    const found = findBatter(result.rows, "Aaron Judge");
    expect(found).not.toBeNull();
    expect(found?.team).toBe("NYY");
  });

  it("findBatter matches by last name when unique", async () => {
    const result = await loadStatcastBatters(2025, mockFetch(BATTER_CSV));
    const found = findBatter(result.rows, "Judge");
    expect(found).not.toBeNull();
    expect(found?.playerName).toBe("Aaron Judge");
  });

  it("findBatter returns null when ambiguous or missing", async () => {
    const result = await loadStatcastBatters(2025, mockFetch(BATTER_CSV));
    expect(findBatter(result.rows, "Nonexistent Player")).toBeNull();
  });

  it("findPitcher matches by exact name", async () => {
    const result = await loadStatcastPitchers(2025, mockFetch(PITCHER_CSV));
    const found = findPitcher(result.rows, "Gerrit Cole");
    expect(found).not.toBeNull();
  });
});
