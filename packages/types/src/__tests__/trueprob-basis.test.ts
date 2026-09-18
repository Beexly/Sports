import { describe, expect, it } from "vitest";
import {
  quarantineLeakedIndependentEdge,
  needsTrueProbQuarantine,
  readTrainableTrueProb,
  requireTrainableTrueProbBasis,
  requireTrueProbBasis,
} from "../trueprob-basis";

describe("trueProbBasis", () => {
  it("refuses a write with no basis", () => {
    expect(() => requireTrueProbBasis(undefined)).toThrow("trueProbBasis_required");
    expect(() => requireTrueProbBasis("Retrospective")).toThrow("trueProbBasis_required");
  });

  it("accepts the two checked values", () => {
    expect(requireTrueProbBasis("post_settlement_backfill")).toBe("post_settlement_backfill");
    expect(requireTrueProbBasis("as_of_mint")).toBe("as_of_mint");
  });

  it("trainers refuse post_settlement_backfill by the checked field, not rationale prose", () => {
    expect(() => requireTrainableTrueProbBasis("post_settlement_backfill")).toThrow(
      "trueProbBasis_not_trainable",
    );
    expect(() => requireTrainableTrueProbBasis("Retrospective")).toThrow("trueProbBasis_required");
    expect(() => requireTrainableTrueProbBasis(undefined)).toThrow("trueProbBasis_required");
    expect(requireTrainableTrueProbBasis("as_of_mint")).toBe("as_of_mint");
  });

  it("readTrainableTrueProb admits only as_of_mint finite probabilities", () => {
    expect(
      readTrainableTrueProb({ trueProbBasis: "as_of_mint", trueProb: 0.62 }),
    ).toBeCloseTo(0.62, 10);
    expect(() =>
      readTrainableTrueProb({
        trueProbBasis: "post_settlement_backfill",
        trueProb: 0.62,
      }),
    ).toThrow("trueProbBasis_not_trainable");
    expect(() =>
      readTrainableTrueProb({ trueProbBasis: "as_of_mint", trueProb: 0.5 }),
    ).not.toThrow();
    expect(() =>
      readTrainableTrueProb({ trueProbBasis: "as_of_mint", trueProb: null }),
    ).toThrow("trueProb_not_trainable");
    expect(() => readTrainableTrueProb({ rationale: "Retrospective independent blend" })).toThrow(
      "trueProbBasis_required",
    );
  });

  it("quarantine strips the trainable column and leaves as_of_mint untouched", () => {
    expect(needsTrueProbQuarantine({ trueProbBasis: "as_of_mint", trueProb: 0.71 })).toBe(false);
    expect(quarantineLeakedIndependentEdge({ trueProbBasis: "as_of_mint", trueProb: 0.71 })).toBeNull();

    const dirty = quarantineLeakedIndependentEdge({
      trueProbBasis: "post_settlement_backfill",
      trueProb: 0.71,
      priced: true,
      rationale: "Retrospective independent blend (elo)",
    });
    expect(dirty).not.toBeNull();
    expect(dirty!["trueProb"]).toBeNull();
    expect(dirty!["priced"]).toBe(false);
    expect(dirty!["trueProbBasis"]).toBe("post_settlement_backfill");
    expect(dirty!["postSettlementTrueProb"]).toBeCloseTo(0.71, 10);
    expect(() => readTrainableTrueProb(dirty)).toThrow("trueProbBasis_not_trainable");

    expect(
      needsTrueProbQuarantine({
        trueProbBasis: "post_settlement_backfill",
        trueProb: null,
        priced: false,
      }),
    ).toBe(false);
  });
});
