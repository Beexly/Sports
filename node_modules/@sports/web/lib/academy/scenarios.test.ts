import { describe, it, expect } from "vitest";
import { SCENARIOS, MAX_SCORE, gradeChoice, rankFor } from "./scenarios";

const byId = (id: string) => SCENARIOS.find((s) => s.id === id)!;

describe("gradeChoice — grading process, not luck", () => {
  it("rewards matching a NO-BET (correct restraint, full points)", () => {
    const s = byId("s1"); // correct: NO-BET, outcome: WON
    const g = gradeChoice("NO-BET", s);
    expect(g.tone).toBe("restraint");
    expect(g.points).toBe(g.maxPoints);
    expect(g.points).toBeGreaterThan(0);
  });

  it("flags a forced play that happened to win as Lucky, zero points", () => {
    const s = byId("s1"); // disciplined call was NO-BET; it WON
    const g = gradeChoice("PLAY", s);
    expect(g.tone).toBe("lucky");
    expect(g.label).toBe("Lucky");
    expect(g.points).toBe(0);
  });

  it("rewards a correct PLAY that won as Earned (full points)", () => {
    const s = byId("s5"); // correct: PLAY, outcome: WON
    const g = gradeChoice("PLAY", s);
    expect(g.tone).toBe("earned");
    expect(g.points).toBe(g.maxPoints);
  });

  it("respects a correct read that lost (good process, bad outcome)", () => {
    const s = byId("s2"); // correct: PLAY, outcome: LOST
    const g = gradeChoice("PLAY", s);
    expect(g.tone).toBe("respected");
    expect(g.points).toBe(g.maxPoints);
  });

  it("does not punish over-caution as hard as over-aggression", () => {
    const s = byId("s5"); // correct: PLAY
    const cautious = gradeChoice("NO-BET", s); // more cautious than needed
    expect(cautious.tone).toBe("missed");
    expect(cautious.points).toBeGreaterThan(0); // partial credit
    expect(cautious.points).toBeLessThan(cautious.maxPoints);
  });
});

describe("rank ladder — earned by calibration", () => {
  it("maps calibration percentage to rank", () => {
    expect(rankFor(0).name).toBe("Observer");
    expect(rankFor(0.5).name).toBe("Analyst");
    expect(rankFor(1).name).toBe("Galaxy Certified");
  });
  it("MAX_SCORE is the sum of the disciplined verdicts' full points", () => {
    expect(MAX_SCORE).toBeGreaterThan(0);
    // every scenario, played perfectly, should total MAX_SCORE
    const perfect = SCENARIOS.reduce((sum, s) => sum + gradeChoice(s.correct, s).points, 0);
    expect(perfect).toBe(MAX_SCORE);
  });
});
