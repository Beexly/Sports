import { describe, it, expect } from "vitest";
import { runImmuneReview, type ImmuneCandidate } from "../edge-immune-system.js";

function candidate(over: Partial<ImmuneCandidate> = {}): ImmuneCandidate {
  return {
    candidateId: "rush-under-high-line",
    hypothesis: "RB rush UNDER on lines ≥70",
    structuralReason: "public over-bets star RB rush lines; books shade up",
    market: "player_rush_yds",
    dataWindow: "2023-2025",
    sampleSize: 144,
    seasonsCovered: 3,
    clv: "pass",
    settlement: "pass",
    oos: "pass",
    fdr: "pass",
    liquidityNote: "lower limits",
    liquidityChecked: true,
    dataQualityClean: true,
    futureContamination: false,
    incoherenceBasis: true,
    marketEfficiencyClass: "soft_secondary",
    ...over,
  };
}

const verdictOf = (review: ReturnType<typeof runImmuneReview>, p: string) =>
  review.results.find((r) => r.prosecutor === p)!.verdict;

describe("edge immune system", () => {
  it("a fully-qualified candidate survives all prosecutors", () => {
    const r = runImmuneReview(candidate());
    expect(r.survives).toBe(true);
    expect(r.fails).toHaveLength(0);
    expect(r.cappedStatus).toBeNull();
  });

  it("leakage is a hard FAIL that caps at WATCHLIST", () => {
    const r = runImmuneReview(candidate({ futureContamination: true }));
    expect(verdictOf(r, "LeakageProsecutor")).toBe("FAIL");
    expect(r.survives).toBe(false);
    expect(r.cappedStatus).toBe("WATCHLIST");
  });

  it("one-season-only FAILs seasonality", () => {
    expect(verdictOf(runImmuneReview(candidate({ seasonsCovered: 1 })), "SeasonalityProsecutor")).toBe("FAIL");
  });

  it("a bare trend with no structural reason FAILs simplicity (no angle-mining)", () => {
    expect(verdictOf(runImmuneReview(candidate({ incoherenceBasis: false })), "SimplicityProsecutor")).toBe("FAIL");
  });

  it("CLV-only and settlement-unproven raise warnings, not survival-killers", () => {
    const r = runImmuneReview(candidate({ settlement: "not_run" }));
    expect(verdictOf(r, "SettlementProsecutor")).toBe("WARNING");
    expect(verdictOf(r, "CLVProsecutor")).toBe("WARNING");
    expect(r.survives).toBe(true); // warnings alone don't fail review
  });

  it("the efficient main market draws an efficiency warning", () => {
    expect(verdictOf(runImmuneReview(candidate({ marketEfficiencyClass: "efficient_main" })), "MarketEfficiencyProsecutor")).toBe("WARNING");
  });

  it("thin sample and dirty data are FAILs with required next tests", () => {
    const thin = runImmuneReview(candidate({ sampleSize: 30 }));
    expect(verdictOf(thin, "SampleSizeProsecutor")).toBe("FAIL");
    expect(thin.requiredNextTests.length).toBeGreaterThan(0);
    expect(verdictOf(runImmuneReview(candidate({ dataQualityClean: false })), "DataQualityProsecutor")).toBe("FAIL");
  });
});
