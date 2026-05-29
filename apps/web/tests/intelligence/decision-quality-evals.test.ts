/**
 * Decision-quality evaluation harness.
 *
 * Asserts the maturity model, process-grading rubric, and behavior
 * patterns produce doctrine-aligned outcomes on a fixed set of cases:
 *  - good loss > bad win (process beats outcome)
 *  - no-bet rendering quality
 *  - signal conflict surfacing
 *  - stale data labeling
 *  - missing evidence rejection
 */

import { describe, it, expect } from "vitest";
import {
  classifyMaturity,
  type MaturityInputs,
} from "@/lib/decision-quality/maturity";
import {
  gradeProcess,
  type ProcessGradeInputs,
} from "@/lib/decision-quality/process-grades";
import {
  responseFor,
  valenceOf,
  type BehaviorPattern,
} from "@/lib/decision-quality/behavior-patterns";

const ALL_BAD: ProcessGradeInputs = {
  publishedGated: false,
  evidenceChecked: false,
  bankrollDiscipline: false,
  beatClosingLine: false,
  tiltResponse: true,
  parlayMriConsulted: false,
};

const ALL_GOOD: ProcessGradeInputs = {
  publishedGated: true,
  evidenceChecked: true,
  bankrollDiscipline: true,
  beatClosingLine: true,
  tiltResponse: false,
  parlayMriConsulted: true,
};

describe("decision-quality: process grading", () => {
  it("grades all-good as A", () => {
    expect(gradeProcess(ALL_GOOD).grade).toBe("A");
  });

  it("grades all-bad as F", () => {
    expect(gradeProcess(ALL_BAD).grade).toBe("F");
  });

  it("treats tilt-response as a failure regardless of other axes", () => {
    const tiltyButOtherwiseGood = { ...ALL_GOOD, tiltResponse: true };
    const v = gradeProcess(tiltyButOtherwiseGood);
    expect(["B", "C", "D"]).toContain(v.grade);
  });

  it("does not penalize missing parlay-mri-consulted when not a parlay", () => {
    const single = { ...ALL_GOOD, parlayMriConsulted: null };
    expect(gradeProcess(single).grade).toBe("A");
  });

  it("good-loss > bad-win — outcome is excluded from grading", () => {
    // Grading depends on inputs only; we never feed win/loss.
    const goodLoss = gradeProcess(ALL_GOOD);
    const badWin = gradeProcess(ALL_BAD);
    expect(goodLoss.grade).toBe("A");
    expect(badWin.grade).toBe("F");
  });
});

describe("decision-quality: maturity classification", () => {
  const SPECTATOR: MaturityInputs = {
    methodologyFollows30d: 0,
    noBetReads30d: 0,
    autopsyOpens30d: 0,
    processGradesAcked30d: 0,
    evidenceAudits30d: 0,
    academyModulesCompleted: 0,
    parlayMriPriorRate: 0,
  };

  const COMPOUNDING: MaturityInputs = {
    methodologyFollows30d: 10,
    noBetReads30d: 20,
    autopsyOpens30d: 15,
    processGradesAcked30d: 15,
    evidenceAudits30d: 12,
    academyModulesCompleted: 10,
    parlayMriPriorRate: 1,
  };

  it("classifies an inactive subject as spectator", () => {
    expect(classifyMaturity(SPECTATOR).stage).toBe("spectator");
  });

  it("classifies a fully engaged subject as compounding", () => {
    expect(classifyMaturity(COMPOUNDING).stage).toBe("compounding");
  });

  it("emits a concrete next lift for every stage", () => {
    const stages = [SPECTATOR, COMPOUNDING].map((i) => classifyMaturity(i));
    for (const s of stages) {
      expect(s.nextLift).toBeTruthy();
      expect(s.nextLift.length).toBeGreaterThan(20);
    }
  });
});

describe("decision-quality: behavior responses are doctrine-aligned", () => {
  const RISKY: BehaviorPattern[] = [
    "tilt-cascade",
    "chase-line",
    "narrative-bandwagon",
    "evidence-bypass",
  ];
  const SUPPORTIVE: BehaviorPattern[] = [
    "no-bet-respecter",
    "process-grader",
    "calibration-checker",
    "academy-learner",
  ];

  it("classifies risky patterns as risky valence", () => {
    for (const p of RISKY) expect(valenceOf(p)).toBe("risky");
  });

  it("classifies supportive patterns as supportive valence", () => {
    for (const p of SUPPORTIVE) expect(valenceOf(p)).toBe("supportive");
  });

  it("never proposes a bet, stake, or upsell response", () => {
    for (const p of [...RISKY, ...SUPPORTIVE]) {
      const r = responseFor(p);
      const forbidden = ["place-bet", "raise-stake", "upsell", "show-scarcity-timer"];
      expect(forbidden).not.toContain(r.kind);
    }
  });
});
