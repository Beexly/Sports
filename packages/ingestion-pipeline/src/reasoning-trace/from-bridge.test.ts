import { describe, expect, it } from "vitest";
import { traceHoldoutGame } from "./from-bridge.js";

describe("traceHoldoutGame", () => {
  it("reads one real schedule row without inventing a probability", () => {
    const result = traceHoldoutGame({
      game_id: "2025_01_DAL_PHI",
      season: 2025,
      week: 1,
      home_team: "PHI",
      away_team: "DAL",
      rest_diff: 0,
      roof: "outdoor",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.conclusion).toBe("INSUFFICIENT");
    expect(result.data.withheldReasons).toEqual([]);
    expect(result.data.publishablePick).toBe(false);
    expect(result.data.unknowns.map((item) => item.id)).toContain("bridge");
    expect(result.data.agreementSummary).toBeNull();
    expect(JSON.stringify(result.data)).not.toContain("home_win");
  });

  it("reasons when a stored premise has a sample count", () => {
    const result = traceHoldoutGame(
      {
        game_id: "2025_01_DAL_PHI",
        season: 2025,
        week: 1,
        home_team: "PHI",
        away_team: "DAL",
        rest_diff: 0,
        roof: "outdoor",
      },
      [
        {
          game_id: "2025_01_DAL_PHI",
          signal_id: "pregame_context_logit",
          outcome: "home",
          probability: 0.64,
          sample_count: 6955,
          method: "logistic-irls",
        },
      ],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.conclusion).toBe("ASSOCIATION_ONLY");
    expect(result.data.sourceCount).toBe(1);
    expect(result.data.agreementSummary).toBeCloseTo(0.64, 10);
    expect(result.data.withheldReasons).toEqual([]);
    expect(result.data.publishablePick).toBe(false);
    expect(result.data.reason).toContain("one probability source");
  });
});
