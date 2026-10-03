import { describe, expect, it } from "vitest";
import { validateCorrelationQuery, type CorrelationQuery } from "@/lib/correlation/query-schema";

const baseQuery: CorrelationQuery = {
  title: "MLB sharp movement after rest edge",
  filters: [
    { entity: "PICK", field: "sport", operator: "EQ", value: "MLB" },
    { entity: "PICK", field: "edgeScore", operator: "GT", value: 3 },
    { entity: "PICK", field: "bookmakerCount", operator: "GTE", value: 6 },
  ],
  groupBy: ["pickType"],
  aggregates: ["COUNT", "WIN_RATE", "AVG_EDGE"],
  minSampleSize: 50,
};

describe("correlation query schema", () => {
  it("accepts a bounded historical query contract", () => {
    const result = validateCorrelationQuery(baseQuery);

    expect(result.ok).toBe(true);
    expect(result.normalized?.title).toBe("MLB sharp movement after rest edge");
    expect(result.normalized?.aggregates).toEqual(["COUNT", "WIN_RATE", "AVG_EDGE"]);
  });

  it("requires enough settled history before public rates can be shown", () => {
    const result = validateCorrelationQuery({ ...baseQuery, minSampleSize: 12 });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("Minimum sample size must be at least 25.");
  });

  it("blocks numeric operators on text fields", () => {
    const result = validateCorrelationQuery({
      ...baseQuery,
      filters: [{ entity: "PICK", field: "sport", operator: "GT", value: "MLB" }],
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("sport does not support numeric comparison.");
  });

  it("keeps result filters scoped to pick history", () => {
    const result = validateCorrelationQuery({
      ...baseQuery,
      filters: [{ entity: "GAME_SIGNAL", field: "result", operator: "EQ", value: "WIN" }],
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("result filters are only valid for settled pick history.");
  });
});
