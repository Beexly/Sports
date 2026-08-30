import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ClubEloClient,
  fixtureRowToTwoWay,
  isClubEloSport,
  normalizeClubName,
  ratingsToTwoWay,
  resetClubEloClientForTests,
  clubEloLookupName,
} from "../clubelo-client.js";

afterEach(() => {
  vi.restoreAllMocks();
  resetClubEloClientForTests();
});

describe("isClubEloSport", () => {
  it("accepts soccer Odds keys", () => {
    expect(isClubEloSport("soccer_epl")).toBe(true);
    expect(isClubEloSport("soccer_usa_mls")).toBe(true);
    expect(isClubEloSport("soccer_germany_bundesliga")).toBe(true);
  });

  it("rejects NFL/CFB", () => {
    expect(isClubEloSport("americanfootball_nfl")).toBe(false);
    expect(isClubEloSport("americanfootball_ncaaf")).toBe(false);
    expect(isClubEloSport("basketball_nba")).toBe(false);
  });
});

describe("name normalization + overrides", () => {
  it("normalizes punctuation", () => {
    expect(normalizeClubName("  Man. City ")).toBe("man city");
  });

  it("maps common ESPN labels to ClubElo labels", () => {
    expect(clubEloLookupName("Manchester City")).toBe("Man City");
    expect(clubEloLookupName("Paris Saint-Germain")).toBe("Paris SG");
    expect(clubEloLookupName("Tottenham Hotspur")).toBe("Tottenham");
  });
});

describe("fixtureRowToTwoWay", () => {
  it("removes draw mass and renormalises", () => {
    const row = {
      "GD=1": "0.20",
      "GD=2": "0.10",
      "GD=0": "0.25",
      "GD=-1": "0.15",
      "GD=-2": "0.10",
      "GD=3": "0",
      "GD=4": "0",
      "GD=5": "0",
      "GD>5": "0",
      "GD=-3": "0",
      "GD=-4": "0",
      "GD=-5": "0",
      "GD<-5": "0",
    };
    const tw = fixtureRowToTwoWay(row)!;
    expect(tw.homeFairProb + tw.awayFairProb).toBeCloseTo(1, 6);
    expect(tw.homeFairProb).toBeCloseTo(0.3 / 0.55, 5);
    expect(tw.drawMass).toBeGreaterThan(0);
  });

  it("null when no usable columns", () => {
    expect(fixtureRowToTwoWay({})).toBeNull();
  });
});

describe("ratingsToTwoWay", () => {
  it("is monotonic in rating diff", () => {
    const a = ratingsToTwoWay(1800, 1500);
    const b = ratingsToTwoWay(1500, 1800);
    expect(a.homeFairProb).toBeGreaterThan(0.5);
    expect(b.homeFairProb).toBeLessThan(0.5);
    expect(a.homeFairProb + a.awayFairProb).toBeCloseTo(1, 6);
  });
});

describe("ClubEloClient.getFairValue", () => {
  const FROZEN = new Date("2026-08-09T12:00:00.000Z");

  it("prefers fixtures matchup when present", async () => {
    const fixturesCsv = [
      "Date,Home,Away,GD=1,GD=2,GD=0,GD=-1,GD=-2,GD=3,GD=4,GD=5,GD>5,GD=-3,GD=-4,GD=-5,GD<-5",
      "2026-08-10,Man City,Arsenal,0.25,0.10,0.20,0.15,0.10,0,0,0,0,0,0,0,0",
    ].join("\n");

    const client = new ClubEloClient({
      now: () => FROZEN,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/Fixtures")) {
          return new Response(fixturesCsv, { status: 200 });
        }
        throw new Error(`unexpected ${url}`);
      },
    });

    const fv = await client.getFairValue({
      homeTeam: "Manchester City",
      awayTeam: "Arsenal",
      commenceTime: new Date("2026-08-10T15:00:00Z"),
    });
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("clubelo");
    expect(fv!.homeFairProb! + fv!.awayFairProb!).toBeCloseTo(1, 4);
    expect(fv!.homeFairProb!).toBeGreaterThan(fv!.awayFairProb!);
  });

  it("falls back to rating snapshot logistic", async () => {
    const ratingsCsv = ["Rank,Club,Country,Level,Elo", "1,Liverpool,ENG,1,1950", "2,Newcastle,ENG,1,1750"].join(
      "\n",
    );
    const client = new ClubEloClient({
      now: () => FROZEN,
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.includes("/Fixtures")) {
          return new Response("Date,Home,Away\n", { status: 200 });
        }
        if (url.includes("/2026-08-09") || url.includes("/2026-08-10")) {
          return new Response(ratingsCsv, { status: 200 });
        }
        throw new Error(`unexpected ${url}`);
      },
    });

    const fv = await client.getFairValue({
      homeTeam: "Liverpool",
      awayTeam: "Newcastle United",
      commenceTime: new Date("2026-08-09T15:00:00Z"),
    });
    expect(fv).not.toBeNull();
    expect(fv!.source).toBe("clubelo");
    expect(fv!.homeFairProb!).toBeGreaterThan(0.5);
  });

  it("returns null when neither side resolves (honest)", async () => {
    const client = new ClubEloClient({
      now: () => FROZEN,
      fetchImpl: async () => new Response("Date,Home,Away\n", { status: 200 }),
    });
    const fv = await client.getFairValue({
      homeTeam: "Unknown FC",
      awayTeam: "Also Unknown",
    });
    expect(fv).toBeNull();
  });
});
