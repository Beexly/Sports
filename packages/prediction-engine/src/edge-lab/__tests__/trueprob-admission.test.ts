import { describe, expect, it } from "vitest";
import { admitTrainableTrueProbRows, censusTrueProbRows, summarizeTrueProbAdmission } from "../trueprob-admission.js";

describe("admitTrainableTrueProbRows", () => {
  it("admits as_of_mint and reports every refusal reason instead of dropping silently", () => {
    const rows = [
      { id: "mint", trueProbBasis: "as_of_mint" as const, trueProb: 0.61 },
      { id: "leaked", trueProbBasis: "post_settlement_backfill" as const, trueProb: 0.81 },
      { id: "untagged", rationale: "Retrospective independent blend (elo)", trueProb: 0.77 },
      { id: "bad-p", trueProbBasis: "as_of_mint" as const, trueProb: null },
      { id: "mint-2", trueProbBasis: "as_of_mint" as const, trueProb: 0.44 },
    ];

    const out = admitTrainableTrueProbRows(rows);

    expect(out.admittedCount).toBe(2);
    expect(out.refusedCount).toBe(3);
    expect(out.admitted.map((a) => a.row.id)).toEqual(["mint", "mint-2"]);
    expect(out.admitted.map((a) => a.trueProb)).toEqual([0.61, 0.44]);
    expect(out.refusalCounts).toEqual({
      trueProbBasis_required: 1,
      trueProbBasis_not_trainable: 1,
      trueProb_not_trainable: 1,
    });
    expect(out.refused.map((r) => r.row.id)).toEqual(["leaked", "untagged", "bad-p"]);
  });

  it("does not fit on an untagged row just because trueProb is finite", () => {
    const out = admitTrainableTrueProbRows([{ trueProb: 0.91 }]);
    expect(out.admittedCount).toBe(0);
    expect(out.refusalCounts.trueProbBasis_required).toBe(1);
  });

  it("summarise throws on empty rather than printing a 0% refusal rate", () => {
    expect(() => summarizeTrueProbAdmission(admitTrainableTrueProbRows([]))).toThrow(/empty census/);
  });

  it("census reports refusal rate and never claims a DB query", () => {
    const report = censusTrueProbRows([
      { trueProbBasis: "as_of_mint" as const, trueProb: 0.6 },
      { trueProbBasis: "post_settlement_backfill" as const, trueProb: 0.9 },
    ]);
    expect(report.refusalRate).toBeCloseTo(0.5, 12);
    expect(report.dbQueried).toBe(false);
    expect(report.priced).toBe(false);
    expect(report.status).toBe("shadow");
  });
});
