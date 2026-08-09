import { describe, expect, it } from "vitest";
import {
  isRankingPauseApplyEnabled,
  resolvePausedGroups,
  rankingPauseApplyPosture,
} from "./ranking-pause-apply";

describe("ranking-pause-apply", () => {
  it("defaults OFF", () => {
    expect(isRankingPauseApplyEnabled({})).toBe(false);
    expect(isRankingPauseApplyEnabled({ RANKING_PAUSE_APPLY: "false" })).toBe(
      false,
    );
  });

  it("plan pause is advisory when apply OFF", () => {
    const r = resolvePausedGroups(
      {},
      { pauseGroups: ["mlb|ml", "nba|spread"] },
    );
    expect(r.pausedGroups).toEqual([]);
    expect(r.source).toBe("none");
    expect(r.planPauseCount).toBe(2);
    expect(r.operatorHint).toMatch(/RANKING_PAUSE_APPLY is OFF/i);
  });

  it("applies plan pause when RANKING_PAUSE_APPLY on", () => {
    const r = resolvePausedGroups(
      { RANKING_PAUSE_APPLY: "true" },
      { pauseGroups: ["mlb|ml"] },
    );
    expect(r.pausedGroups).toEqual(["mlb|ml"]);
    expect(r.source).toBe("plan");
  });

  it("env SELECTIVE_PAUSE_GROUPS wins over plan", () => {
    const r = resolvePausedGroups(
      {
        RANKING_PAUSE_APPLY: "true",
        SELECTIVE_PAUSE_GROUPS: "nhl|ml, nba|total",
      },
      { pauseGroups: ["mlb|ml"] },
    );
    expect(r.pausedGroups).toEqual(["nhl|ml", "nba|total"]);
    expect(r.source).toBe("env");
  });

  it("posture is ops-safe", () => {
    const p = rankingPauseApplyPosture(
      {},
      { pauseGroups: ["cbb|ml"] },
    );
    expect(p.applyEnabled).toBe(false);
    expect(p.pausedGroupCount).toBe(0);
    expect(p.planPauseCount).toBe(1);
  });
});
