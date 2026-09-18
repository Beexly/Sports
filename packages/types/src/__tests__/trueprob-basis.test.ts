import { describe, expect, it } from "vitest";
import { requireTrueProbBasis } from "../trueprob-basis";

describe("trueProbBasis", () => {
  it("refuses a write with no basis", () => {
    expect(() => requireTrueProbBasis(undefined)).toThrow("trueProbBasis_required");
    expect(() => requireTrueProbBasis("Retrospective")).toThrow("trueProbBasis_required");
  });

  it("accepts the two checked values", () => {
    expect(requireTrueProbBasis("post_settlement_backfill")).toBe("post_settlement_backfill");
    expect(requireTrueProbBasis("as_of_mint")).toBe("as_of_mint");
  });
});
