import { describe, expect, it } from "vitest";
import { buildNflFranchiseHistory } from "./franchise-history";

const GAMES = [
  { season: "2023", game_type: "REG", home_team: "KC", away_team: "DET", home_score: "20", away_score: "21" },
  { season: "2023", game_type: "REG", home_team: "KC", away_team: "LV", home_score: "31", away_score: "17" },
  { season: "2023", game_type: "SB", home_team: "KC", away_team: "SF", home_score: "25", away_score: "22" },
  { season: "2024", game_type: "REG", home_team: "KC", away_team: "LV", home_score: "27", away_score: "27" },
  // unplayed game (future) — must be skipped entirely
  { season: "2026", game_type: "REG", home_team: "KC", away_team: "LV", home_score: "", away_score: "" },
];

describe("buildNflFranchiseHistory", () => {
  const rows = buildNflFranchiseHistory(GAMES);
  const kc = rows.find((r) => r.team === "KC")!;

  it("counts wins, losses, ties across REG and playoffs", () => {
    expect(kc.wins).toBe(2); // LV win + SB win
    expect(kc.losses).toBe(1); // DET loss
    expect(kc.ties).toBe(1); // 2024 LV tie
  });

  it("credits Super Bowl wins to the winner only", () => {
    expect(kc.superBowlWins).toBe(1);
    expect(rows.find((r) => r.team === "SF")!.superBowlWins).toBe(0);
  });

  it("skips unplayed games instead of counting empty scores", () => {
    expect(kc.lastSeason).toBe(2024);
    expect(kc.seasons).toBe(2);
  });

  it("best season uses regular-season record only", () => {
    // 2023 REG: 1-1 (.500); 2024 REG: 0-0 tie only (0%). Best = 2023.
    expect(kc.bestSeason).toEqual({ year: 2023, wins: 1, losses: 1 });
  });

  it("win pct uses decided games (ties excluded)", () => {
    expect(kc.winPct).toBeCloseTo(2 / 3, 3);
  });
});
