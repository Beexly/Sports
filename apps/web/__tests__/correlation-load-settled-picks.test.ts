import { describe, expect, it } from "vitest";
import { evaluateCorrelationQuery } from "@/lib/correlation/evaluate";
import {
  loadSettledCorrelationRows,
  mapSettledPickToCorrelationRow,
  type CorrelationSettledPick,
} from "@/lib/correlation/load-settled-picks";
import type { CorrelationQuery } from "@/lib/correlation/query-schema";

function pick(partial: Partial<CorrelationSettledPick> = {}): CorrelationSettledPick {
  return {
    id: "pick_1",
    pickType: "SPREAD",
    riskLevel: "MODERATE",
    pickGrade: "SOLID_PLAY",
    confidence: 72,
    edgeScore: 4.8,
    consensusPct: 0.64,
    bookmakerCount: 9,
    result: "WIN",
    modelVersion: "v5.1.0",
    game: {
      sport: {
        name: "MLB",
        key: "baseball_mlb",
      },
    },
    ...partial,
  };
}

const query: CorrelationQuery = {
  title: "Canonical MLB spread check",
  filters: [{ entity: "PICK", field: "sport", operator: "EQ", value: "MLB" }],
  groupBy: ["pickType"],
  aggregates: ["COUNT", "WIN_RATE"],
  minSampleSize: 25,
};

describe("correlation settled-pick loader", () => {
  it("maps canonical settled picks into evaluator rows", () => {
    const row = mapSettledPickToCorrelationRow(pick());

    expect(row).toEqual({
      sport: "MLB",
      pickType: "SPREAD",
      riskLevel: "MODERATE",
      pickGrade: "SOLID_PLAY",
      confidence: 72,
      edgeScore: 4.8,
      consensusPct: 0.64,
      bookmakerCount: 9,
      result: "WIN",
      modelVersion: "v5.1.0",
    });
  });

  it("falls back to sport key when the display name is missing", () => {
    const row = mapSettledPickToCorrelationRow(
      pick({
        game: {
          sport: {
            name: "",
            key: "icehockey_nhl",
          },
        },
      })
    );

    expect(row.sport).toBe("icehockey_nhl");
  });

  it("feeds the correlation evaluator contract", () => {
    const rows = Array.from({ length: 25 }, (_, index) =>
      mapSettledPickToCorrelationRow(pick({ result: index < 14 ? "WIN" : "LOSS" }))
    );

    const result = evaluateCorrelationQuery(query, rows);

    expect(result.ok).toBe(true);
    expect(result.groups[0]?.sampleSize).toBe(25);
    expect(result.groups[0]?.aggregates.WIN_RATE).toBe(0.56);
  });

  it("returns no demo rows in stub mode", async () => {
    const rows = await loadSettledCorrelationRows();

    expect(rows).toEqual([]);
  });
});
