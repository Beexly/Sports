import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { quarantineBackfillIndependentEdge } from "../quarantine-backfill-independent-edge.js";
import { readTrainableTrueProb } from "@sports/types";

describe("backfill write tags trueProbBasis", () => {
  it("the persisted independentEdge carries post_settlement_backfill, not prose-only", () => {
    const writer = readFileSync(
      join(__dirname, "../backfill-independent-trueprob.ts"),
      "utf8",
    );
    const helper = readFileSync(
      join(__dirname, "../quarantine-backfill-independent-edge.ts"),
      "utf8",
    );
    expect(writer).toContain("quarantineBackfillIndependentEdge");
    expect(helper).toContain('trueProbBasis: "post_settlement_backfill"');
    expect(writer).not.toMatch(/trueProbBasis:\s*"as_of_mint"/);
    expect(helper).not.toMatch(/trueProbBasis:\s*"as_of_mint"/);
  });

  it("does not assign a post-settlement number to the trainable trueProb column", () => {
    const src = readFileSync(
      join(__dirname, "../backfill-independent-trueprob.ts"),
      "utf8",
    );
    expect(src).toContain("quarantineBackfillIndependentEdge");
    expect(src).not.toContain("buildIndependentFairValues");
  });
});

describe("quarantineBackfillIndependentEdge", () => {
  it("nulls trueProb on a tagged post-settlement write so trainers cannot fit on it", () => {
    const next = quarantineBackfillIndependentEdge({
      trueProbBasis: "post_settlement_backfill",
      trueProb: 0.67,
      priced: true,
      rationale: "Retrospective independent blend (elo) prices published team side",
    });
    expect(next).not.toBeNull();
    expect(next!["trueProb"]).toBeNull();
    expect(next!["priced"]).toBe(false);
    expect(next!["trueProbBasis"]).toBe("post_settlement_backfill");
    expect(next!["postSettlementTrueProb"]).toBeCloseTo(0.67, 10);
    expect(() => readTrainableTrueProb(next)).toThrow("trueProbBasis_not_trainable");
  });

  it("recognizes its own pre-tag Retrospective writes without grepping being the trainer rule", () => {
    const next = quarantineBackfillIndependentEdge({
      trueProb: 0.58,
      priced: true,
      rationale: "Retrospective independent blend (mlb_standings) prices published team side",
    });
    expect(next).not.toBeNull();
    expect(next!["trueProb"]).toBeNull();
    expect(next!["trueProbBasis"]).toBe("post_settlement_backfill");
  });

  it("leaves as_of_mint trueProb untouched", () => {
    const edge = {
      trueProbBasis: "as_of_mint" as const,
      trueProb: 0.61,
      priced: true,
      rationale: "Independent blend (elo)",
    };
    expect(quarantineBackfillIndependentEdge(edge)).toBeNull();
    expect(readTrainableTrueProb(edge)).toBeCloseTo(0.61, 10);
  });
});
