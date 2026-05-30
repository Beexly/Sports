/**
 * Targeted coverage for untested filter operators and groupBy shapes in
 * evaluateCorrelationQuery. The primary correlation-evaluate.test.ts covers
 * EQ + GTE filters, single-field groupBy, and the sample-size gate. This file
 * covers the remaining operator branches and AVG_CONFIDENCE aggregate.
 *
 * Constraint: query.filters.length >= 1 and minSampleSize >= 25 (per schema).
 */

import { describe, it, expect } from "vitest";
import { evaluateCorrelationQuery, type CorrelationPickRow } from "@/lib/correlation/evaluate";
import type { CorrelationQuery, CorrelationFilter } from "@/lib/correlation/query-schema";

function row(partial: Partial<CorrelationPickRow> = {}): CorrelationPickRow {
  return {
    sport: "NBA",
    pickType: "SPREAD",
    riskLevel: "MODERATE",
    pickGrade: "SOLID_PLAY",
    confidence: 72,
    edgeScore: 5,
    consensusPct: 0.65,
    bookmakerCount: 9,
    result: "WIN",
    modelVersion: "v5.1.0",
    ...partial,
  };
}

function makeRows(count: number, partial: Partial<CorrelationPickRow> = {}): CorrelationPickRow[] {
  return Array.from({ length: count }, () => row(partial));
}

function query(
  filters: CorrelationFilter[],
  overrides: Partial<CorrelationQuery> = {}
): CorrelationQuery {
  return {
    title: "test query",
    filters,
    groupBy: [],
    aggregates: ["COUNT"],
    minSampleSize: 25,
    ...overrides,
  };
}

// ============================================================
// NEQ operator
// ============================================================

describe("correlation evaluate — NEQ operator", () => {
  it("passes rows that do NOT match the filter value", () => {
    const rows = [
      ...makeRows(25, { sport: "MLB" }),
      ...makeRows(3, { sport: "NBA" }),
    ];
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "sport", operator: "NEQ", value: "NBA" }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(25); // only the 25 MLB rows
  });

  it("no groups form when all rows match the NEQ value (all filtered out)", () => {
    const rows = makeRows(30, { sport: "NBA" });
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "sport", operator: "NEQ", value: "NBA" }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups).toHaveLength(0);
    expect(result.blockers).toContain("No group met the minimum sample-size gate.");
  });
});

// ============================================================
// IN operator
// ============================================================

describe("correlation evaluate — IN operator", () => {
  it("passes rows whose field value is in the array", () => {
    const rows = [
      ...makeRows(15, { sport: "NBA" }),
      ...makeRows(15, { sport: "MLB" }),
      ...makeRows(5, { sport: "NFL" }),
    ];
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "sport", operator: "IN", value: ["NBA", "MLB"] }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(30); // NBA + MLB, not NFL
  });

  it("excludes rows not in the array", () => {
    const rows = makeRows(30, { sport: "NFL" });
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "sport", operator: "IN", value: ["NBA", "MLB"] }]),
      rows
    );
    expect(result.groups).toHaveLength(0);
  });
});

// ============================================================
// GT operator (numeric)
// ============================================================

describe("correlation evaluate — GT operator", () => {
  it("passes rows where the numeric field is strictly greater than the threshold", () => {
    const rows = [
      ...makeRows(25, { edgeScore: 6 }),  // these pass (6 > 5)
      ...makeRows(5, { edgeScore: 5 }),   // these don't (not strictly >)
      ...makeRows(5, { edgeScore: 4 }),   // these don't
    ];
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "edgeScore", operator: "GT", value: 5 }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(25); // only edgeScore=6 passes
  });
});

// ============================================================
// LT operator (numeric)
// ============================================================

describe("correlation evaluate — LT operator", () => {
  it("passes rows where the numeric field is strictly less than the threshold", () => {
    const rows = [
      ...makeRows(25, { confidence: 60 }),  // these pass (60 < 70)
      ...makeRows(5, { confidence: 70 }),   // these don't (not strictly <)
      ...makeRows(5, { confidence: 80 }),   // these don't
    ];
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "confidence", operator: "LT", value: 70 }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(25);
  });
});

// ============================================================
// LTE operator (numeric)
// ============================================================

describe("correlation evaluate — LTE operator", () => {
  it("passes rows where the numeric field is less than or equal to the threshold", () => {
    const rows = [
      ...makeRows(15, { confidence: 60 }),  // passes (60 <= 70)
      ...makeRows(15, { confidence: 70 }),  // passes (70 <= 70)
      ...makeRows(5, { confidence: 80 }),   // does not pass
    ];
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "confidence", operator: "LTE", value: 70 }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(30); // confidence=60 and confidence=70
  });
});

// ============================================================
// BETWEEN operator (numeric range, inclusive)
// ============================================================

describe("correlation evaluate — BETWEEN operator", () => {
  it("passes rows where the numeric field falls within the inclusive range", () => {
    const rows = [
      ...makeRows(25, { confidence: 75 }),  // within [70, 80]
      ...makeRows(5, { confidence: 60 }),   // below range
      ...makeRows(5, { confidence: 85 }),   // above range
    ];
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "confidence", operator: "BETWEEN", value: [70, 80] }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(25);
  });

  it("includes rows at the exact boundary values", () => {
    const rows = [
      ...makeRows(13, { confidence: 70 }),  // lower boundary
      ...makeRows(13, { confidence: 80 }),  // upper boundary
    ];
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "confidence", operator: "BETWEEN", value: [70, 80] }]),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(26);
  });
});

// ============================================================
// Non-PICK entity filter — passes through all rows
// ============================================================

describe("correlation evaluate — entity !== 'PICK' filter", () => {
  it("passes all rows through when the filter entity is not PICK", () => {
    const rows = makeRows(30, { sport: "NFL" });
    const result = evaluateCorrelationQuery(
      query([{ entity: "GAME_SIGNAL", field: "sport", operator: "EQ", value: "NBA" }]),
      rows
    );
    // Non-PICK filters don't filter anything — all 30 rows pass through
    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(30);
  });
});

// ============================================================
// groupBy.length === 0 → key = "ALL"
// ============================================================

describe("correlation evaluate — empty groupBy", () => {
  it("groups all filtered rows under the key 'ALL'", () => {
    const rows = makeRows(30);
    const result = evaluateCorrelationQuery(
      query([{ entity: "PICK", field: "sport", operator: "EQ", value: "NBA" }], { groupBy: [] }),
      rows
    );
    expect(result.ok).toBe(true);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.key).toBe("ALL");
    expect(result.groups[0]?.sampleSize).toBe(30);
  });
});

// ============================================================
// Multi-field groupBy → compound keys
// ============================================================

describe("correlation evaluate — multi-field groupBy", () => {
  it("creates compound keys from multiple groupBy fields", () => {
    const rows = [
      ...makeRows(25, { sport: "NBA", pickType: "SPREAD" }),
      ...makeRows(25, { sport: "MLB", pickType: "SPREAD" }),
    ];
    const result = evaluateCorrelationQuery(
      query(
        [{ entity: "PICK", field: "sport", operator: "IN", value: ["NBA", "MLB"] }],
        { groupBy: ["sport", "pickType"] }
      ),
      rows
    );
    const keys = result.groups.map((g) => g.key);
    expect(keys).toContain("sport:NBA|pickType:SPREAD");
    expect(keys).toContain("sport:MLB|pickType:SPREAD");
  });

  it("groups below minSampleSize are excluded even with multi-field groupBy", () => {
    const rows = [
      ...makeRows(25, { sport: "NBA", pickType: "SPREAD" }),
      ...makeRows(3, { sport: "NBA", pickType: "MONEYLINE" }), // below 25
    ];
    const result = evaluateCorrelationQuery(
      query(
        [{ entity: "PICK", field: "sport", operator: "EQ", value: "NBA" }],
        { groupBy: ["sport", "pickType"] }
      ),
      rows
    );
    const keys = result.groups.map((g) => g.key);
    expect(keys).toContain("sport:NBA|pickType:SPREAD");
    expect(keys).not.toContain("sport:NBA|pickType:MONEYLINE");
  });
});

// ============================================================
// AVG_CONFIDENCE aggregate
// ============================================================

describe("correlation evaluate — AVG_CONFIDENCE aggregate", () => {
  it("computes the average confidence across all rows in the group", () => {
    const rows = [
      ...makeRows(10, { confidence: 60 }),
      ...makeRows(10, { confidence: 80 }),
      ...makeRows(10, { confidence: 70 }),
    ];
    const result = evaluateCorrelationQuery(
      query(
        [{ entity: "PICK", field: "sport", operator: "EQ", value: "NBA" }],
        { aggregates: ["COUNT", "AVG_CONFIDENCE"] }
      ),
      rows
    );
    expect(result.ok).toBe(true);
    const group = result.groups[0];
    expect(group?.aggregates.AVG_CONFIDENCE).toBe(70); // (60+80+70)/3 averaged = 70
  });
});

// ============================================================
// Groups sorted by descending sampleSize
// ============================================================

describe("correlation evaluate — group sort order", () => {
  it("returns groups sorted by sampleSize descending (largest first)", () => {
    const rows = [
      ...makeRows(30, { sport: "NBA", pickType: "SPREAD" }),
      ...makeRows(25, { sport: "NBA", pickType: "MONEYLINE" }),
    ];
    const result = evaluateCorrelationQuery(
      query(
        [{ entity: "PICK", field: "sport", operator: "EQ", value: "NBA" }],
        { groupBy: ["pickType"] }
      ),
      rows
    );
    expect(result.groups[0]?.key).toBe("pickType:SPREAD");   // 30 rows — largest
    expect(result.groups[1]?.key).toBe("pickType:MONEYLINE"); // 25 rows
  });
});
