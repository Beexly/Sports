import { describe, expect, it, vi } from "vitest";
import { computeDefensiveTargetShares } from "../defensive-target-share.js";
import { type PbpRow } from "../nflverse-pbp-mapper.js";
import * as fs from "fs";

vi.mock("fs");

describe("computeDefensiveTargetShares", () => {
  const row = (overrides: Partial<PbpRow>): PbpRow => {
    return {
      game_id: "2025_01_AAA_BBB",
      season: "2025",
      season_type: "REG",
      play_type: "pass",
      defteam: "BBB",
      home_team: "BBB",
      away_team: "AAA",
      posteam: "AAA",
      receiver_player_id: "WR1",
      ...overrides,
    };
  };

  it("calculates shares properly, sum to 1.0, respects week floor and point-in-time", () => {
    // Mock fs.existsSync and fs.readFileSync
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      ['{"week":"1", "gsis_id":"WR1", "position":"WR"}',
       '{"week":"1", "gsis_id":"TE1", "position":"TE"}',
       '{"week":"1", "gsis_id":"RB1", "position":"RB"}'].join("\n")
    );

    const rows = [
      row({ game_id: "2025_01_AAA_BBB" }),
      row({ game_id: "2025_01_AAA_BBB" }),
      row({ game_id: "2025_01_AAA_BBB", receiver_player_id: "TE1" }),
      row({ game_id: "2025_01_AAA_BBB", receiver_player_id: "RB1" }),

      row({ game_id: "2025_02_AAA_BBB" }),
      row({ game_id: "2025_02_AAA_BBB" }),
      row({ game_id: "2025_02_AAA_BBB", receiver_player_id: "TE1" }),
      row({ game_id: "2025_02_AAA_BBB", receiver_player_id: "RB1" }),

      row({ game_id: "2025_03_AAA_BBB" }),
      row({ game_id: "2025_03_AAA_BBB" }),
      row({ game_id: "2025_03_AAA_BBB", receiver_player_id: "TE1" }),
      row({ game_id: "2025_03_AAA_BBB", receiver_player_id: "RB1" }),

      row({ game_id: "2025_04_AAA_BBB" }),
      row({ game_id: "2025_04_AAA_BBB" }),
      row({ game_id: "2025_04_AAA_BBB", receiver_player_id: "TE1" }),
      row({ game_id: "2025_04_AAA_BBB", receiver_player_id: "RB1" }),

      row({ game_id: "2025_05_AAA_BBB" }),
      row({ game_id: "2025_05_AAA_BBB" }),
      row({ game_id: "2025_05_AAA_BBB", receiver_player_id: "TE1" }),
      row({ game_id: "2025_05_AAA_BBB", receiver_player_id: "RB1" }),
    ];

    const result = computeDefensiveTargetShares(rows);

    const bbbWeek1 = result.find(r => r.defteam === "BBB" && r.week === 1);
    expect(bbbWeek1?.wrShareAllowed ?? null).toBeNull();

    const bbbWeek4 = result.find(r => r.defteam === "BBB" && r.week === 4);
    expect(bbbWeek4?.wrShareAllowed ?? null).toBeNull();

    const bbbWeek5 = result.find(r => r.defteam === "BBB" && r.week === 5);
    expect(bbbWeek5?.wrShareAllowed).toBe(0.5);
    expect(bbbWeek5?.teShareAllowed).toBe(0.25);
    expect(bbbWeek5?.rbShareAllowed).toBe(0.25);
  });
});
