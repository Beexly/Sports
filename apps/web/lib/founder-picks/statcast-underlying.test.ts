import { describe, expect, it } from "vitest";
import { readFounderPick, type FounderPickContext } from "@/lib/founder-picks/factors";
import {
  MIN_BATTER_SAMPLE_PA,
  MIN_PITCHER_SAMPLE_BF,
  loadStatcastUnderlyingFactor,
  statcastUnderlyingFactorOrNull,
} from "@/lib/founder-picks/statcast-underlying";

// Two qualified batters and one thin-sample batter (below MIN_BATTER_SAMPLE_PA).
const BATTER_CSV = `player_name,team,pa,evl,ev50,launch_angle,hard_hit_percent,barrel_percent,barrel_pa_percent,xba,xslg,xwoba,sprint_speed,bolts
"Aaron Judge","NYY",704,95.2,108.1,14.2,62.3,18.5,9.8,.312,.654,.430,26.8,12
"Jose Ramirez","CLE",693,88.1,102.3,12.8,48.1,10.2,5.1,.278,.498,.372,27.9,28
"Rookie Callup","BOS",22,90.0,100.0,10.0,30.0,5.0,2.0,.250,.400,.300,27.0,5
`;

const PITCHER_CSV = `player_name,team,bf,evl,ev50,launch_angle,hard_hit_percent,barrel_percent,xba,xslg,xwoba
"Gerrit Cole","NYY",812,88.5,101.2,12.1,42.3,8.1,.241,.401,.312
"Spencer Strider","ATL",756,87.2,100.1,11.5,39.8,7.2,.228,.385,.298
"September Callup","MIA",15,90.1,105.0,13.0,50.0,10.0,.260,.410,.320
`;

function mockFetch(csv: string) {
  return async () => new Response(csv, { status: 200, headers: { "content-type": "text/csv" } });
}

function mockFail() {
  return async () => new Response("Not Found", { status: 404 });
}

const BASE_CTX: FounderPickContext = {
  sport: "MLB",
  player: "Aaron Judge",
  team: "NYY",
  opponent: "BOS",
  market: "Total Bases",
  ourNumber: 1.8,
  postedLine: 1.5,
};

describe("loadStatcastUnderlyingFactor — happy path (batter)", () => {
  it("finds the player, computes a real league average from the loaded pool, and never fabricates", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Aaron Judge", season: 2025, metric: "hardHitPct" },
      mockFetch(BATTER_CSV),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.factor.label).toBe("Hard-Hit % (Statcast)");
    expect(result.factor.value).toBe(62.3);
    // League average is the mean of every loaded row's hardHitPct — a real
    // computed number, never a placeholder.
    expect(result.factor.leagueAvg).toBeCloseTo((62.3 + 48.1 + 30.0) / 3, 5);
    expect(result.factor.higherIsBetter).toBe(true);
    expect(result.sampleSize).toBe(704);
    expect(result.poolSize).toBe(3);
  });

  it("produces a shape that plugs directly into the factor engine's underlying input", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Aaron Judge", season: 2025, metric: "hardHitPct" },
      mockFetch(BATTER_CSV),
    );
    const underlying = statcastUnderlyingFactorOrNull(result);
    expect(underlying).not.toBeNull();
    const read = readFounderPick({ ...BASE_CTX, underlying });
    const f = read.factors.find((x) => x.key === "underlying");
    expect(f).toBeDefined();
    expect(f?.direction).toBe("boost"); // Judge's hard-hit% is above the pool average
  });

  it("defaults to hardHitPct when no metric is requested", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Aaron Judge", season: 2025 },
      mockFetch(BATTER_CSV),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.factor.label).toMatch(/Hard-Hit/);
  });
});

describe("loadStatcastUnderlyingFactor — happy path (pitcher)", () => {
  it("flips higherIsBetter to false (lower allowed is better)", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "pitcher", playerName: "Gerrit Cole", season: 2025, metric: "hardHitPct" },
      mockFetch(PITCHER_CSV),
    );
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.factor.higherIsBetter).toBe(false);
    expect(result.factor.value).toBe(42.3);
    expect(result.sampleSize).toBe(812);
  });
});

describe("loadStatcastUnderlyingFactor — player not found (never fires)", () => {
  it("returns not-found for a name with no match", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Nobody Real", season: 2025 },
      mockFetch(BATTER_CSV),
    );
    expect(result.status).toBe("not-found");
    expect(statcastUnderlyingFactorOrNull(result)).toBeNull();
  });

  it("returns not-found on an ambiguous last name — never guesses", async () => {
    // Two "Ramirez"-containing surnames would be ambiguous; simulate with a
    // CSV carrying two Ramirezes and request by last name only.
    const twoRamirez = `player_name,team,pa,evl,ev50,launch_angle,hard_hit_percent,barrel_percent,barrel_pa_percent,xba,xslg,xwoba,sprint_speed,bolts
"Jose Ramirez","CLE",693,88.1,102.3,12.8,48.1,10.2,5.1,.278,.498,.372,27.9,28
"Hanley Ramirez","BOS",500,89.0,103.0,13.0,50.0,11.0,6.0,.280,.500,.380,26.0,10
`;
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Ramirez", season: 2025 },
      mockFetch(twoRamirez),
    );
    expect(result.status).toBe("not-found");
    expect(statcastUnderlyingFactorOrNull(result)).toBeNull();
  });

  it("factors.ts underlying never fires on not-found", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Nobody Real", season: 2025 },
      mockFetch(BATTER_CSV),
    );
    const read = readFounderPick({ ...BASE_CTX, underlying: statcastUnderlyingFactorOrNull(result) });
    expect(read.factors.find((x) => x.key === "underlying")).toBeUndefined();
  });
});

describe("loadStatcastUnderlyingFactor — source unreachable (never fires)", () => {
  it("returns source-unreachable on a fetch failure", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Aaron Judge", season: 2025 },
      mockFail(),
    );
    expect(result.status).toBe("source-unreachable");
    expect(statcastUnderlyingFactorOrNull(result)).toBeNull();
  });

  it("returns source-unreachable on an empty leaderboard", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "pitcher", playerName: "Gerrit Cole", season: 2025 },
      mockFetch("player_name,team,bf\n"),
    );
    expect(result.status).toBe("source-unreachable");
  });

  it("factors.ts underlying never fires when the source is unreachable", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Aaron Judge", season: 2025 },
      mockFail(),
    );
    const read = readFounderPick({ ...BASE_CTX, underlying: statcastUnderlyingFactorOrNull(result) });
    expect(read.factors.find((x) => x.key === "underlying")).toBeUndefined();
  });
});

describe("loadStatcastUnderlyingFactor — small sample (never fires)", () => {
  it("refuses a batter below the PA floor, never falls back to league average", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Rookie Callup", season: 2025 },
      mockFetch(BATTER_CSV),
    );
    expect(result.status).toBe("small-sample");
    if (result.status !== "small-sample") return;
    expect(result.sampleSize).toBe(22);
    expect(result.minimumRequired).toBe(MIN_BATTER_SAMPLE_PA);
    expect(statcastUnderlyingFactorOrNull(result)).toBeNull();
  });

  it("refuses a pitcher below the BF floor", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "pitcher", playerName: "September Callup", season: 2025 },
      mockFetch(PITCHER_CSV),
    );
    expect(result.status).toBe("small-sample");
    if (result.status !== "small-sample") return;
    expect(result.sampleSize).toBe(15);
    expect(result.minimumRequired).toBe(MIN_PITCHER_SAMPLE_BF);
  });

  it("factors.ts underlying never fires on a small sample", async () => {
    const result = await loadStatcastUnderlyingFactor(
      { role: "batter", playerName: "Rookie Callup", season: 2025 },
      mockFetch(BATTER_CSV),
    );
    const read = readFounderPick({ ...BASE_CTX, underlying: statcastUnderlyingFactorOrNull(result) });
    expect(read.factors.find((x) => x.key === "underlying")).toBeUndefined();
  });
});
