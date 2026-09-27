import { describe, expect, it } from "vitest";
import {
  CANDIDATE_FAMILIES,
  COACHING_GO_RATE,
  NARRATIVE_CONTRACT,
  OFFICIALS_HOLDOUT,
  WEATHER_WIND,
  failingObjectiveFlipped,
  selectPart,
  selectWeek3Candidate,
  week3CandidateDecisions,
} from "./part-selector.js";

const REPRESENTATIVES = [
  "on_field_efficiency",
  "scheme_play_design",
  "availability",
  "schedule_and_body",
  "historical_strength",
  "trench_personnel",
  "chemistry",
  "airwave",
];

const REPRESENTATIVES_WITH_CONTRACT = [...REPRESENTATIVES, "narrative_contract"];

describe("part selector", () => {
  it("keeps the week-3 candidate roster closed", () => {
    expect([...CANDIDATE_FAMILIES]).toEqual(["officials", "weather_physics", "narrative_contract", "coaching"]);
    expect(() =>
      selectWeek3Candidate(
        {
          family: "on_field_efficiency",
          grain: "ngs CPOE",
          r: 0.2,
          slope: 0.1,
          se: 0.01,
          n: 200,
          has_row: true,
        },
        REPRESENTATIVES,
      ),
    ).toThrow(/not on the candidate roster/);
  });

  it("refuses the three remaining week-3 candidates, honesty winning each time, and admits the measured contract family", () => {
    // A family already holding a registry row must not darken its own
    // candidate: the representative roster is the prior state.
    const decisions = week3CandidateDecisions(false, REPRESENTATIVES);
    expect(decisions.map((decision) => decision.family)).toEqual([...CANDIDATE_FAMILIES]);
    const admitted = decisions.find((decision) => decision.family === "narrative_contract")!;
    expect(admitted.status).toBe("LIVE");
    expect(admitted.winning_term).toBe("none");
    expect(admitted.g).toBe(0);
    for (const decision of decisions.filter((row) => row.family !== "narrative_contract")) {
      expect(decision.status).toBe("DARK");
      expect(decision.winning_term).toBe("f1");
      expect(decision.g).toBe(0.5);
      expect(decision.f1).toBe(1);
      expect(decision.f2).toBe(0);
    }
  });

  it("keeps officials dark when the crew is named, because the holdout slope is inside one se", () => {
    const unnamed = selectWeek3Candidate({ ...OFFICIALS_HOLDOUT, has_row: false }, REPRESENTATIVES);
    const named = selectWeek3Candidate({ ...OFFICIALS_HOLDOUT, has_row: true }, REPRESENTATIVES);
    expect(named.status).toBe("DARK");
    expect(named.winning_term).toBe("f1");
    expect(named.f3).toBe(0);
    expect(failingObjectiveFlipped(unnamed, named)).toBe(false);
    expect(Math.abs(OFFICIALS_HOLDOUT.slope!)).toBeLessThanOrEqual(OFFICIALS_HOLDOUT.se!);
    expect(Math.abs(OFFICIALS_HOLDOUT.r!)).toBeGreaterThanOrEqual(0.08);
    expect(named.reactivates_when).toContain("Naming the referee does not flip f1");
  });

  it("names the documented failure on weather and coaching, and the measured contract fit", () => {
    expect(selectWeek3Candidate(WEATHER_WIND, REPRESENTATIVES).why).toContain("not greater than se");
    expect(selectWeek3Candidate(COACHING_GO_RATE, REPRESENTATIVES).why).toContain("under 0.08");
    const measured = selectWeek3Candidate(NARRATIVE_CONTRACT, REPRESENTATIVES);
    expect(measured.status).toBe("LIVE");
    expect(measured.why).toContain("grain game_contract_apy_roster_gap");
    expect(Math.abs(NARRATIVE_CONTRACT.r!)).toBeGreaterThanOrEqual(0.08);
    expect(NARRATIVE_CONTRACT.slope!).toBeGreaterThan(NARRATIVE_CONTRACT.se!);
  });

  it("darks a second CPOE because the registry already holds the family", () => {
    const decision = selectPart(
      {
        family: "on_field_efficiency",
        grain: "ngs CPOE",
        r: 0.2,
        slope: 0.1,
        se: 0.01,
        n: 200,
        has_row: true,
      },
      REPRESENTATIVES,
    );
    expect(decision.status).toBe("DARK");
    expect(decision.winning_term).toBe("f2");
    expect(decision.g).toBeCloseTo(0.3);
    expect(decision.f1).toBe(0);
  });

  it("stores a cleared fit that has no week-3 row, then goes live when the row arrives", () => {
    const stored = selectPart(
      {
        family: "officials",
        grain: "games.referee",
        r: 0.2,
        slope: 0.5,
        se: 0.1,
        n: 100,
        has_row: false,
      },
      [],
    );
    const live = selectPart(
      {
        family: "officials",
        grain: "games.referee",
        r: 0.2,
        slope: 0.5,
        se: 0.1,
        n: 100,
        has_row: true,
      },
      [],
    );
    expect(stored.status).toBe("STORED");
    expect(stored.winning_term).toBe("f3");
    expect(live.status).toBe("LIVE");
    expect(failingObjectiveFlipped(stored, live)).toBe(true);
  });

  it("goes live only when every term is zero", () => {
    const decision = selectPart(
      {
        family: "synthetic",
        grain: "not a wired signal",
        r: 0.2,
        slope: 0.5,
        se: 0.1,
        n: 100,
        has_row: true,
      },
      [],
    );
    expect(decision.status).toBe("LIVE");
    expect(decision.winning_term).toBe("none");
    expect(decision.g).toBe(0);
  });
});
