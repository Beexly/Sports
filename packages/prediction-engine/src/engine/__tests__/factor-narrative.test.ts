import { describe, expect, it } from "vitest";
import type { FactorDetail } from "@sports/types";
import {
  MAX_NARRATED_FACTORS,
  MIN_NARRATED_WEIGHT,
  factorHeadline,
  factorNarrative,
  narrateFactors,
  trimClaim,
  watchedSignals,
} from "../factor-narrative";

const f = (name: string, weight: number, impact: FactorDetail["impact"], description: string): FactorDetail => ({
  name,
  weight,
  impact,
  description,
});

describe("what counts as a reason", () => {
  it("keeps weighted, non-neutral factors", () => {
    const out = narrateFactors([f("Line Movement", 10, "positive", "Line moved +2.0 pts from open")]);
    expect(out).toHaveLength(1);
  });

  it("drops weight-0 factors — they are decoys, not reasons", () => {
    const out = narrateFactors([f("Pricing Edge", 0, "positive", "Offered price sits 1.2% above fair")]);
    expect(out).toEqual([]);
  });

  it("drops neutral factors even when weighted", () => {
    expect(narrateFactors([f("Shadow", 9, "neutral", "shadow read")])).toEqual([]);
  });

  it("honours the weight floor exactly", () => {
    expect(narrateFactors([f("X", MIN_NARRATED_WEIGHT - 1, "positive", "d")])).toEqual([]);
    expect(narrateFactors([f("X", MIN_NARRATED_WEIGHT, "positive", "d")])).toHaveLength(1);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 6 }, (_, i) => f(`F${i}`, 10 + i, "positive", `claim ${i}`));
    expect(narrateFactors(many)).toHaveLength(MAX_NARRATED_FACTORS);
  });
});

describe("trimClaim", () => {
  it("drops the methodology aside", () => {
    expect(trimClaim("Edge sits 1.2% above fair (market-internal comparison, not a model edge)")).toBe(
      "Edge sits 1.2% above fair",
    );
  });
});

describe("shadow tier", () => {
  it("collapses boilerplate shadows to names only", () => {
    const factors = [
      f("Shadow PACE", 0, "neutral", "tracked in shadow mode only; no licensed context provider is configured"),
      f("Shadow OFFICIALS", 0, "neutral", "tracked in shadow mode only; no licensed context provider is configured"),
    ];
    expect(watchedSignals(factors)).toEqual(["PACE", "OFFICIALS"]);
    expect(factorNarrative(factors)).toContain("Also watching (no weight yet): PACE, OFFICIALS");
    expect(factorNarrative(factors)).not.toContain("no licensed");
  });
});

describe("clauses", () => {
  it("is empty when nothing qualifies", () => {
    expect(factorNarrative([])).toBe("");
  });

  it("produces a why clause for real reasons", () => {
    const out = factorNarrative([f("Bookmaker Consensus", 30, "positive", "100% of bookmakers align on this side")]);
    expect(out).toContain("Why: 100% of bookmakers align on this side (Bookmaker Consensus, w30)");
  });

  it("headline is the top reason", () => {
    const out = factorHeadline([f("Line Movement", 10, "positive", "Line moved +2.0 pts from open")]);
    expect(out).toContain("Line moved +2.0 pts from open");
  });
});
