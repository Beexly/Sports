import { describe, it, expect } from "vitest";
import { goalLineVultureRisk, scoringProfile, defensiveSoftSpot } from "./td-equity";

describe("goalLineVultureRisk", () => {
  it("flags high vulture risk when the QB takes a large share of goal-line carries", () => {
    const r = goalLineVultureRisk({ qbCarries: 8, playerCarries: 4, otherSkillCarries: 8 });
    expect(r.qbShare).toBeCloseTo(0.4, 5);
    expect(r.verdict).toBe("high_vulture_risk");
    expect(r.note).toContain("real threat");
  });

  it("flags low vulture risk when the QB rarely takes goal-line carries", () => {
    const r = goalLineVultureRisk({ qbCarries: 1, playerCarries: 10, otherSkillCarries: 9 });
    expect(r.verdict).toBe("low_vulture_risk");
    expect(r.note).toContain("not an issue");
  });

  it("lands on moderate risk in between", () => {
    const r = goalLineVultureRisk({ qbCarries: 3, playerCarries: 7, otherSkillCarries: 5 });
    expect(r.verdict).toBe("moderate_vulture_risk");
  });

  it("handles a zero sample without dividing by zero", () => {
    const r = goalLineVultureRisk({ qbCarries: 0, playerCarries: 0, otherSkillCarries: 0 });
    expect(r.qbShare).toBe(0);
    expect(r.playerShare).toBe(0);
    expect(r.verdict).toBe("low_vulture_risk");
  });
});

describe("scoringProfile", () => {
  it("classifies a goal-line scorer", () => {
    const r = scoringProfile({ goalLine: 6, redZone: 2, distance: 1 });
    expect(r.profile).toBe("goal_line_scorer");
    expect(r.note).toContain("repeatable");
  });

  it("classifies a distance scorer", () => {
    const r = scoringProfile({ goalLine: 0, redZone: 1, distance: 8 });
    expect(r.profile).toBe("distance_scorer");
    expect(r.note).toContain("broken play");
  });

  it("classifies a mixed profile as both", () => {
    const r = scoringProfile({ goalLine: 3, redZone: 2, distance: 4 });
    expect(r.profile).toBe("both");
  });

  it("reports insufficient sample on zero touchdowns", () => {
    const r = scoringProfile({ goalLine: 0, redZone: 0, distance: 0 });
    expect(r.profile).toBe("insufficient_sample");
  });
});

describe("defensiveSoftSpot", () => {
  it("finds a real target when the weakest position matches the player", () => {
    const r = defensiveSoftSpot({ RB: 2, TE: 6, WR_outside: 1, WR_slot: 1 }, "TE");
    expect(r.weakestPosition).toBe("TE");
    expect(r.verdict).toBe("target_for_position");
    expect(r.note).toContain("target");
  });

  it("flags a bad matchup when the weakness is elsewhere", () => {
    const r = defensiveSoftSpot({ RB: 1, TE: 7, WR_outside: 1, WR_slot: 1 }, "WR_outside");
    expect(r.weakestPosition).toBe("TE");
    expect(r.verdict).toBe("bad_matchup");
  });

  it("returns neutral when there is no real red-zone touchdown sample", () => {
    const r = defensiveSoftSpot({ RB: 0, TE: 0, WR_outside: 0, WR_slot: 0 }, "RB");
    expect(r.weakestPosition).toBeNull();
    expect(r.verdict).toBe("neutral");
  });

  it("returns neutral when the matching position isn't clearly dominant", () => {
    const r = defensiveSoftSpot({ RB: 3, TE: 3, WR_outside: 2, WR_slot: 2 }, "RB");
    expect(r.verdict).toBe("neutral");
  });
});
