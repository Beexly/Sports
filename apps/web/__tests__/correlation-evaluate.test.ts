import { describe, expect, it } from "vitest";
import { evaluateCorrelationQuery, type CorrelationPickRow } from "@/lib/correlation/evaluate";
import type { CorrelationQuery } from "@/lib/correlation/query-schema";

function row(partial: Partial<CorrelationPickRow>): CorrelationPickRow {
  return {
    sport: "MLB",
    pickType: "SPREAD",
    riskLevel: "MODERATE",
    pickGrade: "SOLID_PLAY",
    confidence: 70,
    edgeScore: 4,
    consensusPct: 0.62,
    bookmakerCount: 8,
    result: "WIN",
    modelVersion: "v5.1.0",
    ...partial,
  };
}

const query: CorrelationQuery = {
  title: "MLB edges by market",
  filters: [
    { entity: "PICK", field: "sport", operator: "EQ", value: "MLB" },
    { entity: "PICK", field: "edgeScore", operator: "GTE", value: 3 },
  ],
  groupBy: ["pickType"],
  aggregates: ["COUNT", "WIN_RATE", "PUSH_RATE", "AVG_EDGE"],
  minSampleSize: 25,
};

describe("correlation evaluator", () => {
  it("filters, groups, and computes approved aggregates", () => {
    const spreadRows = Array.from({ length: 25 }, (_, index) =>
      row({
        pickType: "SPREAD",
        result: index < 10 ? "WIN" : index < 20 ? "LOSS" : "PUSH",
        edgeScore: 4,
      })
    );
    const result = evaluateCorrelationQuery(query, [
      ...spreadRows,
      row({ pickType: "TOTAL", result: "WIN", edgeScore: 5 }),
      row({ sport: "NBA", pickType: "SPREAD", result: "WIN", edgeScore: 9 }),
    ]);

    expect(result.ok).toBe(true);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.key).toBe("pickType:SPREAD");
    expect(result.groups[0]?.aggregates.COUNT).toBe(25);
    expect(result.groups[0]?.aggregates.WIN_RATE).toBe(0.4);
    expect(result.groups[0]?.aggregates.PUSH_RATE).toBe(0.2);
    expect(result.groups[0]?.aggregates.AVG_EDGE).toBe(4);
  });

  it("returns a blocker when no group clears the sample-size gate", () => {
    const rows = Array.from({ length: 24 }, () => row({ pickType: "SPREAD", result: "WIN" }));
    const result = evaluateCorrelationQuery(query, rows);

    expect(result.ok).toBe(true);
    expect(result.groups).toEqual([]);
    expect(result.blockers).toContain("No group met the minimum sample-size gate.");
  });

  it("returns validation blockers for invalid query contracts", () => {
    const result = evaluateCorrelationQuery({ ...query, minSampleSize: 2 }, []);

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Minimum sample size must be at least 25.");
  });
});
